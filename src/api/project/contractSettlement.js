import request from '@/utils/request'

// 查询合同结算列表（轻量）
// 只返回首屏必需数据：合同主数据 + 到账汇总 + 单价统计（条数/最低/最高）+ 关联项目编号；
// 单价明细与关联项目明细由前端按需懒加载（getPriceDetail / getContractProjects）
export function listContractSettlement(query) {
  return request({
    url: '/project/contractSettlement/list',
    method: 'get',
    params: query
  })
}

// 查询合同结算树形列表（旧实现，仅作回滚垫保留，前端已不再调用）
export function treeListContractSettlement() {
  return request({
    url: '/project/contractSettlement/treeList',
    method: 'get'
  })
}

// 查询指定合同的单价明细
export function getPriceDetail(contractId) {
  return request({
    url: '/project/contractSettlement/priceDetail/' + contractId,
    method: 'get'
  })
}

// 查询指定合同的到账明细（按项目聚合）
export function getReceivedDetail(contractId) {
  return request({
    url: '/project/contractSettlement/receivedDetail/' + contractId,
    method: 'get'
  })
}

// 保存合同结算
export function saveContractSettlement(data) {
  return request({
    url: '/project/contractSettlement',
    method: 'put',
    data: data
  })
}
