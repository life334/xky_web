import request from '@/utils/request'

export function listParcel(query) {
  return request({
    url: '/land/parcel/list',
    method: 'get',
    params: query
  })
}

export function getParcel(parcelId) {
  return request({
    url: '/land/parcel/' + parcelId,
    method: 'get'
  })
}

export function addParcel(data) {
  return request({
    url: '/land/parcel',
    method: 'post',
    data: data
  })
}

export function updateParcel(data) {
  return request({
    url: '/land/parcel',
    method: 'put',
    data: data
  })
}

export function delParcel(parcelId) {
  return request({
    url: '/land/parcel/' + parcelId,
    method: 'delete'
  })
}

export function splitParcel(parcelId, data) {
  return request({
    url: '/land/parcel/split/' + parcelId,
    method: 'post',
    data: data
  })
}

export function mergeParcel(data) {
  return request({
    url: '/land/parcel/merge',
    method: 'post',
    data: data
  })
}

/**
 * 获取图斑的 GeoJSON FeatureCollection（几何为 WGS84/4326，供 MapLibre GL 渲染）
 * @param {number} [taskId] - 任务ID（可选，不传则查全部，限 2000 条）
 */
export function getParcelGeoJson(taskId) {
  const params = {}
  if (taskId) params.taskId = taskId
  return request({
    url: '/land/parcel/geojson',
    method: 'get',
    params
  })
}

/**
 * 导入图斑（支持 GeoJSON / SHP / ZIP）
 * @param {Object} params - { file: File, taskId: number }
 */
export function importParcels({ file, taskId }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('taskId', taskId)
  return request({
    url: '/land/parcel/import',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 审核图斑
 * @param {number} parcelId - 图斑ID
 * @param {string} action - "approve" 通过 / "reject" 驳回
 * @param {string} remark - 审核意见
 */
export function auditParcel(parcelId, action, remark) {
  return request({
    url: '/land/parcel/audit/' + parcelId,
    method: 'post',
    data: { action, remark }
  })
}
