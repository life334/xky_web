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

// 保存模板默认筛选条件（default_filter JSONB）
export function saveTemplateDefaultFilter(id, data) {
  return request({
    url: '/report/template/' + id + '/defaultFilter',
    method: 'put',
    data: data
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

// 重命名筛选方案（仅创建者可重命名）
export function renameReportFilter(id, filterName) {
  return request({
    url: '/report/filter/' + id + '/rename',
    method: 'put',
    data: { filterName: filterName }
  })
}

// ==================== 导出 ====================

// 导出前预览（命中行数 + 前 50 行已解析展示值，二维数组按模板字段顺序）
// 预览为幂等只读查询：筛选操作会频繁触发，跳过全局防重复提交拦截（repeatSubmit: false）
export function previewReport(data) {
  return request({
    url: '/report/preview',
    method: 'post',
    data: data,
    headers: { repeatSubmit: false }
  })
}

// 导出报表（文件流 blob；拦截器返回整个响应对象，文件名从 res.headers['content-disposition'] 解析）
// projectCodes 可选：非空时仅导出勾选工程编号（预览表格去勾选的记录不导出）
export function exportReport(data) {
  return request({
    url: '/report/export',
    method: 'post',
    data: data,
    responseType: 'blob',
    timeout: 120000
  })
}

// 按配置直接导出（不保存模板，临时使用）
export function exportReportByConfig(data) {
  return request({
    url: '/report/exportByConfig',
    method: 'post',
    data: data,
    responseType: 'blob',
    timeout: 120000
  })
}

// ==================== 上报领导 ====================

// 导出并上报领导：{ templateId, filter, projectCodes, remark }
// 服务端生成快照留档 + 记录级上报时间（已上报工程锁定跳过），返回 { batchId, batchNo, newCount, skippedCount, ... }
export function submitReport(data) {
  return request({
    url: '/report/submit',
    method: 'post',
    data: data,
    timeout: 120000
  })
}

// 上报批次列表
export function listSubmitBatch(query) {
  return request({
    url: '/report/submit/batch/list',
    method: 'get',
    params: query
  })
}

// 上报批次详情（含批次内记录）
export function getSubmitBatch(id) {
  return request({
    url: '/report/submit/batch/' + id,
    method: 'get'
  })
}

// 下载批次快照文件（文件流 blob）
export function downloadSnapshot(id) {
  return request({
    url: '/report/submit/batch/' + id + '/snapshot',
    method: 'get',
    responseType: 'blob',
    timeout: 120000
  })
}

// 删除上报批次（仅管理员）
export function delSubmitBatch(id) {
  return request({
    url: '/report/submit/batch/' + id,
    method: 'delete'
  })
}

// 上报记录列表
export function listSubmitLog(query) {
  return request({
    url: '/report/submit/log/list',
    method: 'get',
    params: query
  })
}

// 批量查询工程编号上报状态（预览标记已上报行）
export function getSubmitStatus(projectCodes) {
  return request({
    url: '/report/submit/status',
    method: 'post',
    data: { projectCodes: projectCodes }
  })
}

// 删除单条上报记录（仅管理员；删除后该工程编号可重新上报）
export function delSubmitLog(id) {
  return request({
    url: '/report/submit/log/' + id,
    method: 'delete'
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
