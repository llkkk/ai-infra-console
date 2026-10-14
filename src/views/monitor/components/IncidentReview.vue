<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import PlainTable from './PlainTable.vue';
import { archiveHint, incidentById, incidentGates, incidentLinks, reviewContext, statusTone } from '@/common/utils/monitor.js';
type Cell = string | number;
type IncidentRecord = NonNullable<ReturnType<typeof incidentById>>;
const props = defineProps<{ incident: IncidentRecord }>();
const emit = defineEmits<{ plan: [action: string, context: Cell[]] }>();
const review = computed(() => props.incident.review || {});
const gates = computed(() => incidentGates(props.incident));
const links = computed(() => incidentLinks(props.incident));
const archived = computed(() => review.value.status === '已归档');
const archiveNote = computed(() => archived.value ? '已归档记录只读，不能编辑复盘或重复归档。' : archiveHint(props.incident, gates.value.archive));
const timelineRows = computed(() => (props.incident.timeline || []).map((entry: string[]) => [entry[0], entry[1], `${entry[3]}：${entry[4]}`]));
const evidenceColumns = [{ title: '证据', key: 'name' }, { title: '引用 / 说明', key: 'detail' }, { title: '入口', key: 'target' }];
const actionColumns = [{ title: '改进项', key: 'title' }, { title: '负责人', key: 'owner' }, { title: '截止时间', key: 'due' }, { title: '状态', key: 'status' }, { title: '证据', key: 'evidence' }];
const tone = (value: string) => {
  const color = statusTone(value);
  return color === 'default' ? undefined : color;
};
</script>
<template>
  <section class="incident-review">
    <div class="stats" aria-label="故障复盘状态">
      <div><small>故障单</small><strong class="smaller">{{ incident.id }}</strong><span>{{ incident.title }}</span></div>
      <div><small>故障阶段</small><strong class="smaller">{{ incident.phase }}</strong><span>关闭与归档分别记录</span></div>
      <div><small>复盘状态</small><strong class="smaller">{{ review.status || '未开始' }}</strong><span>{{ review.required ? '正式复盘' : '轻量记录' }}</span></div>
      <div><small>归档时间</small><strong class="smaller">{{ review.archivedAt || '—' }}</strong><span>{{ archived ? '记录只读' : '尚未归档' }}</span></div>
    </div>

    <div class="detail-grid">
      <section class="panel" aria-label="结构化复盘">
        <h2>结构化复盘</h2>
        <dl class="kv">
          <dt>复盘要求</dt><dd>{{ review.required ? '正式复盘（required）' : '轻量复盘记录（非强制）' }}</dd>
          <dt>摘要</dt><dd>{{ review.summary || '尚未记录' }}</dd>
          <dt>实际影响</dt><dd>{{ review.impact || '尚未记录' }}</dd>
          <dt>根因状态</dt><dd><a-tag :color="tone(review.rootCause?.state || '未确认')">{{ review.rootCause?.state || '未确认' }}</a-tag></dd>
          <dt>根因说明</dt><dd>{{ review.rootCause?.detail || '根因未知；允许保留未知状态，但不得自动判定复盘完成。' }}</dd>
          <dt>恢复措施</dt><dd>{{ review.recovery || '尚未记录' }}</dd>
          <dt>复核人</dt><dd>{{ review.reviewer || '尚未指定' }}</dd>
        </dl>
        <div class="panel-actions">
          <RouterLink class="action" :to="{ name: 'incident', query: { id: incident.id } }">返回故障工作台</RouterLink>
          <button v-if="!archived" type="button" class="action" @click="emit('plan', 'incident-review', reviewContext(incident))">复盘预检（不持久化）</button>
        </div>
      </section>

      <section class="panel" aria-label="复盘时间线与证据">
        <h2>时间线</h2>
        <PlainTable :head="['时间', '事件', '详情']" :rows="timelineRows" />
        <h2>证据</h2>
        <a-table :columns="evidenceColumns" :data-source="links.evidence.map((item: Record<string, unknown>, index: number) => ({ key: index, ...item }))" :pagination="false" size="small">
          <template #bodyCell="{ column, record }">
            <RouterLink v-if="column.key === 'target' && record.target" :to="record.target" class="text-link">查看</RouterLink>
            <span v-else-if="column.key === 'target'">示例数据缺失，不回退</span>
            <template v-else>{{ record[column.key] }}</template>
          </template>
        </a-table>
      </section>

      <section class="panel wide" aria-label="改进项与跟踪">
        <h2>改进项与跟踪</h2>
        <a-table :columns="actionColumns" :data-source="(review.actions || []).map((action: Record<string, unknown>) => ({ key: action.id, title: action.title, owner: action.owner, due: action.due, status: action.status, evidence: action.evidence || '待补充' }))" :pagination="false" size="small">
          <template #bodyCell="{ column, record }">
            <a-tag v-if="column.key === 'status'" :color="tone(record.status)">{{ record.status }}</a-tag>
            <template v-else>{{ record[column.key] }}</template>
          </template>
        </a-table>
        <p class="muted">改进项未完成不自动阻止复盘展示；归档预检会明确提示，归档后仍需继续跟踪未完成改进。</p>
      </section>

      <section class="panel" aria-label="归档门禁">
        <h2>归档门禁</h2>
        <p class="callout">{{ gates.archive.reason }}</p>
        <div v-if="!archived" class="panel-actions">
          <button type="button" class="action" :disabled="!gates.archive.allowed" :title="gates.archive.reason" @click="emit('plan', 'incident-archive', reviewContext(incident))">生成归档预检</button>
        </div>
        <p v-if="archiveNote" class="muted">{{ archiveNote }}</p>
      </section>
    </div>
    <p class="callout">复盘和归档按钮只生成本地预检计划，不保存内容、不请求真实 API；未知根因必须保持明确标记。</p>
  </section>
</template>
<style scoped>
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--console-space-4); margin-bottom: var(--console-space-6); }
.stats > div, .panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.stats small, .stats span, .muted { color: var(--console-text-muted); font-size: 12px; }
.stats strong { display: block; margin-block: var(--console-space-2); }
.stats strong.smaller { font-size: 15px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--console-space-4); }
.panel.wide { grid-column: span 2; }
.panel h2 { font-size: 18px; margin: 0 0 var(--console-space-4); }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: var(--console-space-2) var(--console-space-4); margin: 0; }
.kv dt { color: var(--console-text-muted); }
.kv dd { margin: 0; }
.panel-actions { display: flex; flex-wrap: wrap; gap: var(--console-space-3); margin-top: var(--console-space-6); }
.action { padding: 4px 12px; border: 1px solid var(--console-border); border-radius: var(--console-radius); background: var(--console-surface); color: var(--console-text); cursor: pointer; }
.action:disabled { color: var(--console-text-muted); cursor: not-allowed; }
.text-link { color: var(--console-blue); }
.callout { margin-top: var(--console-space-6); color: var(--console-text-muted); }
@media (max-width: 1000px) { .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .detail-grid { grid-template-columns: minmax(0, 1fr); } .panel.wide { grid-column: auto; } }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
