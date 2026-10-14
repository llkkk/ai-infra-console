import {clusterCapability,nodeRecords,gpuRecords} from './model.js';

// 页签内容优先按页面 + 当前对象上下文生成；未覆盖的页签回退到静态表。
// BMC 与带外、环境申请匹配、交付生命周期页签分别由资产详情（utils/infrastructure.js）
// 与交付单详情（utils/pools.js）按对象事实直接组装，不经此处。
export function tabContent(page,active,context){
 const id=context?.[0];
 const gen={
  'cluster-capability-detail':clusterCapTab,
  'node':nodeTab,
  'gpu':gpuTab
 }[page];
 if(gen){const rows=gen(active,id);if(rows)return rows;}
 if(active==='使用对象')return [[id||'demo-object','授权范围引用','测试对象组'],['其他对象','禁止默认全局授权','需独立审批']];
 return staticTabs[active]||null;
}

function clusterCapTab(active,id){
 const c=clusterCapability[id];
 if(!c)return null;
 if(active==='验收清单')return [...c.checks,['结论',c.verdict,'验收证据另档保留']];
 if(active==='组件版本')return [['CNI / CSI','选型待确认','集群模板'],['GPU 软件栈','Operator / 设备插件待验证','版本组合待锁定'],['管理来源','集群模板 / GitOps 候选','页面不旁路修改']];
 if(active==='探针证据')return [['最小探针','未执行','网络 / 存储 / GPU / 镜像'],['证据要求','探针结果留档后才能标通过','验收通过条件']];
 return null;
}

function nodeTab(active,id){
 const n=nodeRecords.find(x=>x.id===id);
 if(!n||active!=='运行状态')return null;
 return [
  ['Node 状态',n.state,n.state==='Unknown'?'保留最后观测时间，不推断恢复':'示例数据'],
  ['监控指标','未接入','Node exporter（候选）'],
  ['失联策略','标未知；不视为空闲、成功或可安全重试','—'],
  ['调度',n.sched,n.state==='Unknown'?'未知状态不参与调度':'—']];
}

// GPU 设备详情四段：身份与版本 / 实时指标 / 功耗与温度 / 拓扑邻居（对标 CoreWeave 节点详情大盘分段）。
function gpuTab(active,id){
 const g=gpuRecords.find(x=>x.id===id);
 if(!g)return null;
 if(active==='身份与版本')return [
  ['设备 UUID',g.id,'—'],
  ['型号 / 显存',g.model+' / '+g.mem,'硬件盘点（示例）'],
  ['节点 / 资产',g.node,'—'],
  ['运行模式',g.mode,'整卡 / MIG / HAMi'],
  ['驱动版本','待采集','GPU Operator 与镜像预装二选一'],
  ['资源池','gpu-general','—']];
 if(active==='实时指标')return [
  ['GPU 利用率','未接入','DCGM（候选）；不显示假实时曲线'],
  ['显存占用','未接入','DCGM（候选）'],
  ['PCIe 带宽','未接入','—']];
 if(active==='功耗与温度')return [
  ['功耗','未接入 DCGM · 示例','功耗可作为用量核对的辅助信号，不进计费口径'],
  ['温度','未接入 · 示例','—'],
  ['功耗上限','待定','—']];
 if(active==='拓扑邻居')return [
  ['NUMA 亲和','待采集','—'],
  ['NVLink 拓扑','待采集','—'],
  ['同机 GPU',g.node+' 上其余 7 卡（示例）','—']];
 return null;
}

const staticTabs={
 '适用资产':[['compute-01','架构匹配','驱动 / 磁盘策略待核对'],['compute-04','供应中','模板版本锁定']],
 '版本记录':[['revision-demo-02','待审阅','未发布到真实环境'],['revision-demo-01','示例版本','保留历史配置引用']],
 '检查项目':[['CPU / 内存','发现与健康检查','阈值待确认'],['磁盘','稳定标识与健康','系统盘 / 数据盘区分'],['固件','厂商基线比对','不自动升级']],
 '偏差资产':[['compute-02','GPU-DEMO-002 待复核','关联 INC-DEMO-01'],['历史：compute-03 磁盘检查失败','已恢复（10-10 重检通过）','TASK-DEMO-02 / INC-DEMO-02']],
 '承载工作负载':[['s2-model / pod-demo-01','示例工作负载','迁移与中断预算待核对'],['PVC / volume-demo','持久化数据引用','保留策略待 S2 确认']],
 '设备与运行栈':[['GPU 设备','按 UUID 关联','设备健康与分配分离'],['驱动 / Toolkit','未采集','版本所有权待确认'],['插件 / 调度','待选型','HAMi 与 Volcano 组合待验']],
 '任务事件':[['TASK-DEMO-01','供应配置','关联执行器事件'],['EVENT-DEMO-01','变更提交','示例请求记录']],
 '兼容矩阵':[['CAPI / Providers','版本待锁定','组合联调未完成'],['GPU Operator / 镜像驱动','所有权待确认','避免重复管理'],['HAMi / Volcano','兼容待验证','在线与批任务分开']],
 '使用集群':[['compute-lab','模板 revision-demo-01','示例关联'],['cpu-lab','已有集群接入','不默认接管模板']],
 '适用资源池':[['gpu-general','整卡','仅示例配置，待实测'],['共享池','未配置','MIG / HAMi 验证后开放']],
 '使用记录':[['ALLOC-DEMO-01','整卡请求','示例分配事实'],['REQUEST-DEMO','需求引用','不含计费账本']],
 '通知路由':[['底座告警','S1 值班','联系方式只引用'],['模型影响','S2 联系人','关联条件待确认']],
 '静默窗口':[['maintenance-demo','30 分钟 / 示例','不改变底座健康'],['超时恢复通知','执行源负责','策略待定义']],
 '关联会话':[['SESSION-DEMO-01','WebShell','平台会话审计引用'],['Pod exec / KVM / API','能力待验证','独立授权与留存']],
 '会话时间线':[['09:30','WebShell 会话建立','授权引用 project-access-demo（示例）'],['09:31','执行：查看 GPU 设备状态','命令审计（示例）'],['09:38','异常：非工作时间执行关机命令（示例标记）','需人工复核'],['09:42','会话结束','—']],
 '命令记录':[['命令证据','外部记录引用','不展示真实命令'],['交互审计','与 API Audit 不等价','覆盖范围待验证']],
 '文件传输':[['传输事件','外部审计引用','不加载文件内容'],['留存策略','待 S4 确认','本页非文件管理器']],
 '配置差异':[['模板引用','revision-demo-01 → revision-demo-02','示例变更'],['凭据','仅保留引用名','禁止记录明文']],
 '容量与健康':[['容量','待约定','未接入实时采集'],['健康','未知','连接失败不当作正常'],['升级窗口','待提供方约定','业务影响需确认']],
 '备份记录':[['backup-plan-demo','计划待确认','没有真实备份证据'],['恢复演练','未执行','不能以备份任务成功代替恢复验证']],
 '项目配置':[['仓库','registry-demo（候选）','提供方待确认'],['项目','s1-infra / s2-models 分开','装机与模型制品隔离'],['访问授权','S4 IAM / RBAC 引用','凭据只留引用']],
 '制品与保留':[['装机镜像','保留模板引用版本','清理前核对模板'],['模型镜像','S2 自管','S1 不接管制品主数据'],['垃圾回收','策略待定','不能误删模板引用版本']],
 '同步与访问':[['跨中心同步','待定','带宽与一致性待评估'],['构建来源','待确认','外部构建或平台托管待定'],['地址','registry.example.invalid','凭据引用不显示明文']],
 '节点与连接':[['pg-node-01','主 · 读写（示例）','就绪'],['pg-node-02 / pg-node-03','备 · 同步（示例）','就绪'],['连接地址','pg-cluster.example.invalid','凭据引用，不显示明文'],['库 / Schema','业务方管理','S1 不托管业务数据结构']],
 '日志与事件':[['阶段事件','控制器回传','无真实日志'],['失败原因','保留执行阶段与错误','重试先核对状态']],
 '配置快照':[['模板','revision-demo-01','任务创建时锁定'],['目标','对象稳定标识','不显示秘密'],['清理范围','独立授权引用','执行前预检']],
 '关联集群':[['compute-lab','实验中心','示例归属'],['management-demo','执行集群','连接未验证']],
 '连接事件':[['last-observed','10:24 / 示例','保留观测时间'],['disconnect-policy','标记未知','不推断资源释放']],
 '使用事件':[['凭据使用','仅引用与操作人','不记明文'],['轮换','外部密钥系统','页面不执行轮换']]
};
