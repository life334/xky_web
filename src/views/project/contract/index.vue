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
         <el-table-column label="合同期限" align="center" prop="contractPeriod" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.contractPeriod">{{ scope.row.contractPeriod }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="创建时间" align="center" prop="createTime" width="170">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="220" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="View" @click="handleView(scope.row)">详情</el-button>
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['project:contract:edit']">修改</el-button>
               <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['project:contract:remove']">删除</el-button>
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
   </div>
</template>

<script setup name="Contract">
import { listContract, getContract, addContract, updateContract, delContract } from "@/api/project/contract"

const { proxy } = getCurrentInstance()

const contractList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const detail = ref({})
const ids = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    contractNo: undefined,
    contractName: undefined,
    clientUnit: undefined,
    contractType: undefined
  },
  rules: {
    contractNo: [{ required: true, message: "合同编号不能为空", trigger: "blur" }],
    contractName: [{ required: true, message: "合同名称不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 查询合同列表 */
function getList() {
  loading.value = true
  listContract(queryParams.value).then(response => {
    contractList.value = response.rows
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
    remark: undefined
  }
  proxy.resetForm("contractRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "新增合同"
}

/** 修改按钮操作 */
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

/** 提交按钮 */
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

/** 删除按钮操作 */
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

/** 导出按钮操作 */
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
  // 已经格式化过（如 YYYY-MM-DD）
  return val
}

getList()
</script>
