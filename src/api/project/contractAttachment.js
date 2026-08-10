import request from '@/utils/request'

// 查询合同的所有活跃附件
export function listAttachments(contractId) {
  return request({
    url: '/project/contract/attachment/list/' + contractId,
    method: 'get'
  })
}

// 上传附件
export function uploadAttachment(contractId, formData) {
  return request({
    url: '/project/contract/attachment/' + contractId,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 删除附件
export function deleteAttachment(attachmentId) {
  return request({
    url: '/project/contract/attachment/' + attachmentId,
    method: 'delete'
  })
}

// 查询附件版本历史
export function getAttachmentHistory(attachmentId) {
  return request({
    url: '/project/contract/attachment/' + attachmentId + '/history',
    method: 'get'
  })
}

// 恢复历史版本
export function restoreVersion(attachmentId, logId) {
  return request({
    url: '/project/contract/attachment/' + attachmentId + '/restore/' + logId,
    method: 'put'
  })
}

// 预览附件（返回 URL）
export function getPreviewUrl(attachmentId, version) {
  let url = (import.meta.env.VITE_APP_BASE_API || '') + '/project/contract/attachment/' + attachmentId + '/preview'
  if (version) {
    url += '?version=' + version
  }
  return url
}

// 下载附件（复用通用下载）
export function downloadAttachment(attachmentId, version) {
  // 通过 window.open 直接下载
  let url = (import.meta.env.VITE_APP_BASE_API || '') + '/project/contract/attachment/' + attachmentId + '/preview'
  if (version) {
    url += '?version=' + version
  }
  // 添加 download 参数触发浏览器下载
  const a = document.createElement('a')
  a.href = url
  a.download = ''
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
