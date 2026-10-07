<template>
  <transition name="popup-slide">
    <div v-if="visible" class="auto-popup" @mouseenter="paused = true" @mouseleave="paused = false">
      <div class="ap-head">
        <span class="ap-title">
          <el-icon style="margin-right:4px;vertical-align:-2px;"><BellFilled /></el-icon>
          您有 <b>{{ items.length }}</b> 项新待办
        </span>
        <el-icon class="ap-close" @click="close"><Close /></el-icon>
      </div>
      <div class="ap-list">
        <div v-for="it in items.slice(0, 3)" :key="it.id" class="ap-item" @click="view">
          <span class="ap-item-title">{{ it.title }}</span>
          <span class="ap-item-sub">{{ it.projectCode }}</span>
        </div>
        <div v-if="items.length > 3" class="ap-more">…等 {{ items.length }} 项</div>
      </div>
      <div class="ap-foot">
        <span class="ap-view" @click="view">立即查看</span>
        <span class="ap-mute-today" @click="muteToday">今日不再自动弹出</span>
      </div>
      <div class="ap-progress" :style="{ width: progress + '%' }"></div>
    </div>
  </transition>
</template>

<script setup>
/**
 * 自动弹出汇总卡（非模态，不抢焦点）：
 * - 倒计时进度条自动收起（normal=dutation 秒；鼠标悬停暂停计时）
 * - "立即查看" → 打开通知中心面板
 * - "今日不再自动弹出" → 本地记一天
 */
const props = defineProps({
  // 弹出后回调（打开面板用），由父组件传入
  onView: { type: Function, default: () => {} },
  onMuteToday: { type: Function, default: () => {} }
})

const visible = ref(false)
const items = ref([])
const paused = ref(false)
const progress = ref(100)
let durationMs = 8000
let remainMs = 8000
let tickTimer = null
let lastTick = 0

function show(list, opts = {}) {
  items.value = list || []
  durationMs = Math.max(2, (opts.duration || 8)) * 1000
  remainMs = durationMs
  progress.value = 100
  visible.value = true
  clearInterval(tickTimer)
  lastTick = Date.now()
  tickTimer = setInterval(() => {
    if (paused.value) { lastTick = Date.now(); return }
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
}

function view() {
  close()
  props.onView && props.onView()
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
  top: 60px;
  right: 24px;
  width: 320px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  border: 1px solid #ebeef5;
  z-index: 3000;
  overflow: hidden;
  cursor: default;
}
.ap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  b { color: #f56c6c; font-size: 15px; }
}
.ap-close { cursor: pointer; color: #909399; }
.ap-close:hover { color: #303133; }
.ap-list { padding: 0 14px 6px; }
.ap-item {
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  &:hover { background: #f5f7fa; }
  .ap-item-title { font-size: 12px; color: #303133; margin-right: 8px; }
  .ap-item-sub { font-size: 11px; color: #909399; }
}
.ap-more { font-size: 11px; color: #c0c4cc; padding: 2px 8px 4px; }
.ap-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-top: 1px solid #f5f7fa;
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
  height: 2px;
  background: var(--el-color-primary);
  transition: width 0.1s linear;
}
.popup-slide-enter-active { transition: all 0.35s ease; }
.popup-slide-leave-active { transition: all 0.25s ease; }
.popup-slide-enter-from,
.popup-slide-leave-to { opacity: 0; transform: translateX(24px); }
</style>
