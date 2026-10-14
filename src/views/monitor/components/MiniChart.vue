<script setup lang="ts">
// 监控总览示例图表：纯 SVG 固定示例（折线 / 堆叠条 / 多行水位条），不引图表库。
// 遵循观测约定：固定示例非实时，接入前正式系统显示"无数据"；图中计数尽量来自 model 派生。
// 数据源来自 utils/monitor.js（JS 无类型），此处用宽松契约。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
defineProps<{ chart: any }>();
const W = 460, H = 150, PAD_X = 34, PAD_Y = 14;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const totalOf = (segments: any[]) => segments.reduce((sum, item) => sum + item.value, 0);
const linePath = (points: number[], max: number) => {
  const step = (W - PAD_X * 2) / (points.length - 1);
  return points.map((value, index) => `${index === 0 ? 'M' : 'L'}${PAD_X + index * step} ${H - PAD_Y - (value / max) * (H - PAD_Y * 2)}`).join(' ');
};
</script>
<template>
  <figure class="chart">
    <figcaption>
      <b>{{ chart.title }}</b>
      <small v-if="chart.type === 'stack'">{{ chart.total }}</small>
    </figcaption>
    <svg v-if="chart.type === 'trend'" :viewBox="`0 0 ${W} ${H + 18}`" role="img" :aria-label="chart.title">
      <line v-for="tick in [0, 0.5, 1]" :key="tick" :x1="PAD_X" :x2="W - PAD_X" :y1="H - PAD_Y - tick * (H - PAD_Y * 2)" :y2="H - PAD_Y - tick * (H - PAD_Y * 2)" stroke="#e6edf1" stroke-width="1" />
      <text v-for="(label, index) in chart.labels" :key="label" :x="PAD_X + (index * (W - PAD_X * 2)) / (chart.labels.length - 1)" :y="H + 12" text-anchor="middle" class="axis">{{ label }}</text>
      <text :x="PAD_X - 6" :y="H - PAD_Y + 3" text-anchor="end" class="axis">0</text>
      <text :x="PAD_X - 6" :y="PAD_Y + 4" text-anchor="end" class="axis">{{ chart.max }}{{ chart.unit }}</text>
      <path v-for="seriesItem in chart.series" :key="seriesItem.name" :d="linePath(seriesItem.points, chart.max)" fill="none" :stroke="seriesItem.color" stroke-width="2" />
    </svg>
    <div v-else-if="chart.type === 'stack'" class="stack">
      <div class="stack-bar" role="img" :aria-label="chart.title">
        <span v-for="segment in chart.segments" :key="segment.name" class="stack-seg" :style="{ width: (segment.value / totalOf(chart.segments)) * 100 + '%', background: segment.color }" />
      </div>
      <div class="legend">
        <span v-for="segment in chart.segments" :key="segment.name"><i :style="{ background: segment.color }" />{{ segment.name }} {{ segment.value }}</span>
      </div>
    </div>
    <div v-else class="bars">
      <div v-for="bar in chart.bars" :key="bar.label" class="bar-row">
        <small>{{ bar.label }}</small>
        <div class="bar-track">
          <span v-for="segment in bar.segments" :key="segment.name" class="stack-seg" :style="{ width: (segment.value / totalOf(bar.segments)) * 100 + '%', background: segment.color }" :title="`${segment.name} ${segment.value}`" />
        </div>
        <div class="legend">
          <span v-for="segment in bar.segments" :key="segment.name"><i :style="{ background: segment.color }" />{{ segment.name }} {{ segment.value }}</span>
        </div>
      </div>
    </div>
    <p class="note">{{ chart.note }}</p>
  </figure>
</template>
<style scoped>
.chart { min-width: 0; margin: 0; padding: var(--console-space-4); background: var(--console-bg); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
figcaption { display: flex; align-items: baseline; justify-content: space-between; gap: var(--console-space-3); margin-bottom: var(--console-space-3); }
figcaption b { font-size: 13px; }
figcaption small { color: var(--console-text-muted); font-size: 12px; }
svg { width: 100%; height: auto; }
.axis { fill: var(--console-text-muted); font-size: 10px; }
.stack-bar { display: flex; height: 14px; border-radius: 4px; overflow: hidden; }
.stack-seg { display: block; height: 100%; min-width: 2px; }
.legend { display: flex; flex-wrap: wrap; gap: var(--console-space-3); margin-top: var(--console-space-2); }
.legend span { display: inline-flex; align-items: center; gap: 4px; color: var(--console-text-muted); font-size: 12px; }
.legend i { width: 9px; height: 9px; border-radius: 2px; }
.bar-row { display: flex; flex-direction: column; gap: 4px; padding-block: var(--console-space-2); border-bottom: 1px dashed var(--console-border); }
.bar-row:last-child { border-bottom: 0; }
.bar-row small { color: var(--console-text-muted); font-size: 12px; }
.bar-track { display: flex; height: 12px; border-radius: 4px; overflow: hidden; }
.note { margin: var(--console-space-3) 0 0; color: var(--console-text-muted); font-size: 12px; line-height: 1.6; }
</style>
