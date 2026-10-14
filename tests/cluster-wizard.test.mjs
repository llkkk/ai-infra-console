import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildClusterLocalPlan, clusterWizardCandidates, invalidateSelections, validateClusterWizard } from '../src/common/utils/cluster-wizard.js';

const assets = [
  { id: 'a-ready', stage: 'installed', bmc: 'online', task: null, incident: null, location: { room: 'a' }, ownership: null },
  { id: 'b-ready', stage: 'installed', bmc: 'online', task: null, incident: null, location: { room: 'b' }, ownership: null },
  { id: 'busy', stage: 'installed', bmc: 'online', task: 'TASK-1', incident: null, location: { room: 'b' }, ownership: null },
  { id: 'unknown', stage: 'installed', bmc: 'no_data', task: null, incident: null, location: { room: 'b' }, ownership: null }
];
const rooms = [{ id: 'a', name: '机房 A' }, { id: 'b', name: '机房 B' }];
const base = { roomId: 'b', name: 'demo', template: 'rke2-general', selected: ['b-ready', 'b-ready'], roles: { 'b-ready': 'worker' }, network: 'network', storage: 'storage', gpu: '候选适配未实测' };

test('candidates reject cross-room, occupied, unknown health and in-progress assets', () => {
  const candidates = clusterWizardCandidates({ roomId: 'b', assets, rooms });
  assert.equal(candidates.find(item => item.id === 'b-ready').selectable, true);
  assert.match(candidates.find(item => item.id === 'a-ready').reason, /机房 B/);
  assert.match(candidates.find(item => item.id === 'busy').reason, /进行中的任务/);
  assert.match(candidates.find(item => item.id === 'unknown').reason, /健康状态/);
});

test('role validation requires one control plane and one worker', () => {
  const result = validateClusterWizard({ ...base, selected: ['b-ready'], roles: { 'b-ready': 'worker' } }, { assets, rooms });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('控制面')));
});

test('changing room invalidates old selections and legal fixtures produce a local plan', () => {
  assert.deepEqual(invalidateSelections({ selected: ['a-ready', 'b-ready'], roles: { 'a-ready': 'control-plane', 'b-ready': 'worker' }, roomId: 'b', assets, rooms }), ['b-ready']);
  const state = { ...base, selected: ['b-ready', 'b-ready'], roles: { 'b-ready': 'control-plane' } };
  // Distinct fixture ids are required for two roles.
  const legal = { ...state, selected: ['b-ready', 'b-worker'], roles: { 'b-ready': 'control-plane', 'b-worker': 'worker' } };
  const fixtureAssets = [...assets, { ...assets[1], id: 'b-worker' }];
  assert.equal(validateClusterWizard(legal, { assets: fixtureAssets, rooms }).valid, true);
  assert.equal(buildClusterLocalPlan(legal, { assets: fixtureAssets, rooms }).executed, false);
});

test('missing room or an unknown template cannot produce a plan even with two eligible assets', () => {
  const fixtureAssets = [...assets, { ...assets[1], id: 'b-worker' }];
  const legal = { ...base, selected: ['b-ready', 'b-worker'], roles: { 'b-ready': 'control-plane', 'b-worker': 'worker' } };
  for (const invalid of [{ ...legal, roomId: '' }, { ...legal, roomId: 'missing' }, { ...legal, template: 'missing' }, { ...legal, network: '' }, { ...legal, storage: '' }]) {
    assert.equal(validateClusterWizard(invalid, { assets: fixtureAssets, rooms }).valid, false);
    assert.equal(buildClusterLocalPlan(invalid, { assets: fixtureAssets, rooms }), null);
  }
});

test('ownership, maintenance, retirement, and an unresolved incident exclude otherwise installed assets', () => {
  const blocked = [
    { ...assets[1], id: 'owned', ownership: { kind: 'cluster', cluster: 'existing' } },
    { ...assets[1], id: 'maintenance', sideState: 'maintenance' },
    { ...assets[1], id: 'retired', sideState: 'retired' },
    { ...assets[1], id: 'incident', incident: 'unobserved-incident' }
  ];
  assert.deepEqual(clusterWizardCandidates({ roomId: 'b', assets: blocked, rooms }).map(asset => asset.selectable), [false, false, false, false]);
});

test('duplicated or unknown selected nodes and illegal roles never generate a cluster plan', () => {
  const fixtureAssets = [...assets, { ...assets[1], id: 'b-worker' }];
  const legal = { ...base, selected: ['b-ready', 'b-worker'], roles: { 'b-ready': 'control-plane', 'b-worker': 'worker' } };
  for (const invalid of [
    { ...legal, selected: ['b-ready', 'b-worker', 'b-ready'] },
    { ...legal, selected: ['b-ready', 'missing'] },
    { ...legal, roles: { 'b-ready': 'control-plane', 'b-worker': 'invalid' } }
  ]) assert.equal(buildClusterLocalPlan(invalid, { assets: fixtureAssets, rooms }), null);
});

test('a local plan contains only eligible selected nodes and keeps environment verification pending', () => {
  const fixtureAssets = [...assets, { ...assets[1], id: 'b-worker' }, { ...assets[1], id: 'unselected-worker' }];
  const legal = { ...base, selected: ['b-ready', 'b-worker'], roles: { 'b-ready': 'control-plane', 'b-worker': 'worker' } };
  const plan = buildClusterLocalPlan(legal, { assets: fixtureAssets, rooms });
  assert.deepEqual(plan.nodes, [
    { id: 'b-ready', role: 'control-plane', room: '机房 B' },
    { id: 'b-worker', role: 'worker', room: '机房 B' }
  ]);
  assert.equal(plan.checks.environment, '待真实环境验证');
  assert.equal(plan.checks.human, '待人工确认');
  assert.equal(plan.executed, false);
  assert.equal(plan.persisted, false);
});
