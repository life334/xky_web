import request from '@/utils/request'

// 查询资料提交列表（分页）
export function listMaterial(query) {
  return request({
    url: '/project/material/list',
    method: 'get',
    params: query
  })
}

// 根据ID获取详细信息
export function getMaterial(id) {
  return request({
    url: '/project/material/' + id,
    method: 'get'
  })
}

// 新增资料提交
export function addMaterial(data) {
  return request({
    url: '/project/material',
    method: 'post',
    data: data
  })
}

// 修改资料提交
export function updateMaterial(data) {
  return request({
    url: '/project/material',
    method: 'put',
    data: data
  })
}

// 删除资料提交
export function delMaterial(ids) {
  return request({
    url: '/project/material/' + ids,
    method: 'delete'
  })
}
