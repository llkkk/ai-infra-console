// 表单行为逻辑：显式字段绑定、条件化必选确认项与预检阻塞。
// 保持纯函数，便于 node:test 行为验证（R01 / R04 / 权限不足场景）。

// 判断条件是否命中：when = [字段名, 值或值数组]
export function matchesWhen(when,values){
 if(!when)return true;
 const [field,expected]=when;
 const actual=values[field];
 if(Array.isArray(expected))return expected.includes(actual);
 return actual===expected;
}

// 依据 bind 配置把上下文行显式绑定到表单字段；不再按标签名或列位置猜测。
export function prefillValues(config,context){
 const values=Object.fromEntries(config.fields.map(([k,v])=>[k,Array.isArray(v)?v[0]:v]));
 if(context&&config.bind){
  for(const [field,idx] of Object.entries(config.bind)){
   const cell=context[Number(idx)];
   if(cell!==undefined&&cell!==null&&cell!=='')values[field]=String(cell);
  }
 }
 return values;
}

// 必选确认项 = 基础 checks + 命中条件的 conditionalChecks（R04：确认/转交不要求破坏性授权）。
export function requiredChecks(config,values){
 const base=config.checks||[];
 const extra=(config.conditionalChecks||[]).filter(c=>matchesWhen(c.when,values)).map(c=>c.check);
 return [...base,...extra];
}

// 预检阻塞：命中即不可提交（未知状态、无数据、授权范围外等），并给出原因。
export function findBlocker(config,values){
 for(const b of config.blockers||[]){
  if(matchesWhen(b.when,values))return b.reason;
 }
 return null;
}

// 校验表单配置自身一致性：bind / 条件字段必须存在于 fields，条件值必须来自候选项。
export function validateFormConfig(config,name){
 const errors=[];
 const labels=config.fields.map(([k])=>k);
 const optionsOf=Object.fromEntries(config.fields.map(([k,v])=>[k,Array.isArray(v)?v:null]));
 for(const field of Object.keys(config.bind||{})){
  if(!labels.includes(field))errors.push(name+' bind 字段不存在：'+field);
 }
 for(const c of config.conditionalChecks||[]){
  const [field,vals]=c.when||[];
  if(!labels.includes(field))errors.push(name+' conditionalChecks 字段不存在：'+field);
  const opts=optionsOf[field];
  if(opts&&Array.isArray(vals))for(const v of vals)if(!opts.includes(v))errors.push(name+' 条件值不在候选项：'+field+'='+v);
 }
 for(const b of config.blockers||[]){
  const [field,vals]=b.when||[];
  if(!labels.includes(field))errors.push(name+' blockers 字段不存在：'+field);
  const opts=optionsOf[field];
  if(opts&&Array.isArray(vals))for(const v of vals)if(!opts.includes(v))errors.push(name+' 阻塞值不在候选项：'+field+'='+v);
 }
 return errors;
}
