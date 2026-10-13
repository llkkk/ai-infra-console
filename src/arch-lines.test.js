import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ARCH_LINES} from './arch-lines.js';

test('流程线只挂在三个关键模块',()=>{
 assert.deepEqual(Object.keys(ARCH_LINES).sort(),['assets','clusters','pools']);
 for(const line of Object.values(ARCH_LINES)){
  assert.ok(['provision','cluster','usage'].includes(line.id));
  assert.ok(/^#[0-9a-f]{6}$/.test(line.color),line.id+' 需要流程线颜色');
 }
});

test('三条流程线数据自洽：边端点存在、在线节点有说明、步骤与判据完整',()=>{
 for(const [group,line] of Object.entries(ARCH_LINES)){
  const ids=new Set(line.layers.flatMap(l=>l.nodes.map(n=>n.id)));
  assert.equal(ids.size,line.layers.flatMap(l=>l.nodes).length,group+' 节点 ID 重复');
  for(const [a,b] of line.edges){
   assert.ok(ids.has(a),group+' 边起点缺失：'+a);
   assert.ok(ids.has(b),group+' 边终点缺失：'+b);
  }
  const onLine=new Set(line.edges.flat());
  for(const n of line.layers.flatMap(l=>l.nodes)){
   assert.ok(line.info[n.id],group+' 节点缺职责说明：'+n.id);
   if(n.on)assert.ok(onLine.has(n.id)||['hami','volcano'].includes(n.id),group+' 在线节点不在任何边上：'+n.id);
  }
  assert.ok(line.steps.length>=3,group+' 步骤过少');
  assert.ok(line.owner&&line.decision&&line.hint&&line.title,group+' 判据字段缺失');
 }
});
