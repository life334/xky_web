import request from '@/utils/request'

// 字段池（固定字段 + 动态字段，按组返回，供筛选设置/字段设计器使用）
export function getFieldPool() {
  return request({
    url: '/report/fieldPool',
    method: 'get'
  })
}

// ==================== 模板 ====================

// 查询模板列表（内置 + 自定义）
export function listReportTemplate(query) {
  return request({
    url: '/report/template/list',
    method: 'get',
    params: query
  })
}

// 模板详情（含字段清单）
export function getReportTemplate(id) {
  return request({
    url: '/report/template/' + id,
    method: 'get'
  })
}

// 保存模板（新建/修改，含字段清单）
export function saveReportTemplate(data) {
  return request({
    url: '/report/template',
    method: 'post',
    data: data
  })
}

// 删除模板
export function delReportTemplate(id) {
  return request({
    url: '/report/template/' + id,
    method: 'delete'
  })
}

// 从内置模板复制为自定义模板
export function copyReportTemplate(id, name) {
  return request({
    url: '/report/template/' + id + '/copy',
    method: 'post',
    data: { name: name }
  })
}

// ==================== 筛选方案 ====================

// 查询筛选方案列表
export function listReportFilter(query) {
  return request({
    url: '/report/filter/list',
    method: 'get',
    params: query
  })
}

// 筛选方案详情
export function getReportFilter(id) {
  return request({
    url: '/report/filter/' + id,
    method: 'get'
  })
}

// 保存筛选方案
export function saveReportFilter(data) {
  return request({
    url: '/report/filter',
    method: 'post',
    data: data
  })
}

// 删除筛选方案
export function delReportFilter(id) {
  return request({
    url: '/report/filter/' + id,
    method: 'delete'
  })
}

// ==================== 导出 ====================

// 导出前预览（命中行数 + 前 50 行已解析展示值，二维数组按模板字段顺序）
export function previewReport(data) {
  return request({
    url: '/report/preview',
    method: 'post',
    data: data
  })
}

// 导出报表（文件流 blob，文件名由后端 Content-Disposition 携带）
export function exportReport(data) {
  return request({
    url: '/report/export',
    method: 'post',
    data: data,
    responseType: 'blob',
    timeout: 120000
  })
}

// ==================== 导出历史 ====================

// 导出历史列表
export function listReportLog(query) {
  return request({
    url: '/report/log/list',
    method: 'get',
    params: query
  })
}

// 一键重导（文件流 blob）
export function reExportReport(id) {
  return request({
    url: '/report/log/' + id + '/reExport',
    method: 'post',
    responseType: 'blob',
    timeout: 120000
  })
}

// 删除导出历史
export function delReportLog(id) {
  return request({
    url: '/report/log/' + id,
    method: 'delete'
  })
}
