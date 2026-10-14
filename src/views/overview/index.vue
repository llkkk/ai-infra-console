<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { RightOutlined } from '@ant-design/icons-vue';
import { catalog } from '@/catalog.js';
import { OBSERVATION_LAYERS, TREND_GRID_PATH, TREND_LINE_PATH, attentionItems, overviewMetrics } from '@/common/utils/overview.js';
import { useDemoStore } from '@/stores/demo';
import ChainMap from './components/ChainMap.vue';
import ScenarioPanel from './components/ScenarioPanel.vue';
const demo = useDemoStore();
const metrics = overviewMetrics();
const attention = attentionItems();
</script>
<template>
  <div class="overview-page">
    <header class="page-heading">
      <div>
        <span class="eyebrow">S1 / INFRASTRUCTURE</span>
        <h1>基础设施总览</h1>
        <p>{{ catalog.overview.description }}</p>
      </div>
    </header>

    <div class="stats" aria-label="分层监控摘要">
      <div v-for="metric in metrics" :key="metric.label"><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong><span>{{ metric.caption }}</span></div>
    </div>

    <ChainMap />

    <div class="detail-grid">
      <ScenarioPanel v-if="demo.enabled" />
      <section v-else class="panel" aria-label="演示入口提示">
        <h2>演示场景面板</h2>
        <p class="muted">演示入口由顶栏“演示”开关统一隔离（评审稿跨模块约定）；开启后此处显示六个演示场景，交付单页可使用模拟 S2 申请。</p>
      </section>

      <section class="panel" aria-label="监控趋势示例">
        <h2>基础设施容量趋势 / 固定示例</h2>
        <div class="chart-legend">过去 6 小时 · 非实时数据 · 不作为性能证据</div>
        <svg class="trend-chart" viewBox="0 0 600 170" role="img" aria-label="固定示例趋势图">
          <path :d="TREND_GRID_PATH" stroke="#e6edf1" fill="none" />
          <path :d="TREND_LINE_PATH" fill="none" stroke="#4d8aa0" stroke-width="3" />
        </svg>
        <div class="chart-axis"><span>04:00</span><span>07:00</span><span>10:00</span></div>
        <p class="callout">未接入监控时正式系统应显示“无数据”；这里的曲线仅展示产品布局。</p>
      </section>

      <section class="panel" aria-label="需关注对象">
        <h2>需关注对象 · 待处理交付单</h2>
        <div v-for="item in attention" :key="item.title" class="attention">
          <div><b>{{ item.title }}</b><small>{{ item.detail }}</small></div>
          <RouterLink class="text-link" :to="item.target">查看 <RightOutlined /></RouterLink>
        </div>
      </section>

      <section class="panel wide" aria-label="分层观测">
        <h2>分层观测</h2>
        <div class="layer-grid">
          <RouterLink v-for="layer in OBSERVATION_LAYERS" :key="layer.title" :to="layer.target" class="layer">
            <b>{{ layer.title }}</b><small>{{ layer.detail }}</small><RightOutlined />
          </RouterLink>
        </div>
        <p class="muted">虚拟机监控只是观测维度，不增加虚拟机供应模块；S2 API 成功率与 Token 指标不在本页。</p>
      </section>
    </div>
  </div>
</template>
<style scoped>
.overview-page { max-width: 1440px; margin-inline: auto; padding: var(--console-space-8); display: flex; flex-direction: column; gap: var(--console-space-6); }
.page-heading h1 { margin: var(--console-space-2) 0 0; font-size: 28px; }
.page-heading p { margin: var(--console-space-2) 0 0; color: var(--console-text-muted); max-width: 760px; }
.eyebrow { color: var(--console-blue); font-size: 12px; letter-spacing: .1em; }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--console-space-4); }
.stats > div, .panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.stats small { color: var(--console-text-muted); }
.stats strong { display: block; margin-block: var(--console-space-3); font-size: 28px; }
.stats span { color: var(--console-text-muted); font-size: 12px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--console-space-4); }
.panel.wide { grid-column: span 2; }
.panel h2 { font-size: 18px; margin: 0 0 var(--console-space-4); }
.muted, .callout, .chart-legend, .chart-axis { color: var(--console-text-muted); font-size: 12px; }
.callout { margin-top: var(--console-space-4); }
.trend-chart { width: 100%; height: auto; }
.chart-axis { display: flex; justify-content: space-between; }
.attention { display: flex; justify-content: space-between; align-items: center; gap: var(--console-space-3); padding-block: var(--console-space-3); border-bottom: 1px solid var(--console-border); }
.attention small { display: block; color: var(--console-text-muted); font-size: 12px; }
.text-link { color: var(--console-blue); white-space: nowrap; }
.layer-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--console-space-3); }
.layer { display: flex; flex-direction: column; gap: var(--console-space-2); padding: var(--console-space-4); background: var(--console-bg); border-radius: var(--console-radius); color: var(--console-text); }
.layer:hover { background: var(--console-blue-soft); }
.layer small { color: var(--console-text-muted); font-size: 12px; }
@media (max-width: 1100px) { .stats, .layer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 800px) { .detail-grid { grid-template-columns: minmax(0, 1fr); } .panel.wide { grid-column: auto; } }
@media (max-width: 600px) { .overview-page { padding: var(--console-space-3); } .stats, .layer-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
