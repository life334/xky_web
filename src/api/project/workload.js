import request from '@/utils/request'

// 查询工作量列表
export function listWorkload(query) {
  return request({
    url: '/project/workload/list',
    method: 'get',
    params: query
  })
}

// 查询工作量详情
export function getWorkload(id) {
  return request({
    url: '/project/workload/' + id,
    method: 'get'
  })
}

// 新增工作量
export function addWorkload(data) {
  return request({
    url: '/project/workload',
    method: 'post',
    data: data
  })
}

// 修改工作量
export function updateWorkload(data) {
  return request({
    url: '/project/workload',
    method: 'put',
    data: data
  })
}

// 删除工作量
export function delWorkload(ids) {
  return request({
    url: '/project/workload/' + ids,
    method: 'delete'
  })
}

// 导出工作量
export function exportWorkload(query) {
  return request({
    url: '/project/workload/export',
    method: 'post',
    params: query
  })
}
