import request from '@/utils/request'
import { tansParams } from '@/utils/land'

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

// 统计卡（口径随列表筛选联动，入参即列表查询条件 + 到账窗口 curBegin/curEnd/prevBegin/prevEnd）
export function collectionStats(query) {
  return request({
    url: '/project/collection/stats',
    method: 'get',
    params: query
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

// 到账明细（与到账汇总同一驱动与筛选条件；dimension 默认 payTime，KPI 卡片下钻也用它）
export function collectionReceivedDetail(query) {
  return request({
    url: '/project/collection/receivedDetail',
    method: 'get',
    params: query
  })
}

// 到账统计（合计 + 分组明细）
// dimension=payTime(默认) | closeTime；groupBy=none(默认) | month | quarter | year | clientUnit | leader | paymentType | category
export function collectionPaymentSummary(query) {
  return request({
    url: '/project/collection/paymentSummary',
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

// 催款清单导出字段池（导出弹窗「可选字段」的唯一出处）
export function collectionExportColumns() {
  return request({
    url: '/project/collection/exportColumns',
    method: 'get'
  })
}

// 导出催款清单（可选字段）
// ⚠️ 接口直接写文件流 ⇒ 必须 responseType:'blob'，否则响应拦截器会按 JSON 解析
// ⚠️ 走 form-urlencoded（与项目 / 合同导出一致），不用 query string
export function exportCollection(query) {
  return request({
    url: '/project/collection/export',
    method: 'post',
    data: query,
    transformRequest: [(params) => tansParams(params)],
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    timeout: 180000
  })
}
