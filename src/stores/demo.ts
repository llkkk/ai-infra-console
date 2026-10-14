// 演示开关与模拟 S2 申请（评审稿 3.3.6 / 跨模块约定：演示入口统一开关隔离）。
// 演示单据只存在于本组件树进程内，不写回 model.js；真实实现应调 S1 管理层接口。
import { defineStore } from 'pinia';
import { demoOrderFromRequest, demoOrderRow, nextFlowState, ORDER_FLOW, SIM_FAILURES } from '@/common/utils/pools.js';
import { ORDER_STAGES } from '@/model.js';

const failureOf = (kind: string) => SIM_FAILURES.find(failure => failure.kind === kind) ?? null;

export const useDemoStore = defineStore('demo', {
  state: () => ({ enabled: false, orders: [] as Record<string, unknown>[], seq: 0 }),
  getters: {
    demoRows: state => state.orders.map(order => demoOrderRow(order)),
    demoOrders: state => state.orders
  },
  actions: {
    toggle() { this.enabled = !this.enabled; },
    submitRequest(payload: Record<string, string>) {
      this.seq += 1;
      const idempotencyKey = `idem-${this.seq}-${Date.now().toString(36)}`;
      const order = demoOrderFromRequest(payload, this.seq, idempotencyKey);
      this.orders.push(order);
      return order.id;
    },
    advance(id: string) {
      const order = this.orders.find(item => item.id === id);
      if (!order || order.final) return null;
      const next = nextFlowState(order as { stageIdx: number; sub: string });
      if (!next) return null;
      const label = ORDER_FLOW.find(step => step.stageIdx === next.stageIdx && step.sub === next.sub)?.label ?? '';
      Object.assign(order, next);
      // 推进时补充各阶段事实（演示口径，非真实执行）。
      if (next.stageIdx === 1 && !(order.reserve as Record<string, unknown>).alloc) {
        order.reserve = { alloc: `SIM-ALLOC-${this.seq}`, state: '已预留', until: '预留至 7 天后（演示）', bound: '分配时才绑定具体节点 / GPU' };
        order.check = { capacity: '通过（演示）', quota: '通过（演示）', note: '演示推进生成的校验结果' };
      }
      if (next.stageIdx === 2 && !order.delivery) {
        order.delivery = { env: `SIM-ENV-${this.seq}`, ns: `compute-lab / sim-${this.seq}`, state: '环境准备中', accept: '待验收' };
        (order.reserve as Record<string, unknown>).state = '已分配';
        (order.reserve as Record<string, unknown>).bound = '演示绑定节点（示例）';
      }
      if (next.sub === '待验收') order.delivery = { ...(order.delivery as Record<string, unknown>), state: '待验收' };
      if (next.sub === '已交付') order.delivery = { ...(order.delivery as Record<string, unknown>), state: '已交付', accept: '底座验收通过（演示）' };
      if (next.stageIdx === 3) order.run = { state: next.sub, received: '刚刚（演示）', workloads: ['sim-workload（演示）'] };
      if (next.final === '已释放') order.release = { state: '已释放（演示）', gate: '演示完成全流程；裸金属释放含擦除 / 重装 / 复检' };
      (order.timeline as unknown[][]).push(['刚刚（演示）', label, `推进到 ${ORDER_STAGES[next.stageIdx]} · ${next.sub}`]);
      return next;
    },
    fail(id: string, kind: string) {
      const order = this.orders.find(item => item.id === id);
      const failure = failureOf(kind);
      if (!order || !failure || order.final) return null;
      Object.assign(order, failure.to);
      (order.timeline as unknown[][]).push(['刚刚（演示）', `模拟失败：${kind}`, failure.note]);
      return failure;
    }
  }
});
