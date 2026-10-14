<script setup lang="ts">
import { computed, ref, watch } from 'vue';
type Cell = string | number;
interface Tab { key: string; title: string; rows: Cell[][] }
interface Link { name: string; query: Record<string, string> }
const props = defineProps<{ fields: Cell[][]; tabs: Tab[]; evidenceLink?: (row: Cell[]) => Link | null }>();
const tab = ref('');
watch(() => props.tabs, () => { tab.value = props.tabs[0]?.key || ''; }, { immediate: true });
const selectedTab = computed(() => props.tabs.find(item => item.key === tab.value) || props.tabs[0]);
</script>
<template>
  <section class="panel">
    <a-descriptions bordered :column="{ xs: 1, sm: 1, md: 2 }" size="small"><a-descriptions-item v-for="[label, value] in fields" :key="String(label)" :label="String(label)">{{ value }}</a-descriptions-item></a-descriptions>
    <a-tabs v-model:active-key="tab" class="detail-tabs"><a-tab-pane v-for="item in tabs" :key="item.key" :tab="item.title" /></a-tabs>
    <div v-if="selectedTab?.rows.length" class="evidence">
      <div v-for="(row, index) in selectedTab.rows" :key="index" class="evidence-row">
        <strong>{{ row[0] }}</strong><span v-for="(value, cell) in row.slice(1)" :key="cell">{{ value }}</span>
        <RouterLink v-if="evidenceLink?.(row)" :to="evidenceLink(row)!">查看关联</RouterLink>
      </div>
    </div>
    <a-empty v-else description="当前对象暂无该类示例记录；不推断为正常。" />
  </section>
</template>
<style scoped>
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.detail-tabs { margin-top: var(--console-space-6); }
.evidence-row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--console-space-4); padding-block: var(--console-space-4); border-bottom: 1px solid var(--console-border); }
.evidence-row strong { min-width: 140px; }
.evidence-row span { flex: 1; min-width: 120px; }
@media (max-width: 600px) { .panel { padding: var(--console-space-3); } }
</style>
