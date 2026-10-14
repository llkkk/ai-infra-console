import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listData, detailData, filterAssetRows, infrastructurePages, overviewData, primaryActionOf, provisioningTabs, stageBarItems } from '../src/common/utils/infrastructure.js';
import { assetRecords } from '../src/model.js';
import { filterRows, planConfig } from '../src/common/utils/objects.js';
import { prefillValues, requiredChecks, findBlocker } from '../src/common/utils/form-logic.js';

test('all infrastructure rows resolve exact details, never an unrelated default', () => {
  for (const page of infrastructurePages) {
    const list = listData(page);
    assert.equal(new Set(list.rows.map(row => row[0])).size, list.rows.length);
    for (const row of list.rows) {
      const detail = detailData(list.detail, String(row[0]));
      assert.equal(detail.id, row[0]);
      assert.deepEqual(detail.row, row);
    }
    assert.equal(detailData(list.detail, 'missing-object'), null);
  }
});
test('search and state filters combine and unknown remains searchable', () => {
  const list = listData('assets');
  assert.equal(filterRows(list.rows, 'compute-0', '已入集群', 5).length, 2);
  assert.equal(filterRows(list.rows, '未分配位置', '全部', 5)[0][0], 'reserve-01');
  assert.equal(filterRows(list.rows, 'no-match', '全部', 5).length, 0);
});
test('asset stage bar counts and location filter follow the derived stage model', () => {
  const bar = stageBarItems();
  const byLabel = Object.fromEntries(bar.map(item => [item.label, item.count]));
  assert.equal(byLabel['已入裸金属池'], 2);
  assert.equal(byLabel['异常'], 1, 'compute-02 关联未关闭故障派生异常');
  // 阶段过滤与位置过滤可叠加；未分配位置只含未登记位置的资产。
  const unassigned = filterAssetRows(null, 'unassigned');
  assert.deepEqual(unassigned.map(row => row[0]), ['reserve-01']);
  const rackB = filterAssetRows(null, 'room-demo-B:rack-B01');
  assert.equal(rackB.length, 3);
  assert.deepEqual(filterAssetRows('已入裸金属池', null).map(row => row[0]), ['bm-01', 'bm-02']);
  assert.equal(filterAssetRows('异常', null).length, 1);
});
test('asset primary action follows the lifecycle stage', () => {
  const by = id => assetRecords.find(asset => asset.id === id);
  assert.equal(primaryActionOf(by('reserve-01')).action, 'bmc-enroll');
  assert.equal(primaryActionOf(by('bm-04')).action, 'asset-actions');
  assert.equal(primaryActionOf(by('compute-03')).action, 'provision');
  assert.equal(primaryActionOf(by('bm-03')).action, 'join-baremetal');
  assert.equal(primaryActionOf(by('compute-02')).label, '查看异常');
  assert.equal(primaryActionOf(by('old-01')), null);
});
test('asset detail absorbs BMC facts; unregistered assets stay explicitly unknown', () => {
  const bmc = Object.fromEntries(detailData('asset', 'reserve-01').tabs.find(tab => tab.title === 'BMC 与带外').rows.map(row => [row[0], String(row[1])]));
  assert.equal(bmc['电源状态'], '未知');
  assert.match(bmc['传感器'], /无数据/);
  const missing = detailData('asset', 'control-01').tabs.find(tab => tab.title === 'BMC 与带外');
  assert.equal(missing.rows[0][0], 'BMC 登记');
  assert.match(String(missing.rows[0][1]), /未登记/);
});
test('provisioning page unifies tasks, templates and baselines as tabs', () => {
  const tabs = provisioningTabs();
  assert.deepEqual(tabs.map(tab => tab.title), ['装机任务', '镜像与装机模板', '硬件基线']);
  for (const tab of tabs) {
    assert.ok(tab.source.rows.length > 0, tab.title);
    assert.ok(planConfig(tab.source.action), `${tab.title} action must exist in forms`);
    for (const row of tab.source.rows) {
      const detail = detailData(tab.source.detail, String(row[0]));
      assert.equal(detail.id, row[0]);
    }
    assert.equal(detailData(tab.source.detail, 'missing-object'), null);
  }
});
test('selected template facts never reuse first-row facts', () => {
  const template = Object.fromEntries(detailData('image', 'gpu-baseline-02').fields);
  assert.equal(template['镜像版本'], 'img-demo-02');
});
test('task history preserves failed stage after successful retry', () => {
  const task = detailData('provisioning-detail', 'TASK-DEMO-02');
  assert.ok(task.tabs[0].rows.some(row => row[1] === '失败'));
  assert.equal(task.action, null);
  // 集群创建不进装机管理页签（只进任务中心）；数据擦除与重装属于装机管理。
  assert.equal(detailData('provisioning-detail', 'TASK-DEMO-03'), null);
  assert.ok(detailData('provisioning-detail', 'TASK-DEMO-06'));
});
test('asset actions bind selected object and preserve no-data blocker', () => {
  const detail = detailData('asset', 'reserve-01');
  const config = planConfig('asset-actions');
  const values = prefillValues(config, detail.row);
  assert.equal(values['目标资产'], 'reserve-01');
  assert.match(findBlocker(config, values), /BMC 无数据/);
  assert.equal(requiredChecks(config, values).length, 2);
});
test('provision plan binds task asset, not the task ID', () => {
  const detail = detailData('provisioning-detail', 'TASK-DEMO-01');
  assert.equal(prefillValues(planConfig(detail.action), detail.row)['资产'], 'compute-04');
});
test('overview metrics derive from existing objects and obey capacity invariant', () => {
  const data = overviewData();
  assert.equal(data.assets, listData('assets').rows.length);
  assert.equal(data.capacity.physical, data.capacity.allocated + data.capacity.reserved + data.capacity.available);
  assert.equal(data.activeTasks.length, 1);
});
test('template and baseline plan identity binds to the selected row', () => {
  for (const [page, id, label] of [['image', 'gpu-baseline-02', '模板名称'], ['baseline', 'gpu-hardware', '基线名称']]) {
    const detail = detailData(page, id);
    assert.equal(prefillValues(planConfig(detail.action), detail.row)[label], id);
  }
});
