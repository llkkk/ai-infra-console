<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { CopyOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { filterTasks, taskDetailData, TASK_REGION_ALL, TASK_REGIONS } from '@/common/utils/tasks.js';
import TaskQuickView from '@/common/components/TaskQuickView.vue';
type Cell = string | number;
const props = defineProps<{ title: string; columns: string[]; rows: Cell[][]; detail: string }>();
const emit = defineEmits<{ plan: [context: Cell[]] }>();
const selectedTaskId = ref<string | null>(null);
const currentPage = ref(1);
const query = ref('');
const state = ref('全部');
const region = ref(TASK_REGION_ALL);
const statusIndex = computed(() => props.columns.indexOf('状态'));
const options = computed(() => statusIndex.value < 0 ? [] : ['全部', ...new Set(props.rows.map(row => String(row[statusIndex.value])))].map(value => ({ value, label: value === '全部' ? '全部状态' : value })));
const regionOptions = TASK_REGIONS.map(value => ({ value, label: value }));
const records = computed(() => filterTasks(props.rows, { search: query.value, state: state.value, region: region.value }, statusIndex.value).map((cells: Cell[]) => ({ key: String(cells[0]), cells, canRetry: Boolean(taskDetailData(String(cells[0]))?.action) })));
const columns = computed(() => [...props.columns.map((title, index) => ({ title, key: String(index), width: index === 0 ? 220 : 160 })), { title: '操作', key: 'actions', width: 240 }]);
watch([query, state, region], () => { currentPage.value = 1; });
watch(() => props.columns, reset);
function reset() { query.value = ''; state.value = '全部'; region.value = TASK_REGION_ALL; }
function changePage(pagination: { current?: number }) { currentPage.value = pagination.current || 1; }
const COPYABLE = /^(?:GPU|TASK|ALLOC|REQ|ENV|ALERT|INC|SESSION|EVENT)-[A-Z0-9-]+$/;
async function copy(value: Cell) {
  try { await navigator.clipboard.writeText(String(value)); message.success(`已复制 ${value}`); }
  catch { message.error(`复制失败，请手动复制 ${value}`); }
}
</script>
<template>
  <section class="panel">
    <div class="toolbar">
      <a-input v-model:value="query" allow-clear placeholder="搜索对象、名称或关联标识…" :aria-label="`搜索${title}`"><template #prefix><SearchOutlined /></template></a-input>
      <a-select v-model:value="region" aria-label="任务区域筛选" :options="regionOptions" />
      <a-select v-if="statusIndex >= 0" v-model:value="state" aria-label="列表状态筛选" :options="options" />
      <a-button aria-label="重置筛选" title="重置筛选" @click="reset"><ReloadOutlined /></a-button>
      <span class="spacer" />
    </div>
    <a-table :columns="columns" :data-source="records" :scroll="{ x: 1100 }" :pagination="{ current: currentPage, pageSize: 8, showSizeChanger: false }" :locale="{ emptyText: '没有匹配记录' }" @change="changePage">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === '0'">
          <span class="record-identity">
            <a-button type="link" class="object-link" @click="selectedTaskId = record.key">{{ record.cells[0] }}</a-button>
            <a-button v-if="COPYABLE.test(String(record.cells[0]))" type="text" size="small" :aria-label="`复制 ${record.cells[0]}`" :title="`复制 ${record.cells[0]}`" @click="copy(record.cells[0])"><CopyOutlined /></a-button>
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="row-actions">
            <a-button type="link" size="small" @click="selectedTaskId = record.key">快速查看</a-button>
            <RouterLink :to="{ name: detail, query: { id: record.key } }">完整详情</RouterLink>
            <a-button v-if="record.canRetry" type="link" size="small" @click="emit('plan', record.cells)">重试预检</a-button>
          </div>
        </template>
        <template v-else>{{ record.cells[Number(column.key)] }}</template>
      </template>
    </a-table>
    <div class="table-footer"><span>数据为静态示例，未接入任何真实采集或执行器。</span><span>跨区域任务 · 共 {{ records.length }} 条 · 当前显示 {{ records.length }} 条</span></div>
  </section>
  <TaskQuickView v-if="selectedTaskId" :task-id="selectedTaskId" @close="selectedTaskId = null" />
</template>
<style scoped>
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--console-space-3); align-items: center; margin-bottom: var(--console-space-6); }
.toolbar :deep(.ant-input-affix-wrapper) { width: 300px; }
.toolbar :deep(.ant-select) { width: 160px; }
.spacer { flex: 1; }
.record-identity { display: inline-flex; align-items: center; gap: var(--console-space-2); }
.object-link { color: var(--console-blue); font-weight: 500; }
.object-link { padding: 0; height: auto; }
.row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--console-space-2); }
.table-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--console-space-3); margin-top: var(--console-space-4); color: var(--console-text-muted); }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
