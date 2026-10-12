// 演示场景：只做页面跳转串联，不执行任何真实操作；步骤通过 model.resolveLink 按 ID 定位。
// 覆盖计划 12.2 的六个必验收场景。
export const SCENARIOS=[
 {id:'provision',title:'正常交付',desc:'资产 → BMC/硬件 → 装机 → 集群/节点 → 能力验收 → 分配 → 环境交付 → 工作负载',steps:[
  {label:'资产 compute-01 详情',link:{type:'asset',id:'compute-01'}},
  {label:'BMC 与硬件列表',link:{page:'bmc'}},
  {label:'BMC 详情（compute-01）',link:{type:'bmc',id:'compute-01'}},
  {label:'装机工作台 TASK-DEMO-01',link:{type:'provision',id:'TASK-DEMO-01'}},
  {label:'集群 compute-lab',link:{type:'cluster',id:'compute-lab'}},
  {label:'节点 compute-01',link:{type:'node',id:'compute-01'}},
  {label:'查看集群能力状态（部分通过）',link:{page:'clusters'}},
  {label:'分配 ALLOC-DEMO-01',link:{type:'allocation',id:'ALLOC-DEMO-01'}},
  {label:'交付环境 ENV-DEMO-01',link:{type:'environment',id:'ENV-DEMO-01'}},
  {label:'工作负载 infer-demo（模型就绪待 S2 验收）',link:{type:'workload',id:'infer-demo'}}]},
 {id:'reprovision',title:'装机失败恢复',desc:'失败历史保留；重检通过 ≠ OS/集群验收通过',steps:[
  {label:'装机工作台 TASK-DEMO-02（含失败历史）',link:{type:'provision',id:'TASK-DEMO-02'}},
  {label:'故障单 INC-DEMO-02（S1 复验关闭）',link:{type:'incident',id:'INC-DEMO-02'}},
  {label:'装机模板 gpu-baseline-02（r02 修订）',link:{type:'image',id:'gpu-baseline-02'}},
  {label:'资产 compute-03 当前状态（检查通过）',link:{type:'asset',id:'compute-03'}},
  {label:'硬件能力台账（通过但不可交付）',link:{page:'capabilities'}}]},
 {id:'gpu-fault',title:'GPU 故障',desc:'告警 → 故障单 → 关联对象 → 恢复动作门禁 → 复验与关闭条件',steps:[
  {label:'告警 ALERT-DEMO-01',link:{type:'alert',id:'ALERT-DEMO-01'}},
  {label:'故障单 INC-DEMO-01（等待人工处理）',link:{type:'incident',id:'INC-DEMO-01'}},
  {label:'GPU-DEMO-002（异常）',link:{type:'gpu',id:'GPU-DEMO-002'}},
  {label:'BMC 带外复核（compute-02 部分采集）',link:{type:'bmc',id:'compute-02'}},
  {label:'分配 ALLOC-DEMO-02',link:{type:'allocation',id:'ALLOC-DEMO-02'}},
  {label:'环境 ENV-DEMO-02（S2 影响待确认）',link:{type:'environment',id:'ENV-DEMO-02'}},
  {label:'工作负载 batch-demo',link:{type:'workload',id:'batch-demo'}}]},
 {id:'capacity',title:'容量不足与资源约束' ,desc:'资源约束不是容量；预留不是实际占用',steps:[
  {label:'申请 REQ-DEMO-03（8 卡 > 可分配 6）',link:{type:'request',id:'REQ-DEMO-03'},note:'切到“匹配结果”页签'},
  {label:'资源池 gpu-general 容量口径',link:{type:'pool',id:'gpu-general'}},
  {label:'申请 REQ-DEMO-01（容量够、配额不足）',link:{type:'request',id:'REQ-DEMO-01'},note:'切到“匹配结果”页签'}]},
 {id:'release',title:'释放回收',desc:'工作负载 / 数据 / 权限分别确认；不清盘共享节点',steps:[
  {label:'环境 ENV-DEMO-02（释放预检不通过）',link:{type:'environment',id:'ENV-DEMO-02'},note:'切到“释放回收”页签'},
  {label:'工作负载 batch-demo（Pending 未停止）',link:{type:'workload',id:'batch-demo'}},
  {label:'分配 ALLOC-DEMO-02',link:{type:'allocation',id:'ALLOC-DEMO-02'}},
  {label:'环境 ENV-DEMO-03（已释放结果）',link:{type:'environment',id:'ENV-DEMO-03'},note:'切到“释放回收”页签'},
  {label:'分配 ALLOC-DEMO-04（已释放）',link:{type:'allocation',id:'ALLOC-DEMO-04'}}]},
 {id:'unknown',title:'未知与权限不足',desc:'无数据标未知；未授权动作不可用',steps:[
  {label:'BMC reserve-01（无数据 / 操作不可用）',link:{type:'bmc',id:'reserve-01'}},
  {label:'监控大盘（无数据标未知）',link:{page:'monitor'}},
  {label:'节点 cpu-worker-01（Unknown / 不可调度）',link:{type:'node',id:'cpu-worker-01'}},
  {label:'待授权会话 SESSION-DEMO-02',link:{type:'session',id:'SESSION-DEMO-02'}},
  {label:'运维接入通道（Kubernetes API 待验证）',link:{page:'audit'}}]}
];
export const REQUIRED_SCENARIO_IDS=['provision','reprovision','gpu-fault','capacity','release','unknown'];
