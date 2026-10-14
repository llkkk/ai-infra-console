import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settingsPages, settingsList, settingsDetail, settingsDetailParents, PLATFORM_OPERATIONS } from '../src/common/utils/settings.js';
import { planConfig, filterRows, stateColumn } from '../src/common/utils/objects.js';
import { prefillValues, requiredChecks, findBlocker, validateFormConfig } from '../src/common/utils/form-logic.js';

const detailOfPage = Object.fromEntries(Object.entries(settingsDetailParents).map(([detail, page]) => [page, detail]));
// 凭据视图不得出现秘密值：字段名不含秘密类标签，内容不含 key/token/密码 赋值或长随机串。
const SECRET_LABEL = /密码|密钥值|secret value|token|password|private/i;
const SECRET_VALUE = /(password|token|secret|apikey|api_key)\s*[:=]|-----BEGIN|[A-Za-z0-9+/]{32,}/i;

test('every settings list row resolves to its exact detail and ids are unique', () => {
  for (const page of settingsPages) {
    const list = settingsList(page);
    const ids = list.rows.map(row => String(row[0]));
    assert.equal(new Set(ids).size, ids.length, `${page} ids must be unique`);
    for (const row of list.rows) {
      const detail = settingsDetail(detailOfPage[page], String(row[0]));
      assert.ok(detail, `${page}:${row[0]} must resolve`);
      assert.equal(detail.id, row[0]);
      assert.deepEqual(detail.row, row);
    }
  }
});

test('unknown ids return null; platform services are keyed by unique service name', () => {
  assert.equal(settingsDetail('region', '不存在的区域'), null);
  assert.equal(settingsDetail('credential', 'credential-missing'), null);
  assert.equal(settingsDetail('platform-service', 'S2 模型工程'), null);
  const service = settingsDetail('platform-service', 'IAM 服务');
  assert.equal(service.row[1], 'S4 身份权限');
  assert.equal(Object.fromEntries(service.fields)['类型'], 'StatefulSet');
  assert.equal(Object.fromEntries(service.fields)['平台'], 'S4 身份权限');
});

test('platform namespace is only asserted for the S2 platform, other rows are marked unknown', () => {
  const gateway = Object.fromEntries(settingsDetail('platform-service', '模型网关').fields);
  assert.equal(gateway['Namespace'], 's2-system（示例）');
  const billing = Object.fromEntries(settingsDetail('platform-service', '计费服务').fields);
  assert.equal(billing['Namespace'], '未采集（示例未提供）');
  assert.equal(billing['状态'], '待接入');
});

test('platform common operations come from the row and stay demonstration only', () => {
  const operations = settingsDetail('platform-service', 'IAM 服务').tabs.find(tab => tab.key === '常用操作').rows.map(row => row[0]);
  assert.deepEqual(operations, ['重启', '日志', '回滚']);
  assert.deepEqual(PLATFORM_OPERATIONS, ['重启 Deployment', '扩缩容', '查看日志', '回滚']);
  for (const row of settingsDetail('platform-service', 'IAM 服务').tabs.find(tab => tab.key === '常用操作').rows) {
    assert.match(row[1], /不执行真实/);
  }
});

test('region detail reports the room / exec three-level structure', () => {
  const reserved = Object.fromEntries(settingsDetail('region', '预留区域').fields);
  assert.equal(reserved['区域标识'], '预留区域');
  assert.equal(reserved['连接状态'], '未接入');
  const rooms = settingsDetail('region', '实验中心').tabs.find(tab => tab.key === '机房与执行层').rows;
  assert.equal(rooms.length, 2);
  assert.ok(rooms.some(row => String(row[0]).includes('机房 A') && String(row[3]).includes('心跳')));
  assert.ok(rooms.every(row => String(row[2]).includes('在线')));
  const events = settingsDetail('region', '实验中心').tabs.find(tab => tab.key === '连接事件').rows;
  assert.equal(events[0][1], '10-14 10:24');
});

test('region list action opens the region form and filters combine search and connection status', () => {
  const list = settingsList('settings');
  assert.equal(list.action, 'region');
  const index = stateColumn(list.columns);
  assert.equal(list.columns[index], '状态');
  assert.equal(filterRows(list.rows, '实验', '示例在线', index).length, 1);
  assert.equal(filterRows(list.rows, '', '未接入', index)[0][0], '预留区域');
  assert.equal(filterRows(list.rows, '', '全部', index).length, list.rows.length);
});

test('credential views show references only and contain no secret-like values', () => {
  for (const row of settingsList('credentials').rows) {
    const detail = settingsDetail('credential', String(row[0]));
    assert.equal(Object.fromEntries(detail.fields)['引用'], row[0]);
    const cells = [
      ...detail.fields.flat(),
      ...detail.tabs.flatMap(tab => tab.rows.flat())
    ].map(String);
    for (const label of detail.fields.map(([label]) => label)) assert.doesNotMatch(label, SECRET_LABEL);
    for (const cell of cells) assert.doesNotMatch(cell, SECRET_VALUE, `${row[0]} exposes secret-like value: ${cell}`);
  }
});

test('credential detail binds the selected reference and its usage object', () => {
  const bmc = settingsDetail('credential', 'credential-bmc-demo');
  assert.equal(Object.fromEntries(bmc.fields)['用途'], 'BMC');
  assert.equal(Object.fromEntries(bmc.fields)['允许对象'], '测试资产组');
  const usage = bmc.tabs.find(tab => tab.key === '使用对象').rows;
  assert.equal(usage[0][0], 'credential-bmc-demo');
  const cluster = settingsDetail('credential', 'credential-cluster-demo');
  assert.equal(Object.fromEntries(cluster.fields)['托管系统'], '管理集群 Secret 引用');
});

test('region and credential forms open from their list and detail pages with checks and warnings', () => {
  const region = planConfig('region');
  assert.deepEqual(validateFormConfig(region, 'region'), []);
  assert.match(region.warning, /不配置交换机/);
  const regionValues = prefillValues(region, settingsDetail('region', '实验中心').row);
  assert.equal(regionValues['区域 ID'], 'region-demo-01');
  assert.equal(findBlocker(region, regionValues), null);

  const credential = planConfig('credential');
  assert.deepEqual(validateFormConfig(credential, 'credential'), []);
  assert.match(credential.warning, /禁止输入真实密钥/);
  const credentialValues = prefillValues(credential, settingsDetail('credential', 'credential-bmc-demo').row);
  assert.equal(credentialValues['引用名称'], 'credential-bmc-demo');
  assert.deepEqual(requiredChecks(credential, credentialValues), []);
  assert.equal(settingsList('credentials').action, 'credential');
  assert.equal(settingsDetail('credential', 'credential-bmc-demo').action, 'credential');
});
