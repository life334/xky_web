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

// 产值统计（合计 + 分组明细；产值按项目办结时间归属）
export function workloadOutputSummary(query) {
  return request({
    url: '/project/workload/outputSummary',
    method: 'get',
    params: query
  })
}

// 产值明细（下钻，分页，与产值统计同一口径与筛选）
export function workloadOutputDetail(query) {
  return request({
    url: '/project/workload/outputDetail',
    method: 'get',
    params: query
  })
}
