export const NOTE_KEY = 's1-platform-notes-1';
export function validateNotes(value) {
  if (!Array.isArray(value) || value.length > 500) throw new Error('批注文件须为最多 500 条的数组');
  const ids = new Set();
  return value.map(n => {
    if (!n || !['id', 'page', 'target', 'label', 'text'].every(k => typeof n[k] === 'string' && n[k].length > 0 && n[k].length <= 10000) || ids.has(n.id)) throw new Error('批注字段缺失或编号重复');
    ids.add(n.id);
    return {id:n.id,page:n.page,target:n.target,label:n.label,text:n.text,...(typeof n.tab==='string'?{tab:n.tab}:{}),...(n.context==='principle'?{context:n.context}: {})};
  });
}
