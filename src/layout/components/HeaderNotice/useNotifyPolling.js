import { reactive, ref } from 'vue'
import useUserStore from '@/store/modules/user'
import { notifySummary, notifyIncrement, notifyOpen } from '@/api/project/notify'

/**
 * 通知轮询 composable
 *
 * 弹出策略（三条通道，互不重叠）：
 * 1. 进入系统首屏「待处理摘要」：进入系统 2s 后弹一次**当前全部**未完成待办 + 未处理预警。
 *    这是"上班先知道今天要办什么"的提醒，不依赖用户去点铃铛。
 *    节流：**每次进入系统弹一次**（会话级）。关掉标签页/重开浏览器 = 新会话 = 再弹一次；
 *    同一标签页内 F5 刷新不再重复弹（否则每刷新一次弹一次，属于打扰）。
 *    ⚠️ 触发点是主界面挂载，与"是否走了登录页"无关 —— 免登录（记住登录态）直接进系统同样会触发。
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
  /** 上次问过 /open 的时间戳：空结果不写标记，靠它自己节流（避免 30s 轮询把带写操作的接口打爆） */
  let lastDigestTryAt = 0
  /** 空结果后的重试间隔：10 分钟。够快（9 点扫出的预警 10 分钟内能补弹），又不至于高频写库 */
  const DIGEST_RETRY_MS = 10 * 60 * 1000

  const userKey = () => {
    try {
      const name = useUserStore().name
      return name ? String(name) : 'me'
    } catch (e) { return 'me' }
  }
  const LS_LAST_ID = () => `notify:lastId:${userKey()}`
  const LS_NO_POPUP_TODAY = () => `notify:noPopup:${userKey()}`
  // ⚠️ 摘要标记只有会话级（sessionStorage），没有天级（localStorage）。
  // 旧实现在 localStorage 里记"今天弹过了"，导致一天只弹一次：早上有数据弹过、下午再登录就不弹，
  // 用户会以为功能坏了。现改为"每次进入系统弹一次"。
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

  /**
   * 本次「进入系统」是否已弹过摘要（仅会话级）
   *
   * <p>存 todayStr 而非 true：页面开着跨过零点时，标记自动失效，新的一天会再弹一次。</p>
   */
  function digestDone() {
    try {
      return sessionStorage.getItem(SS_DIGEST_DATE()) === todayStr()
    } catch (e) { return false }
  }
  function markDigestDone() {
    digestHandled = true
    try {
      sessionStorage.setItem(SS_DIGEST_DATE(), todayStr())
    } catch (e) { /* 隐私模式等场景忽略 */ }
  }

  /** 高风险项双击停留时长（配置说明里承诺的"高风险自动 x2"） */
  const popupDurationFor = items => {
    const hasHigh = (items || []).some(i => i.priority === 'high')
    return Math.max(2, summary.popupDuration || 8) * (hasHigh ? 2 : 1)
  }

  /**
   * 进入系统首屏「待处理摘要」
   *
   * <p>触发条件：本次会话未弹过 && 开关开启 && 今日未点"不再弹" && 当前在窗口期。
   * 非窗口期直接 return（不标记），留给后续轮询补弹。</p>
   *
   * <p>⚠️ 关键修正：<b>只有真的弹出内容才写标记</b>。旧实现是"调用成功就写当天标记"，
   * 于是早上 7:50 登录（那时一条待办都没有）会把当天标记写死，9 点扫描出的预警再也弹不出来。
   * 空结果改为由 lastDigestTryAt 自行节流（10 分钟一问），既保证补弹，又不至于被 30s 轮询打爆
   * —— /open 内部带 sweep 写操作，不能当只读接口高频调用。</p>
   */
  async function tryDigest() {
    if (digestHandled || digestInFlight) return
    if (digestDone()) { digestHandled = true; return }
    if (!summary.popupEnabled) { digestHandled = true; return }
    if (noPopupToday()) return
    if (!summary.allowPopup) return
    if (Date.now() - lastDigestTryAt < DIGEST_RETRY_MS) return

    digestInFlight = true
    try {
      const res = await notifyOpen()
      // ⚠️ 响应体解包铁律：Array 判空兜底
      const items = Array.isArray(res && res.data) ? res.data : []
      lastDigestTryAt = Date.now()
      if (items.length === 0) {
        // 进入系统时还没有待办/预警：不写标记，10 分钟后再问一次（等扫描出预警时能补上）
        return
      }
      markDigestDone()
      lastPopupAt.value = Date.now()
      popup && popup(items, {
        mode: 'digest',
        duration: popupDurationFor(items),
        noPopupToday,
        setNoPopupToday
      })
      // open 接口内部跑过 sweep（业务已完成的待办会转 done），角标需要跟着更新
      refreshSummary()
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
