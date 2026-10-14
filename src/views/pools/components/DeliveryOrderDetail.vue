<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { RouterLink } from 'vue-router';
import { ORDER_STAGES } from '@/model.js';
import { SIM_FAILURES } from '@/common/utils/pools.js';
import { deliveryProgress } from '@/common/utils/delivery-progress.js';
import TaskQuickView from '@/common/components/TaskQuickView.vue';
import { useDemoStore } from '@/stores/demo';
type Cell = string | number;
interface OrderDetail {
  id: string; kind: string; pool: string; project: string;
  stageIdx: number; sub: string; final: string | null; stageLabel: string; demo: boolean;
  request: Cell[][]; check: Cell[][]; reserve: Cell[][];
  delivery: Cell[][]; run: Cell[][]; release: Cell[][];
  timeline: unknown[][]; tasks: string[];
  actions: { label: string; action: string; context: Cell[] }[];
  progress: ReturnType<typeof deliveryProgress>;
}
const props = defineProps<{ detail: OrderDetail }>();
const emit = defineEmits<{ plan: [action: string, context: Cell[]] }>();
const demo = useDemoStore();
const stageItems = computed(() => props.detail.progress.stages.map(item => ({ ...item, status: item.status as 'wait' | 'process' | 'finish' | 'error' })));
const summaryTone = computed(() => props.detail.progress.tone as 'info' | 'success' | 'warning' | 'error');
const openSections = ref<string[]>([]);
const taskId = ref('');
watch(() => [props.detail.id, props.detail.stageIdx, props.detail.sub, props.detail.final], () => {
  openSections.value = [...props.detail.progress.openSections];
  taskId.value = '';
}, { immediate: true });
const sectionRows = computed(() => [[...props.detail.request, ...props.detail.check], props.detail.reserve, props.detail.delivery, props.detail.run, props.detail.release]);
const failureKinds = SIM_FAILURES.map(failure => failure.kind);
function advance() {
  const next = demo.advance(props.detail.id);
  if (next) message.success(`已推进：${ORDER_STAGES[next.stageIdx]} · ${next.sub}（演示）`);
  else message.info('终态或不可推进（演示）');
}
function fail(kind: string) {
  const failure = demo.fail(props.detail.id, kind);
  if (failure) message.warning(`已模拟失败：${kind}（演示）`);
}
const blockFields = (rows: Cell[][]) => rows.map(([label, value, note]) => ({ label: String(label), value: String(value), note: note ? String(note) : '' }));
</script>
<template>
  <div class="order-detail">
    <a-steps class="stage-bar" :current="detail.progress.current" :items="stageItems" size="small" />
    <section class="panel current-summary" aria-label="交付当前状态与下一步">
      <div class="summary-heading">
        <div><span class="muted">当前记录阶段 · {{ ORDER_STAGES[detail.stageIdx] }}</span><h2>{{ detail.stageLabel }}</h2></div>
        <RouterLink :to="{ name: 'pool', query: { id: detail.pool } }">查看资源池 {{ detail.pool }}</RouterLink>
      </div>
      <a-alert :type="summaryTone" show-icon :message="detail.progress.reason" />
      <div class="next-step"><b>建议处理方</b><span>{{ detail.progress.owner }}</span><b>下一步</b><span>{{ detail.progress.next }}</span></div>
      <div class="context-actions">
        <a-tooltip v-for="(item, index) in detail.actions" :key="item.label" :title="detail.progress.actionBlocker || '仅生成本地计划，不执行操作'">
          <a-button :type="index === 0 ? 'primary' : 'default'" :disabled="!!detail.progress.actionBlocker" @click="emit('plan', item.action, item.context)">{{ item.label }}</a-button>
        </a-tooltip>
        <span v-if="detail.progress.actionBlocker" class="muted">{{ detail.progress.actionBlocker }}</span>
      </div>
      <p class="muted summary-note">建议处理方用于流程评审，不代表已指派责任人；阶段完成不等于模型就绪。操作仅生成本地计划。</p>
    </section>

    <a-alert v-if="detail.demo" class="demo-bar" type="warning" show-icon message="演示单据：以下控制条只推进本地演示状态，不执行任何真实操作">
      <template #action>
        <a-space wrap>
          <a-button size="small" type="primary" :disabled="!!detail.final" @click="advance">推进下一步</a-button>
          <a-select size="small" placeholder="模拟失败" style="width: 130px" :options="failureKinds.map(kind => ({ value: kind, label: kind }))" :disabled="!!detail.final" @change="fail" />
        </a-space>
      </template>
    </a-alert>

    <a-collapse v-model:active-key="openSections" class="record-sections">
      <a-collapse-panel v-for="(section, index) in detail.progress.sections" :key="section.key">
        <template #header><b>{{ section.title }}</b><a-tag class="section-tag" :color="section.entered ? 'blue' : 'default'">{{ section.caption }}</a-tag></template>
        <dl v-if="section.entered">
          <template v-for="field in blockFields(sectionRows[index])" :key="field.label">
            <dt>{{ field.label }}</dt><dd>{{ field.value }}<small v-if="field.note && field.note !== '—'">{{ field.note }}</small></dd>
          </template>
        </dl>
        <p v-else class="muted">该阶段尚未进入，不代表已执行、已验收或已自动回收。</p>
        <p v-if="index === 1" class="muted">预留占住容量并带有效期；分配才绑定具体节点 / GPU 或整机。</p>
      </a-collapse-panel>
    </a-collapse>

    <div class="blocks two">
      <section class="panel">
        <h2>时间线</h2>
        <a-timeline class="timeline">
          <a-timeline-item v-for="(event, index) in detail.timeline" :key="index">
            <b>{{ String(event[1]) }}</b>
            <div class="muted">{{ String(event[0]) }} · {{ String(event[2]) }}</div>
          </a-timeline-item>
        </a-timeline>
      </section>
      <section class="panel">
        <h2>关联任务</h2>
        <p class="muted">快速查看保留当前交付单；任务完成不等于该交付单全部完成。</p>
        <div v-if="detail.tasks.length" class="task-links">
          <a-button v-for="id in detail.tasks" :key="id" type="link" @click="taskId = id">快速查看 {{ id }}</a-button>
        </div>
        <p v-else class="muted">暂无关联任务记录；不推断外部操作已经完成。</p>
      </section>
    </div>
    <TaskQuickView v-if="taskId" :task-id="taskId" @close="taskId = ''" />
  </div>
</template>
<style scoped>
.order-detail { display: flex; flex-direction: column; gap: var(--console-space-6); }
.stage-bar :deep(.ant-steps-item-title) { font-size: 13px; }
.summary-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--console-space-4); margin-bottom: var(--console-space-4); }
.summary-heading h2 { margin-top: var(--console-space-2); margin-bottom: 0; }
.summary-heading a { color: var(--console-blue); overflow-wrap: anywhere; }
.next-step { display: grid; grid-template-columns: auto 1fr; gap: var(--console-space-3) var(--console-space-4); margin-top: var(--console-space-4); }
.next-step b { white-space: nowrap; }
.context-actions { display: flex; flex-wrap: wrap; gap: var(--console-space-3); align-items: center; margin-top: var(--console-space-4); }
.summary-note { margin-bottom: 0; }
.section-tag { margin-left: var(--console-space-3); }
.record-sections { background: var(--console-surface); }
.blocks { display: grid; gap: var(--console-space-4); }
.blocks.two { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.panel h2 { margin: 0 0 var(--console-space-4); font-size: 16px; }
dl { display: grid; grid-template-columns: auto 1fr; gap: var(--console-space-2) var(--console-space-4); margin: 0; }
dt { color: var(--console-text-muted); white-space: nowrap; }
dd { margin: 0; overflow-wrap: anywhere; }
dd small { display: block; color: var(--console-text-muted); font-size: 12px; }
.muted { color: var(--console-text-muted); font-size: 12px; }
.panel > .muted { margin-top: var(--console-space-3); }
.timeline { margin-top: var(--console-space-2); }
.task-links { display: flex; flex-direction: column; gap: var(--console-space-2); }
.task-links :deep(.ant-btn) { align-self: flex-start; max-width: 100%; height: auto; padding-inline: 0; white-space: normal; text-align: left; }
@media (max-width: 1000px) { .blocks.two { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 600px) { .summary-heading { flex-direction: column; } .next-step, dl { grid-template-columns: minmax(0, 1fr); } }
</style>
