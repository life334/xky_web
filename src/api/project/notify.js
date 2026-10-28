import request from '@/utils/request'

// 角标摘要（含自动弹出策略；查询前服务端会即时 sweep 自动完成/超期升级）
export function notifySummary() {
  return request({
    url: '/project/notify/summary',
    method: 'get'
  })
}

// 通知列表（分页）。type: todo | message
// status: open=未完成(默认) | done=已完成 | ignored=已忽略 | closed=已被他人认领关闭 | all=全部
export function notifyList(params) {
  return request({
    url: '/project/notify/list',
    method: 'get',
    params: params
  })
}

// 自动弹出增量（afterId=本地水位线）
export function notifyIncrement(afterId) {
  return request({
    url: '/project/notify/increment',
    method: 'get',
    params: { afterId }
  })
}

// 单条已读
export function notifyRead(id) {
  return request({
    url: '/project/notify/read/' + id,
    method: 'put'
  })
}

// 全部已读（type 可选：todo/message）
export function notifyReadAll(type) {
  return request({
    url: '/project/notify/readAll',
    method: 'put',
    params: type ? { type } : {}
  })
}

// 忽略待办/预警（一键忽略，不要求填写原因）
export function notifyIgnore(id) {
  return request({
    url: '/project/notify/ignore/' + id,
    method: 'put'
  })
}

/**
 * 批量忽略。三选一：
 * - { ids: [1,2,3] }                     勾选若干条
 * - { bizType: 'alert_overdue', notifyType: 'alert' }   整类忽略某条预警规则
 * - { all: true, notifyType: 'alert' }   忽略该页签下全部未完成项
 */
export function notifyIgnoreBatch(data) {
  return request({
    url: '/project/notify/ignoreBatch',
    method: 'put',
    data: data
  })
}

// 未处理预警按规则分组计数（「忽略此规则」入口数据源）
export function notifyAlertGroups() {
  return request({
    url: '/project/notify/alertGroups',
    method: 'get'
  })
}

// 撤销忽略（回到未完成）
export function notifyUnignore(id) {
  return request({
    url: '/project/notify/unignore/' + id,
    method: 'put'
  })
}

// 登录首屏「今日待处理摘要」：当前全部未完成待办 + 未处理预警（不含消息）
// 与 notifyIncrement 的区别：不按水位线取增量，而是取全量未完成项
export function notifyOpen() {
  return request({
    url: '/project/notify/open',
    method: 'get'
  })
}
