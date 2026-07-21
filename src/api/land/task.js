import request from '@/utils/request'

// 注意：后端 Controller 路径是 /land/task，不是 /land/task

/**
 * 查询调查任务列表
 */
export function listTask(query) {
  return request({
    url: '/land/task/list',
    method: 'get',
    params: query
  })
}

/**
 * 获取调查任务详情
 */
export function getTask(taskId) {
  return request({
    url: '/land/task/' + taskId,
    method: 'get'
  })
}

/**
 * 新增调查任务
 */
export function addTask(data) {
  return request({
    url: '/land/task',
    method: 'post',
    data: data
  })
}

/**
 * 修改调查任务
 */
export function updateTask(data) {
  return request({
    url: '/land/task',
    method: 'put',
    data: data
  })
}

/**
 * 删除调查任务
 */
export function delTask(taskId) {
  return request({
    url: '/land/task/' + taskId,
    method: 'delete'
  })
}

/**
 * 分派任务给外业人员
 */
export function assignTask(data) {
  return request({
    url: '/land/task/assign',
    method: 'post',
    data: data
  })
}
