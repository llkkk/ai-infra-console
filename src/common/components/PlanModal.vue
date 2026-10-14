<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { planConfig } from '@/common/utils/objects.js';
import { prefillValues, requiredChecks, findBlocker } from '@/common/utils/form-logic.js';
interface Config {
  title: string;
  fields: [string, string | string[]][];
  warning?: string;
  readonly?: string[];
}
const props = defineProps<{ action: string; context: (string | number)[] }>();
const emit = defineEmits<{ close: [] }>();
const config = computed(() => planConfig(props.action) as Config);
const values = ref<Record<string, string>>({});
const checks = ref<string[]>([]);
const preview = ref<Record<string, string> | null>(null);
watch(() => props.action, () => { values.value = prefillValues(config.value, props.context); checks.value = []; preview.value = null; }, { immediate: true });
const required = computed<string[]>(() => requiredChecks(config.value, values.value));
const blocker = computed(() => findBlocker(config.value, values.value));
const allowed = computed(() => !blocker.value && config.value.fields.every(([name]) => values.value[name]?.trim()) && required.value.every(item => checks.value.includes(item)));
watch(values, () => { preview.value = null; checks.value = []; }, { deep: true });
watch(checks, () => { preview.value = null; }, { deep: true });
function generate() { if (allowed.value) preview.value = { ...values.value }; }
</script>
<template>
  <a-modal :open="true" :title="config.title" :width="640" :footer="null" @cancel="emit('close')">
    <a-alert type="info" show-icon message="本地预检：字段表示拟定计划，不等同于当前配置；只生成计划，不更新业务数据，不执行基础设施操作。禁止输入真实凭据。" />
    <a-form layout="vertical" class="plan-form">
      <a-form-item v-for="([name, value], index) in config.fields" :key="name" :label="name" :html-for="`plan-field-${index}`" required>
        <a-select v-if="Array.isArray(value)" :id="`plan-field-${index}`" v-model:value="values[name]" :disabled="config.readonly?.includes(name)" :options="value.map(label => ({ label, value: label }))" />
        <a-textarea v-else-if="String(value).includes('\n')" :id="`plan-field-${index}`" v-model:value="values[name]" :rows="4" />
        <a-input v-else :id="`plan-field-${index}`" v-model:value="values[name]" :disabled="config.readonly?.includes(name)" />
      </a-form-item>
      <a-alert v-if="config.warning" type="warning" show-icon :message="config.warning" />
      <a-checkbox-group v-model:value="checks" class="confirmations"><a-checkbox v-for="item in required" :key="item" :value="item">{{ item }}</a-checkbox></a-checkbox-group>
      <a-alert v-if="blocker" type="error" show-icon :message="blocker" />
      <div class="actions"><a-button @click="emit('close')">取消</a-button><a-button type="primary" :disabled="!allowed" @click="generate">生成本地计划</a-button></div>
    </a-form>
    <section v-if="preview" class="preview" aria-label="本地计划预览"><h3>计划预览 · 未执行</h3><a-descriptions bordered :column="1" size="small"><a-descriptions-item v-for="(value, name) in preview" :key="name" :label="String(name)">{{ value }}</a-descriptions-item></a-descriptions><p>仅供评审；关闭后不保存，不代表外部系统已接受或完成。</p></section>
  </a-modal>
</template>
<style scoped>
.plan-form { margin-top: var(--console-space-6); }
.confirmations { display: flex; flex-direction: column; gap: var(--console-space-3); margin-block: var(--console-space-6); }
.actions { display: flex; justify-content: flex-end; gap: var(--console-space-3); margin-top: var(--console-space-6); }
.preview { margin-top: var(--console-space-6); border-top: 1px solid var(--console-border); }
.preview p { color: var(--console-text-muted); }
</style>
