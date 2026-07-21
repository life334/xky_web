import request from '@/utils/request'

// 查询红线列表
export function listRedline(query) {
  return request({
    url: '/land/redline/list',
    method: 'get',
    params: query
  })
}

// 获取红线详情（含GeoJSON）
export function getRedline(redlineId) {
  return request({
    url: '/land/redline/' + redlineId,
    method: 'get'
  })
}

// 获取任务下所有红线的GeoJSON FeatureCollection
export function getRedlineGeoJson(taskId) {
  return request({
    url: '/land/redline/geojson/' + taskId,
    method: 'get'
  })
}

// 获取最近一次导入红线的任务信息（页面默认选中）
export function getLastImportTask() {
  return request({
    url: '/land/redline/last-task',
    method: 'get'
  })
}

// 导入红线
export function importRedline({ file, taskId }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('taskId', taskId)
  return request({
    url: '/land/redline/import',
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 删除红线
export function delRedline(redlineIds) {
  return request({
    url: '/land/redline/' + redlineIds,
    method: 'delete'
  })
}

// 执行空间判定
export function executeJudge(taskId) {
  return request({
    url: '/land/redline/judge/' + taskId,
    method: 'post'
  })
}

// 查询图斑的判定结果
export function getParcelRedlineResults(parcelId) {
  return request({
    url: '/land/redline/result/' + parcelId,
    method: 'get'
  })
}
