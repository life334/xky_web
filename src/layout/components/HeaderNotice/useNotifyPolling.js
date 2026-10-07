import { reactive, ref } from 'vue'
import useUserStore from '@/store/modules/user'
import { notifySummary, notifyIncrement } from '@/api/project/notify'

/**
 * 通知轮询 composable
 *
 * - 30s 拉一次角标 summary（服务端会即时 sweep 自动完成/超期升级）
 * - 自动弹出：水位线（localStorage）之后有新待办 → 满足策略则弹出汇总卡
 *   策略：服务端 allowPopup（免打扰时段+工作日）+ 本地节流（throttleMinutes）
 *        + "今日不再自动弹"开关
 * - 切回标签页（visibilitychange）时立即补一次检查
 *
 * 防骚扰硬约束：同一批内容只弹一次（弹出即推进水位线）；
 * 普通消息不弹（只刷角标）；被节流拦下的批次保留水位线、节流窗口过后可再弹。
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

  const userKey = () => {
    try {
      const name = useUserStore().name
      return name ? String(name) : 'me'
    } catch (e) { return 'me' }
  }
  const LS_LAST_ID = () => `notify:lastId:${userKey()}`
  const LS_NO_POPUP_TODAY = () => `notify:noPopup:${userKey()}`

  const getStoredId = () => Number(localStorage.getItem(LS_LAST_ID()) || 0)
  const setStoredId = v => localStorage.setItem(LS_LAST_ID(), String(v))
  const todayStr = () => new Date().toISOString().slice(0, 10)
  const noPopupToday = () => localStorage.getItem(LS_NO_POPUP_TODAY()) === todayStr()
  const setNoPopupToday = () => localStorage.setItem(LS_NO_POPUP_TODAY(), todayStr())

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
        // 登录后 2 秒首弹检查
        setTimeout(() => checkNewArrivals(true), 2000)
      } else {
        checkNewArrivals(false)
      }
    } catch (e) { /* 静默：轮询失败不影响页面 */ }
  }

  /** 水位线之后是否有新待办 → 按策略决定是否弹 */
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
      // 非工作时段：静默推进（下次登录首弹仍会汇总补上？——不，推进后不补弹，角标仍可见）
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
        duration: summary.popupDuration,
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
