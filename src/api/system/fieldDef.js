import request from '@/utils/request'

// 查询动态字段定义列表
export function listFieldDef(query) {
  return request({
    url: '/system/fieldDef/list',
    method: 'get',
    params: query
  })
}

// 查询动态字段定义详细
export function getFieldDef(id) {
  return request({
    url: '/system/fieldDef/' + id,
    method: 'get'
  })
}

// 新增动态字段定义
export function addFieldDef(data) {
  return request({
    url: '/system/fieldDef',
    method: 'post',
    data: data
  })
}

// 修改动态字段定义
export function updateFieldDef(data) {
  return request({
    url: '/system/fieldDef',
    method: 'put',
    data: data
  })
}

// 删除动态字段定义
export function delFieldDef(ids) {
  return request({
    url: '/system/fieldDef/' + ids,
    method: 'delete'
  })
}

// 根据表名查询已启用字段
export function getFieldDefsByTable(tableName) {
  return request({
    url: '/system/fieldDef/byTable/' + tableName,
    method: 'get'
  })
}
