<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { INCIDENT_PHASES, INCIDENT_OWNERS, INCIDENT_SEVERITIES, INCIDENT_TABS, MANUAL_INCIDENT_CONTEXT, REVIEW_STATUSES, filterClosedIncidents, filterIncidents, statusTone, tabFromQuery } from '@/common/utils/monitor.js';
type Cell = string | number;
const emit = defineEmits<{ plan: [action: string, context: Cell[]] }>();
const route = useRoute();
const tab = ref(tabFromQuery(route.query.tab, INCIDENT_TABS));
watch(() => route.query.tab, value => { tab.value = tabFromQuery(value, INCIDENT_TABS); });

const query = ref('');
const phase = ref('全部阶段');
const severity = ref('全部级别');
const owner = ref('全部责任方');
const reviewStatus = ref('全部复盘状态');

const phaseOptions = [{ value: '全部阶段', label: '全部阶段' }, ...INCIDENT_PHASES.map(value => ({ value, label: value }))];
const severityOptions = [{ value: '全部级别', label: '全部级别' }, ...INCIDENT_SEVERITIES.map(value => ({ value, label: value }))];
const ownerOptions = [{ value: '全部责任方', label: '全部责任方' }, ...INCIDENT_OWNERS.map(value => ({ value, label: value }))];
const reviewOptions = [{ value: '全部复盘状态', label: '全部复盘状态' }, ...REVIEW_STATUSES.map(value => ({ value, label: value }))];

const faultRows = computed(() => filterIncidents({ query: query.value, phase: phase.value, severity: severity.value, owner: owner.value }).map(inc => ({
  key: inc.id, id: inc.id, title: inc.title, severity: inc.severity, phase: inc.phase, owner: inc.owner,
  trigger: inc.trigger, sourceType: inc.sourceType, creation: inc.creation, started: inc.started
})));
const reviewRows = computed(() => filterClosedIncidents({ query: query.value, reviewStatus: reviewStatus.value }).map(inc => ({
  key: inc.id, id: inc.id, title: inc.title, phase: inc.phase, status: inc.review?.status || '未开始',
  required: inc.review?.required ? '正式复盘' : '轻量记录', archivedAt: inc.review?.archivedAt || '—'
})));

const faultColumns = [{ title: '故障单', key: 'id' }, { title: '标题', key: 'title' }, { title: '级别', key: 'severity' }, { title: '阶段', key: 'phase' }, { title: '责任方', key: 'owner' }, { title: '触发来源', key: 'trigger' }, { title: '开始时间', key: 'started' }];
const reviewColumns = [{ title: '故障单', key: 'id' }, { title: '标题', key: 'title' }, { title: '关闭阶段', key: 'phase' }, { title: '复盘状态', key: 'status' }, { title: '是否必需', key: 'required' }, { title: '归档时间', key: 'archivedAt' }, { title: '入口', key: 'entry' }];

function resetFilters() {
  query.value = ''; phase.value = '全部阶段'; severity.value = '全部级别'; owner.value = '全部责任方'; reviewStatus.value = '全部复盘状态';
}
</script>
<template>
  <section class="incident-management">
    <a-tabs v-model:active-key="tab" class="center-tabs" aria-label="故障管理页签">
      <a-tab-pane v-for="item in INCIDENT_TABS" :key="item" :tab="item" />
    </a-tabs>

    <section v-if="tab === '故障列表'" class="panel" aria-label="故障列表">
      <div class="toolbar">
        <a-input v-model:value="query" allow-clear aria-label="搜索故障" placeholder="搜索故障 ID、标题、来源…"><template #prefix><SearchOutlined /></template></a-input>
        <a-select v-model:value="phase" aria-label="故障阶段" :options="phaseOptions" />
        <a-select v-model:value="severity" aria-label="故障级别" :options="severityOptions" />
        <a-select v-model:value="owner" aria-label="责任方" :options="ownerOptions" />
        <a-button aria-label="重置故障筛选" title="重置故障筛选" @click="resetFilters"><ReloadOutlined /></a-button>
        <span class="toolbar-spacer" />
        <a-button type="primary" @click="emit('plan', 'incident-create', MANUAL_INCIDENT_CONTEXT)">＋人工建单预检</a-button>
      </div>
      <a-table :columns="faultColumns" :data-source="faultRows" :pagination="false" size="small" :scroll="{ x: 1000 }">
        <template #bodyCell="{ column, record }">
          <RouterLink v-if="column.key === 'id'" :to="{ name: 'incident', query: { id: record.id } }" class="text-link">{{ record.id }} <RightOutlined /></RouterLink>
          <a-tag v-else-if="column.key === 'severity' || column.key === 'phase'" :color="statusTone(record[column.key]) === 'default' ? undefined : statusTone(record[column.key])">{{ record[column.key] }}</a-tag>
          <span v-else-if="column.key === 'trigger'"><b>{{ record.trigger }}</b><small class="muted"> · {{ record.sourceType }} · {{ record.creation }}</small></span>
          <template v-else>{{ record[column.key] }}</template>
        </template>
      </a-table>
      <div v-if="!faultRows.length" class="empty">暂无符合筛选条件的故障。</div>
      <p class="muted">列表仅呈现本地虚构故障记录；人工建单按钮只打开预检计划，不创建持久化故障单。</p>
    </section>

    <section v-else class="panel" aria-label="复盘归档">
      <div class="toolbar">
        <a-select v-model:value="reviewStatus" aria-label="复盘状态" :options="reviewOptions" />
        <a-input v-model:value="query" allow-clear aria-label="搜索复盘故障" placeholder="搜索故障 ID、标题…"><template #prefix><SearchOutlined /></template></a-input>
        <a-button aria-label="重置复盘筛选" title="重置复盘筛选" @click="resetFilters"><ReloadOutlined /></a-button>
      </div>
      <a-table :columns="reviewColumns" :data-source="reviewRows" :pagination="false" size="small" :scroll="{ x: 1000 }">
        <template #bodyCell="{ column, record }">
          <RouterLink v-if="column.key === 'id'" :to="{ name: 'incident-review', query: { id: record.id } }" class="text-link">{{ record.id }}</RouterLink>
          <a-tag v-else-if="column.key === 'status'" :color="statusTone(record.status) === 'default' ? undefined : statusTone(record.status)">{{ record.status }}</a-tag>
          <RouterLink v-else-if="column.key === 'entry'" :to="{ name: 'incident-review', query: { id: record.id } }" class="text-link">查看复盘 <RightOutlined /></RouterLink>
          <template v-else>{{ record[column.key] }}</template>
        </template>
      </a-table>
      <div v-if="!reviewRows.length" class="empty">暂无符合筛选条件的已关闭故障。</div>
      <p class="callout">本页只列已关闭故障，并区分待复盘、已完成与已归档；已关闭不等于已归档。入口仍为复盘详情，不代表已执行归档。</p>
    </section>
  </section>
</template>
<style scoped>
.incident-management { display: flex; flex-direction: column; gap: var(--console-space-4); }
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--console-space-3); align-items: center; margin-bottom: var(--console-space-6); }
.toolbar :deep(.ant-input-affix-wrapper) { width: 280px; }
.toolbar :deep(.ant-select) { width: 160px; }
.toolbar-spacer { flex: 1; }
.text-link { color: var(--console-blue); font-weight: 500; }
.muted, .empty { color: var(--console-text-muted); font-size: 12px; }
.empty { padding: var(--console-space-6); text-align: center; }
.callout { margin-top: var(--console-space-6); color: var(--console-text-muted); }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
