<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { RightOutlined } from '@ant-design/icons-vue';
import { incidentActionContext, incidentById, incidentGates, incidentLinks, reviewContext, statusTone } from '@/common/utils/monitor.js';
type Cell = string | number;
type IncidentRecord = NonNullable<ReturnType<typeof incidentById>>;
const props = defineProps<{ incident: IncidentRecord }>();
const emit = defineEmits<{ plan: [action: string, context: Cell[]] }>();
const gates = computed(() => incidentGates(props.incident));
const links = computed(() => incidentLinks(props.incident));
const review = computed(() => props.incident.review || {});
const tone = (value: string) => {
  const color = statusTone(value);
  return color === 'default' ? undefined : color;
};
</script>
<template>
  <section class="incident-workbench">
    <div class="stats" aria-label="故障单概要">
      <div><small>当前阶段</small><strong class="smaller">{{ incident.phase }}</strong><span>{{ incident.phase === '已关闭' ? '已关闭，复盘状态见下方' : '下一步动作见时间线与待办' }}</span></div>
      <div><small>责任归属</small><strong class="smaller">{{ incident.owner }}</strong><span>底座故障与模型影响分开记录</span></div>
      <div><small>触发来源</small><strong class="smaller">{{ incident.trigger }}</strong><span>{{ incident.sourceType }} · {{ incident.creation }}</span></div>
      <div><small>开始 / 最近更新</small><strong class="smaller">{{ incident.started }} / {{ incident.updated }}</strong><span>{{ incident.impact }}</span></div>
    </div>

    <div class="detail-grid">
      <section class="panel" aria-label="处理时间线">
        <h2>处理时间线</h2>
        <div class="itl">
          <div v-for="(item, index) in incident.timeline" :key="index" class="itl-item">
            <span :class="['itl-dot', item[2] === 'auto' ? 'auto' : 'manual']">{{ item[2] === 'auto' ? '自动' : '人工' }}</span>
            <div class="itl-body">
              <div class="itl-head"><b>{{ item[1] }}</b><span :class="['itl-src', item[2]]">{{ item[2] === 'auto' ? '事件驱动' : '人工操作' }}</span><span class="itl-time">{{ item[0] }} · {{ item[3] }}</span></div>
              <p>{{ item[4] }}</p>
            </div>
          </div>
        </div>
        <template v-if="incident.pending.length">
          <h3>待办与下一步</h3>
          <div class="accept-list">
            <div v-for="[text, state] in incident.pending" :key="text" class="accept-row"><span>{{ text }}</span><a-tag :color="tone(state)">{{ state }}</a-tag></div>
          </div>
        </template>
        <div class="panel-actions">
          <button type="button" class="action" :disabled="!gates.canEdit" :title="gates.canEdit ? undefined : '已关闭或已归档，只读查看，不能记录处理动作'" @click="emit('plan', 'incident-action', incidentActionContext(incident))">记录处理动作（预检）</button>
          <RouterLink v-if="links.triggerAlert" class="action" :to="links.triggerAlert">查看触发告警 {{ incident.trigger }}</RouterLink>
          <RouterLink v-if="links.triggerTask" class="action" :to="links.triggerTask">查看任务 {{ incident.trigger }}</RouterLink>
        </div>
        <p v-if="!gates.canEdit" class="muted">故障已关闭或已归档，处理动作入口仅保留为只读说明，不可编辑。</p>
      </section>

      <section class="panel" aria-label="责任归属与边界">
        <h2>责任归属与边界</h2>
        <div class="owner-grid">
          <div class="owner-row"><b>S1 底座责任</b><p>{{ incident.s1 }}</p></div>
          <div class="owner-row"><b>S2 影响确认</b><p>{{ incident.s2 }}</p></div>
          <div class="owner-row"><b>关闭门禁</b><p>{{ gates.close.text }}</p></div>
        </div>
        <p class="callout">关闭门禁按影响范围确定：无 S2 影响由 S1 复验关闭；涉及已交付环境需双方确认；影响未知时不得按无影响关闭。告警静默或消失不等于恢复；未知状态不得自动重试或清理。</p>
      </section>

      <section class="panel" aria-label="恢复复验清单">
        <h2>恢复复验清单</h2>
        <div class="accept-list">
          <div v-for="[item, state] in incident.acceptance" :key="item" class="accept-row"><span>{{ item }}</span><a-tag :color="tone(state)">{{ state }}</a-tag></div>
        </div>
        <p class="muted">复验证据引用检查任务与指标恢复记录；复验未通过的故障单保持打开，不影响其他故障并行处理。</p>
      </section>

      <section class="panel" aria-label="关联对象与证据">
        <h2>关联对象</h2>
        <div class="related-links">
          <template v-for="object in links.objects" :key="object.kind + object.id">
            <RouterLink v-if="object.target" :to="object.target" class="chip">{{ object.kind }}：{{ object.id }} <RightOutlined /></RouterLink>
            <span v-else class="chip disabled">{{ object.kind }}：{{ object.id }}（示例数据缺失，不回退）</span>
          </template>
        </div>
        <h3>关联告警历史</h3>
        <div v-if="links.alerts.length" class="related-links">
          <template v-for="alert in links.alerts" :key="alert.id">
            <RouterLink v-if="alert.target" :to="alert.target" class="chip">告警：{{ alert.id }} <RightOutlined /></RouterLink>
            <span v-else class="chip disabled">告警：{{ alert.id }}（示例数据缺失）</span>
          </template>
        </div>
        <p v-else class="muted">暂无关联告警；该故障来源为任务失败或人工记录。</p>
        <h3>证据引用</h3>
        <a-table :columns="[{ title: '证据', key: 'name' }, { title: '引用 / 说明', key: 'detail' }, { title: '入口', key: 'target' }]" :data-source="links.evidence.map((item: Record<string, unknown>, index: number) => ({ key: index, ...item }))" :pagination="false" size="small">
          <template #bodyCell="{ column, record }">
            <RouterLink v-if="column.key === 'target' && record.target" :to="record.target" class="text-link">查看</RouterLink>
            <span v-else-if="column.key === 'target'">示例数据缺失，不回退</span>
            <template v-else>{{ record[column.key] }}</template>
          </template>
        </a-table>
        <p class="muted">关联对象、历史告警与证据均按稳定 ID 定位；定位失败时提示缺失，不回退到第一条记录。</p>
      </section>

      <section class="panel" aria-label="复盘信息">
        <h2>复盘信息</h2>
        <dl class="kv">
          <dt>状态</dt><dd><a-tag :color="tone(gates.reviewStatus)">{{ gates.reviewStatus }}</a-tag></dd>
          <dt>复盘要求</dt><dd>{{ review.required ? '正式复盘' : '轻量记录' }}</dd>
          <dt>摘要</dt><dd>{{ review.summary || '尚未记录' }}</dd>
          <dt>实际影响</dt><dd>{{ review.impact || '尚未记录' }}</dd>
          <dt>根因状态</dt><dd>{{ review.rootCause?.state || '未确认' }} · {{ review.rootCause?.detail || '根因尚未说明，不能自动判定完成。' }}</dd>
        </dl>
        <div class="panel-actions">
          <RouterLink class="action" :to="{ name: 'incident-review', query: { id: incident.id } }">查看复盘详情</RouterLink>
          <button v-if="gates.reviewStatus !== '已归档'" type="button" class="action" @click="emit('plan', 'incident-review', reviewContext(incident))">复盘预检</button>
        </div>
        <p class="muted">复盘完成、归档和改进项跟踪是不同状态；本原型所有按钮仅生成预检计划，不持久化。</p>
      </section>
    </div>
    <p class="callout">故障单与处理记录为虚构示例；真实系统需要事件驱动建单、权限校验、破坏性操作二次确认与审计留痕。</p>
  </section>
</template>
<style scoped>
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--console-space-4); margin-bottom: var(--console-space-6); }
.stats > div, .panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.stats small, .stats span, .muted { color: var(--console-text-muted); font-size: 12px; }
.stats strong { display: block; margin-block: var(--console-space-2); }
.stats strong.smaller { font-size: 15px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--console-space-4); }
.panel h2 { font-size: 18px; margin: 0 0 var(--console-space-4); }
.panel h3 { font-size: 15px; margin: var(--console-space-6) 0 var(--console-space-3); }
.itl-item { display: flex; gap: var(--console-space-3); padding-block: var(--console-space-3); border-bottom: 1px solid var(--console-border); }
.itl-dot { flex: none; align-self: flex-start; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: var(--console-bg); }
.itl-dot.auto { color: var(--console-blue); background: var(--console-blue-soft); }
.itl-head { display: flex; flex-wrap: wrap; gap: var(--console-space-2); align-items: center; }
.itl-src, .itl-time { color: var(--console-text-muted); font-size: 12px; }
.itl-body p { margin: var(--console-space-2) 0 0; color: var(--console-text-muted); }
.accept-row, .owner-row { display: flex; justify-content: space-between; gap: var(--console-space-3); padding-block: var(--console-space-3); border-bottom: 1px solid var(--console-border); }
.owner-row { display: block; }
.owner-row p { margin: var(--console-space-2) 0 0; color: var(--console-text-muted); }
.related-links { display: flex; flex-wrap: wrap; gap: var(--console-space-2); }
.chip { display: inline-flex; align-items: center; gap: var(--console-space-2); padding: 4px 10px; background: var(--console-bg); border-radius: var(--console-radius); color: var(--console-blue); }
.chip.disabled { color: var(--console-text-muted); }
.panel-actions { display: flex; flex-wrap: wrap; gap: var(--console-space-3); margin-top: var(--console-space-6); }
.action { padding: 4px 12px; border: 1px solid var(--console-border); border-radius: var(--console-radius); background: var(--console-surface); color: var(--console-text); cursor: pointer; }
.action:disabled { color: var(--console-text-muted); cursor: not-allowed; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: var(--console-space-2) var(--console-space-4); margin: 0; }
.kv dt { color: var(--console-text-muted); }
.kv dd { margin: 0; }
.text-link { color: var(--console-blue); }
.callout { margin-top: var(--console-space-6); color: var(--console-text-muted); }
@media (max-width: 1000px) { .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .detail-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
