<template>
  <!-- ⚠️ Teleport 到 body：Navbar.vue 用 <el-tooltip content="消息通知"> 把整个 header-notice 包了起来，
       弹卡若留在组件内部，就等于长在 tooltip 的触发区里 —— 鼠标移到弹卡任意位置都会冒出「消息通知」，
       既挡内容又干扰操作。弹卡本身是 position:fixed（top/right 相对视口），挂到 body 后位置完全不变。 -->
  <Teleport to="body">
    <transition name="popup-slide">
      <div v-if="visible" class="auto-popup" @mouseenter="hoverPause = true" @mouseleave="hoverPause = false">
        <!-- 指向铃铛的小箭头：让卡片看起来"从铃铛里弹出来"，而不是凭空出现 -->
        <svg class="ap-arrow" width="14" height="8" viewBox="0 0 14 8">
          <path d="M7 0 L14 8 L0 8 Z" fill="#fff" />
          <path d="M7 0 L14 8 M7 0 L0 8" fill="none" stroke="#e4e7ed" stroke-width="1" />
        </svg>

        <div class="ap-head">
          <svg class="ap-bell" width="17" height="17" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2a1.4 1.4 0 011.4 1.4v1.3a7.6 7.6 0 016.2 7.5v3.5l1.3 2a1.4 1.4 0 01-1.2 2.1H4.3A1.4 1.4 0 013.1 17.8l1.3-2v-3.5a7.6 7.6 0 016.2-7.5V3.4A1.4 1.4 0 0112 2zm-3.6 17.2h7.2a3.6 3.6 0 01-7.2 0z" />
          </svg>
          <span class="ap-title">{{ mode === 'digest' ? '今日待处理' : '新增待处理' }}</span>
          <!-- 分类计数：待办与预警混在一个总数里，用户得进面板才知道"到底是哪类多" -->
          <span v-if="todoCount" class="ap-pill is-todo">待办 {{ todoCount }}</span>
          <span v-if="alertCount" class="ap-pill is-alert">预警 {{ alertCount }}</span>
          <span class="ap-head-gap"></span>

          <!-- 钉住：悬停只暂停计时，移开又会继续；用户需要的是"让它别消失" -->
          <el-tooltip :content="pinned ? '取消固定' : '固定（不自动关闭）'" placement="bottom">
            <button type="button" class="ap-icon-btn" :class="{ on: pinned }" @click="pinned = !pinned">
              <svg width="13" height="13" viewBox="0 0 13 13">
                <path fill="none" stroke="currentColor" stroke-width="1.2" d="M4.5 1.5h4l-1 4 2 3.5h-6l2-3.5z" />
              </svg>
            </button>
          </el-tooltip>
          <el-tooltip content="关闭（Esc）" placement="bottom">
            <button type="button" class="ap-icon-btn is-close" @click="close">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path fill="none" stroke="currentColor" stroke-width="1.6" d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
              </svg>
            </button>
          </el-tooltip>
        </div>

        <div class="ap-list">
          <div
            v-for="(it, idx) in shownItems"
            :key="it.id"
            class="ap-item"
            :class="itemClass(it)"
            :style="{ animationDelay: idx * 40 + 'ms' }"
            @click="go(it)"
          >
            <div class="ap-item-main">
              <div class="ap-item-title">
                <svg v-if="it.priority === 'high'" class="ap-item-warn" width="12" height="12" viewBox="0 0 12 12">
                  <path fill="currentColor" d="M6 1l5 9H1z" />
                </svg>
                {{ it.title }}
              </div>
              <div class="ap-item-sub">
                <!-- 待办与预警同卡展示：必须标明具体类型，否则"合同待签署"和"未关联合同预警"容易看混 -->
                <span class="ap-item-kind" :class="it.notifyType === 'alert' ? 'is-alert' : 'is-todo'">{{ kindText(it) }}</span>
                {{ it.projectName || it.projectCode || '' }}
              </div>
              <div class="ap-item-time">{{ fromNow(it.createTime) }}</div>
            </div>
            <!-- 忽略：平时隐藏、悬停该条才淡出圆形按钮，避免每条都挂个"忽略"文字造成视觉噪音 -->
            <el-tooltip content="忽略该项" placement="left">
              <button type="button" class="ap-item-ignore" @click.stop="ignore(it)">
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path fill="none" stroke="currentColor" stroke-width="1.4" d="M2 2l6 6M8 2l-6 6" />
                </svg>
              </button>
            </el-tooltip>
          </div>
          <!-- 文案修正：原「…等 N 项」会被误读为"还剩 N 条"，实际 N 是总数 -->
          <div v-if="items.length > MAX_SHOWN" class="ap-more">另有 {{ items.length - MAX_SHOWN }} 项，点击查看全部</div>
        </div>

        <div class="ap-foot">
          <span class="ap-foot-btn primary" @click="view">查看全部</span>
          <span class="ap-foot-btn warn" :title="bulkTitle" @click="ignoreAll">{{ bulkLabel }}</span>
          <span class="ap-foot-gap"></span>
          <span class="ap-mute-today" @click="muteToday">今日不再自动弹出</span>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
/**
 * 自动弹出汇总卡（非模态，不抢焦点）
 *
 * - 倒计时自动收起；鼠标悬停暂停；「固定」后彻底不自动关闭；Esc 可关
 * - 点击某一条 → <b>直接跳到该条的落地页</b>（与点击意图一致；旧版只打开面板，
 *   用户还得在列表里再找一遍，等于白点）
 * - 每条右侧 ✕ → 直接忽略；底部「忽略全部」→ 整类批量忽略（上百条时逐条点不现实）
 * - 顶部箭头指向铃铛，建立视觉关联
 *
 * ⚠️ 尺寸与字号按"清单"而非"气泡"设计：旧版标题 12.5px / 副标题 11px 在 1080p 与
 * 缩放屏上偏小，关闭图标用 #c0c4cc 几乎看不见 —— 这是用户直接反馈的两个问题。
 */
import { fromNow } from '@/utils/timeAgo'

const props = defineProps({
  // 打开通知面板用
  onView: { type: Function, default: () => {} },
  // 点击单条：直接跳该条落地页（复用面板的 goItem）
  onGoItem: { type: Function, default: () => {} },
  // 忽略单条
  onIgnore: { type: Function, default: () => {} },
  // 批量忽略：传出 { notifyType, all } 或 { ids }
  onIgnoreAll: { type: Function, default: () => {} },
  onMuteToday: { type: Function, default: () => {} }
})

/** 同屏最多展示条目，超出内部滚动（旧版只露 3 条，5 条是"一屏能扫完"的上限） */
const MAX_SHOWN = 5

const visible = ref(false)
const items = ref([])
/** 'digest' = 登录首屏的今日待处理摘要；'new' = 轮询发现的新增项 */
const mode = ref('new')
const hoverPause = ref(false)
const pinned = ref(false)
let durationMs = 8000
let remainMs = 8000
let tickTimer = null
let lastTick = 0

const shownItems = computed(() => items.value.slice(0, MAX_SHOWN))
const todoCount = computed(() => items.value.filter(i => i.notifyType !== 'alert').length)
const alertCount = computed(() => items.value.length - todoCount.value)
/**
 * 自动关闭的定时行为（环形倒计时 UI 已移除，定时逻辑保留）
 *
 * <p>默认 8 秒后自动收起，有紧急项时 ×2；鼠标悬停暂停计时、移开继续；
 * 点「固定」后彻底不自动关闭。这几条都还在，只是不再用 SVG 环把剩余秒数画出来。</p>
 */

/** 类型文案：待办按 todo_kind、预警按 biz_type（与通知面板同一套口径） */
const KIND_TEXT = {
  doc: '资料登记', settle: '结算录入', contract: '合同签署',
  alert_debt: '欠款逾期', alert_overdue: '工期超期', alert_contract_missing: '未关联合同'
}
function kindText(it) {
  if (!it) return ''
  if (it.notifyType === 'alert') return KIND_TEXT[it.bizType] || '预警'
  return KIND_TEXT[it.todoKind] || '待办'
}

/** 左侧色条 + 底色：一眼区分待办/预警与紧急程度（不只靠一个小图标） */
function itemClass(it) {
  if (!it) return ''
  if (it.notifyType === 'alert') return it.priority === 'high' ? 'is-alert is-high' : 'is-alert'
  return it.priority === 'high' ? 'is-todo is-high' : 'is-todo'
}

/**
 * 「忽略全部」的语义必须与按钮文案一致 —— 这是本卡片唯一会影响到卡外数据的操作：
 * - 卡里只有预警 → 整类忽略全部未处理预警（all: true），可能多于卡里显示的条数
 * - 卡里只有待办 → 整类忽略全部未完成待办
 * - 两种都有 → 只忽略卡里这批（ids），不做跨类型的一次性清空
 */
const bulkLabel = computed(() => {
  if (alertCount.value > 0 && todoCount.value === 0) return '忽略全部预警'
  if (todoCount.value > 0 && alertCount.value === 0) return '忽略全部待办'
  return `忽略这 ${items.value.length} 条`
})
const bulkTitle = computed(() => {
  if (alertCount.value > 0 && todoCount.value === 0) return '忽略当前全部未处理预警（含未显示在卡里的）'
  if (todoCount.value > 0 && alertCount.value === 0) return '忽略当前全部未完成待办（含未显示在卡里的）'
  return '忽略本卡列出的这些条目'
})
const bulkPayload = computed(() => {
  if (alertCount.value > 0 && todoCount.value === 0) return { notifyType: 'alert', all: true }
  if (todoCount.value > 0 && alertCount.value === 0) return { notifyType: 'todo', all: true }
  return { ids: items.value.map(i => i.id) }
})

function show(list, opts = {}) {
  items.value = list || []
  mode.value = opts.mode === 'digest' ? 'digest' : 'new'
  durationMs = Math.max(2, (opts.duration || 8)) * 1000
  remainMs = durationMs
  visible.value = true
  // 每次弹出都是新一批内容：固定状态不跨批次保留
  pinned.value = false
  hoverPause.value = false
  clearInterval(tickTimer)
  lastTick = Date.now()
  tickTimer = setInterval(() => {
    if (pinned.value || hoverPause.value) { lastTick = Date.now(); return }
    const now = Date.now()
    remainMs -= (now - lastTick)
    lastTick = now
    if (remainMs <= 0) { close(); return }
  }, 100)
}

function close() {
  clearInterval(tickTimer)
  tickTimer = null
  visible.value = false
  pinned.value = false
}

/** 点单条 → 跳该条落地页（与面板内"去处理"完全一致） */
function go(it) {
  close()
  props.onGoItem && props.onGoItem(it)
}

function view() {
  close()
  // 把本批内容回传：面板据此决定落在「待办」还是「预警」页签
  props.onView && props.onView(items.value)
}

function ignore(it) {
  // 不关卡片：由父组件忽略成功后调 removeItem 逐条摘除，最后一条没了再自动关闭。
  props.onIgnore && props.onIgnore(it)
}

function ignoreAll() {
  props.onIgnoreAll && props.onIgnoreAll(bulkPayload.value)
}

/**
 * 移除已忽略的一条（父组件忽略成功后调用）。
 * 卡片会随剩余条数变少而收起；全部摘除后自动关闭，用户能直接看到"忽略了就没了"。
 */
function removeItem(id) {
  items.value = items.value.filter(i => i.id !== id)
  if (items.value.length === 0) close()
}

function muteToday() {
  props.onMuteToday && props.onMuteToday()
  close()
}

/** Esc 关闭：弹卡是浮层且可能挡住右上角，键盘可达性上是必要的出口 */
function onKeydown(e) {
  if (!visible.value || e.key !== 'Escape') return
  // 页面上有输入框/弹窗时优先让它们响应 Esc，不抢事件
  const tag = (document.activeElement && document.activeElement.tagName) || ''
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  clearInterval(tickTimer)
})

defineExpose({ show, close, removeItem })
</script>

<style lang="scss" scoped>
.auto-popup {
  position: fixed;
  top: 54px;
  right: 20px;
  width: 380px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #ebeef5;
  // 低于 el-dialog（Element Plus 从 2000 起动态分配），避免盖住业务弹窗
  z-index: 1900;
  overflow: hidden;
  cursor: default;
}
/* 箭头：指向右上方的铃铛（旧版是旋转 45° 的方块，边缘毛刺明显） */
.ap-arrow {
  position: absolute;
  top: -8px;
  right: 24px;
}

/* ---------------- 头部 ---------------- */
.ap-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 14px 11px;
  border-bottom: 1px solid #f2f4f7;
  .ap-bell { flex-shrink: 0; color: var(--el-color-primary); }
  .ap-title { font-size: 15px; font-weight: 600; color: #303133; }
  .ap-head-gap { flex: 1; }
}
.ap-pill {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 18px;
  padding: 0 8px;
  border-radius: 999px;
  &.is-todo { color: #2b7cc1; background: #eef5fb; }
  &.is-alert { color: #a8731a; background: #fdf6ec; }
}
/* 圆形图标按钮：旧版是 14px 的 #c0c4cc 图标，默认几乎看不见 */
.ap-icon-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid #e4e7ed;
  border-radius: 50%;
  background: #fff;
  color: #606266;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { color: #303133; border-color: #c0c4cc; background: #f2f4f7; }
  &.on { color: var(--el-color-primary); border-color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
  &.is-close:hover {
    color: #fff;
    border-color: var(--el-color-danger);
    background: var(--el-color-danger);
  }
}

/* ---------------- 列表 ---------------- */
.ap-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0 6px;
}
.ap-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 14px;
  border-left: 3px solid transparent;
  cursor: pointer;
  animation: ap-item-in 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  &:hover { background: #f5f8fb; }
  /* 左侧色条：待办蓝 / 预警琥珀，紧急项整条淡红底 */
  &.is-todo { border-left-color: #409eff; }
  &.is-alert { border-left-color: #e6a23c; }
  &.is-high { background: #fffafa; &:hover { background: #fff5f5; } }
  .ap-item-main { flex: 1; min-width: 0; }
  .ap-item-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    line-height: 1.4;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .ap-item-warn { flex-shrink: 0; color: #f56c6c; }
  .ap-item-sub {
    margin-top: 3px;
    font-size: 13px;
    color: #606266;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .ap-item-time { margin-top: 2px; font-size: 11.5px; color: #a8abb2; }
  /* 类型标签：待办/预警同卡展示时的区分解 */
  .ap-item-kind {
    display: inline-block;
    margin-right: 5px;
    padding: 0 5px;
    border-radius: 3px;
    font-size: 11px;
    line-height: 16px;
    vertical-align: 1px;
    &.is-todo { color: #2b7cc1; background: #eef5fb; }
    &.is-alert { color: #a8731a; background: #fdf6ec; }
  }
  /* 忽略：平时隐藏，悬停该条才出现（旧版是常驻的"忽略"文字，满屏文字按钮太吵） */
  .ap-item-ignore {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-top: 4px;
    border: 1px solid transparent;
    border-radius: 50%;
    background: transparent;
    color: #c0c4cc;
    cursor: pointer;
    transition: opacity 0.15s, background 0.15s, color 0.15s;
    &:hover { color: #f56c6c; border-color: #fde2e2; background: #fef0f0; }
  }
}
/* 只在支持悬停的设备上"平时隐藏"：触摸屏没有 hover，隐藏等于永远点不到忽略 */
@media (hover: hover) {
  .ap-item .ap-item-ignore { opacity: 0; }
  .ap-item:hover .ap-item-ignore { opacity: 1; }
}
.ap-more { font-size: 12px; color: #a8abb2; padding: 4px 14px 2px; }

/* ---------------- 底部 ---------------- */
.ap-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-top: 1px solid #f2f4f7;
  background: #fafbfc;
  .ap-foot-gap { flex: 1; }
}
.ap-foot-btn {
  flex-shrink: 0;
  font-size: 13px;
  padding: 4px 9px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  &.primary {
    color: var(--el-color-primary);
    font-weight: 600;
    &:hover { background: var(--el-color-primary-light-9); }
  }
  &.warn {
    color: #d48806;
    &:hover { background: #fdf6ec; }
  }
}
.ap-mute-today {
  flex-shrink: 0;
  font-size: 11.5px;
  color: #c0c4cc;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  &:hover { color: #909399; background: #f2f4f7; }
}

@keyframes ap-item-in {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: none; }
}

.popup-slide-enter-active { transition: all 0.32s cubic-bezier(0.16, 1, 0.3, 1); }
.popup-slide-leave-active { transition: all 0.22s ease; }
.popup-slide-enter-from,
.popup-slide-leave-to { opacity: 0; transform: translate(14px, -10px) scale(0.96); }
</style>
