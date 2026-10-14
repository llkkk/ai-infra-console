// 资源与交付模块的纯数据适配与逻辑（无 Vue 依赖）。
// 列表来自 catalog.js / model.js；交付单按“申请 → 分配 → 交付 → 运行 → 释放”两级状态机组织（评审稿 3.3）。
import { catalog, forms } from '../../catalog.js';
import { objectDetail, listSource, stateColumn } from './objects.js';
import { tabContent } from '../../detail-tabs.js';
import { deliveryProgress } from './delivery-progress.js';
import {
  allocationRecords, assetRecords, baremetalMembers, capacityCheck, dedicatedPoolMembers, deliveryLife, deliveryOrderRecords, deliveryOrderRows,
  gpuRecords, orderStageLabel, POOL_CAPACITY, poolRecords, quotaRecords, requestMatch, roomName, workloadRecords
} from '../../model.js';

const titleOf = name => forms[name]?.title ?? name;

export const poolListPages = ['pools', 'deliveries', 'specs'];
export const poolDetailPages = ['pool', 'delivery-order', 'spec'];

// 无可识别状态列时的筛选列（显式指定，避免 ObjectList 读取 -1 列）。
const FALLBACK_FILTER_COLUMN = { pools: 4 };

const columnsOf = pageId => catalog[pageId].columns;
const columnFields = (columns, row) => columns.map((label, index) => [label, String(row[index])]);

export function listData(pageId, demoRows = []) {
  const source = poolListPages.includes(pageId) ? listSource(pageId) : null;
  if (!source) return null;
  const columns = columnsOf(pageId);
  const rows = pageId === 'deliveries' ? [...source.rows, ...demoRows] : source.rows;
  const index = stateColumn(columns);
  return { ...source, columns, rows, stateIndex: index >= 0 ? index : (FALLBACK_FILTER_COLUMN[pageId] ?? 0) };
}

export function detailData(pageId, id, demoOrders = []) {
  if (pageId === 'delivery-order') return deliveryOrderDetail(findOrder(id, demoOrders));
  const base = poolDetailPages.includes(pageId) ? objectDetail(pageId, id) : null;
  if (!base) return null;
  const builder = BUILDERS[pageId];
  const row = base.row;
  return {
    id: base.id,
    parent: base.parent,
    title: base.title,
    row,
    fields: [...columnFields(columnsOf(base.parent), row), ...builder.extraFields(row)],
    tabs: builder.tabs(row, demoOrders),
    actions: builder.actions(row)
  };
}

// ---------- 交付单状态机 ----------
// 演示推进序列（模拟 S2 申请与状态推进只作用于本地演示数据，不写回 model；幂等键仅展示）。
export const ORDER_FLOW = [
  { stageIdx: 0, sub: '已提交', label: '申请已提交（幂等键已登记）' },
  { stageIdx: 0, sub: '校验通过', label: '容量与配额校验通过' },
  { stageIdx: 1, sub: '已预留', label: '生成预留（带有效期，占容量不占用）' },
  { stageIdx: 2, sub: '环境准备中', label: '环境准备（Namespace / 配额 / 权限 / 镜像存储）' },
  { stageIdx: 2, sub: '待验收', label: '底座验收检查' },
  { stageIdx: 2, sub: '已交付', label: '环境已交付，待接收' },
  { stageIdx: 3, sub: '已接收', label: 'S2 / 租户确认接收' },
  { stageIdx: 3, sub: '运行中', label: '进入运行' },
  { stageIdx: 4, sub: '释放中', label: '释放执行（裸金属含数据擦除 / 重装 / 复检）' },
  { stageIdx: 4, sub: '已释放', label: '已释放（终态）', final: '已释放' }
];

export const SIM_FAILURES = [
  { kind: '容量不足', note: '容量不足：需求超过池可分配', to: { stageIdx: 0, sub: '校验不通过', final: '已拒绝' } },
  { kind: '配额不足', note: '配额不足：项目配额剩余不足', to: { stageIdx: 0, sub: '校验不通过', final: '已拒绝' } },
  { kind: '验收失败', note: '验收失败：预留可回滚，转人工处理（重试 / 回滚）', to: { stageIdx: 2, sub: '人工处理（验收失败）', final: null } }
];

export function flowIndexOf(order) {
  return ORDER_FLOW.findIndex(step => step.stageIdx === order.stageIdx && step.sub === order.sub);
}
export function nextFlowState(order) {
  const index = flowIndexOf(order);
  if (index < 0 || index >= ORDER_FLOW.length - 1) return null;
  const step = ORDER_FLOW[index + 1];
  return { stageIdx: step.stageIdx, sub: step.sub, final: step.final ?? null };
}

// ---------- 交付单解析 ----------
export const findOrder = (id, demoOrders = []) =>
  deliveryOrderRecords.find(order => order.id === id) ?? demoOrders.find(order => order.id === id) ?? null;

const section = rows => rows.map(([label, value, note]) => [label, String(value), note ?? '—']);

export function deliveryOrderDetail(order) {
  if (!order) return null;
  return {
    id: order.id,
    parent: 'deliveries',
    title: '交付单详情',
    kind: order.kind,
    pool: order.pool,
    project: order.project,
    stageIdx: order.stageIdx,
    sub: order.sub,
    final: order.final ?? null,
    stageLabel: orderStageLabel(order),
    demo: order.demo ?? false,
    progress: deliveryProgress(order),
    request: section([
      ['申请编号', order.request.id], ['需求', order.request.demand], ['运行时 / 镜像', order.request.runtime], ['提交时间', order.request.at]
    ]),
    check: section([
      ['容量校验', order.check.capacity], ['配额校验', order.check.quota], ['说明', order.check.note]
    ]),
    reserve: section([
      ['预留 / 分配', order.reserve.alloc ?? '未创建'],
      ['状态', order.reserve.state],
      ['有效期', order.reserve.until],
      ['绑定', order.reserve.bound]
    ]),
    delivery: order.delivery ? section([
      ['交付环境', order.delivery.env], ['Namespace', order.delivery.ns], ['状态', order.delivery.state], ['验收', order.delivery.accept]
    ]) : [['环境', '未创建', '校验通过并预留后才进入环境准备']],
    run: section([
      ['运行状态', order.run.state], ['接收确认', order.run.received ?? '—'],
      ['工作负载', order.run.workloads.length ? order.run.workloads.join('；') : '无关联']
    ]),
    release: section([['释放', order.release.state], ['门禁 / 说明', order.release.gate]]),
    timeline: order.timeline,
    tasks: order.tasks ?? [],
    actions: orderActions(order)
  };
}

// 预留单可发起环境验收；已交付 / 运行单可发起释放预检；申请中与终态无直接操作。
function orderActions(order) {
  if (order.final) return [];
  if (order.stageIdx === 1) return [{ label: titleOf('acceptance'), action: 'acceptance', context: [order.reserve.alloc] }];
  if (order.stageIdx >= 2) return [{ label: titleOf('release'), action: 'release', context: [order.reserve.alloc] }];
  return [];
}

// ---------- 交付单证据关联 ----------
// 申请 / 分配 / 环境 / 工作负载 ID 统一解析到所属交付单；解析不到返回 null，不回退。
const orderRowOf = take => id => {
  const record = deliveryOrderRecords.find(order => take(order) === id);
  return record ? deliveryOrderRows.find(row => row[0] === record.id) : null;
};
export function evidenceLinkFor(row) {
  const orderLink = id => {
    // 工作负载 ID 先换算成所属环境，再定位交付单。
    const workload = workloadRecords.find(item => item.id === id);
    const envId = workload ? workload.env : id;
    const target = orderRowOf(order => order.reserve.alloc)(id)
      ?? orderRowOf(order => order.request.id)(id)
      ?? orderRowOf(order => order.delivery?.env)(envId);
    return target ? { name: 'delivery-order', query: { id: String(target[0]) } } : null;
  };
  if (row[0] === '所属环境') return orderLink(String(row[1]));
  const id = String(row[0]);
  if (/^(REQ|ALLOC|ENV|DELIV|BM-ALLOC)-/.test(id) || /^(infer|batch|eval)-/.test(id)) return orderLink(id);
  if (/^gpu-(whole|mig|shared)$/.test(id)) return { name: 'spec', query: { id } };
  const gpu = gpuRecords.find(item => item.node === id);
  if (gpu && assetRecords.some(asset => asset.id === id)) return { name: 'gpu', query: { id: gpu.id } };
  return null;
}

const poolOf = id => poolRecords.find(pool => pool.id === id);
// 三类池：专属（独占，容量即配额）/ 共享（多项目配额切分）/ 裸金属（整机租赁）。
const CLUSTER_POOL_TYPES = ['专属资源池', '共享资源池'];
const isClusterPool = pool => CLUSTER_POOL_TYPES.includes(pool.type);
const isDedicatedPool = pool => pool.type === '专属资源池';
const isGpuPoolRow = row => row[1] === '共享资源池' && row[3] === '整卡';
const quotasOf = pool => quotaRecords.filter(quota => quota.pool === pool);

// ---------- 资源池详情（评审稿 3.3.2：概览 / 成员 / 规格与配额 / 交付单） ----------
export function poolTabRows(tab, row, demoOrders = []) {
  const pool = poolOf(String(row[0]));
  const orders = poolDeliveryOrders(String(row[0]), demoOrders);
  if (tab === '概览') {
    const base = [
      ['所属机房', `${roomName(pool.room)}（池不跨机房，D8）`, '执行层本机房负责池内动作'],
      ['资源模式', pool.mode, 'MIG / 共享待验证，不计入容量'],
      ['计费', '不在 S1 计算价格', '—']
    ];
    if (pool.type === '裸金属资源池') {
      return [...base,
        ['容量口径', '按整机台数：物理 2 台 · 已租出 1 · 可用 1（示例）', '整机不入 K8s 集群'],
        ['创建前置', '硬件基线通过 · OS 装机验收通过 · 带外与网络可用', '—'],
        ['释放回收', '数据擦除 + 重装 OS + 硬件复检，通过后回池', '复用装机任务（TASK-DEMO-06 示例）']];
    }
    if (isDedicatedPool(pool)) {
      return [...base,
        ['独占项目', pool.dedicatedTo, '专属池绑定单一项目；节点不回共享池'],
        ['容量口径', '物理 8 卡 · 已分配 6 · 预留 0 · 可分配 2（示例）', '容量即配额，不做多项目切分'],
        ['配额说明', '不适用（独占）', '共享池才做项目配额切分（权威来源待 X3）'],
        ['交付单校验', '仅校验池内可分配，无配额竞争', '见 DELIV-DEMO-09 示例']];
    }
    const quotas = quotasOf(pool.id);
    const pct = Math.round(capacityCheck().allocated / POOL_CAPACITY.physical * 100);
    return [...base,
      ['容量口径', `物理 16 卡 · 已分配 ${capacityCheck().allocated} · 预留 ${capacityCheck().reserved} · 可分配 ${capacityCheck().available}`, '容量 ≠ 配额剩余'],
      ['整卡分配率', `${pct}%（示例）`, '分配事实；非利用率；DCGM 利用率未接入'],
      ...quotas.map(quota => [quota.id, `已分配 ${quota.used} / 配额 ${quota.whole}`, `预留 ${quota.reserved} · 实际运行 ${quota.running}`]),
      ['配额与使用', '项目配额不是独占预留；配额权威来源待 X3 确认', '—']];
  }
  if (tab === '成员') {
    if (pool.type === '裸金属资源池') {
      return baremetalMembers.map(member => [member.asset, member.model, member.state, member.order, member.lease]);
    }
    if (isDedicatedPool(pool)) {
      return dedicatedPoolMembers.map(member => [member.node, member.gpu, member.state, member.order, member.note]);
    }
    return assetRecords
      .filter(asset => asset.ownership?.kind === 'cluster' && asset.ownership.cluster === pool.cluster && /GPU/.test(asset.type))
      .map(asset => [asset.id, asset.gpu, '整卡', asset.stage === 'in_cluster' ? '已入集群' : asset.stage]);
  }
  if (tab === '规格与配额') {
    if (pool.type === '裸金属资源池') {
      return [
        ['bm-8gpu', '整机 · 8 卡 GPU 机型', '台', '启用', '被 1 个池引用（baremetal-01）'],
        ['配额说明', '裸金属池按台数与租期约束', '—', '—', '申请方与计量口径待 X4 确认']];
    }
    if (isDedicatedPool(pool)) {
      return [
        ['gpu-whole', '整卡（专属 / 共享池通用）', '1 卡', '启用', '被 2 个池引用（gpu-general / dedicated-gpu）'],
        ['配额切分', '不适用（独占池容量即配额）', '—', '—', '共享池才做项目配额切分']];
    }
    const specs = catalog.specs.rows.filter(spec => spec[1] !== '裸金属池').map(spec => [spec[0], spec[1], spec[2], spec[5]]);
    const quotas = quotasOf(pool.id).map(quota => [quota.id, `整卡上限 ${quota.whole}`, `已分配 ${quota.used}`, `预留 ${quota.reserved}`, `实际运行 ${quota.running}`, '调整经审批流程（S3 / S4）']);
    return [...specs, ...quotas, ['配额权威来源', 'IAM / S3 / S5 待确认（X3）', '—', '—', '调整走审批，不在池页直接改']];
  }
  if (tab === '交付单') {
    if (!orders.length) return [['交付单', '暂无', '该池的交付单与全局交付单同数据（D3）']];
    return orders;
  }
  return [];
}

// 池内交付单：与全局交付单同一数据源（D3），仅按池过滤；演示单据一并计入。
export function poolDeliveryOrders(poolId, demoOrders = []) {
  const rows = [...deliveryOrderRecords.map((order, index) => ({ order, row: deliveryOrderRows[index] })),
    ...demoOrders.map(order => ({ order, row: demoOrderRow(order) }))];
  return rows.filter(({ order }) => order.pool === poolId).map(({ row }) => row);
}

// 演示单据行（与 deliveryOrderRows 同列结构）。
export function demoOrderRow(order) {
  return [order.id, order.kind, order.pool, order.project, orderStageLabel(order), order.request.demand,
    order.run?.received ?? '—', order.reserve.until ?? '—'];
}

const BUILDERS = {
  pool: {
    extraFields: () => [],
    tabs: (row, demoOrders) => ['概览', '成员', '规格与配额', '交付单']
      .map(title => ({ key: title, title, rows: poolTabRows(title, row, demoOrders) })),
    actions: row => {
      const pool = [{ label: titleOf('pool'), action: 'pool', context: row }];
      if (!isGpuPoolRow(row)) return pool;
      return [
        ...pool,
        ...quotasOf(String(row[0])).map(quota => ({ label: `${titleOf('quota')} · ${quota.id}`, action: 'quota', context: [quota.id, quota.ext] })),
        ...allocationRecords.filter(item => item.state === '已预留').map(item => ({ label: `${titleOf('acceptance')} · ${item.id}`, action: 'acceptance', context: [item.id] }))
      ];
    }
  },
  spec: {
    extraFields: () => [],
    tabs: row => catalog.spec.tabs.map(title => ({
      key: title,
      title,
      rows: tabContent('spec', title, row) ?? columnFields(catalog.specs.columns, row).map(([label, value]) => [label, value, '对象字段（示例）'])
    })),
    actions: row => [{ label: titleOf('spec'), action: 'spec', context: row }]
  }
};

// ---------- 模拟 S2 申请（评审稿 3.3.6：演示入口统一开关隔离，只生成本地演示单据） ----------
export const S2_REQUEST_FIELDS = [
  ['pool', '资源池'],
  ['demand', '规格 × 数量'],
  ['runtime', '运行时 / 镜像'],
  ['storage', '存储'],
  ['network', '网络'],
  ['valid', '有效期']
];
export function defaultS2Request() {
  return { pool: 'gpu-general', demand: 'gpu-whole × 2', runtime: 'vLLM / image-ref', storage: 'model-storage', network: '推理入口待确认', valid: '30 天' };
}
export function s2RequestBody(state, idempotencyKey) {
  return {
    pool: state.pool, spec: state.demand, runtime: state.runtime,
    storage: state.storage, network: state.network, validUntil: state.valid,
    source: 'S2（模拟）', idempotencyKey
  };
}
// 演示单据由请求体生成：阶段 0 · 已提交；推进 / 失败由 ORDER_FLOW / SIM_FAILURES 驱动。
export function demoOrderFromRequest(state, seq, idempotencyKey) {
  const baremetal = state.pool === 'baremetal-01';
  return {
    id: `DELIV-DEMO-9${seq}`, kind: baremetal ? '裸金属池' : '集群池', pool: state.pool,
    project: 'S2 / 模型工程（模拟申请）', stageIdx: 0, sub: '已提交', final: null, demo: true,
    request: { id: `REQ-SIM-${seq}`, demand: state.demand, runtime: state.runtime, at: '刚刚（演示）' },
    check: { capacity: '待校验', quota: '待校验', note: `演示单据；幂等键 ${idempotencyKey}` },
    reserve: { alloc: null, state: '未创建', until: '—', bound: '校验通过后才创建预留' },
    delivery: null,
    run: { state: '未进入', received: null, workloads: [] },
    release: { state: '未进入', gate: '—' },
    timeline: [['刚刚（演示）', '申请提交', `模拟 S2 接口提交；幂等键 ${idempotencyKey}`]],
    tasks: [], flowNote: '演示单据：可用详情页演示控制条推进或模拟失败'
  };
}
