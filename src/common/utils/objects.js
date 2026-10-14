// 通用对象列表与详情的纯数据适配。列表来自 catalog.js 的列表定义，详情由同一行事实派生。
import { catalog, forms } from '../../catalog.js';
import { detailPages } from '../../router/navigation.js';

export function listSource(pageId) {
  const page = catalog[pageId];
  if (!page?.columns) return null;
  return { id: pageId, title: page.title, description: page.description, columns: page.columns, rows: page.rows, detail: page.detail, action: page.action ?? null };
}

// 状态列按列名推断：与旧原型 ExtendedPage 的筛选规则一致。
export function stateColumn(columns) {
  return columns.findIndex(column => /状态|健康|验证|连接|阶段|供应/.test(column));
}

export function filterRows(rows, search, state, stateIndex) {
  const keyword = search.trim().toLowerCase();
  return rows.filter(row => row.join(' ').toLowerCase().includes(keyword) && (state === '全部' || String(row[stateIndex]) === state));
}

export function planConfig(name) {
  return forms[name] ?? null;
}

// 详情的通用基线：字段逐列来自同一行，来源与证据边界显式标注。
// 未指定 id 时明确使用列表首行，指定但不存在时返回 null（不回退到其他对象）。
export function objectDetail(pageId, id) {
  const meta = detailPages[pageId];
  const list = meta && listSource(meta.parent);
  if (!list) return null;
  const objectId = id || String(list.rows[0]?.[0] ?? '');
  const row = list.rows.find(cells => String(cells[0]) === objectId);
  if (!row) return null;
  return {
    id: objectId,
    parent: meta.parent,
    title: meta.title,
    row,
    action: list.action,
    fields: list.columns.map((label, index) => [label, String(row[index])]),
    tabs: [{ key: 'facts', title: '来源与边界', rows: [['数据来源', '固定示例，非实时采集'], ['版本与证据', '真实版本、采集时间与验证证据待接入；示例状态不是生产能力承诺']] }]
  };
}
