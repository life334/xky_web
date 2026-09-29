import request from '@/utils/request'

// ==================== 指令性任务（项目性质 / 委托单位规则） ====================
// 口径：委托单位命中规则关键词的项目，其外部产值(=应收账款)不计入应收 / 全量外部产值，
//       改道到「指令性任务」独立指标；内部产值照常计算。

// 规则列表
export function mandateRuleList(query) {
  return request({
    url: '/project/mandate/ruleList',
    method: 'get',
    params: query
  })
}

// 规则预览：启用中的关键词 + 命中项目数 + 其中已是指令性任务的数量 + 自动打标开关
export function mandatePreview() {
  return request({
    url: '/project/mandate/preview',
    method: 'get'
  })
}

// 新增规则
export function addMandateRule(data) {
  return request({
    url: '/project/mandate/rule',
    method: 'post',
    data: data
  })
}

// 修改规则
export function updateMandateRule(data) {
  return request({
    url: '/project/mandate/rule',
    method: 'put',
    data: data
  })
}

// 删除规则（支持逗号分隔 ids）
export function delMandateRule(ids) {
  return request({
    url: '/project/mandate/rule/' + ids,
    method: 'delete'
  })
}

// 一键回填：把命中规则、当前不是指令性任务的项目批量打标
export function applyMandateRule() {
  return request({
    url: '/project/mandate/apply',
    method: 'post'
  })
}

// 批量设置项目性质 { ids: [], nature: 'mandate' | 'normal' }
export function setProjectNature(data) {
  return request({
    url: '/project/mandate/nature',
    method: 'put',
    data: data
  })
}

// 自动打标开关 { enabled: true | false }
export function setMandateAutoMatch(enabled) {
  return request({
    url: '/project/mandate/autoMatch',
    method: 'put',
    data: { enabled }
  })
}
