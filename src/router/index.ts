import { createRouter, createWebHistory } from 'vue-router';
import { navigation, detailPages, routeAliases, resolveNavigation } from './navigation.js';
export { navigation } from './navigation.js';
const pages = navigation.flatMap((group) => group.children);
// 每个导航模块由 src/views/<模块 key>/index.vue 负责本模块的列表、详情与工作台；详情通过 parent 归入所属模块。
const moduleViews: Record<string, () => Promise<unknown>> = {
  overview: () => import('@/views/overview/index.vue'),
  assets: () => import('@/views/infrastructure/index.vue'),
  clusters: () => import('@/views/clusters/index.vue'),
  pools: () => import('@/views/pools/index.vue'),
  monitor: () => import('@/views/monitor/index.vue'),
  audit: () => import('@/views/audit/index.vue'),
  services: () => import('@/views/services/index.vue'),
  tasks: () => import('@/views/tasks/index.vue'),
  settings: () => import('@/views/settings/index.vue')
};
function pageComponent(id: string) {
  const group = resolveNavigation(id)?.group.key;
  if (!group) throw new Error(`页面未登记所属模块：${id}`);
  return moduleViews[group];
}
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/overview' },
    ...pages.map((page) => ({ path: `/${page.key}`, name: page.key, component: pageComponent(page.key) })),
    ...Object.keys(detailPages).map((key) => ({ path: `/${key}`, name: key, component: pageComponent(key) })),
    ...navigation.flatMap((group) => group.children.map((page) => ({ path: `/${group.key}/${page.key}`, redirect: { name: page.key } }))),
    ...Object.entries(routeAliases).map(([path, name]) => ({ path, redirect: { name } })),
    { path: '/:pathMatch(.*)*', component: () => import('@/views/NotFound.vue') }
  ]
});
