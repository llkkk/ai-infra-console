// 共享虚构对象注册表：相关页面的列表行、当前状态与历史记录统一从这里派生，
// 避免同一对象在不同页面硬编码出互相矛盾的状态。全部数据为本地评审示例。
import {INCIDENTS} from './incident-data.js';

// ---------- 资产 ----------
export const assetRecords=[
 {id:'compute-01',sn:'DEMO-SN-001',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',state:'就绪',bmc:'在线',cluster:'compute-lab'},
 {id:'compute-02',sn:'DEMO-SN-002',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',state:'就绪',bmc:'在线',cluster:'compute-lab'},
 {id:'compute-03',sn:'DEMO-SN-003',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',state:'检查通过',bmc:'在线',cluster:'未分配'},
 {id:'control-01',sn:'DEMO-SN-004',type:'通用服务器',gpu:'无',mem:'64 GiB',state:'就绪',bmc:'在线',cluster:'compute-lab'},
 {id:'reserve-01',sn:'DEMO-SN-005',type:'通用服务器',gpu:'待检查',mem:'待检查',state:'已登记',bmc:'未知',cluster:'未分配'},
 {id:'compute-04',sn:'DEMO-SN-006',type:'GPU 计算节点',gpu:'8 × 示例 GPU',mem:'192 GiB',state:'装机中',bmc:'在线',cluster:'未分配'}
];
export const assetRows=assetRecords.map(a=>[a.id,a.sn,a.type,a.gpu,a.mem,a.state,a.bmc,a.cluster]);

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

// ---------- 任务 ----------
export const taskRecords=[
 {id:'TASK-DEMO-01',type:'装机',target:'compute-04',template:'linux-baseline-01',stage:'镜像供应',state:'进行中',source:'Ironic / BMH（候选）',created:'10-10 10:10',auth:'已确认',incident:null,
  phases:[
   {name:'授权与预检',state:'成功',at:'10:10',log:'目标允许重装；数据盘保留策略已确认。'},
   {name:'介质 / PXE 引导',state:'成功',at:'10:12',log:'供应网络引导完成（示例）。'},
   {name:'磁盘与镜像',state:'执行中',at:'10:15',log:'正在写入 img-demo-01 到 DEMO-DISK-001（示例进度，非真实执行）。'},
   {name:'OS 安装',state:'未开始'},{name:'首次启动与初始化',state:'未开始'},{name:'SSH / Agent 注册',state:'未开始'},{name:'节点注册',state:'未开始'},{name:'基线验收',state:'未开始'}],
  confirmPoints:['镜像写入完成后确认目标盘范围','节点注册前确认网络准入'],
  acceptance:[['硬件预检','通过','任务预检阶段'],['OS 安装','执行中','当前阶段：磁盘与镜像'],['SSH / Agent','未开始','依赖 OS'],['Node 注册','未开始','依赖 OS'],['集群能力验收','未开始','独立流程，见集群能力'],['GPU 运行能力','未开始','独立流程，见集群能力']]},
 {id:'TASK-DEMO-02',type:'硬件检查',target:'compute-03',template:'gpu-baseline-02',stage:'磁盘重检（重试通过）',state:'成功（重检）',source:'BMH（候选）',created:'10-10 09:50',auth:'已确认',incident:'INC-DEMO-02',
  phases:[
   {name:'授权与预检',state:'成功',at:'09:50',log:'检查范围：CPU / 内存 / 磁盘 / 网卡。'},
   {name:'磁盘检查',state:'失败',at:'09:50',log:'失败：目标盘标识与 gpu-baseline-02 模板策略不匹配；资产保持不可交付，不进入资源池。'},
   {name:'修正与人工确认',state:'成功',at:'10:20',log:'修正模板目标盘选择策略（模板修订留痕）；处理过程记录于故障单 INC-DEMO-02。'},
   {name:'磁盘重检（仅失败阶段）',state:'成功',at:'10:40',log:'按任务重试预检仅重跑磁盘检查；未重装、未清理；硬件快照版本已刷新。'}],
  confirmPoints:['失败阶段重试前必须核对执行器状态','未知状态不得自动重装或清理'],
  acceptance:compute03Story.acceptance},
 {id:'TASK-DEMO-03',type:'集群创建',target:'compute-lab',template:'rke2-general',stage:'纳管',state:'示例完成',source:'CAPI / Turtles',created:'10-10 09:00',auth:'已确认',incident:null,
  phases:[{name:'模板与预检',state:'成功',at:'09:00',log:'示例记录。'},{name:'集群创建与纳管',state:'成功',at:'09:20',log:'Rancher 导入成功；能力验收另行执行。'}],
  confirmPoints:[],acceptance:[['API / Node','就绪（示例）','—'],['能力验收','未开始','独立流程']]}
];
export const taskRows=taskRecords.map(t=>[t.id,t.type,t.target,t.stage,t.state,t.source,t.created]);
export const provisioningRows=taskRecords.map(t=>[t.id,t.target,t.template,t.stage,t.state,t.source,t.auth]);

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
 ['compute-lab','实验中心','RKE2 / 示例','1 / 2','就绪','已导入','CAPI 候选'],
 ['cpu-lab','实验中心','RKE2 / 示例','1 / 1','未知','未连接','已有集群接入']
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
 {id:'S2 / 模型工程',ext:'project-demo-model',pool:'gpu-general',whole:8,used:6,reserved:0,auth:'S4 授权引用'},
 {id:'S2 / 联调环境',ext:'project-demo-test',pool:'gpu-general',whole:4,used:2,reserved:2,auth:'S4 授权引用'}
];
export const quotaRows=quotaRecords.map(q=>[q.id,q.ext,q.pool,q.whole,q.used,q.reserved,q.auth]);
export const allocationRecords=[
 {id:'ALLOC-DEMO-01',project:'S2 / 模型工程',source:'S3 申请引用',mode:'整卡',qty:6,state:'已交付',env:'s2-model',lease:'待约定'},
 {id:'ALLOC-DEMO-02',project:'S2 / 联调环境',source:'S3 申请引用',mode:'整卡',qty:2,state:'已交付',env:'s2-test',lease:'待约定'},
 {id:'ALLOC-DEMO-03',project:'S2 / 联调环境',source:'示例申请',mode:'整卡',qty:2,state:'已预留',env:'待验收',lease:'待约定'},
 {id:'ALLOC-DEMO-04',project:'S2 / 历史评测',source:'S3 申请引用',mode:'整卡',qty:2,state:'已释放',env:'ENV-DEMO-03（已回收）',lease:'租期已结束'}
];
export const allocationRows=allocationRecords.map(a=>[a.id,a.project,a.source,a.mode+' / '+a.qty,a.state,a.env,a.lease]);
export const POOL_CAPACITY={pool:'gpu-general',physical:16,allocated:8,reserved:2,available:6};
export function capacityCheck(){
 const allocated=allocationRecords.filter(a=>a.state==='已交付').reduce((s,a)=>s+a.qty,0);
 const reserved=allocationRecords.filter(a=>a.state==='已预留').reduce((s,a)=>s+a.qty,0);
 return {allocated,reserved,available:POOL_CAPACITY.physical-allocated-reserved};
}
export const poolRows=[
 ['gpu-general','compute-lab','整卡',2,16,'8 / 2','6 卡（示例）'],
 ['cpu-general','cpu-lab','CPU',1,'无','未接入','未知']
];

// ---------- 环境申请与匹配 ----------
export const requestRecords=[
 {id:'REQ-DEMO-01',project:'S2 / 模型工程',runtime:'vLLM / image-ref',mode:'整卡',qty:4,storage:'model-storage',state:'待匹配（容量满足，配额不足）',source:'S2'},
 {id:'REQ-DEMO-02',project:'S2 / 联调环境',runtime:'runtime-demo',mode:'整卡',qty:2,storage:'PVC / 1 TiB',state:'已预留',source:'S3 引用'},
 {id:'REQ-DEMO-03',project:'S2 / 新推理服务',runtime:'torchserve-rc / image-ref-rc',mode:'整卡',qty:8,storage:'model-storage',state:'匹配失败（可分配不足）',source:'S2'}
];
export const requestRows=requestRecords.map(r=>[r.id,r.project,r.runtime,r.mode+' × '+r.qty,r.storage,r.state,r.source]);
export const requestMatch={
 'REQ-DEMO-01':{
  capacity:{verdict:'通过',detail:'需求 整卡 × 4 ≤ gpu-general 可分配 6（物理 16 − 已分配 8 − 预留 2）'},
  quota:{verdict:'不足',detail:'S2 / 模型工程 配额 8，已分配 6，剩余 2 < 需求 4；需先完成配额调整审批'},
  next:[['配额调整审批','quota','S2 / 模型工程'],['资源池容量口径','pool','gpu-general'],['已交付分配（等待释放）','allocation','ALLOC-DEMO-01']],
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
export const deliveryRows=deliveryRecords.map(d=>[d.id,d.project,d.ns,d.res,d.accept,d.s2,d.valid]);
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
export const workloadRecords=[
 {id:'infer-demo',env:'ENV-DEMO-01',type:'Deployment',platform:'Running',app:'Ready',model:'待 S2 验收',at:'10-10 10:24'},
 {id:'batch-demo',env:'ENV-DEMO-02',type:'Job',platform:'Pending',app:'未开始',model:'不适用',at:'10-10 10:20'},
 {id:'eval-demo',env:'ENV-DEMO-03',type:'Job',platform:'Succeeded',app:'已完成',model:'不适用（环境已释放）',at:'10-09 18:40'}
];
export const workloadRows=workloadRecords.map(w=>[w.id,w.env,w.type,w.platform,w.app,w.model,w.at]);

// ---------- 镜像 / 会话 / 告警 / 故障 ----------
export const imageRows=[
 ['linux-baseline-01','Ubuntu / x86_64','img-demo-01','系统盘覆盖 / 数据盘保留','Operator 管理','示例已验证'],
 ['gpu-baseline-02','Linux / x86_64','img-demo-02','按磁盘序列号选择（r02 修订：目标盘策略修正）','镜像预装（候选）','待验证（r01 失败 / r02 重检通过）']
];
export const sessionRows=[
 ['SESSION-DEMO-01','demo-admin','compute-01','SSH','10-10 09:30','已结束','JumpServer 示例引用'],
 ['SESSION-DEMO-02','demo-user','pod-demo','Pod exec','10-10 10:00','待授权','审计方案待定'],
 ['SESSION-DEMO-03','demo-admin','management-demo / apiserver','Kubernetes API','10-10 11:02','已结束','API Audit 引用（候选）'],
 ['SESSION-DEMO-04','demo-hw','compute-02 / BMC','带外 KVM','10-10 11:10','待授权','厂商留痕待适配']
];
export const alertRows=[
 ['ALERT-DEMO-01','严重','compute-02 / GPU-DEMO-002','设备不可分配','待确认','10-10 10:24','分配单影响待 S2 确认','INC-DEMO-01'],
 ['ALERT-DEMO-02','警告','reserve-01','BMC 无数据','待确认','10-10 09:40','未交付资产','—']
];
export const incidentRows=Object.values(INCIDENTS).map(i=>[i.id,i.title,i.severity,i.phase,i.owner,i.trigger,i.started]);

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
export const LINK_TYPES={
 asset:{detail:'asset',rows:()=>assetRows},
 bmc:{detail:'bmc-detail',rows:()=>bmcRows},
 node:{detail:'node',rows:()=>nodeRows},
 gpu:{detail:'gpu',rows:()=>gpuRows},
 allocation:{detail:'allocation',rows:()=>allocationRows},
 environment:{detail:'delivery',rows:()=>deliveryRows},
 workload:{detail:'workload',rows:()=>workloadRows},
 task:{detail:'task',rows:()=>taskRows},
 provision:{detail:'provisioning-detail',rows:()=>provisioningRows},
 image:{detail:'image',rows:()=>imageRows},
 alert:{detail:'alert',rows:()=>alertRows},
 request:{detail:'environment-request',rows:()=>requestRows},
 quota:{detail:'quota',rows:()=>quotaRows},
 incident:{detail:'incident',rows:()=>incidentRows},
 cluster:{detail:'cluster',rows:()=>clusterRows},
 session:{detail:'session',rows:()=>sessionRows},
 pool:{detail:'pool',rows:()=>poolRows}
};
export function resolveLink(type,id){
 const t=LINK_TYPES[type];
 if(!t||!id)return null;
 const row=t.rows().find(r=>r[0]===id);
 return row?{page:t.detail,row}:null;
}
