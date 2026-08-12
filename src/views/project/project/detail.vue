<template>
   <div class="app-container">
      <!-- 面包屑 + 标题栏 -->
      <el-breadcrumb separator="/" style="margin-bottom: 8px">
         <el-breadcrumb-item>项目列表</el-breadcrumb-item>
         <el-breadcrumb-item>项目工作台</el-breadcrumb-item>
      </el-breadcrumb>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
         <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px; font-weight: 600;">{{ projectInfo.projectName || projectInfo.projectCode || '' }}</span>
            <dict-tag v-if="projectInfo.status" :options="proj_project_status" :value="projectInfo.status" />
            <span v-if="projectInfo.projectName && projectInfo.projectCode" style="font-size: 13px; color: #909399;">工程编号：{{ projectInfo.projectCode }}</span>
         </div>
         <el-button icon="Back" @click="goBack">返回列表</el-button>
      </div>

      <!-- Tab 区 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
         <!-- 基本信息 -->
         <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="3" border style="margin-top: 8px">
               <el-descriptions-item label="工程编号">{{ projectInfo.projectCode || '-' }}</el-descriptions-item>
               <el-descriptions-item label="项目名称">{{ projectInfo.projectName || '-' }}</el-descriptions-item>
               <el-descriptions-item label="项目类别">{{ projectInfo.categoryName || '-' }}</el-descriptions-item>
               <el-descriptions-item label="工程项目">{{ projectInfo.engineeringProject || '-' }}</el-descriptions-item>
               <el-descriptions-item label="委托单位">{{ projectInfo.clientUnit || '-' }}</el-descriptions-item>
               <el-descriptions-item label="工程地点">{{ projectInfo.projectLocation || '-' }}</el-descriptions-item>
               <el-descriptions-item label="联系人">{{ projectInfo.contactName || '-' }}</el-descriptions-item>
               <el-descriptions-item label="联系电话">{{ projectInfo.contactPhone || '-' }}</el-descriptions-item>
               <el-descriptions-item label="合同">{{ projectInfo.contractName || '-' }}</el-descriptions-item>
               <el-descriptions-item label="安排日期">{{ projectInfo.assignDate ? parseTime(projectInfo.assignDate, '{y}-{m}-{d}') : '-' }}</el-descriptions-item>
               <el-descriptions-item label="工期要求">{{ projectInfo.durationRequire != null ? projectInfo.durationRequire + ' 天' : '-' }}</el-descriptions-item>
               <el-descriptions-item label="总时长">
                  <template v-if="projectInfo.status === 'closed' || projectInfo.status === 'archived'">
                     {{ projectInfo.totalDuration != null ? projectInfo.totalDuration + ' 天（已固定）' : '-' }}
                  </template>
                  <template v-else>
                     <span v-if="detailDuration != null">{{ detailDuration }} 天</span>
                     <span v-else-if="projectInfo.assignDate" style="color:#a8abb2">计算中...</span>
                     <span v-else>-</span>
                  </template>
               </el-descriptions-item>
               <el-descriptions-item label="负责人">{{ projectInfo.leaderNames || '-' }}</el-descriptions-item>
               <el-descriptions-item label="状态">
                  <dict-tag v-if="projectInfo.status" :options="proj_project_status" :value="projectInfo.status" />
                  <span v-else style="color: #c0c4cc">-</span>
               </el-descriptions-item>
               <el-descriptions-item label="备注">{{ projectInfo.remark || '-' }}</el-descriptions-item>
               <el-descriptions-item label="创建者">{{ projectInfo.createBy || '-' }}</el-descriptions-item>
               <el-descriptions-item label="创建时间">{{ parseTime(projectInfo.createTime) }}</el-descriptions-item>
               <el-descriptions-item label="修改时间">{{ parseTime(projectInfo.updateTime) }}</el-descriptions-item>
            </el-descriptions>
         </el-tab-pane>

         <!-- 任务安排 -->
         <el-tab-pane label="任务安排" name="task">
            <el-table v-loading="taskLoading" :data="taskList" stripe border style="margin-top: 8px">
               <el-table-column label="任务名称" align="center" prop="taskName" :show-overflow-tooltip="true" min-width="160" />
               <el-table-column label="执行人" align="center" prop="userName" min-width="90" />
               <el-table-column label="安排日期" align="center" prop="assignDate" width="110">
                  <template #default="scope"><span>{{ parseTime(scope.row.assignDate, '{y}-{m}-{d}') }}</span></template>
               </el-table-column>
               <el-table-column label="要求完成" align="center" prop="requiredFinishDate" width="110">
                  <template #default="scope"><span>{{ parseTime(scope.row.requiredFinishDate, '{y}-{m}-{d}') }}</span></template>
               </el-table-column>
               <el-table-column label="实际完成" align="center" prop="actualFinishDate" width="110">
                  <template #default="scope">
                     <span v-if="scope.row.actualFinishDate">{{ parseTime(scope.row.actualFinishDate, '{y}-{m}-{d}') }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="工期要求" align="center" prop="durationRequire" min-width="100" />
               <el-table-column label="总时长(天)" align="center" prop="totalDuration" width="90" />
               <el-table-column label="状态" align="center" prop="status" width="90">
                  <template #default="scope">
                     <dict-tag v-if="scope.row.status" :options="proj_task_status" :value="scope.row.status" />
                     <span v-else style="color: #c0c4cc">—</span>
                  </template>
               </el-table-column>
            </el-table>
         </el-tab-pane>

         <!-- 工作量录入（只读） -->
         <el-tab-pane label="工作量" name="workload">
            <el-table v-loading="workloadLoading" :data="workloadList" stripe border style="margin-top: 8px">
               <el-table-column label="执行人" align="center" prop="userName" min-width="90" />
               <el-table-column label="项目类别" align="center" prop="categoryName" min-width="120" />
               <el-table-column label="工作量" align="center" prop="workload" min-width="90" />
               <el-table-column label="内部单价" align="center" prop="internalPrice" min-width="100">
                  <template #default="scope"><span v-if="scope.row.internalPrice != null">{{ formatMoney(scope.row.internalPrice) }}</span></template>
               </el-table-column>
               <el-table-column label="外部单价" align="center" prop="externalPrice" min-width="100">
                  <template #default="scope"><span v-if="scope.row.externalPrice != null">{{ formatMoney(scope.row.externalPrice) }}</span></template>
               </el-table-column>
               <el-table-column label="内部产值" align="center" prop="internalOutput" min-width="110">
                  <template #default="scope"><span v-if="scope.row.internalOutput != null" style="color:#67c23a;font-weight:500">{{ formatMoney(scope.row.internalOutput) }}</span></template>
               </el-table-column>
               <el-table-column label="外部产值" align="center" prop="externalOutput" min-width="110">
                  <template #default="scope"><span v-if="scope.row.externalOutput != null" style="color:#e6a23c;font-weight:500">{{ formatMoney(scope.row.externalOutput) }}</span></template>
               </el-table-column>
            </el-table>
         </el-tab-pane>

         <!-- 付款记录（只读） -->
         <el-tab-pane label="付款记录" name="payment">
            <el-table v-loading="paymentLoading" :data="paymentList" stripe border style="margin-top: 8px">
               <el-table-column label="付款类型" align="center" prop="paymentType" min-width="100">
                  <template #default="scope">
                     <dict-tag :options="proj_payment_type" :value="scope.row.paymentType" />
                  </template>
               </el-table-column>
               <el-table-column label="金额(元)" align="center" prop="amount" min-width="130">
                  <template #default="scope"><span v-if="scope.row.amount != null" style="font-weight:500">{{ formatMoney(scope.row.amount) }}</span></template>
               </el-table-column>
               <el-table-column label="付款时间" align="center" prop="payTime" min-width="110">
                  <template #default="scope"><span v-if="scope.row.payTime">{{ parseTime(scope.row.payTime, '{y}-{m}-{d}') }}</span></template>
               </el-table-column>
               <el-table-column label="付款单位" align="center" prop="payUnit" min-width="150" :show-overflow-tooltip="true" />
               <el-table-column label="付款方式" align="center" prop="payMethod" min-width="100" />
               <el-table-column label="发票号" align="center" prop="invoiceNo" min-width="140" :show-overflow-tooltip="true">
                  <template #default="scope"><span v-if="scope.row.invoiceNo">{{ scope.row.invoiceNo }}</span><span v-else style="color: #c0c4cc">—</span></template>
               </el-table-column>
               <el-table-column label="开票日期" align="center" prop="invoiceDate" min-width="110">
                  <template #default="scope"><span v-if="scope.row.invoiceDate">{{ parseTime(scope.row.invoiceDate, '{y}-{m}-{d}') }}</span><span v-else style="color: #c0c4cc">—</span></template>
               </el-table-column>
               <el-table-column label="开票金额" align="center" prop="invoiceAmount" min-width="120">
                  <template #default="scope"><span v-if="scope.row.invoiceAmount != null" style="font-weight:500">{{ formatMoney(scope.row.invoiceAmount) }}</span><span v-else style="color: #c0c4cc">—</span></template>
               </el-table-column>
               <el-table-column label="开票状态" align="center" prop="invoiceStatus" min-width="90">
                  <template #default="scope">
                     <el-tag v-if="scope.row.invoiceStatus === '未开'" type="info">未开</el-tag>
                     <el-tag v-else-if="scope.row.invoiceStatus === '已开'" type="success">已开</el-tag>
                     <el-tag v-else-if="scope.row.invoiceStatus === '已作废'" type="danger">已作废</el-tag>
                     <span v-else style="color: #c0c4cc">—</span>
                  </template>
               </el-table-column>
            </el-table>
         </el-tab-pane>

         <!-- 资料管理 -->
         <el-tab-pane label="资料管理" name="material">
            <el-table v-loading="materialLoading" :data="materialList" stripe border style="margin-top: 8px">
               <el-table-column label="提交时间" align="center" prop="submitTime" min-width="160">
                  <template #default="scope"><span v-if="scope.row.submitTime">{{ parseTime(scope.row.submitTime, '{y}-{m}-{d}') }}</span></template>
               </el-table-column>
               <el-table-column label="联系人" align="center" prop="contactName" min-width="90" />
               <el-table-column label="联系电话" align="center" prop="contactPhone" min-width="110" />
               <el-table-column label="成果类型" align="center" prop="resultType" min-width="100">
                  <template #default="scope">
                     <dict-tag v-if="scope.row.resultType" :options="proj_material_result_type" :value="scope.row.resultType" />
                     <span v-else style="color: #c0c4cc">—</span>
                  </template>
               </el-table-column>
               <el-table-column label="目录" align="center" prop="archiveDir" min-width="120" :show-overflow-tooltip="true" />
               <el-table-column label="状态" align="center" prop="status" min-width="90">
                  <template #default="scope">
                     <dict-tag v-if="scope.row.status" :options="proj_material_status" :value="scope.row.status" />
                     <span v-else style="color: #c0c4cc">—</span>
                  </template>
               </el-table-column>
               <el-table-column label="备注" align="center" prop="remark" min-width="120" :show-overflow-tooltip="true" />
            </el-table>
         </el-tab-pane>

         <!-- 产值结算 -->
         <el-tab-pane label="产值结算" name="settlement">
            <div v-loading="settlementLoading">
               <el-row :gutter="12" style="margin-top: 8px">
               <el-col :span="6">
                  <div class="kpi-card"><div class="kpi-label">外部产值</div><div class="kpi-value" style="color:#e6a23c">{{ formatMoney(settlementOverview.externalOutput) }}</div></div>
               </el-col>
               <el-col :span="6">
                  <div class="kpi-card"><div class="kpi-label">内部产值</div><div class="kpi-value" style="color:#67c23a">{{ formatMoney(settlementOverview.internalOutput) }}</div></div>
               </el-col>
               <el-col :span="6">
                  <div class="kpi-card"><div class="kpi-label">已收款</div><div class="kpi-value" style="color:#409eff">{{ formatMoney(settlementOverview.receivedAmount) }}</div></div>
               </el-col>
               <el-col :span="6">
                  <div class="kpi-card"><div class="kpi-label">待收差额</div><div class="kpi-value" :style="{ color: pendingColor }">{{ formatMoney(settlementOverview.pendingAmount) }}</div></div>
               </el-col>
            </el-row>
            <!-- 结算进度 -->
            <div class="settle-progress-card" style="margin-top: 12px;">
               <div class="settle-progress-head">
                  <span class="settle-progress-label">结算进度</span>
                  <el-tag :type="settleStatusType" size="small">{{ settleStatusText }}</el-tag>
               </div>
               <div class="settle-progress-track">
                  <div class="settle-progress-bar" :style="{ width: settleProgressPercent + '%', background: settleStatusColor }"></div>
               </div>
               <div class="settle-progress-foot">
                  <span>已收 {{ formatMoney(settlementOverview.receivedAmount) }} / 结算总额 {{ formatMoney(settlementOverview.totalOutput) }}</span>
                  <span>{{ settleProgressPercent }}%</span>
               </div>
            </div>
            <el-alert type="info" :closable="false" style="margin-top: 12px">
               产值数据来源于「费用结算」模块的工作量核算，收款数据来源于「付款记录」页签。如需调整请在对应模块操作。
            </el-alert>
            </div>
         </el-tab-pane>
      </el-tabs>

      <!-- 工作量录入弹窗 -->
      <el-dialog :title="workloadTitle" :model-value="workloadOpen" @update:model-value="workloadOpen = $event" width="640px" append-to-body>
         <el-form ref="workloadRef" :model="workloadForm" :rules="workloadRules" label-width="100px">
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="执行人" prop="userId">
                     <el-select v-model="workloadForm.userId" filterable placeholder="请选择" style="width: 100%">
                        <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="项目类别" prop="categoryId">
                     <el-tree-select v-model="workloadForm.categoryId" :data="categoryOptions" :props="{ value: 'id', label: 'label', children: 'children' }" value-key="id" placeholder="请选择" check-strictly clearable style="width: 100%" @change="onWorkloadCategoryChange" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="工作量" prop="workload">
                     <el-input-number v-model="workloadForm.workload" :precision="4" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="内部单价" prop="internalPrice">
                     <el-input-number v-model="workloadForm.internalPrice" :precision="2" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="外部单价" prop="externalPrice">
                     <el-input-number v-model="workloadForm.externalPrice" :precision="2" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
         </el-form>
         <template #footer>
            <el-button type="primary" @click="submitWorkload">确 定</el-button>
            <el-button @click="workloadOpen = false">取 消</el-button>
         </template>
      </el-dialog>

      <!-- 付款登记弹窗 -->
      <el-dialog :title="paymentTitle" :model-value="paymentOpen" @update:model-value="paymentOpen = $event" width="560px" append-to-body>
         <el-form ref="paymentRef" :model="paymentForm" :rules="paymentRules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="付款类型" prop="paymentType">
                     <el-select v-model="paymentForm.paymentType" placeholder="请选择" style="width: 100%">
                        <el-option label="预付款" value="advance" />
                        <el-option label="进度款" value="progress" />
                        <el-option label="尾款" value="final" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="金额(元)" prop="amount">
                     <el-input-number v-model="paymentForm.amount" :precision="2" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="付款时间" prop="payTime">
                     <el-date-picker v-model="paymentForm.payTime" value-format="YYYY-MM-DD" type="date" placeholder="选择日期" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="付款方式" prop="payMethod">
                     <el-input v-model="paymentForm.payMethod" placeholder="如：银行转账" maxlength="100" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-form-item label="付款单位" prop="payUnit">
               <el-input v-model="paymentForm.payUnit" placeholder="请输入付款单位" maxlength="200" />
            </el-form-item>
         </el-form>
         <template #footer>
            <el-button type="primary" @click="submitPayment">确 定</el-button>
            <el-button @click="paymentOpen = false">取 消</el-button>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="ProjectDetail">
import { getProject } from "@/api/project/project"
import { listTask } from "@/api/project/task"
import { listWorkload, addWorkload, updateWorkload, delWorkload } from "@/api/project/workload"
import { listPayment, addPayment, updatePayment, delPayment } from "@/api/project/payment"
import { getSettlementOverview } from "@/api/project/settlement"
import { listMaterial } from "@/api/project/material"
import { listCategory, categoryTreeselect } from "@/api/project/category"
import { listUserOptions } from "@/api/system/user"
import { countWorkdays } from "@/utils/workday"

const { proxy } = getCurrentInstance()
const { proj_payment_type, proj_project_status, proj_material_result_type, proj_material_status, proj_task_status } = useDict('proj_payment_type', 'proj_project_status', 'proj_material_result_type', 'proj_material_status', 'proj_task_status')
const route = useRoute()

const projectId = route.params.projectId
const activeTab = ref("info")
const projectInfo = ref({})

// 详情总时长：进行中按"安排日期→今天"实时计算工作日（含头含尾）；办结/归档固定显示存储值
const detailDuration = ref(null)
const durationDisplay = computed(() => {
   const st = projectInfo.value.status
   if (st === 'closed' || st === 'archived') {
      return projectInfo.value.totalDuration != null ? projectInfo.value.totalDuration + ' 天' : '-'
   }
   if (!projectInfo.value.assignDate) return '-'
   if (detailDuration.value != null) return detailDuration.value + ' 天'
   return '计算中...'
})

// 各 Tab 数据
const taskLoading = ref(false)
const taskList = ref([])
const workloadLoading = ref(false)
const workloadList = ref([])
const paymentLoading = ref(false)
const paymentList = ref([])
const materialLoading = ref(false)
const materialList = ref([])
const userOptions = ref([])
const categoryOptions = ref([])
const categoryPriceMap = ref({})  // 类目id → { internalPrice, externalPrice }

// 产值结算总览（聚合接口数据）
const settlementLoading = ref(false)
const settlementOverview = ref({
   internalOutput: null,
   externalOutput: null,
   totalOutput: null,
   receivedAmount: null,
   pendingAmount: null,
   settlementStatus: null
})

// 工作量弹窗
const workloadOpen = ref(false)
const workloadTitle = ref("")
const workloadForm = ref({})
const workloadRules = {
   userId: [{ required: true, message: "请选择执行人", trigger: "change" }],
   categoryId: [{ required: true, message: "请选择项目类别", trigger: "change" }]
}

// 付款弹窗
const paymentOpen = ref(false)
const paymentTitle = ref("")
const paymentForm = ref({})
const paymentRules = {
   paymentType: [{ required: true, message: "请选择付款类型", trigger: "change" }],
   amount: [{ required: true, message: "请输入金额", trigger: "blur" }]
}

// 产值结算 tab 计算属性
const settleProgressPercent = computed(() => {
   const total = settlementOverview.value.totalOutput
   const received = settlementOverview.value.receivedAmount
   if (!total || total === 0) return 0
   return Math.min(100, Math.round(received * 100 / total))
})
const settleStatusText = computed(() => {
   const status = settlementOverview.value.settlementStatus
   if (status === 'overdue') return '超额收款'
   if (status === 'settled') return '已结清'
   return '未结清'
})
const settleStatusType = computed(() => {
   const status = settlementOverview.value.settlementStatus
   if (status === 'overdue') return 'danger'
   if (status === 'settled') return 'success'
   return 'warning'
})
const settleStatusColor = computed(() => {
   const status = settlementOverview.value.settlementStatus
   if (status === 'overdue') return '#f56c6c'
   if (status === 'settled') return '#67c23a'
   return '#e6a23c'
})
const pendingColor = computed(() => {
   const pending = settlementOverview.value.pendingAmount
   if (pending == null) return '#303133'
   if (pending > 0) return '#f56c6c'
   if (pending < 0) return '#e6a23c'
   return '#67c23a'
})

/** 格式化金额 */
function formatMoney(val) {
   if (val == null || val === "") return "-"
   return Number(val).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 元"
}

/** 返回列表 */
function goBack() {
   proxy.$router.push("/project/list")
}

/** Tab 切换 */
function handleTabChange(tabName) {
   if (tabName === "task" && taskList.value.length === 0) loadTasks()
   if (tabName === "workload") loadWorkloads()
   if (tabName === "payment") loadPayments()
   if (tabName === "material" && materialList.value.length === 0) loadMaterials()
   if (tabName === "settlement") loadSettlementOverview()
}

/** 加载产值结算总览（聚合接口，一次返回全部指标） */
function loadSettlementOverview() {
   settlementLoading.value = true
   getSettlementOverview(projectId).then(response => {
      settlementOverview.value = response.data || {}
      settlementLoading.value = false
   }).catch(() => { settlementLoading.value = false })
}

/** 加载项目信息 + 付款记录 */
function loadProjectInfo() {
   getProject(projectId).then(response => {
      projectInfo.value = response.data
      refreshDuration()
   }).catch(() => {
      projectInfo.value = {}
   })
   loadPayments()
}

/** 刷新详情总时长（工作日，自动排除周末/法定节假日） */
function refreshDuration() {
   detailDuration.value = null
   const st = projectInfo.value.status
   if (st === 'closed' || st === 'archived') return
   if (!projectInfo.value.assignDate) return
   countWorkdays(projectInfo.value.assignDate, new Date())
      .then(v => { detailDuration.value = v })
      .catch(() => {})
}

/** 加载任务 */
function loadTasks() {
   taskLoading.value = true
   listTask({ projectId: projectId, pageNum: 1, pageSize: 1000 }).then(response => {
      taskList.value = response.rows || []
      taskLoading.value = false
   }).catch(() => { taskLoading.value = false })
}

/** 加载工作量 */
function loadWorkloads() {
   workloadLoading.value = true
   listWorkload({ projectId: projectId, pageNum: 1, pageSize: 1000 }).then(response => {
      workloadList.value = response.rows || []
      workloadLoading.value = false
   }).catch(() => { workloadLoading.value = false })
}

/** 加载付款记录 */
function loadPayments() {
   paymentLoading.value = true
   listPayment({ projectId: projectId, pageNum: 1, pageSize: 1000 }).then(response => {
      paymentList.value = response.rows || []
      paymentLoading.value = false
   }).catch(() => { paymentLoading.value = false })
}

/** 加载资料 */
function loadMaterials() {
   materialLoading.value = true
   listMaterial({ projectId: projectId, pageNum: 1, pageSize: 1000 }).then(response => {
      materialList.value = response.rows || []
      materialLoading.value = false
   }).catch(() => { materialLoading.value = false })
}

/** 加载用户列表（仅项目分配的负责人） */
function loadUsers() {
   if (userOptions.value.length > 0) return
   const leaderIds = projectInfo.value.leaderIds || []
   if (leaderIds.length === 0) {
      userOptions.value = []
      return
   }
   listUserOptions({ pageNum: 1, pageSize: 1000 }).then(response => {
      const allUsers = response.rows || []
      const idSet = new Set(leaderIds.map(id => Number(id)))
      userOptions.value = allUsers.filter(u => idSet.has(u.userId))
   })
}

/** 加载类别树 + 单价映射 */
function loadCategoryTree() {
   if (categoryOptions.value.length > 0) return
   // 加载树结构（下拉展示用）
   categoryTreeselect().then(response => {
      categoryOptions.value = response.data
   })
   // 同步加载 flat 列表，构建 id→价格 映射
   listCategory().then(response => {
      const list = response.data || []
      const map = {}
      list.forEach(item => {
         if (item.internalPrice != null || item.externalPrice != null) {
            map[item.id] = { internalPrice: item.internalPrice, externalPrice: item.externalPrice }
         }
      })
      categoryPriceMap.value = map
   })
}

/** 新增工作量 */
function handleAddWorkload() {
   loadUsers()
   loadCategoryTree()
   workloadForm.value = { projectId: Number(projectId), userId: undefined, categoryId: undefined, workload: undefined, internalPrice: undefined, externalPrice: undefined }
   workloadTitle.value = "录入工作量"
   workloadOpen.value = true
}

/** 修改工作量 */
function handleEditWorkload(row) {
   loadUsers()
   loadCategoryTree()
   workloadForm.value = { ...row }
   workloadTitle.value = "修改工作量"
   workloadOpen.value = true
}

/** 选择类别 → 自动填入单价（仅新增时） */
function onWorkloadCategoryChange(categoryId) {
   if (!categoryId) return
   // 修改已有记录时不自动覆盖（保留用户可能手动设的值）
   if (workloadForm.value.id) return
   const priceInfo = categoryPriceMap.value[categoryId]
   if (priceInfo) {
      workloadForm.value.internalPrice = priceInfo.internalPrice
      workloadForm.value.externalPrice = priceInfo.externalPrice
   }
}

/** 删除工作量 */
function handleDeleteWorkload(row) {
   proxy.$modal.confirm("确认删除该工作量记录？").then(() => {
      return delWorkload(row.id)
   }).then(() => {
      proxy.$modal.msgSuccess("删除成功")
      loadWorkloads()
   }).catch(() => {})
}

/** 提交工作量 */
function submitWorkload() {
   proxy.$refs["workloadRef"].validate(valid => {
      if (!valid) return
      workloadForm.value.projectId = Number(projectId)
      if (workloadForm.value.id) {
         updateWorkload(workloadForm.value).then(() => {
            proxy.$modal.msgSuccess("修改成功")
            workloadOpen.value = false
            loadWorkloads()
         })
      } else {
         addWorkload(workloadForm.value).then(() => {
            proxy.$modal.msgSuccess("录入成功")
            workloadOpen.value = false
            loadWorkloads()
         })
      }
   })
}

/** 登记付款 */
function handleAddPayment() {
   paymentForm.value = { projectId: Number(projectId), paymentType: undefined, amount: undefined, payTime: undefined, payUnit: projectInfo.value.clientUnit || "", payMethod: "" }
   paymentTitle.value = "登记付款"
   paymentOpen.value = true
}

/** 修改付款 */
function handleEditPayment(row) {
   paymentForm.value = { ...row }
   paymentTitle.value = "修改付款"
   paymentOpen.value = true
}

/** 删除付款 */
function handleDeletePayment(row) {
   proxy.$modal.confirm("确认删除该付款记录？").then(() => {
      return delPayment(row.id)
   }).then(() => {
      proxy.$modal.msgSuccess("删除成功")
      loadPayments()
   }).catch(() => {})
}

/** 提交付款 */
function submitPayment() {
   proxy.$refs["paymentRef"].validate(valid => {
      if (!valid) return
      paymentForm.value.projectId = Number(projectId)
      if (paymentForm.value.id) {
         updatePayment(paymentForm.value).then(() => {
            proxy.$modal.msgSuccess("修改成功")
            paymentOpen.value = false
            loadPayments()
         })
      } else {
         addPayment(paymentForm.value).then(() => {
            proxy.$modal.msgSuccess("登记成功")
            paymentOpen.value = false
            loadPayments()
         })
      }
   })
}

onMounted(() => {
   loadProjectInfo()
})
</script>

<style scoped>
.kpi-card {
   background: #f5f7fa;
   border-radius: 8px;
   padding: 16px;
   min-height: 72px;
}
.kpi-label {
   font-size: 13px;
   color: #909399;
   margin-bottom: 6px;
}
.kpi-value {
   font-size: 22px;
   font-weight: 600;
   color: #303133;
}
.settle-progress-card {
   background: #fff;
   border: 1px solid #ebeef5;
   border-radius: 8px;
   padding: 16px 20px;
}
.settle-progress-head {
   display: flex;
   align-items: center;
   justify-content: space-between;
   margin-bottom: 12px;
}
.settle-progress-label {
   font-size: 13px;
   color: #909399;
}
.settle-progress-track {
   height: 8px;
   border-radius: 999px;
   background: #f5f7fa;
   overflow: hidden;
}
.settle-progress-bar {
   height: 100%;
   border-radius: 999px;
   transition: width 0.3s;
}
.settle-progress-foot {
   display: flex;
   align-items: center;
   justify-content: space-between;
   margin-top: 8px;
   font-size: 12px;
   color: #909399;
}
.mb8 {
   margin-bottom: 8px;
}
</style>
