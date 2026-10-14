import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditListData, auditDetailData, auditLogTabs, evidenceLinkFor } from '../src/common/utils/audit.js';
import { filterRows, listSource, planConfig, stateColumn } from '../src/common/utils/objects.js';
import { prefillValues, requiredChecks, findBlocker } from '../src/common/utils/form-logic.js';

// 会话 / 操作列表已并入审计记录页签，详情仍按 id 精确解析。
const LIST_DETAILS = [['audit', 'access'], ['sessions', 'session'], ['operations', 'operation']];

test('every audit row resolves its exact detail by id', () => {
  for (const [, detailPage] of LIST_DETAILS) {
    const list = listSource(detailPage === 'access' ? 'audit' : detailPage === 'session' ? 'sessions' : 'operations');
    assert.equal(new Set(list.rows.map(row => row[0])).size, list.rows.length);
    for (const row of list.rows) {
      const detail = auditDetailData(detailPage, String(row[0]));
      assert.equal(detail.id, row[0]);
      assert.deepEqual(detail.row, row);
      assert.deepEqual(detail.fields.slice(0, row.length).map(([, value]) => value), row.map(String));
    }
  }
});

test('unknown or cross-object ids return null, never another row', () => {
  assert.equal(auditDetailData('session', 'SESSION-DEMO-99'), null);
  assert.equal(auditDetailData('operation', 'EVENT-DEMO-99'), null);
  assert.equal(auditDetailData('access', 'SESSION-DEMO-01'), null);
  assert.equal(auditDetailData('session', 'WebShell / 主机命令'), null);
});

test('audit-logs merges session and operation lists as tabs', () => {
  assert.equal(auditListData('access'), null);
  assert.equal(auditListData('tasks'), null);
  assert.equal(auditListData('audit').action, 'access');
  const page = auditListData('audit-logs');
  assert.equal(page.title, '审计记录');
  assert.deepEqual(auditLogTabs().map(tab => tab.title), ['会话记录', '操作记录']);
  assert.equal(listSource(auditLogTabs()[0].source).rows.length, 4);
  assert.equal(listSource(auditLogTabs()[1].source).rows.length, 2);
});

test('session search and status filters combine on the selected row set', () => {
  const list = listSource('sessions');
  const idx = stateColumn(list.columns);
  assert.equal(idx, 5);
  const pending = filterRows(list.rows, 'compute', '待授权', idx);
  assert.deepEqual(pending.map(row => row[0]), ['SESSION-DEMO-04']);
  assert.equal(filterRows(list.rows, 'compute', '已结束', idx)[0][0], 'SESSION-DEMO-01');
  assert.equal(filterRows(list.rows, 'no-such-object', '全部', idx).length, 0);
});

test('session timeline belongs only to SESSION-DEMO-01', () => {
  const sample = auditDetailData('session', 'SESSION-DEMO-01');
  const other = auditDetailData('session', 'SESSION-DEMO-04');
  assert.ok(sample.tabs.find(tab => tab.key === '会话时间线').rows.length > 0);
  assert.equal(other.tabs.find(tab => tab.key === '会话时间线').rows.length, 0);
});

test('access detail lists sessions of the same channel only', () => {
  const pod = auditDetailData('access', 'Pod exec');
  assert.deepEqual(pod.tabs.find(tab => tab.key === '关联会话').rows.map(row => row[0]), ['SESSION-DEMO-02']);
  const kvm = auditDetailData('access', '带外 KVM');
  assert.deepEqual(kvm.tabs.find(tab => tab.key === '关联会话').rows.map(row => row[0]), ['SESSION-DEMO-04']);
});

test('access plan binds selected channel and target, and channel-specific checks apply', () => {
  const config = planConfig('access');
  assert.ok(config);
  const kvm = auditDetailData('access', '带外 KVM');
  const values = prefillValues(config, kvm.row);
  assert.equal(values['通道'], '带外 KVM');
  assert.equal(values['目标范围'], 'compute-02 / BMC');
  assert.equal(findBlocker(config, values), null);
  const checks = requiredChecks(config, values);
  assert.ok(checks.some(check => /KVM/.test(check)));
  assert.ok(!checks.some(check => /WebShell/.test(check)));
  const webshell = prefillValues(config, auditDetailData('access', 'WebShell / 主机命令').row);
  assert.ok(requiredChecks(config, webshell).some(check => /WebShell/.test(check)));
});

test('operation evidence links only to existing task and session ids', () => {
  const operation = auditDetailData('operation', 'EVENT-DEMO-02');
  const link = operation.tabs[0].rows.map(row => evidenceLinkFor(row)).find(Boolean);
  assert.deepEqual(link, { name: 'task', query: { id: 'TASK-DEMO-02' } });
  assert.equal(evidenceLinkFor(['关联任务', 'TASK-DEMO-99']), null);
  assert.deepEqual(evidenceLinkFor(['SESSION-DEMO-03', '已结束']), { name: 'session', query: { id: 'SESSION-DEMO-03' } });
});

test('operation config diff binds the task template of the selected event', () => {
  const diff = auditDetailData('operation', 'EVENT-DEMO-02').tabs.find(tab => tab.key === '配置差异').rows;
  assert.equal(diff[0][1], 'gpu-baseline-02');
  assert.equal(auditDetailData('operation', 'EVENT-DEMO-01').fields.some(([label]) => label === '变更摘要'), true);
  assert.equal(auditDetailData('operation', 'EVENT-DEMO-02').fields.some(([label]) => label === '变更摘要'), false);
});
