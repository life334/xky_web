/**
 * 项目业务枚举 → 中文文案
 *
 * 背景：proj_payment.invoice_status 历史上存在两套写法
 *   - 界面保存：中文（未开 / 已开 / 已作废）
 *   - Excel 导入：英文占位（pending）
 * 展示层统一走本文件归一，避免英文或空白直接暴露给用户。
 * 未知值原样返回（不丢信息），便于发现问题。
 */

const INVOICE_STATUS_MAP = {
  // 中文（界面写入，直通）
  '未开': '未开',
  '已开': '已开',
  '已作废': '已作废',
  // 英文别名（导入 / 历史数据）
  pending: '未开',
  unpaid: '未开',
  not_invoiced: '未开',
  notinvoiced: '未开',
  no_invoice: '未开',
  invoiced: '已开',
  opened: '已开',
  issued: '已开',
  invoiced_unpaid: '已开',
  invoiced_paid: '已开',
  voided: '已作废',
  cancelled: '已作废',
  canceled: '已作废',
  invalid: '已作废'
}

/** 开票状态归一为中文；空值返回空串 */
export function invoiceStatusText(value) {
  if (value === null || value === undefined || value === '') return ''
  const key = String(value).trim()
  if (!key) return ''
  return INVOICE_STATUS_MAP[key] || INVOICE_STATUS_MAP[key.toLowerCase()] || key
}

/** 开票状态对应的 el-tag 类型：已开=success、已作废=danger、未开/未知=info */
export function invoiceStatusTagType(value) {
  const text = invoiceStatusText(value)
  if (text === '已开') return 'success'
  if (text === '已作废') return 'danger'
  return 'info'
}

/**
 * 开票状态是否「已作废」。
 *
 * 用途：界面保存时要把作废标记传给后端，值必须是**英文码值 voided**（库里统一存码值，
 * 中文只在本文件做展示映射）。同时兼容历史存量里的中文值，保证过渡期回显正确。
 */
export function isVoidedInvoice(value) {
  return invoiceStatusText(value) === '已作废'
}

/**
 * 项目级「开票 + 付款」组合状态（后端 ProjSettlementController#buildSettlementNode 派生）
 * 值域：not_invoiced 未开未付 / invoiced_unpaid 已开未付 / invoiced_paid 已开已付 / voided 已作废
 */
const INVOICE_PAYMENT_MAP = {
  not_invoiced: '未开未付',
  invoiced_unpaid: '已开未付',
  invoiced_paid: '已开已付',
  voided: '已作废'
}

/** 开票+付款组合状态归一为中文；空值返回空串 */
export function invoicePaymentText(value) {
  if (value === null || value === undefined || value === '') return ''
  const key = String(value).trim().toLowerCase()
  return INVOICE_PAYMENT_MAP[key] || String(value).trim()
}

/** 开票+付款组合状态的 el-tag 类型：已开已付=success、已开未付=warning、未开未付=info、已作废=danger */
export function invoicePaymentTagType(value) {
  const key = String(value == null ? '' : value).trim().toLowerCase()
  if (key === 'invoiced_paid') return 'success'
  if (key === 'invoiced_unpaid') return 'warning'
  if (key === 'voided') return 'danger'
  return 'info'
}

/* ------------------------------------------------------------------ *
 * 通用归一器
 *
 * 背景：后端多处字段以英文码落库（见 sql/14_*.sql），而 `<dict-tag>`
 * 在「值未命中字典」时会**把原始值直接打印出来**（DictTag 组件
 * showValue 默认 true），于是英文码就泄漏到界面。
 * 下面这组映射供非 dict-tag 的渲染位置使用，保证中文兜底。
 * 统一约定：空值返回空串；未知值原样返回（不丢信息，便于发现新码值）。
 * ------------------------------------------------------------------ */

function normalize(map, value) {
  if (value === null || value === undefined || value === '') return ''
  const key = String(value).trim()
  if (!key) return ''
  return map[key] || map[key.toLowerCase()] || key
}

/** 项目状态：ongoing 进行中 / closed 已办结 / archived 已归档（对齐 proj_project_status 字典） */
const PROJECT_STATUS_MAP = {
  '进行中': '进行中',
  '已办结': '已办结',
  '已归档': '已归档',
  pending: '待开始',
  ongoing: '进行中',
  closed: '已办结',
  completed: '已完成',
  archived: '已归档',
  cancelled: '已取消'
}

export function projectStatusText(value) {
  return normalize(PROJECT_STATUS_MAP, value)
}

/** 项目状态对应的 el-tag 类型 */
export function projectStatusTagType(value) {
  const key = String(value == null ? '' : value).trim().toLowerCase()
  if (key === 'closed' || key === 'archived' || key === 'completed') return 'success'
  if (key === 'cancelled') return 'danger'
  if (key === 'ongoing') return 'primary'
  return 'info'
}

/**
 * 任务状态：对齐 proj_task_status 字典。
 * 注意 finished 是「Excel 导入」写入的旧码，与字典里的 completed 同义，
 * 这里做兜底归一（sql/14_*.sql 已把存量 finished 迁成 completed）。
 */
const TASK_STATUS_MAP = {
  '待开始': '待开始',
  '进行中': '进行中',
  '已完成': '已完成',
  '已暂停': '已暂停',
  pending: '待开始',
  ongoing: '进行中',
  completed: '已完成',
  finished: '已完成',
  done: '已完成',
  paused: '已暂停',
  cancelled: '已取消'
}

export function taskStatusText(value) {
  return normalize(TASK_STATUS_MAP, value)
}

/**
 * 任务是否已完成。
 * 兼容三套同义码：completed（界面写入）/ finished（Excel 导入旧码）/ done（外部来源）。
 * 存量 finished 由 sql/15_*.sql 迁移为 completed；未执行迁移时本函数保证前端逻辑仍正确。
 */
const TASK_DONE_CODES = ['completed', 'finished', 'done']

export function isTaskDone(value) {
  return TASK_DONE_CODES.includes(String(value == null ? '' : value).trim().toLowerCase())
}

/**
 * 生成「仅用于展示」的任务状态字典项：在字典基础上补充旧码别名（finished/done → 已完成）。
 *
 * 为什么需要：`<dict-tag>` 在值未命中字典时会**原样打印原始值**，存量导入任务
 * （proj_task.status = finished）不补别名就会在列表里显示英文。
 * 为什么不用在筛选下拉：下拉若同时出现 completed 与 finished 两项，用户会看到两个「已完成」。
 * 因此：<dict-tag> 用本函数结果，筛选/表单下拉仍用原始字典。
 */
export function withTaskStatusAliases(dictList) {
  const list = Array.isArray(dictList) ? dictList : []
  const extra = [
    { value: 'finished', label: '已完成', elTagType: 'success' },
    { value: 'done', label: '已完成', elTagType: 'success' }
  ].filter(alias => !list.some(d => d.value === alias.value))
  return extra.length ? [...list, ...extra] : list
}

/** 任务状态对应的 el-tag 类型 */
export function taskStatusTagType(value) {
  const key = String(value == null ? '' : value).trim().toLowerCase()
  if (key === 'completed' || key === 'finished' || key === 'done') return 'success'
  if (key === 'paused') return 'warning'
  if (key === 'ongoing') return 'primary'
  return 'info'
}

/** 合同类型：unit 单价合同 / total 总价合同（对齐 proj_contract_type 字典） */
const CONTRACT_TYPE_MAP = {
  '单价合同': '单价合同',
  '总价合同': '总价合同',
  unit: '单价合同',
  total: '总价合同'
}

export function contractTypeText(value) {
  return normalize(CONTRACT_TYPE_MAP, value)
}

/** 成果资料类型：paper 纸质 / digital 电子 / paper_digital 纸质+电子（对齐 proj_material_result_type 字典） */
const MATERIAL_RESULT_TYPE_MAP = {
  '纸质': '纸质',
  '电子': '电子',
  '纸质+电子': '纸质+电子',
  paper: '纸质',
  digital: '电子',
  paper_digital: '纸质+电子'
}

export function materialResultTypeText(value) {
  return normalize(MATERIAL_RESULT_TYPE_MAP, value)
}

/** 单价来源：contract 合同价 / dict 默认价 / manual 手动 / imported 导入价 */
const PRICE_SOURCE_MAP = {
  contract: '合同价',
  dict: '默认价',
  manual: '手动',
  imported: '导入价'
}

export function priceSourceText(value) {
  return normalize(PRICE_SOURCE_MAP, value)
}

/** 单价来源对应的 el-tag 类型 */
export function priceSourceTagType(value) {
  const key = String(value == null ? '' : value).trim().toLowerCase()
  if (key === 'contract') return 'primary'
  if (key === 'manual') return 'warning'
  if (key === 'imported') return 'warning'
  return 'info'
}

/** 项目来源：manual 手动录入 / import Excel 导入 */
const PROJECT_SOURCE_MAP = {
  manual: '手动录入',
  import: 'Excel 导入',
  imported: 'Excel 导入'
}

export function projectSourceText(value) {
  return normalize(PROJECT_SOURCE_MAP, value)
}

/**
 * 上报记录的「写入者标识」。
 *
 * 库里 submit_by 对真实上报存的是操作人账号；历史导入补录行（batch_id 为空）
 * 存的是英文标识 {@code import}（不写中文），此处映射成中文展示。
 */
const SUBMIT_BY_MAP = {
  import: '历史导入'
}

export function submitByText(value) {
  return normalize(SUBMIT_BY_MAP, value)
}

/**
 * 付款类型：advance 预付款 / progress 进度款 / final 尾款 / refund 退款
 * 对齐字典 proj_payment_type（库里存英文码值，中文只在本文件映射）。
 *
 * 为什么要统一出口：合同列表/详情弹窗原先各自维护本地 map，漏了 refund
 * ⇒ 退款行的「付款类型」直接显示英文 refund。集中到这里后不会再漏项。
 */
const PAYMENT_TYPE_MAP = {
  '预付款': '预付款',
  '进度款': '进度款',
  '尾款': '尾款',
  '退款': '退款',
  advance: '预付款',
  progress: '进度款',
  final: '尾款',
  refund: '退款'
}

export function paymentTypeText(value) {
  return normalize(PAYMENT_TYPE_MAP, value)
}

/**
 * 合同附件分类：contract 合同正本 / supplement 补充协议 / acceptance 验收单 / invoice 票据 / other 其他
 *
 * 注意：字典 proj_attachment_category 目前只配了 3 项（缺 acceptance / invoice），
 * 而合同附件上传下拉是**直接遍历该字典**的 ⇒ 往字典里补项会改变上传下拉的选项。
 * 因此这里只做「字典未命中时的中文兜底」，不动字典，界面选项数量保持不变。
 */
const ATTACHMENT_CATEGORY_MAP = {
  contract: '合同正本',
  supplement: '补充协议',
  acceptance: '验收单',
  invoice: '票据',
  other: '其他'
}

export function attachmentCategoryText(value) {
  return normalize(ATTACHMENT_CATEGORY_MAP, value)
}

/**
 * 合同是否结算：0 未结算 / 1 已结算。
 * 该字段是字符型标志位（不是字典字段），列表列由后端注册为 text 直接输出 ⇒ 会显示 0/1。
 */
export function settledFlagText(value) {
  if (value === null || value === undefined || value === '') return ''
  const key = String(value).trim()
  if (key === '1') return '已结算'
  if (key === '0') return '未结算'
  return key
}
