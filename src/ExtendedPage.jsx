import React,{useState,useEffect} from 'react';
import {Search,ChevronRight,Check} from 'lucide-react';
import {catalog,forms} from './catalog.js';
import {tabContent} from './detail-tabs.js';
import {IncidentWorkbench} from './incidents.jsx';
import {ProvisionWorkbench} from './provisioning.jsx';
import {prefillValues,requiredChecks,findBlocker} from './form-logic.js';
import {bmcFieldMap,resolveLink,incidentRows} from './model.js';
import {SCENARIOS} from './scenarios.js';
import {CHAIN} from './chain.js';
export function ExtendedPage({page,go,open,Mark,table,context,region,onTab,tab,openAsset,notify}){
 const config=catalog[page];const [query,setQuery]=useState(''),[status,setStatus]=useState('全部'),[regionFilter,setRegionFilter]=useState('全部区域'),[active,setActive]=useState(tab==='概览'?config.tabs?.[0]:tab);
 useEffect(()=>{setActive(tab==='概览'?config.tabs?.[0]:tab);},[tab,page]);
 if(config.dashboard)return <Dashboard kind={config.dashboard} Mark={Mark} go={go} table={table} openAsset={openAsset} notify={notify}/>;
 if(page==='incident')return <IncidentWorkbench incidentId={context?.[0]} go={go} open={open} Mark={Mark} table={table} openAsset={openAsset} notify={notify}/>;
 if(page==='provisioning-detail')return <ProvisionWorkbench taskId={context?.[0]} go={go} open={open} Mark={Mark} table={table} openAsset={openAsset} notify={notify}/>;
 if(config.columns){const statusIndex=config.columns.findIndex(x=>/状态|健康|验证|连接|阶段/.test(x));const states=statusIndex<0?[]:[...new Set(config.rows.map(r=>String(r[statusIndex])))];const rows=config.rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase())&&(status==='全部'||String(r[statusIndex])===status)&&(page!=='tasks'||regionFilter==='全部区域'||String(r[3])===regionFilter));const detailOf=r=>page==='alerts'&&r[2]==='故障单'?'incident':config.detail;return <Mark id="catalog-list" label={config.title+'列表'} className="panel"><div className="panel-toolbar"><div className="search"><Search size={16}/><input aria-label={'搜索'+config.title} placeholder="搜索对象、名称或关联标识…" value={query} onChange={e=>setQuery(e.target.value)}/></div>{page==='tasks'&&<select aria-label="任务区域筛选" value={regionFilter} onChange={e=>setRegionFilter(e.target.value)}><option>全部区域</option><option>实验中心</option><option>华东生产区</option><option>西南 GPU 区</option></select>}{states.length>0&&<select aria-label="列表状态筛选" value={status} onChange={e=>setStatus(e.target.value)}><option>全部</option>{states.map(x=><option key={x}>{x}</option>)}</select>}<span className="toolbar-spacer"/><small>{page==='tasks'?'跨区域任务 · ':''}共 {rows.length} 条 · 示例</small></div>{table([...config.columns,'操作'],rows.map(r=>[...r.map((c,i)=>i===0?<button className="text-link" onClick={()=>go(detailOf(r),r)}>{c}</button>:c),<button className="text-link" onClick={()=>go(detailOf(r),r)}>查看详情 <ChevronRight size={12}/></button>]))}{rows.length===0&&<div className="empty">没有匹配记录</div>}<div className="table-footer">数据为静态示例，未接入任何真实采集或执行器。</div></Mark>}
 const content=tabContent(page,active,context);
 const fields=config.fields.map(([k,v],i)=>[k,context&&i===0?context[0]:v]);
 if(context){
 const mappings={image:{'镜像':context[2],'驱动所有权':context[4]},baseline:{'适用型号':context[1],'偏差处置':context[5]},node:{'节点':context[0],'集群':context[1],'关联资产':context[5],'角色':context[2],'状态':context[3],'工作负载':'待从对象关联采集'},'cluster-template':{'模板':context[0],'网络':context[3],'共享 / 调度':context[4]},gpu:{'节点 / 资产':context[1],'型号 / 显存':context[2]+' / '+context[3],'运行模式':context[4],'关联分配':context[6]},spec:{'规格':context[0],'模式':context[1],'单位':context[2],'CPU / 内存':context[3]},allocation:{'分配单':context[0],'项目':context[1],'规格 / 数量':context[3],'集群 / namespace':'compute-lab / '+context[5],'底座验收':context[4]+'（示例）'},alert:{'级别':context[1],'类型':context[2],'对象':context[4],'严重度':context[3],'底座现象':context[5],'状态 / 时间':context[6]+' / '+context[7],'关联分配':context[8],'关联故障单':context[2]==='故障单'?'本行即故障单':(context[9]==='—'?'未建单（跟踪中）':context[9]+' · 处理中')},policy:{'策略':context[0],'信号':context[2],'通知':context[3],'规则管理权':context[4]},access:{'通道':context[0],'目标范围':context[1],'权限来源':context[2],'审计能力':context[3],'证据形态':context[4]},session:{'会话':context[0],'操作者':context[1],'目标 / 类型':context[2]+' / '+context[3],'来源':context[6],'开始 / 结束':context[4]+' / '+context[5]},operation:{'操作人':context[1],'对象':context[2],'动作':context[3],'结果':context[4],'关联任务':context[5]},service:{'服务':context[0],'候选组件':context[1],'提供方 / 运维方':context[3],'业务方':context[4]},task:{'任务':context[0],'类型 / 目标':context[1]+' / '+context[2],'状态':context[4]+'（固定示例）','当前阶段':context[3],'执行源':context[5]},region:{'区域标识':context[0],'中心标识':context[1],'机房':context[2],'执行归属':context[3],'连接状态':context[4]},credential:{'引用':context[0],'用途':context[1],'托管系统':context[2],'允许对象':context[3],'轮换':context[4]},'bmc-detail':bmcFieldMap(context[0])||{},workload:{'工作负载':context[0],'环境':context[1],'类型':context[2],'平台状态':context[3],'应用状态':context[4],'模型就绪':context[5],'更新时间':context[6]},request:{'申请':context[0],'项目':context[1],'运行时 / 镜像':context[2],'GPU / CPU / 内存':context[3]+' / 待确认','存储 / 网络':context[4]+' / 推理入口待确认','匹配状态':context[5]}};
 for(const field of fields)if(mappings[page]?.[field[0]]!==undefined)field[1]=mappings[page][field[0]];
 }
 return <><div className="tabs" role="tablist">{config.tabs.map(t=><button role="tab" aria-selected={active===t} className={active===t?'active':''} key={t} onClick={()=>{setActive(t);onTab(t);}}>{t}</button>)}</div><div className="detail-grid"><Mark id="catalog-detail" label={config.title+'配置'} className="panel"><h2>{active||'对象信息'}</h2>{content?table(['项目 / 对象','配置 / 状态','约定 / 来源'],content):<dl className="kv extended-kv">{fields.map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd data-note={'field-'+k} data-label={'字段：'+k}>{v}</dd></React.Fragment>)}</dl>}{config.action&&<div className="panel-actions"><button onClick={()=>open(config.action)}>配置 / 操作计划</button></div>}{page==='platform-service'&&<div className="panel-actions">{['重启 Deployment','扩缩容','查看日志','回滚'].map(op=><button key={op} onClick={()=>notify('演示：'+op+'（示例），不执行真实 k8s 操作')}>{op}</button>)}</div>}</Mark><Mark id="catalog-evidence" label="关联与执行证据" className="panel"><h2>{page==='task'?'执行阶段与事件':'关联对象与执行约定'}</h2>{page==='task'?<><div className="stage-list">{['授权与预检','硬件检查','镜像供应','OS 验收'].map((s,i)=><div key={s}><span>{i<2?<Check size={12}/>:i+1}</span><b>{s}</b><small>{context?.[4]==='失败'?(i===1?'失败 / 保留原因':i===0?'示例完成':'未开始'):i<2?'示例完成':i===2?'示例进行中':'尚未开始'}</small></div>)}</div><pre className="log-preview">[示例日志]\n目标：{context?.[2]||'compute-04'}\n事件源：控制器 / 执行器\n无真实日志内容，失败应保留阶段与原因。</pre></>:<><p className="callout">{config.description}</p><div className="related-links"><button onClick={()=>go('tasks')}>查看关联任务</button><button onClick={()=>go('operations')}>查看操作记录</button></div><p className="muted">配置与实时状态分别呈现；权限不足、管理权不适用或失联时不允许直接变更。</p></>}</Mark></div></>
}
const MONITOR_DIMS=[
 {title:'物理机与 BMC',health:'5',warn:'0',unknown:'1',top:'reserve-01 BMC 无数据（标未知）',page:'bmc',label:'BMC 与硬件'},
 {title:'主机与 OS',health:'3（示例就绪）',warn:'0',unknown:'主机指标未接入',top:'compute-lab 3 节点状态示例就绪',page:'nodes',label:'节点'},
 {title:'集群与 K8s',health:'1 API 就绪',warn:'0',unknown:'1 未采集',top:'cpu-lab 未采集（标未知）',page:'clusters',label:'集群'},
 {title:'GPU 与设备',health:'15 可分配（示例）',warn:'1 不可分配',unknown:'利用率未接入',top:'GPU-DEMO-002 不可分配（INC-DEMO-01）',page:'gpus',label:'GPU 设备'}
];
function MonitorDashboard({Mark,go,table}){
 const rows=catalog.alerts.rows;
 const goAlert=r=>go(r[2]==='故障单'?'incident':'alert',r);
 return <>
  <Mark id="monitor-dims" label="四维度健康摘要" className="stats">{MONITOR_DIMS.map(d=><div key={d.title}><small>{d.title}</small><strong className="smaller">{d.health} / {d.warn} / {d.unknown}</strong><span>健康 / 异常 / 未知</span></div>)}</Mark>
  <div className="detail-grid">
   {MONITOR_DIMS.map(d=><Mark key={d.title} id={'monitor-dim-'+d.title} label={d.title} className="panel"><h2>{d.title}</h2><div className="usage"><div><b>健康 {d.health}</b><span>异常 {d.warn} · 未知 {d.unknown}</span></div><div className="bar"><span style={{width:'60%'}}/></div></div><p className="muted">TOP 关注：{d.top}</p><div className="panel-actions"><button className="text-link" onClick={()=>go(d.page)}>进入{d.label} <ChevronRight size={14}/></button></div></Mark>)}
   <Mark id="monitor-active" label="活跃告警与故障" className="panel wide"><h2>活跃告警与故障</h2>{table(['事件','级别','类型','对象','现象','操作'],rows.map(r=>[r[0],r[1],r[2],r[4],r[5],<button className="text-link" key={'op-'+r[0]} onClick={()=>goAlert(r)}>{r[2]==='故障单'?'故障单工作台':'告警详情'} <ChevronRight size={12}/></button>]))}<p className="muted">按级别区分：P0 严重 / P1 重要 / P2 警告 / 提示；严重底座告警自动生成故障单，故障单行点击进入处理工作台。</p></Mark>
   <Mark id="monitor-convention" label="观测约定" className="panel"><h2>观测约定</h2><ul className="rule-list">
    <li>采集无数据显式标"未知"，不视为健康或空闲，也不计入可承诺容量。</li>
    <li>告警静默只暂停通知，不改变资源可分配状态；恢复以复验证据为准。</li>
    <li>本页数值为固定示例，非实时指标；未接入监控时正式系统应显示"无数据"。</li>
    <li>底座指标归 S1；API 成功率、Token 与模型质量指标由 S2 提供，不在本页。</li>
   </ul></Mark>
  </div></>;
}
function ScenarioPanel({Mark,go,openAsset,notify}){
 const [sel,setSel]=useState(SCENARIOS[0].id);
 const sc=SCENARIOS.find(s=>s.id===sel)||SCENARIOS[0];
 const nav=step=>{
  const link=step.link;
  if(link.type){
   const res=resolveLink(link.type,link.id);
   if(!res){notify('场景对象未找到：'+link.id+'（示例数据缺失）');return;}
   if(res.page==='asset')openAsset(res.row);else go(res.page,res.row);
   return;
  }
  go(link.page);
 };
 return <Mark id="dashboard-scenarios" label="演示场景入口" className="panel wide"><h2>演示场景（本地模拟跳转）</h2><div className="scenario-bar">{SCENARIOS.map(s=><button key={s.id} className={s.id===sel?'scenario-active':''} onClick={()=>setSel(s.id)}>{s.title}</button>)}</div><p className="muted">{sc.desc} · 共 {sc.steps.length} 步 · 点击步骤在真实页面间跳转</p><ol className="scenario-steps">{sc.steps.map((st,i)=><li key={i}><button onClick={()=>nav(st)}>{st.label}</button>{st.note&&<small>{st.note}</small>}</li>)}</ol><p className="callout">场景只做页面跳转演示，不执行任何真实操作；数据为虚构示例，不代表真实环境状态。</p></Mark>;
}
const CHAIN_MODULE_CLASS={'基础设施':'m-assets','集群与算力':'m-clusters','资源与交付':'m-pools'};
function ChainMap({Mark,go}){
 const nodes=(list,cross)=>list.map(([title,page,tag],i)=><React.Fragment key={page}>
  <button className={'chain-node '+(CHAIN_MODULE_CLASS[tag]||'')} onClick={()=>go(page)}><span>{title}</span><small>{tag}</small></button>
  {!cross&&i<list.length-1&&<ChevronRight size={14} className="chain-arrow"/>}
 </React.Fragment>);
 return <Mark id="dashboard-chain" label="交付链路地图" className="panel chain-map">
  <h2>交付链路地图 · 模块怎么串起来</h2>
  <p className="muted">页面沿两条链路组织：供应线把裸金属变成可用算力，交付线把算力变成可交付环境；横切模块覆盖全链。链路只列主要流转，不是全部页面。</p>
  {[CHAIN.supply,CHAIN.delivery].map(line=><div className="chain-group" key={line.label}><small>{line.label}</small><div className="chain-line">{nodes(line.nodes)}</div></div>)}
  <div className="chain-group"><small>{CHAIN.cross.label}</small><div className="chain-line chain-cross">{nodes(CHAIN.cross.nodes,true)}</div></div>
  <p className="callout">节点颜色对应所属模块；基础设施、集群与算力、资源与交付的“技术方案”弹窗按装机线 / 集群线 / 使用线展示组件与数据流。</p>
 </Mark>;
}
function OverviewDashboard({Mark,go,table,openAsset,notify}){return <><Mark id="dashboard-metrics" label="分层监控摘要" className="stats">{[['服务器资产','6','健康 / 供应独立记录'],['集群 API','1 / 2','1 个示例就绪 / 1 个未知'],['整卡分配','8 / 16','非实时 GPU 利用率'],['告警 / 故障单','2 / 1','严重告警已建单跟踪']].map(([k,v,d])=><div key={k}><small>{k}</small><strong>{v}</strong><span>{d}</span></div>)}</Mark><ChainMap Mark={Mark} go={go}/><div className="detail-grid"><ScenarioPanel Mark={Mark} go={go} openAsset={openAsset} notify={notify}/><Mark id="dashboard-trend" label="监控趋势示例" className="panel"><h2>基础设施容量趋势 / 固定示例</h2><div className="chart-legend">过去 6 小时 · 非实时数据 · 不作为性能证据</div><svg className="trend-chart" viewBox="0 0 600 170" role="img" aria-label="固定示例趋势图"><path d="M0 40H600 M0 90H600 M0 140H600" stroke="#e6edf1" fill="none"/><path d="M0 135 L50 125 L100 133 L150 102 L200 112 L250 88 L300 91 L350 62 L400 75 L450 50 L500 61 L550 47 L600 56" fill="none" stroke="#4d8aa0" strokeWidth="3"/></svg><div className="chart-axis"><span>04:00</span><span>07:00</span><span>10:00</span></div><p className="callout">未接入监控时正式系统应显示“无数据”；这里的曲线仅展示产品布局。</p></Mark><Mark id="dashboard-alerts" label="需关注对象" className="panel"><h2>需关注对象</h2>{[['故障单 INC-DEMO-01 · 等待人工处理','GPU-DEMO-002 不可分配 / 关联联调环境','alerts'],['硬件检查失败','compute-03 / 示例','tasks'],['区域或对象无数据','保留最后观测，不推断空闲','settings']].map(([t,d,p])=><div className="attention" key={t}><div><b>{t}</b><small>{d}</small></div><button className="text-link" onClick={()=>go(p)}>查看 <ChevronRight size={13}/></button></div>)}</Mark><Mark id="dashboard-layers" label="四层观测入口" className="panel wide"><h2>分层观测</h2><div className="layer-grid">{[['物理机','带外健康 / 电源 / 温度','assets'],['虚拟机','实例健康 / 宿主资源','monitor'],['集群','Node / 控制面 / 网络存储','clusters'],['GPU','设备健康 / 显存 / 利用率','gpus']].map(([t,d,p])=><button key={t} onClick={()=>go(p)}><b>{t}</b><small>{d}</small><ChevronRight size={15}/></button>)}</div><p className="muted">虚拟机监控只是观测维度，不增加虚拟机供应模块；S2 API 成功率与 Token 指标不在本页。</p></Mark></div></>}
function Dashboard({kind,Mark,go,table,openAsset,notify}){return kind==='monitor'?<MonitorDashboard Mark={Mark} go={go} table={table}/>:<OverviewDashboard Mark={Mark} go={go} table={table} openAsset={openAsset} notify={notify}/>}
export function PlanForm({name,context,onPreview}){
 const config=forms[name];
 const [values,setValues]=useState(()=>prefillValues(config,context)),[checks,setChecks]=useState({}),[preview,setPreview]=useState(false);
 const blocker=findBlocker(config,values);
 const required=requiredChecks(config,values);
 const ready=!blocker&&required.every(c=>checks[c]);
 return <form onSubmit={e=>{e.preventDefault();if(ready){setPreview(true);onPreview();}}}><p className="callout">本地方案预检，不保存业务配置、不连接或操作真实环境。请勿输入真实凭据。</p>{context&&<p className="muted">当前讨论对象：{context[0]}</p>}<div className="form-grid">{config.fields.map(([k,v])=><label data-note={'plan-'+k} data-label={'操作字段：'+k} key={k}>{k}{Array.isArray(v)?<select value={values[k]} onChange={e=>{setValues({...values,[k]:e.target.value});setPreview(false);}}>{v.map(o=><option key={o}>{o}</option>)}</select>:k==='CSV 示例'?<textarea value={values[k]} onChange={e=>{setValues({...values,[k]:e.target.value});setPreview(false);}}/>:<input required value={values[k]} onChange={e=>{setValues({...values,[k]:e.target.value});setPreview(false);}}/>}</label>)}</div>{blocker&&<div className="form-blocker" role="alert"><b>预检不通过</b><span>{blocker}</span></div>}{config.warning&&<p className="callout">{config.warning}</p>}{required.map(c=><label className="plan-check" key={c}><input type="checkbox" checked={!!checks[c]} onChange={e=>{setChecks({...checks,[c]:e.target.checked});setPreview(false);}}/>{c}（示例确认）</label>)}{preview&&<div className="plan-preview" role="status"><h3>示例计划已生成 · 尚未执行</h3><dl className="kv">{Object.entries(values).map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl><p>真实系统需要后端验证、授权及执行器回传结果；本原型仅预览输入。</p></div>}<div className="dialog-actions"><button type="submit" className="primary" disabled={!ready}>{blocker?'预检不通过，不可提交':'预检并预览计划'}</button></div></form>
}
