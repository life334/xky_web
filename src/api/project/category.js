import request from '@/utils/request'

// 查询项目类别列表
export function listCategory(query) {
  return request({
    url: '/project/category/list',
    method: 'get',
    params: query
  })
}

// 查询项目类别下拉树结构
export function categoryTreeselect(query) {
  return request({
    url: '/project/category/treeselect',
    method: 'get',
    params: query
  })
}

// 查询项目类别下拉树结构（含单价等完整字段）
export function categoryTreeselectFull(query) {
  return request({
    url: '/project/category/treeselectFull',
    method: 'get',
    params: query
  })
}

// 查询项目类别详细
export function getCategory(id) {
  return request({
    url: '/project/category/' + id,
    method: 'get'
  })
}

// 新增项目类别
export function addCategory(data) {
  return request({
    url: '/project/category',
    method: 'post',
    data: data
  })
}

// 修改项目类别
export function updateCategory(data) {
  return request({
    url: '/project/category',
    method: 'put',
    data: data
  })
}

// 删除项目类别
export function delCategory(id) {
  return request({
    url: '/project/category/' + id,
    method: 'delete'
  })
}
