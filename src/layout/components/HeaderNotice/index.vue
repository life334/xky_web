<template>
  <div>
    <el-popover ref="noticePopover" placement="bottom-end" :width="400" trigger="click" v-model:visible="noticeVisible" popper-class="notify-popover-v2">
      <div class="nh-header">
        <span class="nh-title">通知中心</span>
        <!-- 「全部已读」仅对消息有意义：待办的终态是"处理/忽略"，"已读"不会让角标消失，
             放这里只会误导（点了数字还在，0 行时还会报"操作失败"）。待办页签改为隐藏。 -->
        <span v-if="activeTab === 'message'" class="nh-mark-all" @click="onMarkAllRead">全部已读</span>
      </div>

      <div class="nh-tabs">
        <div class="nh-tab" :class="{ active: activeTab === 'todo' }" @click="switchTab('todo')">
          待办
          <span v-if="summary.todoCount > 0" class="nh-tab-badge">{{ summary.todoCount > 99 ? '99+' : summary.todoCount }}</span>
        </div>
        <!-- 预警：每日 08:30 后端扫描三条规则（欠款逾期 / 工期超期 / 未关联合同）后推送到这里 -->
        <div class="nh-tab" :class="{ active: activeTab === 'alert' }" @click="switchTab('alert')">
          预警
          <span v-if="summary.alertCount > 0" class="nh-tab-badge warn">{{ summary.alertCount > 99 ? '99+' : summary.alertCount }}</span>
        </div>
        <div class="nh-tab" :class="{ active: activeTab === 'message' }" @click="switchTab('message')">
          消息
          <span v-if="summary.messageCount > 0" class="nh-tab-badge">{{ summary.messageCount > 99 ? '99+' : summary.messageCount }}</span>
        </div>
      </div>

      <div v-loading="tabLoading" class="nh-body">
        <!-- ============ 待办 / 预警（结构一致，共用一套卡片） ============ -->
        <template v-if="activeTab === 'todo' || activeTab === 'alert'">
          <!-- 状态筛选：让"我处理过什么 / 我忽略了什么"可回看（此前忽略=永久消失且不可恢复） -->
          <div class="nh-filter">
            <span
              v-for="f in currentFilters"
              :key="f.key"
              class="nh-chip"
              :class="{ on: todoFilter === f.key }"
              @click="setTodoFilter(f.key)"
            >{{ f.label }}</span>
          </div>

          <div v-if="activeList.length === 0 && !tabLoading" class="nh-empty">
            <el-icon v-if="activeTab === 'alert'"><WarningFilled /></el-icon>
            <el-icon v-else><CircleCheck /></el-icon>
            <div>{{ currentEmptyText }}</div>
          </div>

          <!-- 整卡可点：点待办/预警 = 进入对应页面处理（不设按钮，与消息卡片交互一致）。
               待办完结由后端 sweep 按业务事实自动判定（登记了资料/录入了结算/签了合同）；
               预警由每日扫描自动消解（风险解除即置已完成）。
               两者都不依赖前端的"认领"动作，没处理就一直留着提醒。 -->
          <div
            v-for="item in activeList"
            :key="item.id"
            class="nh-card todo"
            :class="{ high: item.priority === 'high', unread: item.status === 'unread' }"
            @click="goItem(item)"
          >
            <div class="nh-card-top">
              <span class="nh-kind" :class="'kind-' + kindClass(item)">{{ kindLabel(item) }}</span>
              <span class="nh-card-title">{{ item.title }}</span>
              <!-- 紧急度双编码：图标 + 文字，不只靠红色（色盲用户同样可辨） -->
              <span v-if="item.priority === 'high'" class="nh-urgent">
                <el-icon><WarningFilled /></el-icon>{{ activeTab === 'alert' ? '紧急' : '超期' }}
              </span>
            </div>

            <div class="nh-card-sub">{{ item.projectName }}（{{ item.projectCode }}）</div>

            <div class="nh-card-meta">
              <span v-if="dueMeta(item.dueTime).text" class="nh-due" :class="{ over: dueMeta(item.dueTime).overdue, soon: dueMeta(item.dueTime).soon }">
                <el-icon><Clock /></el-icon>{{ dueMeta(item.dueTime).text }}
              </span>
              <!-- 相对时间扫读，绝对时刻放 title（hover 查看） -->
              <span class="nh-time" :title="fmtDateTime(item.createTime)">{{ fromNow(item.createTime) }}</span>
              <!-- 忽略：卡片内容之后的文字链接（沿用原有 UI 设计，不占一整行按钮区） -->
              <span class="nh-meta-gap"></span>
              <span
                v-if="isOpen(item) && ignoringId !== item.id"
                class="nh-link"
                @click.stop="startIgnore(item)"
              >忽略</span>
              <span
                v-else-if="item.status === 'ignored'"
                class="nh-link"
                @click.stop="onUnignore(item)"
              >撤销忽略</span>
            </div>

            <!-- 终态说明：此前忽略后原因"填完自己都看不到" -->
            <div v-if="item.status === 'ignored'" class="nh-reason">
              已忽略<template v-if="item.ignoreReason">：{{ item.ignoreReason }}</template>
            </div>
            <div v-else-if="item.status === 'closed'" class="nh-reason">
              已被 {{ item.claimedByName || '他人' }} 认领处理
            </div>
            <div v-else-if="item.status === 'done'" class="nh-reason ok">
              {{ activeTab === 'alert' ? '风险已解除' : '已完成' }}{{ item.doneTime ? ' · ' + fromNow(item.doneTime) : '' }}
            </div>
            <div v-else-if="item.claimedBy" class="nh-reason claim">
              已由 {{ item.claimedBy == myId ? '我' : (item.claimedByName || '他人') }} 认领
            </div>

            <!-- 行内忽略（替代 $prompt 模态：点卡片是静默跳转，忽略不该打断式弹窗） -->
            <div v-if="ignoringId === item.id" class="nh-ignore-box" @click.stop>
              <el-input
                v-model="ignoreReason"
                size="small"
                maxlength="60"
                placeholder="请填写忽略原因（必填）"
                @keyup.enter="submitIgnore(item)"
              />
              <div class="nh-ignore-act">
                <el-button size="small" type="primary" @click="submitIgnore(item)">确定忽略</el-button>
                <el-button size="small" @click="cancelIgnore">取消</el-button>
              </div>
            </div>
          </div>
        </template>

        <!-- ============ 消息（站内消息 + 公告，按时间统一倒序） ============ -->
        <template v-else>
          <div v-if="messageList.length === 0 && !tabLoading" class="nh-empty">
            <el-icon><Message /></el-icon>
            <div>暂无消息</div>
          </div>
          <div
            v-for="item in messageList"
            :key="item.kind + '-' + item.key"
            class="nh-card message"
            :class="{ unread: !item.isRead }"
            @click="goMessage(item)"
          >
            <div class="nh-card-top">
              <span class="nh-kind" :class="'kind-' + item.kind">{{ item.kind === 'notice' ? (item.noticeType === '1' ? '通知' : '公告') : '消息' }}</span>
              <span class="nh-card-title">{{ item.title }}</span>
            </div>
            <div v-if="item.sub" class="nh-card-sub">{{ item.sub }}</div>
            <div class="nh-card-meta">
              <span class="nh-time" :title="fmtDateTime(item.time)">{{ fromNow(item.time) }}</span>
            </div>
          </div>
        </template>
      </div>

      <template #reference>
        <div class="right-menu-item hover-effect notice-trigger">
          <svg-icon icon-class="bell" />
          <span v-if="summary.todoCount > 0" class="notice-badge">{{ summary.todoCount > 99 ? '99+' : summary.todoCount }}</span>
        </div>
      </template>
    </el-popover>

    <notice-detail-view ref="noticeViewRef" />
    <auto-popup
      ref="autoPopupRef"
      :on-view="openPanelFromPopup"
      :on-go-item="goItem"
      :on-ignore="ignoreFromPopup"
      :on-mute-today="handleMuteToday"
    />
  </div>
</template>

<script setup>
import NoticeDetailView from './DetailView'
import AutoPopup from './AutoPopup'
import { useNotifyPolling } from './useNotifyPolling'
import { listNoticeTop, markNoticeRead, markNoticeReadAll } from '@/api/system/notice'
import { notifyList, notifyRead, notifyReadAll, notifyIgnore, notifyUnignore } from '@/api/project/notify'
import { fromNow, dueMeta, fmtDateTime, timeValue } from '@/utils/timeAgo'
import useUserStore from '@/store/modules/user'

const { proxy } = getCurrentInstance()
const router = useRouter()

/**
 * 待办状态筛选
 *
 * ⚠️ 不含 closed：待办认领能力已下线（后端 claim 接口与 `notify.todo.claim.enabled` 配置一并移除），
 * 待办完结一律由业务事实驱动（登记资料/录入结算/签署合同后自动完成），不会再产生 closed 记录。
 * EMPTY_TEXT 里保留 closed 文案仅为兼容历史数据渲染。
 */
const TODO_FILTERS = [
  { key: 'open', label: '未完成' },
  { key: 'done', label: '已完成' },
  { key: 'ignored', label: '已忽略' }
]
/** 预警与待办共用同样的状态机（open/done/ignored），仅文案按语境区分 */
const ALERT_FILTERS = [
  { key: 'open', label: '未处理' },
  { key: 'done', label: '已解除' },
  { key: 'ignored', label: '已忽略' }
]
const EMPTY_TEXT = {
  open: '没有待办事项，一切已完成',
  done: '还没有已完成的处理记录',
  ignored: '没有被忽略的待办',
  closed: '没有被他人认领的待办'
}
const ALERT_EMPTY_TEXT = {
  open: '暂无风险预警',
  done: '还没有已解除的预警',
  ignored: '没有被忽略的预警'
}
/** 待办类型 → 中文标签（此前只能靠标题文字分辨，扫读成本高） */
const TODO_KIND_TEXT = { doc: '资料登记', settle: '结算录入', contract: '合同签署' }
/** 预警 biz_type → 中文标签 */
const ALERT_KIND_TEXT = {
  alert_debt: '欠款逾期',
  alert_overdue: '工期超期',
  alert_contract_missing: '未关联合同'
}

const noticePopover = ref(null)
const noticeVisible = ref(false)
const activeTab = ref('todo')
const todoFilter = ref('open')
const tabLoading = ref(false)
const todoList = ref([])
const alertList = ref([])
const messageList = ref([])

/** 当前页签下的列表（待办与预警共用卡片渲染） */
const activeList = computed(() => (activeTab.value === 'alert' ? alertList.value : todoList.value))
const currentFilters = computed(() => (activeTab.value === 'alert' ? ALERT_FILTERS : TODO_FILTERS))
const currentEmptyText = computed(() => {
  const m = activeTab.value === 'alert' ? ALERT_EMPTY_TEXT : EMPTY_TEXT
  return m[todoFilter.value] || (activeTab.value === 'alert' ? '暂无风险预警' : '没有待办事项')
})

// 行内忽略状态
const ignoringId = ref(null)
const ignoreReason = ref('')

const myId = computed(() => {
  try { return String(useUserStore().id || '') } catch (e) { return '' }
})

const { summary, refreshSummary, start, stop, setNoPopupToday, noPopupToday } = useNotifyPolling(popupCallback)
const autoPopupRef = ref(null)

onMounted(() => { start() })
onBeforeUnmount(() => { stop(); clearInterval(tabTimer) })

/** 自动弹出回调 */
function popupCallback(items, opts) {
  autoPopupRef.value && autoPopupRef.value.show(items, opts)
}
/**
 * 弹出卡点「查看全部」→ 打开面板，并落在内容对应的页签
 * （待办与预警现在同卡展示，一律跳待办会让预警用户白找一次）
 */
function openPanelFromPopup(items) {
  const list = Array.isArray(items) ? items : []
  const hasTodo = list.some(i => i.notifyType !== 'alert')
  const hasAlert = list.some(i => i.notifyType === 'alert')
  activeTab.value = hasAlert && !hasTodo ? 'alert' : 'todo'
  todoFilter.value = 'open'
  // 面板由 watch(noticeVisible) 统一触发 loadTab，这里不要重复请求
  noticeVisible.value = true
}
function handleMuteToday() { setNoPopupToday() }
/** 弹出卡上点「忽略」→ 打开面板并展开该条的原因输入框（复用同一套行内交互） */
function ignoreFromPopup(item) {
  openPanelFromPopup([item])
  startIgnore(item)
}

// ==================== 状态判定 ====================
function isOpen(item) {
  return item.status === 'unread' || item.status === 'read'
}
function kindLabel(item) {
  if (!item) return ''
  if (item.notifyType === 'alert') return ALERT_KIND_TEXT[item.bizType] || '预警'
  return TODO_KIND_TEXT[item.todoKind] || '待办'
}
/** CSS 类名：预警统一用 kind-alert，靠文字标签区分具体规则 */
function kindClass(item) {
  if (!item) return 'other'
  return item.notifyType === 'alert' ? 'alert' : (item.todoKind || 'other')
}

// ==================== 面板数据 ====================
function switchTab(t) {
  if (activeTab.value === t) return
  activeTab.value = t
  loadTab()
}
function setTodoFilter(k) {
  if (todoFilter.value === k) return
  todoFilter.value = k
  cancelIgnore()
  loadTab()
}

/**
 * @param {boolean} silent 静默刷新（面板打开期间的定时刷新用，不显示 loading 遮罩，避免闪烁）
 */
function loadTab(silent) {
  if (activeTab.value === 'todo' || activeTab.value === 'alert') {
    if (!silent) tabLoading.value = true
    const tab = activeTab.value
    notifyList({ type: tab, status: todoFilter.value, pageNum: 1, pageSize: 50 }).then(res => {
      // ⚠️ 响应体解包铁律：rows 判空兜底
      const rows = Array.isArray(res && res.rows) ? res.rows : []
      if (tab === 'alert') alertList.value = rows
      else todoList.value = rows
      // list 接口内部会先跑一次 sweep（把业务已完成的待办置 done），之后同步刷新角标，
      // 避免出现「列表里已经看不到待办、铃铛还挂着数字」的错位（silent 刷新交给 30s 轮询，不重复请求）
      if (!silent) refreshSummary()
    }).finally(() => { if (!silent) tabLoading.value = false })
    return
  }
  if (!silent) tabLoading.value = true
  Promise.all([
    notifyList({ type: 'message', status: 'all', pageNum: 1, pageSize: 50 }),
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
    // 站内消息与公告按时间统一倒序（旧实现是"消息全在前、公告全在后"，
    // 今天发的公告会躺在三个月前的消息下面）
    messageList.value = [...msgs, ...notices].sort((a, b) => timeValue(b.time) - timeValue(a.time))
  }).finally(() => { if (!silent) tabLoading.value = false })
}

// ==================== 交互 ====================
/** 解析 routeQuery 字符串为 query 对象 */
function parseRouteQuery(s) {
  const query = {}
  ;(s || '').split('&').forEach(kv => {
    if (!kv) return
    const i = kv.indexOf('=')
    if (i > 0) query[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1))
  })
  return query
}

/**
 * 待办：点击整卡 → 已读 + 跳转落地页（自动弹出卡点击单条也走这里）
 *
 * ⚠️ 这里**不做认领**（认领能力已整体下线）。待办的完结由后端 sweep 按业务事实判定：
 * 资料登记过了 / 结算录入了 / 合同签了 ⇒ 待办自动完成；
 * 只是点进来看一眼没操作 ⇒ 待办继续留在列表里提醒，同角色的其他人也照样能各自处理。
 * 曾经在这里隐式认领会造成"某人只是点开看看，其他人的待办却全被关掉"的错误闭环。
 */
function goItem(item) {
  if (!item) return
  if (item.status === 'unread') {
    notifyRead(item.id).catch(() => {})
    item.status = 'read'
  }
  noticeVisible.value = false
  if (item.routePath) {
    router.push({ path: item.routePath, query: parseRouteQuery(item.routeQuery) })
  }
}

// ---- 行内忽略 ----
function startIgnore(item) {
  ignoringId.value = item.id
  ignoreReason.value = ''
}
function cancelIgnore() {
  ignoringId.value = null
  ignoreReason.value = ''
}
function submitIgnore(item) {
  const reason = (ignoreReason.value || '').trim()
  if (!reason) {
    proxy.$modal.msgWarning('请填写忽略原因')
    return
  }
  notifyIgnore(item.id, reason).then(() => {
    proxy.$modal.msgSuccess('已忽略该待办')
    cancelIgnore()
    // loadTab 内部会在拉完列表后统一刷新角标，这里不再重复请求
    loadTab()
  }).catch(() => {})
}
/** 撤销忽略：解决"忽略不可恢复" */
function onUnignore(item) {
  notifyUnignore(item.id).then(() => {
    proxy.$modal.msgSuccess('已撤销忽略')
    loadTab()
  }).catch(() => {})
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
  noticeVisible.value = false
  if (raw.routePath) router.push({ path: raw.routePath, query: parseRouteQuery(raw.routeQuery) })
}

/** 全部已读（仅消息页签）：站内消息 + 公告一起置为已读 */
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

// ==================== 开合与刷新 ====================
// 面板打开期间定时刷新：开着的时候也要能收到新待办（旧实现只在开关瞬间加载一次）
let tabTimer = null
watch(noticeVisible, (v) => {
  if (v) {
    loadTab()
    clearInterval(tabTimer)
    tabTimer = setInterval(() => loadTab(true), 30 * 1000)
  } else {
    clearInterval(tabTimer)
    tabTimer = null
    cancelIgnore()
  }
})
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
    background: var(--el-color-danger);
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
  color: #303133;
}
.notify-popover-v2 .nh-mark-all {
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: normal;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  &:hover { background: var(--el-color-primary-light-9); }
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
  background: var(--el-color-danger);
  vertical-align: 1px;
  /* 预警用琥珀色，与待办的红色区分 */
  &.warn { background: var(--el-color-warning); }
}
.notify-popover-v2 .nh-body {
  max-height: 400px;
  min-height: 120px;
  overflow-y: auto;
}

/* ---- 状态筛选 chips ---- */
.notify-popover-v2 .nh-filter {
  display: flex;
  gap: 6px;
  padding: 8px 12px 4px;
  border-bottom: 1px solid #f5f5f5;
}
.notify-popover-v2 .nh-chip {
  font-size: 11.5px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 10px;
  padding: 3px 10px;
  cursor: pointer;
  user-select: none;
  &:hover { color: #606266; }
  &.on { background: var(--el-color-primary-light-9); color: var(--el-color-primary); font-weight: 600; }
}

.notify-popover-v2 .nh-empty {
  padding: 28px 16px;
  text-align: center;
  color: #c0c4cc;
  font-size: 12px;
  line-height: 1.8;
  .el-icon { font-size: 24px; display: block; margin: 0 auto 6px; }
}

/* ---- 卡片（待办/消息统一） ---- */
.notify-popover-v2 .nh-card {
  padding: 10px 12px;
  border-bottom: 1px solid #f5f5f5;
  border-left: 3px solid transparent;
  transition: background 0.15s;
  &:last-child { border-bottom: none; }
  &:hover { background: #f5f8fb; }
  /* 未读：左侧竖条 + 标题加粗（不依赖颜色单通道） */
  &.unread { border-left-color: var(--el-color-primary); }
  &.unread .nh-card-title { font-weight: 600; }
  &.high { background: #fffafa; }
  &.high:hover { background: #fff5f5; }
  /* 整卡可点（待办跳落地页、消息跳详情/弹窗） */
  &.todo, &.message { cursor: pointer; }
}
.notify-popover-v2 .nh-card-top {
  display: flex;
  align-items: center;
  gap: 6px;
}
.notify-popover-v2 .nh-card-title {
  font-size: 12.5px;
  color: #303133;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 类型标签：一眼分辨资料登记 / 结算录入 / 合同签署 */
.notify-popover-v2 .nh-kind {
  flex-shrink: 0;
  font-size: 10.5px;
  line-height: 16px;
  padding: 0 5px;
  border-radius: 3px;
  background: #eef2f7;
  color: #5b6b7f;
  &.kind-doc { background: #eaf3ff; color: #2b7cc1; }
  &.kind-settle { background: #f3ecff; color: #7a4fd0; }
  &.kind-contract { background: #fff3e6; color: #c1741a; }
  &.kind-notify { background: #eef2f7; color: #5b6b7f; }
  &.kind-notice { background: #eaf7ee; color: #3a9a5c; }
  /* 预警：三种规则共用暖红底，具体规则靠标签文字区分 */
  &.kind-alert { background: #fdf0ee; color: #c45656; }
}
.notify-popover-v2 .nh-urgent {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  line-height: 14px;
  padding: 0 4px;
  border-radius: 3px;
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
  border: 1px solid var(--el-color-danger-light-7);
  font-weight: 600;
}
.notify-popover-v2 .nh-card-sub {
  font-size: 11.5px;
  color: #909399;
  margin-top: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.notify-popover-v2 .nh-card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
}
.notify-popover-v2 .nh-due,
.notify-popover-v2 .nh-time {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #a8abb2;
}
.notify-popover-v2 .nh-due.soon { color: #e6a23c; }
.notify-popover-v2 .nh-due.over { color: var(--el-color-danger); font-weight: 600; }
.notify-popover-v2 .nh-reason {
  margin-top: 5px;
  font-size: 11px;
  color: #909399;
  background: #f7f8fa;
  border-radius: 4px;
  padding: 4px 7px;
  line-height: 1.5;
  &.ok { color: #3a9a5c; background: #f0f9f2; }
  &.claim { color: #2b7cc1; background: #eef5fb; }
}

/* ---- 卡片尾部的文字链接（忽略 / 撤销忽略）：沿用原有 UI 设计，不占整行按钮区 ---- */
.notify-popover-v2 .nh-meta-gap { flex: 1; }
.notify-popover-v2 .nh-link {
  flex-shrink: 0;
  font-size: 11.5px;
  color: #909399;
  cursor: pointer;
  padding: 2px 4px;
  margin: -2px -4px;
  border-radius: 3px;
  user-select: none;
  &:hover { color: var(--el-color-primary); background: var(--el-color-primary-light-9); }
}

/* ---- 行内忽略输入框 ---- */
.notify-popover-v2 .nh-ignore-box {
  margin-top: 8px;
  padding: 8px;
  background: #f7f8fa;
  border-radius: 5px;
  .nh-ignore-act { display: flex; justify-content: flex-end; gap: 6px; margin-top: 7px; }
}
</style>
