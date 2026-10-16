import { categoryTreeselectFull, listBilling } from '@/api/project/category'
import { listUserOptions } from '@/api/system/user'

/**
 * 项目类别基础数据（类别树 / 全量计费方式 / 用户）—— 全局唯一缓存的共享模块。
 *
 * 背景：工作量录入弹窗、费用结算、回款页都需要「类别树 + 全量计费方式 + 用户」，
 * 此前各自维护一份模块级缓存。而「项目类别」页新增/修改/删除类别后，
 * 这些缓存不会失效 ⇒ 新小类 / 新计费类别进不了录入弹窗的下拉，需 F5 才恢复。
 *
 * 现统一收口到本模块：
 *   - ensureCategoryBaseData()     未失效缓存直接返回；否则（重新）拉取并缓存。
 *   - invalidateCategoryBaseData() 显式作废缓存（「项目类别」页增/改/删成功后调用）。
 * 并叠加 TTL 兜底：即便没有收到显式失效信号（例如在另一个浏览器标签页改了类别），
 * 缓存最长存活 CATEGORY_BASE_TTL_MS 后自动重新拉取，保证最终一致。
 */

/** TTL 兜底时长（毫秒）：缓存最长存活时间，超时后下次取值自动重新拉取 */
export const CATEGORY_BASE_TTL_MS = 5 * 60 * 1000

/** 已 resolve 的基础数据缓存：{ data, at } */
let cache = null
/** 进行中的请求（防并发重复拉取） */
let pending = null

/** 计费方式映射：categoryId -> 启用中的计费方式列表（停用 status === '1' 过滤） */
export function buildBillingMap(list) {
  const bMap = {}
  ;(list || []).forEach(b => {
    if (b.status === '1') return
    if (!bMap[b.categoryId]) bMap[b.categoryId] = []
    bMap[b.categoryId].push(b)
  })
  return bMap
}

/** 类别树 -> { id: name } 映射（递归打平，供按项目类别名称兜底匹配） */
export function buildCategoryNameMap(tree) {
  const map = {}
  const walk = list => (list || []).forEach(n => {
    map[n.id] = n.name
    walk(n.children)
  })
  walk(tree)
  return map
}

/** 缓存是否仍在 TTL 内有效 */
function isFresh() {
  return cache != null && (Date.now() - cache.at) < CATEGORY_BASE_TTL_MS
}

/**
 * 获取项目类别基础数据（缓存未失效时直接返回，多个使用方共享同一份数据）。
 * @returns {Promise<{categoryTree:Array, userOptions:Array, billingMap:Object, categoryNameMap:Object}>}
 */
export function ensureCategoryBaseData() {
  if (isFresh()) return Promise.resolve(cache.data)
  if (pending) return pending
  pending = Promise.all([
    categoryTreeselectFull(),
    listUserOptions({ pageNum: 1, pageSize: 1000 }),
    listBilling()
  ]).then(([catRes, userRes, billingRes]) => {
    const data = {
      categoryTree: catRes.data || [],
      userOptions: userRes.rows || [],
      billingMap: buildBillingMap(billingRes.data || []),
      categoryNameMap: buildCategoryNameMap(catRes.data || [])
    }
    cache = { data, at: Date.now() }
    return data
  }).finally(() => {
    pending = null
  })
  return pending
}

/** 显式作废缓存：「项目类别」页新增/修改/删除成功后调用，确保下次取值重新拉取 */
export function invalidateCategoryBaseData() {
  cache = null
}
