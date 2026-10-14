// 集群创建向导的纯函数门禁。只读取本地示例数据，不执行供应、装机或集群变更。
import { assetRecords as defaultAssets, roomRecords as defaultRooms, STAGE_LABELS } from '../../model.js';
import { INCIDENTS } from '../../incident-data.js';
import { forms } from '../../catalog.js';
export const WIZARD_STEPS = ['机房与模板', '节点与角色', '网络 / 存储 / GPU', '预检与本地计划'];

const roomName = (id, rooms) => rooms.find(room => room.id === id)?.name ?? id;

export function candidateReason(asset, roomId, rooms = defaultRooms) {
  if (!roomId || !rooms.some(room => room.id === roomId)) return '请先选择有效机房';
  if (!asset?.location) return '未分配机房';
  if (roomId && asset.location.room !== roomId) return `不在${roomName(roomId, rooms)}`;
  if (asset.stage !== 'installed') return `阶段为${STAGE_LABELS[asset.stage] || '未知'}，要求已装机`;
  if (asset.ownership) return `已有归属（${asset.ownership.cluster || asset.ownership.pool || asset.ownership.kind || '未知'}）`;
  if (asset.task) return `存在进行中的任务：${asset.task}`;
  if (asset.bmc !== 'online') return `健康状态不可用（BMC ${asset.bmc || '未知'}）`;
  if (asset.incident && INCIDENTS[asset.incident]?.phase !== '已关闭') return `关联未关闭故障：${asset.incident}`;
  if (asset.sideState === 'maintenance' || asset.sideState === 'retired') return `资产状态为${asset.sideState === 'maintenance' ? '维护中' : '已退役'}`;
}

export function clusterWizardCandidates({ roomId = '', assets = defaultAssets, rooms = defaultRooms } = {}) {
  return assets.map(asset => {
    const reason = candidateReason(asset, roomId, rooms);
    return { ...asset, roomName: roomName(asset.location?.room, rooms), stageLabel: STAGE_LABELS[asset.stage] || '未知', selectable: !reason, reason };
  });
}

export function selectableClusterAssets({ roomId, assets = defaultAssets, rooms = defaultRooms } = {}) {
  return clusterWizardCandidates({ roomId, assets, rooms }).filter(asset => asset.selectable);
}

export function roleCounts(selected = [], roles = {}) {
  const counts = { controlPlane: 0, worker: 0 };
  selected.forEach(id => { if (roles[id] === 'control-plane') counts.controlPlane += 1; if (roles[id] === 'worker') counts.worker += 1; });
  return counts;
}

export function invalidateSelections({ selected = [], roles = {}, roomId, assets = defaultAssets, rooms = defaultRooms } = {}) {
  const allowed = new Set(selectableClusterAssets({ roomId, assets, rooms }).map(asset => asset.id));
  return selected.filter(id => allowed.has(id) && (roles[id] === 'control-plane' || roles[id] === 'worker'));
}

export function clusterWizardTemplates() {
  const values = forms['cluster-create']?.fields?.find(([name]) => name === '模板')?.[1];
  return Array.isArray(values) ? values : [];
}

export function validateClusterWizard(state = {}, fixtures = {}) {
  const assets = fixtures.assets ?? defaultAssets;
  const rooms = fixtures.rooms ?? defaultRooms;
  const selected = Array.isArray(state.selected) ? state.selected : [];
  const roles = state.roles ?? {};
  const errors = [];
  if (!state.roomId) errors.push('请选择机房');
  if (state.roomId && !rooms.some(room => room.id === state.roomId)) errors.push('机房不是已知候选');
  if (!String(state.name ?? '').trim()) errors.push('请输入集群名称');
  if (!state.template) errors.push('请选择集群模板');
  else if (!clusterWizardTemplates().includes(state.template)) errors.push('集群模板不是已知候选');
  const candidates = selectableClusterAssets({ roomId: state.roomId, assets, rooms });
  const allowed = new Set(candidates.map(asset => asset.id));
  const invalid = selected.filter(id => !allowed.has(id));
  if (invalid.length) errors.push(`存在不可选节点：${invalid.join('、')}`);
  const duplicates = selected.filter((id, index) => selected.indexOf(id) !== index);
  if (duplicates.length) errors.push(`节点不可重复选择：${[...new Set(duplicates)].join('、')}`);
  const uniqueSelected = [...new Set(selected)];
  const counts = roleCounts(uniqueSelected, roles);
  if (uniqueSelected.some(id => !['control-plane', 'worker'].includes(roles[id]))) errors.push('每个节点必须指定控制面或工作节点角色');
  if (counts.controlPlane < 1) errors.push('至少需要 1 个控制面节点');
  if (counts.worker < 1) errors.push('至少需要 1 个工作节点');
  if (uniqueSelected.length < 2) errors.push('节点总数不足：至少 1 控制面 + 1 工作节点');
  if (!state.network) errors.push('请选择网络配置（候选适配未实测）');
  if (!state.storage) errors.push('请选择存储配置（候选适配未实测）');
  if (!state.gpu) errors.push('请选择 GPU 配置');
  return { valid: errors.length === 0, errors, counts, candidates };
}

export function buildClusterLocalPlan(state = {}, fixtures = {}) {
  const result = validateClusterWizard(state, fixtures);
  if (!result.valid) return null;
  const selected = result.candidates.filter(asset => state.selected.includes(asset.id));
  return {
    kind: 'cluster-create-local-plan', name: String(state.name).trim(), roomId: state.roomId,
    room: roomName(state.roomId, fixtures.rooms ?? defaultRooms), template: state.template,
    nodes: selected.map(asset => ({ id: asset.id, role: state.roles[asset.id], room: asset.roomName })),
    network: state.network, storage: state.storage, gpu: state.gpu,
    checks: { local: '通过', environment: '待真实环境验证', human: '待人工确认' },
    executed: false, persisted: false
  };
}

