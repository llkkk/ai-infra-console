// 基础服务模块的纯数据适配：列表来自 catalog；详情以列表行为事实来源，域字段与页签按对象逐行映射。
// 未知 id 返回 null，绝不回退到其他对象。服务目录页已删除：其余公共服务登记不设独立页面。
// 评审稿 3.9：镜像 / 数据库做真实维护功能（制品、被引用、参数白名单、Web SQL 控制台），存储只读骨架。
import { catalog } from '../../catalog.js';
import { dbConnections, dbParameters, registryImages } from '../../model.js';
import { tabContent } from '../../detail-tabs.js';
import { listSource } from './objects.js';

export const servicePages = ['registry', 'storage', 'database'];

// 详情页 id -> 所属列表页。
export const serviceDetailParents = {
  'registry-detail': 'registry',
  'storage-detail': 'storage',
  'database-detail': 'database'
};

// 详情字段与列表列的逐行对应：字段名 -> 列序号；未列出的字段保留目录中的通用说明。
const ROW_FIELDS = {
  'registry-detail': { '仓库 / 项目': 0, 用途: 1, 同步: 3, 制品保留: 4 },
  'storage-detail': { 实例: 0, 类型: 1, '容量 / 用量': 2, 保留策略: 3, 恢复演练: 4 },
  'database-detail': { 集群: 0, 用途: 1, 版本: 2, 架构: 3, 节点: 4, '备份 / 恢复': 5 }
};

const PG_CLUSTER_ID = 'pg-cluster-demo';

export function serviceList(pageId) {
  return listSource(pageId);
}

function fieldRows(detailId, row, fields) {
  const mapped = ROW_FIELDS[detailId] || {};
  return fields.map(([label, value], index) => {
    if (label in mapped) return [label, String(row[mapped[label]])];
    if (index === 0) return [label, String(row[0])];
    // 数据库连接地址与凭据引用只属于 pg 示例集群，其他集群明确标未知。
    if (detailId === 'database-detail' && (label === '连接地址' || label === '凭据') && row[0] !== PG_CLUSTER_ID) {
      return [label, '未知（示例未提供）'];
    }
    return [label, value];
  });
}

// 实例所属机房（示例数据固定：数据库与镜像在机房 A 管理层附近执行层部署）。
const INSTANCE_ROOMS = { 'registry-detail': '机房 A（示例）', 'storage-detail': '机房 A（示例）', 'database-detail': '机房 A（示例，管理层自带实例标注见概览）' };

// ---------- 专属功能页签（按服务实例组装；只展示事实与约束，不执行操作） ----------
function registryImageTab(row) {
  const images = registryImages.filter(image => image.project === row[0]);
  if (!images.length) return [['镜像制品', '无（示例未登记）', '公共项目制品待登记']];
  return images.map(image => [image.tag, image.digest, image.size, image.pushed, image.refs]);
}

function registryRefTab(row) {
  const images = registryImages.filter(image => image.project === row[0]);
  const referenced = images.filter(image => !image.refs.startsWith('无引用'));
  return [
    ...referenced.map(image => [image.tag, image.refs, '被引用的镜像删除前拦截（3.9）']),
    ...images.filter(image => image.refs.startsWith('无引用')).map(image => [image.tag, '无引用', '可删除；删除前仍核对保留策略']),
    ['删除拦截', referenced.length ? `${referenced.length} 个制品被模板引用，不可删除` : '当前无被引用制品', '清理走独立授权与保留策略核对']
  ];
}

function storageCapacityTab(row) {
  if (String(row[1]).includes('对象')) {
    return [
      ['s2-model / model-storage', '按交付环境前缀保留', '释放后处置见交付单释放门禁'],
      ['s2-test / model-storage', '同上前缀策略（示例）', '—'],
      ['容量 / 用量', '未接入实时采集', '只读骨架（D4）；不提供写操作'],
      ['与集群容量', '分开计量', 'PVC / 对象前缀与节点容量口径不同']
    ];
  }
  return [
    ['PVC volume-demo', 'ReadWriteOnce · 关联交付环境', '释放后保留期待定'],
    ['StorageClass', '待确认', '与 CSI 选型联动'],
    ['容量 / 用量', '与集群容量分开计量', '只读骨架（D4）']
  ];
}

function dbParamTab(row) {
  if (row[0] !== PG_CLUSTER_ID) return [['参数', '未接入', '候选集群参数与连接统计待接入']];
  return [
    ...dbParameters.map(param => [param[0], param[1], param[2], param[3]]),
    ['调整约定', '一期只开放白名单参数', '二次确认 + 变更记录与旧值（D12）；核心参数不开放页面调整']
  ];
}

function dbWebSqlTab(row) {
  if (row[0] !== PG_CLUSTER_ID) return [['Web SQL', '未接入', '候选集群控制台待接入']];
  return [
    ['控制台入口', '本页（数据库集群详情）', '授权随数据库服务凭据引用，不在运维接入登记'],
    ['默认账号', '只读账号（D12）', '写操作二次确认并单独授权'],
    ['语句审计', '会话与语句全部进审计记录', '可在「运维与审计 · 审计记录」查询'],
    ['结果限制', '限 500 行 / 查询超时 10 秒（示例）', '不加载大结果集'],
    ['查询示例', 'SELECT * FROM platform_tasks LIMIT 10;', '演示输入，不连接真实数据库']
  ];
}

function dbBackupTab(row) {
  if (row[0] !== PG_CLUSTER_ID) return [['备份', '策略待确认', '—']];
  return [
    ['backup-plan-demo', '每日全备（示例计划）', '最近一次：10-14 02:00（示例）'],
    ['恢复演练', '未执行', '不能以备份任务成功代替恢复验证'],
    ['恢复入口', '走变更窗口与独立授权', '管理层自带数据库恢复纳入高危门禁']
  ];
}

// 概览页签在各服务下的补充内容键（沿用 detail-tabs 静态表）。
const OVERVIEW_KEYS = { 'registry-detail': '项目配置', 'storage-detail': '容量与健康', 'database-detail': '节点与连接' };

function tabRows(detailId, row, title, fields) {
  if (detailId === 'registry-detail' && title === '镜像与制品') return registryImageTab(row);
  if (detailId === 'registry-detail' && title === '被引用关系') return registryRefTab(row);
  if (detailId === 'storage-detail' && title === '容量明细') return storageCapacityTab(row);
  if (detailId === 'database-detail' && title === '参数与调整') {
    const connection = dbConnections.find(item => item[0] === row[0]);
    return [...(connection ? [[`连接统计 · ${connection[1]}`, connection[2], connection[3]]] : []), ...dbParamTab(row)];
  }
  if (detailId === 'database-detail' && title === 'Web SQL 控制台') return dbWebSqlTab(row);
  if (detailId === 'database-detail' && title === '备份与恢复') return dbBackupTab(row);
  if (title === '概览') {
    const room = INSTANCE_ROOMS[detailId];
    const base = tabContent(detailId, OVERVIEW_KEYS[detailId], row) ?? [];
    return [...(room ? [['部署机房', room, '实例列表按机房组织（3.9）']] : []), ...base];
  }
  if (title === '操作记录') {
    return [['EVENT-DEMO-01', '供应配置提交（示例）', '操作事件见运维与审计 · 审计记录'], ['服务事件', '本页不复制审计主数据', '引用审计记录，不重复维护']];
  }
  // 目录未给出专门内容的页签回退为对象字段，与旧原型的 KV 呈现一致。
  return tabContent(detailId, title, row) || fields.map(([label, value]) => [label, value, '对象字段（示例）']);
}

// 返回与列表行一一对应的详情；id 缺省时使用示例首行（由页面给出示例提示），未知 id 返回 null。
export function serviceDetail(detailId, id) {
  const parent = serviceDetailParents[detailId];
  const list = parent ? serviceList(parent) : null;
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
