import {bmcRecords,requestMatch,deliveryLife,clusterCapability,compute03Story,nodeRecords} from './model.js';

// 页签内容优先按页面 + 当前对象上下文生成；未覆盖的页签回退到静态表。
export function tabContent(page,active,context){
 const id=context?.[0];
 const gen={
  'bmc-detail':bmcTab,
  'environment-request':requestTab,
  'delivery':deliveryTab,
  'cluster-capability-detail':clusterCapTab,
  'capability-detail':capabilityTab,
  'node':nodeTab
 }[page];
 if(gen){const rows=gen(active,id);if(rows)return rows;}
 if(active==='使用对象')return [[id||'demo-object','授权范围引用','测试对象组'],['其他对象','禁止默认全局授权','需独立审批']];
 return staticTabs[active]||null;
}

function bmcTab(active,id){
 const b=bmcRecords.find(x=>x.id===id);
 if(!b)return null;
 const d=b.detail;
 if(active==='连接与能力')return [['协议',b.proto+'（Redfish 优先 / IPMI 兼容）','适配器候选'],['连接状态',d.connText,'连接测试需授权；连通不等于验收'],['KVM / VNC',d.kvmText,'厂商差异待确认']];
 if(active==='硬件快照')return [['硬件快照',d.snapshotText,'版本化保留来源与时间'],['人工录入','仅作待核验信息','不覆盖 BMC 事实'],['固件版本','厂商矩阵待确认','—']];
 if(active==='传感器')return [['传感器状态',d.sensorText,'Redfish exporter（候选）'],['缺数据策略','标未知，不视为正常或空闲','监控约定']];
 if(active==='电源/介质')return [['电源变更',d.powerOps,'授权 + 预检；破坏性动作二次确认'],['远程介质',d.mediaText,'破坏性操作，单独授权'],['启动顺序','以带外能力采集为准','待采集']];
 return null;
}

function requestTab(active,id){
 const m=requestMatch[id];
 if(!m)return null;
 if(active==='匹配结果')return [
  ['容量匹配',m.capacity.verdict,m.capacity.detail],
  ['配额检查',m.quota.verdict,m.quota.detail],
  ['可选下一步',m.next.map(n=>n[0]).join(' / '),'相关页面入口见下方'],
  ['结论',m.conclusion,'示例预检，不执行真实操作']];
 if(active==='审批与事件')return [['审批入口','待跨团队确认','S3 引用'],['匹配预检','本页生成结果，不执行','示例'],['预留创建','匹配确认后生成','预留 ≠ 实际占用']];
 return null;
}

function deliveryTab(active,id){
 const L=deliveryLife[id];
 if(!L)return null;
 if(active==='交付清单')return L.deliverables;
 if(active==='底座验收')return [['底座验收',L.baseAccept,'与 S2 接收分别记录'],['平台就绪','节点 / 网络 / 存储 / 设备 / 镜像','平台就绪 ≠ 模型就绪']];
 if(active==='S2 接收')return [['S2 接收',L.s2Accept,'交付完成条件'],['最小部署样例','由 S2 提交','验收标准双方确认']];
 if(active==='释放回收')return [
  ...L.release.checks,
  ['释放门禁',L.release.gate,'释放预检'],
  ...(L.release.note?[['边界',L.release.note,'共享节点不因项目退出清盘']]:[])];
 return null;
}

function clusterCapTab(active,id){
 const c=clusterCapability[id];
 if(!c)return null;
 if(active==='验收清单')return [...c.checks,['结论',c.verdict,'验收证据另档保留']];
 if(active==='组件版本')return [['CNI / CSI','选型待确认','集群模板'],['GPU 软件栈','Operator / 设备插件待验证','版本组合待锁定'],['管理来源','集群模板 / GitOps 候选','页面不旁路修改']];
 if(active==='探针证据')return [['最小探针','未执行','网络 / 存储 / GPU / 镜像'],['证据要求','探针结果留档后才能标通过','验收通过条件']];
 return null;
}

function capabilityTab(active,id){
 if(active!=='验收记录')return null;
 if(id==='compute-03')return [
  ...compute03Story.acceptance,
  ['硬件检查历史','09:50 失败 → 10:40 重检通过','TASK-DEMO-02；失败原因保留'],
  ['结论',compute03Story.deliverable,'—']];
 if(id==='compute-02')return [['硬件 / OS 基线','通过（示例）','—'],['集群能力','通过（示例）','compute-lab'],['GPU 运行能力','部分受阻','GPU-DEMO-002 异常（INC-DEMO-01）']];
 return [['硬件 / OS 基线','通过（示例）','—'],['集群能力','通过（示例）','compute-lab'],['GPU 运行能力','待验证','DCGM 未接入']];
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
 '逻辑实例':[['整卡','1 UUID 对应物理设备','当前示例模式'],['MIG','profile 依硬件能力','未启用 / 待验证'],['HAMi','显存 / 算力约束','未启用 / 不承诺强隔离']],
 '监控':[['设备健康','无实时数据','DCGM / 插件候选'],['显存利用率','无实时数据','不等于显存配额'],['GPU 核心利用率','无实时数据','不使用分配率替代']],
 '适用资源池':[['gpu-general','整卡','仅示例配置，待实测'],['共享池','未配置','MIG / HAMi 验证后开放']],
 '使用记录':[['ALLOC-DEMO-01','整卡请求','示例分配事实'],['REQUEST-DEMO','需求引用','不含计费账本']],
 '成员授权':[['project-demo-model','统一项目标识','权限来自 S4'],['namespace RBAC','s2-model','作用域映射待确认']],
 '分配记录':[['ALLOC-DEMO-01','实际分配 6 卡','示例已交付'],['ALLOC-DEMO-03','预留 2 卡','验收前不算交付']],
 '验收记录':[['底座验收','节点 / 网络 / 存储 / 设备','示例待双方确认'],['S2 接收','权限 / 最小部署样例','与底座验收分别记录']],
 '占用事件':[['预留事件','容量保留','不认定计费开始'],['交付事件','双方接收约定','计量起止待 S5 确认'],['失联事件','占用待核实','不能直接释放']],
 '数据保留':[['模型文件','外部模型目录引用','S2 保留约定'],['运行数据','PVC / 对象前缀','保留 / 清理独立授权'],['共享节点','不得因项目退出清盘','维护是另一生命周期']],
 '诊断证据':[['采集信号','GPU 设备不可分配','示例事件'],['时间与来源','10:24 / DCGM 候选','无真实日志'],['业务影响','待 S2 关联模型实例','不能推断 API 失败']],
 '关联对象':[['资产 / 节点','compute-02','硬件到 Node 标识映射'],['GPU','GPU-DEMO-002','设备 UUID'],['分配','ALLOC-DEMO-02','模型影响待核实']],
 '处理记录':[['告警产生','示例待确认','规则来源引用'],['通知与静默','未执行','静默不改变故障状态']],
 '故障单':[['INC-DEMO-01','GPU-DEMO-002 设备不可分配','等待人工处理'],['建单策略','严重底座告警自动建单','警告级告警仅跟踪'],['关闭条件','按影响范围确定门禁','无 S2 影响：S1 复验关闭']],
 '通知路由':[['底座告警','S1 值班','联系方式只引用'],['模型影响','S2 联系人','关联条件待确认']],
 '静默窗口':[['maintenance-demo','30 分钟 / 示例','不改变底座健康'],['超时恢复通知','执行源负责','策略待定义']],
 '关联会话':[['SESSION-DEMO-01','SSH','JumpServer 证据引用'],['Pod exec / KVM / API','能力待验证','独立授权与留存']],
 '命令记录':[['命令证据','外部记录引用','不展示真实命令'],['交互审计','与 API Audit 不等价','覆盖范围待验证']],
 '文件传输':[['传输事件','外部审计引用','不加载文件内容'],['留存策略','待 S4 确认','本页非文件管理器']],
 '配置差异':[['模板引用','revision-demo-01 → revision-demo-02','示例变更'],['凭据','仅保留引用名','禁止记录明文']],
 '可用实例':[['registry-demo','示例实例','健康未接入'],['服务提供方','待确认','不承诺 SLA']],
 '接入记录':[['project-demo-model','项目访问需求','待提供方确认'],['credential-ref','权限引用','不含密码']],
 '容量与健康':[['容量','待约定','未接入实时采集'],['健康','未知','连接失败不当作正常'],['升级窗口','待提供方约定','业务影响需确认']],
 '备份记录':[['backup-plan-demo','计划待确认','没有真实备份证据'],['恢复演练','未执行','不能以备份任务成功代替恢复验证']],
 '日志与事件':[['阶段事件','控制器回传','无真实日志'],['失败原因','保留执行阶段与错误','重试先核对状态']],
 '配置快照':[['模板','revision-demo-01','任务创建时锁定'],['目标','对象稳定标识','不显示秘密'],['清理范围','独立授权引用','执行前预检']],
 '关联集群':[['compute-lab','实验中心','示例归属'],['management-demo','执行集群','连接未验证']],
 '连接事件':[['last-observed','10:24 / 示例','保留观测时间'],['disconnect-policy','标记未知','不推断资源释放']],
 '版本矩阵':[['组件版本','待锁定','按组合验证'],['管理权','唯一生命周期入口','写权限最小化']],
 '同步事件':[['首次同步','未执行','本原型无网络请求'],['同步失败','需保留错误与时间','不覆盖最后有效观测']],
 '使用事件':[['凭据使用','仅引用与操作人','不记明文'],['轮换','外部密钥系统','页面不执行轮换']]
};
