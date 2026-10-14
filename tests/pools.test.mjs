import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_FLOW, SIM_FAILURES, defaultS2Request, demoOrderFromRequest, demoOrderRow, deliveryOrderDetail,
  detailData, evidenceLinkFor, findOrder, flowIndexOf, listData, nextFlowState, poolDeliveryOrders, s2RequestBody
} from '../src/common/utils/pools.js';
import { filterRows, planConfig } from '../src/common/utils/objects.js';
import { findBlocker, prefillValues, requiredChecks, validateFormConfig } from '../src/common/utils/form-logic.js';
import { deliveryOrderRecords } from '../src/model.js';

const LIST_TO_DETAIL = { pools: 'pool', deliveries: 'delivery-order', specs: 'spec' };

test('every list row resolves to its exact detail; unknown ids return null', () => {
  for (const [page, detailPage] of Object.entries(LIST_TO_DETAIL)) {
    const list = listData(page);
    assert.equal(list.detail, detailPage);
    assert.equal(new Set(list.rows.map(row => row[0])).size, list.rows.length);
    for (const row of list.rows) {
      const detail = detailData(detailPage, String(row[0]));
      assert.equal(detail.id, row[0]);
      assert.equal(detail.parent, page);
    }
    assert.equal(detailData(detailPage, 'missing-object'), null);
  }
});

test('delivery orders follow the two-level stage machine with final states', () => {
  const byStage = deliveryOrderRecords.map(order => [order.id, order.stageIdx, order.final]);
  assert.deepEqual(byStage.filter(([, , final]) => final).map(([id]) => id), ['DELIV-DEMO-04', 'DELIV-DEMO-06', 'DELIV-DEMO-08']);
  const pending = findOrder('DELIV-DEMO-05');
  assert.equal(pending.stageIdx, 0);
  assert.match(pending.sub, /校验中/);
  const running = findOrder('DELIV-DEMO-07');
  assert.equal(running.stageIdx, 3, '裸金属整机在租 = 运行阶段');
  assert.match(running.reserve.bound, /bm-02/);
});


test('baremetal pool members and整机 delivery chain are visible', () => {
  const pool = detailData('pool', 'baremetal-01');
  const tabs = Object.fromEntries(pool.tabs.map(tab => [tab.title, tab.rows]));
  assert.ok(tabs['成员'].some(row => row[0] === 'bm-02' && String(row[2]).includes('已租出')));
  assert.ok(tabs['交付单'].some(row => row[0] === 'DELIV-DEMO-07'));
  assert.ok(tabs['规格与配额'].some(row => row[0] === 'bm-8gpu'));
  assert.ok(tabs['概览'].some(row => String(row[1]).includes('整机台数')));
});

test('dedicated pool is bound to one project and skips quota splitting', () => {
  const pool = detailData('pool', 'dedicated-gpu');
  const tabs = Object.fromEntries(pool.tabs.map(tab => [tab.title, tab.rows]));
  assert.ok(tabs['概览'].some(row => row[0] === '独占项目' && String(row[1]).includes('S2 / 生产推理')));
  assert.ok(tabs['概览'].some(row => row[0] === '容量口径' && String(row[2]).includes('容量即配额')));
  assert.ok(tabs['成员'].some(row => row[0] === 'dedicated-node-01'));
  assert.ok(tabs['规格与配额'].some(row => String(row[1]).includes('不适用')));
  assert.ok(tabs['交付单'].some(row => row[0] === 'DELIV-DEMO-09'));
  const order = findOrder('DELIV-DEMO-09');
  assert.equal(order.check.quota, '不适用（专属池独占，容量即配额）');
  assert.equal(order.stageIdx, 3);
});

test('shared pool tabs follow 概览 / 成员 / 规格与配额 / 交付单 layout', () => {
  const gpu = detailData('pool', 'gpu-general');
  assert.deepEqual(gpu.tabs.map(tab => tab.title), ['概览', '成员', '规格与配额', '交付单']);
  const orderTab = gpu.tabs.find(tab => tab.title === '交付单').rows;
  assert.ok(orderTab.some(row => row[0] === 'DELIV-DEMO-01'));
  assert.ok(gpu.tabs.find(tab => tab.title === '概览').rows.some(row => row[0] === '配额与使用'));
  // 池内交付单与全局交付单同数据（D3）：按池过滤后的子集。
  assert.deepEqual(poolDeliveryOrders('gpu-general').map(row => row[0]).sort(), ['DELIV-DEMO-01', 'DELIV-DEMO-02', 'DELIV-DEMO-03', 'DELIV-DEMO-04', 'DELIV-DEMO-05', 'DELIV-DEMO-06']);
  assert.deepEqual(poolDeliveryOrders('dedicated-gpu').map(row => row[0]), ['DELIV-DEMO-09']);
});

test('search and state filters combine on the resolved state column', () => {
  const orders = listData('deliveries');
  assert.deepEqual(filterRows(orders.rows, '', '已释放', orders.stateIndex).map(row => row[0]), ['DELIV-DEMO-04', 'DELIV-DEMO-08']);
  assert.equal(filterRows(orders.rows, 'no-match', '全部', orders.stateIndex).length, 0);
  const specs = listData('specs');
  assert.deepEqual(filterRows(specs.rows, '', '启用', specs.stateIndex).map(row => row[0]), ['gpu-whole', 'bm-8gpu']);
});

test('order flow advances step by step and ends at 已释放', () => {
  const order = demoOrderFromRequest(defaultS2Request(), 1, 'idem-test');
  assert.equal(flowIndexOf(order), 0);
  let steps = 0;
  let next = nextFlowState(order);
  while (next) {
    Object.assign(order, next);
    steps += 1;
    next = nextFlowState(order);
  }
  assert.equal(steps, ORDER_FLOW.length - 1);
  assert.equal(order.final, '已释放');
  assert.equal(nextFlowState(order), null, '终态不可继续推进');
});

test('simulated failures reject at application or roll back to manual handling', () => {
  const capacity = SIM_FAILURES.find(failure => failure.kind === '容量不足');
  assert.equal(capacity.to.final, '已拒绝');
  const acceptance = SIM_FAILURES.find(failure => failure.kind === '验收失败');
  assert.equal(acceptance.to.stageIdx, 2);
  assert.match(acceptance.to.sub, /人工处理/);
});

test('s2 request body carries pool, spec, idempotency key and returns an order id', () => {
  const state = defaultS2Request();
  const body = s2RequestBody(state, 'idem-1');
  assert.equal(body.pool, 'gpu-general');
  assert.equal(body.idempotencyKey, 'idem-1');
  assert.equal(body.source, 'S2（模拟）');
  const order = demoOrderFromRequest(state, 2, 'idem-1');
  assert.equal(order.stageIdx, 0);
  assert.equal(demoOrderRow(order)[0], 'DELIV-DEMO-92');
  const detail = deliveryOrderDetail(order);
  assert.equal(detail.demo, true);
});

test('plan forms bind the selected object rather than a row label cell', () => {
  const reserved = detailData('delivery-order', 'DELIV-DEMO-03');
  assert.equal(reserved.actions[0].action, 'acceptance');
  assert.equal(prefillValues(planConfig('acceptance'), reserved.actions[0].context)['分配单'], 'ALLOC-DEMO-03');
  const delivered = detailData('delivery-order', 'DELIV-DEMO-01');
  assert.equal(prefillValues(planConfig('release'), delivered.actions[0].context)['分配单'], 'ALLOC-DEMO-01');
  const pool = detailData('pool', 'gpu-general');
  const quota = pool.actions.find(item => item.action === 'quota');
  assert.equal(prefillValues(planConfig('quota'), quota.context)['外部项目 ID'], 'project-demo-model');
  const spec = detailData('spec', 'gpu-whole');
  assert.equal(prefillValues(planConfig('spec'), spec.actions[0].context)['规格名称'], 'gpu-whole');
});

test('every detail and list action opens an existing, consistent form with its checks and no default blocker', () => {
  const actions = [];
  for (const [page, detailPage] of Object.entries(LIST_TO_DETAIL)) {
    if (listData(page).action) actions.push({ action: listData(page).action, context: [] });
    for (const row of listData(page).rows) actions.push(...(detailData(detailPage, String(row[0])).actions ?? []));
  }
  for (const { action, context } of actions) {
    const config = planConfig(action);
    assert.ok(config, `missing form ${action}`);
    assert.deepEqual(validateFormConfig(config, action), []);
    const values = prefillValues(config, context);
    assert.equal(findBlocker(config, values), null);
    assert.ok(requiredChecks(config, values).length > 0);
  }
});

test('evidence links resolve only exact known objects', () => {
  assert.deepEqual(evidenceLinkFor(['ALLOC-DEMO-01']), { name: 'delivery-order', query: { id: 'DELIV-DEMO-01' } });
  assert.deepEqual(evidenceLinkFor(['REQ-DEMO-02']), { name: 'delivery-order', query: { id: 'DELIV-DEMO-03' } });
  assert.deepEqual(evidenceLinkFor(['infer-demo']), { name: 'delivery-order', query: { id: 'DELIV-DEMO-01' } });
  assert.deepEqual(evidenceLinkFor(['REQ-BM-DEMO-01']), { name: 'delivery-order', query: { id: 'DELIV-DEMO-07' } });
  assert.deepEqual(evidenceLinkFor(['compute-01', 'GPU']), { name: 'gpu', query: { id: 'GPU-DEMO-001' } });
  assert.deepEqual(evidenceLinkFor(['gpu-whole']), { name: 'spec', query: { id: 'gpu-whole' } });
  assert.equal(evidenceLinkFor(['S2 / 模型工程']), null);
  assert.equal(evidenceLinkFor(['unknown-object']), null);
});
