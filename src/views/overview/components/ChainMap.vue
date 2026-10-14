<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { RightOutlined } from '@ant-design/icons-vue';
import { CHAIN, CHAIN_TONE } from '@/common/utils/overview.js';
const tones = CHAIN_TONE as Record<string, string>;
const lines = [CHAIN.supply, CHAIN.delivery, CHAIN.baremetal];
</script>
<template>
  <section class="panel chain-map" aria-label="交付链路地图">
    <h2>交付链路地图 · 模块怎么串起来</h2>
    <p class="muted">供应线把机器变成可用算力，交付线把算力变成可交付环境，裸金属支线走整机租赁（不入 K8s 集群）；横切模块覆盖全链。链路只列主要流转，不是全部页面。</p>
    <div v-for="line in lines" :key="line.label" class="chain-group">
      <small>{{ line.label }}</small>
      <div class="chain-line">
        <template v-for="(node, index) in line.nodes" :key="node[1]">
          <RouterLink :to="{ name: node[1] }" class="chain-node" :class="tones[node[2]]"><span>{{ node[0] }}</span><small>{{ node[2] }}</small></RouterLink>
          <RightOutlined v-if="index < line.nodes.length - 1" class="chain-arrow" />
        </template>
      </div>
    </div>
    <div class="chain-group">
      <small>{{ CHAIN.cross.label }}</small>
      <div class="chain-line chain-cross">
        <RouterLink v-for="node in CHAIN.cross.nodes" :key="node[1]" :to="{ name: node[1] }" class="chain-node"><span>{{ node[0] }}</span><small>{{ node[2] }}</small></RouterLink>
      </div>
    </div>
    <p class="callout">节点颜色对应所属模块。</p>
  </section>
</template>
<style scoped>
.panel { min-width: 0; padding: var(--console-space-6); background: var(--console-surface); border: 1px solid var(--console-border); border-radius: var(--console-radius); }
.panel h2 { font-size: 18px; margin: 0 0 var(--console-space-4); }
.muted, .callout { color: var(--console-text-muted); font-size: 12px; }
.chain-group { margin-block: var(--console-space-4); }
.chain-group > small { display: block; color: var(--console-blue); margin-bottom: var(--console-space-2); }
.chain-line { display: flex; flex-wrap: wrap; align-items: center; gap: var(--console-space-2); }
.chain-cross { gap: var(--console-space-3); }
.chain-node { display: flex; flex-direction: column; gap: 2px; min-width: 130px; padding: var(--console-space-3); background: var(--console-bg); border: 1px solid var(--console-border); border-left: 3px solid var(--console-border); border-radius: var(--console-radius); color: var(--console-text); }
.chain-node:hover { background: var(--console-blue-soft); }
.chain-node small { color: var(--console-text-muted); font-size: 11px; }
.chain-node.assets { border-left-color: var(--console-blue); }
.chain-node.clusters { border-left-color: #2f855a; }
.chain-node.pools { border-left-color: #b7791f; }
.chain-arrow { color: var(--console-text-muted); }
.callout { margin-top: var(--console-space-4); }
</style>
