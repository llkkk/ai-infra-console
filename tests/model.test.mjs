import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 assetRecords,capabilityRecords,taskRecords,allocationRecords,requestRecords,requestMatch,
 deliveryRecords,deliveryLife,workloadRecords,gpuRecords,nodeRecords,alertRows,quotaRecords,
 POOL_CAPACITY,capacityCheck,LINK_TYPES,resolveLink,compute03Story,selectAlerts
} from '../src/model.js';
import {INCIDENTS,closeGate,archiveGate} from '../src/incident-data.js';

test('R03: compute-03 当前状态在资产、任务、能力、故障视图间一致',()=>{
 const asset=assetRecords.find(a=>a.id==='compute-03');
 const task=taskRecords.find(t=>t.id==='TASK-DEMO-02');
 const cap=capabilityRecords.find(c=>c.id==='compute-03');
 const inc=INCIDENTS['INC-DEMO-02'];
 assert.equal(asset.stage,'hw_passed','资产当前阶段应为检查通过');
 assert.ok(!assetRecords.some(a=>a.stage==='hw_failed'),'不应有资产停留在硬件检查失败的当前阶段');
 assert.ok(task.state.startsWith('成功'),'TASK-DEMO-02 当前状态应为重检成功');
 assert.ok(task.phases.some(p=>p.state==='失败'),'失败历史必须保留在阶段记录中');
 assert.ok(cap.baseline.includes('重检'),'能力视图应体现重检');
 assert.ok(cap.deliverable.startsWith('否'),'硬件通过但未装机/入群，不可交付');
 assert.equal(inc.phase,'已关闭');
 assert.equal(compute03Story.acceptance[0][1],'通过（重检）');
 assert.ok(compute03Story.acceptance.slice(1).every(([,state])=>state==='未开始'),'OS/集群/运行能力验收应未开始');
});

test('容量口径：物理 = 已分配 + 预留 + 可分配，且与分配记录一致',()=>{
 const {allocated,reserved,available}=capacityCheck();
 assert.equal(allocated,POOL_CAPACITY.allocated,'已分配应等于已交付分配之和');
 assert.equal(reserved,POOL_CAPACITY.reserved,'预留应等于预留分配之和');
 assert.equal(available,POOL_CAPACITY.available);
 assert.equal(POOL_CAPACITY.physical,allocated+reserved+available);
});

test('容量不足：REQ-DEMO-03 匹配失败原因与容量口径一致',()=>{
 const m=requestMatch['REQ-DEMO-03'];
 assert.equal(m.capacity.verdict,'失败');
 const {available}=capacityCheck();
 assert.ok(m.capacity.detail.includes(String(available)),'阻塞原因应包含可分配数量');
 assert.equal(m.quota.verdict,'未配置');
 assert.equal(requestRecords.find(r=>r.id==='REQ-DEMO-03').qty,8);
});

test('GPU 故障链：告警、故障单、GPU、分配、环境、工作负载互相印证',()=>{
 const inc=INCIDENTS['INC-DEMO-01'];
 const alert=alertRows.find(r=>r[0]==='ALERT-DEMO-01');
 assert.equal(alert[9],'INC-DEMO-01','告警应关联故障单');
 assert.equal(inc.trigger,'ALERT-DEMO-01');
 const gpu=gpuRecords.find(g=>g.id==='GPU-DEMO-002');
 assert.ok(gpu.health.includes('异常'));
 const alloc=allocationRecords.find(a=>a.id==='ALLOC-DEMO-02');
 const wl=workloadRecords.find(w=>w.id==='batch-demo');
 assert.equal(wl.env,'ENV-DEMO-02');
 assert.ok(inc.impact.includes(alloc.id));
});

test('R05: 关闭门禁按影响范围计算',()=>{
 const affected=closeGate(INCIDENTS['INC-DEMO-01']);
 assert.ok(affected.joint,'涉及已交付环境需双方确认');
 const none=closeGate(INCIDENTS['INC-DEMO-02']);
 assert.ok(!none.joint,'无 S2 影响应由 S1 复验关闭');
 const unknown=closeGate({s2Impact:'unknown'});
 assert.ok(unknown.blocked,'影响未知不得直接关闭');
});

test('释放回收：ENV-DEMO-02 释放门禁引用未停止的工作负载',()=>{
 const gate=deliveryLife['ENV-DEMO-02'].release;
 assert.ok(gate.gate.includes('batch-demo'),'释放门禁应指向未停止的工作负载');
 assert.ok(gate.checks.some(([k,v])=>k==='S2 工作负载停止'&&v.includes('未满足')));
 const done=deliveryLife['ENV-DEMO-03'].release;
 assert.ok(done.gate.includes('已释放'));
 assert.ok(done.checks.every(([,v])=>!v.includes('未开始')),'已释放环境的释放检查项不应停留在未开始');
 const wl=workloadRecords.find(w=>w.id==='eval-demo');
 assert.ok(wl.model.includes('已释放'));
});

test('未知状态：cpu-worker-01 不参与调度且可被解析',()=>{
 const n=nodeRecords.find(x=>x.id==='cpu-worker-01');
 assert.equal(n.state,'Unknown');
 assert.ok(n.sched.includes('不允许'));
 assert.ok(resolveLink('node','cpu-worker-01'),'节点应可按 ID 定位');
});

test('R02: 类型化关联按 ID 精确定位；缺失返回 null 不回退',()=>{
 assert.equal(resolveLink('gpu','GPU-DEMO-002').page,'gpu');
 // 申请 / 分配 / 环境 / 工作负载统一以交付单详情定位。
 assert.equal(resolveLink('allocation','ALLOC-DEMO-02').page,'delivery-order');
 assert.equal(resolveLink('allocation','ALLOC-DEMO-02').row[0],'DELIV-DEMO-02');
 assert.equal(resolveLink('environment','ENV-DEMO-02').page,'delivery-order');
 assert.equal(resolveLink('request','REQ-DEMO-01').row[0],'DELIV-DEMO-05');
 assert.equal(resolveLink('workload','infer-demo').row[0],'DELIV-DEMO-01');
 assert.equal(resolveLink('bmc','reserve-01').page,'asset','BMC 并入资产详情');
 assert.equal(resolveLink('asset','compute-03').row[0],'compute-03');
 assert.equal(resolveLink('gpu','GPU-NOT-EXIST'),null);
 assert.equal(resolveLink('unknown-type','x'),null);
 for(const key of Object.keys(LINK_TYPES)){
  const t=LINK_TYPES[key];
  if(t.rows)assert.ok(t.rows().length>0,key+' 行数据不应为空');
 }
});

test('配额与预留：配额剩余是口径而非可分配容量',()=>{
 const model=quotaRecords.find(q=>q.id==='S2 / 模型工程');
 assert.equal(model.whole-model.used,2,'配额剩余 2');
 assert.equal(POOL_CAPACITY.available,6,'可分配容量 6 ≠ 配额剩余');
 const joint=quotaRecords.find(q=>q.id==='S2 / 联调环境');
 assert.equal(joint.used+joint.reserved,joint.whole,'联调配额用满：预留 + 分配 = 上限');
});

test('已确认或已静默的触发信号仍在活跃告警，恢复信号只进入历史',()=>{
 const active=selectAlerts('活跃告警'),history=selectAlerts('告警历史');
 assert.ok(active.some(a=>a.id==='ALERT-DEMO-01'),'人工确认不能移出活跃告警');
 assert.ok(active.some(a=>a.id==='ALERT-DEMO-02'),'静默通知不能移出活跃告警');
 assert.ok(!history.some(a=>a.id==='ALERT-DEMO-02'),'无数据信号不能当作恢复历史');
 assert.ok(history.some(a=>a.id==='ALERT-DEMO-04'),'已恢复告警需要可查询的历史');
 assert.ok(!active.some(a=>a.id==='ALERT-DEMO-04'),'恢复信号不再作为活跃异常');
});

test('故障关闭、复盘完成和归档是独立门禁',()=>{
 const inc=structuredClone(INCIDENTS['INC-DEMO-03']);
 assert.equal(archiveGate(inc).allowed,true);
 inc.phase='等待人工处理';
 assert.equal(archiveGate(inc).allowed,false,'未关闭不得归档');
 inc.phase='已关闭';inc.review.status='待复盘';
 assert.equal(archiveGate(inc).allowed,false,'已关闭不能直接归档');
 inc.review.status='复盘中';
 assert.equal(archiveGate(inc).allowed,false,'复盘中不能当作已完成');
 inc.review.status='已归档';
 assert.equal(archiveGate(inc).allowed,false,'已归档记录不能重复归档');
});

test('归档要求明确证据和改进责任，不把未知根因伪装为已确认',()=>{
 const inc=structuredClone(INCIDENTS['INC-DEMO-03']);
 inc.review.actions[0].status='待完成';
 assert.equal(archiveGate(inc).allowed,true,'改进项可在归档后继续跟踪');
 inc.review.rootCause={state:'未确认',detail:'缺少固件证据，交由硬件组继续定位'};
 assert.equal(archiveGate(inc).allowed,true,'明确未知及后续定位说明可以保留');
 inc.review.rootCause.detail='';
 assert.equal(archiveGate(inc).allowed,false,'不得无说明地归档未知根因');
 inc.review.rootCause.detail='待硬件组补充固件证据';
 inc.review.actions[0].owner='';
 assert.equal(archiveGate(inc).allowed,false,'改进项不能缺少负责人');
 inc.review.actions[0].owner='S1 硬件组';inc.review.actions[0].due='';
 assert.equal(archiveGate(inc).allowed,false,'改进项不能缺少截止时间');
});
