<script setup lang="ts">
type Cell = string | number;
defineProps<{ fields: Cell[][]; note: string }>();
const emit = defineEmits<{ open: [] }>();
</script>
<template>
  <section class="panel source-panel">
    <h2>已有集群纳管</h2>
    <a-descriptions bordered :column="{ xs: 1, sm: 2, md: 4 }" size="small">
      <a-descriptions-item v-for="[label, value] in fields" :key="String(label)" :label="String(label)">{{ value }}</a-descriptions-item>
    </a-descriptions>
    <a-alert class="source-note" type="info" show-icon :message="note" />
    <div class="actions"><a-button @click="emit('open')">接入配置</a-button></div>
  </section>
</template>
<style scoped>
.panel { min-width: 0; margin-bottom: var(--console-space-6); padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.panel h2 { font-size: 18px; margin: 0 0 var(--console-space-6); }
.source-note { margin-block: var(--console-space-6); }
.actions { display: flex; justify-content: flex-end; }
</style>
