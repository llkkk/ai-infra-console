import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,groups,forms,strategyFor} from './catalog.js';
import {INCIDENTS,closeGate} from './incident-data.js';
import {LINK_TYPES,resolveLink} from './model.js';
test('all navigation entries have pages and technical strategies',()=>{for(const [, ,children] of groups)for(const [id] of children){assert.ok(catalog[id]||id==='assets');assert.equal(strategyFor(id).chain.length,4);assert.ok(strategyFor(id).owner);}});
test('all list/detail/form destinations exist',()=>{for(const p of Object.values(catalog)){if(p.detail)assert.ok(catalog[p.detail]||['cluster','pool'].includes(p.detail));if(p.action)assert.ok(forms[p.action]);if(p.columns)for(const row of p.rows)assert.equal(row.length,p.columns.length);}});
test('plan fields have unique labels and no empty choices',()=>{for(const p of Object.values(forms)){assert.equal(new Set(p.fields.map(x=>x[0])).size,p.fields.length);for(const [,value] of p.fields)assert.ok(Array.isArray(value)?value.length:typeof value==='string');}});
test('incident records reference existing catalog pages and alerts',()=>{
 assert.equal(catalog.incidents.rows.length,Object.keys(INCIDENTS).length);
 for(const [id,inc] of Object.entries(INCIDENTS)){
  assert.equal(inc.id,id);
  assert.ok(inc.timeline.length>=3,id+' 时间线至少 3 条');
  assert.ok(inc.acceptance.length>=1,id+' 必须有恢复复验项');
  assert.ok(inc.s1&&inc.s2&&inc.s2Impact,id+' 必须区分 S1/S2 责任并标注影响范围');
  const gate=closeGate(inc);
  assert.ok(gate.text,id+' 必须有关闭门禁');
  assert.equal(gate.joint,inc.s2Impact!=='none',id+' 关闭门禁应与影响范围一致');
  for(const [,,type] of inc.objects)assert.ok(LINK_TYPES[type],id+' 关联对象类型 '+type);
  for(const [,,link] of inc.evidence)assert.ok(link&&(LINK_TYPES[link.type]||catalog[link.page]),id+' 证据入口 '+JSON.stringify(link));
  for(const [,objId,type] of inc.objects)assert.ok(resolveLink(type,objId),id+' 关联对象可定位：'+type+' '+objId);
 }
 const ids=new Set(Object.keys(INCIDENTS));
 for(const row of catalog.alerts.rows){const ref=row.at(-1);assert.ok(ref==='—'||ids.has(ref),'告警故障单引用 '+ref);}
});
