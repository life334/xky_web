import request from '@/utils/request'

// 查询合同结算树形列表
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

// 保存合同结算
export function saveContractSettlement(data) {
  return request({
    url: '/project/contractSettlement',
    method: 'put',
    data: data
  })
}
