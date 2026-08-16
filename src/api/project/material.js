import request from '@/utils/request'

// 查询资料提交列表（分页）
export function listMaterial(query) {
  return request({
    url: '/project/material/list',
    method: 'get',
    params: query
  })
}

// 根据ID获取详细信息
export function getMaterial(id) {
  return request({
    url: '/project/material/' + id,
    method: 'get'
  })
}

// 新增资料提交
export function addMaterial(data) {
  return request({
    url: '/project/material',
    method: 'post',
    data: data
  })
}

// 修改资料提交
export function updateMaterial(data) {
  return request({
    url: '/project/material',
    method: 'put',
    data: data
  })
}

// 删除资料提交
export function delMaterial(ids) {
  return request({
    url: '/project/material/' + ids,
    method: 'delete'
  })
}

// 领取资料
export function borrowMaterial(id, data) {
  return request({
    url: '/project/material/borrow/' + id,
    method: 'put',
    data: data
  })
}

// 归还资料
export function returnMaterial(id, data) {
  return request({
    url: '/project/material/return/' + id,
    method: 'put',
    data: data
  })
}

// 查询项目欠款信息（领取前检查）
export function checkPayment(projectId) {
  return request({
    url: '/project/material/payment-check/' + projectId,
    method: 'get'
  })
}

// 快捷切换归档状态
export function toggleArchive(id) {
  return request({
    url: '/project/material/toggle-archive/' + id,
    method: 'put'
  })
}

// 查询流转记录
export function getFlowList(id) {
  return request({
    url: '/project/material/flow/' + id,
    method: 'get'
  })
}

// 统计各状态下的资料数量
export function getMaterialStatusCounts() {
  return request({
    url: '/project/material/statusCounts',
    method: 'get'
  })
}

// 查询资料列表可显隐列的元数据（显隐列面板 + 表格动态渲染用）
export function getMaterialColumns() {
  return request({
    url: '/project/material/columns',
    method: 'get'
  })
}
