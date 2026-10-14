import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigation, resolveNavigation } from '../src/router/navigation.js';
import { SCENARIOS, CHAIN, scenarioTarget, overviewMetrics } from '../src/common/utils/overview.js';

const registeredPages = new Set(navigation.flatMap(group => group.children.map(page => page.key)));
const knownStageTags = new Set(['服务器与装机', '集群与算力', '资源与交付', '运行期观测', '受控接入', '平台依赖', '异步执行', '全局规则']);

test('every scenario step resolves to a registered route', () => {
  for (const scenario of SCENARIOS) {
    for (const step of scenario.steps) {
      const target = scenarioTarget(step);
      assert.ok(target, `${scenario.id} / ${step.label} must resolve to a target`);
      assert.ok(resolveNavigation(target.name), `${target.name} must be a registered page or detail`);
    }
  }
});

test('scenario object steps carry the stable id of the object they point to', () => {
  const provision = SCENARIOS.find(s => s.id === 'provision').steps.find(step => step.link.type === 'provision');
  assert.deepEqual(scenarioTarget(provision), { name: 'provisioning-detail', query: { id: 'TASK-DEMO-01' } });
  const order = SCENARIOS.find(s => s.id === 'provision').steps.find(step => step.link.type === 'environment');
  assert.deepEqual(scenarioTarget(order), { name: 'delivery-order', query: { id: 'DELIV-DEMO-01' } });
  const unknownStep = { label: 'missing', link: { type: 'incident', id: 'INC-MISSING' } };
  assert.equal(scenarioTarget(unknownStep), null);
});

test('scenario list steps only point to registered list pages', () => {
  for (const scenario of SCENARIOS) {
    for (const step of scenario.steps.filter(item => item.link.page)) {
      assert.ok(registeredPages.has(step.link.page), `${step.link.page} must be a navigation page`);
    }
  }
});

test('delivery chain stages reference real navigation pages with a known module tag', () => {
  for (const line of [CHAIN.supply, CHAIN.delivery, CHAIN.cross]) {
    assert.ok(line.nodes.length > 0);
    for (const [title, page, tag] of line.nodes) {
      assert.ok(title, 'stage needs a title');
      assert.ok(resolveNavigation(page), `${page} must be a registered page`);
      assert.ok(knownStageTags.has(tag), `${tag} must be a known stage tag`);
    }
  }
});

test('chain stages are unique pages', () => {
  const pages = [...CHAIN.supply.nodes, ...CHAIN.delivery.nodes, ...CHAIN.cross.nodes].map(([, page]) => page);
  assert.equal(new Set(pages).size, pages.length);
});

test('overview metrics count firing alerts and open incidents independently', () => {
  const activeAndOpen = overviewMetrics().find(metric => metric.label === '活跃告警 / 未关闭故障');
  assert.equal(activeAndOpen.value, '3 / 1');
});
