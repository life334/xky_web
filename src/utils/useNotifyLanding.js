import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * 通知中心「跳转定位」统一处理。
 *
 * 背景：待办/消息点击时，前端按后端下发的 routePath + routeQuery（形如
 * `projectCode=xxx&from=notify` / `contractNo=xxx&from=notify`）router.push 到落地页；
 * 落地页需据参数自动定位（筛选工程编号 / 打开合同详情等）。
 *
 * 旧实现把「读参数 + 查询」写成 setup 顶层一次性执行，存在两个问题：
 *   ① 双请求竞态：setup 里先无条件 getList()（无筛选），落地块再 handleQuery()（带筛选），
 *      两个并发请求谁后返回谁覆盖表格 ⇒ 偶发「筛选失效、显示全量」；
 *   ② 页面被 keep-alive 复用时 setup 不重跑 ⇒ 再次点待办不生效。
 *
 * 本 composable 统一解决：
 *   - 调用方在「首次查询之前」调用一次 applyNotifyLanding()，先把落地参数设好，再只发一次查询；
 *   - 注册 route.fullPath 监听作为兜底：同路径再次进入（组件复用、setup 不重跑）时重新定位；
 *   - 命中后清理 URL 上的 `from=notify`（及 clearKeys 指定的 payload 键），避免刷新/再次进入重复触发；
 *   - 仅当「当前路径 == 本页路径」时才处理，避免 keep-alive 缓存导致其它页的监听器误触发。
 *
 * @param {Object}   opts
 * @param {(q: Record<string,string>) => (boolean|void)} opts.apply
 *        命中 from=notify 时调用（幂等：只设参数/触发定位，不要在这里发列表查询）。
 *        返回 false 表示「本次未处理」，将不清理 URL。
 * @param {string[]} [opts.clearKeys] 命中后额外从 URL 清除的参数名（payload 键，如 projectCode/contractNo/contractId）。
 * @param {() => void} [opts.onReenter]
 *        兜底命中（同路径再次进入）时的查询回调；首挂载不会调用，由调用方自行查询。
 * @returns {{ applyNotifyLanding: () => boolean }}
 */
export function useNotifyLanding({ apply, clearKeys = [], onReenter } = {}) {
   const route = useRoute()
   const router = useRouter()
   // setup 执行时「当前路由」即本页路由 ⇒ 天然取到本页路径，无需硬编码
   const ownPath = route.path
   // 记录已处理过的 fullPath：防止「清理 URL 的 replace 尚未生效」的窗口内被重复处理
   let lastHandledPath = null

   /** 清掉 URL 上的 from=notify（及 payload 键），保留其它参数（如首页下钻参数） */
   function clearNotifyQuery() {
      const rest = { ...(route.query || {}) }
      delete rest.from
      clearKeys.forEach(k => delete rest[k])
      router.replace({ path: route.path, query: rest })
   }

   /** 读取当前 URL，命中 from=notify 时执行 apply；命中则清理 URL。返回是否命中处理。 */
   function applyNotifyLanding() {
      // 仅处理本页；keep-alive 缓存下其它页的监听器仍会触发，此处一律跳过
      if (route.path !== ownPath) return false
      const q = route.query || {}
      if (q.from !== 'notify') { lastHandledPath = null; return false }
      const fullPath = route.fullPath
      if (fullPath === lastHandledPath) return false
      lastHandledPath = fullPath
      const handled = apply(q) !== false
      if (handled) clearNotifyQuery()
      return handled
   }

   // 兜底：同路径再次进入（组件被 keep-alive 复用、setup 不重跑）时也能重新定位。
   // 首挂载时该监听器不会立即触发（初始定位由调用方手动调用 applyNotifyLanding 完成），避免重复。
   watch(() => route.fullPath, () => {
      if (applyNotifyLanding()) {
         if (typeof onReenter === 'function') onReenter()
      }
   })

   return { applyNotifyLanding }
}
