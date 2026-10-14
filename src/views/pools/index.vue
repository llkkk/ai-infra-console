<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { detailData, evidenceLinkFor, listData, poolDetailPages, poolListPages } from '@/common/utils/pools.js';
import { deliveryProgress } from '@/common/utils/delivery-progress.js';
import { planConfig } from '@/common/utils/objects.js';
import ObjectList from '@/common/components/ObjectList.vue';
import ObjectDetail from '@/common/components/ObjectDetail.vue';
import PlanModal from '@/common/components/PlanModal.vue';
import DeliveryOrderDetail from './components/DeliveryOrderDetail.vue';
import S2RequestSimulator from './components/S2RequestSimulator.vue';
import { useDemoStore } from '@/stores/demo';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons-vue';
type Cell = string | number;
interface PlanAction { label: string; action: string; context: Cell[] }
interface List { title: string; description: string; columns: string[]; rows: Cell[][]; detail: string; action: string | null; stateIndex: number }
interface Detail { id: string; parent: string; title: string; row: Cell[]; fields: Cell[][]; tabs: { key: string; title: string; rows: Cell[][] }[]; actions: PlanAction[] }
interface OrderDetail { id: string; parent: string; title?: string; kind: string; pool: string; project: string; stageIdx: number; sub: string; final: string | null; stageLabel: string; demo: boolean; request: Cell[][]; check: Cell[][]; reserve: Cell[][]; delivery: Cell[][]; run: Cell[][]; release: Cell[][]; timeline: unknown[][]; tasks: string[]; actions: PlanAction[]; progress: ReturnType<typeof deliveryProgress> }
const route = useRoute();
const demo = useDemoStore();
const pageId = computed(() => String(route.name));
const isList = computed(() => poolListPages.includes(pageId.value));
const list = computed(() => (isList.value ? listData(pageId.value, demo.demoRows) : null) as List | null);
const isOrderDetail = computed(() => pageId.value === 'delivery-order');
const orderDetail = computed(() => (isOrderDetail.value ? detailData('delivery-order', typeof route.query.id === 'string' ? route.query.id : '', demo.demoOrders) as unknown as OrderDetail | null : null));
const detail = computed(() => (!isList.value && !isOrderDetail.value && poolDetailPages.includes(pageId.value) ? detailData(pageId.value, typeof route.query.id === 'string' ? route.query.id : '', demo.demoOrders) : null) as Detail | null);
const selectedPlan = ref<{ action: string; context: Cell[] } | null>(null);
const sectionTitle = computed(() => (isList.value ? list.value?.title : (orderDetail.value ?? detail.value)?.title || '对象不存在'));
watch(() => route.fullPath, () => { selectedPlan.value = null; });
function openPlan(action: string, context: Cell[]) { if (planConfig(action)) selectedPlan.value = { action, context }; }
</script>
<template>
  <div class="business-page">
    <RouterLink v-if="!isList && (orderDetail || detail)" :to="{ name: (orderDetail ?? detail)!.parent }" class="back-link"><ArrowLeftOutlined /> 返回列表</RouterLink>
    <header class="page-heading">
      <div>
        <h1>{{ sectionTitle }}<small v-if="orderDetail || detail">{{ (orderDetail ?? detail)!.id }}</small></h1>
        <p>{{ isList ? list?.description : '按当前对象展示事实与证据；所有记录均为固定示例，不代表真实联调结果。' }}</p>
      </div>
      <a-space v-if="isList && list?.action" wrap>
        <a-button type="primary" @click="openPlan(list!.action!, [])"><PlusOutlined /> {{ planConfig(list!.action!)?.title }}</a-button>
      </a-space>
      <a-space v-else-if="detail" wrap>
        <a-button v-for="(item, index) in detail.actions" :key="item.label" :type="index === 0 ? 'primary' : 'default'" @click="openPlan(item.action, item.context)">{{ item.label }}</a-button>
      </a-space>
    </header>
    <template v-if="isList && list">
      <S2RequestSimulator v-if="pageId === 'deliveries' && demo.enabled" :key="pageId" />
      <a-alert v-else-if="pageId === 'deliveries'" class="example-notice" type="info" show-icon message="环境申请在真实场景由 S2 经接口提交；打开顶栏“演示”开关可使用模拟 S2 申请。" />
      <ObjectList :key="pageId" :columns="list.columns" :rows="list.rows" :detail="list.detail" :state-index="list.stateIndex" />
    </template>
    <DeliveryOrderDetail v-else-if="isOrderDetail && orderDetail" :key="orderDetail.id" :detail="orderDetail" @plan="openPlan" />
    <template v-else-if="detail">
      <a-alert v-if="!route.query.id" class="example-notice" type="info" show-icon :message="`未指定对象，当前明确展示页面示例 ${detail.id}。`" />
      <ObjectDetail :key="`${pageId}:${detail.id}`" :fields="detail.fields" :tabs="detail.tabs" :evidence-link="evidenceLinkFor" />
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
@media (max-width: 600px) { .business-page { padding: var(--console-space-3); } .page-heading { flex-direction: column; } }
</style>
