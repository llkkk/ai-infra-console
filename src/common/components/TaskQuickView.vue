<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { taskQuickViewData } from '@/common/utils/tasks.js';
const props = defineProps<{ taskId: string }>();
const emit = defineEmits<{ close: [] }>();
const task = computed(() => taskQuickViewData(props.taskId));
const tab = ref('phases');
watch(() => props.taskId, () => { tab.value = 'phases'; });
function statusColor(state: string) {
  if (/失败/.test(state)) return 'error';
  if (/成功|完成/.test(state)) return 'success';
  if (/执行中|进行中/.test(state)) return 'processing';
  return 'default';
}
</script>
<template>
  <a-drawer :open="true" width="min(680px, 100vw)" title="任务快速查看" placement="right" @close="emit('close')">
    <template v-if="task">
      <header class="task-heading">
        <h2>{{ task.id }}</h2>
        <div class="task-tags"><a-tag>{{ task.type }}</a-tag><a-tag :color="statusColor(String(task.state))">{{ task.state }}</a-tag></div>
        <p>当前阶段：{{ task.stage }}</p>
      </header>
      <a-alert class="source-notice" type="info" show-icon :message="task.origin" description="虚构数据，仅查看记录；不触发真实执行或模型部署。" />
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="目标">{{ task.target }}</a-descriptions-item>
        <a-descriptions-item label="区域">{{ task.region }}</a-descriptions-item>
        <a-descriptions-item label="执行来源">{{ task.source }}</a-descriptions-item>
        <a-descriptions-item label="子阶段">{{ task.subStage }}</a-descriptions-item>
        <a-descriptions-item :label="task.summaryLabel">{{ task.summary }}</a-descriptions-item>
        <a-descriptions-item label="创建时间">{{ task.created }}</a-descriptions-item>
        <a-descriptions-item label="当前耗时">{{ task.duration }}</a-descriptions-item>
        <a-descriptions-item label="关联对象">
          <div v-if="task.relations.length" class="relation-links">
            <RouterLink v-for="relation in task.relations" :key="relation.route + relation.id" :to="{ name: relation.route, query: { id: relation.id } }" @click="emit('close')">{{ relation.label }} · {{ relation.id }}</RouterLink>
          </div>
          <span v-else>没有明确关联记录，不根据名称猜测关系。</span>
        </a-descriptions-item>
      </a-descriptions>
      <a-tabs v-model:active-key="tab">
        <a-tab-pane key="phases" tab="执行阶段">
          <a-list v-if="task.hasEvidence" :data-source="task.phases">
            <template #renderItem="{ item }">
              <a-list-item><div class="phase-row"><strong>{{ item.name }}</strong><a-tag :color="statusColor(item.state)">{{ item.state }}</a-tag><span class="muted">{{ item.at || '未记录时间' }}</span></div></a-list-item>
            </template>
          </a-list>
          <a-empty v-else description="未接入执行阶段记录；不会借用其他任务的步骤。" />
        </a-tab-pane>
        <a-tab-pane key="logs" tab="日志 / 历史">
          <a-alert v-if="task.logs.some(entry => entry.state === '失败')" class="source-notice" type="warning" show-icon message="以下保留历史失败与后续处理；当前状态以任务头部为准。" />
          <a-list v-if="task.logs.length" :data-source="task.logs">
            <template #renderItem="{ item }">
              <a-list-item><div><div class="phase-row"><strong>{{ item.name }}</strong><a-tag :color="statusColor(item.state)">{{ item.state }}</a-tag><span class="muted">{{ item.at || '未记录时间' }}</span></div><p class="log-text">{{ item.log }}</p></div></a-list-item>
            </template>
          </a-list>
          <a-empty v-else description="未接入执行日志 / 历史。" />
        </a-tab-pane>
      </a-tabs>
      <RouterLink :to="{ name: 'task', query: { id: taskId } }" @click="emit('close')">查看完整详情 →</RouterLink>
    </template>
    <a-result v-else status="404" title="未找到任务" :sub-title="`任务 ${taskId || '（未指定 ID）'} 没有记录，不会自动回退到其他任务。`" />
  </a-drawer>
</template>
<style scoped>
.task-heading h2 { margin: 0 0 var(--console-space-3); overflow-wrap: anywhere; }
.task-tags, .phase-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--console-space-2); }
.task-heading p, .muted { color: var(--console-text-muted); }
.source-notice { margin-bottom: var(--console-space-4); }
.relation-links { display: flex; flex-direction: column; gap: var(--console-space-2); }
.log-text { margin: var(--console-space-2) 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
