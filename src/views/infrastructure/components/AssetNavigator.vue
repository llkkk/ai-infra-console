<script setup lang="ts">
// 资产导航（评审稿 3.1）：左侧位置树（机房 → 机柜 / 未分配），上方阶段条（7 阶段 + 异常，点击过滤）。
import { computed, ref, watch } from 'vue';
import { locationTree, stageBarCounts } from '@/model.js';
import { stageBarItems } from '@/common/utils/infrastructure.js';
const emit = defineEmits<{ filter: [stage: string | null, locationKey: string | null] }>();
const stage = ref<string | null>(null);
const locationKey = ref<string[]>([]);
interface StageItem { label: string; count: number; abnormal?: boolean }
const items = stageBarItems() as StageItem[];
const sideCounts = stageBarCounts();
const tree = locationTree();
interface TreeRack { key: string; title: string; count: number; abnormal?: number }
const treeData = computed(() => tree.map(node => ({
  key: node.key,
  title: `${node.title}（${node.total} 台）`,
  children: (node.children as TreeRack[]).map(child => ({ key: child.key, title: `${child.title} · ${child.count} 台${child.abnormal ? ` · 异常 ${child.abnormal}` : ''}` }))
})));
watch([stage, locationKey], () => emit('filter', stage.value, locationKey.value[0] ?? null), { deep: true });
function toggleStage(label: string) { stage.value = stage.value === label ? null : label; }
</script>
<template>
  <div class="navigator">
    <div class="stage-bar" role="group" aria-label="资产阶段条">
      <button v-for="item in items" :key="item.label" type="button" class="stage-cell" :class="{ active: stage === item.label, abnormal: item.abnormal }" :aria-pressed="stage === item.label" @click="toggleStage(item.label)">
        <strong>{{ item.count }}</strong><small>{{ item.label }}</small>
      </button>
      <div class="side-note">维护中 {{ sideCounts.maintenance }} · 已退役 {{ sideCounts.retired }}（不占阶段列）</div>
    </div>
    <div class="explorer">
      <aside class="location-tree panel">
        <h2>位置树</h2>
        <a-tree v-model:selectedKeys="locationKey" :tree-data="treeData" default-expand-all :selectable="true" />
        <p class="muted">机房 → 机柜；区域由左下角切换，不进树。接入交换机 / U 位等拓扑字段见资产详情。</p>
      </aside>
      <div class="list-slot"><slot :rows-filter="{ stage, locationKey: locationKey[0] ?? null }" /></div>
    </div>
  </div>
</template>
<style scoped>
.navigator { display: flex; flex-direction: column; gap: var(--console-space-4); }
.stage-bar { display: flex; flex-wrap: wrap; align-items: stretch; gap: var(--console-space-2); }
.stage-cell { display: flex; flex-direction: column; gap: 2px; min-width: 86px; padding: var(--console-space-3); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); cursor: pointer; text-align: left; }
.stage-cell strong { font-size: 20px; }
.stage-cell small { color: var(--console-text-muted); font-size: 12px; }
.stage-cell.active { border-color: var(--console-blue); box-shadow: 0 0 0 1px var(--console-blue); }
.stage-cell.abnormal strong { color: #c53030; }
.side-note { display: flex; align-items: center; margin-left: auto; color: var(--console-text-muted); font-size: 12px; }
.explorer { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: var(--console-space-4); align-items: start; }
.panel { min-width: 0; padding: var(--console-space-4); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.panel h2 { margin: 0 0 var(--console-space-3); font-size: 14px; }
.muted { color: var(--console-text-muted); font-size: 12px; margin-top: var(--console-space-3); }
@media (max-width: 900px) { .explorer { grid-template-columns: minmax(0, 1fr); } }
</style>
