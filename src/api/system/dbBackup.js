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
