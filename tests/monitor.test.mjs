import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INCIDENTS, archiveGate, closeGate } from '../src/incident-data.js';
import { alertRecords } from '../src/model.js';
import { catalog, forms } from '../src/catalog.js';
import {
  filterAlerts, alertActions, filterIncidents, filterClosedIncidents, incidentCanEdit, incidentGates,
  monitorDetail, linkTarget, filterPolicies, reviewContext, archiveHint, statusTone, incidentLinks
} from '../src/common/utils/monitor.js';
import { requiredChecks, findBlocker, prefillValues } from '../src/common/utils/form-logic.js';

test('alert views split firing signals from recovered history', () => {
  assert.deepEqual(filterAlerts('告警历史', {}).map(a => a.id), ['ALERT-DEMO-04', 'ALERT-DEMO-05', 'ALERT-DEMO-06']);
  assert.ok(filterAlerts('活跃告警', {}).every(a => a.signal === '触发中'));
});

test('alert filters combine level, acknowledgement and notification state', () => {
  assert.deepEqual(filterAlerts('活跃告警', { notification: '已静默' }).map(a => a.id), ['ALERT-DEMO-02']);
  assert.deepEqual(filterAlerts('活跃告警', { ack: '未确认' }).map(a => a.id), ['ALERT-DEMO-03']);
  assert.deepEqual(filterAlerts('活跃告警', { level: 'P0', notification: '已静默' }).map(a => a.id), []);
  assert.deepEqual(filterAlerts('活跃告警', { level: 'P0', ack: '已确认' }).map(a => a.id), ['ALERT-DEMO-01']);
});

test('alert search matches the rule and linked incident identifiers', () => {
  assert.deepEqual(filterAlerts('活跃告警', { query: '  gpu-unavailable ' }).map(a => a.id), ['ALERT-DEMO-01']);
  assert.deepEqual(filterAlerts('告警历史', { query: 'INC-DEMO-03' }).map(a => a.id), ['ALERT-DEMO-04', 'ALERT-DEMO-06']);
});

test('alert actions: silence only while firing; incident creation only without linked incident', () => {
  const firingLinked = alertRecords.find(a => a.id === 'ALERT-DEMO-01');
  assert.deepEqual(alertActions(firingLinked), { canSilence: true, hasIncidents: true, canCreateIncident: false });
  const firingUnlinked = alertRecords.find(a => a.id === 'ALERT-DEMO-03');
  assert.deepEqual(alertActions(firingUnlinked), { canSilence: true, hasIncidents: false, canCreateIncident: true });
  const recovered = alertRecords.find(a => a.id === 'ALERT-DEMO-04');
  assert.equal(alertActions(recovered).canSilence, false);
  assert.equal(alertActions(recovered).canCreateIncident, false);
});

test('silence plan binds the selected alert and passes the form blockers check', () => {
  const values = prefillValues(forms.silence, ['ALERT-DEMO-02']);
  assert.equal(values['事件 / 规则'], 'ALERT-DEMO-02');
  assert.equal(findBlocker(forms.silence, values), null);
  assert.deepEqual(requiredChecks(forms.silence, values), forms.silence.checks);
});

test('incident create plan binds the source alert and object', () => {
  const values = prefillValues(forms['incident-create'], ['ALERT-DEMO-03', '告警', 'compute-lab / infer-demo']);
  assert.equal(values['来源ID'], 'ALERT-DEMO-03');
  assert.equal(values['来源类型'], '告警');
  assert.equal(values['对象'], 'compute-lab / infer-demo');
  assert.equal(findBlocker(forms['incident-create'], values), null);
});

test('incident list filters combine phase, severity and owner', () => {
  assert.deepEqual(filterIncidents({ phase: '已关闭' }).map(i => i.id), ['INC-DEMO-02', 'INC-DEMO-03', 'INC-DEMO-04']);
  assert.deepEqual(filterIncidents({ severity: '严重' }).map(i => i.id), ['INC-DEMO-01']);
  assert.deepEqual(filterIncidents({ query: 'INC-DEMO-03', phase: '已关闭' }).map(i => i.id), ['INC-DEMO-03']);
  assert.deepEqual(filterIncidents({ query: 'INC-DEMO-03', phase: '等待人工处理' }).map(i => i.id), []);
  assert.equal(filterIncidents({ query: 'no-such-incident' }).length, 0);
});

test('review archive list only shows closed incidents and filters by review status', () => {
  assert.deepEqual(filterClosedIncidents({}).map(i => i.id), ['INC-DEMO-02', 'INC-DEMO-03', 'INC-DEMO-04']);
  assert.deepEqual(filterClosedIncidents({ reviewStatus: '已归档' }).map(i => i.id), ['INC-DEMO-04']);
  assert.deepEqual(filterClosedIncidents({ reviewStatus: '待复盘' }).map(i => i.id), ['INC-DEMO-02']);
});

test('closed or archived incidents are read-only for recording actions', () => {
  assert.equal(incidentCanEdit(INCIDENTS['INC-DEMO-01']), true);
  assert.equal(incidentCanEdit(INCIDENTS['INC-DEMO-02']), false);
  assert.equal(incidentCanEdit(INCIDENTS['INC-DEMO-04']), false);
});

test('close gate blocks unknown S2 impact and never allows a silent no-impact close', () => {
  const unknown = { ...INCIDENTS['INC-DEMO-01'], s2Impact: 'unknown' };
  assert.equal(closeGate(unknown).blocked, true);
  assert.equal(closeGate(unknown).joint, true);
  assert.equal(closeGate(INCIDENTS['INC-DEMO-01']).blocked, undefined);
  assert.equal(closeGate(INCIDENTS['INC-DEMO-02']).joint, false);
});

test('archive requires a closed incident with completed review evidence', () => {
  assert.equal(archiveGate(INCIDENTS['INC-DEMO-01']).allowed, false);
  assert.equal(archiveGate(INCIDENTS['INC-DEMO-02']).allowed, false, 'closed but review pending');
  assert.equal(archiveGate(INCIDENTS['INC-DEMO-03']).allowed, true, 'completed review, open actions do not block');
  assert.equal(archiveGate(INCIDENTS['INC-DEMO-04']).allowed, false, 'already archived is read-only');
  const missingReviewer = { ...INCIDENTS['INC-DEMO-03'], review: { ...INCIDENTS['INC-DEMO-03'].review, reviewer: '' } };
  assert.equal(archiveGate(missingReviewer).allowed, false);
  const unclearRoot = { ...INCIDENTS['INC-DEMO-03'], review: { ...INCIDENTS['INC-DEMO-03'].review, rootCause: { state: '未知', detail: 'x' } } };
  assert.equal(archiveGate(unclearRoot).allowed, false);
  const incompleteAction = { ...INCIDENTS['INC-DEMO-03'], review: { ...INCIDENTS['INC-DEMO-03'].review, actions: [{ id: 'x', title: '', owner: 'a', due: 'b' }] } };
  assert.equal(archiveGate(incompleteAction).allowed, false);
});

test('archive plan form is blocked by the same gate and binds review context', () => {
  const inc = INCIDENTS['INC-DEMO-03'];
  const values = prefillValues(forms['incident-archive'], reviewContext(inc));
  assert.equal(values['故障单'], 'INC-DEMO-03');
  assert.equal(values['复盘状态'], '已完成');
  assert.equal(archiveGate(inc).allowed, true);
  assert.equal(archiveHint(INCIDENTS['INC-DEMO-02']), '当前状态为“待复盘”，可查看复盘但不能生成归档计划。');
  assert.equal(archiveHint(INCIDENTS['INC-DEMO-04']), '已归档记录只读，不重复归档。');
  assert.equal(archiveHint(INCIDENTS['INC-DEMO-03']), null);
});

test('incident gates expose edit state, close and archive rules together', () => {
  const gates = incidentGates(INCIDENTS['INC-DEMO-01']);
  assert.equal(gates.canEdit, true);
  assert.equal(gates.archive.allowed, false);
  assert.equal(gates.reviewStatus, '未开始');
});

test('incident links resolve by stable id and never fall back', () => {
  const links = incidentLinks(INCIDENTS['INC-DEMO-01']);
  assert.deepEqual(links.triggerAlert, { name: 'alert', query: { id: 'ALERT-DEMO-01' } });
  assert.equal(links.triggerTask, null);
  assert.equal(linkTarget('alert', 'ALERT-MISSING'), null);
  assert.equal(linkTarget('alert', undefined), null);
  assert.deepEqual(linkTarget('incident', 'INC-DEMO-02'), { name: 'incident', query: { id: 'INC-DEMO-02' } });
});

test('exact alert, policy, incident, review and channel details per id', () => {
  assert.equal(monitorDetail('alert', 'ALERT-DEMO-02').alert.object, 'reserve-01');
  assert.equal(monitorDetail('alert', 'ALERT-MISSING'), null);
  assert.equal(monitorDetail('policy', 'bmc-no-data').row[0], 'bmc-no-data');
  assert.equal(monitorDetail('policy', 'missing-policy'), null);
  assert.equal(monitorDetail('incident', 'INC-DEMO-02').incident.id, 'INC-DEMO-02');
  assert.equal(monitorDetail('incident', 'INC-DEMO-99'), null);
  assert.equal(monitorDetail('incident-review', 'INC-DEMO-04').incident.review.status, '已归档');
  assert.equal(monitorDetail('incident-review', 'INC-MISSING'), null);
  assert.deepEqual(monitorDetail('channel', 'phone-p0').row.slice(0, 2), ['phone-p0', '电话']);
  assert.equal(monitorDetail('channel', 'no-channel'), null);
  assert.equal(monitorDetail('unknown-page', 'x'), null);
});

test('missing id uses the page example and marks it as example', () => {
  const alert = monitorDetail('alert');
  assert.equal(alert.example, true);
  assert.equal(alert.id, 'ALERT-DEMO-01');
  assert.equal(monitorDetail('incident-review').incident.id, 'INC-DEMO-03');
  assert.equal(monitorDetail('policy', 'gpu-unavailable').example, false);
});

test('policy filters combine text search and status', () => {
  assert.equal(filterPolicies({}).length, catalog.policies.rows.length);
  assert.deepEqual(filterPolicies({ query: 'bmc-no-data', status: '待验证' }).map(r => r[0]), ['bmc-no-data']);
  assert.equal(filterPolicies({ query: 'bmc-no-data', status: '已启用' }).length, 0);
});

test('status tones keep the old colour semantics', () => {
  assert.equal(statusTone('已归档'), 'success');
  assert.equal(statusTone('已关闭'), 'default');
  assert.equal(statusTone('任务失败'), 'error');
  assert.equal(statusTone('等待人工处理'), 'warning');
});

// ---------- 监控总览细化：资源分组 + 四层指标面板 ----------
import { LAYER_TABS, RESOURCE_GROUP_TABS, groupStats, layerPanel } from '../src/common/utils/monitor.js';

test('resource group tabs follow the three pool types plus all', () => {
  assert.deepEqual(RESOURCE_GROUP_TABS, ['全部资源', '专属池', '共享池', '裸金属池']);
  const all = groupStats('全部资源');
  assert.match(all.clusters, /2/);
  assert.match(all.cards, /40 卡/);
  const baremetal = groupStats('裸金属池');
  assert.match(baremetal.nodes, /整机 2 台/);
  assert.match(baremetal.note, /带外与硬件层/);
  assert.match(groupStats('专属池').note, /容量即配额/);
  assert.match(groupStats('共享池').allocated, /已分配 8 · 预留 2/);
});

test('layer panels answer which metrics matter per resource layer', () => {
  assert.deepEqual(LAYER_TABS.map(tab => tab.title), ['物理机', 'GPU 与算力', '集群与容器组', '交付与容量']);
  for (const tab of LAYER_TABS) {
    const panel = layerPanel(tab.key);
    assert.ok(panel.metrics.length >= 6, tab.title);
    for (const metric of panel.metrics) {
      assert.ok(metric.name && metric.value, tab.title);
      assert.ok(['ok', 'warn', 'unknown'].includes(metric.state), `${tab.title}:${metric.name}`);
      assert.ok(metric.why.length >= 8, `${tab.title}:${metric.name} 需要给出关注理由`);
    }
    assert.ok(panel.tops.length >= 3, tab.title);
    assert.ok(panel.intro.length > 10, tab.title);
  }
  // 关键边界：裸金属只带外、未接入指标显式标未知、交付类事件接告警。
  const host = layerPanel('host');
  assert.ok(host.metrics.some(m => m.name.includes('OS：CPU') && m.state === 'unknown' && m.why.includes('租户')));
  const gpu = layerPanel('gpu');
  assert.ok(gpu.metrics.some(m => m.name.includes('不可分配') && m.state === 'warn'));
  const delivery = layerPanel('delivery');
  assert.ok(delivery.metrics.some(m => m.why.includes('预留超时')));
  assert.ok(delivery.tops.some(t => t.object === 'DELIV-DEMO-05'));
});

test('every layer panel ships intuitive example charts with derived counts', () => {
  for (const tab of LAYER_TABS) {
    const panel = layerPanel(tab.key);
    assert.ok(panel.charts.length >= 2, `${tab.title} 至少两张示例图`);
    for (const chart of panel.charts) {
      assert.ok(['trend', 'stack', 'bars'].includes(chart.type), chart.title);
      assert.ok(chart.title && chart.note, chart.title);
      if (chart.type === 'trend') {
        assert.ok(chart.series.length >= 2 && chart.labels.length >= 5, chart.title);
        for (const series of chart.series) assert.equal(series.points.length, chart.labels.length, `${chart.title}:${series.name}`);
      }
      if (chart.type === 'stack') assert.ok(chart.segments.length >= 2, chart.title);
      if (chart.type === 'bars') assert.ok(chart.bars.length >= 2, chart.title);
    }
  }
  // 图表计数与事实派生一致：BMC 可达性、节点 Ready、池水位。
  const host = layerPanel('host');
  const bmcChart = host.charts.find(chart => chart.type === 'stack');
  assert.equal(bmcChart.segments.find(segment => segment.name === 'BMC 在线')?.value, 9);
  const cluster = layerPanel('cluster');
  assert.equal(cluster.charts.find(chart => chart.type === 'stack').segments.find(segment => segment.name === 'Ready')?.value, 3);
  const delivery = layerPanel('delivery');
  const bars = delivery.charts.find(chart => chart.type === 'bars');
  assert.equal(bars.bars.length, 3, '三类池各一条水位');
  const gpuTrend = layerPanel('gpu').charts.find(chart => chart.type === 'trend');
  assert.ok(gpuTrend.series.some(series => series.name.includes('分配率')), 'GPU 图必须含分配率对比线');
});
