import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from './catalog.js';
import {SCENARIOS,REQUIRED_SCENARIO_IDS} from './scenarios.js';
import {resolveLink} from './model.js';

const SPECIAL_PAGES=['assets']; // 由 main.jsx 特殊渲染、不在 catalog 中的页面

test('场景覆盖六个必验收场景',()=>{
 assert.deepEqual([...new Set(SCENARIOS.map(s=>s.id))].sort(),[...REQUIRED_SCENARIO_IDS].sort());
});

test('每个场景步骤都能定位到真实页面',()=>{
 for(const sc of SCENARIOS){
  assert.ok(sc.steps.length>=2,sc.id+' 至少两步');
  for(const [i,step] of sc.steps.entries()){
   if(step.link.type){
    const res=resolveLink(step.link.type,step.link.id);
    assert.ok(res,sc.id+' 第 '+(i+1)+' 步无法定位：'+step.link.type+' '+step.link.id);
   }else{
    assert.ok(catalog[step.link.page]||SPECIAL_PAGES.includes(step.link.page),sc.id+' 第 '+(i+1)+' 步页面不存在：'+step.link.page);
   }
  }
 }
});

test('正常交付场景覆盖资产到工作负载的完整链路',()=>{
 const s=SCENARIOS.find(x=>x.id==='provision');
 const types=s.steps.map(st=>st.link.type||st.link.page);
 for(const t of ['asset','bmc','provision','cluster','node','allocation','environment','workload'])assert.ok(types.includes(t),'正常交付缺少 '+t);
});
