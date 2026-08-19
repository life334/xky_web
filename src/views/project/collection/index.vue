<template>
   <div class="app-container">
      <!-- ========== 统计卡片区 ========== -->
      <el-row :gutter="16" class="stat-row">
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-body">
                  <div class="stat-icon" style="background: #ecf5ff; color: #409eff"><el-icon><Coin /></el-icon></div>
                  <div class="stat-info">
                     <div class="stat-label">待回款总额</div>
                     <div class="stat-value">{{ money(stats.pendingAmount) }}</div>
                     <div class="stat-sub">{{ stats.pendingCount || 0 }} 个项目未结清</div>
                  </div>
               </div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-body">
                  <div class="stat-icon" style="background: #f0f9eb; color: #67c23a"><el-icon><Wallet /></el-icon></div>
                  <div class="stat-info">
                     <div class="stat-label">本月已回款</div>
                     <div class="stat-value">{{ money(stats.monthReceived) }}</div>
                     <div class="stat-sub">
                        较上月
                        <span :style="{ color: monthTrend >= 0 ? '#f56c6c' : '#67c23a' }">
                           {{ monthTrend >= 0 ? '↑' : '↓' }} {{ money(Math.abs(monthTrend)) }}
                        </span>
                     </div>
                  </div>
               </div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-body">
                  <div class="stat-icon" :style="{ background: overdueCount > 0 ? '#fef0f0' : '#f4f4f5', color: overdueCount > 0 ? '#f56c6c' : '#909399' }">
                     <el-icon><Bell /></el-icon>
                  </div>
                  <div class="stat-info">
                     <div class="stat-label">超账期预警</div>
                     <div class="stat-value" :style="{ color: overdueCount > 0 ? '#f56c6c' : '' }">{{ overdueCount || 0 }}</div>
                     <div class="stat-sub">账龄超 6 个月未结清</div>
                  </div>
               </div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card">
               <div class="stat-body">
                  <div class="stat-icon" style="background: #fdf6ec; color: #e6a23c"><el-icon><Timer /></el-icon></div>
                  <div class="stat-info">
                     <div class="stat-label">待结算提醒</div>
                     <div class="stat-value">{{ unsettledTotal || 0 }}</div>
                     <div class="stat-sub">已办结未录产值，应收无法计算</div>
                  </div>
               </div>
            </el-card>
         </el-col>
      </el-row>

      <!-- ========== 页签：待回款 / 待结算提醒 ========== -->
      <el-tabs v-model="activeTab" class="collection-tabs">
         <!-- ========== 页签一：待回款 ========== -->
         <el-tab-pane label="待回款" name="pending">
            <!-- 筛选区 -->
            <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
               <el-form-item label="客户全称" prop="clientUnit">
                  <el-input v-model="queryParams.clientUnit" placeholder="请输入客户全称" clearable maxlength="200" style="width: 180px" @keyup.enter="handleQuery" />
               </el-form-item>
               <el-form-item label="项目名称" prop="projectName" v-if="viewMode === 'project'">
                  <el-input v-model="queryParams.projectName" placeholder="请输入项目名称" clearable maxlength="200" style="width: 180px" @keyup.enter="handleQuery" />
               </el-form-item>
               <el-form-item label="催收状态" prop="collectStatus">
                  <el-select v-model="queryParams.collectStatus" placeholder="全部" clearable style="width: 140px">
                     <el-option label="从未催收" value="never" />
                     <el-option label="催收中" value="calling" />
                     <el-option label="超期未催" value="overdue" />
                  </el-select>
               </el-form-item>
               <el-form-item label="账龄(月)" v-if="viewMode === 'project'">
                  <el-input-number v-model="queryParams.ageBegin" :min="0" :controls="false" placeholder="起" style="width: 80px" />
                  <span style="margin: 0 4px">-</span>
                  <el-input-number v-model="queryParams.ageEnd" :min="0" :controls="false" placeholder="止" style="width: 80px" />
               </el-form-item>
               <el-form-item label="办结时间" v-if="viewMode === 'project'">
                  <el-date-picker v-model="closeTimeRange" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 240px" />
               </el-form-item>
               <el-form-item>
                  <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
                  <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
               </el-form-item>
            </el-form>

            <!-- 工具栏：视图切换 + 导出 -->
            <el-row :gutter="10" class="mb8">
               <el-col :span="10">
                  <el-radio-group v-model="viewMode" @change="handleViewChange">
                     <el-radio-button value="project" size="small">项目视图</el-radio-button>
                     <el-radio-button value="client" size="small">客户视图</el-radio-button>
                  </el-radio-group>
               </el-col>
               <el-col :span="12" style="text-align: right;margin-top:5px">
                  <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:collection:export']">导出催款清单</el-button>
               </el-col>
               <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
            </el-row>

            <!-- 项目视图 -->
            <el-table v-if="viewMode === 'project'" v-loading="loading" :data="pendingList" stripe border>
               <el-table-column label="工程编号" align="center" prop="projectCode" min-width="120" :show-overflow-tooltip="true" />
               <el-table-column label="项目名称" align="left" prop="projectName" min-width="160" :show-overflow-tooltip="true" />
               <el-table-column label="客户全称" align="left" prop="clientUnit" min-width="160" :show-overflow-tooltip="true" />
               <el-table-column label="办结时间" align="center" prop="closeTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.closeTime) }}</template>
               </el-table-column>
               <el-table-column label="账龄(月)" align="center" prop="debtMonths" min-width="100" sortable>
                  <template #default="scope">
                     <span :class="ageClass(scope.row.debtMonths)">{{ scope.row.debtMonths }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="应收金额(元)" align="right" prop="receivable" min-width="120">
                  <template #default="scope">{{ money(scope.row.receivable) }}</template>
               </el-table-column>
               <el-table-column label="已收金额(元)" align="right" prop="received" min-width="120">
                  <template #default="scope">{{ money(scope.row.received) }}</template>
               </el-table-column>
               <el-table-column label="未收金额(元)" align="right" prop="unpaidAmount" min-width="120">
                  <template #default="scope">
                     <span style="color: #f56c6c; font-weight: 600">{{ money(scope.row.unpaidAmount) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="回款进度" align="center" min-width="130">
                  <template #default="scope">
                     <el-progress :percentage="progressOf(scope.row)" :stroke-width="10" :color="progressColor" />
                  </template>
               </el-table-column>
               <el-table-column label="最近到账" align="center" prop="lastPayTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.lastPayTime) }}</template>
               </el-table-column>
               <el-table-column label="催收状态" align="center" prop="collectStatus" min-width="100">
                  <template #default="scope">
                     <el-tag :type="collectTagType(scope.row.collectStatus)" effect="dark" size="small">
                        {{ collectText(scope.row.collectStatus) }}
                     </el-tag>
                  </template>
               </el-table-column>
               <el-table-column label="操作" align="center" width="180" fixed="right" class-name="small-padding fixed-width">
                  <template #default="scope">
                     <el-button link type="primary" size="small" @click="handleAddPayment(scope.row)" v-hasPermi="['project:payment:add']">登记回款</el-button>
                     <el-button link type="warning" size="small" @click="handleShowLog(scope.row)" v-hasPermi="['project:collection:log']">催收</el-button>
                  </template>
               </el-table-column>
            </el-table>

            <!-- 客户视图 -->
            <el-table v-else v-loading="loading" :data="clientList" stripe border @expand-change="handleClientExpand">
               <el-table-column type="expand">
                  <template #default="scope">
                     <el-table :data="scope.row.projectRows || []" size="small" border style="margin: 4px 24px" v-loading="scope.row.expanding">
                        <el-table-column label="工程编号" align="center" prop="projectCode" min-width="110" />
                        <el-table-column label="项目名称" align="left" prop="projectName" min-width="150" :show-overflow-tooltip="true" />
                        <el-table-column label="办结时间" align="center" min-width="95">
                           <template #default="s">{{ fmtDate(s.row.closeTime) }}</template>
                        </el-table-column>
                        <el-table-column label="账龄(月)" align="center" min-width="85">
                           <template #default="s"><span :class="ageClass(s.row.debtMonths)">{{ s.row.debtMonths }}</span></template>
                        </el-table-column>
                        <el-table-column label="应收(元)" align="right" min-width="110">
                           <template #default="s">{{ money(s.row.receivable) }}</template>
                        </el-table-column>
                        <el-table-column label="已收(元)" align="right" min-width="110">
                           <template #default="s">{{ money(s.row.received) }}</template>
                        </el-table-column>
                        <el-table-column label="未收(元)" align="right" min-width="110">
                           <template #default="s"><span style="color: #f56c6c; font-weight: 600">{{ money(s.row.unpaidAmount) }}</span></template>
                        </el-table-column>
                        <el-table-column label="催收状态" align="center" min-width="95">
                           <template #default="s">
                              <el-tag :type="collectTagType(s.row.collectStatus)" size="small">{{ collectText(s.row.collectStatus) }}</el-tag>
                           </template>
                        </el-table-column>
                        <el-table-column label="操作" align="center" width="150">
                           <template #default="s">
                              <el-button link type="primary" size="small" @click="handleAddPayment(s.row)" v-hasPermi="['project:payment:add']">登记回款</el-button>
                              <el-button link type="warning" size="small" @click="handleShowLog(s.row)" v-hasPermi="['project:collection:log']">催收</el-button>
                           </template>
                        </el-table-column>
                     </el-table>
                  </template>
               </el-table-column>
               <el-table-column label="客户全称" align="left" prop="clientUnit" min-width="200" :show-overflow-tooltip="true" />
               <el-table-column label="项目数" align="center" prop="projectCount" min-width="80" />
               <el-table-column label="应收合计(元)" align="right" prop="receivable" min-width="130">
                  <template #default="scope">{{ money(scope.row.receivable) }}</template>
               </el-table-column>
               <el-table-column label="已收合计(元)" align="right" prop="received" min-width="130">
                  <template #default="scope">{{ money(scope.row.received) }}</template>
               </el-table-column>
               <el-table-column label="欠款合计(元)" align="right" prop="unpaidAmount" min-width="130">
                  <template #default="scope"><span style="color: #f56c6c; font-weight: 600">{{ money(scope.row.unpaidAmount) }}</span></template>
               </el-table-column>
               <el-table-column label="最大账龄(月)" align="center" prop="maxDebtMonths" min-width="105">
                  <template #default="scope"><span :class="ageClass(scope.row.maxDebtMonths)">{{ scope.row.maxDebtMonths }}</span></template>
               </el-table-column>
               <el-table-column label="最早办结" align="center" prop="oldestCloseTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.oldestCloseTime) }}</template>
               </el-table-column>
               <el-table-column label="催收预警" align="center" min-width="160">
                  <template #default="scope">
                     <el-tag v-if="(scope.row.overdueCount || 0) > 0" type="danger" size="small">{{ scope.row.overdueCount }} 个超期未催</el-tag>
                     <el-tag v-else-if="(scope.row.neverCount || 0) > 0" type="info" size="small">{{ scope.row.neverCount }} 个从未催收</el-tag>
                     <el-tag v-else type="success" size="small">催收中</el-tag>
                  </template>
               </el-table-column>
            </el-table>

            <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
         </el-tab-pane>

         <!-- ========== 页签二：待结算提醒 ========== -->
         <el-tab-pane :label="'待结算提醒' + (unsettledTotal > 0 ? `(${unsettledTotal})` : '')" name="unsettled">
            <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px"
               title="以下项目已办结但费用结算未录入工作量明细（外部产值），应收金额无法计算，请先完成结算，避免欠款静默遗漏。" />
            <el-form :inline="true" label-width="80px">
               <el-form-item label="客户全称">
                  <el-input v-model="unsettledQuery.clientUnit" placeholder="请输入客户全称" clearable style="width: 180px" @keyup.enter="getUnsettledList" />
               </el-form-item>
               <el-form-item label="项目名称">
                  <el-input v-model="unsettledQuery.projectName" placeholder="请输入项目名称" clearable style="width: 180px" @keyup.enter="getUnsettledList" />
               </el-form-item>
               <el-form-item>
                  <el-button type="primary" icon="Search" size="small" @click="getUnsettledList">搜索</el-button>
               </el-form-item>
            </el-form>
            <el-table v-loading="unsettledLoading" :data="unsettledList" stripe border>
               <el-table-column label="工程编号" align="center" prop="projectCode" min-width="120" />
               <el-table-column label="项目名称" align="left" prop="projectName" min-width="180" :show-overflow-tooltip="true" />
               <el-table-column label="工程项目" align="left" prop="engineeringProject" min-width="140" :show-overflow-tooltip="true" />
               <el-table-column label="客户全称" align="left" prop="clientUnit" min-width="180" :show-overflow-tooltip="true" />
               <el-table-column label="办结时间" align="center" prop="closeTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.closeTime) }}</template>
               </el-table-column>
               <el-table-column label="已收金额(元)" align="right" prop="received" min-width="120">
                  <template #default="scope">{{ money(scope.row.received) }}</template>
               </el-table-column>
            </el-table>
            <pagination v-show="unsettledTotal > 0" :total="unsettledTotal" v-model:page="unsettledQuery.pageNum" v-model:limit="unsettledQuery.pageSize" @pagination="getUnsettledList" />
         </el-tab-pane>
      </el-tabs>

      <!-- ========== 登记回款对话框 ========== -->
      <el-dialog title="登记回款" :model-value="payOpen" @update:model-value="payOpen = $event" width="600px" append-to-body>
         <el-form ref="payRef" :model="payForm" :rules="payRules" label-width="90px">
            <el-form-item label="所属项目">
               <el-input :model-value="payForm.projectName" disabled />
            </el-form-item>
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="付款类型" prop="paymentType">
                     <el-select v-model="payForm.paymentType" placeholder="请选择付款类型" style="width: 100%">
                        <el-option v-for="d in proj_payment_type" :key="d.value" :label="d.label" :value="d.value" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="金额(元)" prop="amount">
                     <el-input-number v-model="payForm.amount" :precision="2" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="付款时间" prop="payTime">
                     <el-date-picker v-model="payForm.payTime" type="date" placeholder="选择付款时间" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="付款单位">
                     <el-input v-model="payForm.payUnit" :placeholder="payForm.defaultPayUnit || '请输入付款单位'" maxlength="200" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-form-item label="付款方式">
               <el-select v-model="payForm.payMethod" placeholder="请选择付款方式" clearable filterable allow-create style="width: 100%">
                  <el-option label="银行转账" value="银行转账" />
                  <el-option label="现金" value="现金" />
                  <el-option label="支票" value="支票" />
                  <el-option label="电汇" value="电汇" />
               </el-select>
            </el-form-item>
            <el-form-item label="备注">
               <el-input v-model="payForm.remark" type="textarea" maxlength="500" :rows="2" placeholder="请输入备注" />
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitPay">确 定</el-button>
               <el-button @click="payOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- ========== 催收记录抽屉 ========== -->
      <el-drawer v-model="logOpen" :title="'催收记录 — ' + (currentProject.projectCode || '')" size="560px">
         <div v-if="currentProject.unpaidAmount != null" class="log-summary">
            该项目未收 <span style="color: #f56c6c; font-weight: 600">{{ money(currentProject.unpaidAmount) }}</span> 元，
            账龄 <span :class="ageClass(currentProject.debtMonths)">{{ currentProject.debtMonths }}</span> 个月
         </div>
         <el-timeline v-if="logList.length > 0" style="margin-top: 16px">
            <el-timeline-item v-for="log in logList" :key="log.id" :timestamp="fmtDate(log.collectTime)" placement="top"
               :type="log.nextCollectTime && log.nextCollectTime < todayStr ? 'danger' : 'primary'">
               <div class="log-item">
                  <div class="log-head">
                     <el-tag size="small" effect="plain">{{ log.collectMethod || '未填方式' }}</el-tag>
                     <span v-if="log.contactName" class="log-contact">联系人：{{ log.contactName }}</span>
                     <el-button link type="danger" size="small" @click="handleDeleteLog(log)" v-hasPermi="['project:collection:log']">删除</el-button>
                  </div>
                  <div class="log-result">{{ log.collectResult || '（未填结果）' }}</div>
                  <div class="log-next" v-if="log.nextCollectTime">
                     下次催收：{{ fmtDate(log.nextCollectTime) }}
                     <span v-if="log.nextCollectTime < todayStr" style="color: #f56c6c">（已超期）</span>
                  </div>
                  <div class="log-remark" v-if="log.remark">{{ log.remark }}</div>
                  <div class="log-creator">登记人：{{ log.createBy }}</div>
               </div>
            </el-timeline-item>
         </el-timeline>
         <el-empty v-else description="暂无催收记录，请在下方登记首次催收" :image-size="60" />

         <el-divider content-position="left">登记催收</el-divider>
         <el-form ref="logRef" :model="logForm" :rules="logRules" label-width="90px">
            <el-row :gutter="16">
               <el-col :span="12">
                  <el-form-item label="催收时间" prop="collectTime">
                     <el-date-picker v-model="logForm.collectTime" type="date" placeholder="选择时间" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="催收方式" prop="collectMethod">
                     <el-select v-model="logForm.collectMethod" placeholder="请选择" style="width: 100%">
                        <el-option label="电话" value="电话" />
                        <el-option label="函件" value="函件" />
                        <el-option label="上门" value="上门" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="16">
               <el-col :span="12">
                  <el-form-item label="联系人">
                     <el-input v-model="logForm.contactName" maxlength="50" placeholder="对方联系人" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="下次催收" prop="nextCollectTime">
                     <el-date-picker v-model="logForm.nextCollectTime" type="date" placeholder="超期未催预警" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-form-item label="催收结果">
               <el-input v-model="logForm.collectResult" maxlength="200" placeholder="如：对方承诺月底付款" />
            </el-form-item>
            <el-form-item label="备注">
               <el-input v-model="logForm.remark" type="textarea" :rows="2" maxlength="500" />
            </el-form-item>
            <el-form-item>
               <el-button type="primary" @click="submitLog" v-hasPermi="['project:collection:log']">登记催收记录</el-button>
            </el-form-item>
         </el-form>
      </el-drawer>
   </div>
</template>

<script setup name="Collection">
import { collectionList, collectionClientList, collectionStats, collectionUnsettledList, collectionLog, addCollectionLog, delCollectionLog } from "@/api/project/collection"
import { addPayment } from "@/api/project/payment"

const { proxy } = getCurrentInstance()
const { proj_payment_type } = useDict('proj_payment_type')

const activeTab = ref('pending')
const viewMode = ref('project')
const loading = ref(false)
const showSearch = ref(true)
const pendingList = ref([])
const clientList = ref([])
const total = ref(0)
const stats = ref({})
const closeTimeRange = ref([])

// 待结算
const unsettledLoading = ref(false)
const unsettledList = ref([])
const unsettledTotal = ref(0)

// 登记回款
const payOpen = ref(false)
const payForm = ref({})

// 催收记录
const logOpen = ref(false)
const logList = ref([])
const currentProject = ref({})
const logForm = ref({})

const todayStr = (() => {
   const d = new Date()
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const data = reactive({
   queryParams: {
      pageNum: 1,
      pageSize: 10,
      projectName: undefined,
      clientUnit: undefined,
      collectStatus: undefined,
      ageBegin: undefined,
      ageEnd: undefined
   },
   unsettledQuery: {
      pageNum: 1,
      pageSize: 10,
      projectName: undefined,
      clientUnit: undefined
   },
   payRules: {
      paymentType: [{ required: true, message: "请选择付款类型", trigger: "change" }],
      amount: [{ required: true, message: "请输入金额", trigger: "blur" }],
      payTime: [{ required: true, message: "请选择付款时间", trigger: "change" }]
   },
   logRules: {
      collectTime: [{ required: true, message: "请选择催收时间", trigger: "change" }],
      collectMethod: [{ required: true, message: "请选择催收方式", trigger: "change" }]
   }
})

const { queryParams, unsettledQuery, payRules, logRules } = toRefs(data)

/** 本月回款环比 */
const monthTrend = computed(() => {
   const m = Number(stats.value.monthReceived || 0)
   const l = Number(stats.value.lastMonthReceived || 0)
   return m - l
})

const overdueCount = computed(() => stats.value.overdueCount || 0)

const progressColor = [
   { color: '#f56c6c', percentage: 30 },
   { color: '#e6a23c', percentage: 70 },
   { color: '#67c23a', percentage: 100 }
]

/** 查询列表（按当前视图） */
function getList() {
   loading.value = true
   if (viewMode.value === 'project') {
      const params = buildParams()
      collectionList(params).then(res => {
         pendingList.value = res.rows
         total.value = res.total
         loading.value = false
      }).catch(() => { loading.value = false })
   } else {
      collectionClientList({ ...buildParams(), projectName: undefined }).then(res => {
         clientList.value = res.rows
         total.value = res.total
         loading.value = false
      }).catch(() => { loading.value = false })
   }
}

/** 组装查询参数（办结时间区间 → closeTimeBegin/End） */
function buildParams() {
   const params = { ...queryParams.value }
   if (closeTimeRange.value && closeTimeRange.value.length === 2) {
      params.closeTimeBegin = closeTimeRange.value[0]
      params.closeTimeEnd = closeTimeRange.value[1]
   } else {
      params.closeTimeBegin = undefined
      params.closeTimeEnd = undefined
   }
   return params
}

/** 查询统计卡 */
function getStats() {
   collectionStats().then(res => { stats.value = res.data || {} })
}

/** 查询待结算提醒 */
function getUnsettledList() {
   unsettledLoading.value = true
   collectionUnsettledList(unsettledQuery.value).then(res => {
      unsettledList.value = res.rows
      unsettledTotal.value = res.total
      unsettledLoading.value = false
   }).catch(() => { unsettledLoading.value = false })
}

/** 搜索 */
function handleQuery() {
   queryParams.value.pageNum = 1
   getList()
}

/** 重置 */
function resetQuery() {
   proxy.resetForm("queryRef")
   closeTimeRange.value = []
   queryParams.value.ageBegin = undefined
   queryParams.value.ageEnd = undefined
   handleQuery()
}

/** 切换项目/客户视图 */
function handleViewChange() {
   queryParams.value.pageNum = 1
   getList()
}

/** 客户视图展开：懒加载该客户欠款项目明细 */
function handleClientExpand(row, expanded) {
   if (expanded.length > 0 && !row.projectRows) {
      row.expanding = true
      collectionList({ pageNum: 1, pageSize: 999, clientUnit: row.clientUnit }).then(res => {
         row.projectRows = res.rows
         row.expanding = false
      }).catch(() => { row.expanding = false })
   }
}

/** 登记回款 */
function handleAddPayment(row) {
   payForm.value = {
      projectId: row.projectId,
      projectName: row.projectName,
      defaultPayUnit: row.clientUnit,
      paymentType: undefined,
      amount: undefined,
      payTime: todayStr,
      payUnit: row.clientUnit,
      payMethod: undefined,
      remark: undefined
   }
   payOpen.value = true
}

/** 提交回款 */
function submitPay() {
   proxy.$refs["payRef"].validate(valid => {
      if (valid) {
         addPayment(payForm.value).then(() => {
            proxy.$modal.msgSuccess("回款登记成功")
            payOpen.value = false
            getList()
            getStats()
         })
      }
   })
}

/** 打开催收记录抽屉 */
function handleShowLog(row) {
   currentProject.value = row
   logForm.value = { projectId: row.projectId, collectTime: todayStr }
   logOpen.value = true
   loadLog(row.projectId)
}

/** 加载催收记录 */
function loadLog(projectId) {
   collectionLog(projectId).then(res => { logList.value = res.data || [] })
}

/** 提交催收记录 */
function submitLog() {
   proxy.$refs["logRef"].validate(valid => {
      if (valid) {
         addCollectionLog(logForm.value).then(() => {
            proxy.$modal.msgSuccess("催收记录登记成功")
            logForm.value = { projectId: currentProject.value.projectId, collectTime: todayStr }
            loadLog(currentProject.value.projectId)
            getList()
         })
      }
   })
}

/** 删除催收记录 */
function handleDeleteLog(log) {
   proxy.$modal.confirm('是否确认删除该条催收记录?').then(() => {
      return delCollectionLog(log.id)
   }).then(() => {
      loadLog(currentProject.value.projectId)
      getList()
      proxy.$modal.msgSuccess("删除成功")
   }).catch(() => {})
}

/** 导出催款清单 */
function handleExport() {
   const params = buildParams()
   delete params.pageNum
   delete params.pageSize
   proxy.download('/project/collection/export', params, `催款清单_${new Date().getTime()}.xlsx`)
}

/** 账龄色阶：<3月绿 / 3~6月黄 / 6~12月橙 / ≥12月红 */
function ageClass(months) {
   const m = Number(months || 0)
   if (m >= 12) return 'age-red'
   if (m >= 6) return 'age-orange'
   if (m >= 3) return 'age-yellow'
   return 'age-green'
}

function collectText(status) {
   if (status === 'overdue') return '超期未催'
   if (status === 'calling') return '催收中'
   return '从未催收'
}

function collectTagType(status) {
   if (status === 'overdue') return 'danger'
   if (status === 'calling') return 'primary'
   return 'info'
}

function progressOf(row) {
   const p = Number(row.progress || 0)
   return p > 100 ? 100 : Math.round(p)
}

function money(val) {
   if (val == null) return '—'
   return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(val) {
   if (!val) return '—'
   return String(val).slice(0, 10)
}

getList()
getStats()
getUnsettledList()
</script>

<style scoped>
.stat-row { margin-bottom: 12px; }
.stat-card :deep(.el-card__body) { padding: 16px; }
.stat-body { display: flex; align-items: center; gap: 14px; }
.stat-icon {
   width: 48px; height: 48px; border-radius: 10px;
   display: flex; align-items: center; justify-content: center;
   font-size: 24px; flex-shrink: 0;
}
.stat-info { min-width: 0; }
.stat-label { font-size: 13px; color: #909399; }
.stat-value { font-size: 22px; font-weight: 600; color: #303133; margin: 2px 0; }
.stat-sub { font-size: 12px; color: #909399; }
.collection-tabs :deep(.el-tabs__content) { padding: 0 4px; }
.age-green { color: #67c23a; font-weight: 600; }
.age-yellow { color: #c8a23a; font-weight: 600; }
.age-orange { color: #e6752e; font-weight: 600; }
.age-red { color: #f56c6c; font-weight: 600; }
.log-summary { padding: 10px 12px; background: #f5f7fa; border-radius: 6px; font-size: 13px; }
.log-item { font-size: 13px; line-height: 1.7; }
.log-head { display: flex; align-items: center; gap: 8px; }
.log-contact { color: #909399; }
.log-result { margin-top: 2px; }
.log-next { color: #409eff; }
.log-remark { color: #909399; }
.log-creator { font-size: 12px; color: #c0c4cc; }
</style>
