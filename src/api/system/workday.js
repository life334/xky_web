import request from '@/utils/request'

// 查询日期区间内的全部日历记录（无分页；startDate/endDate 可空）
export function listWorkday(query) {
  return request({
    url: '/system/workday/all',
    method: 'get',
    params: query
  })
}

// 获取某年维护状态
export function getWorkdayStatus(year) {
  return request({
    url: '/system/workday/status',
    method: 'get',
    params: { year: year }
  })
}

// 新增单条（同日已存在时覆盖，幂等）
export function addWorkday(data) {
  return request({
    url: '/system/workday',
    method: 'post',
    data: data
  })
}

// 修改单条（按日期）
export function updateWorkday(data) {
  return request({
    url: '/system/workday',
    method: 'put',
    data: data
  })
}

// 删除单条（day = yyyy-MM-dd）
export function delWorkday(day) {
  return request({
    url: '/system/workday/' + day,
    method: 'delete'
  })
}

// 生成某年全年周末基线（幂等）
export function generateWorkday(year) {
  return request({
    url: '/system/workday/generate',
    method: 'post',
    params: { year: year }
  })
}

// 按日期区间批量录入/覆盖（如春节假期 2/15-2/23）
export function batchWorkday(data) {
  return request({
    url: '/system/workday/batch',
    method: 'post',
    data: data
  })
}

// 按日期区间批量清除（dayType 为空时清除该区间全部记录）
export function clearBatchWorkday(params) {
  return request({
    url: '/system/workday/batch',
    method: 'delete',
    params: params
  })
}
