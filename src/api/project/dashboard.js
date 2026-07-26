import request from '@/utils/request'

// 获取驾驶舱聚合数据
export function getDashboardData(period) {
  return request({
    url: '/project/dashboard',
    method: 'get',
    params: { period }
  })
}
