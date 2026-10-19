import router from './router'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { startRouteLoading, finishRouteLoading } from '@/utils/route-loading'
import { getToken } from '@/utils/auth'
import { isHttp, isPathMatch } from '@/utils/validate'
import { isRelogin } from '@/utils/request'
import useUserStore from '@/store/modules/user'
import useLockStore from '@/store/modules/lock'
import useSettingsStore from '@/store/modules/settings'
import usePermissionStore from '@/store/modules/permission'
import auth from '@/plugins/auth'
import { DASHBOARD_PERM } from '@/utils/perm'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/register']

/**
 * 静态路由（constantRoutes）的权限门禁表。
 *
 * 背景：/index 定义在 router/index.js 的 constantRoutes 中，不参与后端菜单授权，
 * 任何登录用户都能直接进入首页驾驶舱；而左侧菜单是否显示「首页」由 sys_menu 授权决定
 * ⇒ 出现「菜单里没有首页、登录后却直接落在首页」的越权现象。
 *
 * 这里按路径显式登记所需权限码（后端接口同步加了 @PreAuthorize，见 ProjDashboardController），
 * 未授权时统一回落到「该用户第一个有权限的菜单」。
 */
const ROUTE_PERMS = {
  '/index': DASHBOARD_PERM
}

/**
 * 取当前用户菜单里第一个可访问的页面路径（深度优先，跳过隐藏项与外链）。
 * 用于无权限时的落地页兜底：管理员落在首页，档案管理员落在资料管理。
 */
function firstAccessiblePath(routes, basePath) {
  const list = routes || []
  const base = basePath || ''
  for (const r of list) {
    if (r.hidden) {
      continue
    }
    const p = r.path || ''
    if (isHttp(p)) {
      continue
    }
    const full = p.startsWith('/') ? p : (base ? base.replace(/\/+$/, '') + '/' + p : p)
    if (r.children && r.children.length) {
      const sub = firstAccessiblePath(r.children, full)
      if (sub) {
        return sub
      }
    } else if (r.component) {
      return full
    }
  }
  return ''
}

const isWhiteList = (path) => {
  return whiteList.some(pattern => isPathMatch(pattern, path))
}

router.beforeEach(async (to, from) => {
  NProgress.start()
  startRouteLoading()
  if (getToken()) {
    to.meta.title && useSettingsStore().setTitle(to.meta.title)
    const isLock = useLockStore().isLock
    if (to.path === '/login') {
      NProgress.done()
      return { path: '/' }
    }
    if (isWhiteList(to.path)) {
      return true
    }
    if (isLock && to.path !== '/lock') {
      NProgress.done()
      return { path: '/lock' }
    }
    if (!isLock && to.path === '/lock') {
      NProgress.done()
      return { path: '/' }
    }
    if (useUserStore().roles.length === 0) {
      isRelogin.show = true
      try {
        // 拉取user_info信息
        await useUserStore().getInfo()
        isRelogin.show = false
        // 根据roles权限生成可访问的路由
        const accessRoutes = await usePermissionStore().generateRoutes()
        accessRoutes.forEach(route => {
          if (!isHttp(route.path)) {
            router.addRoute(route)
          }
        })
        // 重新导航到目标路由，确保动态路由已注册
        return { ...to, replace: true }
      } catch (err) {
        await useUserStore().logOut()
        ElMessage.error(err)
        return { path: '/login' }
      }
    }

    // ===== 静态路由权限门禁 / 登录后落地页兜底 =====
    // 执行到这里说明 generateRoutes() 已完成，sidebarRouters 才是当前用户完整的菜单树。
    // 注意：router.push('/') 的 redirect:'/index' 在守卫之前就已完成，
    //       所以登录落地时守卫看到的 to.path 已是 '/index'，两种情况在这里统一处理。
    const needPerm = ROUTE_PERMS[to.path]
    if (needPerm && !auth.hasPermi(needPerm)) {
      const landing = firstAccessiblePath(usePermissionStore().sidebarRouters)
      if (landing && landing !== to.path) {
        return { path: landing, replace: true }
      }
      return { path: '/401', replace: true }
    }
    return true
  } else {
    // 没有token
    if (isWhiteList(to.path)) {
      // 在免登录白名单，直接进入
      return true
    }
    NProgress.done()
    return `/login?redirect=${to.fullPath}` // 否则全部重定向到登录页
  }
})

router.afterEach(() => {
  NProgress.done()
  finishRouteLoading()
})

// 兜底：导航过程中若抛出异常（守卫报错 / 懒加载 chunk 失败等），
// afterEach 可能不执行，这里强制收尾，避免内容区加载遮罩永久停留导致「页面一直转圈」
router.onError(() => {
  NProgress.done()
  finishRouteLoading()
})
