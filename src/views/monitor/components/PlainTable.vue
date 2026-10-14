<script setup lang="ts">
import { computed } from 'vue';
type Cell = string | number;
const props = defineProps<{ head: string[]; rows: Cell[][] }>();
const columns = computed(() => props.head.map((title, index) => ({ title, key: String(index) })));
const data = computed(() => props.rows.map((cells, index) => ({ key: index, cells })));
</script>
<template>
  <a-table :columns="columns" :data-source="data" :pagination="false" size="small" :scroll="{ x: 720 }">
    <template #bodyCell="{ column, record }">{{ record.cells[Number(column.key)] }}</template>
  </a-table>
</template>
