<template>
   <div class="app-container">
      <!-- KPI 统计卡片 -->
      <el-row :gutter="16" style="margin-bottom: 20px">
         <el-col :span="6">
            <div class="stat-card">
               <div class="stat-card__icon stat-card__icon--total">
                  <svg-icon icon-class="documentation" />
               </div>
               <div class="stat-card__body">
                  <div class="stat-card__label">项目总数</div>
                  <div class="stat-card__value">{{ stats.totalCount ?? '-' }}</div>
               </div>
            </div>
         </el-col>
         <el-col :span="6">
            <div class="stat-card stat-card--paid">
               <div class="stat-card__icon stat-card__icon--paid">
                  <svg-icon icon-class="check" />
               </div>
               <div class="stat-card__body">
                  <div class="stat-card__label">已结清</div>
                  <div class="stat-card__value" style="color: #67c23a">{{ stats.paidCount ?? '-' }}</div>
               </div>
            </div>
         </el-col>
         <el-col :span="6">
            <div class="stat-card stat-card--partial">
               <div class="stat-card__icon stat-card__icon--partial">
                  <svg-icon icon-class="tree-table" />
               </div>
               <div class="stat-card__body">
                  <div class="stat-card__label">部分付款</div>
                  <div class="stat-card__value" style="color: #e6a23c">{{ stats.partialCount ?? '-' }}</div>
               </div>
            </div>
         </el-col>
         <el-col :span="6">
            <div class="stat-card stat-card--unpaid">
               <div class="stat-card__icon stat-card__icon--unpaid">
                  <svg-icon icon-class="warning" />
               </div>
               <div class="stat-card__body">
                  <div class="stat-card__label">未付款</div>
                  <div class="stat-card__value" style="color: #f56c6c">{{ stats.unpaidCount ?? '-' }}</div>
               </div>
            </div>
         </el-col>
      </el-row>

      <!-- 筛选区 -->
      <el-row :gutter="10" style="margin-bottom: 16px">
         <!-- 状态快捷 Tab -->
         <el-col :span="24">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
               <span style="font-size: 14px; color: #606266; font-weight: 500;">付款状态：</span>
               <el-radio-group v-model="statusFilter" size="small" @change="handleStatusChange">
                  <el-radio-button value="">全部({{ totalCount }})</el-radio-button>
                  <el-radio-button value="unpaid">未付款({{ stats.unpaidCount ?? 0 }})</el-radio-button>
                  <el-radio-button value="partial">部分付款({{ stats.partialCount ?? 0 }})</el-radio-button>
                  <el-radio-button value="settled">已结清({{ stats.paidCount ?? 0 }})</el-radio-button>
               </el-radio-group>
               <el-input v-model="projectName" placeholder="搜索项目名称" clearable style="width: 220px; margin-left: auto" @keyup.enter="handleSearch" @clear="handleSearch">
                  <template #prefix><el-icon><Search /></el-icon></template>
               </el-input>
               <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
            </div>
         </el-col>
      </el-row>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="overviewList" stripe border style="width: 100%">
         <el-table-column label="序号" type="index" width="55" align="center" />
         <el-table-column label="项目名称" align="center" prop="projectName" min-width="200" :show-overflow-tooltip="true">
            <template #default="scope">
               <el-link type="primary" :underline="false" @click="goToProject(scope.row.projectId)">
                  {{ scope.row.projectName || '—' }}
               </el-link>
            </template>
         </el-table-column>
         <el-table-column label="工程编号" align="center" prop="projectCode" min-width="140" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.projectCode">{{ scope.row.projectCode }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="委托单位" align="center" prop="clientUnit" min-width="170" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.clientUnit">{{ scope.row.clientUnit }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="合同金额(元)" align="center" prop="contractAmount" min-width="140" sortable>
            <template #default="scope">
               <span v-if="scope.row.contractAmount != null" style="font-weight: 500">{{ formatMoney(scope.row.contractAmount) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="已收款(元)" align="center" prop="receivedAmount" min-width="140" sortable>
            <template #default="scope">
               <span v-if="scope.row.receivedAmount != null" style="color: #67c23a; font-weight: 500">{{ formatMoney(scope.row.receivedAmount) }}</span>
               <span v-else style="color: #c0c4cc">{{ formatMoney(0) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="未收款(元)" align="center" prop="unpaidAmount" min-width="140" sortable>
            <template #default="scope">
               <span v-if="scope.row.unpaidAmount != null && scope.row.unpaidAmount > 0" style="color: #f56c6c; font-weight: 500">{{ formatMoney(scope.row.unpaidAmount) }}</span>
               <span v-else-if="scope.row.contractAmount == null || scope.row.contractAmount === 0" style="color: #c0c4cc">—</span>
               <span v-else style="color: #67c23a">0.00 元</span>
            </template>
         </el-table-column>
         <el-table-column label="收款进度" align="center" min-width="180">
            <template #default="scope">
               <div v-if="scope.row.contractAmount != null && scope.row.contractAmount > 0" class="progress-cell">
                  <el-progress
                     :percentage="Number(scope.row.progress) || 0"
                     :color="getProgressColor(scope.row.progress)"
                     :stroke-width="8"
                  />
                  <span class="progress-text">{{ scope.row.progress ?? 0 }}%</span>
               </div>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="付款状态" align="center" prop="paymentStatus" width="110">
            <template #default="scope">
               <dict-tag :options="proj_payment_overview_status" :value="scope.row.paymentStatus" />
            </template>
         </el-table-column>
      </el-table>

      <pagination
         v-show="total > 0"
         :total="total"
         v-model:page="queryParams.pageNum"
         v-model:limit="queryParams.pageSize"
         @pagination="getList"
      />
   </div>
</template>

<script setup name="PaymentOverview">
import { paymentOverviewList, paymentOverviewStats } from "@/api/project/payment"

const { proxy } = getCurrentInstance()
const router = useRouter()
const { proj_payment_overview_status } = useDict('proj_payment_overview_status')

const loading = ref(false)
const total = ref(0)
const overviewList = ref([])
const stats = ref({})
const statusFilter = ref("")
const projectName = ref("")
const totalCount = ref(0)

const data = reactive({
   queryParams: {
      pageNum: 1,
      pageSize: 10,
      projectName: undefined,
      paymentStatus: undefined
   }
})

const { queryParams } = toRefs(data)

/** 加载统计 */
function loadStats() {
   paymentOverviewStats().then(response => {
      stats.value = response.data
      totalCount.value = (stats.value.totalCount || 0)
   })
}

/** 加载列表 */
function getList() {
   loading.value = true
   // 同步筛选条件
   queryParams.value.projectName = projectName.value || undefined
   queryParams.value.paymentStatus = statusFilter.value || undefined
   paymentOverviewList(queryParams.value).then(response => {
      overviewList.value = response.rows
      total.value = response.total
      loading.value = false
   }).catch(() => { loading.value = false })
}

/** 付款状态切换 */
function handleStatusChange(val) {
   queryParams.value.pageNum = 1
   getList()
}

/** 搜索 */
function handleSearch() {
   queryParams.value.pageNum = 1
   getList()
}

/** 格式化金额 */
function formatMoney(val) {
   if (val == null || val === "") return "—"
   return Number(val).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " 元"
}

/** 进度条颜色 */
function getProgressColor(progress) {
   const p = Number(progress) || 0
   if (p >= 100) return "#67c23a"
   if (p >= 50) return "#409eff"
   return "#e6a23c"
}

/** 跳转项目工作台 */
function goToProject(projectId) {
   router.push("/project/project-detail/index/" + projectId)
}

onMounted(() => {
   loadStats()
   getList()
})
</script>

<style scoped>
/* 统计卡片 */
.stat-card {
   display: flex;
   align-items: center;
   gap: 16px;
   background: #f5f7fa;
   border-radius: 10px;
   padding: 20px;
   height: 88px;
   transition: transform 0.2s, box-shadow 0.2s;
   border: 1px solid #ebeef5;
}
.stat-card:hover {
   transform: translateY(-2px);
   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.stat-card--paid {
   background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
}
.stat-card--partial {
   background: linear-gradient(135deg, #fef0d0 0%, #fdf6ec 100%);
}
.stat-card--unpaid {
   background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
}
.stat-card__icon {
   width: 48px;
   height: 48px;
   border-radius: 12px;
   display: flex;
   align-items: center;
   justify-content: center;
   font-size: 24px;
   flex-shrink: 0;
}
.stat-card__icon--total {
   background: #e8f0fe;
   color: #409eff;
}
.stat-card__icon--paid {
   background: #e1f3d8;
   color: #67c23a;
}
.stat-card__icon--partial {
   background: #faecd8;
   color: #e6a23c;
}
.stat-card__icon--unpaid {
   background: #fde2e2;
   color: #f56c6c;
}
.stat-card__body {
   flex: 1;
   min-width: 0;
}
.stat-card__label {
   font-size: 13px;
   color: #909399;
   margin-bottom: 4px;
}
.stat-card__value {
   font-size: 28px;
   font-weight: 700;
   color: #303133;
   line-height: 1.2;
}

/* 进度条 */
.progress-cell {
   display: flex;
   align-items: center;
   gap: 8px;
   padding: 0 4px;
}
.progress-cell .el-progress {
   flex: 1;
}
.progress-text {
   font-size: 13px;
   color: #606266;
   font-weight: 500;
   white-space: nowrap;
   min-width: 42px;
   text-align: right;
}
</style>
