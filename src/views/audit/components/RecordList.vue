<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { CopyOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { filterRows, stateColumn } from '@/common/utils/objects.js';
import { isCopyableId } from '@/common/utils/audit.js';
type Cell = string | number;
const props = defineProps<{ title: string; columns: string[]; rows: Cell[][]; detail: string; action: string | null; actionTitle?: string; replay?: boolean }>();
const emit = defineEmits<{ plan: [] }>();
const query = ref('');
const state = ref('全部');
const statusIndex = computed(() => stateColumn(props.columns));
const options = computed(() => statusIndex.value < 0 ? [] : ['全部', ...new Set(props.rows.map(row => String(row[statusIndex.value])))].map(value => ({ value, label: value === '全部' ? '全部状态' : value })));
const records = computed(() => filterRows(props.rows, query.value, state.value, statusIndex.value).map((cells: Cell[]) => ({ key: String(cells[0]), cells })));
const columns = computed(() => [...props.columns.map((title, index) => ({ title, key: String(index), width: index === 0 ? 220 : 160 })), { title: '操作', key: 'actions', width: props.replay ? 180 : 120 }]);
watch(() => props.columns, () => { query.value = ''; state.value = '全部'; });
function reset() { query.value = ''; state.value = '全部'; }
async function copy(value: Cell) {
  try { await navigator.clipboard.writeText(String(value)); message.success(`已复制 ${value}`); }
  catch { message.error(`复制失败，请手动复制 ${value}`); }
}
function replayNotice() { message.info('演示：会话回放入口（示例），未连接真实审计存储'); }
</script>
<template>
  <section class="panel">
    <div class="toolbar">
      <a-input v-model:value="query" allow-clear placeholder="搜索对象、名称或关联标识…" :aria-label="`搜索${title}`"><template #prefix><SearchOutlined /></template></a-input>
      <a-select v-if="statusIndex >= 0" v-model:value="state" aria-label="列表状态筛选" :options="options" />
      <a-button aria-label="重置筛选" title="重置筛选" @click="reset"><ReloadOutlined /></a-button>
      <span class="spacer" />
      <a-button v-if="action" type="primary" @click="emit('plan')">{{ actionTitle }}</a-button>
    </div>
    <a-table :columns="columns" :data-source="records" :scroll="{ x: 1000 }" :pagination="{ pageSize: 8, showSizeChanger: false }" :locale="{ emptyText: '没有匹配记录' }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === '0'">
          <span class="record-identity">
            <RouterLink :to="{ name: detail, query: { id: record.key } }" class="object-link">{{ record.cells[0] }}</RouterLink>
            <a-button v-if="isCopyableId(record.cells[0])" type="text" size="small" :aria-label="`复制 ${record.cells[0]}`" :title="`复制 ${record.cells[0]}`" @click="copy(record.cells[0])"><CopyOutlined /></a-button>
          </span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <span class="row-actions">
            <a-button v-if="replay" type="link" size="small" @click="replayNotice">回放</a-button>
            <RouterLink :to="{ name: detail, query: { id: record.key } }">查看详情</RouterLink>
          </span>
        </template>
        <template v-else>{{ record.cells[Number(column.key)] }}</template>
      </template>
    </a-table>
    <div class="table-footer"><span>数据为静态示例，未接入任何真实采集或执行器。</span><span>共 {{ records.length }} 条 · 当前显示 {{ records.length }} 条</span></div>
  </section>
</template>
<style scoped>
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--console-space-3); align-items: center; margin-bottom: var(--console-space-6); }
.toolbar :deep(.ant-input-affix-wrapper) { width: 300px; }
.toolbar :deep(.ant-select) { width: 160px; }
.spacer { flex: 1; }
.record-identity { display: inline-flex; align-items: center; gap: var(--console-space-2); }
.object-link { color: var(--console-blue); font-weight: 500; }
.row-actions { display: inline-flex; align-items: center; gap: var(--console-space-3); }
.table-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--console-space-3); margin-top: var(--console-space-4); color: var(--console-text-muted); }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
