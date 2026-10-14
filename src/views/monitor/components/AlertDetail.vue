<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { RightOutlined } from '@ant-design/icons-vue';
import PlainTable from './PlainTable.vue';
import { ALERT_DETAIL_TABS, alertActions, alertDiagnostics, alertIncidentRows, alertObjectRows, policyRowById } from '@/common/utils/monitor.js';
type Cell = string | number;
interface AlertView { id: string; object: string; signal: string; rule: string; incidentIds: string[]; timeline: string[][]; }
const props = defineProps<{ alert: AlertView; facts: Cell[][] }>();
const emit = defineEmits<{ plan: [action: string, context: Cell[]] }>();
const activeTab = ref(ALERT_DETAIL_TABS[0]);
const gates = computed(() => alertActions(props.alert));
const policyTo = computed(() => policyRowById(props.alert.rule) ? { name: 'policy', query: { id: props.alert.rule } } : null);
const recovered = computed(() => props.alert.signal === '已恢复');
const diagnostics = computed(() => alertDiagnostics(props.alert));
const objects = computed(() => alertObjectRows(props.alert));
const incidents = computed(() => alertIncidentRows(props.alert));
const objectColumns = [{ title: '对象类型', key: 'label' }, { title: '对象 ID', key: 'id' }, { title: '入口', key: 'target' }];
const incidentColumns = [{ title: '故障单', key: 'id' }, { title: '关联说明', key: 'note' }, { title: '入口', key: 'target' }];
</script>
<template>
  <section class="alert-detail">
    <div class="detail-grid">
      <section class="panel" aria-label="告警配置">
        <h2>{{ alert.id }} · 告警事实</h2>
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item v-for="[label, value] in facts" :key="String(label)" :label="String(label)">
            <RouterLink v-if="label === '规则来源' && policyTo" :to="policyTo">{{ value }}</RouterLink>
            <template v-else>{{ value }}</template>
          </a-descriptions-item>
        </a-descriptions>
        <div class="panel-actions">
          <button v-if="gates.canSilence" type="button" class="action" @click="emit('plan', 'silence', [alert.id])">通知静默预检</button>
          <RouterLink v-if="recovered" class="action" :to="{ name: 'alerts', query: { tab: '告警历史' } }">返回告警历史</RouterLink>
          <RouterLink v-else class="action" :to="{ name: 'alerts', query: { tab: '活跃告警' } }">返回活跃告警</RouterLink>
          <RouterLink class="action" :to="{ name: 'alerts', query: { tab: '告警历史' } }">告警历史</RouterLink>
          <RouterLink v-if="policyTo" class="action" :to="policyTo">查看当前策略</RouterLink>
          <span v-else class="action disabled">策略记录缺失（示例数据缺失，不回退）</span>
          <RouterLink class="action" :to="{ name: 'alerts', query: { tab: '告警策略' } }">告警策略列表</RouterLink>
        </div>
        <p class="callout">确认和静默不改变信号；无数据或未确认不视为健康或恢复。恢复时间取当前告警记录，不代表故障单已关闭。</p>
      </section>
      <section class="panel" aria-label="告警证据与关联">
        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane v-for="item in ALERT_DETAIL_TABS" :key="item" :tab="item" />
        </a-tabs>
        <h2>{{ activeTab }}</h2>

        <template v-if="activeTab === '诊断证据'">
          <PlainTable :head="['证据项目', '当前记录']" :rows="diagnostics" />
          <h3>来源事件时间线</h3>
          <PlainTable :head="['时间', '事件', '记录']" :rows="alert.timeline" />
          <p class="muted">固定示例证据，未连接实时采集或日志；不从告警级别推断模型、API 或业务恢复。</p>
        </template>

        <template v-else-if="activeTab === '关联对象'">
          <a-table v-if="objects.length" :columns="objectColumns" :data-source="objects.map((item: Record<string, unknown>) => ({ key: item.id, ...item }))" :pagination="false" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'target'">
                <RouterLink v-if="record.target" :to="record.target" class="text-link">查看 {{ record.label }} <RightOutlined /></RouterLink>
                <span v-else>{{ record.id }}（示例数据缺失，不回退）</span>
              </template>
              <template v-else>{{ record[column.key] }}</template>
            </template>
          </a-table>
          <p v-else class="empty">当前告警未记录关联对象</p>
          <p class="muted">按类型和稳定 ID 定位；不存在的对象明确提示缺失，不回退。</p>
        </template>

        <template v-else-if="activeTab === '处理记录'">
          <PlainTable :head="['时间', '事件', '记录']" :rows="alert.timeline" />
          <p class="callout">信号、人工确认、通知静默分别记录；本页操作只生成预检计划，不新增处理记录、不改变告警状态。</p>
        </template>

        <template v-else>
          <a-table v-if="incidents.length" :columns="incidentColumns" :data-source="incidents.map((item: Record<string, unknown>) => ({ key: item.id, id: item.id, note: '当前告警关联故障；同一故障可合并多个信号', target: item.target }))" :pagination="false" size="small">
            <template #bodyCell="{ column, record }">
              <RouterLink v-if="column.key === 'target' && record.target" :to="record.target" class="text-link">进入处理工作台 <RightOutlined /></RouterLink>
              <span v-else-if="column.key === 'target'">示例数据缺失，不回退</span>
              <template v-else>{{ record[column.key] }}</template>
            </template>
          </a-table>
          <p v-else class="empty">当前告警尚未关联故障单。{{ gates.canCreateIncident ? '可人工发起建单预检。' : '历史信号已恢复，不自动创建故障单。' }}</p>
          <div class="panel-actions">
            <button v-if="gates.canCreateIncident" type="button" class="action" @click="emit('plan', 'incident-create', [alert.id, '告警', alert.object])">人工发起故障预检</button>
            <RouterLink class="action" :to="{ name: 'incidents' }">故障列表 / 关联查询</RouterLink>
          </div>
          <p class="callout">自动建单仅为可选规则策略。已有故障优先查看、复用和关联，不因重复信号自动重复建单；告警恢复与故障复验关闭独立。</p>
        </template>
      </section>
    </div>
  </section>
</template>
<style scoped>
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--console-space-4); }
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.panel h2 { font-size: 18px; margin: var(--console-space-4) 0; }
.panel h3 { font-size: 15px; margin: var(--console-space-6) 0 var(--console-space-3); }
.panel-actions { display: flex; flex-wrap: wrap; gap: var(--console-space-3); margin-top: var(--console-space-6); }
.action { padding: 4px 12px; border: 1px solid var(--console-border); border-radius: var(--console-radius); background: var(--console-surface); color: var(--console-text); cursor: pointer; }
.action.disabled { color: var(--console-text-muted); cursor: not-allowed; }
.text-link { color: var(--console-blue); }
.muted, .empty { color: var(--console-text-muted); font-size: 12px; }
.callout { margin-top: var(--console-space-6); color: var(--console-text-muted); }
@media (max-width: 900px) { .detail-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
