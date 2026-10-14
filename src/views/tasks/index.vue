<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { taskListData, taskDetailData } from '@/common/utils/tasks.js';
import { planConfig } from '@/common/utils/objects.js';
import ObjectDetail from '@/common/components/ObjectDetail.vue';
import PlanModal from '@/common/components/PlanModal.vue';
import TaskList from './components/TaskList.vue';
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
type Cell = string | number;
interface List { title: string; description: string; columns: string[]; rows: Cell[][]; detail: string; action: string | null; }
interface Detail { title: string; description: string; id: string; parent: string; row: Cell[]; fields: Cell[][]; tabs: { key: string; title: string; rows: Cell[][] }[]; action: string | null; }
const route = useRoute();
const pageId = computed(() => String(route.name));
const isList = computed(() => pageId.value === 'tasks');
const list = computed(() => taskListData() as List | null);
const detail = computed(() => (isList.value ? null : taskDetailData(typeof route.query.id === 'string' ? route.query.id : '')) as Detail | null);
const selectedPlan = ref<{ action: string; context: Cell[] } | null>(null);
watch(() => route.fullPath, () => { selectedPlan.value = null; });
function openPlan(action: string, context: Cell[]) {
  if (action === 'task-retry' && !taskDetailData(String(context[0] ?? ''))?.action) return;
  if (planConfig(action)) selectedPlan.value = { action, context };
}
</script>
<template>
  <div class="business-page">
    <RouterLink v-if="!isList && detail" :to="{ name: detail.parent }" class="back-link"><ArrowLeftOutlined /> 返回列表</RouterLink>
    <header class="page-heading">
      <div>
        <h1>{{ isList ? list?.title : detail?.title || '对象不存在' }}<small v-if="detail && !isList">{{ detail.id }}</small></h1>
        <p>{{ isList ? list?.description : detail?.description }}</p>
      </div>
      <a-button v-if="!isList && detail?.action" type="primary" @click="openPlan(detail.action, detail.row)">重试预检</a-button>
    </header>
    <TaskList v-if="isList && list" :key="pageId" :title="list.title" :columns="list.columns" :rows="list.rows" :detail="list.detail" @plan="context => openPlan('task-retry', context)" />
    <template v-else-if="detail">
      <ObjectDetail :key="`${pageId}:${detail.id}`" :fields="detail.fields" :tabs="detail.tabs" />
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
@media (max-width: 600px) { .business-page { padding: var(--console-space-3); } .page-heading { flex-direction: column; } }
</style>
