import request from '@/utils/request'

// 获取驾驶舱聚合数据
export function getDashboardData(period) {
  return request({
    url: '/project/dashboard',
    method: 'get',
    params: { period }
  })
}

// 获取预警列表（合同超时预警等）
export function getAlertList() {
  return request({
    url: '/project/dashboard/alerts',
    method: 'get'
  })
}
