// 集群与算力模块的纯数据适配：列表、详情、集群概要与证据联动。不引入 Vue，不执行任何真实操作。
import { catalog } from '../../catalog.js';
import { tabContent } from '../../detail-tabs.js';
import { clusterCapability, deliveryOrderRecords, gpuRecords, nodeRecords, gpuRows, nodeRows, orderStageLabel } from '../../model.js';
import { detailPages } from '../../router/navigation.js';
import { listSource, objectDetail } from './objects.js';

export const clusterListPages = ['clusters', 'cluster-templates'];
// 节点 / GPU 列表已并入集群详情页签，node / gpu 详情保留供页签行下钻与告警关联对象定位。
export const clusterDetailPages = ['cluster', 'node', 'gpu', 'cluster-template', 'cluster-capability-detail'];

// 列表与集群详情的页头说明沿用旧原型 main.jsx 的文案。
const listDescriptions = {
  clusters: '负责 Kubernetes 集群生命周期管理，以及节点、GPU 和集群运行能力管理。',
  'cluster-templates': '负责维护 Kubernetes 发行版、网络、存储、GPU 栈和调度策略的版本组合。'
};
const clusterDescription = '负责 Kubernetes 集群生命周期管理，以及节点、GPU 和集群运行能力管理。';

// 旧原型 ExtendedPage 对详情字段的覆盖规则：字段名 -> 由列表行派生的取值。
const detailMappings = {
  node: row => ({ 节点: row[0], 集群: row[1], 关联资产: row[5], 角色: row[2], 状态: row[3], 工作负载: '待从对象关联采集' }),
  'cluster-template': row => ({ 模板: row[0], 网络: row[3], '共享 / 调度': row[4] }),
  gpu: row => ({ '节点 / 资产': row[1], '型号 / 显存': `${row[2]} / ${row[3]}`, 运行模式: row[4], 关联分配: row[6] })
};

// 仅有 compute-lab 有采集过的容量、控制面与运行栈记录（旧原型固定示例）；其余集群一律标记为未采集。
const observedProfile = {
  capacity: [
    { label: 'CPU', unit: '核', total: 96, used: 32, reserved: 64 },
    { label: '内存', unit: 'GiB', total: 384, used: 128, reserved: 256 },
    { label: 'GPU', unit: '卡', total: 16, used: 8, reserved: 8 }
  ],
  components: [['Etcd', '健康', '示例'], ['Controller Manager', '健康', '示例'], ['Scheduler', '健康', '示例']],
  config: [['发行版', 'RKE2 / 示例版本'], ['生命周期', 'CAPI · 候选方案'], ['基础设施', 'Metal3 / Ironic · 待联调'], ['纳管入口', 'Rancher Turtles · 待组合验证'], ['网络 / 存储', 'CNI / CSI 选型待确认']],
  layers: [['驱动与 Toolkit', '镜像预装或 Operator 管理', '二选一的版本所有权'], ['设备暴露', '整卡 / MIG / HAMi', '插件互斥及隔离保证待验'], ['工作负载调度', '在线默认 / 批任务队列', 'Volcano 与共享调度路径待验'], ['约束', '设备插件管理权与调度路径必须明确', '不能直接叠加安装']],
  runtime: [['设备运行栈', 'GPU Operator', '待验证'], ['资源暴露', '整卡 / MIG / HAMi', '方案待定'], ['批调度与队列', 'Volcano', '按 S2 场景启用']],
  access: [['Rancher Explorer', 'S4 / 项目映射', '专业资源操作'], ['namespace RBAC', '外部项目引用', 'S2 使用约定'], ['kubectl 访问', '凭据引用', '不显示明文'], ['打开 Rancher', '专业资源操作由 Rancher 提供', '正式接入需要 SSO、集群映射和访问授权；本原型不打开真实控制台']],
  events: [['TASK-DEMO-03', 'Rancher 纳管', '示例完成'], ['TASK-DEMO-04', 'GPU 能力验证', '待执行']]
};
const unobservedProfile = {
  capacity: null,
  components: [['控制面组件', '未采集', '标未知，不视为健康']],
  config: [['节点与运行能力', '未采集', '详细节点与运行能力尚未采集']],
  layers: [],
  runtime: [],
  access: [['Rancher 纳管', '未采集', '专业资源操作由 Rancher 提供；本原型不打开真实控制台'], ['kubectl 访问', '凭据引用', '不显示明文']],
  events: [['任务事件', '未记录', '不推断为已完成']]
};
const clusterProfiles = { 'compute-lab': observedProfile };

const nodeIds = new Set(nodeRecords.map(node => node.id));
const gpuIds = new Set(gpuRecords.map(gpu => gpu.id));

export function listData(pageId) {
  const source = clusterListPages.includes(pageId) ? listSource(pageId) : null;
  if (!source) return null;
  return { ...source, description: listDescriptions[pageId], secondaryForms: pageId === 'clusters' ? ['cluster-register'] : [] };
}

// 关联证据（节点 / GPU）只在对象表中精确命中时给出链接，未知 ID 不生成链接。
export function evidenceLinkFor(row) {
  const id = String(row[0]);
  if (nodeIds.has(id)) return { name: 'node', query: { id } };
  if (gpuIds.has(id)) return { name: 'gpu', query: { id } };
  return null;
}

// 详情按 id 精确定位父列表行；未指定 id 时明确使用列表首行示例，指定但不存在时返回 null。
// 节点 / GPU 详情不再有独立列表页，行数据直接取自 model 的节点 / GPU 行，归属集群列表。
export function detailData(pageId, id = '') {
  if (!clusterDetailPages.includes(pageId)) return null;
  if (pageId === 'cluster') return clusterDetail(pageId, id);
  if (pageId === 'node' || pageId === 'gpu') {
    const source = pageId === 'node' ? nodeRows : gpuRows;
    const objectId = id || String(source[0]?.[0] ?? '');
    const row = source.find(cells => String(cells[0]) === objectId);
    return row ? catalogDetail(pageId, { id: objectId, parent: 'clusters', row }) : null;
  }
  const hit = objectRow(pageId, id);
  if (!hit) return null;
  if (pageId === 'cluster-capability-detail') return capabilityDetail(hit);
  return catalogDetail(pageId, hit);
}

function objectRow(pageId, id) {
  const parent = detailPages[pageId]?.parent;
  const source = parent ? listSource(parent) : null;
  if (!source) return null;
  const objectId = id || String(source.rows[0]?.[0] ?? '');
  const row = source.rows.find(cells => String(cells[0]) === objectId);
  return row ? { id: objectId, parent, row } : null;
}

function baseDetail(id, parent, title, row) {
  return { id, parent, title, description: '', row, fields: [], tabs: [], action: null, actionLabel: null, badge: null, relatedLinks: [], summary: null, source: null };
}

function fieldRows(fields) {
  return fields.map(([label, value]) => [label, value, '详情字段（固定示例）']);
}

function catalogDetail(pageId, { id, parent, row }) {
  const config = catalog[pageId];
  const mapping = detailMappings[pageId]?.(row) ?? {};
  const fields = config.fields.map(([label, value], index) => [label, String(label in mapping ? mapping[label] : index === 0 ? row[0] : value)]);
  const tabs = config.tabs.map(title => ({ key: title, title, rows: tabContent(pageId, title, row) ?? fieldRows(fields) }));
  return { ...baseDetail(id, parent, config.title, row), description: config.description, fields, tabs, action: config.action ?? null };
}

function capabilityDetail({ id, parent, row }) {
  const pageId = 'cluster-capability-detail';
  const config = catalog[pageId];
  const capability = clusterCapability[id];
  const checks = capability?.checks ?? [];
  const fields = [['集群', id], ['验收结论', capability?.verdict ?? '未采集'], ...checks.map(([label, status, note]) => [label, note && note !== '—' ? `${status} · ${note}` : status])];
  const tabs = config.tabs.map(title => ({ key: title, title, rows: tabContent(pageId, title, row) ?? fieldRows(fields) }));
  return { ...baseDetail(id, parent, config.title, row), description: config.description, fields, tabs, action: config.action ?? null, relatedLinks: [] };
}

// 命名空间与工作负载页签（评审稿 3.2.1）：Namespace 与配额使用标注关联交付单；S1 只读，编辑跳 Rancher（D1）。
function namespaceRows(clusterId) {
  const orders = deliveryOrderRecords.filter(order => order.kind === '集群池' && order.delivery?.ns?.startsWith(clusterId));
  if (!orders.length) return [['Namespace', '无', '交付单交付后才创建']];
  return orders.flatMap(order => {
    const quota = order.id === 'DELIV-DEMO-01' ? '整卡 × 6 / 上限 8' : order.request.demand;
    const workload = order.run.workloads[0] ?? '无';
    return [[
      order.delivery.ns.split(' / ')[1] ?? order.delivery.ns,
      quota,
      `${order.id} · ${orderStageLabel(order)}`,
      workload,
      'S1 只读；工作负载编辑跳转 Rancher（D1）'
    ]];
  });
}

function clusterDetail(pageId, requestedId) {
  const base = objectDetail(pageId, requestedId);
  if (!base) return null;
  const { id, row } = base;
  const capability = clusterCapability[id];
  const profile = clusterProfiles[id] ?? unobservedProfile;
  const gpuCheck = capability?.checks.find(([label]) => label === 'GPU 软件栈');
  const nodes = nodeRecords.filter(node => node.cluster === id);
  const gpus = gpuRecords.filter(gpu => nodes.some(node => node.id === gpu.node));
  const networkChecks = (capability?.checks ?? []).filter(([label]) => /CNI|CSI|镜像/.test(label));
  const stats = [
    { label: 'API 状态', value: String(row[4]), caption: 'Kubernetes 条件 / 示例' },
    { label: 'Rancher 纳管', value: String(row[5]), caption: '与 API 就绪独立记录' },
    { label: '控制面 / 工作节点', value: String(row[3]), caption: '节点数量（示例）' },
    { label: 'GPU 运行能力', value: gpuCheck?.[1] ?? '未采集', caption: '不以集群就绪替代 GPU 验收' }
  ];
  const tabs = [
    { key: '概览', title: '概览', rows: [['能力验收结论', capability?.verdict ?? '未采集', '平台就绪 ≠ 能力验收通过'], ...profile.components, ...profile.config] },
    { key: '节点', title: '节点', rows: nodes.map(node => [node.id, node.role, `状态 ${node.state}`, `调度 ${node.sched}`]) },
    { key: 'GPU 与调度', title: 'GPU 与调度', rows: [...profile.layers, ...profile.runtime, ...(gpuCheck ? [['GPU 软件栈', gpuCheck[1], gpuCheck[2]]] : []), ...gpus.map(gpu => [gpu.id, gpu.node, `${gpu.mode} · ${gpu.health}`, gpu.alloc])] },
    { key: '命名空间与工作负载', title: '命名空间与工作负载', rows: namespaceRows(id) },
    { key: '网络与存储', title: '网络与存储', rows: networkChecks },
    { key: '访问', title: '访问', rows: profile.access },
    { key: '任务事件', title: '任务事件', rows: profile.events }
  ];
  return {
    ...baseDetail(id, base.parent, base.title, row),
    description: clusterDescription,
    fields: base.fields,
    tabs,
    action: 'cluster-change',
    actionLabel: '变更计划',
    badge: row[4] === '就绪' ? '运行中' : '未知',
    relatedLinks: capability ? [{ label: '集群能力详情', name: 'cluster-capability-detail', id }] : [],
    summary: { stats, capacity: profile.capacity, capacityNote: '容量未采集；未知不计入可分配容量。' },
    source: row[7] === '已有集群接入' ? { fields: [['集群', id], ['API', String(row[4])], ['Rancher', String(row[5])], ['生命周期', String(row[7])]], note: '该示例集群只纳管、不默认接管 OS 和升级；详细节点与运行能力尚未采集。' } : null
  };
}

// 本模块会打开的预检表单（均须存在于 forms；由 PlanModal 渲染）。资源规格表单随 specs 页划入资源与交付模块。
export const clusterForms = ['cluster-create', 'cluster-register', 'cluster-template', 'gpu-mode', 'maintenance', 'cluster-change', 'cluster-capability'];
