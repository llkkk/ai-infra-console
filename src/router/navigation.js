export const navigation = [
  { key: 'overview', title: '总览', icon: 'DashboardOutlined', scope: 'global', children: [{ key: 'overview', title: '基础设施总览' }] },
  { key: 'monitor', title: '监控与告警', icon: 'AlertOutlined', scope: 'global', children: [{ key: 'monitor', title: '监控总览' }, { key: 'alerts', title: '告警中心' }, { key: 'incidents', title: '故障管理' }, { key: 'channels', title: '通知渠道' }] },
  { key: 'tasks', title: '任务中心', icon: 'BranchesOutlined', scope: 'global', children: [{ key: 'tasks', title: '任务列表' }] },
  { key: 'settings', title: '平台治理', icon: 'SettingOutlined', scope: 'global', children: [{ key: 'settings', title: '区域与故障域' }, { key: 'platform-services', title: '平台服务管理' }, { key: 'credentials', title: '凭据引用' }] },
  { key: 'assets', title: '服务器与装机', icon: 'DesktopOutlined', scope: 'regional', children: [{ key: 'assets', title: '服务器资产' }, { key: 'provisioning', title: '装机管理' }] },
  { key: 'clusters', title: '集群与算力', icon: 'ClusterOutlined', scope: 'regional', children: [{ key: 'clusters', title: 'Kubernetes 集群' }, { key: 'cluster-templates', title: '集群模板' }] },
  { key: 'pools', title: '资源与交付', icon: 'AppstoreOutlined', scope: 'regional', children: [{ key: 'pools', title: '资源池' }, { key: 'deliveries', title: '交付单' }, { key: 'specs', title: '资源规格' }] },
  { key: 'audit', title: '运维与审计', icon: 'SafetyCertificateOutlined', scope: 'regional', children: [{ key: 'audit', title: '运维接入' }, { key: 'audit-logs', title: '审计记录' }] },
  { key: 'services', title: '基础服务', icon: 'DatabaseOutlined', scope: 'regional', children: [{ key: 'registry', title: '镜像服务' }, { key: 'storage', title: '存储服务' }, { key: 'database', title: '数据库服务' }] }
];

// 详情按 parent 归入所属菜单页；并入集群详情的节点 / GPU 不再单列，仍保留精确详情路由供下钻。
export const detailPages = {
  asset: { parent: 'assets', title: '资产详情' },
  image: { parent: 'provisioning', title: '装机模板详情' },
  'provisioning-detail': { parent: 'provisioning', title: '装机任务详情' },
  baseline: { parent: 'provisioning', title: '硬件基线详情' },
  cluster: { parent: 'clusters', title: '集群详情' },
  node: { parent: 'clusters', title: '节点详情' },
  gpu: { parent: 'clusters', title: 'GPU 设备详情' },
  'cluster-template': { parent: 'cluster-templates', title: '集群模板详情' },
  'cluster-capability-detail': { parent: 'clusters', title: '集群能力详情' },
  spec: { parent: 'specs', title: '资源规格详情' },
  pool: { parent: 'pools', title: '资源池详情' },
  'delivery-order': { parent: 'deliveries', title: '交付单详情' },
  alert: { parent: 'alerts', title: '告警详情' },
  incident: { parent: 'incidents', title: '故障处理工作台' },
  'incident-review': { parent: 'incidents', title: '故障复盘' },
  policy: { parent: 'alerts', title: '告警策略详情' },
  channel: { parent: 'channels', title: '通知渠道详情' },
  access: { parent: 'audit', title: '运维接入详情' },
  session: { parent: 'audit-logs', title: '会话详情' },
  operation: { parent: 'audit-logs', title: '操作详情' },
  task: { parent: 'tasks', title: '任务详情' },
  region: { parent: 'settings', title: '区域详情' },
  credential: { parent: 'credentials', title: '凭据引用详情' },
  'platform-service': { parent: 'platform-services', title: '平台服务详情' },
  'registry-detail': { parent: 'registry', title: '镜像项目详情' },
  'storage-detail': { parent: 'storage', title: '存储服务详情' },
  'database-detail': { parent: 'database', title: '数据库集群详情' },
};
export const routeAliases = {
  '/assets/asset-list': 'assets', '/compute': 'clusters', '/compute/clusters': 'clusters',
  '/compute/templates': 'cluster-templates', '/delivery/pools': 'pools',
  '/delivery/deliveries': 'deliveries', '/operations/monitor': 'monitor',
  '/operations/incidents': 'incidents', '/operations/tasks': 'tasks', '/settings/regions': 'settings'
};
export function resolveNavigation(pageId) {
  const parent = detailPages[pageId]?.parent || pageId;
  const group = navigation.find((item) => item.children.some((child) => child.key === parent));
  if (!group) return null;
  const page = group.children.find((child) => child.key === parent);
  return { group, parent, title: detailPages[pageId]?.title || page.title };
}
