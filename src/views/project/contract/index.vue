<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="合同编号" prop="contractNo">
            <el-input v-model="queryParams.contractNo" placeholder="请输入合同编号" clearable style="width: 180px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="合同名称" prop="contractName">
            <el-input v-model="queryParams.contractName" placeholder="请输入合同名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="委托单位" prop="clientUnit">
            <el-input v-model="queryParams.clientUnit" placeholder="请输入委托单位" clearable style="width: 180px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="合同类型" prop="contractType">
            <el-select v-model="queryParams.contractType" placeholder="合同类型" clearable style="width: 140px">
               <el-option label="勘察合同" value="勘察合同" />
               <el-option label="测绘合同" value="测绘合同" />
               <el-option label="设计合同" value="设计合同" />
               <el-option label="施工合同" value="施工合同" />
               <el-option label="其他合同" value="其他合同" />
            </el-select>
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="合同状态" clearable style="width: 140px">
               <el-option
                  v-for="dict in d('proj_contract_status')"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['project:contract:add']">新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['project:contract:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:contract:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['project:contract:export']">导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="contractList" stripe border @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column label="合同编号" align="center" prop="contractNo" :show-overflow-tooltip="true" min-width="140" />
         <el-table-column label="合同名称" align="center" prop="contractName" :show-overflow-tooltip="true" min-width="180" />
         <el-table-column label="委托单位" align="center" prop="clientUnit" :show-overflow-tooltip="true" min-width="160" />
         <el-table-column label="合同类型" align="center" prop="contractType" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.contractType">{{ scope.row.contractType }}</span>
               <span v-else style="color: #c0c4cc">—</span>
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
                  <el-button link type="primary">更多▾</el-button>
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
      <el-dialog :title="title" v-model="open" width="80%" append-to-body>
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
                        <el-option label="勘察合同" value="勘察合同" />
                        <el-option label="测绘合同" value="测绘合同" />
                        <el-option label="设计合同" value="设计合同" />
                        <el-option label="施工合同" value="施工合同" />
                        <el-option label="其他合同" value="其他合同" />
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
                  <el-form-item label="委托时间" prop="entrustDate">
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
      <el-dialog :title="'合同详情 — ' + detail.contractNo" v-model="detailOpen" width="800px" append-to-body>
         <el-descriptions :column="2" border>
            <el-descriptions-item label="合同编号" :span="1">{{ detail.contractNo }}</el-descriptions-item>
            <el-descriptions-item label="合同名称" :span="1">{{ detail.contractName }}</el-descriptions-item>
            <el-descriptions-item label="合同类型">{{ detail.contractType || '—' }}</el-descriptions-item>
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
            <el-descriptions-item label="委托时间">{{ parseDate(detail.entrustDate) }}</el-descriptions-item>
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
      <el-dialog title="状态变更" v-model="statusOpen" width="500px" append-to-body>
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
      <el-dialog :title="'关联项目 — ' + currentContractName" v-model="projectsOpen" width="1000px" append-to-body>
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
import { listContract, getContract, addContract, updateContract, delContract, changeContractStatus, getContractProjects } from "@/api/project/contract"

const { proxy } = getCurrentInstance()

// 字典
const { dicts } = useDict("proj_contract_status", "proj_project_status")

/** 安全获取字典选项 */
function d(key) {
  const src = unref(dicts) || {}
  return src[key] || []
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

/** 合同状态流转规则 */
const STATUS_TRANSITIONS = {
  "草稿":   ["已签署", "已取消"],
  "已签署": ["执行中", "已取消"],
  "执行中": ["已完成", "已取消"],
  "已完成": ["已归档", "已取消"]
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
    contractNo: undefined,
    contractName: undefined,
    clientUnit: undefined,
    contractType: undefined,
    status: undefined
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
  proxy.resetForm("queryRef")
  handleQuery()
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
  const current = row.status || "草稿"
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
</script>
