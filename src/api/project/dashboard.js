import request from '@/utils/request'

// 获取驾驶舱聚合数据（V2：日期范围驱动）
export function getDashboardData(params) {
  return request({
    url: '/project/dashboard',
    method: 'get',
    params
  })
}

// 获取预警列表（合同超时预警等）
export function getAlertList() {
  return request({
    url: '/project/dashboard/alerts',
    method: 'get'
  })
}

// ==================== v2（驾驶舱新版四端点，契约 2026-09-27） ====================
// 公共入参：beginDate/endDate（周期）+ clientUnit/leaderId/categoryId（轻筛选）
//          + compareBeginDate/compareEndDate（对比周期，缺省后端按上一等长周期推算）

// 段1 经营快照：6 磁贴（本年/本月合同额、本期新增/办结/到账/超期，含对比基准）+ KPI + 工期维护率（唯一首屏阻塞）
export function getDashboardSummary(params) {
  return request({
    url: '/project/dashboard/summary',
    method: 'get',
    params
  })
}

// 段2+3 业务结构：类型 5 桶统计（数量/占比/合同额/内外产值）、本期办结占比、负责人×类型矩阵
export function getDashboardStructure(params) {
  return request({
    url: '/project/dashboard/structure',
    method: 'get',
    params
  })
}

// 段4 经营走势：外部产值月增量+累计双轴、项目动态三系列（新增/办结/到账）
export function getDashboardTrend(params) {
  return request({
    url: '/project/dashboard/trend',
    method: 'get',
    params
  })
}

// 段5 风险与执行：欠款按年（办结年口径）、风险行动清单（欠款/工期超期/未关联合同 三源合并）、计数
export function getDashboardRisk(params) {
  return request({
    url: '/project/dashboard/risk',
    method: 'get',
    params
  })
}
