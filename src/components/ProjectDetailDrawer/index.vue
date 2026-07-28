<template>
  <el-drawer
    v-model="localVisible"
    :size="'52%'"
    :destroy-on-close="true"
    :with-header="false"
    direction="rtl"
    class="project-detail-drawer"
  >
    <div v-if="loading" class="drawer-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载项目详情...</span>
    </div>

    <div v-else-if="project" class="drawer-content">
      <header class="drawer-header">
        <div class="header-left">
          <div class="project-title">
            <span class="status-tag" :class="'tag-' + normalizeStatus(project.status)">
              <span class="dot"></span>{{ project.status }}
            </span>
            <h2>{{ project.projectName }}</h2>
          </div>
          <div class="meta">
            <span class="code"><el-icon><Files /></el-icon>{{ project.projectCode }}</span>
            <span class="client"><el-icon><OfficeBuilding /></el-icon>{{ project.clientUnit || '-' }}</span>
            <span class="owner"><el-icon><User /></el-icon>{{ project.leaderNames || '-' }}</span>
          </div>
        </div>
        <div class="header-right">
          <el-button type="primary" plain size="small" icon="Download" @click="handleExport">导出资料</el-button>
          <el-button icon="Close" circle text @click="localVisible = false" />
        </div>
      </header>

      <el-tabs v-model="activeTab" class="detail-tabs" @tab-change="handleTabChange">
        <el-tab-pane label="概览" name="overview">
          <div class="overview-grid">
            <div class="metric-card metric-base">
              <div class="metric-label">基础信息</div>
              <div class="metric-body">
                <div class="row"><span>项目类别</span><b>{{ project.categoryName || '-' }}</b></div>
                <div class="row"><span>工程项目</span><b>{{ project.engineeringProject || '-' }}</b></div>
                <div class="row"><span>工程地点</span><b>{{ project.projectLocation || '-' }}</b></div>
              </div>
            </div>
            <div class="metric-card metric-task">
              <div class="metric-label">任务进度</div>
              <div class="ring-wrap">
                <el-progress type="dashboard" :percentage="project.taskProgress" :width="90" :color="progressColor(project.taskProgress)" />
                <div class="ring-meta">
                  <div class="num">{{ project.taskDone }}/{{ project.taskTotal }}</div>
                  <div class="lbl">已完成</div>
                </div>
              </div>
            </div>
            <div class="metric-card metric-contract">
              <div class="metric-label">合同金额</div>
              <div class="big-num">¥{{ formatMoney(project.contractAmount) }}</div>
              <div class="sub-text">{{ project.contractCount || 0 }} 份合同</div>
            </div>
            <div class="metric-card metric-payment">
              <div class="metric-label">付款到账率</div>
              <div class="ring-wrap">
                <el-progress type="dashboard" :percentage="project.paymentRate" :width="90" color="#9254de" />
                <div class="ring-meta">
                  <div class="num">{{ project.paymentRate }}%</div>
                  <div class="lbl">{{ project.paidCount }}/{{ project.paymentCount }} 笔</div>
                </div>
              </div>
            </div>
            <div class="metric-card metric-settlement">
              <div class="metric-label">结算产值</div>
              <div class="big-num">¥{{ formatMoney(project.totalOutput) }}</div>
              <div class="dual">
                <span>内部 {{ formatMoney(project.internalOutput) }}</span>
                <span>外部 {{ formatMoney(project.externalOutput) }}</span>
              </div>
            </div>
            <div class="metric-card metric-material">
              <div class="metric-label">成果资料</div>
              <div class="big-num">{{ project.materialCount }}</div>
              <div class="sub-text">已提交 {{ project.materialSubmitted }} 项</div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`任务 (${tasks.length})`" name="tasks" lazy>
          <div v-if="taskLoading" class="tab-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
          <div v-else class="task-list">
            <div class="tab-toolbar">
              <span class="hint">点击行首 checkbox 直接标记完成</span>
              <el-radio-group v-model="taskFilter" size="small">
                <el-radio-button label="all">全部</el-radio-button>
                <el-radio-button label="overdue">超期</el-radio-button>
                <el-radio-button label="pending">待开始</el-radio-button>
                <el-radio-button label="done">已完成</el-radio-button>
              </el-radio-group>
            </div>
            <div v-for="t in filteredTasks" :key="t.id" class="task-row" :class="{ overdue: t.isOverdue, done: t.status === '已完成' }">
              <el-checkbox
                :model-value="t.status === '已完成'"
                @change="(v) => toggleTask(t, v)"
                :disabled="t.status === '已完成'"
              />
              <div class="task-main">
                <div class="task-name">
                  {{ t.taskName }}
                  <el-tag v-if="t.isOverdue" type="danger" size="small" effect="plain">超期 {{ t.overdueDays }} 天</el-tag>
                </div>
                <div class="task-meta">
                  <span>执行人：{{ t.userName }}</span>
                  <span>安排：{{ parseTime(t.assignDate, '{y}-{m}-{d}') }}</span>
                  <span>要求完成：{{ parseTime(t.requiredFinishDate, '{y}-{m}-{d}') }}</span>
                  <span v-if="t.actualFinishDate">实际完成：{{ parseTime(t.actualFinishDate, '{y}-{m}-{d}') }}</span>
                </div>
              </div>
              <el-tag :type="taskStatusType(t.status)" size="small" effect="light">{{ t.status }}</el-tag>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`合同 (${contracts.length})`" name="contracts" lazy>
          <div v-if="contractLoading" class="tab-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
          <div v-else class="contract-grid">
            <div v-for="c in contracts" :key="c.id" class="contract-card" :class="{ 'is-unarchived': c.archiveStatus !== '已归档' }">
              <div class="contract-head">
                <div class="contract-no mono">{{ c.contractNo }}</div>
                <el-tag :type="c.archiveStatus === '已归档' ? 'success' : 'warning'" size="small" effect="light">
                  {{ c.archiveStatus || '未归档' }}
                </el-tag>
              </div>
              <div class="contract-name">{{ c.contractName }}</div>
              <div class="contract-meta">
                <span>类型：{{ c.contractType || '-' }}</span>
                <span>签署：{{ parseTime(c.signDate, '{y}-{m}-{d}') }}</span>
              </div>
              <div class="contract-amount">
                <span class="lbl">合同金额</span>
                <span class="val">¥{{ formatMoney(c.contractAmount) }}</span>
              </div>
              <div class="payment-bar">
                <div class="bar-label">
                  <span>付款进度</span>
                  <span>{{ c.paidAmount && c.contractAmount ? Math.round(c.paidAmount / c.contractAmount * 100) : 0 }}%</span>
                </div>
                <el-progress :percentage="c.paidAmount && c.contractAmount ? Math.round(c.paidAmount / c.contractAmount * 100) : 0" :stroke-width="6" :color="(c.paidAmount || 0) / (c.contractAmount || 1) >= 1 ? '#67c23a' : '#409eff'" :show-text="false" />
              </div>
              <div class="contract-footer">
                <el-button link type="primary" size="small" @click="jumpToPayments(c.id)">查看付款明细</el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`付款 (${payments.length})`" name="payments" lazy>
          <div v-if="paymentLoading" class="tab-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
          <div v-else class="payment-timeline">
            <div v-for="p in payments" :key="p.id" class="timeline-item" :class="{ overdue: p.isOverdue }">
              <div class="timeline-dot" :class="p.receivedStatus === '已到账' ? 'received' : 'pending'">
                <el-icon v-if="p.receivedStatus === '已到账'"><Check /></el-icon>
                <el-icon v-else><Clock /></el-icon>
              </div>
              <div class="timeline-body">
                <div class="timeline-head">
                  <span class="pay-type">{{ p.paymentType || '-' }}</span>
                  <span class="pay-amount">¥{{ formatMoney(p.amount) }}</span>
                  <el-tag :type="paymentStatusType(p)" size="small" effect="light">
                    {{ paymentStatusLabel(p) }}
                  </el-tag>
                </div>
                <div class="timeline-meta">
                  付款时间：{{ parseTime(p.paymentTime, '{y}-{m}-{d}') }}
                  <span v-if="p.receivedTime"> | 到账：{{ parseTime(p.receivedTime, '{y}-{m}-{d}') }}</span>
                  <span v-if="p.isOverdue" class="overdue-warn">超期 {{ p.overdueDays }} 天</span>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="结算" name="settlement" lazy>
          <div v-if="settlementLoading" class="tab-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
          <div v-else-if="settlement" class="settlement-grid">
            <div class="set-col">
              <div class="col-head internal">内部</div>
              <div class="set-row"><span>工作量</span><b>{{ settlement.internalWorkload || 0 }} 人·天</b></div>
              <div class="set-row"><span>产值</span><b>¥{{ formatMoney(settlement.internalOutput) }}</b></div>
            </div>
            <div class="set-col">
              <div class="col-head external">外部</div>
              <div class="set-row"><span>工作量</span><b>{{ settlement.externalWorkload || 0 }} 人·天</b></div>
              <div class="set-row"><span>产值</span><b>¥{{ formatMoney(settlement.externalOutput) }}</b></div>
            </div>
            <div class="set-total">
              <div class="lbl">合计产值</div>
              <div class="val">¥{{ formatMoney((settlement.internalOutput || 0) + (settlement.externalOutput || 0)) }}</div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane :label="`资料 (${materials.length})`" name="materials" lazy>
          <div v-if="materialLoading" class="tab-loading"><el-icon class="is-loading"><Loading /></el-icon></div>
          <div v-else class="material-list">
            <div v-for="m in materials" :key="m.id" class="material-row" :class="{ pending: m.submitStatus !== '已提交' }">
              <el-icon class="file-icon"><Document /></el-icon>
              <div class="mat-main">
                <div class="mat-type">{{ m.resultType || m.materialName || '-' }}</div>
                <div class="mat-meta">提交时间：{{ m.submitTime ? parseTime(m.submitTime, '{y}-{m}-{d}') : '—' }} <span v-if="m.receiverName">| 领取人：{{ m.receiverName }}</span></div>
              </div>
              <el-tag :type="m.submitStatus === '已提交' ? 'success' : 'warning'" size="small" effect="light">
                {{ m.submitStatus || '待提交' }}
              </el-tag>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, reactive, computed, watch, getCurrentInstance } from 'vue'
import { getProject } from '@/api/project/project'
import { listTask } from '@/api/project/task'
import { listContract } from '@/api/project/contract'
import { listPayment } from '@/api/project/payment'
import { getSettlementDetail } from '@/api/project/settlement'
import { listMaterial } from '@/api/project/material'

const { proxy } = getCurrentInstance()

const props = defineProps({
  visible: { type: Boolean, default: false },
  projectId: { type: [Number, String], default: null },
  initialTab: { type: String, default: 'overview' },
  initialFilter: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:visible'])

const localVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v)
})

function normalizeStatus(status) {
  const map = {
    "待开始": "pending",
    "进行中": "ongoing",
    "已完成": "completed",
    "已暂停": "paused",
    "已办结": "closed",
    "已取消": "cancelled"
  }
  return map[status] || status
}

function taskStatusType(status) {
  const map = {
    "待开始": "info",
    "进行中": "",
    "已完成": "success",
    "已暂停": "warning"
  }
  return map[status] || "info"
}

function paymentStatusType(p) {
  if (p.receivedStatus === '已到账') return 'success'
  if (p.isOverdue) return 'danger'
  return 'warning'
}

function paymentStatusLabel(p) {
  if (p.receivedStatus === '已到账') return '已到账'
  if (p.isOverdue) return '超期未到账'
  return '待到账'
}

function progressColor(p) {
  if (p < 50) return '#f56c6c'
  if (p < 80) return '#e6a23c'
  return '#67c23a'
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const loading = ref(false)
const project = ref(null)
const activeTab = ref('overview')

const tabLoaded = reactive({ tasks: false, contracts: false, payments: false, settlement: false, materials: false })
const taskLoading = ref(false)
const contractLoading = ref(false)
const paymentLoading = ref(false)
const settlementLoading = ref(false)
const materialLoading = ref(false)

const tasks = ref([])
const contracts = ref([])
const payments = ref([])
const settlement = ref(null)
const materials = ref([])

const taskFilter = ref('all')
const filteredTasks = computed(() => {
  if (taskFilter.value === 'overdue') return tasks.value.filter(t => t.isOverdue)
  if (taskFilter.value === 'pending') return tasks.value.filter(t => t.status === '待开始')
  if (taskFilter.value === 'done') return tasks.value.filter(t => t.status === '已完成')
  return tasks.value
})

async function loadOverview() {
  const response = await getProject(props.projectId)
  const data = response.data || {}

  project.value = {
    id: data.id,
    projectName: data.projectName,
    projectCode: data.projectCode,
    clientUnit: data.clientUnit,
    leaderNames: data.leaderNames,
    status: data.status,
    categoryName: data.categoryName,
    engineeringProject: data.engineeringProject,
    projectLocation: data.projectLocation,
    taskTotal: 0,
    taskDone: 0,
    taskProgress: calculateTaskProgress(data),
    contractAmount: 0,
    contractCount: 0,
    paymentCount: 0,
    paidCount: 0,
    paymentRate: 0,
    totalOutput: 0,
    internalOutput: 0,
    externalOutput: 0,
    materialCount: 0,
    materialSubmitted: 0
  }

  await Promise.all([
    loadTaskStats(),
    loadContractStats(),
    loadPaymentStats(),
    loadSettlementStats(),
    loadMaterialStats()
  ])
}

async function loadTaskStats() {
  try {
    const response = await listTask({ projectId: props.projectId, pageNum: 1, pageSize: 1000 })
    const taskData = response.rows || []
    project.value.taskTotal = taskData.length
    project.value.taskDone = taskData.filter(t => t.status === '已完成').length
    project.value.taskProgress = project.value.taskTotal > 0 ? Math.round(project.value.taskDone / project.value.taskTotal * 100) : 0
  } catch (e) {}
}

async function loadContractStats() {
  try {
    const response = await listContract({ projectId: props.projectId, pageNum: 1, pageSize: 100 })
    const contractData = response.rows || []
    project.value.contractCount = contractData.length
    project.value.contractAmount = contractData.reduce((s, c) => s + (c.contractAmount || 0), 0)
  } catch (e) {}
}

async function loadPaymentStats() {
  try {
    const response = await listPayment({ projectId: props.projectId, pageNum: 1, pageSize: 100 })
    const paymentData = response.rows || []
    project.value.paymentCount = paymentData.length
    project.value.paidCount = paymentData.filter(p => p.receivedStatus === '已到账').length
    project.value.paymentRate = project.value.paymentCount > 0 ? Math.round(project.value.paidCount / project.value.paymentCount * 100) : 0
  } catch (e) {}
}

async function loadSettlementStats() {
  try {
    const response = await getSettlementDetail(props.projectId)
    const data = response.data || {}
    project.value.internalOutput = data.internalOutput || 0
    project.value.externalOutput = data.externalOutput || 0
    project.value.totalOutput = (data.internalOutput || 0) + (data.externalOutput || 0)
  } catch (e) {}
}

async function loadMaterialStats() {
  try {
    const response = await listMaterial({ projectId: props.projectId, pageNum: 1, pageSize: 100 })
    const materialData = response.rows || []
    project.value.materialCount = materialData.length
    project.value.materialSubmitted = materialData.filter(m => m.submitStatus === '已提交').length
  } catch (e) {}
}

function calculateTaskProgress(data) {
  if (data.status === '已完成' || data.status === '已办结') return 100
  return 50
}

async function loadTasks() {
  taskLoading.value = true
  const response = await listTask({ projectId: props.projectId, pageNum: 1, pageSize: 1000 })
  const rows = response.rows || []
  tasks.value = rows.map(t => ({
    ...t,
    isOverdue: calculateIsOverdue(t),
    overdueDays: calculateOverdueDays(t)
  }))
  tabLoaded.tasks = true
  taskLoading.value = false
}

async function loadContracts() {
  contractLoading.value = true
  const response = await listContract({ projectId: props.projectId, pageNum: 1, pageSize: 100 })
  contracts.value = response.rows || []
  tabLoaded.contracts = true
  contractLoading.value = false
}

async function loadPayments() {
  paymentLoading.value = true
  const response = await listPayment({ projectId: props.projectId, pageNum: 1, pageSize: 100 })
  const rows = response.rows || []
  payments.value = rows.map(p => ({
    ...p,
    isOverdue: calculatePaymentOverdue(p),
    overdueDays: calculatePaymentOverdueDays(p)
  }))
  tabLoaded.payments = true
  paymentLoading.value = false
}

async function loadSettlement() {
  settlementLoading.value = true
  try {
    const response = await getSettlementDetail(props.projectId)
    settlement.value = response.data || {}
  } catch (e) {
    settlement.value = { internalWorkload: 0, externalWorkload: 0, internalOutput: 0, externalOutput: 0 }
  }
  tabLoaded.settlement = true
  settlementLoading.value = false
}

async function loadMaterials() {
  materialLoading.value = true
  const response = await listMaterial({ projectId: props.projectId, pageNum: 1, pageSize: 100 })
  materials.value = response.rows || []
  tabLoaded.materials = true
  materialLoading.value = false
}

function calculateIsOverdue(task) {
  if (!task.requiredFinishDate || task.status === '已完成') return false
  const deadline = new Date(task.requiredFinishDate)
  const today = new Date()
  return deadline < today
}

function calculateOverdueDays(task) {
  if (!task.requiredFinishDate || task.status === '已完成') return 0
  const deadline = new Date(task.requiredFinishDate)
  const today = new Date()
  const diff = Math.floor((today - deadline) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

function calculatePaymentOverdue(payment) {
  if (payment.receivedStatus === '已到账') return false
  if (!payment.paymentTime) return false
  const paymentDate = new Date(payment.paymentTime)
  const today = new Date()
  const diff = Math.floor((today - paymentDate) / (1000 * 60 * 60 * 24))
  return diff > 7
}

function calculatePaymentOverdueDays(payment) {
  if (payment.receivedStatus === '已到账') return 0
  if (!payment.paymentTime) return 0
  const paymentDate = new Date(payment.paymentTime)
  const today = new Date()
  const diff = Math.floor((today - paymentDate) / (1000 * 60 * 60 * 24))
  return diff > 7 ? diff - 7 : 0
}

watch(() => props.visible, async (v) => {
  if (v && props.projectId) {
    loading.value = true
    Object.keys(tabLoaded).forEach(k => tabLoaded[k] = false)
    activeTab.value = props.initialTab || 'overview'
    await loadOverview()
    loading.value = false
    if (activeTab.value !== 'overview') {
      handleTabChange(activeTab.value)
    }
    if (props.initialFilter?.filter && activeTab.value === 'tasks') {
      taskFilter.value = props.initialFilter.filter === 'overdue' ? 'overdue' : 'all'
    }
  }
})

async function handleTabChange(name) {
  if (name === 'tasks' && !tabLoaded.tasks) await loadTasks()
  else if (name === 'contracts' && !tabLoaded.contracts) await loadContracts()
  else if (name === 'payments' && !tabLoaded.payments) await loadPayments()
  else if (name === 'settlement' && !tabLoaded.settlement) await loadSettlement()
  else if (name === 'materials' && !tabLoaded.materials) await loadMaterials()
}

async function toggleTask(task, checked) {
  const old = task.status
  task.status = checked ? '已完成' : old
  if (checked) {
    task.actualFinishDate = new Date().toISOString().slice(0, 10)
    task.isOverdue = false
    task.overdueDays = 0
  }
  try {
    await proxy.$http.put('/project/task', { ...task, status: checked ? '已完成' : old })
    proxy.$modal.msgSuccess(`任务【${task.taskName}】已标记完成`)
    loadTaskStats()
  } catch (e) {
    task.status = old
    proxy.$modal.msgError('操作失败')
  }
}

function jumpToPayments(contractId) {
  activeTab.value = 'payments'
  proxy.$modal.msgInfo(`已切换到付款明细`)
  handleTabChange('payments')
}

function handleExport() {
  proxy.download('/project/project/export', { id: props.projectId }, `project_${project.value?.projectCode}_${new Date().getTime()}.xlsx`)
}
</script>

<style scoped>
.project-detail-drawer :deep(.el-drawer__body) {
  padding: 0;
  background: #fafbfc;
}

.drawer-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: #86909c;
  font-size: 14px;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f2f5;
}
.header-left .project-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.header-left h2 {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
  margin: 0;
}
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}
.status-tag .dot {
  width: 7px; height: 7px;
  border-radius: 50%;
}
.tag-pending { background: #f4f4f5; color: #909399; }
.tag-pending .dot { background: #909399; }
.tag-ongoing { background: #e8f4ff; color: #409eff; }
.tag-ongoing .dot { background: #409eff; }
.tag-completed { background: #f0f9eb; color: #67c23a; }
.tag-completed .dot { background: #67c23a; }
.tag-paused { background: #fdf6ec; color: #e6a23c; }
.tag-paused .dot { background: #e6a23c; }
.tag-closed { background: #f0f9eb; color: #67c23a; }
.tag-closed .dot { background: #67c23a; }
.tag-cancelled { background: #fef0f0; color: #f56c6c; }
.tag-cancelled .dot { background: #f56c6c; }

.meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #86909c;
}
.meta .el-icon { margin-right: 3px; vertical-align: -2px; }
.header-right {
  display: flex;
  gap: 6px;
  align-items: center;
}

.detail-tabs {
  flex: 1;
  padding: 0 24px;
  overflow-y: auto;
  background: #fafbfc;
}
.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
  position: sticky;
  top: 0;
  background: #fafbfc;
  z-index: 2;
}
.detail-tabs :deep(.el-tabs__nav-wrap)::after {
  background: #f0f2f5;
}
.detail-tabs :deep(.el-tabs__item) {
  font-size: 13px;
  font-weight: 600;
  padding: 0 14px;
}

.tab-loading {
  display: flex;
  justify-content: center;
  padding: 40px;
  color: #c0c4cc;
  font-size: 22px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-bottom: 24px;
}
.metric-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #f0f2f5;
  position: relative;
  overflow: hidden;
}
.metric-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
}
.metric-base::before { background: #409eff; }
.metric-task::before { background: #67c23a; }
.metric-contract::before { background: #e6a23c; }
.metric-payment::before { background: #9254de; }
.metric-settlement::before { background: #ff7a00; }
.metric-material::before { background: #36cfc9; }

.metric-label {
  font-size: 12px;
  color: #86909c;
  margin-bottom: 8px;
}
.metric-body .row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px dashed #f0f2f5;
}
.metric-body .row:last-child { border-bottom: none; }
.metric-body .row span { color: #86909c; }
.metric-body .row b { color: #1d2129; font-weight: 600; }

.big-num {
  font-size: 20px;
  font-weight: 700;
  color: #1d2129;
  font-family: 'JetBrains Mono', Consolas, monospace;
  letter-spacing: -0.5px;
}
.sub-text {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}

.ring-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}
.ring-meta {
  font-size: 11px;
}
.ring-meta .num {
  font-size: 16px;
  font-weight: 700;
  color: #1d2129;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.ring-meta .lbl {
  color: #86909c;
}

.metric-settlement .dual {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #86909c;
  margin-top: 4px;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.tab-toolbar .hint {
  font-size: 12px;
  color: #86909c;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #f0f2f5;
  transition: all 0.2s;
}
.task-row:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.08);
}
.task-row.overdue {
  border-left: 3px solid #f56c6c;
}
.task-row.done {
  opacity: 0.6;
}
.task-row.done .task-name {
  text-decoration: line-through;
}
.task-main {
  flex: 1;
}
.task-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.task-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #86909c;
}

.contract-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding-bottom: 24px;
}
.contract-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px;
  border: 1px solid #f0f2f5;
  transition: all 0.2s;
}
.contract-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.contract-card.is-unarchived {
  border-left: 3px solid #e6a23c;
}
.contract-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.contract-no {
  font-size: 12px;
  color: #86909c;
}
.contract-name {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 8px;
}
.contract-meta {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #86909c;
  margin-bottom: 10px;
}
.contract-amount {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  border-top: 1px dashed #f0f2f5;
}
.contract-amount .lbl {
  font-size: 12px;
  color: #86909c;
}
.contract-amount .val {
  font-size: 18px;
  font-weight: 700;
  color: #ff7a00;
  font-family: 'JetBrains Mono', Consolas, monospace;
}
.payment-bar {
  margin-top: 8px;
}
.payment-bar .bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #86909c;
  margin-bottom: 4px;
}
.contract-footer {
  margin-top: 10px;
  text-align: right;
}

.payment-timeline {
  padding-bottom: 24px;
  padding-left: 8px;
}
.timeline-item {
  display: flex;
  gap: 14px;
  padding-bottom: 16px;
  position: relative;
}
.timeline-item::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 24px;
  bottom: 0;
  width: 2px;
  background: #e8eaef;
}
.timeline-item:last-child::before {
  display: none;
}
.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  flex-shrink: 0;
  z-index: 1;
}
.timeline-dot.received { background: #67c23a; }
.timeline-dot.pending { background: #e6a23c; }
.timeline-body {
  flex: 1;
  background: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #f0f2f5;
}
.timeline-item.overdue .timeline-body {
  border-left: 3px solid #f56c6c;
}
.timeline-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}
.pay-type {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
}
.pay-amount {
  font-size: 16px;
  font-weight: 700;
  color: #ff7a00;
  font-family: 'JetBrains Mono', Consolas, monospace;
  flex: 1;
}
.timeline-meta {
  font-size: 12px;
  color: #86909c;
}
.overdue-warn {
  color: #f56c6c;
  font-weight: 600;
  margin-left: 8px;
}

.settlement-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-bottom: 24px;
}
.set-col {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f0f2f5;
}
.col-head {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}
.col-head.internal { background: linear-gradient(135deg, #409eff, #6ba9ff); }
.col-head.external { background: linear-gradient(135deg, #ff7a00, #ff9d3a); }
.set-row {
  display: flex;
  justify-content: space-between;
  padding: 14px;
  font-size: 13px;
  border-bottom: 1px dashed #f0f2f5;
}
.set-row:last-child { border-bottom: none; }
.set-row span { color: #86909c; }
.set-row b {
  color: #1d2129;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 15px;
}
.set-total {
  grid-column: span 2;
  background: linear-gradient(135deg, #1d2129 0%, #2c3340 100%);
  color: #fff;
  padding: 18px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.set-total .lbl {
  font-size: 13px;
  opacity: 0.7;
}
.set-total .val {
  font-size: 22px;
  font-weight: 700;
  font-family: 'JetBrains Mono', Consolas, monospace;
  color: #ffd97a;
}

.material-list {
  padding-bottom: 24px;
}
.material-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fff;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #f0f2f5;
}
.material-row.pending {
  border-left: 3px solid #e6a23c;
}
.material-row .file-icon {
  font-size: 18px;
  color: #409eff;
}
.mat-main {
  flex: 1;
}
.mat-type {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}
.mat-meta {
  font-size: 12px;
  color: #86909c;
  margin-top: 2px;
}

.mono {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
}
</style>
