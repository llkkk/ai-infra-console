import { test } from 'node:test';
import assert from 'node:assert/strict';
import { servicePages, serviceDetail, serviceList, serviceDetailParents } from '../src/common/utils/services.js';
import { planConfig, filterRows, stateColumn } from '../src/common/utils/objects.js';
import { prefillValues, requiredChecks, findBlocker, validateFormConfig } from '../src/common/utils/form-logic.js';

const detailOfPage = Object.fromEntries(Object.entries(serviceDetailParents).map(([detail, page]) => [page, detail]));

test('every service list row resolves to its exact detail and ids are unique', () => {
  for (const page of servicePages) {
    const list = serviceList(page);
    const ids = list.rows.map(row => String(row[0]));
    assert.equal(new Set(ids).size, ids.length, `${page} ids must be unique`);
    for (const row of list.rows) {
      const detail = serviceDetail(detailOfPage[page], String(row[0]));
      assert.ok(detail, `${page}:${row[0]} must resolve`);
      assert.equal(detail.id, row[0]);
      assert.deepEqual(detail.row, row);
      assert.equal(detail.parent, page);
    }
  }
});

test('unknown or foreign ids return null and never fall back to another object', () => {
  assert.equal(serviceDetail('registry-detail', 'registry-demo / unknown'), null);
  assert.equal(serviceDetail('database-detail', 'pg-cluster-demo-missing'), null);
  // 其他列表的对象 id 不能借由另一个详情页打开。
  assert.equal(serviceDetail('storage-detail', 'pg-cluster-demo'), null);
  assert.equal(serviceDetail('not-a-service-detail', 'registry-demo / s1-infra'), null);
});

test('missing id uses the page example first row, explicitly identified', () => {
  const detail = serviceDetail('registry-detail', '');
  assert.equal(detail.id, 'registry-demo / s1-infra');
  assert.equal(detail.row[0], 'registry-demo / s1-infra');
});

test('service detail fields follow the selected row, not the first-row example', () => {
  const s2 = Object.fromEntries(serviceDetail('registry-detail', 'registry-demo / s2-models').fields);
  assert.equal(s2['仓库 / 项目'], 'registry-demo / s2-models');
  assert.equal(s2['用途'], '模型推理镜像');
  const s3 = Object.fromEntries(serviceDetail('registry-detail', 'registry-demo / s3-public').fields);
  assert.equal(s3['同步'], '待定');
});

test('database detail marks connection reference unknown for non-pg clusters', () => {
  const pg = Object.fromEntries(serviceDetail('database-detail', 'pg-cluster-demo').fields);
  assert.equal(pg['凭据'], 'credential-db-demo（引用）');
  const mysql = Object.fromEntries(serviceDetail('database-detail', 'mysql-cluster-demo').fields);
  assert.equal(mysql['连接地址'], '未知（示例未提供）');
  assert.equal(mysql['凭据'], '未知（示例未提供）');
  assert.equal(mysql['版本'], 'MySQL / 待锁定');
});

test('tab rows fall back to object fields when no evidence is defined', () => {
  const detail = serviceDetail('registry-detail', 'registry-demo / s2-models');
  const configTab = detail.tabs.find(item => item.key === '配置');
  assert.ok(configTab.rows.length > 0);
});

test('registry detail lists images with references and delete interception', () => {
  const detail = serviceDetail('registry-detail', 'registry-demo / s1-infra');
  const images = detail.tabs.find(item => item.key === '镜像与制品').rows;
  assert.equal(images.length, 3);
  assert.ok(images.some(row => row[0] === 'img-demo-02' && String(row[4]).includes('gpu-baseline-02')));
  const refs = detail.tabs.find(item => item.key === '被引用关系').rows;
  assert.ok(refs.some(row => String(row[2]).includes('删除前拦截')));
  const s2 = serviceDetail('registry-detail', 'registry-demo / s2-models');
  assert.ok(s2.tabs.find(item => item.key === '镜像与制品').rows.some(row => row[0] === 'image-ref'));
});

test('database detail exposes params, Web SQL console and backup tabs', () => {
  const pg = serviceDetail('database-detail', 'pg-cluster-demo');
  const tabTitles = pg.tabs.map(tab => tab.title);
  assert.deepEqual(tabTitles, ['概览', '参数与调整', 'Web SQL 控制台', '备份与恢复', '操作记录']);
  const params = pg.tabs.find(tab => tab.key === '参数与调整').rows;
  assert.ok(params.some(row => row[0] === 'max_connections' && String(row[2]).includes('白名单')));
  assert.ok(params.some(row => row[0].includes('连接统计')));
  const webSql = Object.fromEntries(pg.tabs.find(tab => tab.key === 'Web SQL 控制台').rows.map(row => [row[0], String(row[1])]));
  assert.equal(webSql['默认账号'], '只读账号（D12）');
  assert.match(webSql['控制台入口'], /数据库集群详情/);
  const mysql = serviceDetail('database-detail', 'mysql-cluster-demo');
  assert.equal(mysql.tabs.find(tab => tab.key === 'Web SQL 控制台').rows[0][1], '未接入');
});

test('storage detail stays read-only skeleton with capacity breakdown', () => {
  const object = serviceDetail('storage-detail', 'storage-demo');
  const capacity = object.tabs.find(tab => tab.key === '容量明细').rows;
  assert.ok(capacity.some(row => String(row[2]).includes('只读骨架')));
  assert.ok(capacity.some(row => row[0].includes('model-storage')));
});

test('service list filters combine search and status column', () => {
  const list = serviceList('database');
  const index = stateColumn(list.columns);
  assert.equal(index, 6);
  assert.equal(filterRows(list.rows, 'pg-cluster', '示例登记', index).length, 1);
  assert.equal(filterRows(list.rows, '', '全部', index).length, list.rows.length);
  assert.equal(filterRows(list.rows, 'no-such-cluster', '全部', index).length, 0);
});

test('service request form is opened from every service list and detail', () => {
  for (const page of servicePages) {
    const list = serviceList(page);
    assert.equal(list.action, 'service-request');
    assert.ok(planConfig(list.action), `${page} action must exist in forms`);
  }
  const config = planConfig('service-request');
  assert.deepEqual(validateFormConfig(config, 'service-request'), []);
  const detail = serviceDetail('registry-detail', 'registry-demo / s1-infra');
  const values = prefillValues(config, detail.row);
  assert.deepEqual(Object.keys(values), config.fields.map(([name]) => name));
  assert.equal(findBlocker(config, values), null);
  assert.deepEqual(requiredChecks(config, values), config.checks);
});
