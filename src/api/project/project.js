import request from '@/utils/request'

// 查询项目列表（分页）
export function listProject(query) {
  return request({
    url: '/project/project/list',
    method: 'get',
    params: query
  })
}

// 查询项目详细
export function getProject(id) {
  return request({
    url: '/project/project/' + id,
    method: 'get'
  })
}

// 新增项目
export function addProject(data) {
  return request({
    url: '/project/project',
    method: 'post',
    data: data
  })
}

// 修改项目
export function updateProject(data) {
  return request({
    url: '/project/project',
    method: 'put',
    data: data
  })
}

// 删除项目
export function delProject(id) {
  return request({
    url: '/project/project/' + id,
    method: 'delete'
  })
}

// 导出项目
export function exportProject(query) {
  return request({
    url: '/project/project/export',
    method: 'post',
    params: query
  })
}

// 办结项目
export function completeProject(id) {
  return request({
    url: '/project/project/complete/' + id,
    method: 'put'
  })
}

// 变更项目状态
export function changeProjectStatus(id, status) {
  return request({
    url: '/project/project/changeStatus/' + id + '/' + status,
    method: 'put'
  })
}

// 批量新增项目（区域粘贴）
export function batchAddProject(data) {
  return request({
    url: '/project/project/batchAdd',
    method: 'post',
    data: data
  })
}

// 统计各状态下的项目数量
export function getProjectStatusCounts() {
  return request({
    url: '/project/project/statusCounts',
    method: 'get'
  })
}

// 查询字段去重值列表（高级筛选下拉选项）
export function getDistinctValues(field) {
  return request({
    url: '/project/project/distinctValues',
    method: 'get',
    params: { field }
  })
}

// 查询项目列表可显隐列的元数据（显隐列面板 + 表格动态渲染）
export function getProjectColumns() {
  return request({
    url: '/project/project/columns',
    method: 'get'
  })
}

// 查询关联定线候选项目
export function getRelatedCandidates(engineeringProject) {
  return request({
    url: '/project/project/relatedCandidates',
    method: 'get',
    params: { engineeringProject }
  })
}
