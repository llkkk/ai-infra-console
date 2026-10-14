// 共享虚构对象注册表：相关页面的列表行、当前状态与历史记录统一从这里派生，
// 避免同一对象在不同页面硬编码出互相矛盾的状态。全部数据为本地评审示例。
import {INCIDENTS} from './incident-data.js';

// ---------- 区域 / 机房 / 执行层（评审稿 2.2：区域是机房分组，机房是执行单元，执行层每机房一份） ----------
export const roomRecords=[
 {id:'room-demo-A',name:'机房 A',region:'region-demo-01',faultDomain:'room-demo-A（单机房域 · 示例）',management:true,
  exec:{id:'exec-room-a',version:'s1-exec 0.x（示例）',state:'在线',heartbeat:'10-14 10:24'}},
 {id:'room-demo-B',name:'机房 B',region:'region-demo-01',faultDomain:'room-demo-B（单机房域 · 示例）',management:false,
  exec:{id:'exec-room-b',version:'s1-exec 0.x（示例）',state:'在线',heartbeat:'10-14 10:21'}}
];
export const regionRecords=[
 {id:'region-demo-01',name:'实验中心',env:'实验',rooms:['room-demo-A','room-demo-B'],state:'示例在线',note:'管理层部署在机房 A；两个机房各有一套执行层'},
 {id:'region-demo-02',name:'预留区域',env:'—',rooms:[],state:'未接入',note:'机房与执行层未配置'}
];
export const roomName=id=>roomRecords.find(room=>room.id===id)?.name??id;

// ---------- 资产（评审稿 3.1：生命周期阶段 / BMC 与健康 / 当前任务 三维状态 + 位置与拓扑） ----------
export const STAGE_ORDER=['registered','managed','hw_passed','installing','installed','in_cluster','in_baremetal_pool'];
export const STAGE_LABELS={registered:'已登记',managed:'已纳管',hw_passed:'检查通过',installing:'装机中',installed:'已装机',in_cluster:'已入集群',in_baremetal_pool:'已入裸金属池'};
export const SIDE_LABELS={maintenance:'维护中',retired:'已退役'};
export const BMC_LABELS={unmanaged:'未纳管',online:'在线',offline:'离线',no_data:'无数据'};

// D2 修正：compute-lab 集群全部节点都在机房 A（原示例跨两个机房的问题已按评审稿修正）；
// 机房 B 承载裸金属路径示例。所有权约定：同一台机器同一时刻只属于一个集群或一个资源池。
export const assetRecords=[
 {id:'compute-01',sn:'DEMO-SN-001',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',stage:'in_cluster',bmc:'online',task:null,incident:null,
  location:{room:'room-demo-A',rack:'rack-A01',unit:'U12',tor:'tor-A01-01',netDomain:'高速网络域 A（示例）'},ownership:{kind:'cluster',cluster:'compute-lab',role:'工作节点'}},
 {id:'compute-02',sn:'DEMO-SN-002',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',stage:'in_cluster',bmc:'online',task:null,incident:'INC-DEMO-01',
  location:{room:'room-demo-A',rack:'rack-A01',unit:'U13',tor:'tor-A01-01',netDomain:'高速网络域 A（示例）'},ownership:{kind:'cluster',cluster:'compute-lab',role:'工作节点'}},
 {id:'compute-03',sn:'DEMO-SN-003',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',stage:'hw_passed',bmc:'online',task:null,incident:null,
  location:{room:'room-demo-A',rack:'rack-A02',unit:'U04',tor:'tor-A02-01',netDomain:'高速网络域 A（示例）'},ownership:null},
 {id:'control-01',sn:'DEMO-SN-004',type:'通用服务器',gpu:'无',mem:'64 GiB',stage:'in_cluster',bmc:'online',task:null,incident:null,
  location:{room:'room-demo-A',rack:'rack-A03',unit:'U02',tor:'tor-A03-01',netDomain:'—'},ownership:{kind:'cluster',cluster:'compute-lab',role:'控制面'}},
 {id:'reserve-01',sn:'DEMO-SN-005',type:'通用服务器',gpu:'待检查',mem:'待检查',stage:'registered',bmc:'no_data',task:null,incident:null,
  location:null,ownership:null},
 {id:'compute-04',sn:'DEMO-SN-006',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',stage:'installing',bmc:'online',task:'TASK-DEMO-01 · 磁盘与镜像 2/5',incident:null,
  location:{room:'room-demo-A',rack:'rack-A02',unit:'U08',tor:'tor-A02-01',netDomain:'高速网络域 A（示例）'},ownership:null},
 {id:'bm-01',sn:'DEMO-SN-101',type:'GPU 裸金属',gpu:'8 × 示例 GPU',mem:'1.5 TiB',stage:'in_baremetal_pool',bmc:'online',task:null,incident:null,
  location:{room:'room-demo-B',rack:'rack-B01',unit:'U06',tor:'tor-B01-01',netDomain:'高速网络域 B（示例）'},ownership:{kind:'baremetal-pool',pool:'baremetal-01'}},
 {id:'bm-02',sn:'DEMO-SN-102',type:'GPU 裸金属',gpu:'8 × 示例 GPU',mem:'1.5 TiB',stage:'in_baremetal_pool',bmc:'online',task:null,incident:null,
  location:{room:'room-demo-B',rack:'rack-B01',unit:'U07',tor:'tor-B01-01',netDomain:'高速网络域 B（示例）'},ownership:{kind:'baremetal-pool',pool:'baremetal-01'}},
 {id:'bm-03',sn:'DEMO-SN-103',type:'GPU 裸金属',gpu:'8 × 示例 GPU',mem:'1.5 TiB',stage:'installed',bmc:'online',task:null,incident:null,
  location:{room:'room-demo-B',rack:'rack-B01',unit:'U08',tor:'tor-B01-01',netDomain:'高速网络域 B（示例）'},ownership:null},
 {id:'bm-04',sn:'DEMO-SN-104',type:'GPU 裸金属',gpu:'8 × 示例 GPU',mem:'1.5 TiB',stage:'managed',bmc:'online',task:null,incident:null,
  location:{room:'room-demo-B',rack:'rack-B02',unit:'U02',tor:'tor-B02-01',netDomain:'高速网络域 B（示例）'},ownership:null},
 {id:'old-01',sn:'DEMO-SN-090',type:'通用服务器',gpu:'无',mem:'64 GiB',stage:null,bmc:'offline',task:null,incident:null,sideState:'retired',
  location:{room:'room-demo-A',rack:'rack-A03',unit:'U20',tor:'tor-A03-01',netDomain:'—'},ownership:null}
];

export const assetStageOf=asset=>asset.sideState??asset.stage;
export function assetStageLabel(asset){return asset.sideState?SIDE_LABELS[asset.sideState]:STAGE_LABELS[asset.stage];}
export function assetBmcLabel(asset){return BMC_LABELS[asset.bmc]??asset.bmc;}
export function assetLocationLabel(asset){return asset.location?`${roomName(asset.location.room)} · ${asset.location.rack}`:'未分配位置';}
export function assetOwnershipLabel(asset){
 const own=asset.ownership;
 if(!own)return '无';
 if(own.kind==='cluster')return `${own.cluster} · ${own.role}`;
 return own.pool;
}
// 异常为派生判定（评审稿 3.1.1）：已纳管及之后 BMC 离线 / 无数据、关联未关闭故障；
// 已登记阶段的未纳管与装机中不算异常，维护中 / 已退役不参与。
export function assetAbnormal(asset){
 if(asset.sideState)return false;
 if(STAGE_ORDER.indexOf(asset.stage)>=STAGE_ORDER.indexOf('managed')&&(asset.bmc==='offline'||asset.bmc==='no_data'))return true;
 if(asset.incident&&INCIDENTS[asset.incident]?.phase!=='已关闭')return true;
 return false;
}
// 阶段条数据：7 个阶段 + 1 个异常列；维护中 / 已退役以文字呈现。
export function stageBarCounts(){
 const counts=Object.fromEntries(STAGE_ORDER.map(stage=>[STAGE_LABELS[stage],0]));
 let abnormal=0,maintenance=0,retired=0;
 for(const asset of assetRecords){
  if(asset.sideState==='maintenance')maintenance+=1;
  else if(asset.sideState==='retired')retired+=1;
  else{
   counts[STAGE_LABELS[asset.stage]]+=1;
   if(assetAbnormal(asset))abnormal+=1;
  }
 }
 return {counts,abnormal,maintenance,retired};
}
// 位置树：机房 → 机柜，节点带资产数与异常数；未分配位置单独一组。
export function locationTree(){
 const tree=[];
 for(const room of roomRecords){
  const racks={};
  for(const asset of assetRecords){
   if(asset.location?.room!==room.id)continue;
   const rack=asset.location.rack;
   racks[rack]??={count:0,abnormal:0};
   racks[rack].count+=1;
   if(assetAbnormal(asset))racks[rack].abnormal+=1;
  }
  tree.push({key:room.id,title:room.name,rackCount:Object.keys(racks).length,total:assetRecords.filter(a=>a.location?.room===room.id).length,
   children:Object.entries(racks).map(([rack,stat])=>({key:`${room.id}:${rack}`,title:rack,...stat}))});
 }
 const unassigned=assetRecords.filter(a=>!a.location);
 tree.push({key:'unassigned',title:'未分配位置',rackCount:0,total:unassigned.length,children:[]});
 return tree;
}
export const assetRows=assetRecords.map(a=>[
 a.id,a.sn,a.type,
 a.gpu==='无'?a.mem:`${a.gpu} / ${a.mem}`,
 assetLocationLabel(a),assetStageLabel(a),assetBmcLabel(a),
 a.task||'—',assetOwnershipLabel(a)
]);
export const abnormalAssets=()=>assetRecords.filter(assetAbnormal);

// compute-03 故事线：09:50 磁盘检查失败（保留为历史）→ 修正模板 → 10:40 重检通过。
// 硬件检查通过不代表 OS / 集群 / 运行能力验收通过，因此仍不可交付。
export const compute03Story={
 hardwareCheck:{current:'通过（10-10 重检）',history:[
  {at:'10-10 09:50',result:'失败',reason:'磁盘检查失败：目标盘标识与 gpu-baseline-02 模板策略不匹配',task:'TASK-DEMO-02'},
  {at:'10-10 10:40',result:'通过',reason:'修正模板目标盘策略后按预检重试，仅重跑失败阶段',task:'TASK-DEMO-02'}]},
 acceptance:[
  ['硬件检查','通过（重检）','TASK-DEMO-02'],
  ['OS 安装','未开始','供应任务待创建'],
  ['SSH / Agent 注册','未开始','依赖 OS'],
  ['Node 注册','未开始','依赖 OS'],
  ['集群能力验收','未开始','依赖入群'],
  ['GPU 运行能力','未开始','依赖集群验收']],
 deliverable:'否（硬件通过 ≠ OS / 集群 / 运行能力验收通过）'
};

// ---------- 任务（评审稿 3.5：执行源 = 某机房的执行层；类型补充维护 / 退役 / 数据擦除 / 重装） ----------
export const taskRecords=[
 {id:'TASK-DEMO-01',type:'装机',target:'compute-04',template:'linux-baseline-01',stage:'镜像供应',subStage:'拉取镜像 62%（示例）',bmcState:'BMC 在线 · 电源开（示例）',state:'进行中',source:'机房 A 执行层 · Ironic / BMH（候选）',created:'10-10 10:10',auth:'已确认',incident:null,
  phases:[
   {name:'授权与预检',state:'成功',at:'10:10',log:'目标允许重装；数据盘保留策略已确认。'},
   {name:'介质 / PXE 引导',state:'成功',at:'10:12',log:'供应网络引导完成（示例）。'},
   {name:'磁盘与镜像',state:'执行中',at:'10:15',log:'正在写入 img-demo-01 到 DEMO-DISK-001（示例进度，非真实执行）。'},
   {name:'OS 安装',state:'未开始'},{name:'首次启动与初始化',state:'未开始'},{name:'SSH / Agent 注册',state:'未开始'},{name:'节点注册',state:'未开始'},{name:'基线验收',state:'未开始'}],
  confirmPoints:['镜像写入完成后确认目标盘范围','节点注册前确认网络准入'],
  acceptance:[['硬件预检','通过','任务预检阶段'],['OS 安装','执行中','当前阶段：磁盘与镜像'],['SSH / Agent','未开始','依赖 OS'],['Node 注册','未开始','依赖 OS'],['集群能力验收','未开始','独立流程，见集群能力'],['GPU 运行能力','未开始','独立流程，见集群能力']]},
 {id:'TASK-DEMO-02',type:'硬件检查',target:'compute-03',template:'gpu-baseline-02',stage:'磁盘重检（重试通过）',subStage:'仅重跑磁盘检查（失败阶段）',bmcState:'BMC 在线 · 电源开（示例）',state:'成功（重检）',source:'机房 A 执行层 · BMH（候选）',created:'10-10 09:50',auth:'已确认',incident:'INC-DEMO-02',
  phases:[
   {name:'授权与预检',state:'成功',at:'09:50',log:'检查范围：CPU / 内存 / 磁盘 / 网卡。'},
   {name:'磁盘检查',state:'失败',at:'09:50',log:'失败：目标盘标识与 gpu-baseline-02 模板策略不匹配；资产保持不可交付，不进入资源池。'},
   {name:'修正与人工确认',state:'成功',at:'10:20',log:'修正模板目标盘选择策略（模板修订留痕）；处理过程记录于故障单 INC-DEMO-02。'},
   {name:'磁盘重检（仅失败阶段）',state:'成功',at:'10:40',log:'按任务重试预检仅重跑磁盘检查；未重装、未清理；硬件快照版本已刷新。'}],
  confirmPoints:['失败阶段重试前必须核对执行器状态','未知状态不得自动重装或清理'],
  acceptance:compute03Story.acceptance},
 {id:'TASK-DEMO-03',type:'集群创建',target:'compute-lab',template:'rke2-general',stage:'纳管',subStage:'Rancher 纳管完成（示例）',bmcState:'—',state:'示例完成',source:'机房 A 执行层 · CAPI / Turtles',created:'10-10 09:00',auth:'已确认',incident:null,
  phases:[{name:'模板与预检',state:'成功',at:'09:00',log:'示例记录。'},{name:'集群创建与纳管',state:'成功',at:'09:20',log:'Rancher 导入成功；能力验收另行执行。'}],
  confirmPoints:[],acceptance:[['API / Node','就绪（示例）','—'],['能力验收','未开始','独立流程']]},
 // 裸金属释放后的回收流程复用装机任务（评审稿 3.3）：数据擦除 → 重装 OS → 硬件复检，通过后成员回池。
 {id:'TASK-DEMO-06',type:'数据擦除与重装',target:'bm-01',template:'linux-baseline-01',stage:'硬件复检',subStage:'回收流程 3/3（示例完成）',bmcState:'BMC 在线 · 电源开（示例）',state:'成功',source:'机房 B 执行层 · Ironic / BMH（候选）',created:'10-12 18:00',auth:'已确认',incident:null,
  phases:[
   {name:'数据擦除',state:'成功',at:'10-12 18:05',log:'按释放单执行擦除；证据留档（示例）。'},
   {name:'重装 OS',state:'成功',at:'10-12 18:40',log:'按整机规格重装；网络信息重新分配。'},
   {name:'硬件复检',state:'成功',at:'10-12 19:10',log:'基线复检通过；成员回池为空闲。'}],
  confirmPoints:['擦除前确认交付单已释放且数据处置约定已核对'],
  acceptance:[['数据擦除','通过（示例）','证据留档'],['OS 重装','通过（示例）','整机规格'],['硬件复检','通过（示例）','回池前置']]},
 {id:'TASK-DEMO-07',type:'维护',target:'old-01',template:'—',stage:'换件与退役登记',subStage:'退役前换件已登记（示例）',bmcState:'—',state:'已完成',source:'机房 A 执行层（示例）',created:'10-09 09:00',auth:'已确认',incident:null,
  phases:[{name:'换件登记',state:'成功',at:'10-09 09:10',log:'登记更换内存条（示例）。'},{name:'退役登记',state:'成功',at:'10-09 09:30',log:'已移出集群后退役；保留资产历史。'}],
  confirmPoints:['退役前确认资产已移出集群或资源池'],
  acceptance:[['换件登记','完成（示例）','资产历史'],['退役','完成（示例）','保留记录']]}
];
export const taskRows=taskRecords.map(t=>[t.id,t.type,t.target,t.region||'实验中心',t.stage,t.state,t.source,t.created]);
// 模型部署后台任务：本质是起 Pod，纳入任务中心统一跟踪；不进入装机任务（provisioningRows）列表。
export const modelDeployTaskRows=[
 ['TASK-DEMO-04','模型部署','s2-model / infer-demo','实验中心','镜像拉取','进行中','机房 A 执行层 · Kubernetes Deployment','10-10 10:35'],
 ['TASK-DEMO-05','模型部署','s2-test / batch-demo','实验中心','Pod 调度','排队中','机房 A 执行层 · Kubernetes Deployment','10-10 10:42']
];
export const allTaskRows=[...taskRows,...modelDeployTaskRows];
// 装机任务列表：装机 / 硬件检查 / 数据擦除与重装属于装机管理页签；集群创建与模型部署只进任务中心。
export const PROVISIONING_TYPES=['装机','硬件检查','数据擦除与重装'];
export const provisioningRows=taskRecords.filter(t=>PROVISIONING_TYPES.includes(t.type)).map(t=>[t.id,t.target,t.template,t.stage,t.subStage,t.bmcState,t.source]);

// ---------- BMC ----------
export const bmcRecords=[
 {id:'compute-01',addr:'bmc-01.example.invalid',proto:'Redfish',conn:'已登记',power:'开机',snap:'已采集',sensor:'正常（示例）',
  detail:{connText:'已登记，未连接真实接口；连接测试需授权',snapshotText:'HW-SNAPSHOT-DEMO-01 · 采集于 10-10 10:24 · 示例',sensorText:'温度 / 电压示例正常；真实传感器未接入',mediaText:'未挂载',kvmText:'厂商能力待确认',powerOps:'可申请：电源变更需授权与预检',events:[['10:24','硬件快照采集完成','示例'],['—','电源 / 介质事件','无记录']]}},
 {id:'compute-02',addr:'bmc-03.example.invalid',proto:'Redfish',conn:'已登记',power:'开机',snap:'部分采集',sensor:'待复核',
  detail:{connText:'已登记，未连接真实接口',snapshotText:'部分采集：电源 / 温度；GPU 相关联指标待复核（INC-DEMO-01）',sensorText:'GPU-DEMO-002 相关节点待复核；无数据项标未知',mediaText:'未挂载',kvmText:'厂商能力待确认',powerOps:'可申请：复位类动作需变更窗口与二次确认',events:[['10:24','GPU 设备事件待带外复核','关联 INC-DEMO-01'],['—','电源 / 介质事件','无记录']]}},
 {id:'reserve-01',addr:'bmc-02.example.invalid',proto:'Redfish / IPMI',conn:'待测试',power:'未知',snap:'未采集',sensor:'无数据',
  detail:{connText:'待测试；连接测试需要授权',snapshotText:'未采集',sensorText:'无数据：显式标未知，不视为正常或空闲',mediaText:'未知',kvmText:'未知',powerOps:'不可用：BMC 无数据且不在当前凭据引用授权范围内',events:[['09:40','采集无数据 → ALERT-DEMO-02','跟踪中，未建故障单']]}}
];
export const bmcRows=bmcRecords.map(b=>[b.id,b.addr,b.proto,b.conn,b.power,b.snap,b.sensor]);
export function bmcFieldMap(id){const b=bmcRecords.find(x=>x.id===id);if(!b)return null;const d=b.detail;return {'资产':b.id,'BMC 地址':b.addr,'协议':b.proto+'（示例）','连接状态':d.connText,'电源状态':b.power,'远程介质':d.mediaText,'KVM/VNC':d.kvmText,'硬件快照':d.snapshotText,'传感器':d.sensorText,'电源操作':d.powerOps};}

// ---------- 硬件能力 ----------
export const capabilityRecords=[
 {id:'compute-01',cpu:'32 核 / 192 GiB',disknet:'960 GB / 4 NIC',gpu:'8 × 示例 GPU',topo:'NUMA 待采集',baseline:'通过（示例）',deliverable:'是'},
 {id:'compute-02',cpu:'32 核 / 192 GiB',disknet:'960 GB / 4 NIC',gpu:'8 × 示例 GPU',topo:'NUMA 待采集',baseline:'通过（示例）',deliverable:'是（GPU-DEMO-002 异常影响部分整卡）'},
 {id:'compute-03',cpu:'32 核 / 192 GiB',disknet:'960 GB / 4 NIC',gpu:'8 × 示例 GPU',topo:'NUMA 待采集',baseline:'通过（10-10 重检）',deliverable:'否（未装机 / 未入集群）'},
 {id:'control-01',cpu:'64 核 / 64 GiB',disknet:'960 GB / 2 NIC',gpu:'无',topo:'—',baseline:'通过（示例）',deliverable:'是（控制面不承载 GPU）'}
];
export const capabilityRows=capabilityRecords.map(c=>[c.id,c.cpu,c.disknet,c.gpu,c.topo,c.baseline,c.deliverable]);

// ---------- 集群 / 节点 / GPU ----------
export const clusterRows=[
 ['compute-lab','实验中心','RKE2 / 示例','1 / 2','就绪','已导入','部分通过','CAPI 候选'],
 ['cpu-lab','实验中心','RKE2 / 示例','1 / 1','未知','未连接','未检查','已有集群接入']
];
export const nodeRecords=[
 {id:'compute-01',cluster:'compute-lab',role:'工作节点',state:'Ready',gpu:'8 × 示例 GPU',asset:'compute-01',sched:'允许'},
 {id:'compute-02',cluster:'compute-lab',role:'工作节点',state:'Ready',gpu:'8 × 示例 GPU（1 卡异常）',asset:'compute-02',sched:'允许（异常卡不可分配）'},
 {id:'demo-control-01',cluster:'compute-lab',role:'控制面',state:'Ready',gpu:'无',asset:'control-01',sched:'控制面策略'},
 {id:'cpu-worker-01',cluster:'cpu-lab',role:'工作节点',state:'Unknown',gpu:'无',asset:'未关联资产',sched:'不允许（状态未知）'}
];
export const nodeRows=nodeRecords.map(n=>[n.id,n.cluster,n.role,n.state,n.gpu,n.asset,n.sched]);
export const gpuRecords=[
 {id:'GPU-DEMO-001',node:'compute-01',model:'示例 GPU',mem:'80 GiB',mode:'整卡',health:'示例正常',alloc:'S2 / 模型工程'},
 {id:'GPU-DEMO-002',node:'compute-02',model:'示例 GPU',mem:'80 GiB',mode:'整卡',health:'异常（INC-DEMO-01）',alloc:'占用待核实（ALLOC-DEMO-02）'}
];
export const gpuRows=gpuRecords.map(g=>[g.id,g.node,g.model,g.mem,g.mode,g.health,g.alloc]);

// ---------- 配额 / 分配 / 容量 ----------
export const quotaRecords=[
 {id:'S2 / 模型工程',ext:'project-demo-model',pool:'gpu-general',whole:8,used:6,reserved:0,running:5,auth:'S4 授权引用'},
 {id:'S2 / 联调环境',ext:'project-demo-test',pool:'gpu-general',whole:4,used:2,reserved:2,running:1,auth:'S4 授权引用'}
];
// 配额不设独立页面：quotaRecords 供资源池“项目配额”口径与测试使用，不派生列表页行数据。
export const allocationRecords=[
 {id:'ALLOC-DEMO-01',project:'S2 / 模型工程',source:'S3 申请引用',mode:'整卡',qty:6,state:'已交付',env:'s2-model',lease:'待约定'},
 {id:'ALLOC-DEMO-02',project:'S2 / 联调环境',source:'S3 申请引用',mode:'整卡',qty:2,state:'已交付',env:'s2-test',lease:'待约定'},
 {id:'ALLOC-DEMO-03',project:'S2 / 联调环境',source:'示例申请',mode:'整卡',qty:2,state:'已预留',env:'待验收',lease:'待约定'},
 {id:'ALLOC-DEMO-04',project:'S2 / 历史评测',source:'S3 申请引用',mode:'整卡',qty:2,state:'已释放',env:'ENV-DEMO-03（已回收）',lease:'租期已结束'}
];
export const POOL_CAPACITY={pool:'gpu-general',physical:16,allocated:8,reserved:2,available:6};
export function capacityCheck(){
 const allocated=allocationRecords.filter(a=>a.state==='已交付').reduce((s,a)=>s+a.qty,0);
 const reserved=allocationRecords.filter(a=>a.state==='已预留').reduce((s,a)=>s+a.qty,0);
 return {allocated,reserved,available:POOL_CAPACITY.physical-allocated-reserved};
}
// ---------- 资源池（三类示例：专属 / 共享 / 裸金属；每个池属于一个机房 D8） ----------
// 专属池：单一项目独占，容量即配额，不做配额切分；共享池：多项目按配额共享；裸金属池：整机租赁。
export const poolRecords=[
 {id:'dedicated-gpu',type:'专属资源池',room:'room-demo-A',cluster:'compute-lab',mode:'整卡独占',members:'独占节点 × 1',physical:'8 卡',allocRes:'6 / 0',available:'2 卡（示例）',dedicatedTo:'S2 / 生产推理（示例项目）'},
 {id:'gpu-general',type:'共享资源池',room:'room-demo-A',cluster:'compute-lab',mode:'整卡',members:'节点 × 2',physical:'16 卡',allocRes:'8 / 2',available:'6 卡（示例）'},
 {id:'baremetal-01',type:'裸金属资源池',room:'room-demo-B',cluster:null,mode:'整机',members:'整机 × 2',physical:'2 台',allocRes:'1 / 0',available:'1 台（示例）'}
];
export const poolRows=poolRecords.map(p=>[p.id,p.type,roomName(p.room),p.mode,p.members,p.physical,p.allocRes,p.available]);
// 裸金属池成员状态：空闲 / 已预留 / 已租出 / 回收中（评审稿 3.3 / 资产阶段联动）。
export const baremetalMembers=[
 {asset:'bm-01',model:'8 × 示例 GPU / 64 核 / 1.5 TiB / 本地 NVMe（示例）',state:'空闲',order:'DELIV-DEMO-08（回收完成回池）',lease:'—'},
 {asset:'bm-02',model:'8 × 示例 GPU / 64 核 / 1.5 TiB / 本地 NVMe（示例）',state:'已租出',order:'DELIV-DEMO-07',lease:'租期至 10-20（示例）'}
];
// 专属池成员：独占节点（示例登记，独立于共享池节点标签）。
export const dedicatedPoolMembers=[
 {node:'dedicated-node-01',gpu:'8 × 示例 GPU',state:'独占运行',order:'DELIV-DEMO-09',note:'独占项目使用中（示例）'}
];

// ---------- 环境申请与匹配 ----------
export const requestRecords=[
 {id:'REQ-DEMO-01',project:'S2 / 模型工程',runtime:'vLLM / image-ref',mode:'整卡',qty:4,storage:'model-storage',state:'待匹配（容量满足，配额不足）',source:'S2'},
 {id:'REQ-DEMO-02',project:'S2 / 联调环境',runtime:'runtime-demo',mode:'整卡',qty:2,storage:'PVC / 1 TiB',state:'已预留',source:'S3 引用'},
 {id:'REQ-DEMO-03',project:'S2 / 新推理服务',runtime:'torchserve-rc / image-ref-rc',mode:'整卡',qty:8,storage:'model-storage',state:'匹配失败（可分配不足）',source:'S2'}
];
export const requestMatch={
 'REQ-DEMO-01':{
  capacity:{verdict:'通过',detail:'需求 整卡 × 4 ≤ gpu-general 可分配 6（物理 16 − 已分配 8 − 预留 2）'},
  quota:{verdict:'不足',detail:'S2 / 模型工程 配额 8，已分配 6，剩余 2 < 需求 4；需先完成配额调整审批'},
  next:[['配额调整审批（经 S3/S4 审批流程，无独立页面）',null,'S2 / 模型工程'],['资源池容量口径','pool','gpu-general'],['已交付分配（等待释放）','allocation','ALLOC-DEMO-01']],
  conclusion:'待匹配：容量满足、配额不足；配额调整确认后才创建预留。'},
 'REQ-DEMO-02':{
  capacity:{verdict:'通过（已执行）',detail:'需求 整卡 × 2；已生成预留 ALLOC-DEMO-03'},
  quota:{verdict:'用满',detail:'S2 / 联调环境 配额 4 = 已分配 2 + 预留 2；预留不是实际占用'},
  next:[['交付环境','environment','ENV-DEMO-02']],
  conclusion:'已预留；底座验收通过并经 S2 接收前不算交付。'},
 'REQ-DEMO-03':{
  capacity:{verdict:'失败',detail:'需求 整卡 × 8 > gpu-general 可分配 6（物理 16 − 已分配 8 − 预留 2）'},
  quota:{verdict:'未配置',detail:'项目尚未绑定配额；需先创建项目配额（S4 引用）'},
  next:[['降低规格重提（≤ 6 卡）','request','REQ-DEMO-03'],['等待释放','allocation','ALLOC-DEMO-01'],['扩容节点（候选）','cluster','compute-lab']],
  conclusion:'匹配失败：容量与配额均不满足；不做部分匹配交付，也不把预留当成占用。'}
};

// ---------- 交付环境与释放 ----------
export const deliveryRecords=[
 {id:'ENV-DEMO-01',project:'S2 / 模型工程',ns:'compute-lab / s2-model',res:'整卡 × 6',accept:'通过（示例）',s2:'待确认',valid:'待约定'},
 {id:'ENV-DEMO-02',project:'S2 / 联调环境',ns:'compute-lab / s2-test',res:'整卡 × 2',accept:'待验收',s2:'未接收',valid:'待约定'},
 {id:'ENV-DEMO-03',project:'S2 / 历史评测',ns:'compute-lab / s2-eval',res:'整卡 × 2（已回收）',accept:'通过（历史）',s2:'已确认',valid:'已到期释放'}
];
export const deliveryLife={
 'ENV-DEMO-01':{
  deliverables:[['集群 / Namespace','compute-lab / s2-model'],['配额','项目配额引用：整卡上限 8'],['权限','S4 项目授权引用，不含明文'],['镜像 / 存储','Harbor 引用 / model-storage 引用'],['监控','底座指标引用；应用指标归 S2']],
  baseAccept:'通过（示例）：节点 / 网络 / 存储 / 设备 / 镜像检查',
  s2Accept:'待确认：等待 S2 最小部署样例与双方确认；平台就绪 ≠ 模型就绪',
  release:{gate:'未进入释放流程：S2 尚未确认接收',checks:[['S2 工作负载停止','不适用（未进入释放流程）'],['数据处置确认','未开始'],['权限撤销','未开始'],['分配释放','未开始']]}},
 'ENV-DEMO-02':{
  deliverables:[['集群 / Namespace','compute-lab / s2-test'],['配额','项目配额引用：整卡上限 4'],['权限','S4 项目授权引用'],['镜像 / 存储','Harbor 引用 / PVC 引用'],['监控','底座指标引用']],
  baseAccept:'待验收：底座检查未完成，不满足交付条件',
  s2Accept:'未接收：S2 未确认；底座验收与 S2 接收分别记录',
  release:{gate:'释放预检不通过：工作负载 batch-demo 处于 Pending 未停止；且底座未验收、S2 未接收',
   checks:[['S2 工作负载停止','未满足（batch-demo Pending）'],['数据处置确认','未开始'],['权限撤销','未开始'],['分配释放','未开始']]}},
 'ENV-DEMO-03':{
  deliverables:[['集群 / Namespace','compute-lab / s2-eval（已回收）'],['配额','随释放撤销'],['权限','已撤销（S4 引用）'],['镜像 / 存储','数据按保留策略处置（引用）'],['监控','历史指标归档（示例）']],
  baseAccept:'通过（历史记录，10-09）',
  s2Accept:'已确认（10-09）：双方完成交付确认',
  release:{gate:'已释放（10-09 20:00，示例）：释放结果如下',checks:[['S2 工作负载停止','已停止（eval-demo 完成后由 S2 删除）'],['数据处置','按保留策略处置；清理需独立授权（引用）'],['权限撤销','项目权限已撤销（S4 引用）'],['分配释放','ALLOC-DEMO-04 已释放，2 卡回到可分配']],note:'共享节点未退出、未重装、未清盘。'}}
};

// ---------- 工作负载 ----------
// 工作负载不再单列页面：随交付单详情“工作负载”页签展示（平台状态 / 应用状态 / 模型就绪分层）。
export const workloadRecords=[
 {id:'infer-demo',env:'ENV-DEMO-01',type:'Deployment',platform:'Running',app:'Ready',model:'待 S2 验收',at:'10-10 10:24'},
 {id:'batch-demo',env:'ENV-DEMO-02',type:'Job',platform:'Pending',app:'未开始',model:'不适用',at:'10-10 10:20'},
 {id:'eval-demo',env:'ENV-DEMO-03',type:'Job',platform:'Succeeded',app:'已完成',model:'不适用（环境已释放）',at:'10-09 18:40'}
];

// ---------- 交付单状态机（评审稿 3.3.4：申请 / 分配 / 交付 / 运行 / 释放 五阶段，两级状态） ----------
// stageIdx：0 申请 · 1 分配 · 2 交付 · 3 运行 · 4 释放；final 为终态（已拒绝 / 已过期 / 已取消 / 已释放）。
// 关联事实仍以各自记录为准（requestMatch、allocationRecords、deliveryLife、baremetalMembers）。
export const ORDER_STAGES=['申请','分配','交付','运行','释放'];
export const ORDER_FINALS=['已拒绝','已过期','已取消','已释放'];
export const orderStageLabel=order=>order.final?order.final:`${ORDER_STAGES[order.stageIdx]} · ${order.sub}`;

export const deliveryOrderRecords=[
 {id:'DELIV-DEMO-01',kind:'集群池',pool:'gpu-general',project:'S2 / 模型工程',stageIdx:2,sub:'已交付',final:null,
  request:{id:'未记录（S3 引用）',demand:'整卡 × 6',runtime:'vLLM / image-ref',at:'10-08'},
  check:{capacity:'通过',quota:'通过',note:'历史申请，来源为 S3 引用（示例）'},
  reserve:{alloc:'ALLOC-DEMO-01',state:'已分配',until:'—',bound:'绑定 compute-01 / compute-02 · 整卡 × 6'},
  delivery:{env:'ENV-DEMO-01',ns:'compute-lab / s2-model',state:'已交付',accept:'底座验收通过（示例）'},
  run:{state:'待 S2 接收',received:null,workloads:['infer-demo · 平台 Running · 应用 Ready · 模型待 S2 验收']},
  release:{state:'未进入',gate:'S2 尚未确认接收，不满足释放前置'},
  timeline:[['10-08 10:00','申请提交','来源：S3 引用'],['10-08 10:05','校验通过','容量 / 配额分别通过'],['10-08 10:10','预留并分配','ALLOC-DEMO-01 · 绑定节点'],['10-09 09:00','环境就绪','ENV-DEMO-01 · Namespace s2-model'],['10-09 09:30','底座验收通过','等待 S2 接收确认']],
  tasks:['TASK-DEMO-03']},
 {id:'DELIV-DEMO-02',kind:'集群池',pool:'gpu-general',project:'S2 / 联调环境',stageIdx:2,sub:'已交付',final:null,
  request:{id:'未记录',demand:'整卡 × 2',runtime:'runtime-demo',at:'10-06'},
  check:{capacity:'通过',quota:'通过',note:'历史申请（示例）'},
  reserve:{alloc:'ALLOC-DEMO-02',state:'已分配',until:'—',bound:'占用待核实（INC-DEMO-01 · GPU-DEMO-002 异常）'},
  delivery:{env:'未记录（s2-test）',ns:'compute-lab / s2-test',state:'已交付',accept:'底座通过（历史，示例）'},
  run:{state:'运行中（占用待核实）',received:'10-07（示例）',workloads:['batch-demo 相关（示例）']},
  release:{state:'未进入',gate:'占用待核实（INC-DEMO-01），不自动释放'},
  timeline:[['10-06 10:00','申请提交','历史申请'],['10-06 10:05','校验通过','—'],['10-06 10:20','分配','ALLOC-DEMO-02'],['10-07 09:00','交付','s2-test'],['10-10 10:24','异常关联','INC-DEMO-01 · GPU 占用待核实']],
  tasks:[]},
 {id:'DELIV-DEMO-03',kind:'集群池',pool:'gpu-general',project:'S2 / 联调环境',stageIdx:1,sub:'已预留（待底座验收）',final:null,
  request:{id:'REQ-DEMO-02',demand:'整卡 × 2',runtime:'runtime-demo',at:'10-10 10:00'},
  check:{capacity:'通过（已执行）',quota:'用满',note:'配额 4 = 已分配 2 + 预留 2；预留不是实际占用'},
  reserve:{alloc:'ALLOC-DEMO-03',state:'已预留',until:'预留至 10-17 10:40（示例，超时自动过期）',bound:'分配时才绑定具体节点 / GPU'},
  delivery:{env:'ENV-DEMO-02',ns:'compute-lab / s2-test',state:'待验收',accept:'底座验收未完成，不满足交付条件'},
  run:{state:'未进入',received:null,workloads:['batch-demo · 平台 Pending · 未停止（释放预检阻塞项）']},
  release:{state:'未进入',gate:'释放预检不通过：batch-demo Pending；底座未验收、S2 未接收'},
  timeline:[['10-10 10:00','申请提交','REQ-DEMO-02 · 来源 S3 引用'],['10-10 10:02','校验通过','容量通过 / 配额用满'],['10-10 10:05','生成预留','ALLOC-DEMO-03 · 带有效期'],['—','待底座验收','验收通过并经 S2 接收前不算交付']],
  tasks:[]},
 {id:'DELIV-DEMO-04',kind:'集群池',pool:'gpu-general',project:'S2 / 历史评测',stageIdx:4,sub:'已释放',final:'已释放',
  request:{id:'未记录',demand:'整卡 × 2',runtime:'—',at:'10-05'},
  check:{capacity:'通过',quota:'通过',note:'历史申请（示例）'},
  reserve:{alloc:'ALLOC-DEMO-04',state:'已释放',until:'—',bound:'2 卡已回池（10-09）'},
  delivery:{env:'ENV-DEMO-03',ns:'compute-lab / s2-eval（已回收）',state:'已回收',accept:'通过（历史，10-09）'},
  run:{state:'已结束',received:'10-05（示例）',workloads:['eval-demo · 已完成并删除']},
  release:{state:'已释放（10-09 20:00，示例）',gate:'工作负载已停止 · 数据按保留策略处置 · 权限撤销 · 分配释放'},
  timeline:[['10-05 09:00','申请与交付','历史记录'],['10-09 18:40','工作负载完成','eval-demo 由 S2 删除'],['10-09 20:00','释放完成','2 卡回到可分配；共享节点未清盘']],
  tasks:[]},
 {id:'DELIV-DEMO-05',kind:'集群池',pool:'gpu-general',project:'S2 / 模型工程',stageIdx:0,sub:'校验中（配额不足，调整审批中）',final:null,
  request:{id:'REQ-DEMO-01',demand:'整卡 × 4',runtime:'vLLM / image-ref',at:'10-10 11:00'},
  check:{capacity:'通过',quota:'不足',note:'配额 8，已分配 6，剩余 2 < 需求 4；调整审批经 S3 / S4'},
  reserve:{alloc:null,state:'未创建',until:'—',bound:'校验通过后才创建预留'},
  delivery:null,
  run:{state:'未进入',received:null,workloads:[]},
  release:{state:'未进入',gate:'—'},
  timeline:[['10-10 11:00','申请提交','REQ-DEMO-01'],['10-10 11:01','容量校验通过','可分配 6 ≥ 需求 4'],['10-10 11:01','配额校验不足','待配额调整审批'],['—','等待审批','确认后才创建预留']],
  tasks:[]},
 {id:'DELIV-DEMO-06',kind:'集群池',pool:'gpu-general',project:'S2 / 新推理服务',stageIdx:0,sub:'校验不通过',final:'已拒绝',
  request:{id:'REQ-DEMO-03',demand:'整卡 × 8',runtime:'torchserve-rc / image-ref-rc',at:'10-10 11:30'},
  check:{capacity:'失败',quota:'未配置',note:'需求 8 > 可分配 6；项目未绑定配额。不做部分匹配交付'},
  reserve:{alloc:null,state:'未创建',until:'—',bound:'—'},
  delivery:null,
  run:{state:'未进入',received:null,workloads:[]},
  release:{state:'未进入',gate:'—'},
  timeline:[['10-10 11:30','申请提交','REQ-DEMO-03'],['10-10 11:31','容量校验失败','需求 8 > 可分配 6'],['10-10 11:31','配额未配置','项目尚未绑定配额'],['10-10 11:32','已拒绝','终态；可降低规格重提']],
  tasks:[]},
 // 裸金属路径示例（评审稿 3.3：整机租赁，交付物含 OS / 网络信息 / 登录凭据引用）。
 {id:'DELIV-DEMO-07',kind:'裸金属池',pool:'baremetal-01',project:'S3 / 整机租赁（租户示例）',stageIdx:3,sub:'运行中',final:null,
  request:{id:'REQ-BM-DEMO-01',demand:'整机 × 1 · 8 卡 GPU 机型',runtime:'租户自备 OS 镜像（示例）',at:'10-12 09:00'},
  check:{capacity:'通过',quota:'—',note:'裸金属池按整机台数校验；申请方与计量口径待 X4 确认'},
  reserve:{alloc:'BM-ALLOC-01',state:'已分配',until:'—',bound:'绑定整机 bm-02 · 机房 B'},
  delivery:{env:'整机 bm-02',ns:'—',state:'已交付',accept:'带外与硬件层验收通过（示例）'},
  run:{state:'运行中',received:'10-12 10:00（租户确认）',workloads:['租户整机使用 · OS 内指标由租户负责，S1 仅带外监控']},
  release:{state:'未进入',gate:'租期至 10-20（示例）；释放后回收流程：数据擦除 + 重装 OS + 硬件复检'},
  timeline:[['10-12 09:00','申请提交','整机 × 1'],['10-12 09:05','校验通过','空闲整机 1 台'],['10-12 09:10','预留与绑定','bm-02 · 已租出'],['10-12 09:40','整机交付','OS / 网络信息 / 登录凭据引用'],['10-12 10:00','租户确认接收','进入运行；租期开始']],
  tasks:[]},
 {id:'DELIV-DEMO-08',kind:'裸金属池',pool:'baremetal-01',project:'S3 / 整机租赁（租户示例）',stageIdx:4,sub:'已释放（回收完成）',final:'已释放',
  request:{id:'REQ-BM-DEMO-00',demand:'整机 × 1 · 8 卡 GPU 机型',runtime:'—',at:'10-01'},
  check:{capacity:'通过',quota:'—',note:'历史申请（示例）'},
  reserve:{alloc:'BM-ALLOC-00',state:'已释放',until:'—',bound:'整机 bm-01 · 回收后回池空闲'},
  delivery:{env:'整机 bm-01',ns:'—',state:'已回收',accept:'带外与硬件层验收通过（历史）'},
  run:{state:'已结束',received:'10-02（示例）',workloads:[]},
  release:{state:'已释放（10-12 19:10，示例）',gate:'回收三步：数据擦除 + 重装 OS + 硬件复检（TASK-DEMO-06）'},
  timeline:[['10-01 10:00','申请与交付','bm-01 整机'],['10-12 17:00','释放申请','租期结束'],['10-12 18:00','回收任务执行','TASK-DEMO-06'],['10-12 19:10','回收完成','硬件复检通过 · 成员回池空闲']],
  tasks:['TASK-DEMO-06']},
 // 专属池示例（独占项目内申请）：容量即配额，不做多项目配额切分，校验只看池内可分配。
 {id:'DELIV-DEMO-09',kind:'集群池',pool:'dedicated-gpu',project:'S2 / 生产推理（示例项目）',stageIdx:3,sub:'运行中',final:null,
  request:{id:'REQ-DED-01',demand:'整卡 × 6（独占池内）',runtime:'vLLM 生产镜像（示例）',at:'10-11 09:00'},
  check:{capacity:'通过',quota:'不适用（专属池独占，容量即配额）',note:'独占项目内申请，无多项目配额竞争'},
  reserve:{alloc:'DED-ALLOC-01',state:'已分配',until:'—',bound:'绑定 dedicated-node-01 · 整卡 × 6（独占）'},
  delivery:{env:'DED-ENV-01',ns:'compute-lab / s2-prod（独占）',state:'已交付',accept:'底座与独占节点验收通过（示例）'},
  run:{state:'运行中',received:'10-11 11:00（项目确认）',workloads:['prod-infer · 平台 Running · 独占节点（示例）']},
  release:{state:'未进入',gate:'独占池释放随项目生命周期；节点不回共享池'},
  timeline:[['10-11 09:00','申请提交','REQ-DED-01 · 独占项目内申请'],['10-11 09:02','容量校验通过','池内可分配 8 ≥ 需求 6；配额不适用'],['10-11 09:10','预留与绑定','dedicated-node-01'],['10-11 10:30','环境交付','DED-ENV-01 · 独占 Namespace'],['10-11 11:00','项目确认接收','进入运行']],
  tasks:[]}
];
export const deliveryOrderRows=deliveryOrderRecords.map(o=>[o.id,o.kind,o.pool,o.project,orderStageLabel(o),o.request.demand,
 o.kind==='裸金属池'?(o.run.received||'—'):(o.delivery?(o.run.received?'已接收':(o.delivery.state==='已交付'?'待接收':'—')):'—'),
 o.reserve.until==='—'?'—':o.reserve.until]);

// ---------- 镜像 / 会话 / 告警 / 故障 ----------
export const imageRows=[
 ['linux-baseline-01','Ubuntu / x86_64','img-demo-01','系统盘覆盖 / 数据盘保留','Operator 管理','示例已验证'],
 ['gpu-baseline-02','Linux / x86_64','img-demo-02','按磁盘序列号选择（r02 修订：目标盘策略修正）','镜像预装（候选）','待验证（r01 失败 / r02 重检通过）']
];
export const sessionRows=[
 ['SESSION-DEMO-01','demo-admin','compute-01','WebShell','10-10 09:30','已结束','平台会话审计（示例）'],
 ['SESSION-DEMO-02','demo-user','pod-demo','Pod exec','10-10 10:00','待授权','审计方案待定'],
 ['SESSION-DEMO-03','demo-admin','management-demo / apiserver','Kubernetes API','10-10 11:02','已结束','API Audit 引用（候选）'],
 ['SESSION-DEMO-04','demo-hw','compute-02 / BMC','带外 KVM','10-10 11:10','待授权','厂商留痕待适配']
];
// 告警只保存机器信号；确认、静默与恢复是独立事实，不混入故障单。
export const alertRecords=[
 {id:'ALERT-DEMO-01',level:'P0',source:'DCGM / 设备插件（候选）',object:'compute-02 / GPU-DEMO-002',message:'设备不可分配',signal:'触发中',ack:'已确认',silenced:false,started:'10-10 10:24',recoveredAt:null,rule:'gpu-unavailable',impact:'ALLOC-DEMO-02 / ENV-DEMO-02 · 模型影响待 S2 确认',incidentIds:['INC-DEMO-01'],objects:[['资产','compute-02','asset'],['GPU','GPU-DEMO-002','gpu'],['分配','ALLOC-DEMO-02','allocation']],timeline:[['10-10 10:24','规则触发','设备不可分配持续 5 分钟（示例）'],['10-10 10:26','关联故障','INC-DEMO-01，规则建单示例，不代表全量自动建单'],['10-10 10:40','人工确认','已关注；设备信号仍在触发']]},
 {id:'ALERT-DEMO-02',level:'P2',source:'Redfish exporter（候选）',object:'reserve-01',message:'BMC 无数据',signal:'触发中',ack:'已确认',silenced:true,started:'10-10 09:40',recoveredAt:null,rule:'bmc-no-data',impact:'未交付资产 · 不推断恢复或可分配',incidentIds:[],objects:[['资产','reserve-01','asset'],['带外','reserve-01','bmc']],timeline:[['10-10 09:40','无数据规则触发','未收到带外采集，不视为健康'],['10-10 09:45','人工确认','值班人员已关注'],['10-10 09:46','通知静默','维护窗口 30 分钟（固定示例），信号仍触发']]},
 {id:'ALERT-DEMO-03',level:'P1',source:'Kubernetes Events / 规则（候选）',object:'compute-lab / infer-demo',message:'Pod 异常重启',signal:'触发中',ack:'未确认',silenced:false,started:'10-10 10:30',recoveredAt:null,rule:'pod-restarts',impact:'ENV-DEMO-01 / s2-model · 应用原因待定位',incidentIds:[],objects:[['集群','compute-lab','cluster'],['工作负载','infer-demo','workload'],['环境','ENV-DEMO-01','environment']],timeline:[['10-10 10:30','规则触发','重启次数达到示例阈值；原始 Event 不等于故障单']]},
 {id:'ALERT-DEMO-04',level:'P1',source:'DCGM（候选）',object:'compute-01 / GPU-DEMO-001',message:'GPU 温度超过基线（历史）',signal:'已恢复',ack:'已确认',silenced:false,started:'10-09 14:00',recoveredAt:'10-09 14:35',rule:'gpu-temperature',impact:'交付前验证节点，未影响 S2 环境',incidentIds:['INC-DEMO-03'],objects:[['资产','compute-01','asset'],['GPU','GPU-DEMO-001','gpu']],timeline:[['10-09 14:00','规则触发','温度超过示例基线'],['10-09 14:06','人工确认 / 关联故障','关联 INC-DEMO-03，与降频信号合并定位'],['10-09 14:35','信号恢复','冷却设置恢复后指标回归基线，故障仍需复验关闭']]},
 {id:'ALERT-DEMO-05',level:'P1',source:'集群 DNS 探针（候选）',object:'control-01 / compute-lab',message:'交付前 DNS 探针失败（历史）',signal:'已恢复',ack:'已确认',silenced:false,started:'10-08 09:00',recoveredAt:'10-08 09:40',rule:'cluster-dns',impact:'交付前测试，无已交付业务影响',incidentIds:['INC-DEMO-04'],objects:[['资产','control-01','asset'],['集群','compute-lab','cluster']],timeline:[['10-08 09:00','规则触发','节点 DNS 初始化配置不匹配'],['10-08 09:10','人工确认 / 关联故障','关联 INC-DEMO-04'],['10-08 09:40','信号恢复','配置修正，后续由 S1 验收和复盘归档']]},
 {id:'ALERT-DEMO-06',level:'P2',source:'DCGM（候选）',object:'compute-01 / GPU-DEMO-001',message:'GPU 热降频（历史）',signal:'已恢复',ack:'已确认',silenced:false,started:'10-09 14:02',recoveredAt:'10-09 14:35',rule:'gpu-throttling',impact:'交付前验证节点，与温度告警属于同一故障',incidentIds:['INC-DEMO-03'],objects:[['资产','compute-01','asset'],['GPU','GPU-DEMO-001','gpu']],timeline:[['10-09 14:02','规则触发','采集到热降频信号'],['10-09 14:06','关联已有故障','关联 INC-DEMO-03，不重复建单'],['10-09 14:35','信号恢复','冷却设置修正后降频结束']]}
];
export function selectAlerts(view){
 return alertRecords.filter(a=>view==='告警历史'?a.signal==='已恢复':a.signal==='触发中');
}
// 行契约：ID、级别、来源、对象、现象、信号、确认、通知、触发时间、故障引用。
export const alertRows=alertRecords.map(a=>[a.id,a.level,a.source,a.object,a.message,a.signal,a.ack,a.silenced?'已静默':'正常通知',a.started,a.incidentIds.join(' / ')||'—']);
export const incidentRows=Object.values(INCIDENTS).map(i=>[i.id,i.title,i.severity,i.phase,i.owner,i.trigger,i.started]);

// ---------- 通知渠道 ----------
// 列：渠道 / 类型 / 接收对象 / 级别路由 / 状态。渠道只记录路由约定，不保存真实联系方式。
export const channelRows=[
 ['oncall-sms','短信','S1 值班组','P0','已启用（示例）'],
 ['oncall-mail','邮件','S1 / S2 联系人','P0 / P1','已启用（示例）'],
 ['wechat-ops','企业微信','S1 运维群','P1 / P2','已启用（示例）'],
 ['phone-p0','电话','S1 值班负责人','P0','待验证'],
 ['webhook-demo','Webhook','外部工单系统（引用）','P0 / P1','待接入']
];

// ---------- 基础服务实例数据（评审稿 3.9：镜像 / 数据库做真实维护功能，存储只读骨架） ----------
// 镜像制品与被引用关系：被装机模板引用的镜像删除前拦截；S2 模型镜像由 S2 自管。
export const registryImages=[
 {project:'registry-demo / s1-infra',tag:'img-demo-01',digest:'sha256:demo-01（引用）',size:'2.1 GiB',pushed:'10-08 09:00',refs:'linux-baseline-01（装机模板）'},
 {project:'registry-demo / s1-infra',tag:'img-demo-02',digest:'sha256:demo-02（引用）',size:'2.4 GiB',pushed:'10-09 15:00',refs:'gpu-baseline-02（装机模板 r02）'},
 {project:'registry-demo / s1-infra',tag:'img-demo-03',digest:'sha256:demo-03（引用）',size:'2.2 GiB',pushed:'10-11 11:00',refs:'无引用（可删除；删除前仍核对保留策略）'},
 {project:'registry-demo / s2-models',tag:'image-ref',digest:'sha256:s2-ref（S2 提供）',size:'6.8 GiB',pushed:'10-10 10:00',refs:'S2 模型镜像（S2 自管，S1 不接管制品主数据）'}
];
export const registryImageRows=registryImages.map(i=>[i.project,i.tag,i.digest,i.size,i.pushed,i.refs]);
// 数据库白名单参数：一期只开放白名单参数调整，走二次确认，留变更记录与旧值（D12）。
export const dbParameters=[
 ['max_connections','100','白名单可调','调整需二次确认；留变更记录与旧值'],
 ['shared_buffers','16 GiB','白名单可调','示例：重启生效'],
 ['work_mem','64 MiB','白名单可调','会话级影响'],
 ['archive_timeout','600 s','白名单可调','—'],
 ['fsync','on','只读','核心参数不开放页面调整']
];
export const dbConnections=[
 ['pg-cluster-demo','连接数 12 / 上限 100（示例）','活跃会话 3','Web SQL 走默认只读账号'],
 ['mysql-cluster-demo','未接入','—','参数与连接统计待接入']
];

// ---------- 平台服务管理 ----------
// S2–S6 各平台自身服务的常用 k8s 操作封装；列：平台 / 服务 / 类型 / 状态 / 常用操作。
export const platformServiceRows=[
 ['S2 模型工程','模型网关','Deployment','运行中（示例）','重启 / 扩缩容 / 日志 / 回滚'],
 ['S2 模型工程','推理服务 infer-demo','Deployment','运行中（示例）','重启 / 扩缩容 / 日志 / 回滚'],
 ['S3 业务编排','订单服务','Deployment','运行中（示例）','重启 / 扩缩容 / 日志'],
 ['S4 身份权限','IAM 服务','StatefulSet','运行中（示例）','重启 / 日志 / 回滚'],
 ['S5 费用中心','计费服务','Deployment','待接入','重启 / 日志'],
 ['S6 门户','控制台前端','Deployment','运行中（示例）','重启 / 扩缩容 / 日志']
];

// ---------- 集群能力验收 ----------
export const clusterCapability={
 'compute-lab':{verdict:'部分通过：平台就绪 ≠ 能力验收通过',checks:[
  ['API / Node','就绪（示例）','3 节点'],['CNI / IPAM','待联调','连通性探针未执行'],['CSI / StorageClass','待联调','读写与恢复探针未执行'],
  ['容器运行时','containerd / 版本待采集','—'],['GPU 软件栈','未验证','驱动 / Toolkit / 设备插件待定'],
  ['镜像 / DNS / CA','待验证','Harbor 引用未实测'],['最小探针','未执行','网络 / 存储 / GPU / 镜像']]},
 'cpu-lab':{verdict:'未验收：只纳管，不承诺运行能力',checks:[
  ['API / Node','未知','未采集'],['CNI / IPAM','未验收','—'],['CSI / StorageClass','未验收','—'],
  ['容器运行时','未采集','—'],['GPU 软件栈','不适用','无 GPU'],['镜像 / DNS / CA','未验证','—'],['最小探针','未执行','—']]}
};

// ---------- 关联解析（R02） ----------
// 每类对象给出详情页与行数据来源；resolveLink 按 ID 精确定位，找不到返回 null，不回退。
// rows 按首列直接命中；resolve 用于 ID 不是目标页首列的场景（申请 / 分配 / 环境 / 工作负载统一落到交付单）。
const orderRowOf=take=>id=>{const rec=deliveryOrderRecords.find(order=>take(order)===id);return rec?deliveryOrderRows.find(row=>row[0]===rec.id):null;};
export const LINK_TYPES={
 asset:{detail:'asset',rows:()=>assetRows},
 // BMC 并入资产详情“BMC 与带外”页签；带外对象仍以资产 ID 定位。
 bmc:{detail:'asset',rows:()=>bmcRows},
 node:{detail:'node',rows:()=>nodeRows},
 gpu:{detail:'gpu',rows:()=>gpuRows},
 allocation:{detail:'delivery-order',resolve:orderRowOf(order=>order.reserve.alloc)},
 environment:{detail:'delivery-order',resolve:orderRowOf(order=>order.delivery?.env)},
 request:{detail:'delivery-order',resolve:orderRowOf(order=>order.request.id)},
 workload:{detail:'delivery-order',resolve:id=>{const w=workloadRecords.find(x=>x.id===id);return w?orderRowOf(order=>order.delivery?.env)(w.env):null}},
 task:{detail:'task',rows:()=>taskRows},
 provision:{detail:'provisioning-detail',rows:()=>provisioningRows},
 image:{detail:'image',rows:()=>imageRows},
 alert:{detail:'alert',rows:()=>alertRows},
 incident:{detail:'incident',rows:()=>incidentRows},
 channel:{detail:'channel',rows:()=>channelRows},
 review:{detail:'incident-review',rows:()=>incidentRows},
 'platform-service':{detail:'platform-service',rows:()=>platformServiceRows},
 cluster:{detail:'cluster',rows:()=>clusterRows},
 session:{detail:'session',rows:()=>sessionRows},
 pool:{detail:'pool',rows:()=>poolRows}
};
export function resolveLink(type,id){
 const t=LINK_TYPES[type];
 if(!t||!id)return null;
 const row=t.resolve?t.resolve(id):t.rows().find(r=>r[0]===id);
 return row?{page:t.detail,row}:null;
}
