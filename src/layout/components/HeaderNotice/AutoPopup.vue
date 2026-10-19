<template>
  <transition name="popup-slide">
    <div v-if="visible" class="auto-popup" @mouseenter="hoverPause = true" @mouseleave="hoverPause = false">
      <!-- 指向铃铛的小箭头：让卡片看起来"从铃铛里弹出来"，而不是凭空出现 -->
      <span class="ap-arrow"></span>

      <div class="ap-head">
        <span class="ap-title">
          <el-icon class="ap-bell"><BellFilled /></el-icon>
          <template v-if="mode === 'digest'">今日待处理 <b>{{ items.length }}</b> 项</template>
          <template v-else>新增 <b>{{ items.length }}</b> 项待处理</template>
        </span>
        <div class="ap-head-act">
          <!-- 钉住：悬停只暂停计时，移开又会继续；用户需要的是"让它别消失" -->
          <el-tooltip :content="pinned ? '取消固定' : '固定（不自动关闭）'" placement="bottom">
            <el-icon class="ap-icon-btn" :class="{ on: pinned }" @click="pinned = !pinned"><Paperclip /></el-icon>
          </el-tooltip>
          <el-icon class="ap-icon-btn" @click="close"><Close /></el-icon>
        </div>
      </div>

      <div class="ap-list">
        <div v-for="it in items.slice(0, 3)" :key="it.id" class="ap-item" @click="go(it)">
          <div class="ap-item-main">
            <span class="ap-item-title">
              <el-icon v-if="it.priority === 'high'" class="ap-item-warn"><WarningFilled /></el-icon>
              {{ it.title }}
            </span>
            <span class="ap-item-sub">
              <!-- 待办与预警同卡展示：必须标明类型，否则"合同待签署"和"未关联合同预警"容易看混 -->
              <span class="ap-item-kind" :class="it.notifyType === 'alert' ? 'is-alert' : 'is-todo'">
                {{ it.notifyType === 'alert' ? '预警' : '待办' }}
              </span>
              {{ it.projectName || it.projectCode || '' }}
            </span>
          </div>
          <!-- 弹出卡上直接忽略（打开面板并展开该条的原因输入框，复用同一套行内交互） -->
          <span class="ap-item-ignore" title="忽略该项" @click.stop="ignore(it)">忽略</span>
        </div>
        <!-- 文案修正：原「…等 N 项」会被误读为"还剩 N 条"，实际 N 是总数 -->
        <div v-if="items.length > 3" class="ap-more">另有 {{ items.length - 3 }} 项，点击查看全部</div>
      </div>

      <div class="ap-foot">
        <span class="ap-view" @click="view">查看全部</span>
        <span class="ap-mute-today" @click="muteToday">今日不再自动弹出</span>
      </div>

      <div class="ap-progress" :style="{ width: progress + '%' }"></div>
    </div>
  </transition>
</template>

<script setup>
/**
 * 自动弹出汇总卡（非模态，不抢焦点）
 *
 * - 倒计时进度条自动收起；鼠标悬停暂停；「固定」后彻底不自动关闭
 * - 点击某一条 → <b>直接跳到该条的落地页</b>（与点击意图一致；旧版只打开面板，
 *   用户还得在列表里再找一遍，等于白点）
 * - 每条右侧「忽略」→ 打开通知面板并展开该条的原因输入框（复用行内忽略，不弹模态）
 * - 顶部箭头指向铃铛，建立视觉关联
 */
const props = defineProps({
  // 打开通知面板用
  onView: { type: Function, default: () => {} },
  // 点击单条：直接跳该条落地页（复用面板的 goItem）
  onGoItem: { type: Function, default: () => {} },
  // 忽略单条：打开面板并展开该条忽略输入框
  onIgnore: { type: Function, default: () => {} },
  onMuteToday: { type: Function, default: () => {} }
})

const visible = ref(false)
const items = ref([])
/** 'digest' = 登录首屏的今日待处理摘要；'new' = 轮询发现的新增项 */
const mode = ref('new')
const hoverPause = ref(false)
const pinned = ref(false)
const progress = ref(100)
let durationMs = 8000
let remainMs = 8000
let tickTimer = null
let lastTick = 0

function show(list, opts = {}) {
  items.value = list || []
  mode.value = opts.mode === 'digest' ? 'digest' : 'new'
  durationMs = Math.max(2, (opts.duration || 8)) * 1000
  remainMs = durationMs
  progress.value = 100
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
    progress.value = Math.max(0, (remainMs / durationMs) * 100)
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
  close()
  props.onIgnore && props.onIgnore(it)
}

function muteToday() {
  props.onMuteToday && props.onMuteToday()
  close()
}

onBeforeUnmount(() => clearInterval(tickTimer))

defineExpose({ show, close })
</script>

<style lang="scss" scoped>
.auto-popup {
  position: fixed;
  top: 54px;
  right: 20px;
  width: 330px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
  border: 1px solid #ebeef5;
  // 低于 el-dialog（Element Plus 从 2000 起动态分配），避免盖住业务弹窗
  z-index: 1900;
  overflow: hidden;
  cursor: default;
}
/* 箭头：指向右上方的铃铛 */
.ap-arrow {
  position: absolute;
  top: -6px;
  right: 26px;
  width: 10px;
  height: 10px;
  background: #fff;
  border-left: 1px solid #ebeef5;
  border-top: 1px solid #ebeef5;
  transform: rotate(45deg);
}
.ap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  b { color: #f56c6c; font-size: 15px; }
  .ap-bell { margin-right: 5px; vertical-align: -2px; color: #e6a23c; }
}
.ap-head-act { display: flex; align-items: center; gap: 4px; }
.ap-icon-btn {
  cursor: pointer;
  color: #c0c4cc;
  font-size: 14px;
  padding: 3px;
  border-radius: 4px;
  &:hover { color: #606266; background: #f5f7fa; }
  &.on { color: var(--el-color-primary); transform: rotate(-45deg); }
}
.ap-list { padding: 0 10px 6px; }
.ap-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: #f5f7fa; }
  .ap-item-main { flex: 1; min-width: 0; }
  .ap-item-title {
    display: block;
    font-size: 12.5px;
    color: #303133;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .ap-item-warn { color: #f56c6c; margin-right: 3px; vertical-align: -1px; }
  .ap-item-sub {
    display: block;
    font-size: 11px;
    color: #909399;
    margin-top: 2px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  /* 类型标签：待办/预警同卡展示时的区分解 */
  .ap-item-kind {
    display: inline-block;
    margin-right: 4px;
    padding: 0 4px;
    border-radius: 3px;
    font-size: 10px;
    line-height: 15px;
    vertical-align: 1px;
    &.is-todo { color: #2b7cc1; background: #eef5fb; }
    &.is-alert { color: #b88230; background: #fdf6ec; }
  }
  .ap-item-ignore {
    flex-shrink: 0;
    font-size: 11px;
    color: #c0c4cc;
    padding: 4px 6px;
    border-radius: 4px;
    &:hover { color: #f56c6c; background: #fef0f0; }
  }
}
.ap-more { font-size: 11px; color: #a8abb2; padding: 4px 8px 2px; }
.ap-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  border-top: 1px solid #f2f4f7;
  .ap-view {
    font-size: 12px;
    color: var(--el-color-primary);
    cursor: pointer;
    font-weight: 600;
    &:hover { color: #2b7cc1; }
  }
  .ap-mute-today { font-size: 11px; color: #c0c4cc; cursor: pointer; &:hover { color: #909399; } }
}
.ap-progress {
  height: 3px;
  background: var(--el-color-primary);
  transition: width 0.1s linear;
}
.popup-slide-enter-active { transition: all 0.35s ease; }
.popup-slide-leave-active { transition: all 0.25s ease; }
.popup-slide-enter-from,
.popup-slide-leave-to { opacity: 0; transform: translate(16px, -8px) scale(0.97); }
</style>
