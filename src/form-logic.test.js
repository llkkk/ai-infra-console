import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,forms} from './catalog.js';
import {prefillValues,requiredChecks,findBlocker,validateFormConfig} from './form-logic.js';

const auditRowApi=['Kubernetes API','management-demo / 业务集群','Rancher / S4 映射','API Audit 策略待定义','审计日志引用','待验证'];
const auditRowWebshell=['WebShell / 主机命令','compute-01 等资产','平台授权引用（S4 IAM / RBAC）','会话与命令全量审计（平台自建）','会话记录 / 命令审计','示例可申请'];

test('R01: access 表单覆盖四个通道且支持显式绑定',()=>{
 const channels=forms.access.fields.find(([k])=>k==='通道')[1];
 for(const c of ['WebShell / 主机命令','带外 KVM','Kubernetes API','Pod exec'])assert.ok(channels.includes(c),'缺少通道 '+c);
 const v=prefillValues(forms.access,auditRowApi);
 assert.equal(v['通道'],'Kubernetes API');
 assert.equal(v['目标范围'],'management-demo / 业务集群');
 const v2=prefillValues(forms.access,auditRowWebshell);
 assert.equal(v2['通道'],'WebShell / 主机命令');
});

test('R01: Kubernetes API 通道不套用终端会话语义',()=>{
 const v=prefillValues(forms.access,auditRowApi);
 const apiChecks=requiredChecks(forms.access,v);
 assert.ok(apiChecks.some(c=>c.includes('不创建终端会话')),'API 通道必须声明不创建终端会话');
 assert.ok(!apiChecks.some(c=>c.includes('WebShell')),'API 通道不应要求 WebShell 终端授权');
 const webshellChecks=requiredChecks(forms.access,prefillValues(forms.access,auditRowWebshell));
 assert.ok(webshellChecks.some(c=>c.includes('WebShell')));
 assert.ok(!webshellChecks.some(c=>c.includes('不创建终端会话')));
});

test('R04: 确认/转交不要求破坏性授权，破坏性恢复动作必须单独确认',()=>{
 const base={故障单:'INC-DEMO-01',动作:'确认故障',责任方:'S1 底座',恢复动作:'无（仅确认 / 记录类动作）',处理说明:''};
 assert.ok(!requiredChecks(forms['incident-action'],base).some(c=>c.includes('破坏性')),'确认类动作不应要求破坏性授权');
 const destructive={...base,动作:'记录恢复动作',恢复动作:'GPU 复位（破坏性）'};
 assert.ok(requiredChecks(forms['incident-action'],destructive).some(c=>c.includes('破坏性')),'破坏性恢复动作必须单独确认');
});

test('未知与权限不足：reserve-01 资产操作与 Unknown 节点维护被阻塞',()=>{
 assert.ok(findBlocker(forms['asset-actions'],{操作:'电源变更',目标资产:'reserve-01',变更原因:'测试'}),'reserve-01 电源动作应被阻塞');
 assert.equal(findBlocker(forms['asset-actions'],{操作:'硬件检查',目标资产:'compute-01',变更原因:'测试'}),null,'compute-01 不应被阻塞');
 assert.ok(findBlocker(forms.maintenance,{目标:'cpu-worker-01',动作:'排空',数据处置:'保留持久化数据',维护原因:'检查'}),'Unknown 节点维护应被阻塞');
 assert.equal(findBlocker(forms.maintenance,{目标:'compute-01',动作:'排空',数据处置:'保留持久化数据',维护原因:'检查'}),null);
});

test('R05: incident-action 警示语按影响范围表述，不再统一要求双方确认',()=>{
 assert.ok(forms['incident-action'].warning.includes('按影响范围'));
 assert.ok(!forms['incident-action'].warning.includes('需 S1 与 S2 共同确认后才可关闭'));
});

test('表单配置自洽：bind / 条件字段存在且条件值来自候选项',()=>{
 for(const [name,config] of Object.entries(forms)){
  assert.deepEqual(validateFormConfig(config,name),[],name+' 配置不一致');
 }
});

test('上下文绑定的表单：目标随所选对象变化',()=>{
 const allocRow=catalog.allocations.rows[1];
 const v=prefillValues(forms.release,allocRow);
 assert.equal(v['分配单'],'ALLOC-DEMO-02');
 const provRow=catalog.provisioning.rows[0];
 const v2=prefillValues(forms.provision,provRow);
 assert.equal(v2['资产'],'compute-04');
});
