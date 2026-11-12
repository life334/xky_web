/**
 * 项目导出字段池兜底清单（项目列表页 / 费用结算页共用）
 *
 * ⚠️ 唯一真实来源是后端 `ProjectExportFieldPool`（GET /project/export/fields）。
 *    这里的副本只在「后端未重启 / 接口失败」时兜底，保证 Export 弹窗不退化。
 *    ⚠️ 改后端字段池时必须同步此处（顺序、key、label、type 都要一致）。
 *
 * 字段分组：
 *   project    项目信息
 *   contract   合同
 *   workload   工作量与产值
 *   settlement 结算付款
 */

export const EXPORT_GROUP_LABELS = {
  project: '项目信息',
  contract: '合同',
  workload: '工作量与产值',
  settlement: '结算付款'
}

/** type: text / dict / date / number / money / duration / total */
const FIELDS = [
  // 项目信息
  { key: 'projectCode', label: '工程编号', type: 'text', group: 'project', width: 18, defaultProject: true, defaultSettlement: true },
  { key: 'projectName', label: '项目名称', type: 'text', group: 'project', width: 28, defaultProject: false, defaultSettlement: false },
  { key: 'clientUnit', label: '委托单位', type: 'text', group: 'project', width: 26, defaultProject: true, defaultSettlement: true },
  { key: 'clientUnitNature', label: '委托单位性质', type: 'dict', group: 'project', width: 16, defaultProject: true, defaultSettlement: false },
  { key: 'contactName', label: '联系人', type: 'text', group: 'project', width: 14, defaultProject: true, defaultSettlement: false },
  { key: 'contactPhone', label: '联系电话', type: 'text', group: 'project', width: 18, defaultProject: true, defaultSettlement: false },
  { key: 'projectLocation', label: '工程地点', type: 'text', group: 'project', width: 24, defaultProject: true, defaultSettlement: true },
  { key: 'categoryName', label: '项目类别', type: 'text', group: 'project', width: 18, defaultProject: true, defaultSettlement: true },
  { key: 'status', label: '状态', type: 'dict', group: 'project', width: 12, defaultProject: true, defaultSettlement: false },
  { key: 'projectNature', label: '项目性质', type: 'dict', group: 'project', width: 14, defaultProject: true, defaultSettlement: false },
  { key: 'closeTime', label: '办结日期', type: 'date', group: 'project', width: 14, defaultProject: true, defaultSettlement: false },
  { key: 'assignDate', label: '安排日期', type: 'date', group: 'project', width: 14, defaultProject: true, defaultSettlement: false },
  { key: 'durationRequire', label: '工期要求', type: 'duration', group: 'project', width: 12, defaultProject: true, defaultSettlement: false },
  { key: 'totalDuration', label: '总时长', type: 'total', group: 'project', width: 12, defaultProject: true, defaultSettlement: false },
  { key: 'relatedProjectCode', label: '关联定线编号', type: 'text', group: 'project', width: 18, defaultProject: true, defaultSettlement: false },
  { key: 'dataSource', label: '项目来源', type: 'dict', group: 'project', width: 12, defaultProject: false, defaultSettlement: false },
  { key: 'remark', label: '项目备注', type: 'text', group: 'project', width: 24, defaultProject: false, defaultSettlement: false },
  // 合同
  { key: 'contractName', label: '合同', type: 'text', group: 'contract', width: 26, defaultProject: false, defaultSettlement: false },
  { key: 'contractNo', label: '合同编号', type: 'text', group: 'contract', width: 20, defaultProject: false, defaultSettlement: false },
  { key: 'contractAmount', label: '合同金额', type: 'number', group: 'contract', width: 16, defaultProject: false, defaultSettlement: false },
  // 工作量与产值
  { key: 'leaderNames', label: '项目负责人', type: 'text', group: 'workload', width: 18, defaultProject: true, defaultSettlement: false },
  { key: 'userName', label: '登记人', type: 'text', group: 'workload', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'internalWorkload', label: '内部工作量', type: 'text', group: 'workload', width: 30, defaultProject: false, defaultSettlement: true },
  { key: 'internalOutput', label: '内部产值', type: 'money', group: 'workload', width: 16, defaultProject: false, defaultSettlement: true },
  { key: 'externalWorkload', label: '外部工作量', type: 'text', group: 'workload', width: 30, defaultProject: false, defaultSettlement: true },
  { key: 'externalOutput', label: '外部产值', type: 'money', group: 'workload', width: 16, defaultProject: false, defaultSettlement: true },
  // 结算付款
  { key: 'planReportTime', label: '拟上报时间', type: 'text', group: 'settlement', width: 18, defaultProject: false, defaultSettlement: true },
  { key: 'prepayAmount', label: '预付款', type: 'money', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'prepayDate', label: '预付款时间', type: 'date', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'payUnit', label: '付款单位', type: 'text', group: 'settlement', width: 20, defaultProject: false, defaultSettlement: true },
  { key: 'payMethod', label: '付款方式', type: 'text', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'tailAmount', label: '尾款', type: 'money', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'tailDate', label: '尾款时间', type: 'date', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'refundAmount', label: '退款金额', type: 'money', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'refundDate', label: '退款时间', type: 'date', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'invoiceStatus', label: '开票状态', type: 'text', group: 'settlement', width: 12, defaultProject: false, defaultSettlement: true },
  { key: 'invoiceUnit', label: '开票单位', type: 'text', group: 'settlement', width: 20, defaultProject: false, defaultSettlement: true },
  { key: 'invoiceAmount', label: '开票金额', type: 'money', group: 'settlement', width: 14, defaultProject: false, defaultSettlement: true },
  { key: 'payRemark', label: '付款备注', type: 'text', group: 'settlement', width: 24, defaultProject: false, defaultSettlement: true }
]

/**
 * 兜底字段清单
 * @param {string} page project / settlement
 */
export function fallbackExportFields(page) {
  const isSettle = page === 'settlement'
  return FIELDS.map(f => ({
    key: f.key,
    label: f.label,
    type: f.type,
    group: f.group,
    width: f.width,
    defaultVisible: isSettle ? f.defaultSettlement : f.defaultProject
  }))
}

/** 分组标题（弹窗左栏分组显示用） */
export function exportGroupLabel(group) {
  return EXPORT_GROUP_LABELS[group] || '其他'
}
