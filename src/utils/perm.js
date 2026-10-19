/**
 * 全局权限码常量（前后端共用，后端见对应 @PreAuthorize 注解）。
 *
 * 单独成文件的原因：这些常量会被 permission.js（路由守卫）与 layout 下的组件
 * （如 Breadcrumb）同时引用，若放在 permission.js 里导出，会造成
 * layout → 组件 → permission.js → router → layout 的循环依赖，
 * 触发 `router` 的 TDZ 报错。此文件无任何依赖，可安全被任意模块引用。
 */

/** 首页驾驶舱：后端 ProjDashboardController 全部接口 */
export const DASHBOARD_PERM = 'project:dashboard:view'
