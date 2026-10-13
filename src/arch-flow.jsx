import React,{useEffect,useRef,useState} from 'react';

// 技术方案弹窗内的分层流程图：节点按层排列，流程边以动画虚线绘制（移植自 s1-arch-diagram.html）。
// 挂载后测量两次节点位置（弹窗动画与字体加载后校正）；窗口缩放时重算。
export function ArchFlow({line,Mark}){
 const wrapRef=useRef(null),[geo,setGeo]=useState(null),[sel,setSel]=useState(null);
 useEffect(()=>{
  const measure=()=>{const wrap=wrapRef.current;if(!wrap)return;
   const box=wrap.getBoundingClientRect();const pts={};
   wrap.querySelectorAll('[data-node]').forEach(el=>{const r=el.getBoundingClientRect();pts[el.dataset.node]={x:r.left-box.left+r.width/2,y:r.top-box.top+r.height/2};});
   setGeo({w:box.width,h:box.height,pts});};
  measure();
  const t=setTimeout(measure,150);
  window.addEventListener('resize',measure);
  return()=>{clearTimeout(t);window.removeEventListener('resize',measure);};
 },[line.id]);
 return <>
  <p className="muted">{line.hint} 点击节点查看组件职责；虚线为该线的数据流走向。</p>
  <div className="arch-wrap" ref={wrapRef}>
   <svg className="arch-wires" viewBox={geo?`0 0 ${geo.w} ${geo.h}`:undefined} aria-hidden="true">
    <defs><marker id={'arr-'+line.id} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={line.color}/></marker></defs>
    {geo&&line.edges.map(([a,b])=>{const p1=geo.pts[a],p2=geo.pts[b];if(!p1||!p2)return null;const my=(p1.y+p2.y)/2;
     return <path key={a+'-'+b} className="arch-flowline" d={`M${p1.x},${p1.y} C${p1.x},${my} ${p2.x},${my} ${p2.x},${p2.y}`} stroke={line.color} markerEnd={`url(#arr-${line.id})`}/>;})}
   </svg>
   {line.layers.map(l=><div className="arch-layer" key={l.name}><small>{l.name}</small><div className="arch-nodes">
    {l.nodes.map(n=><button type="button" key={n.id} data-node={n.id} className={`arch-node ${n.type} ${n.on?'on':'dim'}${sel===n.id?' sel':''}`} onClick={()=>setSel(sel===n.id?null:n.id)}><span>{n.label}</span>{n.sub&&<small>{n.sub}</small>}</button>)}
   </div></div>)}
  </div>
  {sel&&line.info[sel]&&<div className="arch-info"><b>{line.info[sel][0]}</b> — {line.info[sel][1]}</div>}
  <Mark id="principle-steps" label="流程步骤" className="principle-block"><h3>流程步骤</h3><ol className="arch-steps">{line.steps.map(([lead,text],i)=><li key={i}><b>{lead}</b>{text}</li>)}</ol></Mark>
  <Mark id="principle-owner" label="管理权与状态来源" className="principle-block"><h3>管理权与状态来源</h3><p>{line.owner}</p></Mark>
  <Mark id="principle-decision" label="技术决策与验证前提" className="principle-block"><h3>技术决策与验证前提</h3><p>{line.decision}</p></Mark>
 </>;
}
