import request from '@/utils/request'

// 备份文件列表（含备份目录 / pg_dump 可用性等状态）
export function listDbBackup() {
  return request({
    url: '/system/dbBackup/list',
    method: 'get'
  })
}

// 立即执行一次备份
export function runDbBackup() {
  return request({
    url: '/system/dbBackup/run',
    method: 'post',
    timeout: 30 * 60 * 1000
  })
}

// 删除备份文件
export function delDbBackup(name) {
  return request({
    url: '/system/dbBackup/remove',
    method: 'delete',
    params: { name }
  })
}

// 数据库服务器上的库列表（选择恢复目标 / 管理历史恢复库）
export function listDatabases() {
  return request({
    url: '/system/dbBackup/databases',
    method: 'get'
  })
}

// 检查目标库能否恢复（不存在/空库 可以；已有业务表拒绝）
export function inspectDb(db) {
  return request({
    url: '/system/dbBackup/inspectDb',
    method: 'get',
    params: { db }
  })
}

// 启动一键恢复（异步，立即返回；随后轮询 restoreStatus）
export function restoreDbBackup(name, targetDb) {
  return request({
    url: '/system/dbBackup/restore',
    method: 'post',
    data: { name, targetDb }
  })
}

// 恢复任务状态（轮询）
export function restoreStatus() {
  return request({
    url: '/system/dbBackup/restoreStatus',
    method: 'get'
  })
}

// 删除历史恢复库（仅 xky_project_r_ 前缀）
export function dropDatabase(name) {
  return request({
    url: '/system/dbBackup/dropDb',
    method: 'delete',
    params: { name }
  })
}
