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

      <!-- KPI 小卡片 -->
      <el-row :gutter="12" style="margin-bottom: 16px;">
         <el-col :span="8">
            <div class="kpi-card">
               <div class="kpi-label">合同金额</div>
               <div class="kpi-value">{{ formatMoney(contractAmount) }}</div>
            </div>
         </el-col>
         <el-col :span="8">
            <div class="kpi-card kpi-green">
               <div class="kpi-label">已收款</div>
               <div class="kpi-value">{{ formatMoney(receivedAmount) }}</div>
            </div>
         </el-col>
         <el-col :span="8">
            <div class="kpi-card">
               <div class="kpi-label">未收款</div>
               <div class="kpi-value">{{ formatMoney(unpaidAmount) }}</div>
               <div v-if="contractAmount > 0" class="kpi-progress">
                  <el-progress :percentage="paymentProgress" :stroke-width="6" :show-text="false" />
                  <span style="font-size: 12px; color: #909399; margin-left: 6px;">{{ paymentProgress }}%</span>
               </div>
            </div>
         </el-col>
      </el-row>

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
                     <span v-else style="color: #c0c4cc">—</span>
                  </template>
               </el-table-column>
               <el-table-column label="工期要求" align="center" prop="durationRequire" min-width="100" />
               <el-table-column label="总时长(天)" align="center" prop="totalDuration" width="90" />
               <el-table-column label="状态" align="center" prop="status" width="90">
                  <template #default="scope">
                     <el-tag :type="getTaskStatusType(scope.row.status)">{{ scope.row.status || '—' }}</el-tag>
                  </template>
               </el-table-column>
            </el-table>
         </el-tab-pane>

         <!-- 工作量录入（只读） -->
         <el-tab-pane label="工作量录入" name="workload">
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
               <el-table-column label="付款单位" align="center" prop="payUnit" min-width="160" :show-overflow-tooltip="true" />
               <el-table-column label="付款方式" align="center" prop="payMethod" min-width="100" />
            </el-table>
         </el-tab-pane>

         <!-- 资料管理 -->
         <el-tab-pane label="资料管理" name="material">
            <el-table v-loading="materialLoading" :data="materialList" stripe border style="margin-top: 8px">
               <el-table-column label="提交时间" align="center" prop="submitTime" min-width="160">
                  <template #default="scope"><span v-if="scope.row.submitTime">{{ parseTime(scope.row.submitTime) }}</span></template>
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
            <el-row :gutter="12" style="margin-top: 8px">
               <el-col :span="8">
                  <div class="kpi-card"><div class="kpi-label">内部产值</div><div class="kpi-value" style="color:#67c23a">{{ formatMoney(totalInternalOutput) }}</div></div>
               </el-col>
               <el-col :span="8">
                  <div class="kpi-card kpi-green"><div class="kpi-label">外部产值</div><div class="kpi-value" style="color:#e6a23c">{{ formatMoney(totalExternalOutput) }}</div></div>
               </el-col>
               <el-col :span="8">
                  <div class="kpi-card"><div class="kpi-label">产值合计</div><div class="kpi-value" style="color:#409eff">{{ formatMoney(totalOutput) }}</div></div>
               </el-col>
            </el-row>
            <el-alert type="info" :closable="false" style="margin-top: 12px">
               产值数据来源于「费用结算」模块的工作量核算，收款数据来源于「付款记录」页签。如需调整请在对应模块操作。
            </el-alert>
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
                        <el-option label="预付款" value="预付款" />
                        <el-option label="进度款" value="进度款" />
                        <el-option label="尾款" value="尾款" />
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
import { getContract } from "@/api/project/contract"
import { listTask } from "@/api/project/task"
import { listWorkload, addWorkload, updateWorkload, delWorkload } from "@/api/project/workload"
import { listPayment, addPayment, updatePayment, delPayment } from "@/api/project/payment"
import { listMaterial } from "@/api/project/material"
import { listCategory, categoryTreeselect } from "@/api/project/category"
import { listUser } from "@/api/system/user"

const { proxy } = getCurrentInstance()
const { proj_payment_type, proj_project_status, proj_material_result_type, proj_material_status } = useDict('proj_payment_type', 'proj_project_status', 'proj_material_result_type', 'proj_material_status')
const route = useRoute()

const projectId = route.params.projectId
const activeTab = ref("info")
const projectInfo = ref({})
const contractAmount = ref(0)
const receivedAmount = ref(0)

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

// 计算属性
const unpaidAmount = computed(() => {
   return Math.max(0, (contractAmount.value || 0) - receivedAmount.value)
})
const paymentProgress = computed(() => {
   if (!contractAmount.value || contractAmount.value === 0) return 0
   return Math.min(100, Math.round(receivedAmount.value * 100 / contractAmount.value * 10) / 10)
})
const totalOutput = computed(() => {
   return workloadList.value.reduce((sum, w) => sum + (w.internalOutput || 0) + (w.externalOutput || 0), 0)
})
const totalInternalOutput = computed(() => {
   return workloadList.value.reduce((sum, w) => sum + (w.internalOutput || 0), 0)
})
const totalExternalOutput = computed(() => {
   return workloadList.value.reduce((sum, w) => sum + (w.externalOutput || 0), 0)
})

/** 格式化金额 */
function formatMoney(val) {
   if (val == null || val === "") return "-"
   return Number(val).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 元"
}

/** 状态标签类型 */
function getStatusTagType(status) {
   const map = { "ongoing": "primary", "closed": "success", "archived": "" }
   return map[status] || "info"
}
function getTaskStatusType(status) {
   const map = { "pending": "info", "ongoing": "primary", "completed": "success", "paused": "warning" }
   return map[status] || "info"
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
   if (tabName === "settlement") { loadWorkloads(); loadPayments() }
}

/** 加载项目信息 + 合同金额 + 付款（KPI） */
function loadProjectInfo() {
   getProject(projectId).then(response => {
      projectInfo.value = response.data
      if (response.data.contractId) {
         getContract(response.data.contractId).then(res => {
            contractAmount.value = res.data.contractAmount || 0
         })
      }
   }).catch(() => {
      projectInfo.value = {}
   })
   loadPayments()
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

/** 加载付款 + 更新已收 KPI */
function loadPayments() {
   paymentLoading.value = true
   listPayment({ projectId: projectId, pageNum: 1, pageSize: 1000 }).then(response => {
      paymentList.value = response.rows || []
      receivedAmount.value = paymentList.value.reduce((sum, p) => sum + (p.amount || 0), 0)
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

/** 加载用户列表 */
function loadUsers() {
   if (userOptions.value.length > 0) return
   listUser({ pageNum: 1, pageSize: 1000 }).then(response => {
      userOptions.value = response.rows || []
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
.kpi-card.kpi-green {
   background: #f0f9eb;
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
.kpi-green .kpi-value {
   color: #67c23a;
}
.kpi-progress {
   display: flex;
   align-items: center;
   margin-top: 8px;
}
.kpi-progress .el-progress {
   flex: 1;
}
.mb8 {
   margin-bottom: 8px;
}
</style>
