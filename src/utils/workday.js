import { listWorkday } from '@/api/system/workday'

/**
 * 工作日计算工具（前端）
 * 与后端 WorkdayUtils.java 逻辑保持一致：
 *  - dayType: holiday=法定节假日休息, workday=调休上班日, weekend=周末默认休息
 *  - 有日历记录按记录判定；无记录的天按"周一~周五"判定（自动退化，仅排除周末）
 *  - 区间计算含头含尾
 */

// 模块级缓存：最近一次拉取的日历区间
let cache = { min: null, max: null, map: null }

/**
 * 清除日历缓存（工作日历页面增删改后调用，确保其他页面拿到最新数据）
 */
export function clearCache() {
  cache = { min: null, max: null, map: null }
}

// 任意日期（Date / 'yyyy-MM-dd' 字符串 / ISO-8601 / 'yyyy-MM-dd HH:mm:ss' / 时间戳）→ 'yyyy-MM-dd'
export function formatDate(date) {
  if (date === null || date === undefined || date === '') return null
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
    // 兼容后端 ISO-8601（如 "2026-08-04T00:00:00.000+08:00"）与 "yyyy-MM-dd HH:mm:ss"：
    // 直接提取日期部分，避免浏览器对带时区 ISO 串解析失败返回 null
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
    date = new Date(date.replace(/-/g, '/'))
  }
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 是否为周末（纯星期判断，不查日历）
export function isWeekend(date) {
  const key = formatDate(date)
  if (!key) return false
  const d = new Date(key.replace(/-/g, '/'))
  const w = d.getDay()
  return w === 0 || w === 6
}

// 拉取日历数据并构建 Map：'yyyy-MM-dd' → dayType（带区间缓存；forceRefresh 强制重拉）
export async function getWorkdayMap(start, end, forceRefresh = false) {
  const s = formatDate(start)
  const e = formatDate(end)
  if (!forceRefresh && cache.map && cache.min !== null && cache.max !== null &&
      cache.min <= s && cache.max >= e) {
    return cache.map
  }
  const res = await listWorkday({ startDate: s, endDate: e })
  const rows = res && res.data ? res.data : []
  const map = new Map()
  let min = null
  let max = null
  for (const r of rows) {
    if (!r.day) continue
    map.set(r.day, r.dayType)
    if (!min || r.day < min) min = r.day
    if (!max || r.day > max) max = r.day
  }
  cache = { min, max, map }
  return map
}

// 某天是否为工作日：有记录按记录，无记录按周一~周五
export function isWorkday(date, map) {
  const key = formatDate(date)
  if (!key) return false
  if (map && map.has(key)) return map.get(key) === 'workday'
  return !isWeekend(key)
}

/**
 * 计算 [start, end] 区间的工作日天数（含头含尾）
 * @param {Date|string} start 开始日期
 * @param {Date|string} end   结束日期
 * @param {Map} [map] 日历 Map；缺省时内部自动拉取
 * @returns {Promise<number>}
 */
export async function countWorkdays(start, end, map) {
  if (!start || !end) return 0
  const s = formatDate(start)
  const e = formatDate(end)
  if (!s || !e || s > e) return 0
  let m = map
  if (!m) {
    try {
      m = await getWorkdayMap(s, e)
    } catch (err) {
      // API 失败时退化为空 Map（仅排除周末），不中断计算
      console.warn('[workday] 日历数据拉取失败，退化为仅排除周末计算', err)
      m = new Map()
    }
  }
  const cur = new Date(s.replace(/-/g, '/'))
  const last = new Date(e.replace(/-/g, '/'))
  let count = 0
  while (cur <= last) {
    if (isWorkday(cur, m)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
