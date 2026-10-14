import { catalog } from '../../catalog.js';
import { assetRows, assetRecords, bmcRecords, bmcFieldMap, capabilityRecords, compute03Story, taskRecords, POOL_CAPACITY, clusterRows, alertRecords, assetAbnormal, assetStageLabel, locationTree, stageBarCounts, STAGE_LABELS } from '../../model.js';

export const infrastructurePages = ['assets', 'provisioning'];
export const infrastructureDetails = ['asset', 'image', 'provisioning-detail', 'baseline'];
// 详情的导航归属（装机管理页签）与行数据源（各自的页签列表）分开：模板 / 基线详情从装机管理进入，行来自对应页签。
const detailParents = { asset: 'assets', image: 'provisioning', 'provisioning-detail': 'provisioning', baseline: 'provisioning' };
const detailSources = { asset: 'assets', image: 'images', 'provisioning-detail': 'provisioning', baseline: 'baselines' };
// 资产列表列（评审稿 3.1.4）：配置合并 GPU 与内存；阶段 / BMC / 当前任务为三维状态；位置与归属独立成列。
const ASSET_COLUMNS = ['资产', '序列号', '类型', '配置', '位置', '阶段', 'BMC', '当前任务', '归属'];
export function listData(page) {
  if (page === 'assets') return { title: '服务器资产', description: '唯一的机器列表：生命周期阶段、BMC 与健康、当前任务三维状态；异常为派生判定，检查通过不等于可交付。', columns: ASSET_COLUMNS, rows: assetRows, detail: 'asset', action: 'import' };
  // images / baselines 不再是独立页面，作为“装机管理”页签数据源保留。
  if (['provisioning', 'images', 'baselines'].includes(page)) {
    const p = catalog[page];
    return { title: p.title, description: p.description, columns: p.columns, rows: p.rows, detail: p.detail, action: p.action };
  }
  return null;
}

// 阶段驱动主操作（评审稿 3.1.4）：按钮文案与动作随资产阶段变化；异常资产引导查看异常。
export function primaryActionOf(asset) {
  if (!asset) return null;
  if (assetAbnormal(asset)) return { label: '查看异常', action: null, link: { name: 'incidents' } };
  if (asset.sideState) return null;
  switch (asset.stage) {
    case 'registered': return { label: '纳管 BMC', action: 'bmc-enroll' };
    case 'managed': return { label: '发起硬件检查', action: 'asset-actions' };
    case 'hw_passed': return { label: '发起装机', action: 'provision' };
    case 'installing': return { label: '查看任务', action: null, link: { name: 'task', query: { id: 'TASK-DEMO-01' } } };
    case 'installed': return { label: '加入裸金属池', action: 'join-baremetal' };
    default: return { label: '资产操作', action: 'asset-actions' };
  }
}

// 阶段条与位置树的过滤（评审稿 3.1.2 / 3.1.3）：阶段列点击过滤；位置树按 机房 / 机柜 / 未分配 过滤。
export function stageBarItems() {
  const bar = stageBarCounts();
  return [...Object.values(STAGE_LABELS).map(label => ({ label, count: bar.counts[label] })), { label: '异常', count: bar.abnormal, abnormal: true }];
}

export function filterAssetRows(stageFilter, locationKey) {
  return assetRecords
    .filter((asset, index) => {
      if (stageFilter === '异常' && !assetAbnormal(asset)) return false;
      if (stageFilter && stageFilter !== '异常' && assetStageLabel(asset) !== stageFilter) return false;
      if (locationKey === 'unassigned' && asset.location) return false;
      if (locationKey && locationKey !== 'unassigned') {
        const [room, rack] = locationKey.split(':');
        if (asset.location?.room !== room || (rack && asset.location.rack !== rack)) return false;
      }
      return true;
    })
    .map(asset => assetRows[assetRecords.indexOf(asset)]);
}

// 装机管理页签：任务 / 模板 / 基线共用一个流程入口，各自保留列表、详情与新增预检表单。
const provisioningStateIndexes = { provisioning: 3, images: 5, baselines: 5 };
export function provisioningTabs() {
  return [
    { key: 'tasks', title: '装机任务', source: listData('provisioning'), stateIndex: provisioningStateIndexes.provisioning },
    { key: 'templates', title: '镜像与装机模板', source: listData('images'), stateIndex: provisioningStateIndexes.images },
    { key: 'baselines', title: '硬件基线', source: listData('baselines'), stateIndex: provisioningStateIndexes.baselines }
  ];
}

export function detailData(page, requestedId) {
  const parent = detailParents[page];
  const list = listData(detailSources[page] ?? parent);
  if (!list) return null;
  const id = requestedId || String(list.rows[0]?.[0] || '');
  const row = list.rows.find(row => String(row[0]) === id);
  if (!row) return null;
  let fields = list.columns.map((label, index) => [label, String(row[index])]);
  let tabs = [{ key: 'facts', title: '来源与边界', rows: [['数据来源', '旧 S1 原型固定示例，非实时采集'], ['版本与证据', '真实版本、采集时间与验证证据待接入；示例状态不是生产能力承诺']] }];
  let action = list.action;
  let primary = null;
  if (page === 'asset') {
    const record = assetRecords.find(item => item.id === id);
    primary = primaryActionOf(record);
    action = primary?.action ?? null;
    const capability = capabilityRecords.find(item => item.id === id);
    tabs.push({ key: 'hardware', title: '硬件能力', rows: capability ? Object.entries({ CPU与内存: capability.cpu, 磁盘与网络: capability.disknet, GPU: capability.gpu, 拓扑: capability.topo, 基线: capability.baseline, 可交付: capability.deliverable }) : [['采集状态', '未采集，未知不代表可用']] });
    // BMC 与硬件已合入资产详情：带外事实按资产 ID 定位；未登记的资产显式标未知，不代表无带外能力。
    const bmc = bmcRecords.find(item => item.id === id);
    tabs.push({ key: 'bmc', title: 'BMC 与带外', rows: bmc ? Object.entries(bmcFieldMap(id)).map(([label, value]) => [label, value, 'BMC 带外事实；连接测试与操作需授权']) : [['BMC 登记', '未登记（示例）', '显式标未知，不代表无带外能力']] });
    const tasks = taskRecords.filter(task => task.target === id);
    tabs.push({ key: 'tasks', title: '装机记录', rows: tasks.length ? tasks.map(task => [task.id, task.type, task.state, task.stage]) : [['装机记录', '无', '装机 / 检查 / 回收任务在此留痕']] });
    // 生命周期页签：阶段时间线 + 维护 / 换件 / 退役留痕（评审稿 3.1.5）。
    if (record) {
      const events = [['已登记', '资产登记（SN 录入）', '登记来源：批量导入 / 人工']];
      if (record.bmc && record.bmc !== 'unmanaged') events.push(['已纳管', 'BMC 纳管完成', '凭据引用登记']);
      if (['installing', 'installed', 'in_cluster', 'in_baremetal_pool'].includes(record.stage)) events.push(['检查通过', '硬件检查通过', '基线比对结果']);
      if (record.stage === 'installing') events.push(['装机中', '装机任务执行中（见装机记录）', 'TASK-DEMO-01']);
      if (['installed', 'in_cluster', 'in_baremetal_pool'].includes(record.stage)) events.push(['已装机', 'OS 装机完成', '装机模板留痕']);
      if (record.ownership?.kind === 'cluster') events.push(['已入集群', `加入 ${record.ownership.cluster} · ${record.ownership.role}`, '集群生命周期入口']);
      if (record.ownership?.kind === 'baremetal-pool') events.push(['已入裸金属池', `加入 ${record.ownership.pool}`, '整机租赁路径']);
      if (record.sideState) events.push([record.sideState === 'retired' ? '已退役' : '维护中', '侧状态', '退役前必须已移出集群或池']);
      tabs.push({ key: 'lifecycle', title: '生命周期', rows: [...events,
        ['异常派生', assetAbnormal(record) ? '当前存在异常（关联故障单）' : '无', '已登记未纳管与装机中不算异常']] });
    }
    if (id === 'compute-03') tabs.push({ key: 'acceptance', title: '交付门禁', rows: compute03Story.acceptance });
  }
  if (page === 'provisioning-detail') {
    const task = taskRecords.find(task => task.id === id);
    fields = Object.entries({ 任务: task.id, 资产: task.target, 类型: task.type, 当前状态: task.state, 当前阶段: task.stage, 子阶段: task.subStage, 模板: task.template, 执行源: task.source, 授权: task.auth });
    tabs = [
      { key: 'phases', title: '执行阶段', rows: task.phases.map(phase => [phase.name, phase.state, phase.at || '—', phase.log || '尚无执行记录']) },
      { key: 'acceptance', title: '验收结果', rows: task.acceptance },
      { key: 'confirmation', title: '人工确认', rows: task.confirmPoints.map(point => [point, '独立确认点，不代表本次授权']) }
    ];
    // Provision requires a task row (asset at column 1); asset-actions requires an asset row.
    action = task.type === '装机' ? 'provision' : null;
  }
  return {
    id, parent, row, fields, tabs, action,
    // 阶段驱动主操作：action 为空时视图按 primaryLink 渲染跳转按钮。
    primaryLabel: page === 'asset' && primary?.link ? primary.label : null,
    primaryLink: page === 'asset' && primary?.link ? primary.link : null,
    title: page === 'asset' ? '资产详情' : catalog[page].title
  };
}
export function overviewData() {
  return { assets: assetRecords.length, ready: assetRecords.filter(item => item.stage === 'in_cluster').length, clusters: clusterRows.length,
    activeTasks: taskRecords.filter(task => task.state === '进行中'), alerts: alertRecords.filter(alert => alert.signal !== '已恢复'), capacity: POOL_CAPACITY };
}
