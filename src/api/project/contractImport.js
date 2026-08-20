import request from '@/utils/request'

// 合同导入 - 步骤1：上传Excel解析预览
export function previewContractImport(file) {
  const form = new FormData()
  form.append('file', file)
  return request({
    url: '/project/import/contract/preview',
    method: 'post',
    data: form,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
}

// 合同导入 - 步骤2：提交确认落库
export function commitContractImport(data) {
  return request({
    url: '/project/import/contract/commit',
    method: 'post',
    data,
    timeout: 15 * 60 * 1000
  })
}

// 合同导入 - 下载预览问题行明细
export function downloadContractProblems(token, type) {
  return request({
    url: '/project/import/contract/downloadProblems',
    method: 'get',
    params: { token, type },
    responseType: 'blob'
  })
}
