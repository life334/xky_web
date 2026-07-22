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

// 保存费用结算
export function saveSettlement(data) {
  return request({
    url: '/project/settlement',
    method: 'put',
    data: data
  })
}
