import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliveryProgress } from '../src/common/utils/delivery-progress.js';
import { findOrder } from '../src/common/utils/pools.js';

const copyOrder = id => structuredClone(findOrder(id));

test('a rejected application does not mark allocation, delivery or runtime as completed', () => {
  const progress = deliveryProgress(findOrder('DELIV-DEMO-06'));
  assert.equal(progress.current, 0);
  assert.deepEqual(progress.stages.map(stage => stage.status), ['error', 'wait', 'wait', 'wait', 'wait']);
  assert.deepEqual(progress.sections.map(section => section.entered), [true, false, false, false, false]);
  assert.deepEqual(progress.openSections, ['0']);
  assert.match(progress.reason, /需求 8 > 可分配 6/);
  assert.ok(progress.actionBlocker);
});

for (const final of ['已取消', '已过期']) {
  test(`${final} stops at reservation without pretending that resources have been released`, () => {
    const order = copyOrder('DELIV-DEMO-03');
    order.final = final;
    order.delivery = null;
    const progress = deliveryProgress(order);
    assert.equal(progress.current, 1);
    assert.deepEqual(progress.stages.map(stage => stage.status), ['finish', 'wait', 'wait', 'wait', 'wait']);
    assert.equal(progress.sections[4].entered, false);
    assert.match(progress.next, /不把终止申请视为资源已自动回收/);
    assert.ok(progress.actionBlocker);
  });
}

test('released compute and baremetal orders show completed recovery with no writable actions', () => {
  for (const id of ['DELIV-DEMO-04', 'DELIV-DEMO-08']) {
    const progress = deliveryProgress(findOrder(id));
    assert.deepEqual(progress.stages.map(stage => stage.status), ['finish', 'finish', 'finish', 'finish', 'finish']);
    assert.equal(progress.tone, 'success');
    assert.equal(progress.sections[4].entered, true);
    assert.ok(progress.actionBlocker);
  }
});

test('delivery waiting for S2 receipt explains the owner and blocks premature release', () => {
  const progress = deliveryProgress(findOrder('DELIV-DEMO-01'));
  assert.equal(progress.current, 2);
  assert.equal(progress.stages[3].status, 'wait');
  assert.equal(progress.owner, 'S2 接收方');
  assert.equal(progress.sections[3].entered, false);
  assert.match(progress.actionBlocker, /等待接收方确认/);
});

test('reservation focuses on acceptance rather than a future release blocker', () => {
  const progress = deliveryProgress(findOrder('DELIV-DEMO-03'));
  assert.match(progress.reason, /底座验收未完成/);
  assert.equal(progress.actionBlocker, '');
  assert.deepEqual(progress.openSections, ['1', '2']);
  assert.equal(progress.sections[2].entered, true, 'observed environment evidence is retained even before the delivery stage');
});

test('acceptance failure stays at delivery and does not offer a normal release action', () => {
  const order = copyOrder('DELIV-DEMO-03');
  order.stageIdx = 2;
  order.sub = '人工处理（验收失败）';
  order.delivery.accept = '网络探针失败';
  const progress = deliveryProgress(order);
  assert.deepEqual(progress.stages.map(stage => stage.status), ['finish', 'finish', 'error', 'wait', 'wait']);
  assert.match(progress.reason, /网络探针失败/);
  assert.match(progress.actionBlocker, /验收失败/);
});

test('unverified resource occupancy remains blocked despite a recorded receipt', () => {
  const progress = deliveryProgress(findOrder('DELIV-DEMO-02'));
  assert.match(progress.reason, /占用待核实/);
  assert.match(progress.actionBlocker, /不自动释放/);
});

test('capacity passing does not hide insufficient project quota', () => {
  const progress = deliveryProgress(findOrder('DELIV-DEMO-05'));
  assert.equal(progress.tone, 'warning');
  assert.match(progress.reason, /剩余 2 < 需求 4/);
  assert.equal(progress.sections[1].entered, false);
});

test('a simulated failure shows its failure event instead of an earlier successful check', () => {
  const order = copyOrder('DELIV-DEMO-01');
  order.sub = '人工处理（验收失败）';
  order.timeline.push(['刚刚（演示）', '模拟失败：验收失败', '验收失败：网络探针未通过']);
  const progress = deliveryProgress(order);
  assert.equal(progress.tone, 'error');
  assert.match(progress.reason, /网络探针未通过/);
  assert.equal(progress.stages[2].status, 'error');
});
