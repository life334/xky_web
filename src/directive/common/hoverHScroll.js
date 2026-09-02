/**
 * v-hover-h-scroll 悬浮横向滚动条
 * Copyright (c) 2026 xky_project
 *
 * 效果：el-table 存在横向溢出（列超出可视宽度）时，鼠标悬浮在表格上，
 *       视口底部会浮出一条可拖动的横向滚动条；鼠标移开（且不在滚动条上）后自动隐藏。
 *
 * 用法：<el-table v-hover-h-scroll ...>
 *
 * 说明：
 * - 滚动条采用 fixed 定位挂到 body 上，避免被 .el-table 根元素的 overflow:hidden 裁剪，
 *   同时实现「贴视口底部」效果（表格只要在屏幕内就能看到，无需滚动页面到底部）。
 * - 读写 el-table 内部 .el-table__body-wrapper 的 scrollLeft，表头横向滚动由 el-table 内部自动联动。
 * - 该指令不影响表格高度，无需 max-height。
 */

const BAR_HEIGHT = 12   // 滚动条高度（px）
const BAR_BOTTOM = 6    // 距视口底部距离（px）
const HIDE_DELAY = 250  // 移开后延迟隐藏（ms），用于鼠标从表格移到滚动条的过渡
const THUMB_MIN_WIDTH = 30

export default {
  mounted(el) {
    // 仅对含滚动容器的 el-table 生效
    // 注意：Element Plus >= 2.5 重构后，横向滚动容器是 el-scrollbar 内部的
    // .el-scrollbar__wrap（旧版是 .el-table__body-wrapper），这里优先取新结构，兜底旧结构。
    const scroller = el.querySelector('.el-scrollbar__wrap') || el.querySelector('.el-table__body-wrapper')
    if (!scroller) return

    // 构建悬浮滚动条：轨道 + 滑块
    const bar = document.createElement('div')
    const thumb = document.createElement('div')
    bar.appendChild(thumb)

    Object.assign(bar.style, {
      position: 'fixed',
      left: '0px',
      bottom: BAR_BOTTOM + 'px',
      height: BAR_HEIGHT + 'px',
      background: 'rgba(144, 147, 153, 0.28)',
      borderRadius: (BAR_HEIGHT / 2) + 'px',
      cursor: 'pointer',
      zIndex: '2000',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity .15s ease',
      userSelect: 'none',
      touchAction: 'none'
    })
    Object.assign(thumb.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      height: '100%',
      minWidth: THUMB_MIN_WIDTH + 'px',
      background: 'rgba(144, 147, 153, 0.62)',
      borderRadius: (BAR_HEIGHT / 2) + 'px',
      pointerEvents: 'none'
    })
    document.body.appendChild(bar)

    // ---- 状态 ----
    let isHoverTable = false
    let isHoverBar = false
    let inViewport = true
    let dragging = false
    let hideTimer = null
    let scrollRaf = null

    function hasOverflow() {
      return scroller.scrollWidth > scroller.clientWidth + 1
    }

    // 同步滚动条位置 / 宽度 / 滑块尺寸与位置
    function syncGeometry() {
      const rect = scroller.getBoundingClientRect()
      const cw = scroller.clientWidth
      const sw = scroller.scrollWidth
      bar.style.left = rect.left + 'px'
      bar.style.width = rect.width + 'px'
      if (sw <= cw + 1) {
        thumb.style.width = '100%'
        thumb.style.left = '0px'
        return
      }
      const thumbW = Math.max(THUMB_MIN_WIDTH, rect.width * rect.width / sw)
      const maxLeft = rect.width - thumbW
      const ratio = cw >= sw ? 0 : scroller.scrollLeft / (sw - cw)
      thumb.style.width = thumbW + 'px'
      thumb.style.left = (ratio * maxLeft) + 'px'
    }

    function nativeBarVisible() {
      // 表格底部进入视口（表格自带横向滚动条此时可见）→ 返回 true，隐藏悬浮条避免出现两条
      const rect = el.getBoundingClientRect()
      return rect.bottom <= window.innerHeight + 1
    }

    function updateVisible() {
      const shouldShow = (isHoverTable || isHoverBar) && inViewport && hasOverflow() && !nativeBarVisible()
      bar.style.opacity = shouldShow ? '1' : '0'
      bar.style.pointerEvents = shouldShow ? 'auto' : 'none'
      if (shouldShow) syncGeometry()
    }

    function scheduleHide() {
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        if (!isHoverTable && !isHoverBar) updateVisible()
      }, HIDE_DELAY)
    }

    // ---- 事件 ----
    const onTableEnter = () => { isHoverTable = true; clearTimeout(hideTimer); updateVisible() }
    const onTableLeave = () => { isHoverTable = false; scheduleHide() }
    const onBarEnter = () => { isHoverBar = true; clearTimeout(hideTimer); updateVisible() }
    const onBarLeave = () => { isHoverBar = false; scheduleHide() }

    const onScrollerScroll = () => {
      if ((isHoverTable || isHoverBar) && inViewport) syncGeometry()
    }

    const onWindowScroll = () => {
      if (scrollRaf) return
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null
        if (isHoverTable || isHoverBar) updateVisible()
      })
    }
    const onWindowResize = () => {
      if (isHoverTable || isHoverBar) updateVisible()
    }

    // 拖动 / 点击轨道
    let dragStartX = 0
    let dragStartScrollLeft = 0

    function getThumbWidth() {
      return parseFloat(thumb.style.width) || THUMB_MIN_WIDTH
    }

    // 点击轨道空白处：滑块中心对准点击点，内容按比例跳转
    function jumpToPointer(e) {
      const rect = bar.getBoundingClientRect()
      if (rect.width <= 0) return
      const tw = getThumbWidth()
      const maxThumbMove = Math.max(1, rect.width - tw)
      let x = (e.clientX - rect.left) - tw / 2
      x = Math.max(0, Math.min(maxThumbMove, x))
      const maxScroll = scroller.scrollWidth - scroller.clientWidth
      if (maxScroll > 0) scroller.scrollLeft = (x / maxThumbMove) * maxScroll
    }

    const onPointerDown = (e) => {
      dragging = true
      dragStartX = e.clientX
      dragStartScrollLeft = scroller.scrollLeft
      if (bar.setPointerCapture) bar.setPointerCapture(e.pointerId)
      e.preventDefault()
      // 点在滑块外 → 跳转；点在滑块上 → 进入拖动
      const thumbRect = thumb.getBoundingClientRect()
      if (e.clientX < thumbRect.left || e.clientX > thumbRect.right) {
        jumpToPointer(e)
        dragStartX = e.clientX
        dragStartScrollLeft = scroller.scrollLeft
      }
    }

    const onPointerMove = (e) => {
      if (!dragging) return
      // 相对增量拖动：鼠标移动多少、滑块跟多少（1:1），内容按比例滚动，避免「拉一大截才滚一点」
      const deltaX = e.clientX - dragStartX
      const rect = bar.getBoundingClientRect()
      const tw = getThumbWidth()
      const maxThumbMove = Math.max(1, rect.width - tw)
      const maxScroll = scroller.scrollWidth - scroller.clientWidth
      scroller.scrollLeft = dragStartScrollLeft + deltaX * (maxScroll / maxThumbMove)
    }
    const onPointerUp = (e) => {
      dragging = false
      if (bar.hasPointerCapture && bar.hasPointerCapture(e.pointerId)) bar.releasePointerCapture(e.pointerId)
    }

    el.addEventListener('mouseenter', onTableEnter)
    el.addEventListener('mouseleave', onTableLeave)
    bar.addEventListener('mouseenter', onBarEnter)
    bar.addEventListener('mouseleave', onBarLeave)
    bar.addEventListener('pointerdown', onPointerDown)
    bar.addEventListener('pointermove', onPointerMove)
    bar.addEventListener('pointerup', onPointerUp)
    bar.addEventListener('pointercancel', onPointerUp)
    scroller.addEventListener('scroll', onScrollerScroll, { passive: true })
    // 滚动监听：fixedHeader 布局下真正滚动的是 .app-main（overflow-y:auto）等内部容器，
    // 而非 window。scroll 事件不冒泡，用 document 捕获阶段统一监听内部容器滚动，
    // window 监听兜底“页面整体滚动”场景（如 fixedHeader=false 或表格直接铺在 body 下）。
    window.addEventListener('scroll', onWindowScroll, { passive: true })
    document.addEventListener('scroll', onWindowScroll, true)
    window.addEventListener('resize', onWindowResize)

    // 表格进出视口
    let io = null
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        inViewport = !!(entries[0] && entries[0].isIntersecting)
        updateVisible()
      })
      io.observe(el)
    }

    // 列宽 / 数据变化引起尺寸变化
    let ro = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        if ((isHoverTable || isHoverBar) && inViewport) syncGeometry()
      })
      ro.observe(scroller)
      ro.observe(el)
    }

    syncGeometry()

    // ---- 清理 ----
    el.__hoverHScrollCleanup = () => {
      clearTimeout(hideTimer)
      if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = null }
      el.removeEventListener('mouseenter', onTableEnter)
      el.removeEventListener('mouseleave', onTableLeave)
      bar.removeEventListener('mouseenter', onBarEnter)
      bar.removeEventListener('mouseleave', onBarLeave)
      bar.removeEventListener('pointerdown', onPointerDown)
      bar.removeEventListener('pointermove', onPointerMove)
      bar.removeEventListener('pointerup', onPointerUp)
      bar.removeEventListener('pointercancel', onPointerUp)
      scroller.removeEventListener('scroll', onScrollerScroll)
      window.removeEventListener('scroll', onWindowScroll)
      document.removeEventListener('scroll', onWindowScroll, true)
      window.removeEventListener('resize', onWindowResize)
      if (io) io.disconnect()
      if (ro) ro.disconnect()
      if (bar.parentNode) bar.parentNode.removeChild(bar)
    }
  },

  unmounted(el) {
    if (el.__hoverHScrollCleanup) {
      el.__hoverHScrollCleanup()
      el.__hoverHScrollCleanup = null
    }
  }
}
