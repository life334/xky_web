import request from '@/utils/request'

// 回款台账列表（项目维度）
export function collectionList(query) {
  return request({
    url: '/project/collection/list',
    method: 'get',
    params: query
  })
}

// 客户聚合视图
export function collectionClientList(query) {
  return request({
    url: '/project/collection/clientList',
    method: 'get',
    params: query
  })
}

// 统计卡
export function collectionStats() {
  return request({
    url: '/project/collection/stats',
    method: 'get'
  })
}

// 待结算提醒列表（已办结但无外部产值）
export function collectionUnsettledList(query) {
  return request({
    url: '/project/collection/unsettledList',
    method: 'get',
    params: query
  })
}

// 按项目查询催收记录
export function collectionLog(projectId) {
  return request({
    url: '/project/collection/log/' + projectId,
    method: 'get'
  })
}

// 新增催收记录
export function addCollectionLog(data) {
  return request({
    url: '/project/collection/log',
    method: 'post',
    data: data
  })
}

// 删除催收记录
export function delCollectionLog(ids) {
  return request({
    url: '/project/collection/log/' + ids,
    method: 'delete'
  })
}
