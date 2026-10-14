<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { navigation, resolveNavigation } from '@/router/navigation.js';
import { useDemoStore } from '@/stores/demo';
import { MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, UserOutlined, SearchOutlined, DashboardOutlined, DesktopOutlined, ClusterOutlined, AppstoreOutlined, AlertOutlined, SafetyCertificateOutlined, DatabaseOutlined, BranchesOutlined, SettingOutlined } from '@ant-design/icons-vue';

const route = useRoute();
const demo = useDemoStore();
const collapsed = ref(false);
const region = ref('实验中心');
const search = ref('');

const icons = { DashboardOutlined, DesktopOutlined, ClusterOutlined, AppstoreOutlined, AlertOutlined, SafetyCertificateOutlined, DatabaseOutlined, BranchesOutlined, SettingOutlined };
const current = computed(() => resolveNavigation(String(route.name || '')));
const activePage = computed(() => current.value?.parent);
const activeGroup = computed(() => current.value?.group);
const filteredPages = computed(() => navigation.flatMap((group) => group.children.map((child) => ({ ...child, group: group.title }))).filter((page) => `${page.title} ${page.key}`.includes(search.value.trim())));
</script>

<template>
  <div class="console-layout" :class="{ collapsed }">
    <header class="console-header">
      <RouterLink class="brand" to="/overview" aria-label="基础设施与算力平台首页">
        <span class="brand-mark">AI</span>
        <span>基础设施与算力</span>
      </RouterLink>
      <div class="header-actions">
        <a-input v-model:value="search" allow-clear placeholder="搜索页面 / 模块" aria-label="搜索页面 / 模块" class="page-search" @keydown.esc="search = ''"><template #prefix><SearchOutlined /></template></a-input>
        <label class="demo-switch" title="演示入口统一开关：总览演示场景与模拟 S2 申请">
          <a-switch v-model:checked="demo.enabled" size="small" /><span>演示</span>
        </label>
        <a-button type="text" aria-label="通知"><BellOutlined /></a-button>
        <a-button type="text" aria-label="用户"><UserOutlined /> 廖坤</a-button>
      </div>
    </header>
    <div class="console-body">
      <aside class="sidebar" aria-label="模块导航">
        <div class="sidebar-scroll">
          <small class="nav-caption">平台视图</small>
          <nav class="side-nav">
            <div v-for="group in navigation.filter((item) => item.scope === 'global')" :key="group.key" class="nav-group">
              <RouterLink :to="{ name: group.children[0].key }" :class="{ active: activeGroup?.key === group.key }" :title="group.title" :aria-label="group.title">
                <component :is="icons[group.icon as keyof typeof icons]" class="nav-icon" /><span v-if="!collapsed">{{ group.title }}</span>
              </RouterLink>
              <div v-if="!collapsed && activeGroup?.key === group.key && group.children.length > 1" class="sub-nav">
                <RouterLink v-for="child in group.children" :key="child.key" :to="{ name: child.key }" :class="{ active: activePage === child.key }" :aria-current="activePage === child.key ? 'page' : undefined">{{ child.title }}</RouterLink>
              </div>
            </div>
          </nav>
          <div class="nav-divider" />
          <small class="nav-caption">区域资源</small>
          <nav class="side-nav">
            <div v-for="group in navigation.filter((item) => item.scope === 'regional')" :key="group.key" class="nav-group">
              <RouterLink :to="{ name: group.children[0].key }" :class="{ active: activeGroup?.key === group.key }" :title="group.title" :aria-label="group.title">
                <component :is="icons[group.icon as keyof typeof icons]" class="nav-icon" /><span v-if="!collapsed">{{ group.title }}</span>
              </RouterLink>
              <div v-if="!collapsed && activeGroup?.key === group.key" class="sub-nav">
                <RouterLink v-for="child in group.children" :key="child.key" :to="{ name: child.key }" :class="{ active: activePage === child.key }" :aria-current="activePage === child.key ? 'page' : undefined">{{ child.title }}</RouterLink>
              </div>
            </div>
          </nav>
        </div>
        <div class="sidebar-footer">
          <label v-if="!collapsed" class="region-picker"><span>当前区域</span><a-select v-model:value="region" size="small"><a-select-option value="实验中心">实验中心</a-select-option><a-select-option value="华东生产区">华东生产区</a-select-option><a-select-option value="西南 GPU 区">西南 GPU 区</a-select-option></a-select></label>
          <button :aria-label="collapsed ? '展开侧栏' : '折叠侧栏'" @click="collapsed = !collapsed"><MenuUnfoldOutlined v-if="collapsed" /><MenuFoldOutlined v-else /></button>
        </div>
      </aside>
      <main class="content"><div class="scope-banner">设计原型 · {{ activeGroup?.scope === 'global' ? '全局平台视图 · 不随区域切换' : `当前区域：${region}` }} · 全部数据为虚构示例，不连接真实 API；区域选择不表示真实数据筛选。</div><RouterView /></main>
    </div>
    <div v-if="search" class="search-results" role="region" aria-label="页面搜索结果">
      <RouterLink v-for="page in filteredPages" :key="`${page.group}-${page.key}`" :to="`/${page.key}`" @click="search = ''"><span>{{ page.title }}</span><small>{{ page.group }}</small></RouterLink>
      <span v-if="!filteredPages.length" class="search-empty">未找到页面</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.console-layout { height: 100%; display: flex; flex-direction: column; background: var(--console-bg); }
.console-header { height: var(--console-header-height); flex: none; display: flex; align-items: center; gap: 26px; padding: 0 28px; background: var(--console-surface); border-bottom: 1px solid var(--console-border); }
.brand { display: flex; align-items: center; gap: 10px; width: 220px; font-weight: 600; white-space: nowrap; }
.brand-mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; color: white; background: var(--console-blue); font-size: 12px; font-weight: 700; }
.header-actions { margin-left: auto; display: flex; align-items: center; gap: 4px; }
.page-search { width: 220px; }
.demo-switch { display: inline-flex; align-items: center; gap: 6px; margin-inline: 8px; color: var(--console-text-muted); font-size: 12px; white-space: nowrap; }
.console-body { display: grid; grid-template-columns: var(--console-sidebar-width) minmax(0, 1fr); flex: 1; min-height: 0; }
.sidebar { display: flex; flex-direction: column; min-width: 0; padding: 22px 12px 14px; background: var(--console-surface); border-right: 1px solid var(--console-border); }
.sidebar-scroll { min-height: 0; overflow: auto; }
.nav-caption { display: block; padding: 0 12px 8px; color: var(--console-text-muted); font-size: 11px; letter-spacing: .04em; }
.side-nav { display: flex; flex-direction: column; gap: 3px; }
.side-nav > a, .nav-group > a { display: flex; align-items: center; gap: 9px; padding: 9px 12px; color: var(--console-text-muted); border-radius: 6px; }
.side-nav > a:hover, .nav-group > a:hover, .side-nav > a.active, .nav-group > a.active { color: var(--console-blue); background: var(--console-blue-soft); font-weight: 500; }
.nav-icon { width: 20px; flex: none; font-size: 17px; }
.sub-nav { display: flex; flex-direction: column; gap: 2px; margin: 2px 0 7px 41px; border-left: 1px solid var(--console-border); }
.sub-nav a { padding: 7px 10px; color: var(--console-text-muted); font-size: 13px; }
.sub-nav a:hover, .sub-nav a.active { color: var(--console-blue); font-weight: 500; }
.nav-divider { height: 1px; margin: 18px 12px; background: var(--console-border); }
.sidebar-footer { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-top: auto; padding: 14px 8px 0; color: var(--console-text-muted); border-top: 1px solid var(--console-border); }
.region-picker { display: flex; flex: 1; flex-direction: column; gap: 6px; font-size: 11px; }
.region-picker :deep(.ant-select) { width: 100%; }
.sidebar-footer button { width: 28px; height: 28px; border: 0; background: transparent; color: inherit; }
.content { min-width: 0; overflow: auto; }
.scope-banner { padding: 10px 28px; color: var(--console-text-muted); border-bottom: 1px solid var(--console-border); font-size: 12px; }
.collapsed .console-body { grid-template-columns: 72px minmax(0, 1fr); }
.collapsed .sidebar { padding-inline: 12px; }
.collapsed .nav-caption, .collapsed .nav-divider { display: none; }
.collapsed .side-nav > a, .collapsed .nav-group > a { justify-content: center; padding-inline: 6px; }
.search-results { position: absolute; z-index: 10; top: 54px; right: 150px; width: 300px; max-height: 60vh; overflow: auto; padding: 8px; background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); box-shadow: var(--console-shadow); }
.search-results a { display: flex; justify-content: space-between; padding: 9px 10px; border-radius: 5px; }
.search-results a:hover { background: var(--console-blue-soft); color: var(--console-blue); }
.search-results small, .search-empty { color: var(--console-text-muted); }
.search-empty { display: block; padding: 10px; }
@media (max-width: 900px) { .page-search { display: none; } .brand { width: auto; } .console-header { gap: 12px; } }
@media (max-width: 600px) { .console-layout { --console-sidebar-width: 160px; } .console-header { padding-inline: 12px; } .brand { font-size: 12px; } .sidebar { padding-inline: 6px; } .scope-banner { padding-inline: 12px; } .sub-nav { margin-left: 20px; } }
</style>
