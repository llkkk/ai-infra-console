<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { listData, detailData, filterAssetRows, infrastructurePages, provisioningTabs } from '@/common/utils/infrastructure.js';
import { planConfig } from '@/common/utils/objects.js';
import ObjectList from '@/common/components/ObjectList.vue';
import ObjectDetail from '@/common/components/ObjectDetail.vue';
import PlanModal from '@/common/components/PlanModal.vue';
import TaskQuickView from '@/common/components/TaskQuickView.vue';
import { taskRecords } from '@/model.js';
import AssetNavigator from './components/AssetNavigator.vue';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons-vue';
type Cell = string | number;
interface List { title: string; description: string; columns: string[]; rows: Cell[][]; detail: string; action: string; }
interface Detail { title: string; id: string; parent: string; row: Cell[]; fields: Cell[][]; tabs: { key: string; title: string; rows: Cell[][] }[]; action: string | null; primaryLabel?: string | null; primaryLink?: { name: string; query?: Record<string, string> } | null; }
interface ProvTab { key: string; title: string; source: List; stateIndex: number }
const route = useRoute();
const pageId = computed(() => String(route.name));
const isList = computed(() => infrastructurePages.includes(pageId.value));
const list = computed(() => listData(pageId.value) as List | null);
const detail = computed(() => detailData(pageId.value, typeof route.query.id === 'string' ? route.query.id : '') as Detail | null);
const selectedPlan = ref<{ action: string; context: Cell[] } | null>(null);
const taskId = ref('');
const relatedTasks = computed(() => detail.value ? taskRecords.filter(task => task.target === detail.value!.id) : []);
const sectionTitle = computed(() => isList.value ? list.value?.title : detail.value?.title || '对象不存在');
const evidenceLink = (row: Cell[]) => String(row[0]).startsWith('TASK-DEMO') ? { name: 'provisioning-detail', query: { id: String(row[0]) } } : null;
// 装机管理：任务 / 模板 / 基线三个页签共用一个流程入口，新增按钮跟随活动页签。
const provTabs = computed<ProvTab[]>(() => provisioningTabs() as ProvTab[]);
const activeProvTab = ref('tasks');
const activeProvSource = computed(() => provTabs.value.find(tab => tab.key === activeProvTab.value)?.source ?? null);
// 资产页：阶段条 + 位置树过滤后的行集。
const assetFilter = ref<{ stage: string | null; locationKey: string | null }>({ stage: null, locationKey: null });
const assetRows = computed(() => {
  if (pageId.value !== 'assets' || !list.value) return list.value?.rows ?? [];
  return filterAssetRows(assetFilter.value.stage, assetFilter.value.locationKey);
});
watch(() => route.fullPath, () => { selectedPlan.value = null; taskId.value = ''; activeProvTab.value = 'tasks'; assetFilter.value = { stage: null, locationKey: null }; });
function openPlan(action: string, context: Cell[]) { if (planConfig(action)) selectedPlan.value = { action, context }; }
</script>
<template>
  <div class="business-page">
    <RouterLink v-if="!isList && detail" :to="{ name: detail.parent }" class="back-link"><ArrowLeftOutlined /> 返回列表</RouterLink>
    <header class="page-heading"><div><h1>{{ sectionTitle }}<small v-if="detail">{{ detail.id }}</small></h1><p>{{ isList ? list?.description : '按当前对象展示事实与证据；所有记录均为固定示例，不代表真实联调结果。' }}</p></div>
      <a-button v-if="pageId === 'assets'" type="primary" @click="openPlan(list!.action, [])"><PlusOutlined /> {{ planConfig(list!.action)?.title }}</a-button>
      <a-button v-else-if="pageId === 'provisioning' && activeProvSource?.action" type="primary" @click="openPlan(activeProvSource.action, [])"><PlusOutlined /> {{ planConfig(activeProvSource.action)?.title }}</a-button>
      <RouterLink v-else-if="detail?.primaryLink" :to="detail.primaryLink"><a-button type="primary">{{ detail.primaryLabel }}</a-button></RouterLink>
      <a-button v-else-if="detail?.action" type="primary" @click="openPlan(detail.action, detail.row)">{{ planConfig(detail.action)?.title }}</a-button>
    </header>
    <AssetNavigator v-if="pageId === 'assets' && list" @filter="(stage, locationKey) => assetFilter = { stage, locationKey }">
      <template #default>
        <ObjectList :columns="list.columns" :rows="assetRows" :detail="list.detail" :state-index="5" />
      </template>
    </AssetNavigator>
    <a-tabs v-else-if="pageId === 'provisioning'" v-model:active-key="activeProvTab" class="panel-tabs">
      <a-tab-pane v-for="tab in provTabs" :key="tab.key" :tab="tab.title">
        <ObjectList :key="tab.key" :columns="tab.source.columns" :rows="tab.source.rows" :detail="tab.source.detail" :state-index="tab.stateIndex" />
      </a-tab-pane>
    </a-tabs>
    <template v-else-if="detail">
      <a-alert v-if="!route.query.id" class="example-notice" type="info" show-icon :message="`未指定对象，当前明确展示页面示例 ${detail.id}。`" />
      <section v-if="relatedTasks.length" class="task-preview" aria-label="资产关联任务">
        <b>关联任务</b>
        <a-button v-for="task in relatedTasks" :key="task.id" type="link" @click="taskId = task.id">快速查看 {{ task.id }} · {{ task.state }}</a-button>
      </section>
      <ObjectDetail :key="`${pageId}:${detail.id}`" :fields="detail.fields" :tabs="detail.tabs" :evidence-link="evidenceLink" />
    </template>
    <a-result v-else status="404" title="未找到该示例对象" sub-title="不会自动回退到其他对象，检查地址中的 id。" />
    <PlanModal v-if="selectedPlan" :key="selectedPlan.action + selectedPlan.context.join('|')" :action="selectedPlan.action" :context="selectedPlan.context" @close="selectedPlan = null" />
    <TaskQuickView v-if="taskId" :task-id="taskId" @close="taskId = ''" />
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
.task-preview { display: flex; flex-wrap: wrap; align-items: center; gap: var(--console-space-3); padding: var(--console-space-4); margin-bottom: var(--console-space-4); border: 1px solid var(--console-border); background: var(--console-surface); border-radius: var(--console-radius); }
@media (max-width: 600px) { .business-page { padding: var(--console-space-3); } .page-heading { flex-direction: column; } }
</style>
