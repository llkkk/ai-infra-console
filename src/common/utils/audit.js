// 运维与审计模块的纯数据适配：列表来自 catalog，详情以同一行事实按 id 精确派生；未知 id 返回 null。
// 会话记录与操作记录已合并为“审计记录”页（audit-logs）：页签分开展示，详情路由保留。
import { catalog } from '../../catalog.js';
import { sessionRows, taskRecords, allTaskRows } from '../../model.js';
import { tabContent } from '../../detail-tabs.js';
import { detailPages } from '../../router/navigation.js';
import { listSource } from './objects.js';

export const auditListPages = ['audit', 'audit-logs'];
export const auditDetailPages = ['access', 'session', 'operation'];

// 审计记录页签：会话记录 / 操作记录（数据仍来自 catalog 的两张列表）。
export const auditLogTabs = () => [
  { key: 'sessions', title: '会话记录', source: 'sessions', replay: true },
  { key: 'operations', title: '操作记录', source: 'operations', replay: false }
];

// 接入通道（运维接入列表）与会话记录“通道”列的对应关系。
const SESSION_CHANNEL_OF_ACCESS = { 'WebShell / 主机命令': 'WebShell', '带外 KVM': '带外 KVM', 'Kubernetes API': 'Kubernetes API', 'Pod exec': 'Pod exec' };

export function auditListData(pageId) {
  if (pageId === 'audit-logs') {
    return { title: '审计记录', description: '会话记录与操作记录分页签展示：平台事件、会话录像和命令证据不是同一种记录，分通道与来源留存。', columns: [], rows: [], detail: '', action: null };
  }
  return pageId === 'audit' ? listSource('audit') : null;
}

// 详情行数据：access 取运维接入列表；session / operation 的独立列表页已合并，行仍取自 catalog 对应列表。
const DETAIL_SOURCES = { access: 'audit', session: 'sessions', operation: 'operations' };

export function auditDetailData(pageId, requestedId) {
  if (!auditDetailPages.includes(pageId)) return null;
  const source = listSource(DETAIL_SOURCES[pageId]);
  const id = requestedId || String(source.rows[0]?.[0] ?? '');
  const row = source.rows.find(cells => String(cells[0]) === id);
  if (!row) return null;
  const meta = detailPages[pageId];
  const base = {
    id,
    row,
    parent: meta.parent,
    title: meta.title,
    action: source.action ?? null,
    fields: source.columns.map((label, index) => [label, String(row[index])]),
    tabs: []
  };
  const enhance = { access: accessDetail, session: sessionDetail, operation: operationDetail }[pageId];
  return { ...enhance(base), description: catalog[pageId].description };
}

// 证据链接只指向真实存在的任务 / 会话 id；单元格中出现未知 id 时不生成链接。
export function evidenceLinkFor(row) {
  for (const cell of row) {
    const id = String(cell);
    if (allTaskRows.some(task => task[0] === id)) return { name: 'task', query: { id } };
    if (sessionRows.some(session => session[0] === id)) return { name: 'session', query: { id } };
  }
  return null;
}

function accessDetail(base) {
  const [channel, , authority, audit, evidence] = base.row;
  const notes = channel === 'WebShell / 主机命令'
    ? [['接入约定', '授权后开放 WebShell 自由终端；会话与命令全量审计', '平台自建'], ['会话关联', '建立会话后关联审计证据', '不展示真实命令']]
    : [];
  const sessions = sessionRows.filter(session => session[3] === SESSION_CHANNEL_OF_ACCESS[channel]);
  return {
    ...base,
    tabs: [
      { key: '授权约定', title: '授权约定', rows: [['权限来源', authority, '授权引用只保存引用'], ['审计能力', audit, '不同通道审计能力不等价'], ['证据形态', evidence, '按通道区分证据'], ...notes] },
      { key: '关联会话', title: '关联会话', rows: sessions.map(session => [session[0], session[5], session[6]]) }
    ]
  };
}

function sessionDetail(base) {
  const [id, operator, target, channel, started, state, source] = base.row;
  // 会话时间线只属于示例会话 SESSION-DEMO-01，其他会话不借用其内容。
  const timeline = id === 'SESSION-DEMO-01' ? tabContent('session', '会话时间线', base.row) : [];
  return {
    ...base,
    fields: [...base.fields, ['录像 / 命令', '平台审计证据入口，未连接'], ['留存期限', '待 S4 安全策略确认']],
    tabs: [
      { key: '会话摘要', title: '会话摘要', rows: [['操作者', operator, '示例身份，非真实账号'], ['目标 / 类型', `${target} / ${channel}`, '本页不显示真实录像'], ['开始 / 状态', `${started} / ${state}`, source]] },
      { key: '会话时间线', title: '会话时间线', rows: timeline || [] },
      { key: '命令记录', title: '命令记录', rows: tabContent('session', '命令记录', base.row) || [] },
      { key: '文件传输', title: '文件传输', rows: tabContent('session', '文件传输', base.row) || [] }
    ]
  };
}

function operationDetail(base) {
  const [event, operator, target, , result, taskId] = base.row;
  const task = taskRecords.find(record => record.id === taskId);
  // 变更摘要只对 EVENT-DEMO-01 成立（其关联模板与目标盘已在示例中给出）。
  const fields = event === 'EVENT-DEMO-01' ? [...base.fields, ['变更摘要', '引用模板版本与目标磁盘，不含凭据']] : base.fields;
  return {
    ...base,
    fields,
    tabs: [
      { key: '事件摘要', title: '事件摘要', rows: [['事件', event, '保存对象引用和请求结果，凭据内容不得写入审计记录'], ['操作人 / 对象', `${operator} / ${target}`, '示例身份与对象引用'], ['结果', result, '示例结果，非真实执行'], ['关联任务', taskId, '任务中心引用']] },
      { key: '配置差异', title: '配置差异', rows: task ? [['模板引用', task.template, '任务创建时锁定，不含凭据'], ['凭据', '仅保留引用名', '禁止记录明文']] : [] }
    ]
  };
}

export function isCopyableId(value) {
  return /^(?:GPU|TASK|ALLOC|REQ|ENV|ALERT|INC|SESSION|EVENT)-[A-Z0-9-]+$/.test(String(value));
}
