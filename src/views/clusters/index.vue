<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { clusterDetailPages, clusterListPages, detailData, evidenceLinkFor, listData } from '@/common/utils/clusters.js';
import { planConfig } from '@/common/utils/objects.js';
import ObjectList from '@/common/components/ObjectList.vue';
import ObjectDetail from '@/common/components/ObjectDetail.vue';
import PlanModal from '@/common/components/PlanModal.vue';
import TaskQuickView from '@/common/components/TaskQuickView.vue';
import { taskRecords } from '@/model.js';
import ClusterCreateWizard from './components/ClusterCreateWizard.vue';
import ClusterSummary from './components/ClusterSummary.vue';
import ClusterSource from './components/ClusterSource.vue';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons-vue';
type Cell = string | number;
interface Tab { key: string; title: string; rows: Cell[][] }
interface List { title: string; description: string; columns: string[]; rows: Cell[][]; detail: string; action: string | null; secondaryForms: string[] }
interface Stat { label: string; value: string; caption: string }
interface Capacity { label: string; unit: string; total: number; used: number; reserved: number }
interface Detail {
  id: string; parent: string; title: string; description: string; row: Cell[]; fields: Cell[][]; tabs: Tab[];
  action: string | null; actionLabel: string | null; badge: string | null;
  relatedLinks: { label: string; name: string; id: string }[];
  summary: { stats: Stat[]; capacity: Capacity[] | null; capacityNote: string } | null;
  source: { fields: Cell[][]; note: string } | null;
}
const route = useRoute();
const pageId = computed(() => String(route.name));
const isList = computed(() => clusterListPages.includes(pageId.value));
const requestedId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''));
const list = computed(() => (isList.value ? listData(pageId.value) as List | null : null));
const detail = computed(() => (clusterDetailPages.includes(pageId.value) ? detailData(pageId.value, requestedId.value) as Detail | null : null));
const selectedPlan = ref<{ action: string; context: Cell[] } | null>(null);
const createWizardOpen = ref(false);
const selectedTaskId = ref('');
const relatedTasks = computed(() => (detail.value && (pageId.value === 'cluster' || pageId.value === 'node')) ? taskRecords.filter(task => task.target === detail.value?.id) : []);
const title = computed(() => (list.value ? list.value.title : detail.value?.title ?? '对象不存在'));
const description = computed(() => (list.value ? list.value.description : detail.value?.description ?? ''));
watch(() => route.fullPath, () => { selectedPlan.value = null; createWizardOpen.value = false; selectedTaskId.value = ''; });
function openPlan(action: string, context: Cell[]) {
  if (action === 'cluster-create') { createWizardOpen.value = true; return; }
  if (planConfig(action)) selectedPlan.value = { action, context };
}
</script>
<template>
  <div class="business-page">
    <RouterLink v-if="detail" :to="{ name: detail.parent }" class="back-link"><ArrowLeftOutlined /> 返回列表</RouterLink>
    <header class="page-heading">
      <div>
        <h1>{{ title }}<small v-if="detail">{{ detail.id }}</small></h1>
        <p>{{ description }}</p>
      </div>
      <div v-if="list" class="heading-actions">
        <a-button v-for="form in list.secondaryForms" :key="form" @click="openPlan(form, [])">{{ planConfig(form)?.title }}</a-button>
        <a-button v-if="list.action" type="primary" @click="openPlan(list.action, [])"><PlusOutlined /> {{ planConfig(list.action)?.title }}</a-button>
      </div>
      <div v-else-if="detail" class="heading-actions">
        <RouterLink v-for="link in detail.relatedLinks" :key="link.name" :to="{ name: link.name, query: { id: link.id } }" class="related-link">{{ link.label }}</RouterLink>
        <a-button v-if="detail.action" type="primary" @click="openPlan(detail.action, detail.row)">{{ detail.actionLabel ?? planConfig(detail.action)?.title }}</a-button>
      </div>
    </header>
    <ObjectList v-if="list" :key="pageId" :columns="list.columns" :rows="list.rows" :detail="list.detail" />
    <template v-else-if="detail">
      <a-alert v-if="!requestedId" class="example-notice" type="info" show-icon :message="`未指定对象，当前明确展示页面示例 ${detail.id}。`" />
      <a-tag v-if="detail.badge" class="status-tag" :color="detail.badge === '运行中' ? 'success' : 'default'">{{ detail.badge }}</a-tag>
      <ClusterSummary v-if="detail.summary" :key="`summary:${detail.id}`" :stats="detail.summary.stats" :capacity="detail.summary.capacity" :capacity-note="detail.summary.capacityNote" />
      <ClusterSource v-if="detail.source" :key="`source:${detail.id}`" :fields="detail.source.fields" :note="detail.source.note" @open="openPlan('cluster-register', detail.row)" />
      <div v-if="relatedTasks.length" class="related-tasks" aria-label="关联任务"><span>关联任务</span><a-button v-for="task in relatedTasks" :key="task.id" size="small" @click="selectedTaskId = task.id">快速查看 {{ task.id }}</a-button></div>
      <ObjectDetail :key="`${pageId}:${detail.id}`" :fields="detail.fields" :tabs="detail.tabs" :evidence-link="evidenceLinkFor" />
    </template>
    <a-result v-else status="404" title="未找到该示例对象" sub-title="不会自动回退到其他对象，检查地址中的 id。" />
    <PlanModal v-if="selectedPlan" :key="selectedPlan.action + selectedPlan.context.join('|')" :action="selectedPlan.action" :context="selectedPlan.context" @close="selectedPlan = null" />
    <TaskQuickView v-if="selectedTaskId" :task-id="selectedTaskId" @close="selectedTaskId = ''" />
    <ClusterCreateWizard v-if="createWizardOpen" @close="createWizardOpen = false" />
  </div>
</template>
<style scoped>
.business-page { max-width: 1440px; margin-inline: auto; padding: var(--console-space-8); }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--console-space-6); margin-bottom: var(--console-space-6); }
h1 { margin: 0; font-size: 28px; }
h1 small { display: block; margin-top: var(--console-space-2); font-size: 14px; color: var(--console-text-muted); font-weight: 400; }
.page-heading p { color: var(--console-text-muted); margin-block: var(--console-space-2) 0; max-width: 760px; }
.heading-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: var(--console-space-3); }
.related-link { color: var(--console-blue); }
.back-link { display: inline-flex; align-items: center; gap: var(--console-space-2); color: var(--console-blue); margin-bottom: var(--console-space-6); }
.example-notice { margin-bottom: var(--console-space-6); }
.status-tag { margin-bottom: var(--console-space-6); }
.related-tasks { display: flex; align-items: center; flex-wrap: wrap; gap: var(--console-space-2); margin-bottom: var(--console-space-4); }
@media (max-width: 600px) { .business-page { padding: var(--console-space-3); } .page-heading { flex-direction: column; } .heading-actions { justify-content: flex-start; } }
</style>
