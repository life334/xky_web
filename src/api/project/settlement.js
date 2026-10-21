import request from '@/utils/request'
import { tansParams } from '@/utils/land'

// 导出费用结算（可选范围 scope=filter|selected + 可选字段 fields 逗号串）
// 一个项目按工作量登记人拆成多行；工作量列是单元格内换行的明细文本
// ⚠️ 接口直接写文件流 ⇒ 必须 responseType:'blob'，否则响应拦截器会按 JSON 解析
export function exportSettlement(query) {
  return request({
    url: '/project/settlement/export',
    method: 'post',
    data: query,
    transformRequest: [(params) => tansParams(params)],
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    timeout: 180000
  })
}

// 查询费用结算树形列表（仅已办结项目，后端分页）
export function treeListSettlement(query) {
  return request({
    url: '/project/settlement/treeList',
    method: 'get',
    params: query
  })
}

// 查询费用结算录入状态胶囊的全局计数（工作量/到账/发票，忽略录入状态筛选本身）
export function getSettlementEntryStatusCounts(query) {
  return request({
    url: '/project/settlement/entryStatusCounts',
    method: 'get',
    params: query
  })
}

// 查询项目结算详情
export function getSettlementDetail(projectId) {
  return request({
    url: '/project/settlement/' + projectId,
    method: 'get'
  })
}

// 查询项目产值结算总览（产值 + 收款 + 结算状态，供详情页产值结算tab使用）
export function getSettlementOverview(projectId) {
  return request({
    url: '/project/settlement/overview/' + projectId,
    method: 'get'
  })
}

// 保存费用结算
export function saveSettlement(data) {
  return request({
    url: '/project/settlement',
    method: 'put',
    data: data
  })
}

// 保存工作量明细（独立保存，不涉及付款）
export function saveWorkload(data) {
  return request({
    url: '/project/settlement/workload',
    method: 'put',
    data: data
  })
}

// 保存到账信息（付款+开票，独立保存，不涉及工作量）
export function savePayment(data) {
  return request({
    url: '/project/settlement/payment',
    method: 'put',
    data: data
  })
}

// 查询费用结算可显隐列的元数据（显隐列面板 + 表格动态渲染用）
export function getSettlementColumns() {
  return request({
    url: '/project/settlement/columns',
    method: 'get'
  })
}
