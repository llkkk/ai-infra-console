// 任务中心的纯数据适配：列表来自 catalog，详情按任务 id 精确派生；未知 id 返回 null，不回退到其他任务。
import { catalog } from '../../catalog.js';
import { taskRecords, assetRecords, clusterRows, deliveryOrderRecords } from '../../model.js';
import { listSource, objectDetail, filterRows } from './objects.js';

// 旧原型 ExtendedPage 的 page==='tasks' 区域筛选：作用于列 3（区域）。
export const TASK_REGION_COLUMN = 3;
export const TASK_REGION_ALL = '全部区域';
export const TASK_REGIONS = [TASK_REGION_ALL, '实验中心', '华东生产区', '西南 GPU 区'];

export function taskListData() {
  return listSource('tasks');
}

export function filterTasks(rows, { search = '', state = '全部', region = TASK_REGION_ALL } = {}, stateIndex) {
  return filterRows(rows, search, state, stateIndex).filter(row => region === TASK_REGION_ALL || String(row[TASK_REGION_COLUMN]) === region);
}

export function taskDetailData(requestedId) {
  if (typeof requestedId !== 'string' || !requestedId) return null;
  const base = objectDetail('task', requestedId);
  if (!base) return null;
  // 逐阶段证据只存在于有执行记录的任务；模型部署等后台任务没有伪造阶段。
  const record = taskRecords.find(task => task.id === base.id);
  const fields = [...base.fields];
  if (record) fields.push(['关联模板', record.template], ['授权', record.auth], ['子阶段', record.subStage], ['带外状态', record.bmcState]);
  return {
    ...base,
    action: canRetryTask(record) ? 'task-retry' : null,
    fields,
    description: catalog.task.description,
    tabs: [
      { key: '执行阶段', title: '执行阶段', rows: record ? record.phases.map(phase => [phase.name, phase.state, phase.at || '—']) : [] },
      { key: '日志与事件', title: '日志与事件', rows: record ? record.phases.map(phase => [phase.name, phase.log || '尚无执行记录']) : [] },
      { key: '配置快照', title: '配置快照', rows: record ? [['模板', record.template, '任务创建时锁定'], ['目标', record.target, '对象稳定标识，不显示秘密'], ['人工确认点', record.confirmPoints.join('；') || '无额外确认点', '执行前核对']] : [] }
    ]
  };
}

// 失败历史不是当前失败；没有授权或执行证据时不提供重试入口。
export function canRetryTask(record) {
  return Boolean(record && record.type !== '模型部署' && record.state === '失败' && record.auth === '已确认'
    && record.phases?.some(phase => phase.state === '失败')
    && !record.phases.some(phase => /执行中|进行中|排队/.test(phase.state)));
}

export function taskQuickViewData(taskId) {
  const detail = taskDetailData(taskId);
  if (!detail) return null;
  const record = taskRecords.find(task => task.id === detail.id);
  const [, type, target, region, stage, state, source, created] = detail.row;
  const phases = record ? record.phases.map(phase => ({ ...phase })) : [];
  const logs = phases.filter(phase => phase.log);
  const active = phases.find(phase => /执行中|进行中/.test(phase.state));
  const latest = logs[logs.length - 1];
  const relations = [];
  if (assetRecords.some(asset => asset.id === target)) relations.push({ id: target, label: '资产', route: 'asset' });
  if (clusterRows.some(row => row[0] === target)) relations.push({ id: target, label: '集群', route: 'cluster' });
  for (const order of deliveryOrderRecords) {
    if (order.tasks?.includes(detail.id)) relations.push({ id: order.id, label: '交付单', route: 'delivery-order' });
  }
  return {
    id: detail.id, type, target, region, stage, state, source, created,
    origin: type === '模型部署' ? 'S2 模型部署 · 只读跟踪' : 'S1 底座任务 · 本地示例',
    subStage: record?.subStage || '未接入子阶段记录',
    summary: active?.log || latest?.log || '未接入执行日志 / 历史，当前仅有任务列表记录。',
    summaryLabel: active ? '当前执行说明' : '最近记录结果',
    phases, logs, relations,
    hasEvidence: phases.length > 0,
    canRetry: canRetryTask(record),
    duration: '未接入耗时数据'
  };
}
