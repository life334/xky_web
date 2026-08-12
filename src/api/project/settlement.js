import request from '@/utils/request'

// 查询费用结算树形列表（仅已办结项目）
export function treeListSettlement(query) {
  return request({
    url: '/project/settlement/treeList',
    method: 'get',
    params: query
  })
}

// 查询项目结算详情
export function getSettlementDetail(projectId) {
  return request({
    url: '/project/settlement/' + projectId,
    method: 'get'
  })
}

// 查询项目产值结算总览（产值 + 收款 + 结算状态，供详情页产值结算tab使用）
export function getSettlementOverview(projectId) {
  return request({
    url: '/project/settlement/overview/' + projectId,
    method: 'get'
  })
}

// 保存费用结算
export function saveSettlement(data) {
  return request({
    url: '/project/settlement',
    method: 'put',
    data: data
  })
}

// 查询费用结算可显隐列的元数据（显隐列面板 + 表格动态渲染用）
export function getSettlementColumns() {
  return request({
    url: '/project/settlement/columns',
    method: 'get'
  })
}
