<script setup lang="ts">
interface Stat { label: string; value: string; caption: string }
interface Capacity { label: string; unit: string; total: number; used: number; reserved: number }
defineProps<{ stats: Stat[]; capacity: Capacity[] | null; capacityNote: string }>();
</script>
<template>
  <section class="cluster-summary">
    <div class="stats">
      <div v-for="stat in stats" :key="stat.label"><small>{{ stat.label }}</small><strong>{{ stat.value }}</strong><span>{{ stat.caption }}</span></div>
    </div>
    <section class="panel">
      <h2>容量（Reserved / Used · 示例）</h2>
      <template v-if="capacity">
        <div v-for="item in capacity" :key="item.label" class="usage">
          <div><b>{{ item.label }}</b><span>已用 {{ item.used }} {{ item.unit }} / 预留 {{ item.reserved }} {{ item.unit }} / 总计 {{ item.total }} {{ item.unit }}</span></div>
          <a-progress :percent="Math.round(item.used / item.total * 100)" :show-info="false" />
        </div>
        <p class="muted">容量条展示 Reserved / Used 口径；数值均为示例。</p>
      </template>
      <a-empty v-else :description="capacityNote" />
    </section>
  </section>
</template>
<style scoped>
.cluster-summary { margin-bottom: var(--console-space-6); }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--console-space-4); margin-bottom: var(--console-space-6); }
.stats > div, .panel { background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); padding: var(--console-space-6); }
.stats small { color: var(--console-text-muted); }
.stats strong { display: block; margin-top: var(--console-space-3); font-size: 24px; }
.stats span { display: block; margin-top: var(--console-space-2); color: var(--console-text-muted); font-size: 12px; }
.panel h2 { font-size: 18px; margin: 0 0 var(--console-space-6); }
.usage { margin-bottom: var(--console-space-4); }
.usage > div:first-child { display: flex; justify-content: space-between; gap: var(--console-space-3); }
.usage span, .muted { color: var(--console-text-muted); }
@media (max-width: 900px) { .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
