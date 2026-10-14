import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterDetailPages, clusterForms, clusterListPages, detailData, evidenceLinkFor, listData } from '../src/common/utils/clusters.js';
import { filterRows, planConfig, stateColumn } from '../src/common/utils/objects.js';
import { prefillValues, requiredChecks, findBlocker, validateFormConfig } from '../src/common/utils/form-logic.js';

test('every cluster list row resolves to its exact detail, unknown ids stay null', () => {
  for (const page of clusterListPages) {
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

test('every cluster detail page without id shows its first-row example and rejects unknown ids', () => {
  for (const page of clusterDetailPages) {
    const example = detailData(page);
    assert.ok(example, page);
    assert.ok(example.fields.length > 0, page);
    assert.equal(detailData(page, 'no-such-object'), null, page);
  }
});

test('list state filters combine with search and use the status column', () => {
  const expected = { clusters: 6, 'cluster-templates': 5 };
  for (const [page, index] of Object.entries(expected)) assert.equal(stateColumn(listData(page).columns), index, page);
  const clusters = listData('clusters');
  assert.deepEqual(filterRows(clusters.rows, '', '未检查', 6).map(row => row[0]), ['cpu-lab']);
  assert.equal(filterRows(clusters.rows, 'compute', '未检查', 6).length, 0);
});

test('cluster register is only offered from the clusters list', () => {
  assert.deepEqual(listData('clusters').secondaryForms, ['cluster-register']);
  assert.deepEqual(listData('cluster-templates').secondaryForms, []);
});

test('every form this module opens exists and has a consistent configuration', () => {
  for (const name of clusterForms) {
    const config = planConfig(name);
    assert.ok(config, name);
    assert.deepEqual(validateFormConfig(config, name), [], name);
  }
});

test('node maintenance blocks an Unknown node and allows a ready one', () => {
  const config = planConfig('maintenance');
  const unknown = detailData('node', 'cpu-worker-01');
  const unknownValues = prefillValues(config, unknown.row);
  assert.equal(unknownValues['目标'], 'cpu-worker-01');
  assert.match(findBlocker(config, unknownValues), /Unknown/);
  const ready = detailData('node', 'compute-01');
  const readyValues = prefillValues(config, ready.row);
  assert.equal(readyValues['目标'], 'compute-01');
  assert.equal(findBlocker(config, readyValues), null);
  assert.equal(requiredChecks(config, readyValues).length, 3, '含进行中交付单门禁');
});

test('GPU mode plan binds the selected device and keeps its checks', () => {
  const detail = detailData('gpu', 'GPU-DEMO-002');
  const config = planConfig(detail.action);
  const values = prefillValues(config, detail.row);
  assert.equal(values['设备'], 'GPU-DEMO-002');
  assert.equal(requiredChecks(config, values).length, 2);
});

test('template and capability plans bind the selected object', () => {
  for (const [page, id, label] of [['cluster-template', 'rke2-general', '模板'], ['cluster-capability-detail', 'cpu-lab', '集群']]) {
    const detail = detailData(page, id);
    assert.equal(prefillValues(planConfig(detail.action), detail.row)[label], id, page);
  }
});

test('GPU detail facts come from the selected device, not the first row', () => {
  const fields = Object.fromEntries(detailData('gpu', 'GPU-DEMO-002').fields);
  assert.equal(fields['UUID'], 'GPU-DEMO-002');
  assert.equal(fields['节点 / 资产'], 'compute-02');
  assert.equal(fields['关联分配'], '占用待核实（ALLOC-DEMO-02）');
  assert.equal(fields['型号 / 显存'], '示例 GPU / 80 GiB');
});

test('cluster template detail maps the selected row into its fields', () => {
  const fields = Object.fromEntries(detailData('cluster-template', 'rke2-general').fields);
  assert.equal(fields['模板'], 'rke2-general');
  assert.equal(fields['网络'], 'CNI / CSI 待定');
  assert.equal(fields['共享 / 调度'], '无');
});

test('node detail keeps Unknown state visible and never reports it as healthy', () => {
  const detail = detailData('node', 'cpu-worker-01');
  assert.equal(Object.fromEntries(detail.fields)['状态'], 'Unknown');
  const runtime = detail.tabs.find(tab => tab.key === '运行状态');
  assert.ok(runtime.rows.some(row => row[0] === 'Node 状态' && row[1] === 'Unknown'));
});

test('compute-lab cluster detail derives summary, badge and capability link from its row', () => {
  const detail = detailData('cluster', 'compute-lab');
  assert.equal(detail.title, '集群详情');
  assert.equal(detail.badge, '运行中');
  assert.equal(detail.action, 'cluster-change');
  assert.equal(detail.actionLabel, '变更计划');
  assert.equal(detail.summary.stats[0].value, '就绪');
  assert.equal(detail.summary.stats[3].value, '未验证');
  assert.equal(detail.summary.capacity.find(item => item.label === 'GPU').used, 8);
  assert.deepEqual(detail.relatedLinks.map(link => [link.name, link.id]), [['cluster-capability-detail', 'compute-lab']]);
  const nodes = detail.tabs.find(tab => tab.key === '节点');
  assert.deepEqual(nodes.rows.map(row => row[0]), ['compute-01', 'compute-02', 'demo-control-01']);
  assert.equal(detail.source, null);
});

test('cpu-lab stays unknown and unobserved, with source boundary and no invented capacity', () => {
  const detail = detailData('cluster', 'cpu-lab');
  assert.equal(detail.badge, '未知');
  assert.equal(detail.summary.capacity, null);
  assert.ok(detail.summary.stats.some(stat => stat.label === 'API 状态' && stat.value === '未知'));
  assert.ok(detail.source);
  assert.ok(detail.source.fields.some(([label, value]) => label === 'API' && value === '未知'));
  const overview = detail.tabs.find(tab => tab.key === '概览');
  assert.ok(overview.rows.some(row => row[1] === '未采集'));
  assert.ok(!overview.rows.some(row => row[1] === '健康'));
});

test('cluster capability detail reports the per-cluster verdict and checks', () => {
  const detail = detailData('cluster-capability-detail', 'cpu-lab');
  assert.equal(Object.fromEntries(detail.fields)['验收结论'], '未验收：只纳管，不承诺运行能力');
  assert.ok(detail.fields.some(([label, value]) => label === 'GPU 软件栈' && value === '不适用 · 无 GPU'));
  assert.equal(detail.action, 'cluster-capability');
  assert.equal(detailData('cluster-capability-detail', 'missing-cluster'), null);
});

test('evidence links resolve only exact node and GPU ids', () => {
  assert.deepEqual(evidenceLinkFor(['compute-01']), { name: 'node', query: { id: 'compute-01' } });
  assert.deepEqual(evidenceLinkFor(['GPU-DEMO-002']), { name: 'gpu', query: { id: 'GPU-DEMO-002' } });
  assert.equal(evidenceLinkFor(['Node 状态']), null);
  assert.equal(evidenceLinkFor(['compute-99']), null);
});
