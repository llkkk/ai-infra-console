// 平台治理模块的纯数据适配：列表来自 catalog；详情以列表行为事实来源，域字段与页签按对象逐行映射。
// 凭据只呈现引用、用途与授权范围，不包含任何秘密值。未知 id 返回 null，绝不回退到其他对象。
import { catalog } from '../../catalog.js';
import { platformServiceRows, regionRecords, roomRecords } from '../../model.js';
import { tabContent } from '../../detail-tabs.js';
import { listSource } from './objects.js';

export const settingsPages = ['settings', 'platform-services', 'credentials'];

// 详情页 id -> 所属列表页。
export const settingsDetailParents = {
  region: 'settings',
  'platform-service': 'platform-services',
  credential: 'credentials'
};

// 平台服务以“服务”作为对象标识：同一平台下多个服务共享平台名，服务名唯一。
const PLATFORM_COLUMNS = ['服务', '平台', '类型', '状态', '常用操作'];
const PLATFORM_ROWS = platformServiceRows.map(([platform, service, kind, state, operations]) => [service, platform, kind, state, operations]);

// 详情字段与列表列的逐行对应：字段名 -> 列序号。
const ROW_FIELDS = {
  region: { 区域标识: 0, 区域名称: 0, 状态: 5, 连接状态: 5 },
  'platform-service': { 服务: 0, 平台: 1, 类型: 2, 状态: 3, 常用操作: 4 },
  credential: { 引用: 0, 用途: 1, 托管系统: 2, 允许对象: 3, 轮换: 4 }
};

// 平台服务的常用操作只是对 Deployment / StatefulSet 的封装演示，点击仅提示说明，不执行真实操作。
export const PLATFORM_OPERATIONS = ['重启 Deployment', '扩缩容', '查看日志', '回滚'];

export function settingsList(pageId) {
  const source = listSource(pageId);
  if (pageId === 'platform-services' && source) return { ...source, columns: PLATFORM_COLUMNS, rows: PLATFORM_ROWS };
  return source;
}

function fieldRows(detailId, row, fields) {
  const mapped = ROW_FIELDS[detailId] || {};
  return fields.map(([label, value], index) => {
    if (label in mapped) return [label, String(row[mapped[label]])];
    if (index === 0) return [label, String(row[0])];
    // 命名空间只对 S2 模型工程的服务有示例值，其他平台明确标未采集。
    if (detailId === 'platform-service' && label === 'Namespace') {
      return [label, row[1] === 'S2 模型工程' ? 's2-system（示例）' : '未采集（示例未提供）'];
    }
    return [label, value];
  });
}

function tabRows(detailId, row, title, fields) {
  if (detailId === 'platform-service' && title === '常用操作') {
    return String(row[4]).split(' / ').map(op => [op, '演示封装，不执行真实 k8s 操作', '非 Rancher 专业操作']);
  }
  // 机房与执行层页签（评审稿 3.8.2）：机房 → 故障域 → 执行层心跳 / 版本 / 状态。
  if (detailId === 'region' && title === '机房与执行层') {
    const region = regionRecords.find(item => item.name === row[0]);
    const rooms = region ? roomRecords.filter(room => region.rooms.includes(room.id)) : [];
    if (!rooms.length) return [['机房', '未配置', '区域未接入']];
    return rooms.map(room => [
      room.name, room.faultDomain,
      `${room.exec.id} · ${room.exec.state}`, `心跳 ${room.exec.heartbeat} · 版本 ${room.exec.version}`,
      room.management ? '管理层所在机房（管理层全局唯一）' : '仅执行层'
    ]);
  }
  if (detailId === 'region' && title === '连接事件') {
    return [['last-observed', String(row[6]), '保留观测时间'], ['disconnect-policy', '标记未知', '不推断资源释放']];
  }
  // 目录未给出专门内容的页签回退为对象字段，与旧原型的 KV 呈现一致。
  return tabContent(detailId, title, row) || fields.map(([label, value]) => [label, value, '对象字段（示例）']);
}

// 返回与列表行一一对应的详情；id 缺省时使用示例首行（由页面给出示例提示），未知 id 返回 null。
export function settingsDetail(detailId, id) {
  const parent = settingsDetailParents[detailId];
  const list = parent ? settingsList(parent) : null;
  if (!list) return null;
  const objectId = id || String(list.rows[0]?.[0] ?? '');
  const row = list.rows.find(cells => String(cells[0]) === objectId);
  if (!row) return null;
  const page = catalog[detailId];
  const fields = fieldRows(detailId, row, page.fields);
  return {
    id: objectId,
    parent,
    title: page.title,
    description: page.description,
    row,
    action: page.action ?? null,
    fields,
    tabs: page.tabs.map(title => ({ key: title, title, rows: tabRows(detailId, row, title, fields) }))
  };
}
