import request from '@/utils/request'

// 角标摘要（含自动弹出策略；查询前服务端会即时 sweep 自动完成/超期升级）
export function notifySummary() {
  return request({
    url: '/project/notify/summary',
    method: 'get'
  })
}

// 通知列表（分页）。type: todo | message | alert；onlyOpen: true=仅未完成/未读
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

// 忽略待办（必须带原因）
export function notifyIgnore(id, reason) {
  return request({
    url: '/project/notify/ignore/' + id,
    method: 'put',
    data: { reason }
  })
}
