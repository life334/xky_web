<template>
  <div>
    <el-popover ref="noticePopover" placement="bottom-end" :width="400" trigger="manual" v-model:visible="noticeVisible" popper-class="notify-popover-v2">
      <div class="nh-header">
        <span class="nh-title">通知中心</span>
        <span v-if="activeTab === 'message'" class="nh-mark-all" @click="onMarkAllRead">全部已读</span>
      </div>

      <div class="nh-tabs">
        <div class="nh-tab" :class="{ active: activeTab === 'todo' }" @click="switchTab('todo')">
          待办
          <span v-if="summary.todoCount > 0" class="nh-tab-badge red">{{ summary.todoCount > 99 ? '99+' : summary.todoCount }}</span>
        </div>
        <div class="nh-tab" :class="{ active: activeTab === 'message' }" @click="switchTab('message')">
          消息
          <span v-if="summary.messageCount > 0" class="nh-tab-badge red">{{ summary.messageCount > 99 ? '99+' : summary.messageCount }}</span>
        </div>
        <div class="nh-tab" :class="{ active: activeTab === 'alert' }" @click="switchTab('alert')">
          预警
          <span v-if="summary.alertCount > 0" class="nh-tab-badge amber">{{ summary.alertCount > 99 ? '99+' : summary.alertCount }}</span>
        </div>
      </div>

      <div v-loading="tabLoading" class="nh-body">
        <!-- 待办 -->
        <template v-if="activeTab === 'todo'">
          <div v-if="todoList.length === 0 && !tabLoading" class="nh-empty">
            <el-icon style="font-size:24px;display:block;margin-bottom:6px;"><Finished /></el-icon>
            没有待办事项
          </div>
          <div v-for="item in todoList" :key="item.id" class="nh-item todo" :class="{ high: item.priority === 'high' }">
            <div class="nh-item-main" @click="goItem(item)">
              <div class="nh-item-title">
                {{ item.title }}
                <span v-if="item.priority === 'high'" class="nh-flag">超期</span>
              </div>
              <div class="nh-item-sub">{{ item.projectName }}（{{ item.projectCode }}）</div>
              <div class="nh-item-time">{{ item.createTime }}</div>
            </div>
            <div class="nh-item-act">
              <span class="nh-go" @click.stop="goItem(item)">去处理</span>
              <span class="nh-ignore" @click.stop="onIgnore(item)">忽略</span>
            </div>
          </div>
        </template>

        <!-- 消息（站内消息 + 公告） -->
        <template v-else-if="activeTab === 'message'">
          <div v-if="messageList.length === 0 && !tabLoading" class="nh-empty">
            <el-icon style="font-size:24px;display:block;margin-bottom:6px;"><Postcard /></el-icon>
            暂无消息
          </div>
          <div v-for="item in messageList" :key="item.kind + '-' + item.key" class="nh-item message" :class="{ 'is-read': item.isRead }" @click="goMessage(item)">
            <el-tag size="small" :type="item.kind === 'notice' ? (item.noticeType === '1' ? 'warning' : 'success') : 'info'" class="nh-tag">
              {{ item.kind === 'notice' ? (item.noticeType === '1' ? '通知' : '公告') : '消息' }}
            </el-tag>
            <div class="nh-item-main">
              <div class="nh-item-title">{{ item.title }}</div>
              <div class="nh-item-sub" v-if="item.sub">{{ item.sub }}</div>
              <div class="nh-item-time">{{ item.time }}</div>
            </div>
          </div>
        </template>

        <!-- 预警（P0 占位） -->
        <template v-else>
          <div class="nh-empty">
            <el-icon style="font-size:24px;display:block;margin-bottom:6px;"><AlarmClock /></el-icon>
            预警规则将在下期上线
            <div class="nh-empty-sub">（回款超期、超工期未办结等）</div>
          </div>
        </template>
      </div>

      <template #reference>
        <div class="right-menu-item hover-effect notice-trigger" @mouseenter="onNoticeEnter" @mouseleave="onNoticeLeave">
          <svg-icon icon-class="bell" />
          <span v-if="summary.todoCount > 0" class="notice-badge">{{ summary.todoCount > 99 ? '99+' : summary.todoCount }}</span>
          <span v-else-if="summary.alertCount > 0" class="notice-dot"></span>
        </div>
      </template>
    </el-popover>

    <notice-detail-view ref="noticeViewRef" />
    <auto-popup ref="autoPopupRef" :on-view="openPanelFromPopup" :on-mute-today="handleMuteToday" />
  </div>
</template>

<script setup>
import NoticeDetailView from './DetailView'
import AutoPopup from './AutoPopup'
import { useNotifyPolling } from './useNotifyPolling'
import { listNoticeTop, markNoticeRead, markNoticeReadAll } from '@/api/system/notice'
import { notifyList, notifyRead, notifyReadAll, notifyIgnore } from '@/api/project/notify'

const { proxy } = getCurrentInstance()
const router = useRouter()

const noticePopover = ref(null)
const noticeVisible = ref(false)
const noticeLeaveTimer = ref(null)
const activeTab = ref('todo')
const tabLoading = ref(false)
const todoList = ref([])
const messageList = ref([])

const { summary, refreshSummary, start, stop, setNoPopupToday, noPopupToday } = useNotifyPolling(popupCallback)
const autoPopupRef = ref(null)

onMounted(() => { start() })
onBeforeUnmount(() => { stop() })

/** 自动弹出回调 */
function popupCallback(items, opts) {
  autoPopupRef.value && autoPopupRef.value.show(items, opts)
}
function handleMuteToday() { setNoPopupToday() }
function openPanelFromPopup() {
  activeTab.value = 'todo'
  noticeVisible.value = true
  loadTab()
}

// ==================== 面板数据 ====================
function switchTab(t) {
  if (activeTab.value === t) return
  activeTab.value = t
  loadTab()
}

function loadTab() {
  if (activeTab.value === 'todo') {
    tabLoading.value = true
    notifyList({ type: 'todo', onlyOpen: true, pageNum: 1, pageSize: 50 }).then(res => {
      // ⚠️ 响应体解包铁律：rows 判空兜底
      todoList.value = Array.isArray(res && res.rows) ? res.rows : []
    }).finally(() => { tabLoading.value = false })
  } else if (activeTab.value === 'message') {
    tabLoading.value = true
    Promise.all([
      notifyList({ type: 'message', onlyOpen: true, pageNum: 1, pageSize: 50 }),
      listNoticeTop()
    ]).then(([msgRes, noticeRes]) => {
      const msgs = (Array.isArray(msgRes && msgRes.rows) ? msgRes.rows : []).map(m => ({
        kind: 'notify', key: m.id, id: m.id, isRead: m.status !== 'unread',
        title: m.title, sub: m.projectName ? `${m.projectName}（${m.projectCode}）` : (m.content || ''),
        time: m.createTime, raw: m
      }))
      const notices = ((noticeRes && Array.isArray(noticeRes.data) ? noticeRes.data : []) || []).map(n => ({
        kind: 'notice', key: n.noticeId, noticeId: n.noticeId, noticeType: n.noticeType,
        isRead: n.isRead, title: n.noticeTitle, sub: '', time: n.createTime, raw: n
      }))
      messageList.value = [...msgs, ...notices]
    }).finally(() => { tabLoading.value = false })
  }
}

// ==================== 交互 ====================
/** 待办：去处理 → 已读 + 跳转落地页 */
function goItem(item) {
  if (item.status === 'unread') {
    notifyRead(item.id).catch(() => {})
    item.status = 'read'
  }
  const query = {}
  ;(item.routeQuery || '').split('&').forEach(kv => {
    if (!kv) return
    const i = kv.indexOf('=')
    if (i > 0) query[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1))
  })
  noticeVisible.value = false
  if (item.routePath) {
    router.push({ path: item.routePath, query })
  }
}

/** 消息：站内消息 → 已读 + 跳转；公告 → 详情弹窗 */
function goMessage(item) {
  if (item.kind === 'notice') {
    if (!item.isRead) {
      markNoticeRead(item.noticeId).catch(() => {})
      item.isRead = true
      summary.messageCount = Math.max(0, summary.messageCount - 1)
    }
    proxy.$refs['noticeViewRef'].open(item.noticeId)
    return
  }
  const raw = item.raw || {}
  if (raw.status === 'unread') {
    notifyRead(raw.id).catch(() => {})
    raw.status = 'read'
    item.isRead = true
    summary.messageCount = Math.max(0, summary.messageCount - 1)
  }
  const query = {}
  ;(raw.routeQuery || '').split('&').forEach(kv => {
    if (!kv) return
    const i = kv.indexOf('=')
    if (i > 0) query[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1))
  })
  noticeVisible.value = false
  if (raw.routePath) router.push({ path: raw.routePath, query })
}

/** 忽略待办（必须填原因） */
function onIgnore(item) {
  proxy.$prompt('请填写忽略原因（必填）', '忽略待办', {
    confirmButtonText: '确定忽略',
    cancelButtonText: '取消',
    inputPlaceholder: '例如：该项目资料已线下归档',
    inputValidator: v => !!(v && v.trim()) || '原因不能为空'
  }).then(({ value }) => {
    notifyIgnore(item.id, value.trim()).then(() => {
      proxy.$modal.msgSuccess('已忽略该待办')
      loadTab()
      refreshSummary()
    })
  }).catch(() => {})
}

/** 全部已读（消息 tab：站内消息 + 公告） */
function onMarkAllRead() {
  const notices = messageList.value.filter(m => m.kind === 'notice' && !m.isRead)
  const tasks = [notifyReadAll('message').catch(() => {})]
  if (notices.length > 0) {
    tasks.push(markNoticeReadAll(notices.map(n => n.noticeId).join(',')).catch(() => {}))
  }
  Promise.all(tasks).then(() => {
    messageList.value = messageList.value.map(m => ({ ...m, isRead: true }))
    summary.messageCount = 0
    proxy.$modal.msgSuccess('已全部标记为已读')
  })
}

// ==================== 悬停开合（保留原交互） ====================
function onNoticeEnter() {
  clearTimeout(noticeLeaveTimer.value)
  noticeVisible.value = true
  loadTab()
  nextTick(() => {
    const popper = noticePopover.value?.popperRef?.contentRef
    if (popper && !popper._noticeBound) {
      popper._noticeBound = true
      popper.addEventListener('mouseenter', () => clearTimeout(noticeLeaveTimer.value))
      popper.addEventListener('mouseleave', () => {
        noticeLeaveTimer.value = setTimeout(() => { noticeVisible.value = false }, 100)
      })
    }
  })
}
function onNoticeLeave() {
  noticeLeaveTimer.value = setTimeout(() => { noticeVisible.value = false }, 150)
}
</script>

<style lang="scss" scoped>
.notice-trigger {
  position: relative;
  transform: translateX(-6px);
  .svg-icon { width: 1.2em; height: 1.2em; vertical-align: -0.2em; }
  .notice-badge {
    position: absolute;
    top: 7px;
    right: -3px;
    background: #f56c6c;
    color: #fff;
    border-radius: 10px;
    font-size: 10px;
    height: 16px;
    line-height: 16px;
    padding: 0 4px;
    min-width: 16px;
    text-align: center;
    white-space: nowrap;
    pointer-events: none;
  }
  .notice-dot {
    position: absolute;
    top: 8px;
    right: -1px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e6a23c;
    pointer-events: none;
  }
}
</style>

<style lang="scss">
.notify-popover-v2 { padding: 0 !important; }
.notify-popover-v2 .nh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.notify-popover-v2 .nh-mark-all {
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: normal;
  cursor: pointer;
  &:hover { color: #2b7cc1; }
}
.notify-popover-v2 .nh-tabs {
  display: flex;
  border-bottom: 1px solid #ebeef5;
  padding: 0 8px;
}
.notify-popover-v2 .nh-tab {
  flex: 1;
  text-align: center;
  font-size: 12.5px;
  color: #606266;
  padding: 7px 0 8px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  position: relative;
  user-select: none;
  &:hover { color: var(--el-color-primary); }
  &.active { color: var(--el-color-primary); font-weight: 600; border-bottom-color: var(--el-color-primary); }
}
.notify-popover-v2 .nh-tab-badge {
  display: inline-block;
  margin-left: 3px;
  border-radius: 8px;
  font-size: 10px;
  height: 15px;
  line-height: 15px;
  padding: 0 4px;
  min-width: 15px;
  text-align: center;
  color: #fff;
  vertical-align: 1px;
  &.red { background: #f56c6c; }
  &.amber { background: #e6a23c; }
}
.notify-popover-v2 .nh-body {
  max-height: 360px;
  min-height: 120px;
  overflow-y: auto;
}
.notify-popover-v2 .nh-empty {
  padding: 30px 16px;
  text-align: center;
  color: #bbb;
  font-size: 12px;
  line-height: 1.8;
  .nh-empty-sub { font-size: 11px; color: #d5d8dd; }
}
.notify-popover-v2 .nh-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
  &:last-child { border-bottom: none; }
  &:hover { background: #f7f9fb; }
}
.notify-popover-v2 .nh-item.todo { border-left: 3px solid #dcdfe6; }
.notify-popover-v2 .nh-item.todo.high { border-left-color: #f56c6c; }
.notify-popover-v2 .nh-item-main { flex: 1; min-width: 0; cursor: pointer; }
.notify-popover-v2 .nh-item-title {
  font-size: 12.5px;
  color: #303133;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.notify-popover-v2 .nh-flag {
  flex-shrink: 0;
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
  font-size: 10px;
  border-radius: 3px;
  padding: 0 3px;
  line-height: 14px;
}
.notify-popover-v2 .nh-item-sub {
  font-size: 11.5px;
  color: #909399;
  margin-top: 3px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.notify-popover-v2 .nh-item-time { font-size: 11px; color: #c0c4cc; margin-top: 2px; }
.notify-popover-v2 .nh-item-act {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 2px;
}
.notify-popover-v2 .nh-go {
  font-size: 11.5px;
  color: var(--el-color-primary);
  cursor: pointer;
  white-space: nowrap;
  &:hover { color: #2b7cc1; font-weight: 600; }
}
.notify-popover-v2 .nh-ignore {
  font-size: 11px;
  color: #c0c4cc;
  cursor: pointer;
  white-space: nowrap;
  &:hover { color: #909399; }
}
.notify-popover-v2 .nh-item.message.is-read .nh-item-title,
.notify-popover-v2 .nh-item.message.is-read .nh-item-sub,
.notify-popover-v2 .nh-item.message.is-read .nh-item-time,
.notify-popover-v2 .nh-item.message.is-read .nh-tag { opacity: 0.45; }
.notify-popover-v2 .nh-tag { flex-shrink: 0; margin-top: 1px; }
</style>
