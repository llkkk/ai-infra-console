<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { planConfig } from '@/common/utils/objects.js';
import { settingsPages, settingsList, settingsDetail, settingsDetailParents, PLATFORM_OPERATIONS } from '@/common/utils/settings.js';
import ObjectList from '@/common/components/ObjectList.vue';
import ObjectDetail from '@/common/components/ObjectDetail.vue';
import PlanModal from '@/common/components/PlanModal.vue';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons-vue';
type Cell = string | number;
interface List { title: string; description: string; columns: string[]; rows: Cell[][]; detail: string; action: string | null; }
interface Detail { id: string; parent: string; title: string; description: string; row: Cell[]; action: string | null; fields: Cell[][]; tabs: { key: string; title: string; rows: Cell[][] }[]; }
const route = useRoute();
const pageId = computed(() => String(route.name));
const isList = computed(() => settingsPages.includes(pageId.value));
const list = computed(() => (isList.value ? settingsList(pageId.value) : null) as List | null);
const detail = computed(() => (isList.value ? null : settingsDetail(pageId.value, typeof route.query.id === 'string' ? route.query.id : '')) as Detail | null);
const selectedPlan = ref<{ action: string; context: Cell[] } | null>(null);
const operationNotice = ref('');
const heading = computed(() => (isList.value ? list.value?.title : detail.value?.title) || '对象不存在');
const description = computed(() => (isList.value ? list.value?.description : detail.value ? '按当前对象展示事实与证据；所有记录均为固定示例，不代表真实联调结果。' : '地址中的对象不存在于本页示例数据中。'));
const isKnownDetail = computed(() => pageId.value in settingsDetailParents);
watch(() => route.fullPath, () => { selectedPlan.value = null; operationNotice.value = ''; });
function openPlan(action: string, context: Cell[]) { if (planConfig(action)) selectedPlan.value = { action, context }; }
</script>
<template>
  <div class="business-page">
    <RouterLink v-if="!isList && detail" :to="{ name: detail.parent }" class="back-link"><ArrowLeftOutlined /> 返回列表</RouterLink>
    <header class="page-heading"><div><h1>{{ heading }}<small v-if="detail">{{ detail.id }}</small></h1><p>{{ description }}</p></div>
      <a-button v-if="isList && list?.action" type="primary" @click="openPlan(list.action, [])"><PlusOutlined /> {{ planConfig(list.action)?.title }}</a-button>
      <a-button v-else-if="detail?.action" type="primary" @click="openPlan(detail.action, detail.row)">配置 / 操作计划</a-button>
    </header>
    <ObjectList v-if="isList && list" :key="pageId" :columns="list.columns" :rows="list.rows" :detail="list.detail" />
    <template v-else-if="isKnownDetail && detail">
      <a-alert v-if="!route.query.id" class="example-notice" type="info" show-icon :message="`未指定对象，当前明确展示页面示例 ${detail.id}。`" />
      <div class="detail-grid">
        <ObjectDetail :key="`${pageId}:${detail.id}`" :fields="detail.fields" :tabs="detail.tabs" />
        <section class="panel evidence-panel">
          <h2>{{ pageId === 'platform-service' ? '常用操作（演示）' : '关联对象与执行约定' }}</h2>
          <template v-if="pageId === 'platform-service'">
            <p class="callout">{{ detail.description }}</p>
            <div class="operation-buttons"><a-button v-for="operation in PLATFORM_OPERATIONS" :key="operation" @click="operationNotice = `演示：${operation}（示例），不执行真实 k8s 操作`">{{ operation }}</a-button></div>
            <a-alert v-if="operationNotice" class="operation-notice" type="info" show-icon :message="operationNotice" />
          </template>
          <template v-else>
            <p class="callout">{{ detail.description }}</p>
            <div class="related-links"><RouterLink :to="{ name: 'tasks' }">查看关联任务</RouterLink><RouterLink :to="{ name: 'audit-logs' }">查看审计记录</RouterLink></div>
          </template>
          <p class="muted">配置与实时状态分别呈现；权限不足、管理权不适用或失联时不允许直接变更。</p>
        </section>
      </div>
    </template>
    <a-result v-else status="404" title="未找到该示例对象" sub-title="不会自动回退到其他对象，检查地址中的 id。" />
    <PlanModal v-if="selectedPlan" :key="selectedPlan.action + selectedPlan.context.join('|')" :action="selectedPlan.action" :context="selectedPlan.context" @close="selectedPlan = null" />
  </div>
</template>
<style scoped>
.business-page { max-width: 1440px; margin-inline: auto; padding: var(--console-space-8); }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--console-space-6); margin-bottom: var(--console-space-6); }
h1 { margin: 0; font-size: 28px; }
h1 small { display: block; margin-top: var(--console-space-2); font-size: 14px; color: var(--console-text-muted); font-weight: 400; }
.page-heading p { color: var(--console-text-muted); margin-block: var(--console-space-2) 0; max-width: 760px; }
.back-link { display: inline-flex; align-items: center; gap: var(--console-space-2); color: var(--console-blue); margin-bottom: var(--console-space-6); }
.example-notice { margin-bottom: var(--console-space-6); }
.detail-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr); gap: var(--console-space-6); align-items: start; }
.evidence-panel { padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.evidence-panel h2 { margin: 0 0 var(--console-space-4); font-size: 18px; }
.callout { color: var(--console-text); }
.related-links { display: flex; flex-wrap: wrap; gap: var(--console-space-3); margin-block: var(--console-space-4); }
.related-links a { color: var(--console-blue); }
.operation-buttons { display: flex; flex-wrap: wrap; gap: var(--console-space-3); margin-block: var(--console-space-4); }
.operation-notice { margin-bottom: var(--console-space-4); }
.muted { color: var(--console-text-muted); }
@media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .business-page { padding: var(--console-space-3); } .page-heading { flex-direction: column; } }
</style>
