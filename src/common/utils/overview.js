// 基础设施总览的纯数据：演示场景、交付链路地图、分层指标与需关注对象。不依赖 Vue。
// 场景与链路数据复制自旧原型 scenarios.js / chain.js；所有跳转只做页面导航，不执行任何操作。
import { deliveryOrderRecords, orderStageLabel, roomRecords, selectAlerts } from '../../model.js';
import { INCIDENTS } from '../../incident-data.js';
import { linkTarget } from './monitor.js';

// 演示场景：步骤 link 为 {type,id}（按稳定 ID 定位对象详情）或 {page}（列表页）。
// 申请 / 分配 / 环境 / 工作负载对象统一以交付单详情定位（见 model.js LINK_TYPES）。
export const SCENARIOS = [
  { id: 'provision', title: '正常交付', desc: '资产（含 BMC/硬件） → 装机 → 集群/节点 → 能力验收 → 交付单（申请 / 预留 / 交付 / 工作负载）', steps: [
    { label: '资产 compute-01 详情', link: { type: 'asset', id: 'compute-01' } },
    { label: '资产 compute-01 BMC 与带外（已并入资产详情）', link: { type: 'bmc', id: 'compute-01' }, note: '切到“BMC 与带外”页签' },
    { label: '装机工作台 TASK-DEMO-01', link: { type: 'provision', id: 'TASK-DEMO-01' } },
    { label: '集群 compute-lab', link: { type: 'cluster', id: 'compute-lab' } },
    { label: '节点 compute-01（集群详情页签下钻）', link: { type: 'node', id: 'compute-01' } },
    { label: '查看集群能力状态（部分通过）', link: { page: 'clusters' } },
    { label: '交付单 DELIV-DEMO-01（申请 → 预留 → 交付）', link: { type: 'environment', id: 'ENV-DEMO-01' } },
    { label: '工作负载 infer-demo（模型就绪待 S2 验收）', link: { type: 'workload', id: 'infer-demo' } }] },
  { id: 'reprovision', title: '装机失败恢复', desc: '失败历史保留；重检通过 ≠ OS/集群验收通过', steps: [
    { label: '装机工作台 TASK-DEMO-02（含失败历史）', link: { type: 'provision', id: 'TASK-DEMO-02' } },
    { label: '故障单 INC-DEMO-02（S1 复验关闭）', link: { type: 'incident', id: 'INC-DEMO-02' } },
    { label: '装机模板 gpu-baseline-02（r02 修订）', link: { type: 'image', id: 'gpu-baseline-02' } },
    { label: '资产 compute-03 当前状态（检查通过）', link: { type: 'asset', id: 'compute-03' } },
    { label: '资产 compute-03 硬件能力（已合入资产详情）', link: { type: 'asset', id: 'compute-03' }, note: '切到“硬件能力”页签' }] },
  { id: 'gpu-fault', title: 'GPU 故障', desc: '告警 → 故障单 → 关联对象 → 恢复动作门禁 → 复验与关闭条件', steps: [
    { label: '告警 ALERT-DEMO-01', link: { type: 'alert', id: 'ALERT-DEMO-01' } },
    { label: '故障单 INC-DEMO-01（等待人工处理）', link: { type: 'incident', id: 'INC-DEMO-01' } },
    { label: 'GPU-DEMO-002（异常）', link: { type: 'gpu', id: 'GPU-DEMO-002' } },
    { label: 'BMC 带外复核（compute-02 部分采集）', link: { type: 'bmc', id: 'compute-02' }, note: '资产详情“BMC 与带外”页签' },
    { label: '交付单 DELIV-DEMO-02（ALLOC-DEMO-02 占用待核实）', link: { type: 'allocation', id: 'ALLOC-DEMO-02' } },
    { label: '环境 ENV-DEMO-02（S2 影响待确认）', link: { type: 'environment', id: 'ENV-DEMO-02' } },
    { label: '工作负载 batch-demo', link: { type: 'workload', id: 'batch-demo' } }] },
  { id: 'capacity', title: '容量不足与资源约束', desc: '资源约束不是容量；预留不是实际占用', steps: [
    { label: '申请 REQ-DEMO-03（8 卡 > 可分配 6）', link: { type: 'request', id: 'REQ-DEMO-03' }, note: '交付单“流程阶段”页签' },
    { label: '资源池 gpu-general 容量口径', link: { type: 'pool', id: 'gpu-general' } },
    { label: '申请 REQ-DEMO-01（容量够、配额不足）', link: { type: 'request', id: 'REQ-DEMO-01' }, note: '交付单“流程阶段”页签' }] },
  { id: 'release', title: '释放回收', desc: '工作负载 / 数据 / 权限分别确认；不清盘共享节点', steps: [
    { label: '环境 ENV-DEMO-02（释放预检不通过）', link: { type: 'environment', id: 'ENV-DEMO-02' }, note: '交付单“释放回收”页签' },
    { label: '工作负载 batch-demo（Pending 未停止）', link: { type: 'workload', id: 'batch-demo' } },
    { label: '分配 ALLOC-DEMO-02（交付单跟踪）', link: { type: 'allocation', id: 'ALLOC-DEMO-02' } },
    { label: '环境 ENV-DEMO-03（已释放结果）', link: { type: 'environment', id: 'ENV-DEMO-03' }, note: '交付单“释放回收”页签' },
    { label: '分配 ALLOC-DEMO-04（已释放）', link: { type: 'allocation', id: 'ALLOC-DEMO-04' } }] },
  { id: 'unknown', title: '未知与权限不足', desc: '无数据标未知；未授权动作不可用', steps: [
    { label: 'BMC reserve-01（无数据 / 操作不可用）', link: { type: 'bmc', id: 'reserve-01' }, note: '资产详情“BMC 与带外”页签' },
    { label: '监控总览（无数据标未知）', link: { page: 'monitor' } },
    { label: '节点 cpu-worker-01（Unknown / 不可调度）', link: { type: 'node', id: 'cpu-worker-01' } },
    { label: '待授权会话 SESSION-DEMO-02', link: { type: 'session', id: 'SESSION-DEMO-02' } },
    { label: '运维接入通道（Kubernetes API 待验证）', link: { page: 'audit' } }] }
];

// 步骤目标：列表页直接返回页面名；对象步骤按类型 + ID 精确定位，缺失返回 null。
export function scenarioTarget(step) {
  const link = step.link;
  if (!link.type) return link.page ? { name: link.page } : null;
  return linkTarget(link.type, link.id);
}

// 交付链路地图：节点 = [页面标题, 页面 ID, 所属模块标注]；供应线 → 交付线（算力 / 裸金属两条支线），横切覆盖全链。
export const CHAIN = {
  supply: { label: '供应线 · 把机器变成可用算力', nodes: [
    ['服务器资产（含 BMC 与带外）', 'assets', '服务器与装机'],
    ['装机管理（模板 / 基线 / 任务）', 'provisioning', '服务器与装机'],
    ['Kubernetes 集群（含节点 / GPU）', 'clusters', '集群与算力'],
    ['集群模板', 'cluster-templates', '集群与算力']] },
  delivery: { label: '交付线 · 把算力变成可用环境', nodes: [
    ['资源规格', 'specs', '资源与交付'],
    ['资源池（集群池 / 裸金属池）', 'pools', '资源与交付'],
    ['交付单（申请 / 预留 / 交付 / 运行 / 释放）', 'deliveries', '资源与交付']] },
  baremetal: { label: '裸金属支线 · 整机租赁（不入 K8s 集群）', nodes: [
    ['服务器资产（已装机整机）', 'assets', '服务器与装机'],
    ['裸金属池（整机成员 · 空闲 / 已租出 / 回收中）', 'pools', '资源与交付'],
    ['交付单（整机交付：OS / 网络 / 凭据引用；释放含擦除重装复检）', 'deliveries', '资源与交付']] },
  cross: { label: '横切 · 覆盖全链', nodes: [
    ['监控与告警', 'monitor', '运行期观测'],
    ['运维与审计', 'audit', '受控接入'],
    ['基础服务', 'registry', '平台依赖'],
    ['任务中心', 'tasks', '异步执行'],
    ['平台治理', 'settings', '全局规则']] }
};

// 节点颜色按所属模块标注区分（与旧原型 CHAIN_MODULE_CLASS 一致）。
export const CHAIN_TONE = { 服务器与装机: 'assets', 集群与算力: 'clusters', 资源与交付: 'pools' };

export function overviewMetrics() {
  const openIncidents = Object.values(INCIDENTS).filter(inc => inc.phase !== '已关闭').length;
  const roomsOnline = roomRecords.filter(room => room.exec.state === '在线').length;
  return [
    { label: '服务器资产', value: '11', caption: '阶段 / BMC / 任务三维状态' },
    { label: '集群 API', value: '1 / 2', caption: '1 个示例就绪 / 1 个未知' },
    { label: '机房在线', value: `${roomsOnline} / ${roomRecords.length}`, caption: '区域汇总显示 n / m 机房在线' },
    { label: '活跃告警 / 未关闭故障', value: `${selectAlerts('活跃告警').length} / ${openIncidents}`, caption: '信号与处理独立计数（示例）' }
  ];
}

// 待处理面板：汇总跨池的失败与待处理交付单（评审稿 3.6），叠加固定示例条目。
export function attentionItems() {
  const pendingOrders = deliveryOrderRecords.filter(order => !order.final && order.stageIdx <= 1);
  const orderItems = pendingOrders.map(order => ({
    title: `交付单 ${order.id} · ${orderStageLabel(order)}`,
    detail: `${order.project} · ${order.request.demand}`,
    target: { name: 'delivery-order', query: { id: order.id } }
  }));
  return [
    { title: '故障单 INC-DEMO-01 · 等待人工处理', detail: 'GPU-DEMO-002 不可分配 / 关联联调环境', target: { name: 'incidents' } },
    ...orderItems,
    { title: '区域或对象无数据', detail: '保留最后观测，不推断空闲', target: { name: 'settings' } }
  ];
}

export const OBSERVATION_LAYERS = [
  { title: '物理机', detail: '带外健康 / 电源 / 温度', target: { name: 'assets' } },
  { title: '虚拟机', detail: '实例健康 / 宿主资源', target: { name: 'monitor' } },
  { title: '集群', detail: 'Node / 控制面 / 网络存储', target: { name: 'clusters' } },
  { title: 'GPU', detail: '设备健康 / 显存 / 利用率', target: { name: 'gpu', query: { id: 'GPU-DEMO-001' } } }
];

// 固定示例趋势（非实时数据，仅展示产品布局）。
export const TREND_GRID_PATH = 'M0 40H600 M0 90H600 M0 140H600';
export const TREND_LINE_PATH = 'M0 135 L50 125 L100 133 L150 102 L200 112 L250 88 L300 91 L350 62 L400 75 L450 50 L500 61 L550 47 L600 56';
