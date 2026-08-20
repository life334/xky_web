import request from '@/utils/request'

// 步骤1：上传Excel，解析预览（仅返回可导入行）
export function previewImport(file) {
  const form = new FormData()
  form.append('file', file)
  return request({
    url: '/project/import/preview',
    method: 'post',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
}

// 步骤2：提交确认后的数据落库
export function commitImport(data) {
  return request({
    url: '/project/import/commit',
    method: 'post',
    data,
    timeout: 15 * 60 * 1000
  })
}

// 下载预览问题行明细（type: warning|duplicate|error）
export function downloadProblems(token, type) {
  return request({
    url: '/project/import/downloadProblems',
    method: 'get',
    params: { token, type },
    responseType: 'blob'
  })
}

// 下载导入失败明细
export function downloadImportFailures(logId) {
  return request({
    url: '/project/import/downloadFailures',
    method: 'get',
    params: { logId },
    responseType: 'blob'
  })
}

// 下载导入跳过明细
export function downloadImportSkipped(logId) {
  return request({
    url: '/project/import/downloadSkipped',
    method: 'get',
    params: { logId },
    responseType: 'blob'
  })
}
