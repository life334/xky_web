import { reactive } from 'vue'

/**
 * 路由切换内容区加载遮罩状态
 * 由 permission.js 的 beforeEach / afterEach 驱动：
 *  - 懒加载 chunk 下载 / 权限刷新期间 startRouteLoading() 置 show=true
 *  - 导航完成后 finishRouteLoading() 隐藏（带淡出与防闪烁处理）
 */
export const routeLoading = reactive({ show: false })

let shownAt = 0

export function startRouteLoading() {
  if (!routeLoading.show) {
    routeLoading.show = true
    shownAt = Date.now()
  }
}

export function finishRouteLoading() {
  // 导航极快（<200ms）直接隐藏，避免遮罩闪烁干扰操作
  if (Date.now() - shownAt < 200) {
    routeLoading.show = false
    return
  }
  // 保留一小段让淡出过渡可见，避免生硬消失
  setTimeout(() => {
    routeLoading.show = false
  }, 150)
}
