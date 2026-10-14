<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { S2_REQUEST_FIELDS, defaultS2Request, s2RequestBody } from '@/common/utils/pools.js';
import { useDemoStore } from '@/stores/demo';
interface RequestState { pool: string; demand: string; runtime: string; storage: string; network: string; valid: string }
const demo = useDemoStore();
const state = ref<RequestState>(defaultS2Request());
const idempotencyKey = ref(`idem-${Date.now().toString(36)}`);
const requestBody = computed(() => JSON.stringify(s2RequestBody(state.value, idempotencyKey.value), null, 2));
watch(() => demo.enabled, () => { if (!demo.enabled) state.value = defaultS2Request(); });
function submit() {
  const id = demo.submitRequest({ ...state.value });
  idempotencyKey.value = `idem-${Date.now().toString(36)}`;
  message.success(`已创建交付单 ${id}（演示）：立即返回交付单号，进入“申请 · 已提交”`);
}
</script>
<template>
  <section class="panel simulator" aria-label="模拟 S2 申请">
    <header class="sim-head">
      <h2>模拟 S2 申请 · 对外接口演示</h2>
      <a-tag color="orange">演示</a-tag>
    </header>
    <p class="muted">对应 S1 管理层对外接口“提交环境申请”：立即返回交付单号；本入口只生成本地演示单据，可用交付单详情的演示控制条推进或模拟失败。</p>
    <div class="sim-grid">
      <a-form layout="vertical" class="sim-form">
        <a-form-item label="资源池">
          <a-select v-model:value="state.pool" :options="[
            { value: 'dedicated-gpu', label: 'dedicated-gpu（专属池）' },
            { value: 'gpu-general', label: 'gpu-general（共享池）' },
            { value: 'baremetal-01', label: 'baremetal-01（裸金属池）' }
          ]" />
        </a-form-item>
        <a-form-item v-for="[key, label] in S2_REQUEST_FIELDS.slice(1)" :key="key" :label="label">
          <a-input v-if="key !== 'demand'" v-model:value="state[key as Exclude<keyof RequestState, 'pool'>]" :aria-label="label" />
          <a-select v-else v-model:value="state.demand" :options="[
            { value: 'gpu-whole × 2', label: 'gpu-whole × 2（整卡）' },
            { value: 'gpu-whole × 4', label: 'gpu-whole × 4（整卡）' },
            { value: 'bm-8gpu × 1', label: 'bm-8gpu × 1（整机）' }
          ]" />
        </a-form-item>
        <a-button type="primary" @click="submit">提交申请（演示）</a-button>
      </a-form>
      <div class="request-body">
        <div class="body-head">接口请求体预览 · POST /api/v1/delivery-orders（字段待与对接方定义）</div>
        <pre>{{ requestBody }}</pre>
      </div>
    </div>
  </section>
</template>
<style scoped>
.panel { min-width: 0; padding: var(--console-space-6); margin-bottom: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.sim-head { display: flex; align-items: center; gap: var(--console-space-3); }
h2 { margin: 0; font-size: 18px; }
.muted { color: var(--console-text-muted); }
.sim-grid { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(0, 1.2fr); gap: var(--console-space-6); margin-top: var(--console-space-4); }
.request-body { min-width: 0; border: 1px dashed var(--console-border); border-radius: var(--console-radius); background: var(--console-bg); }
.body-head { padding: var(--console-space-3) var(--console-space-4); border-bottom: 1px dashed var(--console-border); color: var(--console-text-muted); font-size: 12px; }
pre { margin: 0; padding: var(--console-space-4); overflow: auto; font-size: 12px; line-height: 1.7; }
@media (max-width: 900px) { .sim-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
