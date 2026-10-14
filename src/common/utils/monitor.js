// 监控与告警模块的纯逻辑：告警 / 策略 / 故障筛选、详情解析、预检门禁与对象定位。不依赖 Vue。
// 所有数据为本地虚构示例；动作只生成预检计划，不写入任何状态。
import { alertRecords, assetRecords, clusterRows, deliveryOrderRecords, gpuRecords, nodeRecords, poolRecords, roomRecords, selectAlerts, resolveLink } from '../../model.js';
import { INCIDENTS, closeGate, archiveGate } from '../../incident-data.js';
import { catalog } from '../../catalog.js';
import { tabContent } from '../../detail-tabs.js';

export const ALERT_TABS = ['活跃告警', '告警历史', '告警策略'];
export const ALERT_DETAIL_TABS = ['诊断证据', '关联对象', '处理记录', '故障单'];
export const INCIDENT_TABS = ['故障列表', '复盘归档'];
export const REVIEW_STATUSES = ['待复盘', '复盘中', '已完成', '已归档'];
export const ACK_OPTIONS = ['未确认', '已确认'];
export const NOTIFICATION_OPTIONS = ['正常通知', '已静默'];
export const MANUAL_INCIDENT_CONTEXT = ['MANUAL-DEMO', '人工录入', '待选择资产'];
export const DETAIL_PAGES = ['alert', 'policy', 'incident', 'incident-review', 'channel'];
// 缺省 id（路由无 query）时展示的页面示例；指定但不存在的 id 必须返回 null，不回退到此处。
export const DEFAULT_DETAIL_IDS = { alert: 'ALERT-DEMO-01', policy: 'gpu-unavailable', incident: 'INC-DEMO-01', 'incident-review': 'INC-DEMO-03', channel: 'oncall-sms' };

export const MONITOR_DIMS = [
  { title: '物理机与 BMC', health: '5', warn: '0', unknown: '1', top: 'reserve-01 BMC 无数据（标未知）', page: 'assets', label: '服务器资产' },
  { title: '主机与 OS', health: '3（示例就绪）', warn: '0', unknown: '主机指标未接入', top: 'compute-lab 3 节点状态示例就绪', page: 'clusters', label: '集群与节点' },
  { title: '集群与 K8s', health: '1 API 就绪', warn: '0', unknown: '1 未采集', top: 'cpu-lab 未采集（标未知）', page: 'clusters', label: '集群' },
  { title: 'GPU 与设备', health: '15（示例）', warn: '1 不可分配', unknown: '利用率未接入', top: 'GPU-DEMO-002 不可分配（INC-DEMO-01）', page: 'clusters', label: '集群（GPU 页签）' }
];

// ---------- 监控总览细化（参考青云监控中心 + 评审稿 3.7 边界） ----------
// 资源分组 Tab：全部 / 专属池 / 共享池 / 裸金属池；裸金属组只看带外与硬件层（OS 内指标由租户负责）。
export const RESOURCE_GROUP_TABS = ['全部资源', '专属池', '共享池', '裸金属池'];

// 示例图表配色（与指标卡状态色一致）。
export const CHART_COLORS = { ok: '#2f855a', warn: '#d46b08', danger: '#c53030', unknown: '#8b959e', blue: '#165dff', cyan: '#2b8fae' };

// BMC 可达性计数（真实派生自资产数据）。
const bmcCounts = () => {
  const managed = assetRecords.filter(asset => !asset.sideState);
  const healthy = managed.filter(asset => asset.bmc === 'online').length;
  const noData = managed.filter(asset => asset.bmc === 'no_data' || asset.bmc === 'offline').length;
  const unmanaged = managed.filter(asset => asset.bmc === 'unmanaged').length;
  return { healthy, noData, unmanaged };
};
const deliveryOrders = () => deliveryOrderRecords;

const BM_CARDS_PER_HOST = 8; // 整机规格：8 卡 / 台（示例）

export function groupStats(group) {
  if (group === '裸金属池') {
    const pool = poolRecords.find(item => item.id === 'baremetal-01');
    return { clusters: '—（整机不入集群）', nodes: '整机 2 台', cards: `${2 * BM_CARDS_PER_HOST} 卡（按台计量）`, allocated: '已租出 1 台', note: '本组只看带外与硬件层；OS 内指标由租户负责' };
  }
  if (group === '专属池') {
    return { clusters: '1（compute-lab）', nodes: '独占节点 1', cards: '8 卡', allocated: '已分配 6 卡', note: '独占池容量即配额；利用率按池看' };
  }
  if (group === '共享池') {
    return { clusters: '1（compute-lab）', nodes: '节点 2', cards: '16 卡', allocated: '已分配 8 · 预留 2', note: '配额切分口径见资源池详情' };
  }
  return {
    clusters: `${clusterRows.length}（API 就绪 1 / 未知 1）`,
    nodes: `节点 4 · 独占 1 · 整机 2`,
    cards: `${16 + 8 + 2 * BM_CARDS_PER_HOST} 卡`,
    allocated: '已分配 22 卡（含租出整机折算）',
    note: '采集在执行层、汇总在管理层；默认全区域'
  };
}

// 四个资源层面（对标青云 物理机 / GPU / 容器组，按 S1 边界调整并加交付与容量层）。
// 每个指标回答“为什么关注”；未接入的显式标未知，不画假曲线。
export const LAYER_TABS = [
  { key: 'host', title: '物理机' },
  { key: 'gpu', title: 'GPU 与算力' },
  { key: 'cluster', title: '集群与容器组' },
  { key: 'delivery', title: '交付与容量' }
];

export function layerPanel(key) {
  if (key === 'host') {
    const bmc = bmcCounts();
    return {
    intro: '带外是硬件事实的唯一来源；OS 内指标只对 S1 纳管的集群节点采集，裸金属租出整机不采 OS（X9）。',
    metrics: [
      { name: '带外可达性', value: '无数据 1 台', state: 'warn', why: 'BMC 无数据不视为健康，也不计入可承诺容量（reserve-01）' },
      { name: '硬件传感器', value: '待复核 1 项', state: 'warn', why: '温度 / 电源 / 风扇来自带外传感器；GPU 相关指标待复核（compute-02 · INC-DEMO-01）' },
      { name: 'OS：CPU / 内存 / 磁盘使用率', value: '未接入', state: 'unknown', why: 'Node exporter（候选）；只看集群节点，裸金属租出机 OS 归租户' },
      { name: '磁盘 IO 与预测', value: '未接入', state: 'unknown', why: '磁盘故障前兆影响装机与交付；SMART / 带外采集待定' },
      { name: '主机功耗 / 温度', value: '未接入', state: 'unknown', why: '带外辅助信号，用于用量核对与散热定位，不进计费口径' },
      { name: '装机类任务健康', value: '进行中 1 · 失败 0', state: 'ok', why: '装机失败阻塞资产进入可交付阶段；失败历史保留（TASK-DEMO-01）' }
    ],
    charts: [
      { type: 'stack', title: '带外可达性（按资产计数）', total: `${bmc.healthy + bmc.noData + bmc.unmanaged} 台`,
        segments: [
          { name: 'BMC 在线', value: bmc.healthy, color: CHART_COLORS.ok },
          { name: '无数据 / 离线', value: bmc.noData, color: CHART_COLORS.danger },
          { name: '未纳管', value: bmc.unmanaged, color: CHART_COLORS.unknown }
        ],
        note: '无数据不计入可承诺容量；未纳管属于“已登记”阶段的正常态' },
      { type: 'trend', title: '集群节点 OS 使用率 · 固定示例', unit: '%', max: 100, labels: ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'],
        series: [
          { name: 'CPU 使用率', color: CHART_COLORS.blue, points: [42, 47, 55, 51, 44, 40] },
          { name: '内存使用率', color: CHART_COLORS.cyan, points: [61, 63, 66, 65, 62, 60] },
          { name: '磁盘使用率', color: CHART_COLORS.ok, points: [48, 48, 49, 49, 50, 50] }
        ],
        note: 'Node exporter（候选）接入前为固定示例曲线；正式未接入应显示“无数据”；裸金属租出机不在此图' }
    ],
    tops: [
      { object: 'reserve-01', state: 'warn', note: 'BMC 无数据 → ALERT-DEMO-02 跟踪中，不建故障单', page: 'asset', id: 'reserve-01' },
      { object: 'compute-02', state: 'warn', note: 'GPU 相关联传感器待复核（INC-DEMO-01）', page: 'asset', id: 'compute-02' },
      { object: '机房在线', state: 'ok', note: `${roomRecords.filter(room => room.exec.state === '在线').length} / ${roomRecords.length}；机房离线时该机房显示最后快照并禁写`, page: 'settings' }
    ]
  };
  }
  if (key === 'gpu') {
    const healthy = gpuRecords.filter(gpu => !String(gpu.health).includes('异常')).length;
    const abnormal = gpuRecords.length - healthy;
    return {
    intro: '设备健康决定可分配容量；利用率 / 显存是用量核对信号，不等于配额、不进计费口径。',
    metrics: [
      { name: '设备健康（不可分配卡）', value: '1 / 40 卡', state: 'warn', why: '不可分配卡直接扣减可交付容量，且不自动释放占用（GPU-DEMO-002 · INC-DEMO-01）' },
      { name: '计算卡利用率', value: '未接入', state: 'unknown', why: 'DCGM（候选）；接入后与分配率对比——高分配低利用提示规格错配' },
      { name: '显存使用率', value: '未接入', state: 'unknown', why: '显存占用 ≠ 显存配额；共享（HAMi）验证前不作为容量依据' },
      { name: '温度 / 功耗', value: '未接入', state: 'unknown', why: '辅助信号；温度超基线已有告警策略（gpu-temperature / gpu-throttling）' },
      { name: '分配率（事实）', value: '共享 50% · 专属 75%', state: 'ok', why: '分配事实可先于利用率监控落地；低可分配水位会直接拒绝申请' },
      { name: 'MIG / 共享份额', value: '未启用', state: 'unknown', why: '整卡模式当前唯一口径；切分能力验证后才计入容量' }
    ],
    charts: [
      { type: 'stack', title: '示例节点设备健康（登记在册 GPU）', total: `${gpuRecords.length} 卡`,
        segments: [
          { name: '健康', value: healthy, color: CHART_COLORS.ok },
          { name: '异常 / 不可分配', value: abnormal, color: CHART_COLORS.danger }
        ],
        note: '设备健康与分配事实分离：异常卡不自动释放占用（INC-DEMO-01）' },
      { type: 'trend', title: 'GPU 利用率 vs 分配率 · 固定示例', unit: '%', max: 100, labels: ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'],
        series: [
          { name: '计算卡利用率（均值）', color: CHART_COLORS.blue, points: [35, 52, 68, 61, 44, 33] },
          { name: '显存使用率（均值）', color: CHART_COLORS.cyan, points: [48, 60, 72, 70, 55, 47] },
          { name: '分配率（事实）', color: CHART_COLORS.warn, points: [50, 50, 50, 50, 50, 50] }
        ],
        note: 'DCGM（候选）接入前为固定示例；平线为分配率事实——高分配低利用提示规格错配，是容量复盘的核心对比' }
    ],
    tops: [
      { object: 'GPU-DEMO-002', state: 'warn', note: '设备不可分配 · 占用待核实（ALLOC-DEMO-02）', page: 'gpu', id: 'GPU-DEMO-002' },
      { object: 'GPU-DEMO-001', state: 'ok', note: '温度超基线历史已恢复（ALERT-DEMO-04），故障关闭仍需复验', page: 'gpu', id: 'GPU-DEMO-001' },
      { object: 'dedicated-node-01', state: 'ok', note: '独占节点利用率按池观察（示例）', page: 'pool', id: 'dedicated-gpu' }
    ]
  };
  }
  if (key === 'cluster') {
    const ready = nodeRecords.filter(node => node.state === 'Ready').length;
    const unknown = nodeRecords.length - ready;
    return {
    intro: '集群 API 与节点状态是交付前置；事件与 Pod 重启是信号不是故障单，应用层根因归 S2。',
    metrics: [
      { name: '集群 API 可用性', value: '就绪 1 / 未知 1', state: 'warn', why: 'API 不可用的集群不承接新交付（cpu-lab 未采集标未知）' },
      { name: '节点 Ready', value: `${ready} / ${nodeRecords.length}`, state: 'warn', why: 'Unknown 节点不参与调度、不判失败（cpu-worker-01）；执行层失联另行标注' },
      { name: '控制面组件', value: 'compute-lab 健康（示例）', state: 'ok', why: 'etcd / scheduler 异常影响整个集群，优先级高于单节点' },
      { name: 'Pod 重启 / 异常事件', value: '触发中 1 条', state: 'warn', why: 'infer-demo 重启达阈值（ALERT-DEMO-03）；原始 Event 不等于故障单' },
      { name: '容器组数量与重启统计', value: '未接入', state: 'unknown', why: '接入后只看平台信号（重启率 / Pending）；应用指标与业务就绪归 S2' },
      { name: '能力检查结果', value: '部分通过 1 / 未验收 1', state: 'warn', why: '平台就绪 ≠ 能力验收通过；未验收集群不承诺 GPU 运行能力' }
    ],
    charts: [
      { type: 'stack', title: '节点 Ready 状态（全部集群）', total: `${nodeRecords.length} 节点`,
        segments: [
          { name: 'Ready', value: ready, color: CHART_COLORS.ok },
          { name: 'Unknown（保留最后观测）', value: unknown, color: CHART_COLORS.unknown }
        ],
        note: 'Unknown 不参与调度也不判失败；执行层失联的任务另行标注，不并入此图' },
      { type: 'trend', title: '容器组数量与重启 · 固定示例', unit: '个', max: 120, labels: ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'],
        series: [
          { name: 'Running 容器组', color: CHART_COLORS.blue, points: [58, 64, 72, 70, 62, 57] },
          { name: '重启次数（小时）', color: CHART_COLORS.warn, points: [2, 3, 9, 6, 2, 1] }
        ],
        note: '只看平台信号（重启率 / Pending）；应用指标与业务就绪归 S2，不在本图' }
    ],
    tops: [
      { object: 'compute-lab / infer-demo', state: 'warn', note: 'Pod 异常重启告警触发中；应用原因待 S2 定位', page: 'alert', id: 'ALERT-DEMO-03' },
      { object: 'cpu-worker-01', state: 'warn', note: 'Node Unknown：保留最后观测，不推断恢复或释放', page: 'node', id: 'cpu-worker-01' },
      { object: 'compute-lab / s2-test（batch-demo）', state: 'warn', note: 'Pending 未停止，阻塞交付单释放预检', page: 'delivery-order', id: 'DELIV-DEMO-03' }
    ]
  };
  }
  return {
    intro: '交付与容量层是 S1 特有视角：池水位决定申请成败，交付类事件按评审稿 3.7 接入告警策略。',
    metrics: [
      { name: '池可分配水位', value: '共享 6 / 16 卡 · 专属 2 / 8 · 裸金属 1 / 2 台', state: 'ok', why: '可分配不足直接拒绝申请（DELIV-DEMO-06：需求 8 > 可分配 6）' },
      { name: '预留占用量与有效期', value: '预留 2 卡 · 1 单待验收', state: 'ok', why: '预留占容量不占用、带有效期；超时自动过期回容量（DELIV-DEMO-03）' },
      { name: '配额阻塞申请', value: '1 单校验中', state: 'warn', why: '配额不足不拒绝但阻塞交付，需审批流转（DELIV-DEMO-05）' },
      { name: '验收失败 / 释放异常', value: '0 单', state: 'ok', why: '验收失败转人工处理可回滚预留；交付类事件应产生告警（预留超时 / 配额不足 / 验收失败）' },
      { name: '机房在线', value: '2 / 2', state: 'ok', why: '机房离线：已交付环境继续运行，新任务不下发，控制台显示最后快照并禁写' },
      { name: '租出整机（裸金属）', value: '1 台运行中 · 租期至 10-20', state: 'ok', why: '只监控带外与硬件层；释放回收含擦除 / 重装 / 复检三步' }
    ],
    charts: [
      { type: 'bars', title: '资源池容量水位（物理口径）',
        bars: [
          { label: 'gpu-general（共享 · 16 卡）', segments: [
            { name: '已分配', value: 8, color: CHART_COLORS.blue }, { name: '预留', value: 2, color: CHART_COLORS.warn }, { name: '可分配', value: 6, color: CHART_COLORS.ok }] },
          { label: 'dedicated-gpu（专属 · 8 卡）', segments: [
            { name: '已分配', value: 6, color: CHART_COLORS.blue }, { name: '可分配', value: 2, color: CHART_COLORS.ok }] },
          { label: 'baremetal-01（裸金属 · 2 台）', segments: [
            { name: '已分配', value: 1, color: CHART_COLORS.blue }, { name: '可分配', value: 1, color: CHART_COLORS.ok }] }
        ],
        note: '可分配不足直接拒绝申请（DELIV-DEMO-06）；预留带有效期、超时回容量；裸金属按台数计量' },
      { type: 'stack', title: '交付单当前阶段分布', total: `${deliveryOrders().length} 单`,
        segments: [
          { name: '申请 / 分配中', value: deliveryOrders().filter(o => o.stageIdx <= 1 && !o.final).length, color: CHART_COLORS.unknown },
          { name: '交付 / 运行中', value: deliveryOrders().filter(o => (o.stageIdx === 2 || o.stageIdx === 3) && !o.final).length, color: CHART_COLORS.blue },
          { name: '终态（拒绝 / 释放）', value: deliveryOrders().filter(o => o.final).length, color: CHART_COLORS.ok }
        ],
        note: '配额阻塞（DELIV-DEMO-05）与待验收预留（DELIV-DEMO-03）是当前主要待处理项' }
    ],
    tops: [
      { object: 'DELIV-DEMO-05', state: 'warn', note: '配额不足校验中：容量满足、配额待审批', page: 'delivery-order', id: 'DELIV-DEMO-05' },
      { object: 'DELIV-DEMO-03', state: 'warn', note: '已预留待底座验收：预留至 10-17，超时自动过期', page: 'delivery-order', id: 'DELIV-DEMO-03' },
      { object: 'DELIV-DEMO-07', state: 'ok', note: '裸金属整机运行中；S1 仅带外监控', page: 'delivery-order', id: 'DELIV-DEMO-07' }
    ]
  };
}
export const MONITOR_CONVENTIONS = [
  '采集在执行层、汇总在管理层；默认全区域，明细必带区域与机房。',
  '采集无数据显式标"未知"，不视为健康或空闲，也不计入可承诺容量。',
  '裸金属租出整机只监控带外与硬件层；OS 内指标由租户负责。',
  '底座指标归 S1；API 成功率、Token 与模型质量指标由 S2 提供，不在本页。',
  '告警静默只暂停通知，不改变资源可分配状态；恢复以复验证据为准。',
  '交付类事件（预留超时 / 配额不足 / 验收失败）纳入告警策略。',
  '本页数值为固定示例，非实时指标；未接入监控时正式系统应显示"无数据"。'
];

export const ALERT_LEVELS = [...new Set(alertRecords.map(a => a.level))];
export const INCIDENT_PHASES = [...new Set(Object.values(INCIDENTS).map(i => i.phase))];
export const INCIDENT_SEVERITIES = [...new Set(Object.values(INCIDENTS).map(i => i.severity))];
export const INCIDENT_OWNERS = [...new Set(Object.values(INCIDENTS).map(i => i.owner))];
export const POLICY_STATUSES = [...new Set(catalog.policies.rows.map(row => row[5]))];

// 标签页来自路由 query 时必须是已知页签，否则回退到默认页签。
export function tabFromQuery(value, tabs) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return tabs.includes(candidate) ? candidate : tabs[0];
}

// 关联定位只按稳定 ID 精确查找；找不到返回 null，调用方必须明确提示缺失，不回退。
export function linkTarget(type, id) {
  const hit = resolveLink(type, id);
  return hit ? { name: hit.page, query: { id: String(hit.row[0]) } } : null;
}

export function evidenceTarget(link) {
  if (!link) return null;
  if (link.type) return linkTarget(link.type, link.id);
  return link.page ? { name: link.page } : null;
}

// 旧原型 statusClass：已归档 / 已完成 / 通过 → 绿；已关闭 → 中性；失败 / 异常 → 红；其余 → 琥珀。
export function statusTone(value) {
  if (value === '已归档' || value === '已完成' || value === '通过') return 'success';
  if (value === '已关闭') return 'default';
  if (/失败|异常/.test(value || '')) return 'error';
  return 'warning';
}

// ---------- 告警 ----------
export function notificationOf(alert) {
  return alert.silenced ? '已静默' : '正常通知';
}

export function alertById(id) {
  return alertRecords.find(alert => alert.id === id) ?? null;
}

const alertSearchText = alert => [alert.id, alert.level, alert.source, alert.object, alert.message, alert.signal, alert.ack, notificationOf(alert), alert.started, alert.incidentIds.join(' / ') || '—', alert.rule, alert.impact, alert.recoveredAt || ''].join(' ').toLowerCase();

// view：'活跃告警' 或 '告警历史'。活跃 = 信号触发中（确认 / 静默仍属活跃）；历史 = 已恢复。
export function filterAlerts(view, filters = {}) {
  const { query = '', level = '全部', ack = '全部', notification = '全部' } = filters;
  const needle = query.trim().toLowerCase();
  return selectAlerts(view).filter(alert =>
    (level === '全部' || alert.level === level) &&
    (ack === '全部' || alert.ack === ack) &&
    (notification === '全部' || notificationOf(alert) === notification) &&
    alertSearchText(alert).includes(needle));
}

// 动作门禁：只有触发中的信号可静默或发起故障预检；已恢复信号不自动建单。
export function alertActions(alert) {
  const firing = alert.signal === '触发中';
  const hasIncidents = alert.incidentIds.length > 0;
  return { canSilence: firing, hasIncidents, canCreateIncident: firing && !hasIncidents };
}

export function alertFacts(alert) {
  return [
    ['告警', alert.id], ['级别', alert.level], ['来源', alert.source], ['对象', alert.object], ['现象', alert.message],
    ['信号状态', alert.signal], ['确认状态', alert.ack], ['通知状态', notificationOf(alert)], ['触发时间', alert.started],
    ['恢复时间', alert.recoveredAt || (alert.signal === '触发中' ? '尚未恢复' : '恢复时间未记录')],
    ['规则来源', alert.rule], ['影响范围', alert.impact]
  ];
}

export function alertDiagnostics(alert) {
  return [['采集来源', alert.source], ['规则', alert.rule], ['观测现象', alert.message], ['信号', alert.signal], ['触发时间', alert.started], ['恢复时间', alert.recoveredAt || '未记录恢复'], ['影响边界', alert.impact]];
}

export function alertObjectRows(alert) {
  return alert.objects.map(([label, id, type]) => ({ label, id, target: linkTarget(type, id) }));
}

export function alertIncidentRows(alert) {
  return alert.incidentIds.map(id => ({ id, target: linkTarget('incident', id) }));
}

// ---------- 告警策略 ----------
export function policyRowById(id) {
  return catalog.policies.rows.find(row => row[0] === id) ?? null;
}

export function filterPolicies(filters = {}) {
  const { query = '', status = '全部' } = filters;
  const needle = query.trim().toLowerCase();
  return catalog.policies.rows.filter(row => row.join(' ').toLowerCase().includes(needle) && (status === '全部' || row[5] === status));
}

function policyFacts(row) {
  return [['策略', row[0]], ['层次', row[1]], ['条件 / 示例', row[2]], ['通知对象', row[3]], ['管理来源', row[4]], ['状态', row[5]], ['规则管理权', 'GitOps 候选，页面只读'], ['缺数据策略', '标未知，不视为恢复']];
}

function policyTabs(row) {
  return [
    { key: '规则条件', title: '规则条件', rows: [['条件', row[2], '规则由外部真源维护，页面只读'], ['通知对象', row[3], '通知引用，不保存联系方式']] },
    { key: '通知路由', title: '通知路由', rows: tabContent('policy', '通知路由', [row[0]]) || [] },
    { key: '静默窗口', title: '静默窗口', rows: tabContent('policy', '静默窗口', [row[0]]) || [] }
  ];
}

// ---------- 故障 ----------
export function incidentById(id) {
  return id && Object.prototype.hasOwnProperty.call(INCIDENTS, id) ? INCIDENTS[id] : null;
}

const incidentMatches = (incident, needle) => !needle || [incident.id, incident.title, incident.owner, incident.trigger, incident.sourceType].join(' ').toLowerCase().includes(needle);

export function filterIncidents(filters = {}) {
  const { query = '', phase = '全部阶段', severity = '全部级别', owner = '全部责任方' } = filters;
  const needle = query.trim().toLowerCase();
  return Object.values(INCIDENTS).filter(inc =>
    incidentMatches(inc, needle) &&
    (phase === '全部阶段' || inc.phase === phase) &&
    (severity === '全部级别' || inc.severity === severity) &&
    (owner === '全部责任方' || inc.owner === owner));
}

// 复盘归档列表只含已关闭故障；已关闭不等于已归档，二者分别展示。
export function filterClosedIncidents(filters = {}) {
  const { query = '', reviewStatus = '全部复盘状态' } = filters;
  const needle = query.trim().toLowerCase();
  return Object.values(INCIDENTS).filter(inc =>
    inc.phase === '已关闭' && incidentMatches(inc, needle) &&
    (reviewStatus === '全部复盘状态' || inc.review?.status === reviewStatus));
}

// 编辑门禁：已关闭或已归档的故障只读，不能记录处理动作。
export function incidentCanEdit(inc) {
  return inc.phase !== '已关闭' && inc.review?.status !== '已归档';
}

export function incidentGates(inc) {
  return { close: closeGate(inc), archive: archiveGate(inc), canEdit: incidentCanEdit(inc), reviewStatus: inc.review?.status || '未开始' };
}

// 归档预检不可用时的补充说明（与 archiveGate.reason 配合显示）；可用时返回 null。
export function archiveHint(inc, gate = archiveGate(inc)) {
  if (inc.review?.status === '已归档') return '已归档记录只读，不重复归档。';
  if (inc.phase !== '已关闭') return '故障尚未关闭，不能归档。';
  if (inc.review?.status !== '已完成') return `当前状态为“${inc.review?.status || '未开始'}”，可查看复盘但不能生成归档计划。`;
  return gate.allowed ? null : '归档门禁未通过，见上方原因。';
}

export const reviewContext = inc => [inc.id, inc.phase, inc.review?.status || '未开始'];
export const incidentActionContext = inc => [inc.id, inc.phase];

export function incidentLinks(inc) {
  return {
    triggerAlert: linkTarget('alert', inc.trigger),
    triggerTask: linkTarget('provision', inc.trigger),
    objects: (inc.objects || []).map(([kind, id, type]) => ({ kind, id, target: linkTarget(type, id) })),
    alerts: (inc.relatedAlerts || []).map(id => ({ id, target: linkTarget('alert', id) })),
    evidence: (inc.evidence || []).map(([name, detail, link]) => ({ name, detail, target: evidenceTarget(link) }))
  };
}

export function openIncidents() {
  return Object.values(INCIDENTS).filter(inc => inc.phase !== '已关闭');
}

// ---------- 详情解析 ----------
export function firingAlerts() {
  return selectAlerts('活跃告警');
}

// 统一形状：所有详情都返回同一组字段，未使用的字段为 null / 空数组，便于视图直接消费。
// 指定 id 不存在返回 null（绝不回退到其他对象）；id 缺失时使用页面示例并标记 example。
function detailShape(kind, id, example, title, back) {
  return { kind, id, example, title, back, alert: null, incident: null, row: null, facts: [], tabs: [], plan: null };
}

export function monitorDetail(pageId, rawId) {
  const requested = rawId ? String(rawId) : '';
  const id = requested || DEFAULT_DETAIL_IDS[pageId];
  if (!id) return null;
  const example = !requested;
  if (pageId === 'alert') {
    const alert = alertById(id);
    if (!alert) return null;
    return { ...detailShape('alert', id, example, '告警详情', { name: 'alerts' }), alert, facts: alertFacts(alert) };
  }
  if (pageId === 'policy') {
    const row = policyRowById(id);
    if (!row) return null;
    return { ...detailShape('policy', id, example, '告警策略详情', { name: 'alerts', query: { tab: '告警策略' } }), row, facts: policyFacts(row), tabs: policyTabs(row), plan: { action: 'policy', context: row } };
  }
  if (pageId === 'incident') {
    const incident = incidentById(id);
    return incident && { ...detailShape('incident', id, example, '故障处理工作台', { name: 'incidents' }), incident };
  }
  if (pageId === 'incident-review') {
    const incident = incidentById(id);
    return incident && { ...detailShape('incident-review', id, example, '故障复盘', { name: 'incidents', query: { tab: '复盘归档' } }), incident };
  }
  if (pageId === 'channel') {
    const row = catalog.channels.rows.find(item => item[0] === id);
    if (!row) return null;
    const facts = [...catalog.channels.columns.map((label, index) => [label, row[index]]), ['静默说明', '静默只暂停通知，不改变资源可分配状态']];
    const tabs = catalog.channel.tabs.map(title => ({ key: title, title, rows: tabContent('channel', title, [id]) || [] }));
    return { ...detailShape('channel', id, example, '通知渠道详情', { name: 'channels' }), row, facts, tabs, plan: { action: 'channel', context: row } };
  }
  return null;
}
