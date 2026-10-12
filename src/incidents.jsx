import React from 'react';
import {ChevronRight} from 'lucide-react';
import {catalog} from './catalog.js';
import {INCIDENTS,closeGate} from './incident-data.js';
import {resolveLink} from './model.js';

// 关联点击：类型化对象按 ID 精确定位详情；列表级入口直接跳转；找不到提示缺失，不回退。
function makeNavigate({go,openAsset,notify}){
 return link=>{
  if(link.type){
   const res=resolveLink(link.type,link.id);
   if(!res){notify('关联对象未找到：'+link.id+'（示例数据缺失，不回退）');return;}
   if(res.page==='asset'){openAsset(res.row);return;}
   go(res.page,res.row);
   return;
  }
  go(link.page);
 };
}

export function IncidentWorkbench({incidentId,go,open,Mark,table,openAsset,notify}){
 const inc=INCIDENTS[incidentId]||INCIDENTS['INC-DEMO-01'];
 const gate=closeGate(inc);
 const navigate=makeNavigate({go,openAsset,notify});
 const alertRow=inc.trigger.startsWith('ALERT')?catalog.alerts.rows.find(r=>r[0]===inc.trigger):null;
 const taskRow=inc.trigger.startsWith('TASK')?catalog.provisioning.rows.find(r=>r[0]===inc.trigger):null;
 return <>
  <Mark id="inc-summary" label="故障单概要" className="stats">
   {[['当前阶段',inc.phase,inc.phase==='已关闭'?'复验通过后关闭':'下一步动作见时间线与待办'],
     ['责任归属',inc.owner,'底座故障与模型影响分开记录'],
     ['触发来源',inc.trigger,alertRow?'严重告警自动建单':taskRow?'任务失败自动建单':'人工建单'],
     ['开始 / 最近更新',inc.started+' / '+inc.updated,inc.impact]].map(([k,v,d])=>
    <div key={k}><small>{k}</small><strong className="smaller">{v}</strong><span>{d}</span></div>)}
  </Mark>
  <div className="detail-grid">
   <Mark id="inc-timeline" label="处理时间线" className="panel">
    <h2>处理时间线</h2>
    <div className="itl">
     {inc.timeline.map(([time,phase,src,actor,text])=>
      <div key={time+phase}>
       <span className={'itl-dot '+(src==='auto'?'auto':'manual')}>{src==='auto'?'自动':'人工'}</span>
       <div className="itl-body">
        <div className="itl-head"><b>{phase}</b><span className={'itl-src '+src}>{src==='auto'?'事件驱动':'人工操作'}</span><span className="itl-time">{time} · {actor}</span></div>
        <p>{text}</p>
       </div>
      </div>)}
    </div>
    {inc.pending.length>0&&<><h3>待办与下一步</h3><div className="accept-list">{inc.pending.map(([text,status])=><div className="accept-row" key={text}><span>{text}</span><span className="badge amber">{status}</span></div>)}</div></>}
    <div className="panel-actions">
     <button onClick={()=>open('incident-action')}>记录处理动作</button>
     {alertRow&&<button onClick={()=>go('alert',alertRow)}>查看告警 {inc.trigger}</button>}
     {taskRow&&<button onClick={()=>go('provisioning-detail',taskRow)}>查看任务 {inc.trigger}</button>}
    </div>
   </Mark>
   <Mark id="inc-owner" label="责任归属与边界" className="panel">
    <h2>责任归属与边界</h2>
    <div className="owner-grid">
     <div className="owner-row"><b>S1 底座责任</b><p>{inc.s1}</p></div>
     <div className="owner-row"><b>S2 影响确认</b><p>{inc.s2}</p></div>
     <div className="owner-row"><b>关闭门禁</b><p>{gate.text}</p></div>
    </div>
    <p className="callout">关闭门禁按影响范围确定：无 S2 影响由 S1 复验关闭；涉及已交付环境需双方确认；影响未知时不得按无影响关闭。告警静默或消失不等于恢复；未知状态不得自动重试或清理。</p>
   </Mark>
   <Mark id="inc-acceptance" label="恢复复验清单" className="panel">
    <h2>恢复复验清单</h2>
    <div className="accept-list">{inc.acceptance.map(([item,status])=><div className="accept-row" key={item}><span>{item}</span><span className={'badge '+(status==='通过'?'green':'amber')}>{status}</span></div>)}</div>
    <p className="muted">复验证据引用检查任务与指标恢复记录；复验未通过的故障单保持打开，不影响其他故障并行处理。</p>
   </Mark>
   <Mark id="inc-objects" label="关联对象与证据" className="panel">
    <h2>关联对象</h2>
    <div className="related-links">{inc.objects.map(([kind,name,type])=>
     <button key={kind+name} onClick={()=>navigate({type,id:name})}>{kind}：{name}<ChevronRight size={13}/></button>)}</div>
    <h3>证据引用</h3>
    {table(['证据','引用 / 说明','入口'],inc.evidence.map(([k,desc,link])=>[k,desc,<button className="text-link" key={k} onClick={()=>navigate(link)}>查看</button>]))}
    <p className="muted">关联对象按稳定 ID 定位到详情或带上下文的页面；定位失败时提示缺失，不回退到第一条记录。</p>
   </Mark>
  </div>
  <p className="callout">故障单与处理记录为虚构示例；真实系统需要事件驱动建单、权限校验、破坏性操作二次确认与审计留痕。</p>
 </>;
}
