// 故障单示例数据。所有时间线、责任归属与复验结果均为虚构评审示例。
// objects/evidence 使用类型化关联（type + id），由 model.resolveLink 按 ID 定位；
// 找不到对象时提示缺失，不回退到第一个对象。
// s2Impact：affected=涉及已交付环境；none=未交付、无 S2 影响；unknown=影响未知。

export function closeGate(inc){
 if(inc.s2Impact==='none')return {text:'恢复复验通过后由 S1 关闭；资产未交付、无 S2 影响，无需双方确认。',joint:false};
 if(inc.s2Impact==='unknown')return {text:'影响范围未知：不得按“无影响”关闭；先确认涉及的环境与分配，再确定是否需要 S2 确认。',joint:true,blocked:true};
 return {text:'恢复复验逐项通过，且 S1 与 S2 确认业务影响消除后关闭。',joint:true};
}

// 关闭、复盘和归档分别记录；未关闭或缺少复盘证据时不允许生成归档计划。
export function archiveGate(inc){
 const review=inc?.review;
 if(!inc||inc.phase!=='已关闭')return {allowed:false,reason:'故障尚未关闭，不能归档。'};
 if(review?.status==='已归档')return {allowed:false,reason:'记录已归档，只读查看，不重复归档。'};
 if(review?.status!=='已完成')return {allowed:false,reason:'复盘尚未完成；已关闭不等于已复盘。'};
 if(!review.summary?.trim()||!review.impact?.trim()||!review.rootCause?.detail?.trim()||!review.recovery?.trim()||!review.reviewer?.trim())return {allowed:false,reason:'缺少摘要、实际影响、根因说明、恢复措施或复核人。'};
 if(!['已确认','未确认'].includes(review.rootCause.state))return {allowed:false,reason:'根因必须明确标记已确认或未确认，并提供说明。'};
 if(!Array.isArray(review.actions)||review.actions.some(a=>!a.title?.trim()||!a.owner?.trim()||!a.due?.trim()))return {allowed:false,reason:'改进项必须明确内容、负责人和截止时间；不要求全部改进已完成才归档。'};
 return {allowed:true,reason:'故障已关闭，复盘内容及责任信息完整，可预检归档；改进项继续跟踪。'};
}

export const INCIDENTS={
 'INC-DEMO-01':{
  id:'INC-DEMO-01',
  title:'GPU-DEMO-002 设备不可分配',
  severity:'严重',
  phase:'等待人工处理',
  owner:'S1 底座 · 硬件组处理中',
  trigger:'ALERT-DEMO-01',
  sourceType:'告警',creation:'规则自动建单（示例）',relatedAlerts:['ALERT-DEMO-01'],
  s2Impact:'affected',
  started:'10-10 10:24',
  updated:'10-10 11:05',
  impact:'分配 ALLOC-DEMO-02（S2 / 联调环境 · 整卡 × 2）；模型业务影响待 S2 确认。',
  summary:'DCGM（候选）上报 GPU-DEMO-002 设备不可分配持续超过 5 分钟。已确认底座故障并转交硬件组；GPU 复位与主机下电属于破坏性操作，需单独授权，尚未执行。',
  s1:'底座故障：GPU 设备不可分配。S1 负责定位、恢复与复验，当前由硬件组跟进 PCIe 链路与 BMC 传感器检查。',
  s2:'联调环境 ENV-DEMO-02 关联分配 ALLOC-DEMO-02；模型任务与 API 是否受影响待 S2 反馈，S1 不推断业务失败。',
  review:{status:'未开始',required:true,summary:'GPU 不可分配仍在处理',impact:'已交付资源影响待 S2 确认',rootCause:{state:'未确认',detail:'仍待硬件组定位；不能把告警现象直接当作根因'},recovery:'尚未恢复',reviewer:'待分派',actions:[],archivedAt:null},
  timeline:[
   ['10:24','告警触发','auto','gpu-unavailable 规则','DCGM（候选）上报设备不可分配持续 5 分钟，生成事件 ALERT-DEMO-01。'],
   ['10:26','故障单建立','auto','S1 平台','按告警对象自动建单，关联资产 compute-02、GPU-DEMO-002 与分配 ALLOC-DEMO-02。'],
   ['10:40','故障确认','manual','S1 值班','确认为底座故障（S1 责任）；同步通知 S2 联调环境可能受影响。'],
   ['10:52','影响定位','manual','S1 值班','占用该设备的分配单为 ALLOC-DEMO-02；模型 API 是否受影响待 S2 反馈，不推断业务失败。'],
   ['11:05','转交硬件组','manual','S1 → 硬件组','待检查 PCIe 链路与供电；GPU 复位 / 主机下电需变更窗口与二次确认。']
  ],
  pending:[
   ['硬件组检查 PCIe 链路、供电与 BMC 传感器','等待人工处理'],
   ['如需 GPU 复位：提交变更窗口并二次确认','待确认'],
   ['S2 反馈模型任务与 API 影响','待确认']
  ],
  acceptance:[
   ['设备在 Kubernetes 重新可分配','未开始'],
   ['DCGM 指标恢复正常上报','未开始'],
   ['节点 / 设备最小探针通过','未开始'],
   ['S2 确认业务影响消除','未开始']
  ],
  objects:[
   ['资产','compute-02','asset'],
   ['GPU 设备','GPU-DEMO-002','gpu'],
   ['节点','compute-02','node'],
   ['分配单','ALLOC-DEMO-02','allocation'],
   ['交付环境','ENV-DEMO-02','environment'],
   ['工作负载','batch-demo','workload']
  ],
  evidence:[
   ['告警事件','ALERT-DEMO-01 · Prometheus 规则引用',{type:'alert',id:'ALERT-DEMO-01'}],
   ['带外事实','compute-02 BMC 部分采集；GPU 相关联指标待复核',{type:'bmc',id:'compute-02'}],
   ['会话审计','处理会话建立后关联分通道审计引用',{page:'audit-logs'}]
  ]
 },
 'INC-DEMO-02':{
  id:'INC-DEMO-02',
  title:'compute-03 硬件检查失败（磁盘）',
  severity:'警告',
  phase:'已关闭',
  owner:'S1 底座 · 已恢复',
  trigger:'TASK-DEMO-02',
  sourceType:'任务失败',creation:'任务规则转建（示例）',relatedAlerts:[],
  s2Impact:'none',
  started:'10-10 09:50',
  updated:'10-10 10:45',
  impact:'未影响已交付环境；资产保持“不参与交付”，重检通过后具备装机条件（OS / 集群验收未开始）。',
  summary:'装机预检任务 TASK-DEMO-02 磁盘检查失败，平台阻止供应并自动建单；修正模板目标盘策略后按预检重试，复验通过关闭。资产未进入资源池，无 S2 协同。',
  s1:'供应预检失败，资产未进入资源池。S1 完成模板策略修正、失败阶段重试与硬件快照刷新；失败记录保留为历史。',
  s2:'资产尚未交付，无 S2 环境与模型影响，无需业务确认。',
  review:{status:'待复盘',required:false,summary:'磁盘检查失败，重检通过后关闭',impact:'交付前资产检查，无已交付环境影响',rootCause:{state:'已确认',detail:'目标盘标识与模板策略不匹配，非硬件损坏；完整复盘记录待复核'},recovery:'修正模板 r02 后仅重跑失败检查阶段',reviewer:'待指定',actions:[],archivedAt:null},
  timeline:[
   ['09:50','任务失败','auto','BMH（候选）','TASK-DEMO-02 磁盘检查失败，资产保持不可交付，不进入资源池。'],
   ['09:55','故障单建立','auto','S1 平台','由任务失败自动建单，关联资产与装机任务。'],
   ['10:05','人工定位','manual','S1 值班','检查目标盘标识与 gpu-baseline-02 模板策略不匹配，非硬件损坏。'],
   ['10:20','处理','manual','S1 值班','修正模板目标盘选择策略；模板修订记录留痕。'],
   ['10:32','失败阶段重试','manual','S1 值班','按任务重试预检仅重跑磁盘检查阶段，不重装、不清理。'],
   ['10:40','恢复复验','auto','检查任务','磁盘检查通过，硬件快照版本刷新；OS / 集群验收仍未开始。'],
   ['10:45','关闭','manual','S1 值班','无 S2 影响，S1 复验通过后关闭；失败历史保留在任务与资产记录中。']
  ],
  pending:[],
  acceptance:[
   ['磁盘检查通过（失败阶段重试）','通过'],
   ['硬件快照版本更新','通过'],
   ['业务影响评估：未进入资源池，无影响','通过']
  ],
  objects:[
   ['资产','compute-03','asset'],
   ['装机任务','TASK-DEMO-02','provision'],
   ['装机模板','gpu-baseline-02','image']
  ],
  evidence:[
   ['任务日志','TASK-DEMO-02 阶段与失败原因（含历史）',{type:'provision',id:'TASK-DEMO-02'}],
   ['模板版本','gpu-baseline-02 r02 修订记录',{type:'image',id:'gpu-baseline-02'}],
   ['操作审计','平台操作事件引用（示例）',{page:'audit-logs'}]
  ]
 },
 'INC-DEMO-03':{
  id:'INC-DEMO-03',title:'compute-01 验证期 GPU 温度与降频异常',severity:'重要',phase:'已关闭',owner:'S1 底座 · 已恢复',trigger:'ALERT-DEMO-04',sourceType:'告警',creation:'人工从告警创建（示例）',relatedAlerts:['ALERT-DEMO-04','ALERT-DEMO-06'],s2Impact:'none',started:'10-09 14:00',updated:'10-09 15:20',
  impact:'交付前算力验证受阻 35 分钟，无已交付 S2 环境影响。',summary:'温度与热降频两条信号关联同一故障；调整验证环境冷却设置，探针复验后关闭。',s1:'S1 负责设备状态与验证环境恢复，复盘已复核但尚未归档。',s2:'交付前验证，未影响 S2 已交付环境。',
  timeline:[['10-09 14:00','温度告警','auto','DCGM（候选）','ALERT-DEMO-04 触发'],['10-09 14:02','降频告警','auto','DCGM（候选）','ALERT-DEMO-06 触发并关联同一故障'],['10-09 14:06','人工建单','manual','S1 值班','两条信号合并定位，未重复建单'],['10-09 14:35','恢复','manual','硬件组','修正验证环境冷却设置，信号恢复'],['10-09 14:45','复验关闭','manual','S1 值班','设备探针与指标通过，无 S2 影响'],['10-09 15:20','复盘完成','manual','S1 负责人','复核根因和措施，改进项仍待完成，尚未归档']],
  pending:[],acceptance:[['GPU 温度 / 降频信号恢复','通过'],['设备容器探针复验','通过'],['交付影响评估：无已交付环境影响','通过']],
  objects:[['资产','compute-01','asset'],['GPU','GPU-DEMO-001','gpu']],evidence:[['温度信号','ALERT-DEMO-04',{type:'alert',id:'ALERT-DEMO-04'}],['降频信号','ALERT-DEMO-06',{type:'alert',id:'ALERT-DEMO-06'}],['审计记录','冷却设置修正记录（示例）',{page:'audit-logs'}]],
  review:{status:'已完成',required:true,summary:'交付前 GPU 温度异常引发降频，两条告警共用一张故障单',impact:'验证中断 35 分钟，无 S2 运行环境影响',rootCause:{state:'已确认',detail:'验证环境冷却设置未与测试负载基线同步（虚构示例）'},recovery:'修正冷却设置，核验温度与设备探针后关闭',reviewer:'S1 负责人（示例）',actions:[{id:'IMPROVE-DEMO-01',title:'在验证预检中加入冷却基线核对',owner:'S1 硬件组',due:'2026-10-15',status:'待完成',evidence:'待补充预检修订记录'}],archivedAt:null}
 },
 'INC-DEMO-04':{
  id:'INC-DEMO-04',title:'compute-lab 交付前 DNS 初始化配置异常',severity:'重要',phase:'已关闭',owner:'S1 底座 · 已归档',trigger:'ALERT-DEMO-05',sourceType:'告警',creation:'人工从告警创建（示例）',relatedAlerts:['ALERT-DEMO-05'],s2Impact:'none',started:'10-08 09:00',updated:'10-08 16:00',
  impact:'交付前 DNS 探针失败 40 分钟，无已交付 S2 环境影响。',summary:'修正节点 DNS 初始化模板后复验关闭，形成复盘并归档。',s1:'S1 修正初始化模板并验证 DNS；归档记录只读，后续改进留存证据。',s2:'交付前测试，不涉及 S2 已交付业务恢复。',
  timeline:[['10-08 09:00','探针告警','auto','DNS 探针（候选）','ALERT-DEMO-05 触发'],['10-08 09:10','人工建单','manual','S1 值班','定位到 control-01 初始化配置'],['10-08 09:40','信号恢复','manual','S1 集群组','修正模板并验证 DNS'],['10-08 10:00','复验关闭','manual','S1 值班','探针通过，无 S2 影响'],['10-08 15:00','复盘复核','manual','S1 负责人','确认根因与改进记录'],['10-08 16:00','归档','manual','S1 负责人','归档摘要、证据与措施，记录只读']],
  pending:[],acceptance:[['集群 DNS 探针通过','通过'],['模板修订复核','通过'],['无已交付环境影响','通过']],objects:[['资产','control-01','asset'],['集群','compute-lab','cluster']],evidence:[['探针事件','ALERT-DEMO-05',{type:'alert',id:'ALERT-DEMO-05'}],['模板修订','初始化变更记录（示例）',{page:'audit-logs'}]],
  review:{status:'已归档',required:false,summary:'DNS 初始化配置异常在交付前被探针发现',impact:'验证中断 40 分钟，无 S2 运行环境影响',rootCause:{state:'已确认',detail:'初始化模板的 DNS 参数与验证环境不一致（虚构示例）'},recovery:'修正模板并重新运行跨节点 DNS 探针',reviewer:'S1 负责人（示例）',actions:[{id:'IMPROVE-DEMO-02',title:'镜像 / 模板发布前校验 DNS 参数',owner:'S1 集群组',due:'2026-10-09',status:'已完成',evidence:'模板校验记录 DEMO-DNS-CHECK'}],archivedAt:'10-08 16:00'}
 }
};
