import request from '@/utils/request'

// 查询合同列表（分页）
export function listContract(query) {
  return request({
    url: '/project/contract/list',
    method: 'get',
    params: query
  })
}

// 查询合同详细
export function getContract(id) {
  return request({
    url: '/project/contract/' + id,
    method: 'get'
  })
}

// 新增合同
export function addContract(data) {
  return request({
    url: '/project/contract',
    method: 'post',
    data: data
  })
}

// 修改合同
export function updateContract(data) {
  return request({
    url: '/project/contract',
    method: 'put',
    data: data
  })
}

// 删除合同
export function delContract(id) {
  return request({
    url: '/project/contract/' + id,
    method: 'delete'
  })
}

// 导出合同
export function exportContract(query) {
  return request({
    url: '/project/contract/export',
    method: 'post',
    params: query
  })
}

// 变更合同状态
export function changeContractStatus(id, status) {
  return request({
    url: '/project/contract/changeStatus/' + id + '/' + status,
    method: 'put'
  })
}

// 查��合同关联的项目列表
export function getContractProjects(id) {
  return request({
    url: '/project/contract/' + id + '/projects',
    method: 'get'
  })
}

// 统计各状态下的合同数量
export function getContractStatusCounts() {
  return request({
    url: '/project/contract/statusCounts',
    method: 'get'
  })
}

// 查询字段去重值（高级筛选下拉选项用）
export function getContractDistinctValues(field) {
  return request({
    url: '/project/contract/distinctValues',
    method: 'get',
    params: { field }
  })
}

// 查询合同列表可显隐列的元数据（显隐列面板 + 表格动态渲染用）
export function getContractColumns() {
  return request({
    url: '/project/contract/columns',
    method: 'get'
  })
}
