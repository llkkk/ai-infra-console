<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { ACK_OPTIONS, ALERT_LEVELS, ALERT_TABS, NOTIFICATION_OPTIONS, POLICY_STATUSES, alertActions, filterAlerts, filterPolicies, linkTarget, notificationOf, tabFromQuery } from '@/common/utils/monitor.js';

type Cell = string | number;
const emit = defineEmits<{ plan: [action: string, context: Cell[]] }>();
const route = useRoute();
const tab = ref(tabFromQuery(route.query.tab, ALERT_TABS));
watch(() => route.query.tab, value => { tab.value = tabFromQuery(value, ALERT_TABS); });

const query = ref('');
const level = ref('全部');
const ack = ref('全部');
const notification = ref('全部');
const policyQuery = ref('');
const policyStatus = ref('全部');

const isPolicies = computed(() => tab.value === '告警策略');
const isHistory = computed(() => tab.value === '告警历史');
const listTitle = computed(() => isHistory.value ? '告警历史列表' : '活跃告警列表');

const levelOptions = [{ value: '全部', label: '全部级别' }, ...ALERT_LEVELS.map(value => ({ value, label: value }))];
const ackOptions = [{ value: '全部', label: '全部确认状态' }, ...ACK_OPTIONS.map(value => ({ value, label: value }))];
const notificationOptions = [{ value: '全部', label: '全部通知状态' }, ...NOTIFICATION_OPTIONS.map(value => ({ value, label: value }))];
const policyStatusOptions = [{ value: '全部', label: '全部状态' }, ...POLICY_STATUSES.map(value => ({ value, label: value }))];

const alertRows = computed(() => filterAlerts(isHistory.value ? '告警历史' : '活跃告警', { query: query.value, level: level.value, ack: ack.value, notification: notification.value }).map(alert => ({
  key: alert.id, id: alert.id, level: alert.level, source: alert.source, object: alert.object, message: alert.message,
  signal: alert.signal, ack: alert.ack, notification: notificationOf(alert), started: alert.started,
  recoveredAt: alert.recoveredAt || '恢复时间未记录', incidentIds: alert.incidentIds, gates: alertActions(alert), alertObject: alert.object
})));

const alertColumns = computed(() => [
  { title: '告警', key: 'id' }, { title: '级别', key: 'level' }, { title: '来源', key: 'source' }, { title: '对象', key: 'object' },
  { title: '现象', key: 'message' }, { title: '信号状态', key: 'signal' }, { title: '确认状态', key: 'ack' }, { title: '通知状态', key: 'notification' },
  { title: '触发时间', key: 'started' },
  ...(isHistory.value ? [{ title: '恢复时间', key: 'recoveredAt' }] : []),
  { title: '关联故障', key: 'incidentIds' }, { title: '操作', key: 'actions' }
]);

const policyRows = computed(() => filterPolicies({ query: policyQuery.value, status: policyStatus.value }).map((row: (string | number)[]) => ({ key: row[0], cells: row })));
const policyColumns = [{ title: '策略', key: '0' }, { title: '层次', key: '1' }, { title: '条件 / 示例', key: '2' }, { title: '通知对象', key: '3' }, { title: '管理来源', key: '4' }, { title: '状态', key: '5' }, { title: '操作', key: 'actions' }];

function incidentTo(id: string) {
  return linkTarget('incident', id);
}
function resetAlerts() {
  query.value = ''; level.value = '全部'; ack.value = '全部'; notification.value = '全部';
}
function resetPolicies() {
  policyQuery.value = ''; policyStatus.value = '全部';
}
</script>
<template>
  <section class="alert-center">
    <a-tabs v-model:active-key="tab" class="center-tabs" aria-label="告警中心页签">
      <a-tab-pane v-for="item in ALERT_TABS" :key="item" :tab="item" />
    </a-tabs>

    <section v-if="!isPolicies" class="panel" :aria-label="listTitle">
      <div class="toolbar">
        <a-input v-model:value="query" allow-clear aria-label="搜索告警" placeholder="搜索告警、对象、规则或故障标识…"><template #prefix><SearchOutlined /></template></a-input>
        <a-select v-model:value="level" aria-label="告警级别筛选" :options="levelOptions" />
        <a-select v-model:value="ack" aria-label="告警确认筛选" :options="ackOptions" />
        <a-select v-model:value="notification" aria-label="告警通知筛选" :options="notificationOptions" />
        <a-button aria-label="重置筛选" title="重置筛选" @click="resetAlerts"><ReloadOutlined /></a-button>
      </div>
      <a-table :columns="alertColumns" :data-source="alertRows" :pagination="false" size="small" :scroll="{ x: 1400 }">
        <template #bodyCell="{ column, record }">
          <RouterLink v-if="column.key === 'id'" :to="{ name: 'alert', query: { id: record.id } }" class="object-link">{{ record.id }}</RouterLink>
          <template v-else-if="column.key === 'incidentIds'">
            <span v-if="!record.incidentIds.length">未关联</span>
            <span v-else class="link-group">
              <template v-for="incidentId in record.incidentIds" :key="incidentId">
                <RouterLink v-if="incidentTo(incidentId)" :to="incidentTo(incidentId)!">{{ incidentId }}</RouterLink>
                <span v-else>{{ incidentId }}（示例数据缺失）</span>
              </template>
            </span>
          </template>
          <span v-else-if="column.key === 'actions'" class="row-actions">
            <RouterLink :to="{ name: 'alert', query: { id: record.id } }">查看详情</RouterLink>
            <button v-if="record.gates.canSilence" type="button" class="text-action" @click="emit('plan', 'silence', [record.id])">通知静默预检</button>
            <template v-if="record.incidentIds.length">
              <template v-for="incidentId in record.incidentIds" :key="incidentId">
                <RouterLink v-if="incidentTo(incidentId)" :to="incidentTo(incidentId)!">查看故障 {{ incidentId }}</RouterLink>
              </template>
            </template>
            <button v-else-if="record.gates.canCreateIncident" type="button" class="text-action" @click="emit('plan', 'incident-create', [record.id, '告警', record.alertObject])">人工发起故障预检</button>
            <span v-else class="muted">未关联故障</span>
          </span>
          <template v-else>{{ record[column.key] }}</template>
        </template>
      </a-table>
      <div v-if="!alertRows.length" class="empty">没有匹配告警</div>
      <p class="callout">{{ isHistory ? '本页只展示已恢复信号，信号恢复不等于故障单关闭。' : '本页只按信号是否触发划分活跃告警；已确认、已静默仍是活跃信号。' }}确认代表人工关注；静默只暂停通知，不改变信号、资源状态或故障阶段。</p>
      <div class="table-footer"><span>静态告警台账，不含故障单记录；未请求真实 API。</span><span>共 {{ alertRows.length }} 条 · 当前显示 {{ alertRows.length }} 条</span></div>
    </section>

    <section v-else class="panel" aria-label="告警策略列表">
      <div class="toolbar">
        <a-input v-model:value="policyQuery" allow-clear aria-label="搜索告警策略" placeholder="搜索策略、规则条件或管理来源…"><template #prefix><SearchOutlined /></template></a-input>
        <a-select v-model:value="policyStatus" aria-label="策略状态筛选" :options="policyStatusOptions" />
        <a-button aria-label="重置策略筛选" title="重置策略筛选" @click="resetPolicies"><ReloadOutlined /></a-button>
        <span class="toolbar-spacer" />
        <a-button type="primary" @click="emit('plan', 'policy', [])">新建策略预检</a-button>
      </div>
      <a-table :columns="policyColumns" :data-source="policyRows" :pagination="false" size="small" :scroll="{ x: 1000 }">
        <template #bodyCell="{ column, record }">
          <RouterLink v-if="column.key === '0'" :to="{ name: 'policy', query: { id: record.cells[0] } }" class="object-link">{{ record.cells[0] }}</RouterLink>
          <span v-else-if="column.key === 'actions'" class="row-actions">
            <RouterLink :to="{ name: 'policy', query: { id: record.cells[0] } }">查看详情 <RightOutlined /></RouterLink>
            <button type="button" class="text-action" @click="emit('plan', 'policy', record.cells)">配置预检</button>
          </span>
          <template v-else>{{ record.cells[Number(column.key)] }}</template>
        </template>
      </a-table>
      <div v-if="!policyRows.length" class="empty">没有匹配策略</div>
      <p class="callout">自动建单是可选规则策略，并非所有严重告警都自动建单。规则、通知和故障处理独立；GitOps 管理规则只生成变更建议，不旁路修改。</p>
      <div class="table-footer"><span>静态策略示例 · 共 {{ policyRows.length }} 条 · 操作仅生成计划预览</span></div>
    </section>
  </section>
</template>
<style scoped>
.alert-center { display: flex; flex-direction: column; gap: var(--console-space-4); }
.center-tabs { margin-bottom: 0; }
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.toolbar { display: flex; flex-wrap: wrap; gap: var(--console-space-3); align-items: center; margin-bottom: var(--console-space-6); }
.toolbar :deep(.ant-input-affix-wrapper) { width: 300px; }
.toolbar :deep(.ant-select) { width: 170px; }
.toolbar-spacer { flex: 1; }
.object-link { color: var(--console-blue); font-weight: 500; }
.row-actions { display: inline-flex; flex-wrap: wrap; gap: var(--console-space-3); }
.row-actions a, .link-group a, .text-action { color: var(--console-blue); background: none; border: 0; padding: 0; cursor: pointer; }
.link-group { display: inline-flex; flex-wrap: wrap; gap: var(--console-space-2); }
.muted, .table-footer, .empty { color: var(--console-text-muted); font-size: 12px; }
.empty { padding: var(--console-space-6); text-align: center; }
.callout { margin-block: var(--console-space-6) var(--console-space-3); color: var(--console-text-muted); }
.table-footer { display: flex; justify-content: space-between; gap: var(--console-space-3); padding-top: var(--console-space-4); border-top: 1px solid var(--console-border); }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
