import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskListData, taskDetailData, taskQuickViewData, canRetryTask, filterTasks, TASK_REGIONS, TASK_REGION_ALL, TASK_REGION_COLUMN } from '../src/common/utils/tasks.js';
import { planConfig } from '../src/common/utils/objects.js';
import { prefillValues, requiredChecks, findBlocker } from '../src/common/utils/form-logic.js';

test('every task row resolves its exact detail by id; unknown ids return null', () => {
  const list = taskListData();
  assert.equal(new Set(list.rows.map(row => row[0])).size, list.rows.length);
  for (const row of list.rows) {
    const detail = taskDetailData(String(row[0]));
    assert.equal(detail.id, row[0]);
    assert.deepEqual(detail.row, row);
    assert.deepEqual(detail.fields.slice(0, row.length).map(([, value]) => value), row.map(String));
  }
  assert.equal(taskDetailData('TASK-DEMO-99'), null);
  assert.equal(taskDetailData(''), null);
  assert.equal(taskQuickViewData('TASK-DEMO-99'), null);
  assert.equal(taskQuickViewData(''), null);
});

test('recorded task phases stay with their own task; deploy tasks show no borrowed phases', () => {
  const retry = taskDetailData('TASK-DEMO-02');
  assert.ok(retry.tabs.find(tab => tab.key === '执行阶段').rows.some(row => row[0] === '磁盘检查' && row[1] === '失败'));
  assert.ok(retry.tabs.find(tab => tab.key === '日志与事件').rows.some(row => /目标盘标识/.test(row[1])));
  assert.equal(retry.fields.find(([label]) => label === '关联模板')[1], 'gpu-baseline-02');

  const deploy = taskDetailData('TASK-DEMO-04');
  assert.equal(deploy.fields.some(([label]) => label === '关联模板'), false);
  assert.ok(deploy.tabs.every(tab => tab.rows.length === 0));
});

test('region filter keeps all regions by default and applies to the region column', () => {
  const list = taskListData();
  const idx = list.columns.indexOf('状态');
  assert.equal(TASK_REGION_COLUMN, 3);
  assert.equal(list.columns[TASK_REGION_COLUMN], '区域');
  assert.equal(filterTasks(list.rows, { region: TASK_REGION_ALL }, idx).length, list.rows.length);
  assert.equal(filterTasks(list.rows, { region: '华东生产区' }, idx).length, 0);
  assert.equal(filterTasks(list.rows, { region: '实验中心' }, idx).length, list.rows.length);
  assert.ok(TASK_REGIONS.includes('西南 GPU 区'));
});

test('region combines with search and status filters', () => {
  const list = taskListData();
  const idx = list.columns.indexOf('状态');
  assert.equal(idx, 5);
  assert.deepEqual(filterTasks(list.rows, { state: '示例完成', region: '实验中心' }, idx).map(row => row[0]), ['TASK-DEMO-03']);
  assert.equal(filterTasks(list.rows, { state: '示例完成', region: '西南 GPU 区' }, idx).length, 0);
  assert.equal(filterTasks(list.rows, { search: 'compute-04', region: '实验中心' }, idx)[0][0], 'TASK-DEMO-01');
  assert.equal(filterTasks(list.rows, { search: 'compute-04', region: '华东生产区' }, idx).length, 0);
});

test('task-retry plan binds the selected task, not the first row', () => {
  const config = planConfig('task-retry');
  assert.ok(config);
  const first = taskDetailData('TASK-DEMO-01');
  assert.equal(prefillValues(config, first.row)['任务'], 'TASK-DEMO-01');
  const selected = taskDetailData('TASK-DEMO-03');
  assert.equal(prefillValues(config, selected.row)['任务'], 'TASK-DEMO-03');
  assert.equal(findBlocker(config, prefillValues(config, selected.row)), null);
  assert.equal(requiredChecks(config, prefillValues(config, selected.row)).length, 1);
});

test('quick view keeps current success separate from historical failure evidence', () => {
  const task = taskQuickViewData('TASK-DEMO-02');
  assert.equal(task.state, '成功（重检）');
  assert.equal(task.canRetry, false);
  assert.ok(task.logs.some(log => log.state === '失败' && /目标盘标识/.test(log.log)));
  assert.ok(task.logs.some(log => log.state === '成功' && /仅重跑磁盘检查/.test(log.log)));
  assert.match(task.summary, /仅重跑磁盘检查/);
  assert.equal(task.duration, '未接入耗时数据');
  assert.equal(taskDetailData(task.id).action, null);
});

test('S2 quick views are read-only and do not borrow execution evidence or relationships', () => {
  for (const id of ['TASK-DEMO-04', 'TASK-DEMO-05']) {
    const task = taskQuickViewData(id);
    assert.match(task.origin, /S2.*只读/);
    assert.equal(task.hasEvidence, false);
    assert.deepEqual(task.phases, []);
    assert.deepEqual(task.logs, []);
    assert.deepEqual(task.relations, []);
    assert.match(task.summary, /未接入/);
    assert.equal(task.canRetry, false);
    assert.equal(taskDetailData(id).action, null);
  }
});

test('task relationships use exact object ids and explicitly recorded delivery tasks', () => {
  assert.deepEqual(taskQuickViewData('TASK-DEMO-01').relations, [{ id: 'compute-04', label: '资产', route: 'asset' }]);
  assert.deepEqual(taskQuickViewData('TASK-DEMO-03').relations, [
    { id: 'compute-lab', label: '集群', route: 'cluster' },
    { id: 'DELIV-DEMO-01', label: '交付单', route: 'delivery-order' }
  ]);
  assert.ok(taskQuickViewData('TASK-DEMO-06').relations.some(relation => relation.id === 'DELIV-DEMO-08'));
});

test('retry requires current S1 failure, confirmed authorization, and no active phase', () => {
  const failed = { type: '硬件检查', state: '失败', auth: '已确认', phases: [{ state: '失败' }] };
  assert.equal(canRetryTask(failed), true);
  for (const state of ['成功', '成功（重检）', '进行中', '排队中', '未知', '已完成']) {
    assert.equal(canRetryTask({ ...failed, state }), false);
  }
  assert.equal(canRetryTask({ ...failed, type: '模型部署' }), false);
  assert.equal(canRetryTask({ ...failed, auth: '未确认' }), false);
  assert.equal(canRetryTask({ ...failed, phases: [] }), false);
  assert.equal(canRetryTask({ ...failed, phases: [{ state: '失败' }, { state: '执行中' }] }), false);
  assert.equal(canRetryTask(null), false);
  for (const row of taskListData().rows) assert.equal(taskDetailData(row[0]).action, null);
});

test('opening a quick view does not mutate filtered task rows or historical evidence', () => {
  const list = taskListData();
  const filters = { search: 'compute-03', state: '成功（重检）', region: '实验中心' };
  const statusIndex = list.columns.indexOf('状态');
  const before = filterTasks(list.rows, filters, statusIndex).map(row => [...row]);
  const task = taskQuickViewData(before[0][0]);
  task.phases[0].state = '修改返回值';
  assert.deepEqual(filterTasks(list.rows, filters, statusIndex), before);
  assert.equal(taskQuickViewData(task.id).phases[0].state, '成功');
});
