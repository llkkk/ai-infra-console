// 交付链路地图（总览页）：按“供应线 → 交付线 + 横切”组织页面入口。
// 节点 = [页面标题, 页面 ID, 所属模块标注]；链路只列主要流转顺序，不是全部页面。
// 模块标注必须与 catalog.groups 的导航分组一致，由 chain.test.js 校验。
export const CHAIN={
 supply:{label:'供应线 · 把机器变成可用算力',nodes:[
  ['服务器资产','assets','基础设施'],
  ['BMC 与硬件','bmc','基础设施'],
  ['硬件能力','capabilities','基础设施'],
  ['镜像与模板','images','基础设施'],
  ['装机任务','provisioning','基础设施'],
  ['Kubernetes 集群','clusters','集群与算力'],
  ['节点 / GPU','nodes','集群与算力'],
  ['资源规格','specs','集群与算力']]},
 delivery:{label:'交付线 · 把算力变成可用环境',nodes:[
  ['资源池','pools','资源与交付'],
  ['环境申请','environment-requests','资源与交付'],
  ['资源分配','allocations','资源与交付'],
  ['交付环境','deliveries','资源与交付'],
  ['工作负载状态','workloads','资源与交付']]},
 cross:{label:'横切 · 覆盖全链',nodes:[
  ['监控与告警','monitor','运行期观测'],
  ['运维与审计','audit','受控接入'],
  ['基础服务','services','平台依赖'],
  ['任务中心','tasks','异步执行'],
  ['平台治理','settings','全局规则']]}
};
