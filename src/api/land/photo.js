import request from '@/utils/request'

/**
 * 查询某图斑下的所有照片
 * @param {number} parcelId - 图斑ID
 */
export function listPhotosByParcel(parcelId) {
  return request({
    url: '/land/photo/parcel/' + parcelId,
    method: 'get'
  })
}

/**
 * 获取照片详情
 * @param {number} photoId - 照片ID
 */
export function getPhoto(photoId) {
  return request({
    url: '/land/photo/' + photoId,
    method: 'get'
  })
}

/**
 * 删除照片
 * @param {number} photoId - 照片ID
 */
export function delPhoto(photoId) {
  return request({
    url: '/land/photo/' + photoId,
    method: 'delete'
  })
}
