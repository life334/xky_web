<template>
  <div class="project-control-tower">
    <el-form :model="queryParams" :inline="true" class="search-bar">
      <el-form-item label="工程编号" prop="projectCode">
        <el-input v-model="queryParams.projectCode" placeholder="请输入工程编号" clearable style="width: 160px" @keyup.enter="getList" />
      </el-form-item>
      <el-form-item label="项目名称" prop="projectName">
        <el-input v-model="queryParams.projectName" placeholder="请输入项目名称" clearable style="width: 200px" @keyup.enter="getList" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="项目状态" clearable style="width: 130px">
          <el-option v-for="dict in (proj_project_status || [])" :key="dict.value" :label="dict.label" :value="dict.value" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="toolbar">
      <div class="toolbar-left">
        <span class="title">项目控制塔</span>
        <el-tooltip content="开启后高风险项目自动置顶并高亮，便于每日晨间巡检" placement="top">
          <div class="patrol-switch" :class="{ active: morningPatrol }" @click="morningPatrol = !morningPatrol">
            <el-icon class="icon"><Sunrise /></el-icon>
            <span class="label">晨检模式</span>
            <span class="dot" :class="{ on: morningPatrol }"></span>
          </div>
        </el-tooltip>
      </div>
      <div class="toolbar-right">
        <el-button icon="Download" plain @click="handleExportAll">一键导出资料</el-button>
        <el-button type="primary" icon="Plus" v-hasPermi="['project:project:add']" @click="handleAdd">新增项目</el-button>
      </div>
    </div>

    <transition name="slide-down">
      <div v-if="morningPatrol" class="patrol-banner">
        <el-icon><Warning /></el-icon>
        <span>今日待处理项目 <b>{{ patrolStats.highRisk }}</b> 项，超期任务 <b>{{ patrolStats.overdueTasks }}</b> 个，未到账款项 <b>{{ patrolStats.overduePayments }}</b> 笔</span>
      </div>
    </transition>

    <div class="table-wrap">
      <el-table v-loading="loading" :data="sortedData" style="width: 100%" row-key="id" @row-click="openDrawer">
        <el-table-column prop="projectCode" label="工程编号" width="120">
          <template #default="{ row }">
            <span class="mono">{{ row.projectCode }}</span>
          </template>
        </el-table-column>

        <el-table-column label="项目名称" min-width="240">
          <template #default="{ row }">
            <div class="name-cell">
              <div class="name" :title="row.projectName">{{ row.projectName }}</div>
              <div class="sub" :title="row.clientUnit">{{ row.clientUnit }}</div>
              <div class="progress-line" :style="{ '--pct': row.progress + '%' }">
                <div class="bar" :class="progressClass(row.progress)" :style="{ width: row.progress + '%' }"></div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="负责人" width="120">
          <template #default="{ row }">
            <div class="avatar-stack">
              <el-avatar v-for="(p, i) in parseOwners(row.leaderNames).slice(0, 2)" :key="i" :size="22" class="avatar">{{ p.charAt(0) }}</el-avatar>
              <span v-if="parseOwners(row.leaderNames).length > 2" class="more">+{{ parseOwners(row.leaderNames).length - 2 }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-select
              v-model="row.status"
              size="small"
              class="status-select"
              :class="'status-' + normalizeStatus(row.status)"
              @click.stop
              @change="handleStatusChange(row)"
            >
              <el-option v-for="dict in (proj_project_status || [])" :key="dict.value" :value="dict.value" :label="dict.label">
                <span class="status-dot" :class="'dot-' + normalizeStatus(dict.value)"></span>
                {{ dict.label }}
              </el-option>
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="聚合预警" width="300">
          <template #default="{ row }">
            <div class="risk-pills">
              <template v-if="row.risks.total > 0">
                <div
                  v-if="row.risks.overdueTasks > 0"
                  class="pill pill-red pulse"
                  @click.stop="openDrawer(row, 'tasks', { filter: 'overdue' })"
                  :title="`任务超期 ${row.risks.overdueTasks} 个`"
                >
                  <el-icon><Clock /></el-icon><b>{{ row.risks.overdueTasks }}</b>超期
                </div>
                <div
                  v-if="row.risks.unarchivedContracts > 0"
                  class="pill pill-amber"
                  @click.stop="openDrawer(row, 'contracts', { filter: 'unarchived' })"
                  :title="`合同未归档 ${row.risks.unarchivedContracts} 份`"
                >
                  <el-icon><Document /></el-icon><b>{{ row.risks.unarchivedContracts }}</b>未归档
                </div>
                <div
                  v-if="row.risks.overduePayments > 0"
                  class="pill pill-yellow"
                  @click.stop="openDrawer(row, 'payments', { filter: 'overdue' })"
                  :title="`款项超期未到账 ${row.risks.overduePayments} 笔`"
                >
                  <el-icon><Money /></el-icon><b>{{ row.risks.overduePayments }}</b>未到账
                </div>
                <div
                  v-if="row.risks.pendingMaterials > 0"
                  class="pill pill-blue"
                  @click.stop="openDrawer(row, 'materials', { filter: 'pending' })"
                  :title="`资料未提交 ${row.risks.pendingMaterials} 项`"
                >
                  <el-icon><FolderOpened /></el-icon><b>{{ row.risks.pendingMaterials }}</b>未提交
                </div>
              </template>
              <div v-else class="pill pill-green">
                <el-icon><Check /></el-icon>健康
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <div class="action-cell" @click.stop>
              <el-button link type="primary" @click="openDrawer(row)">详情</el-button>
              <el-dropdown trigger="hover" @command="(c) => handleAction(c, row)">
                <el-button link type="primary" icon="ArrowDown" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="task" :disabled="row.risks.overdueTasks === 0" icon="Select">标记任务完成</el-dropdown-item>
                    <el-dropdown-item command="contract" icon="Document">查看合同</el-dropdown-item>
                    <el-dropdown-item command="export" icon="Download">导出项目资料</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无项目数据" />
        </template>
      </el-table>
    </div>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <ProjectDetailDrawer v-model:visible="drawerVisible" :project-id="currentId" :initial-tab="initialTab" :initial-filter="initialFilter" />
  </div>
</template>

<script setup name="ProjectControlTower">
import { ref, reactive, computed, onMounted, getCurrentInstance } from 'vue'
import { listProject, changeProjectStatus } from "@/api/project/project"
import ProjectDetailDrawer from "@/components/ProjectDetailDrawer"
import useSearchMemoryStore from "@/store/modules/searchMemory"

const { proxy } = getCurrentInstance()
const { proj_project_status } = useDict("proj_project_status")
const searchMemory = useSearchMemoryStore()

const loading = ref(false)
const dataList = ref([])
const total = ref(0)
const morningPatrol = ref(false)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 20,
  projectCode: undefined,
  projectName: undefined,
  status: undefined
})

const drawerVisible = ref(false)
const currentId = ref(null)
const initialTab = ref('overview')
const initialFilter = ref({})

function parseOwners(names) {
  if (!names) return []
  return names.split(/[,，、]/).filter(n => n.trim())
}

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

function progressClass(p) {
  if (p < 50) return 'bar-low'
  if (p < 80) return 'bar-mid'
  return 'bar-high'
}

const sortedData = computed(() => {
  if (!morningPatrol.value) return dataList.value
  return [...dataList.value].sort((a, b) => {
    if (b.risks.total !== a.risks.total) return b.risks.total - a.risks.total
    return a.progress - b.progress
  })
})

const patrolStats = computed(() => ({
  highRisk: dataList.value.filter(r => r.risks.total >= 3).length,
  overdueTasks: dataList.value.reduce((s, r) => s + r.risks.overdueTasks, 0),
  overduePayments: dataList.value.reduce((s, r) => s + r.risks.overduePayments, 0)
}))

/** 查询：同步工程编号到全局记忆（含清空） */
function handleQuery() {
  searchMemory.setProjectCode(queryParams.projectCode)
  getList()
}

function getList() {
  loading.value = true
  listProject(queryParams).then(response => {
    const rows = response.rows || []
    dataList.value = rows.map(row => ({
      ...row,
      progress: calculateProgress(row),
      risks: calculateRisks(row)
    }))
    total.value = response.total
    loading.value = false
  })
}

function calculateProgress(row) {
  if (row.status === 'completed' || row.status === 'closed') return 100
  if (row.status === 'paused') return Math.round(row.totalDuration ? (row.totalDuration - (row.durationRequire || 0)) / row.totalDuration * 50 + 30 : 35)
  if (row.totalDuration && row.durationRequire) {
    return Math.round((row.totalDuration - row.durationRequire) / row.totalDuration * 100)
  }
  return 50
}

function calculateRisks(row) {
  return {
    overdueTasks: row.overdueTaskCount || 0,
    unarchivedContracts: row.unarchivedContractCount || 0,
    overduePayments: row.overduePaymentCount || 0,
    pendingMaterials: row.pendingMaterialCount || 0,
    total: (row.overdueTaskCount || 0) + (row.unarchivedContractCount || 0) + (row.overduePaymentCount || 0) + (row.pendingMaterialCount || 0)
  }
}

function resetQuery() {
  queryParams.projectCode = undefined
  queryParams.projectName = undefined
  queryParams.status = undefined
  queryParams.pageNum = 1
  getList()
}

function openDrawer(row, tab = 'overview', filter = {}) {
  currentId.value = row.id
  initialTab.value = tab
  initialFilter.value = filter
  drawerVisible.value = true
}

async function handleStatusChange(row) {
  try {
    await changeProjectStatus(row.id, row.status)
    proxy.$modal.msgSuccess("状态变更成功")
    getList()
  } catch (e) {
    proxy.$modal.msgError("状态更新失败")
  }
}

function handleAction(cmd, row) {
  if (cmd === 'task') openDrawer(row, 'tasks', { filter: 'overdue' })
  else if (cmd === 'contract') openDrawer(row, 'contracts')
  else if (cmd === 'export') handleExport(row)
}

function handleExport(row) {
  proxy.download('/project/project/export', { id: row.id }, `project_${row.projectCode}_${new Date().getTime()}.xlsx`)
}

function handleExportAll() {
  proxy.download('/project/project/export', { ...queryParams }, `project_all_${new Date().getTime()}.xlsx`)
}

function handleAdd() {
  proxy.$modal.msgInfo('请使用原项目列表页的新增功能')
}

onMounted(() => {
  getList()
  // 全局工程编号回填：仅回填输入框，不自动查询（用户点「查询」才生效）
  if (searchMemory.projectCode && !queryParams.projectCode) {
    queryParams.projectCode = searchMemory.projectCode
  }
})
</script>

<style scoped>
.project-control-tower {
  padding: 16px 20px;
  background: var(--el-bg-page, #f5f7fa);
  min-height: 100vh;
}

.search-bar {
  background: #fff;
  padding: 16px 20px 0;
  border-radius: 6px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 12px 20px;
  border-radius: 6px;
  margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.title {
  font-size: 17px;
  font-weight: 700;
  color: #1d2129;
  letter-spacing: 0.5px;
}
.patrol-switch {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px 5px 10px;
  border-radius: 999px;
  background: #f0f2f5;
  cursor: pointer;
  font-size: 13px;
  color: #4e5969;
  transition: all 0.25s;
  user-select: none;
}
.patrol-switch .icon { font-size: 15px; }
.patrol-switch:hover { background: #e8eaf0; }
.patrol-switch.active {
  background: linear-gradient(135deg, #fff4d6 0%, #ffd97a 100%);
  color: #8a5a00;
  box-shadow: 0 0 0 1px rgba(255, 193, 7, 0.4), 0 2px 8px rgba(255, 193, 7, 0.25);
}
.patrol-switch .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #c0c4cc;
  transition: all 0.25s;
}
.patrol-switch .dot.on {
  background: #ff7a00;
  box-shadow: 0 0 6px #ff7a00;
}

.patrol-banner {
  background: linear-gradient(90deg, #fff7e6 0%, #ffefe0 100%);
  border-left: 3px solid #ff7a00;
  padding: 10px 16px;
  border-radius: 4px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #8a5a00;
}
.patrol-banner b {
  color: #d4380d;
  font-weight: 700;
  margin: 0 2px;
}

.table-wrap {
  background: #fff;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}
.name-cell .name {
  font-weight: 600;
  color: #1d2129;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}
.name-cell .sub {
  font-size: 12px;
  color: #86909c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 280px;
}
.progress-line {
  width: 100%;
  height: 3px;
  background: #f0f2f5;
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}
.progress-line .bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s ease;
}
.progress-line .bar.bar-low { background: linear-gradient(90deg, #f56c6c, #ff8a8a); }
.progress-line .bar.bar-mid { background: linear-gradient(90deg, #e6a23c, #ffc660); }
.progress-line .bar.bar-high { background: linear-gradient(90deg, #67c23a, #95d475); }

.avatar-stack {
  display: flex;
  align-items: center;
}
.avatar-stack .avatar {
  background: #409eff;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  margin-left: -6px;
  border: 2px solid #fff;
}
.avatar-stack .avatar:first-child { margin-left: 0; }
.avatar-stack .more {
  font-size: 11px;
  color: #86909c;
  margin-left: 4px;
  background: #f0f2f5;
  padding: 1px 5px;
  border-radius: 8px;
}

.status-select {
  width: 100px;
}
.status-select :deep(.el-input__wrapper) {
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.status-select.status-pending :deep(.el-input__wrapper) { background: #f4f4f5; box-shadow: 0 0 0 1px #d3d4d6 inset; }
.status-select.status-ongoing :deep(.el-input__wrapper) { background: #e8f4ff; box-shadow: 0 0 0 1px #c6e2ff inset; }
.status-select.status-completed :deep(.el-input__wrapper) { background: #f0f9eb; box-shadow: 0 0 0 1px #c2e7b0 inset; }
.status-select.status-paused :deep(.el-input__wrapper) { background: #fdf6ec; box-shadow: 0 0 0 1px #f5dab1 inset; }
.status-select.status-closed :deep(.el-input__wrapper) { background: #f0f9eb; box-shadow: 0 0 0 1px #c2e7b0 inset; }
.status-select.status-cancelled :deep(.el-input__wrapper) { background: #fef0f0; box-shadow: 0 0 0 1px #fbc4c4 inset; }

.status-dot {
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}
.status-dot.dot-pending { background: #909399; }
.status-dot.dot-ongoing { background: #409eff; }
.status-dot.dot-completed { background: #67c23a; }
.status-dot.dot-paused { background: #e6a23c; }
.status-dot.dot-closed { background: #67c23a; }
.status-dot.dot-cancelled { background: #f56c6c; }

.risk-pills {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  user-select: none;
}
.pill .el-icon { font-size: 11px; }
.pill b { font-weight: 700; margin: 0 1px; }
.pill-red {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}
.pill-red.pulse {
  animation: pulseRed 1.8s ease-in-out infinite;
}
.pill-amber {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #f5dab1;
}
.pill-yellow {
  background: #fff8e6;
  color: #c88800;
  border: 1px solid #ffe082;
}
.pill-blue {
  background: #ecf5ff;
  color: #409eff;
  border: 1px solid #c6e2ff;
}
.pill-green {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #c2e7b0;
}
.pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

@keyframes pulseRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.5); }
  50% { box-shadow: 0 0 0 4px rgba(245, 108, 108, 0); }
}

.action-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mono {
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, Monaco, monospace;
  font-size: 12px;
  color: #4e5969;
  letter-spacing: 0.3px;
}

.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
