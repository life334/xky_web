import request from '@/utils/request'

/**
 * 项目导出字段池（项目列表页 / 费用结算页共用，2026-11-11 起两页可选字段完全一致）
 *
 * @param {string} page project（项目列表）/ settlement（费用结算）
 *                      —— 只影响 defaultVisible（两页默认勾选列不同），字段清单本身一样
 */
export function getExportFields(page) {
  return request({
    url: '/project/export/fields',
    method: 'get',
    params: { page }
  })
}
