import React from 'react';
import {catalog} from './catalog.js';
import {taskRecords,assetRecords,compute03Story,resolveLink} from './model.js';

// 装机供应工作台：阶段化展示执行源、日志、人工确认点、失败历史与恢复，
// 并把 OS 供应与集群 / GPU 能力验收分开呈现（硬件通过 ≠ 运行能力就绪）。
export function ProvisionWorkbench({taskId,go,open,Mark,table,openAsset,notify}){
 const task=taskRecords.find(t=>t.id===taskId)||taskRecords[0];
 const asset=assetRecords.find(a=>a.id===task.target);
 const hasFailure=task.phases.some(p=>p.state==='失败');
 const failedPhase=task.phases.find(p=>p.state==='失败');
 const openIncident=task.incident?(()=>{
  const res=resolveLink('incident',task.incident);
  if(res)go(res.page,res.row);else notify('关联故障单未找到：'+task.incident);
 }):null;
 const openTemplate=()=>{
  const res=resolveLink('image',task.template);
  if(res)go(res.page,res.row);else notify('模板未找到：'+task.template);
 };
 const openTarget=()=>{if(asset)openAsset(assetRowsFor(asset));else notify('目标资产未找到：'+task.target);};
 return <>
  <Mark id="prov-summary" label="供应任务概要" className="stats">
   {[['任务状态',task.state,task.type+' · '+task.source],
     ['目标资产',task.target,asset?('当前供应状态：'+asset.state):'资产未找到'],
     ['模板 / 镜像',task.template,'版本与修订见模板详情'],
     ['当前阶段',task.stage,task.created+' 创建 · 执行源为候选方案']].map(([k,v,d])=>
    <div key={k}><small>{k}</small><strong className="smaller">{v}</strong><span>{d}</span></div>)}
  </Mark>
  <div className="detail-grid">
   <Mark id="prov-phases" label="执行阶段与日志" className="panel">
    <h2>执行阶段与日志</h2>
    <div className="itl">
     {task.phases.map(p=>{
      const dot=p.state==='成功'?'auto':p.state==='失败'?'fail':'manual';
      return <div key={p.name}>
       <span className={'itl-dot '+dot}>{p.state==='成功'?'完成':p.state==='执行中'?'执行':p.state==='失败'?'失败':'待执行'}</span>
       <div className="itl-body">
        <div className="itl-head"><b>{p.name}</b><span className={'itl-src '+(p.state==='成功'?'auto':p.state==='失败'?'fail':'')}>{p.state}</span>{p.at&&<span className="itl-time">{p.at}</span>}</div>
        {p.log&&<p>{p.log}</p>}
       </div>
      </div>;})}
    </div>
    <p className="muted">阶段状态来自执行器回传；前端不推断完成。取消或重试必须确认执行器能力，未知状态不自动重装。</p>
   </Mark>
   <Mark id="prov-recovery" label="失败恢复与人工确认" className="panel">
    <h2>{hasFailure?'失败与恢复记录':'人工确认点'}</h2>
    {hasFailure
     ?<div className="accept-list">
       <div className="accept-row"><span>失败阶段：{failedPhase.name}（{failedPhase.at}）</span><span className="badge red">已保留原因</span></div>
       <div className="accept-row"><span>处理：修正 {task.template} 目标盘策略（模板修订留痕）</span><span className="badge green">已留痕</span></div>
       <div className="accept-row"><span>恢复：按重试预检仅重跑失败阶段；未重装、未清理</span><span className="badge green">重检通过</span></div>
       {task.incident&&<div className="accept-row"><span>处理过程：故障单 {task.incident}（已关闭）</span><button className="text-link" onClick={openIncident}>查看故障单</button></div>}
      </div>
     :<div className="accept-list">{task.confirmPoints.map(c=><div className="accept-row" key={c}><span>{c}</span><span className="badge amber">待人工确认</span></div>)}</div>}
    <p className="callout">重试不自动等于成功：仅失败阶段可重试（需执行器支持），重试前重新核对授权与目标状态。</p>
    <div className="panel-actions">
     {hasFailure&&<button onClick={()=>open('task-retry')}>任务重试预检</button>}
     <button onClick={openTarget}>查看资产 {task.target}</button>
     <button onClick={openTemplate}>查看模板</button>
     {!hasFailure&&task.incident&&<button onClick={openIncident}>查看故障单</button>}
    </div>
   </Mark>
   <Mark id="prov-acceptance" label="验收分层" className="panel wide">
    <h2>验收分层（OS 与集群 / GPU 验收分开）</h2>
    {table(['验收层','当前状态','来源 / 说明'],task.acceptance.map(([layer,state,src])=>[layer,<span key={layer} className={'badge '+(state.startsWith('通过')?'green':state==='未开始'?'amber':'')}>{state}</span>,src]))}
    <p className="muted">硬件检查通过不代表 OS、集群能力或 GPU 运行能力验收通过；各层分别记录证据与阻塞项。</p>
   </Mark>
  </div>
  <p className="callout">本页为虚构示例工作台；真实供应由 Ironic / Metal3 链路执行，平台负责任务编排与状态聚合。</p>
 </>;
}

function assetRowsFor(a){
 return [a.id,a.sn,a.type,a.gpu,a.mem,a.state,a.bmc,a.cluster];
}
