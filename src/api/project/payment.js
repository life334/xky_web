import request from '@/utils/request'

// 查询付款记录列表（分页）
export function listPayment(query) {
  return request({
    url: '/project/payment/list',
    method: 'get',
    params: query
  })
}

// 根据ID获取详细信息
export function getPayment(id) {
  return request({
    url: '/project/payment/' + id,
    method: 'get'
  })
}

// 新增付款记录
export function addPayment(data) {
  return request({
    url: '/project/payment',
    method: 'post',
    data: data
  })
}

// 修改付款记录
export function updatePayment(data) {
  return request({
    url: '/project/payment',
    method: 'put',
    data: data
  })
}

// 删除付款记录
export function delPayment(ids) {
  return request({
    url: '/project/payment/' + ids,
    method: 'delete'
  })
}

// 项目收款总览列表（聚合查询）
export function paymentOverviewList(query) {
  return request({
    url: '/project/payment/overview',
    method: 'get',
    params: query
  })
}

// 项目收款总览统计（KPI）
export function paymentOverviewStats() {
  return request({
    url: '/project/payment/overview/stats',
    method: 'get'
  })
}
