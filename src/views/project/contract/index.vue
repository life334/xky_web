<template>
   <div class="app-container">
      <!-- Row 1: 全局搜索 -->
      <div class="search-bar-row">
         <div class="search-input-wrapper">
            <el-input v-model="queryParams.keyword" placeholder="搜索合同编号/名称/委托单位/联系人..." clearable @keyup.enter="handleQuery" @clear="handleQuery" class="global-search-input">
               <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
         </div>
         <el-button type="primary" size="small" @click="handleQuery">搜索</el-button>
         <el-button size="small" @click="resetQuery">重置</el-button>
      </div>

      <!-- Row 2: 状态胶囊导航（字典驱动） -->
      <div class="status-capsule-row">
         <span
            v-for="item in statusCapsules"
            :key="item.value"
            :class="['status-capsule', { active: queryParams.status === item.value }]"
            @click="handleStatusClick(item.value)"
         >{{ item.label }}<span class="capsule-count">{{ item.count }}</span></span>
      </div>

      <!-- Row 3: 高级筛选 -->
      <div class="advanced-toggle-row" @click="advancedVisible = !advancedVisible">
         <span>{{ advancedVisible ? '▲' : '▼' }} 高级筛选</span>
      </div>

      <!-- Row 4: 高级面板 -->
      <el-collapse-transition>
         <div v-show="advancedVisible" class="advanced-filter-panel">
            <div class="filter-grid">
               <div class="filter-item">
                  <div class="filter-item-label">合同类型</div>
                  <el-select v-model="queryParams.contractType" clearable placeholder="全部类型" style="width:100%" @change="handleQuery">
                     <el-option v-for="d in proj_contract_type" :key="d.value" :label="d.label" :value="d.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">委托单位</div>
                  <el-select v-model="queryParams.clientUnit" filterable clearable placeholder="全部单位" style="width:100%" @change="handleQuery">
                     <el-option v-for="u in clientUnitOptions" :key="u" :label="u" :value="u" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">联系人</div>
                  <el-input v-model="queryParams.contactName" placeholder="联系人" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">签署日期</div>
                  <el-date-picker v-model="signDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onSignDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">委托时间</div>
                  <el-date-picker v-model="entrustDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onEntrustDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">审核日期</div>
                  <el-date-picker v-model="auditDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onAuditDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">完成日期</div>
                  <el-date-picker v-model="finishDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onFinishDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">合同金额</div>
                  <div style="display:flex;gap:8px;align-items:center">
                     <el-input-number v-model="queryParams.contractAmountMin" :min="0" :precision="2" controls-position="right" placeholder="最低" style="flex:1" @change="handleQuery" />
                     <span style="color:#999">~</span>
                     <el-input-number v-model="queryParams.contractAmountMax" :min="0" :precision="2" controls-position="right" placeholder="最高" style="flex:1" @change="handleQuery" />
                  </div>
               </div>
            </div>
            <!-- 快捷日期 + 方案 -->
            <div class="quick-filter-row">
               <span class="quick-label">快捷：</span>
               <span class="quick-chip" @click="setQuickDate('today')">今天</span>
               <span class="quick-chip" @click="setQuickDate('week')">本周</span>
               <span class="quick-chip" @click="setQuickDate('month')">本月</span>
               <span class="quick-chip" @click="setQuickDate('7days')">近7天</span>
               <span class="quick-chip" @click="setQuickDate('30days')">近30天</span>
               <el-divider direction="vertical" />
               <span class="quick-label">方案：</span>
               <span v-for="s in savedSchemes" :key="s.name" class="quick-chip scheme-chip" @click="activateScheme(s)">{{ s.name }}</span>
               <span class="quick-chip scheme-chip" @click="saveSchemeVisible = true">+ 保存当前</span>
               <span class="collapse-link" @click="advancedVisible = false">收起 ▲</span>
            </div>
         </div>
      </el-collapse-transition>

      <!-- Row 5: 操作按钮行 -->
      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" size="small" @click="handleAdd" v-hasPermi="['project:contract:add']">新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" size="small" :disabled="single" @click="handleUpdate" v-hasPermi="['project:contract:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" size="small" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:contract:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5" style="margin-left:auto;display:flex;gap:8px">
            <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:contract:export']">导出</el-button>
         </el-col>
      </el-row>

      <!-- 保存方案弹窗 -->
      <el-dialog v-model="saveSchemeVisible" title="保存筛选方案" width="400px" append-to-body>
         <el-input v-model="schemeName" placeholder="请输入方案名称" maxlength="20" />
         <template #footer>
            <el-button @click="saveSchemeVisible = false">取消</el-button>
            <el-button type="primary" @click="saveScheme" :disabled="!schemeName">保存</el-button>
         </template>
      </el-dialog>

      <el-table v-loading="loading" :data="contractList" stripe border @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column label="合同编号" align="center" prop="contractNo" :show-overflow-tooltip="true" min-width="140" />
         <el-table-column label="合同名称" align="center" prop="contractName" :show-overflow-tooltip="true" min-width="180" />
         <el-table-column label="委托单位" align="center" prop="clientUnit" :show-overflow-tooltip="true" min-width="160" />
         <el-table-column label="合同类型" align="center" prop="contractType" min-width="100">
            <template #default="scope">
               <dict-tag :options="proj_contract_type" :value="scope.row.contractType" />
            </template>
         </el-table-column>
         <el-table-column label="状态" align="center" prop="status" min-width="90">
            <template #default="scope">
               <dict-tag v-if="scope.row.status" :options="d('proj_contract_status')" :value="scope.row.status" />
               <span v-else style="color: #c0c4cc">草稿</span>
            </template>
         </el-table-column>
         <el-table-column label="合同金额" align="center" prop="contractAmount" min-width="130">
            <template #default="scope">
               <span v-if="scope.row.contractAmount != null">{{ formatAmount(scope.row.contractAmount) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="签署日期" align="center" prop="signDate" min-width="120">
            <template #default="scope">
               <span v-if="scope.row.signDate">{{ parseDate(scope.row.signDate) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="联系人" align="center" prop="contactName" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.contactName">{{ scope.row.contactName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="关联项目" align="center" min-width="110">
            <template #default="scope">
               <el-button link type="primary" @click="handleShowProjects(scope.row)">
                  {{ scope.row.projectCount || 0 }} 个项目 ▸
               </el-button>
            </template>
         </el-table-column>
         <el-table-column label="创建时间" align="center" prop="createTime" width="170">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="140" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" @click="handleView(scope.row)">详情</el-button>
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['project:contract:edit']">修改</el-button>
               <el-dropdown @command="(cmd) => handleCommand(cmd, scope.row)" style="vertical-align: middle">
                  <div>
                     <el-button link type="primary">更多▾</el-button>
                  </div>
                  <template #dropdown>
                     <el-dropdown-menu>
                        <el-dropdown-item command="status" icon="Switch">状态变更</el-dropdown-item>
                        <el-dropdown-item command="delete" icon="Delete" style="color: #f56c6c" v-hasPermi="['project:contract:remove']">删除</el-dropdown-item>
                     </el-dropdown-menu>
                  </template>
               </el-dropdown>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改合同对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="80%" append-to-body>
         <el-form ref="contractRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="合同编号" prop="contractNo">
                     <el-input v-model="form.contractNo" placeholder="请输入合同编号" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="合同名称" prop="contractName">
                     <el-input v-model="form.contractName" placeholder="请输入合同名称" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="合同类型" prop="contractType">
                     <el-select v-model="form.contractType" placeholder="请选择合同类型" style="width: 100%">
                        <el-option v-for="d in proj_contract_type" :key="d.value" :label="d.label" :value="d.value" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="合同金额" prop="contractAmount">
                     <el-input-number v-model="form.contractAmount" placeholder="请输入合同金额" :precision="2" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="委托单位" prop="clientUnit">
                     <el-input v-model="form.clientUnit" placeholder="请输入委托单位" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="合同期限" prop="contractPeriod">
                     <el-input v-model="form.contractPeriod" placeholder="请输入合同期限" maxlength="100" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="联系人" prop="contactName">
                     <el-input v-model="form.contactName" placeholder="请输入联系人" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="联系电话" prop="contactPhone">
                     <el-input v-model="form.contactPhone" placeholder="请输入联系电话" maxlength="30" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="签署日期" prop="signDate">
                     <el-date-picker v-model="form.signDate" type="date" placeholder="选择签署日期" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="登记时间" prop="entrustDate">
                     <el-date-picker v-model="form.entrustDate" type="date" placeholder="选择委托时间" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="审核日期" prop="auditDate">
                     <el-date-picker v-model="form.auditDate" type="date" placeholder="选择审核日期" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="返回日期" prop="returnDate">
                     <el-date-picker v-model="form.returnDate" type="date" placeholder="选择用户返回日期" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="完成日期" prop="finishDate">
                     <el-date-picker v-model="form.finishDate" type="date" placeholder="选择完成日期" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="归档日期" prop="archiveDate">
                     <el-date-picker v-model="form.archiveDate" type="date" placeholder="选择归档日期" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="归档目录" prop="archivePath">
                     <el-input v-model="form.archivePath" placeholder="请输入归档目录路径" maxlength="500" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20" v-if="form.status">
               <el-col :span="8">
                  <el-form-item label="当前状态">
                     <dict-tag :options="d('proj_contract_status')" :value="form.status" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="支付条件" prop="paymentTerms">
                     <el-input v-model="form.paymentTerms" type="textarea" placeholder="请输入支付条件" maxlength="2000" :rows="3" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="备注" prop="remark">
                     <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" :rows="2" />
                  </el-form-item>
               </el-col>
            </el-row>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 合同详情对话框 -->
      <el-dialog :title="'合同详情 — ' + detail.contractNo" :model-value="detailOpen" @update:model-value="detailOpen = $event" width="800px" append-to-body>
         <el-descriptions :column="2" border>
            <el-descriptions-item label="合同编号" :span="1">{{ detail.contractNo }}</el-descriptions-item>
            <el-descriptions-item label="合同名称" :span="1">{{ detail.contractName }}</el-descriptions-item>
            <el-descriptions-item label="合同类型"><dict-tag :options="proj_contract_type" :value="detail.contractType" /></el-descriptions-item>
            <el-descriptions-item label="合同状态">
               <dict-tag v-if="detail.status" :options="d('proj_contract_status')" :value="detail.status" />
               <span v-else>草稿</span>
            </el-descriptions-item>
            <el-descriptions-item label="合同金额">{{ detail.contractAmount != null ? formatAmount(detail.contractAmount) : '—' }}</el-descriptions-item>
            <el-descriptions-item label="委托单位">{{ detail.clientUnit || '—' }}</el-descriptions-item>
            <el-descriptions-item label="合同期限">{{ detail.contractPeriod || '—' }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contactName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detail.contactPhone || '—' }}</el-descriptions-item>
            <el-descriptions-item label="签署日期">{{ parseDate(detail.signDate) }}</el-descriptions-item>
            <el-descriptions-item label="登记时间">{{ parseDate(detail.entrustDate) }}</el-descriptions-item>
            <el-descriptions-item label="审核日期">{{ parseDate(detail.auditDate) }}</el-descriptions-item>
            <el-descriptions-item label="返回日期">{{ parseDate(detail.returnDate) }}</el-descriptions-item>
            <el-descriptions-item label="完成日期">{{ parseDate(detail.finishDate) }}</el-descriptions-item>
            <el-descriptions-item label="归档日期">{{ parseDate(detail.archiveDate) }}</el-descriptions-item>
            <el-descriptions-item label="归档目录" :span="2">{{ detail.archivePath || '—' }}</el-descriptions-item>
            <el-descriptions-item label="支付条件" :span="2">{{ detail.paymentTerms || '—' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remark || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建者">{{ detail.createBy || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="修改者">{{ detail.updateBy || '—' }}</el-descriptions-item>
            <el-descriptions-item label="修改时间">{{ parseTime(detail.updateTime) }}</el-descriptions-item>
         </el-descriptions>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="detailOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 状态变更弹窗 -->
      <el-dialog title="状态变更" :model-value="statusOpen" @update:model-value="statusOpen = $event" width="500px" append-to-body>
         <el-form :model="statusForm" label-width="100px">
            <el-form-item label="当前状态">
               <dict-tag :options="d('proj_contract_status')" :value="statusForm.currentStatus" />
            </el-form-item>
            <el-form-item label="变更为">
               <el-select v-model="statusForm.targetStatus" placeholder="请选择目标状态" style="width: 100%">
                  <el-option
                     v-for="s in statusForm.allowedStatuses"
                     :key="s"
                     :label="getDictLabel(d('proj_contract_status'), s)"
                     :value="s"
                  />
               </el-select>
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitStatusChange" :loading="statusSubmitting">确 定</el-button>
               <el-button @click="statusOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 关联项目弹窗 -->
      <el-dialog :title="'关联项目 — ' + currentContractName" :model-value="projectsOpen" @update:model-value="projectsOpen = $event" width="1000px" append-to-body>
         <el-table :data="projectList" stripe border max-height="450">
            <el-table-column label="工程编号" align="center" prop="project_code" min-width="140" :show-overflow-tooltip="true" />
            <el-table-column label="项目名称" align="center" prop="project_name" min-width="180" :show-overflow-tooltip="true" />
            <el-table-column label="项目类别" align="center" prop="category_name" min-width="120" />
            <el-table-column label="工程地点" align="center" prop="project_location" min-width="140" :show-overflow-tooltip="true" />
            <el-table-column label="委托单位" align="center" prop="client_unit" min-width="140" :show-overflow-tooltip="true" />
            <el-table-column label="状态" align="center" prop="status" min-width="90">
               <template #default="scope">
                  <dict-tag v-if="scope.row.status" :options="d('proj_project_status')" :value="scope.row.status" />
                  <span v-else style="color: #c0c4cc">—</span>
               </template>
            </el-table-column>
            <el-table-column label="合同单价" align="center" prop="contract_price" min-width="110">
               <template #default="scope">
                  <span v-if="scope.row.contract_price != null">{{ formatAmount(scope.row.contract_price) }}</span>
                  <span v-else style="color: #c0c4cc">—</span>
               </template>
            </el-table-column>
         </el-table>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="projectsOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Contract">
import { listContract, getContract, addContract, updateContract, delContract, changeContractStatus, getContractProjects, getContractStatusCounts, getContractDistinctValues } from "@/api/project/contract"

const { proxy } = getCurrentInstance()

// 字典
const dicts = useDict("proj_contract_status", "proj_project_status", "proj_contract_type")
const { proj_contract_type } = dicts

/** 安全获取字典选项 */
function d(key) {
  const src = unref(dicts) || {}
  return unref(src[key]) || []
}

const contractList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const statusOpen = ref(false)
const projectsOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const detail = ref({})
const ids = ref([])
const statusSubmitting = ref(false)
const currentContractName = ref("")
const projectList = ref([])

// 新增：智能查询面板
const signDateRange = ref([])
const entrustDateRange = ref([])
const auditDateRange = ref([])
const finishDateRange = ref([])
const statusCounts = ref({})
const advancedVisible = ref(false)
const savedSchemes = ref([])
const saveSchemeVisible = ref(false)
const schemeName = ref("")
const currentSchemeName = ref("")
const clientUnitOptions = ref([])

/** 合同状态流转规则 */
const STATUS_TRANSITIONS = {
  "draft":     ["signed", "cancelled"],
  "signed":    ["ongoing", "cancelled"],
  "ongoing":   ["completed", "cancelled"],
  "completed": ["archived", "cancelled"]
}

const data = reactive({
  form: {},
  statusForm: {
    contractId: null,
    currentStatus: "",
    targetStatus: "",
    allowedStatuses: []
  },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    contractNo: undefined,
    contractName: undefined,
    clientUnit: undefined,
    contractType: undefined,
    contactName: undefined,
    status: undefined,
    signDateBegin: undefined,
    signDateEnd: undefined,
    entrustDateBegin: undefined,
    entrustDateEnd: undefined,
    contractAmountMin: undefined,
    contractAmountMax: undefined,
    auditDateBegin: undefined,
    auditDateEnd: undefined,
    finishDateBegin: undefined,
    finishDateEnd: undefined
  },
  rules: {
    contractNo: [{ required: true, message: "合同编号不能为空", trigger: "blur" }],
    contractName: [{ required: true, message: "合同名称不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules, statusForm } = toRefs(data)

/** 根据字典值获取标签文本 */
function getDictLabel(dictList, value) {
  if (!dictList || !value) return value
  const item = dictList.find(d => d.value === value)
  return item ? item.label : value
}

/** 查询合同列表（含关联项目数） */
function getList() {
  loading.value = true
  listContract(queryParams.value).then(response => {
    contractList.value = response.rows || []
    total.value = response.total
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    id: undefined,
    contractNo: undefined,
    contractName: undefined,
    clientUnit: undefined,
    contactName: undefined,
    contactPhone: undefined,
    contractType: undefined,
    contractAmount: undefined,
    signDate: undefined,
    entrustDate: undefined,
    auditDate: undefined,
    returnDate: undefined,
    finishDate: undefined,
    archiveDate: undefined,
    archivePath: undefined,
    contractPeriod: undefined,
    paymentTerms: undefined,
    status: undefined,
    remark: undefined
  }
  proxy.resetForm("contractRef")
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置搜索 */
function resetQuery() {
  signDateRange.value = []
  entrustDateRange.value = []
  auditDateRange.value = []
  finishDateRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.contractNo = undefined
  queryParams.value.contractName = undefined
  queryParams.value.clientUnit = undefined
  queryParams.value.contractType = undefined
  queryParams.value.contactName = undefined
  queryParams.value.status = undefined
  queryParams.value.signDateBegin = undefined
  queryParams.value.signDateEnd = undefined
  queryParams.value.entrustDateBegin = undefined
  queryParams.value.entrustDateEnd = undefined
  queryParams.value.contractAmountMin = undefined
  queryParams.value.contractAmountMax = undefined
  queryParams.value.auditDateBegin = undefined
  queryParams.value.auditDateEnd = undefined
  queryParams.value.finishDateBegin = undefined
  queryParams.value.finishDateEnd = undefined
  currentSchemeName.value = ''
  handleQuery()
}

/** 状态胶囊数据（字典驱动 - 始终显示全部字典定义的状态） */
const statusCapsules = computed(() => {
  const dict = d('proj_contract_status')
  const total = Object.values(statusCounts.value).reduce((sum, c) => sum + (Number(c) || 0), 0)
  const items = [{ label: '全部', value: undefined, count: total }]
  dict.forEach(d => {
    items.push({ label: d.label, value: d.value, count: statusCounts.value[d.value] || 0 })
  })
  return items
})

/** 加载状态统计（填充 statusCounts 对象） */
function loadStatusCounts() {
  getContractStatusCounts().then(response => {
    const counts = {}
    const list = response.data || []
    list.forEach(item => { counts[item.status] = Number(item.cnt) || 0 })
    statusCounts.value = counts
  }).catch(() => {})
}

/** 状态胶囊点击（支持取消选中） */
function handleStatusClick(status) {
  if (queryParams.value.status === status) {
    queryParams.value.status = undefined
  } else {
    queryParams.value.status = status
  }
  handleQuery()
}

/** 签署日期变更 */
function onSignDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.signDateBegin = val[0]
    queryParams.value.signDateEnd = val[1]
  } else {
    queryParams.value.signDateBegin = undefined
    queryParams.value.signDateEnd = undefined
  }
  handleQuery()
}

/** 委托时间变更 */
function onEntrustDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.entrustDateBegin = val[0]
    queryParams.value.entrustDateEnd = val[1]
  } else {
    queryParams.value.entrustDateBegin = undefined
    queryParams.value.entrustDateEnd = undefined
  }
  handleQuery()
}

/** 审核日期变更 */
function onAuditDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.auditDateBegin = val[0]
    queryParams.value.auditDateEnd = val[1]
  } else {
    queryParams.value.auditDateBegin = undefined
    queryParams.value.auditDateEnd = undefined
  }
  handleQuery()
}

/** 完成日期变更 */
function onFinishDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.finishDateBegin = val[0]
    queryParams.value.finishDateEnd = val[1]
  } else {
    queryParams.value.finishDateBegin = undefined
    queryParams.value.finishDateEnd = undefined
  }
  handleQuery()
}

/** 加载委托单位去重值 */
function loadClientUnits() {
  getContractDistinctValues('clientUnit').then(response => {
    clientUnitOptions.value = response.data || []
  }).catch(() => {})
}

/** 快捷日期 */
function setQuickDate(type) {
  const now = new Date()
  const fmt = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  let begin, end
  switch (type) {
    case 'today':
      begin = end = fmt(now)
      break
    case 'week': {
      const d = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
      const mon = new Date(now.getFullYear(), now.getMonth(), d)
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)
      begin = fmt(mon); end = fmt(sun)
      break
    }
    case 'month':
      begin = fmt(new Date(now.getFullYear(), now.getMonth(), 1))
      end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      break
    case '7days': {
      const d7 = new Date(now.getTime() - 6 * 86400000)
      begin = fmt(d7); end = fmt(now)
      break
    }
    case '30days': {
      const d30 = new Date(now.getTime() - 29 * 86400000)
      begin = fmt(d30); end = fmt(now)
      break
    }
  }
  if (begin && end) {
    signDateRange.value = [begin, end]
    onSignDateChange([begin, end])
  }
}

/** 加载已保存的筛选方案 */
function loadSavedSchemes() {
  try {
    const raw = localStorage.getItem('contract_filter_schemes')
    if (raw) savedSchemes.value = JSON.parse(raw)
  } catch (e) { /* ignore */ }
}

/** 激活筛选方案 */
function activateScheme(scheme) {
  const qp = queryParams.value
  signDateRange.value = []
  entrustDateRange.value = []
  auditDateRange.value = []
  finishDateRange.value = []
  Object.keys(qp).forEach(k => { if (k !== 'pageNum' && k !== 'pageSize') qp[k] = undefined })
  if (scheme.data) {
    Object.assign(qp, scheme.data)
    if (scheme.data.signDateBegin && scheme.data.signDateEnd) {
      signDateRange.value = [scheme.data.signDateBegin, scheme.data.signDateEnd]
    }
    if (scheme.data.entrustDateBegin && scheme.data.entrustDateEnd) {
      entrustDateRange.value = [scheme.data.entrustDateBegin, scheme.data.entrustDateEnd]
    }
    if (scheme.data.auditDateBegin && scheme.data.auditDateEnd) {
      auditDateRange.value = [scheme.data.auditDateBegin, scheme.data.auditDateEnd]
    }
    if (scheme.data.finishDateBegin && scheme.data.finishDateEnd) {
      finishDateRange.value = [scheme.data.finishDateBegin, scheme.data.finishDateEnd]
    }
  }
  currentSchemeName.value = scheme.name
  handleQuery()
}

/** 保存当前筛选方案 */
function saveScheme() {
  if (!schemeName.value.trim()) return
  const name = schemeName.value.trim()
  const data = {}
  const qp = queryParams.value
  const keys = ['keyword','contractNo','contractName','clientUnit','contractType','contactName','status',
                'signDateBegin','signDateEnd','entrustDateBegin','entrustDateEnd',
                'auditDateBegin','auditDateEnd','finishDateBegin','finishDateEnd',
                'contractAmountMin','contractAmountMax']
  keys.forEach(k => { if (qp[k] !== undefined && qp[k] !== '') data[k] = qp[k] })
  const existing = savedSchemes.value.findIndex(s => s.name === name)
  if (existing >= 0) savedSchemes.value.splice(existing, 1)
  savedSchemes.value.unshift({ name, data })
  if (savedSchemes.value.length > 8) savedSchemes.value = savedSchemes.value.slice(0, 8)
  localStorage.setItem('contract_filter_schemes', JSON.stringify(savedSchemes.value))
  currentSchemeName.value = name
  saveSchemeVisible.value = false
  schemeName.value = ''
  proxy.$modal.msgSuccess('方案已保存')
}

/** 多选框 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "新增合同"
}

/** 修改 */
function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getContract(id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改合同"
  })
}

/** 查看详情 */
function handleView(row) {
  getContract(row.id).then(response => {
    detail.value = response.data
    detailOpen.value = true
  })
}

/** 提交 */
function submitForm() {
  proxy.$refs["contractRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updateContract(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addContract(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 更多下拉操作 */
function handleCommand(cmd, row) {
  if (cmd === 'status') {
    handleStatusChange(row)
  } else if (cmd === 'delete') {
    handleDelete(row)
  }
}

/** 状态变更弹窗 */
function handleStatusChange(row) {
  const current = row.status || "draft"
  const allowed = STATUS_TRANSITIONS[current] || []
  if (allowed.length === 0) {
    proxy.$modal.msgWarning("当前状态【" + getDictLabel(d('proj_contract_status'), current) + "】为终态，不允许变更")
    return
  }
  statusForm.value = {
    contractId: row.id,
    currentStatus: current,
    targetStatus: "",
    allowedStatuses: allowed
  }
  statusOpen.value = true
}

/** 提交状态变更 */
function submitStatusChange() {
  if (!statusForm.value.targetStatus) {
    proxy.$modal.msgWarning("请选择目标状态")
    return
  }
  statusSubmitting.value = true
  changeContractStatus(statusForm.value.contractId, statusForm.value.targetStatus).then(() => {
    proxy.$modal.msgSuccess("状态变更成功")
    statusOpen.value = false
    statusSubmitting.value = false
    getList()
  }).catch(() => {
    statusSubmitting.value = false
  })
}

/** 删除 */
function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  const name = row.id ? row.contractNo : "所选合同"
  proxy.$modal.confirm('是否确认删除合同"' + name + '"?').then(function() {
    return delContract(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 查看关联项目 */
function handleShowProjects(row) {
  currentContractName.value = row.contractNo + " — " + row.contractName
  getContractProjects(row.id).then(response => {
    projectList.value = response.data || []
    projectsOpen.value = true
  })
}

/** 导出 */
function handleExport() {
  proxy.download('/project/contract/export', {
    ...queryParams.value
  }, `contract_${new Date().getTime()}.xlsx`)
}

/** 金额格式化 */
function formatAmount(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 日期解析 */
function parseDate(val) {
  if (!val) return '—'
  return val
}

getList()
loadStatusCounts()
loadSavedSchemes()
loadClientUnits()
</script>

<style scoped>
/* ===== 智能查询面板 ===== */
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.search-input-wrapper { flex: 1; }
.global-search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.status-capsule-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.status-capsule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  background: #f5f5f5;
  color: #666;
  transition: all 0.2s;
  user-select: none;
}
.status-capsule:hover { background: #e8e8e8; }
.status-capsule.active { background: #409eff; color: #fff; }
.capsule-count {
  font-size: 11px;
  background: rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 0 6px;
  min-width: 20px;
  text-align: center;
}
.status-capsule.active .capsule-count { background: rgba(255,255,255,0.25); }

.advanced-toggle-row {
  cursor: pointer;
  color: #909399;
  font-size: 13px;
  padding: 4px 0;
  margin-bottom: 8px;
  user-select: none;
}
.advanced-toggle-row:hover { color: #409eff; }

.advanced-filter-panel {
  border-radius: 10px;
  padding: 10px 20px 12px;
  margin-bottom: 16px;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px 24px;
}
.filter-item-label {
  font-size: 12px;
  margin-bottom: 4px;
}

.quick-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.quick-label { font-size: 12px; color: #888; }
.quick-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(255,255,255,0.07);
  color: #aaa;
  transition: all 0.2s;
  user-select: none;
}
.quick-chip:hover { background: rgba(64,158,255,0.25); color: #409eff; }
.scheme-chip { background: rgba(64,158,255,0.1); color: #79bbff; }
.scheme-chip:hover { background: rgba(64,158,255,0.3); }
.collapse-link {
  margin-left: auto;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  user-select: none;
}
.collapse-link:hover { color: #409eff; }
</style>
