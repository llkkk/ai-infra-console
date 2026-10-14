<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ArrowLeftOutlined } from '@ant-design/icons-vue';
import { catalog } from '@/catalog.js';
import { planConfig } from '@/common/utils/objects.js';
import { DETAIL_PAGES, monitorDetail } from '@/common/utils/monitor.js';
import ObjectList from '@/common/components/ObjectList.vue';
import ObjectDetail from '@/common/components/ObjectDetail.vue';
import PlanModal from '@/common/components/PlanModal.vue';
import MonitorDashboard from './components/MonitorDashboard.vue';
import AlertCenter from './components/AlertCenter.vue';
import AlertDetail from './components/AlertDetail.vue';
import IncidentManagement from './components/IncidentManagement.vue';
import IncidentWorkbench from './components/IncidentWorkbench.vue';
import IncidentReview from './components/IncidentReview.vue';
type Cell = string | number;
interface ListSource { title: string; description: string; columns?: string[]; rows?: Cell[][]; detail?: string; action?: string | null }

// 列表页元数据：监控总览 / 告警中心 / 故障管理 / 通知渠道。详情页由 monitorDetail 精确解析。
const LIST_SOURCES: Record<string, ListSource> = { monitor: catalog.monitor, alerts: catalog.alerts, incidents: catalog.incidents, channels: catalog.channels };

const route = useRoute();
const pageId = computed(() => String(route.name));
const requestedId = computed(() => typeof route.query.id === 'string' ? route.query.id : '');
const isDetail = computed(() => DETAIL_PAGES.includes(pageId.value));
const detail = computed(() => isDetail.value ? monitorDetail(pageId.value, requestedId.value) : null);
const source = computed<ListSource | null>(() => LIST_SOURCES[pageId.value] ?? null);
const heading = computed(() => isDetail.value ? (detail.value?.title ?? '对象不存在') : (source.value?.title ?? ''));
const description = computed(() => isDetail.value ? '按当前对象展示事实与证据；所有记录均为固定示例，不代表真实联调结果。' : (source.value?.description ?? ''));

const selectedPlan = ref<{ action: string; context: Cell[] } | null>(null);
watch(() => route.fullPath, () => { selectedPlan.value = null; });
function openPlan(action: string, context: Cell[]) {
  if (planConfig(action)) selectedPlan.value = { action, context };
}
</script>
<template>
  <div class="monitor-page">
    <RouterLink v-if="isDetail && detail" :to="detail.back" class="back-link"><ArrowLeftOutlined /> 返回列表</RouterLink>
    <header class="page-heading">
      <div>
        <h1>{{ heading }}<small v-if="detail">{{ detail.id }}</small></h1>
        <p>{{ description }}</p>
      </div>
      <a-button v-if="!isDetail && source?.action" type="primary" @click="openPlan(source.action, [])">{{ planConfig(source.action)?.title }}</a-button>
      <a-button v-else-if="detail?.plan" type="primary" @click="openPlan(detail.plan.action, detail.plan.context)">{{ planConfig(detail.plan.action)?.title }}</a-button>
    </header>

    <a-alert v-if="detail?.example" class="example-notice" type="info" show-icon :message="`未指定对象，当前明确展示页面示例 ${detail.id}。`" />

    <a-result v-if="isDetail && !detail" status="404" title="未找到该示例对象" sub-title="不会自动回退到其他对象，检查地址中的 id。" />
    <MonitorDashboard v-else-if="pageId === 'monitor'" />
    <AlertCenter v-else-if="pageId === 'alerts'" @plan="openPlan" />
    <AlertDetail v-else-if="pageId === 'alert' && detail" :key="detail.id" :alert="detail.alert" :facts="detail.facts" @plan="openPlan" />
    <IncidentManagement v-else-if="pageId === 'incidents'" @plan="openPlan" />
    <IncidentWorkbench v-else-if="pageId === 'incident' && detail" :key="detail.id" :incident="detail.incident" @plan="openPlan" />
    <IncidentReview v-else-if="pageId === 'incident-review' && detail" :key="detail.id" :incident="detail.incident" @plan="openPlan" />
    <ObjectDetail v-else-if="(pageId === 'policy' || pageId === 'channel') && detail" :key="`${pageId}:${detail.id}`" :fields="detail.facts" :tabs="detail.tabs" />
    <ObjectList v-else-if="pageId === 'channels' && source" :key="pageId" :columns="source.columns ?? []" :rows="source.rows ?? []" :detail="source.detail ?? ''" />

    <PlanModal v-if="selectedPlan" :key="selectedPlan.action + selectedPlan.context.join('|')" :action="selectedPlan.action" :context="selectedPlan.context" @close="selectedPlan = null" />
  </div>
</template>
<style scoped>
.monitor-page { max-width: 1440px; margin-inline: auto; padding: var(--console-space-8); }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--console-space-6); margin-bottom: var(--console-space-6); }
h1 { margin: 0; font-size: 28px; }
h1 small { display: block; margin-top: var(--console-space-2); font-size: 14px; color: var(--console-text-muted); font-weight: 400; }
.page-heading p { color: var(--console-text-muted); margin-block: var(--console-space-2) 0; max-width: 760px; }
.back-link { display: inline-flex; align-items: center; gap: var(--console-space-2); color: var(--console-blue); margin-bottom: var(--console-space-6); }
.example-notice { margin-bottom: var(--console-space-6); }
@media (max-width: 600px) { .monitor-page { padding: var(--console-space-3); } .page-heading { flex-direction: column; } }
</style>
