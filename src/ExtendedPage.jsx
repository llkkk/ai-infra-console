import React,{useState,useEffect} from 'react';
import {Search,ChevronRight,Check} from 'lucide-react';
import {catalog,forms} from './catalog.js';
import {tabContent} from './detail-tabs.js';
import {IncidentWorkbench} from './incidents.jsx';
import {ProvisionWorkbench} from './provisioning.jsx';
import {prefillValues,requiredChecks,findBlocker} from './form-logic.js';
import {bmcFieldMap,resolveLink} from './model.js';
import {SCENARIOS} from './scenarios.js';
export function ExtendedPage({page,go,open,Mark,table,context,region,onTab,tab,openAsset,notify}){
 const config=catalog[page];const [query,setQuery]=useState(''),[status,setStatus]=useState('全部'),[regionFilter,setRegionFilter]=useState('全部区域'),[active,setActive]=useState(tab==='概览'?config.tabs?.[0]:tab);
 useEffect(()=>{setActive(tab==='概览'?config.tabs?.[0]:tab);},[tab,page]);
 if(config.dashboard)return <Dashboard kind={config.dashboard} Mark={Mark} go={go} table={table} openAsset={openAsset} notify={notify}/>;
 if(page==='incident')return <IncidentWorkbench incidentId={context?.[0]} go={go} open={open} Mark={Mark} table={table} openAsset={openAsset} notify={notify}/>;
 if(page==='provisioning-detail')return <ProvisionWorkbench taskId={context?.[0]} go={go} open={open} Mark={Mark} table={table} openAsset={openAsset} notify={notify}/>;
 if(config.columns){const statusIndex=config.columns.findIndex(x=>/状态|健康|验证|连接|阶段/.test(x));const states=statusIndex<0?[]:[...new Set(config.rows.map(r=>String(r[statusIndex])))];const rows=config.rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase())&&(status==='全部'||String(r[statusIndex])===status)&&(page!=='tasks'||regionFilter==='全部区域'||String(r[3])===regionFilter));return <Mark id="catalog-list" label={config.title+'列表'} className="panel"><div className="panel-toolbar"><div className="search"><Search size={16}/><input aria-label={'搜索'+config.title} placeholder="搜索对象、名称或关联标识…" value={query} onChange={e=>setQuery(e.target.value)}/></div>{page==='tasks'&&<select aria-label="任务区域筛选" value={regionFilter} onChange={e=>setRegionFilter(e.target.value)}><option>全部区域</option><option>实验中心</option><option>华东生产区</option><option>西南 GPU 区</option></select>}{states.length>0&&<select aria-label="列表状态筛选" value={status} onChange={e=>setStatus(e.target.value)}><option>全部</option>{states.map(x=><option key={x}>{x}</option>)}</select>}<span className="toolbar-spacer"/><small>{page==='tasks'?'跨区域任务 · ':''}共 {rows.length} 条 · 示例</small></div>{table([...config.columns,'操作'],rows.map(r=>[...r.map((c,i)=>i===0?<button className="text-link" onClick={()=>go(config.detail,r)}>{c}</button>:c),<button className="text-link" onClick={()=>go(config.detail,r)}>查看详情 <ChevronRight size={12}/></button>]))}{rows.length===0&&<div className="empty">没有匹配记录</div>}<div className="table-footer">数据为静态示例，未接入任何真实采集或执行器。</div></Mark>}
 const content=tabContent(page,active,context);
 const fields=config.fields.map(([k,v],i)=>[k,context&&i===0?context[0]:v]);
 if(context){
 const mappings={image:{'镜像':context[2],'驱动所有权':context[4]},baseline:{'适用型号':context[1],'偏差处置':context[5]},node:{'节点':context[0],'集群':context[1],'关联资产':context[5],'角色':context[2],'状态':context[3],'工作负载':'待从对象关联采集'},'cluster-template':{'模板':context[0],'网络':context[3],'共享 / 调度':context[4]},gpu:{'节点 / 资产':context[1],'型号 / 显存':context[2]+' / '+context[3],'运行模式':context[4],'关联分配':context[6]},spec:{'规格':context[0],'模式':context[1],'单位':context[2],'CPU / 内存':context[3]},quota:{'项目':context[0],'外部标识':context[1],'资源池':context[2],'整卡上限':context[3],'已分配 / 预留':context[4]+' / '+context[5],'namespace':'外部项目 namespace 映射待确认'},allocation:{'分配单':context[0],'项目':context[1],'规格 / 数量':context[3],'集群 / namespace':'compute-lab / '+context[5],'底座验收':context[4]+'（示例）'},alert:{'对象':context[2],'严重度':context[1],'底座现象':context[3],'状态 / 时间':context[4]+' / '+context[5],'关联分配':context[6],'关联故障单':context[7]==='—'?'未建单（警告级仅跟踪）':context[7]+' · 处理中'},policy:{'策略':context[0],'信号':context[2],'通知':context[3],'规则管理权':context[4]},access:{'通道':context[0],'目标范围':context[1],'权限来源':context[2],'审计能力':context[3],'证据形态':context[4]},session:{'会话':context[0],'操作者':context[1],'目标 / 类型':context[2]+' / '+context[3],'来源':context[6],'开始 / 结束':context[4]+' / '+context[5]},operation:{'操作人':context[1],'对象':context[2],'动作':context[3],'结果':context[4],'关联任务':context[5]},service:{'服务':context[0],'候选组件':context[1],'提供方 / 运维方':context[3],'业务方':context[4]},instance:{'实例':context[0],'服务':context[1],'区域':context[2],'版本':context[3],'健康':context[4],'地址':context[0]+'.example.invalid'},task:{'任务':context[0],'类型 / 目标':context[1]+' / '+context[2],'状态':context[4]+'（固定示例）','当前阶段':context[3],'执行源':context[5]},region:{'区域标识':context[0],'中心标识':context[1],'机房':context[2],'执行归属':context[3],'连接状态':context[4]},integration:{'组件':context[0],'用途':context[1],'版本':context[2],'管理权':context[4]},credential:{'引用':context[0],'用途':context[1],'托管系统':context[2],'允许对象':context[3],'轮换':context[4]},'bmc-detail':bmcFieldMap(context[0])||{},workload:{'工作负载':context[0],'环境':context[1],'类型':context[2],'平台状态':context[3],'应用状态':context[4],'模型就绪':context[5],'更新时间':context[6]},request:{'申请':context[0],'项目':context[1],'运行时 / 镜像':context[2],'GPU / CPU / 内存':context[3]+' / 待确认','存储 / 网络':context[4]+' / 推理入口待确认','匹配状态':context[5]}};
 for(const field of fields)if(mappings[page]?.[field[0]]!==undefined)field[1]=mappings[page][field[0]];
 }
 return <><div className="tabs" role="tablist">{config.tabs.map(t=><button role="tab" aria-selected={active===t} className={active===t?'active':''} key={t} onClick={()=>{setActive(t);onTab(t);}}>{t}</button>)}</div><div className="detail-grid"><Mark id="catalog-detail" label={config.title+'配置'} className="panel"><h2>{active||'对象信息'}</h2>{content?table(['项目 / 对象','配置 / 状态','约定 / 来源'],content):<dl className="kv extended-kv">{fields.map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd data-note={'field-'+k} data-label={'字段：'+k}>{v}</dd></React.Fragment>)}</dl>}{config.action&&<div className="panel-actions"><button onClick={()=>open(config.action)}>配置 / 操作计划</button></div>}</Mark><Mark id="catalog-evidence" label="关联与执行证据" className="panel"><h2>{page==='task'?'执行阶段与事件':'关联对象与执行约定'}</h2>{page==='task'?<><div className="stage-list">{['授权与预检','硬件检查','镜像供应','OS 验收'].map((s,i)=><div key={s}><span>{i<2?<Check size={12}/>:i+1}</span><b>{s}</b><small>{context?.[4]==='失败'?(i===1?'失败 / 保留原因':i===0?'示例完成':'未开始'):i<2?'示例完成':i===2?'示例进行中':'尚未开始'}</small></div>)}</div><pre className="log-preview">[示例日志]\n目标：{context?.[2]||'compute-04'}\n事件源：控制器 / 执行器\n无真实日志内容，失败应保留阶段与原因。</pre></>:<><p className="callout">{config.description}</p><div className="related-links"><button onClick={()=>go('tasks')}>查看关联任务</button><button onClick={()=>go('operations')}>查看操作记录</button><button onClick={()=>go('integrations')}>查看数据来源</button></div><p className="muted">配置与实时状态分别呈现；权限不足、管理权不适用或失联时不允许直接变更。</p></>}</Mark></div></>
}
const MONITOR_LAYERS=[
 ['物理机 / BMC','5 / 6 有数据','reserve-01 无数据 · 标未知','assets'],
 ['OS / 主机','3 节点示例就绪','主机指标未接入','nodes'],
 ['Kubernetes / 集群','1 / 2 API 就绪','cpu-lab 未采集','clusters'],
 ['GPU / 设备','1 / 16 不可分配','利用率未接入','gpus']
];
function MonitorDashboard({Mark,go,table}){
 const incRow=catalog.incidents.rows[0];
 return <>
  <Mark id="monitor-layers" label="四层观测状态" className="stats">{MONITOR_LAYERS.map(([k,v,d])=><div key={k}><small>{k}</small><strong className="smaller">{v}</strong><span>{d}</span></div>)}</Mark>
  <div className="detail-grid">
   <Mark id="monitor-alerts" label="活跃告警与影响关联" className="panel wide"><h2>活跃告警与影响关联</h2>{table(['告警','严重度','对象','底座现象','影响关联','故障单','操作'],[
    ['ALERT-DEMO-01','严重','compute-02 / GPU-DEMO-002','设备不可分配','ALLOC-DEMO-02 / ENV-DEMO-02 · S2 影响待确认',<button className="text-link" key="inc" onClick={()=>go('incident',incRow)}>{incRow[0]}</button>,<span className="row-actions" key="ops"><button className="text-link" onClick={()=>go('incident',incRow)}>故障单</button><button className="text-link" onClick={()=>go('alert',catalog.alerts.rows[0])}>告警详情</button></span>],
    ['ALERT-DEMO-02','警告','reserve-01','BMC 无数据','未交付资产 · 无环境影响','未建单（跟踪）',<button className="text-link" key="a2" onClick={()=>go('alert',catalog.alerts.rows[1])}>告警详情</button>]
   ])}<p className="muted">严重底座告警自动生成故障单并关联资产、GPU 与分配；警告级告警先跟踪，建单策略待评审。</p></Mark>
   <Mark id="monitor-sources" label="分层采集与覆盖" className="panel"><h2>分层采集与覆盖</h2>{table(['层次','对象范围','指标来源（候选）','当前覆盖','异常 / 无数据'],[
    ['物理机 / BMC','6 台测试资产','Redfish exporter','5 台有硬件快照','reserve-01 采集无数据'],
    ['OS / 主机','compute-lab 3 节点','Node exporter','节点状态示例就绪','主机指标未接入 · 标未知'],
    ['Kubernetes / 集群','2 个集群','kube-state / API 只读','compute-lab 示例就绪','cpu-lab 未采集'],
    ['GPU / 设备','16 张物理卡（示例）','DCGM / 设备插件','分配事实静态记录','GPU-DEMO-002 不可分配；利用率未接入']
   ])}</Mark>
   <Mark id="monitor-rules" label="无数据与恢复约定" className="panel"><h2>无数据与恢复约定</h2><ul className="rule-list">
    <li>采集无数据显式标“未知”，不视为健康或空闲，也不计入可承诺容量。</li>
    <li>告警静默只暂停通知，不改变资源可分配状态；恢复以复验证据为准。</li>
    <li>底座指标归 S1；API 成功率、Token 与模型质量指标由 S2 提供，不在本页。</li>
    <li>跨系统超时表示结果未知，重试前重新核对授权与当前状态。</li>
   </ul></Mark>
   <Mark id="monitor-trend" label="GPU 利用率趋势示例" className="panel"><h2>GPU 利用率趋势 / 固定示例</h2><div className="chart-legend">过去 6 小时 · 非实时数据 · 不作为性能证据</div><svg className="trend-chart" viewBox="0 0 600 170" role="img" aria-label="固定示例趋势图"><path d="M0 40H600 M0 90H600 M0 140H600" stroke="#e6edf1" fill="none"/><path d="M0 135 L50 125 L100 133 L150 102 L200 112 L250 88 L300 91 L350 62 L400 75 L450 50 L500 61 L550 47 L600 56" fill="none" stroke="#4d8aa0" strokeWidth="3"/></svg><div className="chart-axis"><span>04:00</span><span>07:00</span><span>10:00</span></div><p className="callout">未接入监控时正式系统应显示“无数据”；这里的曲线仅展示产品布局。</p></Mark>
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
function OverviewDashboard({Mark,go,table,openAsset,notify}){return <><Mark id="dashboard-metrics" label="分层监控摘要" className="stats">{[['服务器资产','6','健康 / 供应独立记录'],['集群 API','1 / 2','1 个示例就绪 / 1 个未知'],['整卡分配','8 / 16','非实时 GPU 利用率'],['告警 / 故障单','2 / 1','严重告警已建单跟踪']].map(([k,v,d])=><div key={k}><small>{k}</small><strong>{v}</strong><span>{d}</span></div>)}</Mark><div className="detail-grid"><ScenarioPanel Mark={Mark} go={go} openAsset={openAsset} notify={notify}/><Mark id="dashboard-trend" label="监控趋势示例" className="panel"><h2>基础设施容量趋势 / 固定示例</h2><div className="chart-legend">过去 6 小时 · 非实时数据 · 不作为性能证据</div><svg className="trend-chart" viewBox="0 0 600 170" role="img" aria-label="固定示例趋势图"><path d="M0 40H600 M0 90H600 M0 140H600" stroke="#e6edf1" fill="none"/><path d="M0 135 L50 125 L100 133 L150 102 L200 112 L250 88 L300 91 L350 62 L400 75 L450 50 L500 61 L550 47 L600 56" fill="none" stroke="#4d8aa0" strokeWidth="3"/></svg><div className="chart-axis"><span>04:00</span><span>07:00</span><span>10:00</span></div><p className="callout">未接入监控时正式系统应显示“无数据”；这里的曲线仅展示产品布局。</p></Mark><Mark id="dashboard-alerts" label="需关注对象" className="panel"><h2>需关注对象</h2>{[['故障单 INC-DEMO-01 · 等待人工处理','GPU-DEMO-002 不可分配 / 关联联调环境','incidents'],['硬件检查失败','compute-03 / 示例','tasks'],['区域或对象无数据','保留最后观测，不推断空闲','settings']].map(([t,d,p])=><div className="attention" key={t}><div><b>{t}</b><small>{d}</small></div><button className="text-link" onClick={()=>go(p)}>查看 <ChevronRight size={13}/></button></div>)}</Mark><Mark id="dashboard-layers" label="四层观测入口" className="panel wide"><h2>分层观测</h2><div className="layer-grid">{[['物理机','带外健康 / 电源 / 温度','assets'],['虚拟机','实例健康 / 宿主资源','monitor'],['集群','Node / 控制面 / 网络存储','clusters'],['GPU','设备健康 / 显存 / 利用率','gpus']].map(([t,d,p])=><button key={t} onClick={()=>go(p)}><b>{t}</b><small>{d}</small><ChevronRight size={15}/></button>)}</div><p className="muted">虚拟机监控只是观测维度，不增加虚拟机供应模块；S2 API 成功率与 Token 指标不在本页。</p></Mark></div></>}
function Dashboard({kind,Mark,go,table,openAsset,notify}){return kind==='monitor'?<MonitorDashboard Mark={Mark} go={go} table={table}/>:<OverviewDashboard Mark={Mark} go={go} table={table} openAsset={openAsset} notify={notify}/>}
export function PlanForm({name,context,onPreview}){
 const config=forms[name];
 const [values,setValues]=useState(()=>prefillValues(config,context)),[checks,setChecks]=useState({}),[preview,setPreview]=useState(false);
 const blocker=findBlocker(config,values);
 const required=requiredChecks(config,values);
 const ready=!blocker&&required.every(c=>checks[c]);
 return <form onSubmit={e=>{e.preventDefault();if(ready){setPreview(true);onPreview();}}}><p className="callout">本地方案预检，不保存业务配置、不连接或操作真实环境。请勿输入真实凭据。</p>{context&&<p className="muted">当前讨论对象：{context[0]}</p>}<div className="form-grid">{config.fields.map(([k,v])=><label data-note={'plan-'+k} data-label={'操作字段：'+k} key={k}>{k}{Array.isArray(v)?<select value={values[k]} onChange={e=>{setValues({...values,[k]:e.target.value});setPreview(false);}}>{v.map(o=><option key={o}>{o}</option>)}</select>:k==='CSV 示例'?<textarea value={values[k]} onChange={e=>{setValues({...values,[k]:e.target.value});setPreview(false);}}/>:<input required value={values[k]} onChange={e=>{setValues({...values,[k]:e.target.value});setPreview(false);}}/>}</label>)}</div>{blocker&&<div className="form-blocker" role="alert"><b>预检不通过</b><span>{blocker}</span></div>}{config.warning&&<p className="callout">{config.warning}</p>}{required.map(c=><label className="plan-check" key={c}><input type="checkbox" checked={!!checks[c]} onChange={e=>{setChecks({...checks,[c]:e.target.checked});setPreview(false);}}/>{c}（示例确认）</label>)}{preview&&<div className="plan-preview" role="status"><h3>示例计划已生成 · 尚未执行</h3><dl className="kv">{Object.entries(values).map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl><p>真实系统需要后端验证、授权及执行器回传结果；本原型仅预览输入。</p></div>}<div className="dialog-actions"><button type="submit" className="primary" disabled={!ready}>{blocker?'预检不通过，不可提交':'预检并预览计划'}</button></div></form>
}
