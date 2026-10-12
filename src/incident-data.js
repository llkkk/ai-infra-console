// 故障单示例数据。所有时间线、责任归属与复验结果均为虚构评审示例。
// objects/evidence 使用类型化关联（type + id），由 model.resolveLink 按 ID 定位；
// 找不到对象时提示缺失，不回退到第一个对象。
// s2Impact：affected=涉及已交付环境；none=未交付、无 S2 影响；unknown=影响未知。

export function closeGate(inc){
 if(inc.s2Impact==='none')return {text:'恢复复验通过后由 S1 关闭；资产未交付、无 S2 影响，无需双方确认。',joint:false};
 if(inc.s2Impact==='unknown')return {text:'影响范围未知：不得按“无影响”关闭；先确认涉及的环境与分配，再确定是否需要 S2 确认。',joint:true,blocked:true};
 return {text:'恢复复验逐项通过，且 S1 与 S2 确认业务影响消除后关闭。',joint:true};
}

export const INCIDENTS={
 'INC-DEMO-01':{
  id:'INC-DEMO-01',
  title:'GPU-DEMO-002 设备不可分配',
  severity:'严重',
  phase:'等待人工处理',
  owner:'S1 底座 · 硬件组处理中',
  trigger:'ALERT-DEMO-01',
  s2Impact:'affected',
  started:'10-10 10:24',
  updated:'10-10 11:05',
  impact:'分配 ALLOC-DEMO-02（S2 / 联调环境 · 整卡 × 2）；模型业务影响待 S2 确认。',
  summary:'DCGM（候选）上报 GPU-DEMO-002 设备不可分配持续超过 5 分钟。已确认底座故障并转交硬件组；GPU 复位与主机下电属于破坏性操作，需单独授权，尚未执行。',
  s1:'底座故障：GPU 设备不可分配。S1 负责定位、恢复与复验，当前由硬件组跟进 PCIe 链路与 BMC 传感器检查。',
  s2:'联调环境 ENV-DEMO-02 关联分配 ALLOC-DEMO-02；模型任务与 API 是否受影响待 S2 反馈，S1 不推断业务失败。',
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
   ['会话审计','处理会话建立后关联分通道审计引用',{page:'sessions'}]
  ]
 },
 'INC-DEMO-02':{
  id:'INC-DEMO-02',
  title:'compute-03 硬件检查失败（磁盘）',
  severity:'警告',
  phase:'已关闭',
  owner:'S1 底座 · 已恢复',
  trigger:'TASK-DEMO-02',
  s2Impact:'none',
  started:'10-10 09:50',
  updated:'10-10 10:45',
  impact:'未影响已交付环境；资产保持“不参与交付”，重检通过后具备装机条件（OS / 集群验收未开始）。',
  summary:'装机预检任务 TASK-DEMO-02 磁盘检查失败，平台阻止供应并自动建单；修正模板目标盘策略后按预检重试，复验通过关闭。资产未进入资源池，无 S2 协同。',
  s1:'供应预检失败，资产未进入资源池。S1 完成模板策略修正、失败阶段重试与硬件快照刷新；失败记录保留为历史。',
  s2:'资产尚未交付，无 S2 环境与模型影响，无需业务确认。',
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
   ['操作审计','平台操作事件引用（示例）',{page:'operations'}]
  ]
 }
};
