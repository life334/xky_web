import request from '@/utils/request'

// 查询合同单价列表（含全部分类树）
export function listContractPrice(contractId) {
  return request({
    url: '/project/contract/price/list',
    method: 'get',
    params: { contractId }
  })
}

// 批量保存合同单价
export function saveContractPrice(data) {
  return request({
    url: '/project/contract/price',
    method: 'put',
    data: data
  })
}
