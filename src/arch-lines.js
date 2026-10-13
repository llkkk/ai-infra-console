// 三条流程线数据：内容移植自根目录 s1-arch-diagram.html（S1 总体技术架构交互图解），
// 按模块挂到 基础设施 / 集群与算力 / 资源与交付 的“技术方案”弹窗。
// layers 只包含该线涉及的层；on:false 的节点淡显作上下文（不在这条线上）。
// info = 节点点击后的职责说明 [标题, 说明]；steps = [粗体引导, 正文]。
export const ARCH_LINES={
 assets:{id:'provision',name:'装机线',title:'装机线 · 机器从无到有',color:'#f97316',
  hint:'S1 在管理集群声明 BMH，由 BMO / Ironic 完成供应；S1 不直接触碰物理机。',
  layers:[
   {name:'S1 层 · 对外唯一入口',nodes:[{id:'s1api',label:'S1 控制台 / 业务 API',sub:'资产·资源池·交付·审计',type:'t-ctrl',on:true}]},
   {name:'管理集群 · S1 的控制面',nodes:[
    {id:'rancher',label:'Rancher Server',sub:'多集群纳管',type:'t-ctrl',on:false},
    {id:'capi',label:'Cluster API',sub:'集群生命周期',type:'t-ctrl',on:false},
    {id:'metal3',label:'Metal3',sub:'BMH CRD → BMO → Ironic',type:'t-ctrl',on:true},
    {id:'ironic',label:'Ironic',sub:'裸机供应执行者',type:'t-ctrl',on:true},
    {id:'bmc',label:'BMC',sub:'Redfish / IPMI 带外',type:'t-bmc',on:true},
    {id:'pxe',label:'PXE 装机网络',sub:'DHCP · TFTP · HTTP',type:'t-net',on:true}]},
   {name:'物理机 · 最底层',nodes:[{id:'phys',label:'物理服务器',sub:'BMC ┊ 网卡 ┊ GPU ┊ 磁盘',type:'t-bmc',on:true}]}],
  edges:[['s1api','metal3'],['metal3','ironic'],['ironic','bmc'],['bmc','phys'],['ironic','pxe'],['pxe','phys']],
  steps:[
   ['S1 下意图','：在管理集群的 K8s API 上创建 BareMetalHost CR（BMC 地址、期望镜像）。不是调 Metal3 的 API——Metal3 没有独立 API 服务。'],
   ['BMO 接单','：BareMetal Operator 监听到 BMH CR，驱动 Ironic 开始执行。'],
   ['Ironic 执行','：经 Redfish / IPMI 指挥 BMC（电源、启动顺序）；经 PXE 网络（DHCP 分 IP → TFTP 取引导程序 → HTTP 下发 IPA 与系统镜像）完成装机。'],
   ['进可用池','：BMH 状态机走到 available——装好 OS、通电待命的裸机，等待被集群线认领。']],
  owner:'平台保存归属与操作授权，硬件状态由带外接口与检查结果提供；资产与 BMH、CAPI Machine、Node 通过稳定标识关联；CAPI 已接管的机器不得旁路重装。',
  decision:'待确认：厂商协议与凭据托管、PXE 网络准入、镜像构建来源、系统盘稳定标识与数据盘保留、固件授权与失败补偿。',
  info:{
   s1api:['S1 控制台 / 业务 API','S1 对外的唯一入口。向下把基础设施意图下发给管理集群，向上把状态回流给任务中心；不直接碰物理机，一切经由管理集群 API 间接完成。'],
   metal3:['Metal3','裸金属主机管理。BareMetalHost CR 描述一台物理机（BMC 地址、期望镜像），BMO 监听 CR 变化并驱动 Ironic 执行。S1 不是直接调 Metal3 的 API，而是通过管理集群的 K8s API 声明「我想要这台机器装成这样」。'],
   ironic:['Ironic','裸机供应的真正执行者。维护装机状态机（enroll → inspect → deploy → active），指挥 PXE 启动、下发镜像、控制电源。Metal3 负责「想要什么」，Ironic 负责「动手做」。'],
   bmc:['BMC','服务器带外管理芯片（Redfish / IPMI）。不依赖主机操作系统，可远程开关机、看 KVM、挂虚拟媒体；是 Ironic 控制物理机的抓手。'],
   pxe:['PXE 装机网络','网络启动三件套：DHCP 分配 IP 并指引 TFTP；TFTP 提供网络引导程序；HTTP 下发 IPA 与系统镜像。大文件走 HTTP 直达网卡，不经过 BMC。'],
   phys:['物理服务器','最底层：BMC（带外）、PXE 网卡（装机）、CPU / 内存、GPU、磁盘。一切控制最终都落到这台机器上。'],
   capi:['Cluster API','集群线的主角，本线不经过：只有被 CAPI 认领的机器才走集群供应流程；独立装机产出的裸机停在 available 待命。'],
   rancher:['Rancher Server','多集群纳管，本线不经过：Rancher 不参与裸机供应，装机结果只到「可用裸机」为止。']}},
 clusters:{id:'cluster',name:'集群线',title:'集群线 · 集群生老病死',color:'#2563eb',
  hint:'S1 只在管理集群创建一组 CR，之后控制器各自认领工作，S1 等状态回流——这就是声明式。',
  layers:[
   {name:'S1 层 · 对外唯一入口',nodes:[{id:'s1api',label:'S1 控制台 / 业务 API',sub:'集群模板·变更意图',type:'t-ctrl',on:true}]},
   {name:'管理集群 · S1 的控制面',nodes:[
    {id:'rancher',label:'Rancher Server',sub:'多集群统一纳管',type:'t-ctrl',on:true},
    {id:'turtles',label:'Turtles',sub:'Rancher 的 CAPI 适配器',type:'t-ctrl',on:true},
    {id:'capi',label:'Cluster API',sub:'声明式集群生命周期',type:'t-ctrl',on:true},
    {id:'capm3',label:'CAPM3',sub:'CAPI 的 Metal3 提供者',type:'t-ctrl',on:true},
    {id:'rke2p',label:'RKE2 Provider',sub:'CAPI 的系统安装提供者',type:'t-ctrl',on:true},
    {id:'metal3',label:'Metal3',sub:'BMH CRD → BMO → Ironic',type:'t-ctrl',on:true},
    {id:'ironic',label:'Ironic',sub:'裸机供应执行者',type:'t-ctrl',on:false}]},
   {name:'物理机 · 最底层',nodes:[{id:'phys',label:'物理服务器',sub:'BMC ┊ 网卡 ┊ GPU ┊ 磁盘',type:'t-bmc',on:true}]}],
  edges:[['s1api','capi'],['capi','capm3'],['capm3','metal3'],['capi','rke2p'],['rke2p','phys'],['capi','turtles'],['turtles','rancher']],
  steps:[
   ['S1 下意图','：在管理集群 API 上创建一组 CR——Cluster + Metal3Cluster（集群定义）、MachineDeployment + Metal3Machine（带 hostSelector 的机器需求）、RKE2Config（系统安装配置）。'],
   ['CAPI 接单','：CAPI 控制器看到 Cluster，开始走集群供应流程；MachineDeployment 展开成一个个 Machine。'],
   ['CAPM3 领机器','：按 hostSelector 在可用池里挑 available 的 BareMetalHost，打 consumerRef 认领 → Ironic 部署 → provisioned。'],
   ['RKE2 Provider 装机','：机器启动后按 RKE2Config 安装 RKE2，生成 kubeconfig；首个控制面节点起来后，Cluster 状态变为就绪。'],
   ['Turtles 导入','：新集群自动注册进 Rancher Server 纳管；S1 收尾更新资产与资源池，可开始 Namespace / 配额 / RBAC 交付。'],
   ['关键','：以上步骤之间没有任何直接 API 调用，全是控制器 watch 管理集群 API 上的 CR 变化、各自认领工作；S1 下完意图就等状态回来。']],
  owner:'集群生命周期只有一个执行入口（CAPI）；Rancher 只做纳管与资源探索，不作为供应或变更入口；已有集群只纳管，不默认接管 OS 与升级。',
  decision:'待确认：Provider 版本兼容矩阵、控制面拓扑、CNI / CSI 选型、驱动与设备插件管理权（镜像预装或 Operator 二选一）、HAMi 与 Volcano 组合验证。',
  info:{
   s1api:['S1 控制台 / 业务 API','S1 对外的唯一入口。集群线里它只做一件事：把「我要一个这样的集群」写成一组 CR 交给管理集群，然后等状态回流。'],
   capi:['Cluster API','声明式的集群生命周期管理：创建、扩缩容、升级、退役。核心理念是「用 K8s 管 K8s」——集群本身被描述成 CRD（Cluster / Machine），由控制器去实现。'],
   capm3:['CAPM3','Cluster API 的 Metal3 基础设施提供者。把 CAPI 的 Machine 需求翻译成 Metal3 的裸机供应请求：CAPI 说「我要 3 台机器」，CAPM3 负责去找 Metal3 要。'],
   rke2p:['RKE2 Provider','CAPI 的 Bootstrap 提供者。机器供应好之后，负责在裸机上安装 RKE2 系统、生成 kubeconfig，把一台裸机变成 K8s 节点。'],
   turtles:['Turtles','Rancher 的 Cluster API 适配器。让 Rancher 能通过 CAPI 供应集群；CAPI 建好的集群会自动导入 Rancher 纳管，是两者之间的翻译层。'],
   rancher:['Rancher Server','多集群统一纳管与权限视图。本身不供应机器（供应交给 CAPI）；S1 在此做授权映射——哪个用户 / 项目能进哪些集群。'],
   metal3:['Metal3','裸金属主机管理。集群线里被 CAPM3 认领（consumerRef），按需驱动 Ironic 把可用池里的裸机部署成集群节点。'],
   ironic:['Ironic','裸机供应执行者，本线不直接经过：CAPM3 认领 BMH 后由它在后台完成部署（详见装机线）。'],
   phys:['物理服务器','最底层。RKE2 Provider 的引导配置最终在这台机器上生效，成为业务集群的节点。']}},
 pools:{id:'usage',name:'使用线',title:'使用线 · S1 / S2 用集群',color:'#16a34a',
  hint:'S1 打包交付环境，S2 直连业务集群 API 部署模型，S1 不做代理；GPU 能力由 S1 预装。',
  layers:[
   {name:'S1 层 · 对外唯一入口',nodes:[{id:'s1api',label:'S1 控制台 / 业务 API',sub:'资源池·分配·交付',type:'t-ctrl',on:true}]},
   {name:'业务集群 · 被管理对象',nodes:[
    {id:'ns',label:'Namespace / 配额 / RBAC',sub:'S1 交付给 S2 的环境边界',type:'t-ctrl',on:true},
    {id:'gpuop',label:'GPU Operator',sub:'驱动与容器设备栈',type:'t-gpu',on:true},
    {id:'hami',label:'HAMi',sub:'GPU 切分共享',type:'t-gpu',on:true},
    {id:'volcano',label:'Volcano',sub:'批量任务队列调度',type:'t-gpu',on:true},
    {id:'s2',label:'S2 模型工程',sub:'直接调 k8s API 部署模型',type:'t-ext',on:true}]}],
  edges:[['s1api','ns'],['s2','ns'],['ns','gpuop']],
  steps:[
   ['S1 交付环境','：在业务集群创建 Namespace / ResourceQuota / RBAC，把「权限 + 资源承诺 + 配套入口」打包交付给 S2。'],
   ['S2 部署模型','：在交付的 Namespace 内直接调 k8s API（S1 不做代理）——选卡（nodeAffinity）、做 TP / EP / PP 划分、管理模型制品与版本。'],
   ['GPU 能力就绪','：GPU Operator（驱动与设备栈）、HAMi（切分共享）、Volcano（批量队列调度）由 S1 预先装好，S2 直接使用；推理走标准 K8s 调度，训练类批任务走 Volcano。']],
  owner:'S1 提供资源事实与运行底座；S2 管工作负载与业务就绪；项目身份引用 S4。配额不等于预留、已分配不等于利用率；共享释放不退出或清盘节点。',
  decision:'待确认：整卡 / MIG / HAMi 规格映射、容量计算与超配口径、S3 审批入口、S2 验收标准与最小部署样例、S5 计量事件边界。',
  info:{
   s1api:['S1 控制台 / 业务 API','S1 对外的唯一入口。使用线里它负责资源池、分配、交付与验收状态；不代理 S2 到集群的访问。'],
   ns:['Namespace / 配额 / RBAC','S1 交付给 S2 的环境边界：Namespace 隔离、ResourceQuota 限额、RBAC 限权。S2 只能在自己的地盘内操作，动不了节点和集群级资源。'],
   gpuop:['GPU Operator','管理 GPU 驱动与容器设备栈：驱动安装、container toolkit、device plugin。让 K8s 能识别并分配 GPU（nvidia.com/gpu）。'],
   hami:['HAMi','GPU 切分共享（vGPU）。把一张物理卡切成小块分给多个任务，提高利用率；是整卡直通之外的补充手段。'],
   volcano:['Volcano','批量任务的队列与调度（训练类）。负责排队、抢占、gang 调度；不介入在线推理，推理走标准 K8s 调度。'],
   s2:['S2 模型工程','外部调用方（已确认分工）。直接调用业务集群的 k8s API 部署模型：选卡、做 TP / EP / PP 划分、管理模型制品与版本。']}}
};
