import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAIN} from './chain.js';
import {groups,groupFor} from './catalog.js';

const groupLabelOf=id=>groups.find(g=>g[0]===groupFor(id))?.[1];

test('链路节点页面全部可从导航到达',()=>{
 for(const line of [CHAIN.supply,CHAIN.delivery,CHAIN.cross])
  for(const [title,page] of line.nodes)
   assert.ok(groupLabelOf(page),`链路页面不存在于导航分组：${title}(${page})`);
});

test('供应线与交付线节点的模块标注与导航分组一致',()=>{
 for(const line of [CHAIN.supply,CHAIN.delivery])
  for(const [title,page,module] of line.nodes)
   assert.equal(groupLabelOf(page),module,`${title}(${page}) 模块标注与分组不符`);
});

test('链路页面不重复且两条主线节点可直接跳列表页',()=>{
 const pages=[CHAIN.supply,CHAIN.delivery,CHAIN.cross].flatMap(l=>l.nodes.map(([,p])=>p));
 assert.equal(new Set(pages).size,pages.length);
 for(const p of pages)
  assert.ok(!p.endsWith('-detail'),`链路应链接列表页而非详情页：${p}`);
});
