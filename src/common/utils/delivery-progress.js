import { ORDER_STAGES } from '../../model.js';

// 终态表示结果，不代表后续阶段已经执行。阶段始终取自该单据的记录。
export function deliveryProgress(order) {
  const current = order.stageIdx;
  const released = order.final === '已释放';
  const rejected = order.final === '已拒绝';
  const stopped = Boolean(order.final) && !released;
  const acceptanceFailed = /失败/.test(order.sub) || /失败/.test(order.delivery?.accept ?? '');
  const checkBlocked = /失败|不足|未配置/.test(`${order.check.capacity} ${order.check.quota}`);
  const releaseBlocked = /不通过|不满足|未停止|待核实|尚未/.test(order.release.gate);
  const waitingReceipt = Boolean(order.delivery) && order.delivery.state === '已交付' && !order.run.received;
  const failureEvent = order.timeline.findLast(event => /模拟失败/.test(event[1]));
  const stages = ORDER_STAGES.map((title, index) => ({
    title,
    status: released || index < current ? 'finish' : index > current ? 'wait'
      : rejected || acceptanceFailed ? 'error' : stopped ? 'wait' : 'process'
  }));
  let tone = 'info';
  let reason = order.sub;
  let owner = 'S1 资源管理员';
  let next = '查看当前执行结果；任务未完成前不重复提交。';
  if (released) {
    tone = 'success';
    reason = order.release.gate;
    owner = '无需继续处理';
    next = '查看释放与回收证据；历史单据只读。';
  } else if (rejected) {
    tone = 'error';
    reason = failureEvent?.[2] ?? order.check.note;
    owner = '申请方 / 资源管理员';
    next = '由申请方调整需求，资源管理员核对容量和配额后，再从原申请系统重新申请；本单不继续推进。';
  } else if (stopped) {
    tone = 'warning';
    reason = `${order.final}；流程停留在${ORDER_STAGES[current]}阶段，后续阶段未执行。`;
    owner = '申请方 / 资源管理员';
    next = '核对预留、分配和已产生的外部资源；不把终止申请视为资源已自动回收。';
  } else if (acceptanceFailed) {
    tone = 'error';
    reason = failureEvent?.[2] ?? (/失败/.test(order.delivery?.accept ?? '') ? order.delivery.accept : order.sub);
    owner = 'S1 环境验收人员';
    next = '查看失败检查项和关联任务，核对外部执行状态，再决定重试或回滚。';
  } else if (current === 0 && checkBlocked) {
    tone = 'warning';
    reason = order.check.note;
    owner = '申请方 / 配额审批方';
    next = '先完成容量或配额问题处理，再重新校验；当前不创建预留。';
  } else if (current >= 2 && releaseBlocked && !waitingReceipt) {
    tone = 'warning';
    reason = order.release.gate;
    owner = order.kind === '裸金属池' ? '租赁方 / S1 运维人员' : 'S1 资源管理员 / S2';
    next = '先核对占用、工作负载和数据处置，阻塞解除前不生成释放计划。';
  } else if (waitingReceipt) {
    tone = 'warning';
    reason = `${order.delivery.accept}；${order.run.state}。底座就绪不等于模型就绪。`;
    owner = order.kind === '裸金属池' ? '租户' : 'S2 接收方';
    next = '由接收方核对交付结果并从原系统确认接收；S1 不代替 S2 确认模型就绪。';
  } else if (current === 1 || (current === 2 && order.sub !== '已交付')) {
    reason = order.delivery?.accept ?? order.sub;
    owner = 'S1 环境准备 / 验收人员';
    next = '查看预留有效期和底座检查结果；验收通过后才能交付，交付后仍需接收方确认。';
  } else if (current === 3) {
    tone = 'success';
    reason = order.run.state;
    owner = order.kind === '裸金属池' ? '租户 / S1 运行保障' : 'S2 运行方 / S1 底座保障';
    next = order.kind === '裸金属池' ? '按租期与数据处置约定申请释放；整机回收必须包含擦除、重装与复检。' : '查看运行状态；需要释放时先停止工作负载并确认数据处置。';
  } else if (current === 4) {
    reason = order.release.gate;
    owner = 'S1 回收人员 / 申请方';
    next = '查看回收任务与证据；释放申请不代表资源已经回池。';
  }
  const sectionStates = [true,
    current >= 1 || Boolean(order.reserve.alloc),
    current >= 2 || Boolean(order.delivery),
    current >= 3 || Boolean(order.run.received),
    current >= 4 || order.release.state !== '未进入'];
  const sections = ['申请与校验', '预留与分配明细', '交付环境结果', '运行与接收', '释放与回收'].map((title, index) => ({
    key: String(index), title, entered: sectionStates[index],
    caption: sectionStates[index] ? '查看记录' : '未进入'
  }));
  const openSections = [String(current)];
  if (waitingReceipt && !openSections.includes('2')) openSections.push('2');
  if (current === 1 && order.delivery) openSections.push('2');
  const actionBlocker = stopped || released ? '终态单据只读'
    : acceptanceFailed ? '验收失败需先核对任务并确定重试或回滚方案'
    : waitingReceipt ? '等待接收方确认，不满足释放前置'
    : releaseBlocked && current >= 2 ? order.release.gate
    : order.kind === '裸金属池' && current >= 2 ? '整机回收需独立确认，不能使用共享项目释放计划'
    : '';
  return { current, stages, tone, reason, owner, next, sections, openSections, actionBlocker };
}
