<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { auditListData, auditDetailData, auditListPages, auditLogTabs, evidenceLinkFor } from '@/common/utils/audit.js';
import { listSource, planConfig } from '@/common/utils/objects.js';
import ObjectDetail from '@/common/components/ObjectDetail.vue';
import PlanModal from '@/common/components/PlanModal.vue';
import RecordList from './components/RecordList.vue';
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
type Cell = string | number;
interface List { title: string; description: string; columns: string[]; rows: Cell[][]; detail: string; action: string | null; }
interface Detail { title: string; description: string; id: string; parent: string; row: Cell[]; fields: Cell[][]; tabs: { key: string; title: string; rows: Cell[][] }[]; action: string | null; }
const route = useRoute();
const pageId = computed(() => String(route.name));
const isList = computed(() => auditListPages.includes(pageId.value));
const list = computed(() => auditListData(pageId.value) as List | null);
const detail = computed(() => (isList.value ? null : auditDetailData(pageId.value, typeof route.query.id === 'string' ? route.query.id : '')) as Detail | null);
const listActionTitle = computed(() => (list.value?.action ? planConfig(list.value.action)?.title : undefined));
const logTabs = auditLogTabs().map(tab => ({ ...tab, list: listSource(tab.source) as List | null }));
const selectedPlan = ref<{ action: string; context: Cell[] } | null>(null);
watch(() => route.fullPath, () => { selectedPlan.value = null; });
function openPlan(action: string, context: Cell[]) { if (planConfig(action)) selectedPlan.value = { action, context }; }
</script>
<template>
  <div class="business-page">
    <RouterLink v-if="!isList && detail" :to="{ name: detail.parent }" class="back-link"><ArrowLeftOutlined /> 返回列表</RouterLink>
    <header class="page-heading">
      <div>
        <h1>{{ isList ? list?.title : detail?.title || '对象不存在' }}<small v-if="detail && !isList">{{ detail.id }}</small></h1>
        <p>{{ isList ? list?.description : detail?.description }}</p>
      </div>
      <a-button v-if="!isList && detail?.action" type="primary" @click="openPlan(detail.action, detail.row)">配置 / 操作计划</a-button>
    </header>
    <RecordList v-if="pageId === 'audit' && list" :key="pageId" :title="list.title" :columns="list.columns" :rows="list.rows" :detail="list.detail" :action="list.action" :action-title="listActionTitle" @plan="list.action && openPlan(list.action, [])" />
    <a-tabs v-else-if="pageId === 'audit-logs'" class="panel-tabs">
      <a-tab-pane v-for="tab in logTabs" :key="tab.key" :tab="tab.title">
        <RecordList v-if="tab.list" :key="tab.key" :title="tab.list.title" :columns="tab.list.columns" :rows="tab.list.rows" :detail="tab.list.detail" :action="tab.list.action" :action-title="tab.list.action ? planConfig(tab.list.action)?.title : undefined" :replay="tab.replay" @plan="tab.list!.action && openPlan(tab.list!.action, [])" />
      </a-tab-pane>
    </a-tabs>
    <template v-else-if="detail">
      <a-alert v-if="!route.query.id" class="example-notice" type="info" show-icon :message="`未指定对象，当前明确展示页面示例 ${detail.id}。`" />
      <ObjectDetail :key="`${pageId}:${detail.id}`" :fields="detail.fields" :tabs="detail.tabs" :evidence-link="evidenceLinkFor" />
      <section class="panel related">
        <h2>关联与执行证据</h2>
        <p class="muted">配置与实时状态分别呈现；权限不足、管理权不适用或失联时不允许直接变更。</p>
        <div class="related-links"><RouterLink :to="{ name: 'tasks' }">查看关联任务</RouterLink><RouterLink :to="{ name: 'audit-logs' }">查看审计记录</RouterLink></div>
      </section>
    </template>
    <a-result v-else status="404" title="未找到该示例对象" sub-title="不会自动回退到其他对象，检查地址中的 id。" />
    <PlanModal v-if="selectedPlan" :key="selectedPlan.action + selectedPlan.context.join('|')" :action="selectedPlan.action" :context="selectedPlan.context" @close="selectedPlan = null" />
  </div>
</template>
<style scoped>
.business-page { max-width: 1440px; margin-inline: auto; padding: var(--console-space-8); }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--console-space-6); margin-bottom: var(--console-space-6); }
h1 { margin: 0; font-size: 28px; }
h1 small { display: block; margin-top: var(--console-space-2); font-size: 14px; color: var(--console-text-muted); font-weight: 400; }
.page-heading p { color: var(--console-text-muted); margin-block: var(--console-space-2) 0; max-width: 760px; }
.back-link { display: inline-flex; align-items: center; gap: var(--console-space-2); color: var(--console-blue); margin-bottom: var(--console-space-6); }
.example-notice { margin-bottom: var(--console-space-6); }
.related { margin-top: var(--console-space-6); padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.related h2 { margin: 0 0 var(--console-space-3); font-size: 18px; }
.muted { color: var(--console-text-muted); }
.related-links { display: flex; flex-wrap: wrap; gap: var(--console-space-4); margin-top: var(--console-space-4); color: var(--console-blue); }
@media (max-width: 600px) { .business-page { padding: var(--console-space-3); } .page-heading { flex-direction: column; } }
</style>
