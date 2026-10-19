import { reactive, ref } from 'vue'
import useUserStore from '@/store/modules/user'
import { notifySummary, notifyIncrement, notifyOpen } from '@/api/project/notify'

/**
 * 通知轮询 composable
 *
 * 弹出策略（三条通道，互不重叠）：
 * 1. 登录首屏「今日待处理摘要」：进入系统 2s 后弹一次**当前全部**未完成待办 + 未处理预警。
 *    这是"上班先知道今天要办什么"的提醒，不依赖用户去点铃铛。
 *    节流：每天最多一次 + 每个会话最多一次（F5 刷新不会重复弹，换个标签页也不会）。
 * 2. 增量弹出：轮询发现水位线之后**新到达**的待办/预警，按 notify.popup.throttle.minutes 节流。
 * 3. 非工作时段挂起：登录时不在窗口期（如 07:50）不弹，但**不推进任何标记**，
 *    等进入窗口期后的第一次轮询补弹 —— 旧实现会把水位线推掉，导致"早上登录全天不弹"。
 *
 * 其余约束：服务端 allowPopup（免打扰时段 + 周末）+ 本地「今日不再自动弹」开关 + 单批只弹一次（弹出即推进水位线）。
 * 普通消息不弹（只刷角标）。
 */
export function useNotifyPolling(popup) {
  const summary = reactive({
    todoCount: 0, messageCount: 0, highTodoCount: 0, alertCount: 0, maxId: 0,
    popupEnabled: true, allowPopup: false, popupDuration: 8, throttleMinutes: 5,
    workStart: '08:00', workEnd: '18:00'
  })
  const lastPopupAt = ref(0)
  const loaded = ref(false)
  let timer = null
  /** 本次会话（标签页）是否已处理过首屏摘要：处理后不再尝试 */
  let digestHandled = false
  let digestInFlight = false

  const userKey = () => {
    try {
      const name = useUserStore().name
      return name ? String(name) : 'me'
    } catch (e) { return 'me' }
  }
  const LS_LAST_ID = () => `notify:lastId:${userKey()}`
  const LS_NO_POPUP_TODAY = () => `notify:noPopup:${userKey()}`
  const LS_DIGEST_DATE = () => `notify:digestDate:${userKey()}`
  const SS_DIGEST_DATE = () => `notify:digestShown:${userKey()}`

  const getStoredId = () => Number(localStorage.getItem(LS_LAST_ID()) || 0)
  const setStoredId = v => localStorage.setItem(LS_LAST_ID(), String(v))

  /**
   * 本地日期（yyyy-MM-dd）
   * ⚠️ 不能用 toISOString().slice(0,10)：那是 UTC 日期，北京时间 00:00–08:00 之间会算成"昨天"，
   * 导致「今日不再弹」「今日摘要已弹」在凌晨全部失效。
   */
  const todayStr = () => {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
  }
  const noPopupToday = () => localStorage.getItem(LS_NO_POPUP_TODAY()) === todayStr()
  const setNoPopupToday = () => localStorage.setItem(LS_NO_POPUP_TODAY(), todayStr())

  /** 今日摘要是否已弹过（会话级 + 天级双重标记） */
  function digestDoneToday() {
    try {
      if (sessionStorage.getItem(SS_DIGEST_DATE()) === todayStr()) return true
      return localStorage.getItem(LS_DIGEST_DATE()) === todayStr()
    } catch (e) { return false }
  }
  function markDigestDone() {
    digestHandled = true
    try {
      sessionStorage.setItem(SS_DIGEST_DATE(), todayStr())
      localStorage.setItem(LS_DIGEST_DATE(), todayStr())
    } catch (e) { /* 隐私模式等场景忽略 */ }
  }

  /** 高风险项双击停留时长（配置说明里承诺的"高风险自动 x2"） */
  const popupDurationFor = items => {
    const hasHigh = (items || []).some(i => i.priority === 'high')
    return Math.max(2, summary.popupDuration || 8) * (hasHigh ? 2 : 1)
  }

  /**
   * 登录首屏「今日待处理摘要」
   * 触发条件：未处理过 && 开关开启 && 今日未点"不再弹" && 当前在窗口期。
   * 非窗口期直接 return（不标记），留给后续轮询补弹。
   */
  async function tryDigest() {
    if (digestHandled || digestInFlight) return
    if (digestDoneToday()) { digestHandled = true; return }
    if (!summary.popupEnabled) { digestHandled = true; return }
    if (noPopupToday()) { markDigestDone(); return }
    if (!summary.allowPopup) return

    digestInFlight = true
    try {
      const res = await notifyOpen()
      // ⚠️ 响应体解包铁律：Array 判空兜底
      const items = Array.isArray(res && res.data) ? res.data : []
      // 无论有没有内容，今天都只问一次（避免每次轮询都为"空"打一次接口）
      markDigestDone()
      if (items.length > 0) {
        lastPopupAt.value = Date.now()
        popup && popup(items, {
          mode: 'digest',
          duration: popupDurationFor(items),
          noPopupToday,
          setNoPopupToday
        })
        // open 接口内部跑过 sweep（业务已完成的待办会转 done），角标需要跟着更新
        refreshSummary()
      }
    } catch (e) {
      // 静默：失败不标记，下次轮询还能再试
    } finally {
      digestInFlight = false
    }
  }

  async function refreshSummary() {
    try {
      const res = await notifySummary()
      const d = (res && res.data) || {}
      // ⚠️ 响应体解包铁律：Array/对象字段判空兜底
      summary.todoCount = d.todoCount ?? 0
      summary.messageCount = d.messageCount ?? 0
      summary.highTodoCount = d.highTodoCount ?? 0
      summary.alertCount = d.alertCount ?? 0
      summary.maxId = d.maxId ?? 0
      summary.popupEnabled = d.popupEnabled !== false
      summary.allowPopup = d.allowPopup === true
      summary.popupDuration = d.popupDuration ?? 8
      summary.throttleMinutes = d.throttleMinutes ?? 5
      summary.workStart = d.workStart || '08:00'
      summary.workEnd = d.workEnd || '18:00'
      if (!loaded.value) {
        loaded.value = true
        // 首次进入先把水位线推到当前最大 id：否则第一次 checkNewArrivals 会把全部历史积压
        // 当成"新到达"一次性弹出来（这部分交给首屏摘要统一处理，格式更友好）。
        setStoredId(summary.maxId)
        // 等首屏渲染稳定再弹（避开登录瞬间的字典/路由加载竞争）
        setTimeout(() => tryDigest(), 2000)
      } else {
        // 非窗口期登录的用户：进入窗口期后由这里补弹
        tryDigest()
        checkNewArrivals(false)
      }
    } catch (e) { /* 静默：轮询失败不影响页面 */ }
  }

  /** 水位线之后是否有新待办/新预警 → 按策略决定是否弹 */
  async function checkNewArrivals(firstLoad) {
    const stored = getStoredId()
    if (summary.maxId <= stored) {
      if (summary.maxId === 0 && stored !== 0) setStoredId(0)
      return
    }
    if (!summary.popupEnabled || noPopupToday()) {
      // 全局关闭/今日免打扰：静默推进，内容仍在面板与角标中
      setStoredId(summary.maxId)
      return
    }
    if (!summary.allowPopup) {
      // 非工作时段：静默推进。⚠️ 首屏摘要的标记不受影响，进入时段后仍会补弹一次全量摘要
      setStoredId(summary.maxId)
      return
    }
    if (!firstLoad && Date.now() - lastPopupAt.value < summary.throttleMinutes * 60 * 1000) {
      // 节流窗口内：保留水位线，窗口过后可再弹
      return
    }
    try {
      const res = await notifyIncrement(stored)
      const items = Array.isArray(res && res.data) ? res.data : []
      if (items.length === 0) {
        setStoredId(summary.maxId)
        return
      }
      lastPopupAt.value = Date.now()
      setStoredId(summary.maxId)
      popup && popup(items, {
        mode: 'new',
        duration: popupDurationFor(items),
        noPopupToday,
        setNoPopupToday
      })
    } catch (e) { /* 静默 */ }
  }

  function start() {
    stop()
    refreshSummary()
    timer = setInterval(refreshSummary, 30 * 1000)
    document.addEventListener('visibilitychange', onVisible)
  }
  function stop() {
    if (timer) clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisible)
  }
  function onVisible() {
    if (document.visibilityState === 'visible') refreshSummary()
  }

  return { summary, refreshSummary, start, stop, setNoPopupToday, noPopupToday }
}
