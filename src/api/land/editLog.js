import request from '@/utils/request'

/**
 * 查询编辑日志列表
 */
export function listEditLog(query) {
  return request({
    url: '/land/parcel/editlog/list',
    method: 'get',
    params: query
  })
}

/**
 * 获取编辑日志详情
 */
export function getEditLog(logId) {
  return request({
    url: '/land/parcel/editlog/' + logId,
    method: 'get'
  })
}

/**
 * 查询图斑的编辑历史
 */
export function getEditLogByParcel(parcelId) {
  return request({
    url: '/land/parcel/editlog/parcel/' + parcelId,
    method: 'get'
  })
}
