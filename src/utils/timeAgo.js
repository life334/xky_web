/**
 * 通知/待办场景的时间展示工具
 *
 * 通知类 UI 的行业惯例：扫读时看「相对时间」（3分钟前 / 2天前）判断紧急度，
 * 精确时刻按需（hover title）查看。绝对时间戳（2026-10-19 10:23:11）扫读成本高。
 */

/** 后端返回 "yyyy-MM-dd HH:mm:ss"（空格分隔），Safari 不认，统一转成 '/' 分隔 */
function toDate(v) {
  if (!v) return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v
  if (typeof v === 'number') return new Date(v)
  const s = String(v).trim().replace('T', ' ').replace(/-/g, '/')
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/**
 * 相对时间：刚刚 / N分钟前 / N小时前 / N天前 / N个月前 / yyyy-MM-dd
 */
export function fromNow(v) {
  const d = toDate(v)
  if (!d) return ''
  const diff = Date.now() - d.getTime()
  if (diff < 0) {
    // 未来时间（时钟偏差）：直接给日期，不显示"xx前"
    return fmtDate(d)
  }
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return min + '分钟前'
  const hour = Math.floor(min / 60)
  if (hour < 24) return hour + '小时前'
  const day = Math.floor(hour / 24)
  if (day < 30) return day + '天前'
  const month = Math.floor(day / 30)
  if (month < 12) return month + '个月前'
  return fmtDate(d)
}

/** yyyy-MM-dd */
export function fmtDate(d) {
  const p = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

/** yyyy-MM-dd HH:mm */
export function fmtDateTime(v) {
  const d = toDate(v)
  if (!d) return ''
  const p = n => String(n).padStart(2, '0')
  return fmtDate(d) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

/** MM-dd HH:mm（卡片内紧凑显示，省略年份） */
export function fmtShort(v) {
  const d = toDate(v)
  if (!d) return ''
  const p = n => String(n).padStart(2, '0')
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

/**
 * 截止时间文案：今天到期 / 明天到期 / 逾期 N 天 / MM-dd 到期
 * 返回 { text, overdue, soon }
 *   overdue 已超期；soon 24 小时内到期（含已超期）
 */
export function dueMeta(v) {
  const d = toDate(v)
  if (!d) return { text: '', overdue: false, soon: false }
  const now = new Date()
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const due0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((due0 - today0) / 86400000)
  if (days < 0) return { text: `逾期 ${-days} 天`, overdue: true, soon: true }
  if (days === 0) return { text: '今天到期', overdue: false, soon: true }
  if (days === 1) return { text: '明天到期', overdue: false, soon: true }
  if (days <= 7) return { text: `${days} 天后到期`, overdue: false, soon: false }
  return { text: fmtDate(d) + ' 到期', overdue: false, soon: false }
}

/** 排序用时间戳（无效值排最后） */
export function timeValue(v) {
  const d = toDate(v)
  return d ? d.getTime() : 0
}
