<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { SearchOutlined } from '@ant-design/icons-vue';
import { filterRows, stateColumn } from '@/common/utils/objects.js';
type Cell = string | number;
const props = defineProps<{ columns: string[]; rows: Cell[][]; detail: string; stateIndex?: number }>();
const query = ref('');
const state = ref('全部');
const statusIndex = computed(() => props.stateIndex ?? stateColumn(props.columns));
const options = computed(() => ['全部', ...new Set(props.rows.map(row => String(row[statusIndex.value])))].map(value => ({ value, label: value === '全部' ? '全部状态' : value })));
const records = computed(() => filterRows(props.rows, query.value, state.value, statusIndex.value).map((cells: Cell[]) => ({ key: String(cells[0]), cells })));
const columns = computed(() => [...props.columns.map((title, index) => ({ title, key: String(index), width: index === 0 ? 190 : 160 })), { title: '操作', key: 'actions', width: 140 }]);
watch(() => props.columns, () => { query.value = ''; state.value = '全部'; });
function reset() { query.value = ''; state.value = '全部'; }
</script>
<template>
  <section class="panel">
    <div class="toolbar"><a-input v-model:value="query" allow-clear placeholder="搜索名称、标识或关联对象" aria-label="搜索示例记录"><template #prefix><SearchOutlined /></template></a-input><a-select v-model:value="state" aria-label="筛选状态" :options="options" /><a-button @click="reset">重置</a-button><span class="count">共 {{ records.length }} 条 · 固定示例</span></div>
    <a-table :columns="columns" :data-source="records" :scroll="{ x: 1100 }" :pagination="{ pageSize: 8, showSizeChanger: false }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === '0'"><RouterLink :to="{ name: detail, query: { id: record.key } }" class="object-link">{{ record.cells[0] }}</RouterLink></template>
        <template v-else-if="column.key === 'actions'"><RouterLink :to="{ name: detail, query: { id: record.key } }">详情</RouterLink></template>
        <template v-else>{{ record.cells[Number(column.key)] }}</template>
      </template>
    </a-table>
  </section>
</template>
<style scoped>
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--console-space-3); align-items: center; margin-bottom: var(--console-space-6); }
.toolbar :deep(.ant-input-affix-wrapper) { width: 300px; }
.toolbar :deep(.ant-select) { width: 180px; }
.toolbar > .count { margin-left: auto; color: var(--console-text-muted); }
.object-link { color: var(--console-blue); font-weight: 500; }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
