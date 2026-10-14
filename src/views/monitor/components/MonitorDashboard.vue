<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { RightOutlined } from '@ant-design/icons-vue';
import { LAYER_TABS, MONITOR_CONVENTIONS, RESOURCE_GROUP_TABS, firingAlerts, groupStats, layerPanel, openIncidents, notificationOf } from '@/common/utils/monitor.js';
import MiniChart from './MiniChart.vue';
const activeGroup = ref('全部资源');
const activeLayer = ref('host');
const stats = computed(() => groupStats(activeGroup.value));
const panel = computed(() => layerPanel(activeLayer.value));
const stateTone: Record<string, string> = { ok: 'success', warn: 'warning', unknown: 'default' };
const stateLabel: Record<string, string> = { ok: '正常', warn: '关注', unknown: '未知' };
const alertRows = computed(() => firingAlerts().map(alert => ({ key: alert.id, id: alert.id, level: alert.level, object: alert.object, message: alert.message, state: `${alert.ack} / ${notificationOf(alert)}` })));
const incidentRows = computed(() => openIncidents().map(inc => ({ key: inc.id, id: inc.id, title: inc.title, severity: inc.severity, phase: inc.phase, owner: inc.owner })));
const alertColumns = [{ title: '告警', key: 'id' }, { title: '级别', key: 'level' }, { title: '对象', key: 'object' }, { title: '现象', key: 'message' }, { title: '确认 / 通知', key: 'state' }, { title: '操作', key: 'actions' }];
const incidentColumns = [{ title: '故障单', key: 'id' }, { title: '标题', key: 'title' }, { title: '严重度', key: 'severity' }, { title: '阶段', key: 'phase' }, { title: '责任方', key: 'owner' }, { title: '操作', key: 'actions' }];
</script>
<template>
  <section class="monitor-dashboard">
    <header class="group-header">
      <h2>资源分组概览</h2>
      <a-radio-group v-model:value="activeGroup" :options="RESOURCE_GROUP_TABS.map(name => ({ value: name, label: name }))" option-type="button" button-style="solid" size="small" />
    </header>
    <div class="stats" aria-label="资源分组统计">
      <div><small>集群</small><strong class="smaller">{{ stats.clusters }}</strong><span>池所属集群</span></div>
      <div><small>节点 / 整机</small><strong class="smaller">{{ stats.nodes }}</strong><span>分组口径成员</span></div>
      <div><small>计算卡</small><strong class="smaller">{{ stats.cards }}</strong><span>物理口径</span></div>
      <div><small>已分配 / 租出</small><strong class="smaller">{{ stats.allocated }}</strong><span>分配事实，非利用率</span></div>
      <p class="group-note">{{ stats.note }}</p>
    </div>

    <section class="panel layers" aria-label="资源层面监控">
      <header class="layer-header">
        <h2>资源层面 · 哪些指标需要真正关注</h2>
        <a-radio-group v-model:value="activeLayer" :options="LAYER_TABS.map(tab => ({ value: tab.key, label: tab.title }))" option-type="button" button-style="solid" size="small" />
      </header>
      <p class="muted">{{ panel.intro }}</p>
      <div class="metric-grid">
        <div v-for="metric in panel.metrics" :key="metric.name" class="metric" :data-state="metric.state">
          <div class="metric-head"><b>{{ metric.name }}</b><a-tag :color="stateTone[metric.state]" class="metric-tag">{{ stateLabel[metric.state] }}</a-tag></div>
          <strong>{{ metric.value }}</strong>
          <small>{{ metric.why }}</small>
        </div>
      </div>
      <div v-if="panel.charts?.length" class="chart-grid">
        <MiniChart v-for="chart in panel.charts" :key="chart.title" :chart="chart" />
      </div>
      <div class="top-block">
        <h3>Top 关注对象</h3>
        <div v-for="top in panel.tops" :key="top.object" class="top-row">
          <RouterLink class="text-link" :to="{ name: top.page, query: top.id ? { id: top.id } : undefined }">{{ top.object }}</RouterLink>
          <a-tag :color="stateTone[top.state]" size="small">{{ stateLabel[top.state] }}</a-tag>
          <small>{{ top.note }}</small>
        </div>
      </div>
      <p class="muted trend-note">趋势图：指标未接入时正式系统显示"无数据"，不以假曲线代替；接入后本区展示时序折线（采集在执行层，汇总在管理层）。</p>
    </section>

    <div class="detail-grid">
      <section class="panel wide" aria-label="活跃告警">
        <h2>活跃告警 · 机器信号层</h2>
        <a-table :columns="alertColumns" :data-source="alertRows" :pagination="false" size="small" :scroll="{ x: 900 }">
          <template #bodyCell="{ column, record }">
            <RouterLink v-if="column.key === 'id'" :to="{ name: 'alert', query: { id: record.id } }">{{ record.id }}</RouterLink>
            <RouterLink v-else-if="column.key === 'actions'" class="text-link" :to="{ name: 'alert', query: { id: record.id } }">告警详情 <RightOutlined /></RouterLink>
            <template v-else>{{ record[column.key] }}</template>
          </template>
        </a-table>
        <p class="muted">确认、静默不代表恢复；活跃仅按信号触发判断；交付类事件（预留超时 / 配额不足 / 验收失败）纳入告警策略。</p>
        <RouterLink class="text-link" :to="{ name: 'alerts' }">进入告警中心</RouterLink>
      </section>
      <section class="panel wide" aria-label="未关闭故障">
        <h2>未关闭故障 · 人的处理层</h2>
        <a-table :columns="incidentColumns" :data-source="incidentRows" :pagination="false" size="small" :scroll="{ x: 900 }">
          <template #bodyCell="{ column, record }">
            <RouterLink v-if="column.key === 'id'" :to="{ name: 'incident', query: { id: record.id } }">{{ record.id }}</RouterLink>
            <RouterLink v-else-if="column.key === 'actions'" class="text-link" :to="{ name: 'incident', query: { id: record.id } }">处理工作台 <RightOutlined /></RouterLink>
            <template v-else>{{ record[column.key] }}</template>
          </template>
        </a-table>
        <p class="muted">告警、任务失败或人工可发起故障；自动建单仅按明确规则，不代表所有严重告警都会自动建单。</p>
        <RouterLink class="text-link" :to="{ name: 'incidents' }">进入故障管理</RouterLink>
      </section>
      <section class="panel wide" aria-label="观测约定">
        <h2>观测约定</h2>
        <ul class="rule-list"><li v-for="rule in MONITOR_CONVENTIONS" :key="rule">{{ rule }}</li></ul>
      </section>
    </div>
  </section>
</template>
<style scoped>
.monitor-dashboard { display: flex; flex-direction: column; gap: var(--console-space-6); }
.group-header, .layer-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--console-space-3); }
.group-header h2, .layers h2, .panel h2 { font-size: 18px; margin: 0; }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--console-space-4); }
.stats > div, .panel { background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); padding: var(--console-space-6); }
.stats small { color: var(--console-text-muted); }
.stats strong { display: block; margin-block: var(--console-space-3); font-size: 20px; }
.stats span { color: var(--console-text-muted); font-size: 12px; }
.group-note { grid-column: 1 / -1; margin: 0; color: var(--console-text-muted); font-size: 12px; }
.layers > * + * { margin-top: var(--console-space-4); }
.muted { color: var(--console-text-muted); font-size: 12px; }
.metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--console-space-4); }
.metric { display: flex; flex-direction: column; gap: var(--console-space-2); padding: var(--console-space-4); background: var(--console-bg); border: 1px solid var(--console-border); border-left: 3px solid var(--console-border); border-radius: var(--console-radius); }
.metric[data-state='warn'] { border-left-color: #d46b08; }
.metric[data-state='ok'] { border-left-color: #2f855a; }
.metric-head { display: flex; align-items: center; justify-content: space-between; gap: var(--console-space-2); }
.metric-tag { margin: 0; flex: none; }
.metric strong { font-size: 16px; }
.metric small { color: var(--console-text-muted); line-height: 1.6; }
.chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--console-space-4); }
.top-block h3 { margin: 0 0 var(--console-space-3); font-size: 14px; }
.top-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--console-space-3); padding-block: var(--console-space-2); border-bottom: 1px solid var(--console-border); }
.top-row:last-child { border-bottom: 0; }
.top-row small { color: var(--console-text-muted); }
.trend-note { margin-top: var(--console-space-2); }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--console-space-4); }
.panel.wide { grid-column: span 2; min-width: 0; }
.panel h2 { margin-bottom: var(--console-space-4); }
.text-link { color: var(--console-blue); white-space: nowrap; }
.rule-list { padding-left: var(--console-space-5); line-height: 1.8; margin: 0; }
@media (max-width: 1100px) { .stats, .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 800px) { .detail-grid, .chart-grid { grid-template-columns: minmax(0, 1fr); } .panel.wide { grid-column: auto; } }
@media (max-width: 600px) { .stats, .metric-grid, .chart-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
