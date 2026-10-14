<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { RightOutlined } from '@ant-design/icons-vue';
import { SCENARIOS, scenarioTarget } from '@/common/utils/overview.js';
const selected = ref(SCENARIOS[0].id);
const scenario = computed(() => SCENARIOS.find(item => item.id === selected.value) ?? SCENARIOS[0]);
const steps = computed(() => scenario.value.steps.map(step => ({ label: step.label, note: 'note' in step ? step.note : undefined, target: scenarioTarget(step) })));
</script>
<template>
  <section class="panel wide" aria-label="演示场景入口">
    <h2>演示场景（本地模拟跳转）</h2>
    <div class="scenario-bar">
      <button v-for="item in SCENARIOS" :key="item.id" type="button" :class="{ 'scenario-active': item.id === selected }" @click="selected = item.id">{{ item.title }}</button>
    </div>
    <p class="muted">{{ scenario.desc }} · 共 {{ scenario.steps.length }} 步 · 点击步骤在真实页面间跳转</p>
    <ol class="scenario-steps">
      <li v-for="(step, index) in steps" :key="index">
        <RouterLink v-if="step.target" :to="step.target" class="step-link">{{ step.label }} <RightOutlined /></RouterLink>
        <span v-else class="missing">{{ step.label }}（示例数据缺失，不回退）</span>
        <small v-if="step.note">{{ step.note }}</small>
      </li>
    </ol>
    <p class="callout">场景只做页面跳转演示，不执行任何真实操作；数据为虚构示例，不代表真实环境状态。</p>
  </section>
</template>
<style scoped>
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.panel h2 { font-size: 18px; margin: 0 0 var(--console-space-4); }
.muted, .callout, .scenario-steps small { color: var(--console-text-muted); font-size: 12px; }
.scenario-bar { display: flex; flex-wrap: wrap; gap: var(--console-space-2); margin-bottom: var(--console-space-4); }
.scenario-bar button { padding: 4px 12px; border: 1px solid var(--console-border); border-radius: var(--console-radius); background: var(--console-surface); cursor: pointer; }
.scenario-bar button.scenario-active { background: var(--console-blue-soft); border-color: var(--console-blue); color: var(--console-blue); }
.scenario-steps { display: flex; flex-direction: column; gap: var(--console-space-2); margin: 0 0 var(--console-space-4); padding-left: var(--console-space-5); }
.scenario-steps li { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--console-space-3); }
.step-link { color: var(--console-blue); }
.missing { color: var(--console-text-muted); }
.callout { margin: 0; }
</style>
