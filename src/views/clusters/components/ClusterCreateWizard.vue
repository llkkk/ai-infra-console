<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { assetRecords, roomRecords } from '@/model.js';
import { WIZARD_STEPS, buildClusterLocalPlan, clusterWizardCandidates, clusterWizardTemplates, validateClusterWizard } from '@/common/utils/cluster-wizard.js';

const emit = defineEmits<{ close: [] }>();
const step = ref(0);
const roomId = ref('');
const name = ref('');
const template = ref('');
const selected = ref<string[]>([]);
const roles = ref<Record<string, string>>({});
const network = ref('network-storage-demo');
const storage = ref('network-storage-demo');
const gpu = ref('候选适配未实测');
const checks = ref<string[]>([]);
const plan = ref<ReturnType<typeof buildClusterLocalPlan>>(null);
const reconfirm = ref(false);
const templates = clusterWizardTemplates();
const acknowledgments = [
  { value: 'local', label: '我已查看本地门禁结果' },
  { value: 'environment', label: '我知道组件适配仍待真实环境验证' },
  { value: 'human', label: '我知道正式执行仍需授权与人工确认' }
];
const candidates = computed(() => clusterWizardCandidates({ roomId: roomId.value }));
const state = computed(() => ({ roomId: roomId.value, name: name.value, template: template.value, selected: selected.value, roles: roles.value, network: network.value, storage: storage.value, gpu: gpu.value }));
const validation = computed(() => validateClusterWizard(state.value));
const nodeErrors = computed(() => validation.value.errors.filter(error => /节点|控制面|工作节点/.test(error)));
const fieldErrors = computed(() => validation.value.errors.filter(error => /机房|名称|模板/.test(error)));
const localChecks = computed(() => [
  { title: '机房、名称与模板', errors: fieldErrors.value },
  { title: '节点资格、同机房与角色', errors: nodeErrors.value },
  { title: '网络 / 存储 / GPU 配置完整', errors: validation.value.errors.filter(error => /网络配置|存储配置|GPU 配置/.test(error)) }
]);
const canNext = computed(() => step.value === 0 ? fieldErrors.value.length === 0 : true);
const canGenerate = computed(() => validation.value.valid && acknowledgments.every(item => checks.value.includes(item.value)));
const planNodeSummary = computed(() => plan.value?.nodes.map(node => `${node.id}（${node.role === 'control-plane' ? '控制面' : '工作节点'}）`).join('、') ?? '');
watch([roomId, template], () => {
  if (selected.value.length) reconfirm.value = true;
  selected.value = [];
  roles.value = {};
});
watch(state, () => { plan.value = null; checks.value = []; }, { deep: true });
function toggle(asset: typeof candidates.value[number]) {
  if (!asset.selectable) return;
  if (selected.value.includes(asset.id)) {
    selected.value = selected.value.filter(id => id !== asset.id);
    delete roles.value[asset.id];
  } else {
    selected.value = [...selected.value, asset.id];
    roles.value[asset.id] = 'worker';
  }
}
function next() { if (canNext.value) step.value = Math.min(3, step.value + 1); }
function generate() { if (canGenerate.value) plan.value = buildClusterLocalPlan(state.value); }
</script>
<template>
  <a-modal :open="true" title="创建集群向导" :width="1000" :footer="null" @cancel="emit('close')">
    <a-alert type="info" show-icon message="仅生成本地计划，不保存、不更新业务数据，也不执行基础设施操作。" />
    <a-steps :current="step" class="steps" :items="WIZARD_STEPS.map(title => ({ title }))" size="small" />
    <div class="wizard-grid">
      <section class="form-pane">
        <template v-if="step === 0">
          <a-form layout="vertical">
            <a-form-item label="机房" required><a-select v-model:value="roomId" aria-label="选择机房" placeholder="选择机房" :options="roomRecords.map(room => ({ label: room.name, value: room.id }))" /></a-form-item>
            <a-form-item label="集群名称" required><a-input v-model:value="name" aria-label="集群名称" placeholder="例如 demo-cluster" /></a-form-item>
            <a-form-item label="集群模板" required><a-select v-model:value="template" aria-label="集群模板" placeholder="选择模板" :options="templates.map(value => ({ label: value, value }))" /></a-form-item>
          </a-form>
          <a-alert v-if="roomId && !candidates.some(item => item.selectable)" type="warning" show-icon message="当前机房没有空闲且已装机的可用节点" description="可继续查看候选节点和后续配置；节点门禁不满足时不能生成计划。" />
        </template>
        <template v-else-if="step === 1">
          <h3>选择节点并指定角色</h3>
          <p class="muted">只允许同机房、已装机、无归属、无进行中任务且健康可用的资产。不可选项保留原因供核对。</p>
          <a-alert v-if="reconfirm" type="warning" show-icon message="机房或模板已变化，已清除原节点选择，请重新确认。" />
          <a-list bordered class="node-list">
            <a-list-item v-for="asset in candidates" :key="asset.id" :class="{ disabled: !asset.selectable }">
              <div class="node-option">
                <a-checkbox :checked="selected.includes(asset.id)" :disabled="!asset.selectable" @change="toggle(asset)"><strong>{{ asset.id }}</strong></a-checkbox>
                <span class="muted">{{ asset.type }} · {{ asset.roomName }} · {{ asset.stageLabel }}</span>
                <span v-if="!asset.selectable" class="node-reason">{{ asset.reason }}</span>
                <a-select v-else-if="selected.includes(asset.id)" v-model:value="roles[asset.id]" :aria-label="`${asset.id} 节点角色`" size="small" class="role" :options="[{ label: '控制面', value: 'control-plane' }, { label: '工作节点', value: 'worker' }]" />
              </div>
            </a-list-item>
          </a-list>
          <a-alert v-if="nodeErrors.length" class="notice" type="warning" show-icon :message="nodeErrors.join('；')" description="可以继续查看配置和预检，最终生成计划仍受全部门禁约束。" />
          <p class="muted">单控制面仅作为 PoC 方案，不代表生产高可用。</p>
        </template>
        <template v-else-if="step === 2">
          <a-form layout="vertical">
            <a-form-item label="网络配置"><a-select v-model:value="network" aria-label="网络配置" :options="[{ label: 'network-storage-demo（候选适配未实测）', value: 'network-storage-demo' }]" /></a-form-item>
            <a-form-item label="存储配置"><a-select v-model:value="storage" aria-label="存储配置" :options="[{ label: 'network-storage-demo（候选适配未实测）', value: 'network-storage-demo' }]" /></a-form-item>
            <a-form-item label="GPU 配置"><a-select v-model:value="gpu" aria-label="GPU 配置" :options="[{ label: '候选适配未实测', value: '候选适配未实测' }, { label: '整卡（候选）', value: '整卡（候选）' }]" /></a-form-item>
          </a-form>
          <a-alert type="info" show-icon message="配置选择不代表组件已安装或兼容性已验证。" />
        </template>
        <template v-else>
          <h3>自动本地检查</h3>
          <a-list bordered class="check-list">
            <a-list-item v-for="check in localChecks" :key="check.title"><div><b>{{ check.title }}</b><p v-if="check.errors.length" class="node-reason">{{ check.errors.join('；') }}</p></div><a-tag :color="check.errors.length ? 'error' : 'success'">{{ check.errors.length ? '阻塞' : '通过' }}</a-tag></a-list-item>
          </a-list>
          <a-alert class="notice" type="warning" show-icon message="真实环境验证：待执行" description="Provider 版本、网络存储探针、GPU 容器访问与运行验收尚未执行；人工勾选不会将这些检查变为通过。" />
          <h3>人工知情确认</h3>
          <a-checkbox-group v-model:value="checks" class="checks"><a-checkbox v-for="item in acknowledgments" :key="item.value" :value="item.value">{{ item.label }}</a-checkbox></a-checkbox-group>
          <section v-if="plan" class="plan">
            <h3>本地计划 · 未执行</h3>
            <a-descriptions bordered size="small" :column="1"><a-descriptions-item label="集群">{{ plan.name }}</a-descriptions-item><a-descriptions-item label="节点">{{ planNodeSummary }}</a-descriptions-item><a-descriptions-item label="网络 / 存储 / GPU">{{ plan.network }} / {{ plan.storage }} / {{ plan.gpu }}</a-descriptions-item></a-descriptions>
          </section>
        </template>
      </section>
      <aside class="summary" aria-label="集群已选摘要">
        <h3>已选摘要</h3>
        <dl><dt>机房</dt><dd>{{ roomRecords.find(room => room.id === roomId)?.name || '未选择' }}</dd><dt>模板</dt><dd>{{ template || '未选择' }}</dd><dt>集群</dt><dd>{{ name || '未命名' }}</dd><dt>角色</dt><dd>控制面 {{ validation.counts.controlPlane }} · 工作节点 {{ validation.counts.worker }}</dd><dt>网络</dt><dd>{{ network }}</dd><dt>存储</dt><dd>{{ storage }}</dd><dt>GPU</dt><dd>{{ gpu }}</dd></dl>
        <a-divider /><b>已选节点（{{ selected.length }}）</b>
        <ul><li v-for="id in selected" :key="id">{{ id }} · {{ roles[id] === 'control-plane' ? '控制面' : '工作节点' }}</li><li v-if="!selected.length" class="muted">尚未选择</li></ul>
      </aside>
    </div>
    <div class="actions"><a-button @click="emit('close')">关闭</a-button><a-button :disabled="step === 0" @click="step = Math.max(0, step - 1)">上一步</a-button><a-button v-if="step < 3" type="primary" :disabled="!canNext" @click="next">下一步</a-button><a-button v-else type="primary" :disabled="!canGenerate" @click="generate">生成本地计划</a-button></div>
  </a-modal>
</template>
<style scoped>
.steps { margin: var(--console-space-6) 0; }
.wizard-grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: var(--console-space-6); }
.form-pane { min-width: 0; }
.summary { min-width: 0; border-left: 1px solid var(--console-border); padding-left: var(--console-space-4); }
.summary ul { padding-left: var(--console-space-4); }
.summary dl { margin: 0; }
.summary dt, .muted { color: var(--console-text-muted); }
.summary dd { margin: 0 0 var(--console-space-3); overflow-wrap: anywhere; }
.node-list { max-height: 340px; overflow: auto; }
.node-option { display: flex; flex-direction: column; gap: var(--console-space-2); min-width: 0; }
.node-reason { color: var(--console-text-muted); margin: 0; overflow-wrap: anywhere; }
.disabled { opacity: .8; }
.role { width: 140px; }
.notice, .plan { margin-top: var(--console-space-4); }
.checks { display: flex; flex-direction: column; gap: var(--console-space-3); }
.actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--console-space-3); margin-top: var(--console-space-6); }
@media (max-width: 700px) { .wizard-grid { grid-template-columns: 1fr; } .summary { border-left: 0; border-top: 1px solid var(--console-border); padding: var(--console-space-4) 0 0; } }
</style>
