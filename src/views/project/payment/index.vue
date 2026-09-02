<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="所属项目" prop="projectId">
            <el-select v-model="queryParams.projectId" placeholder="请选择项目" clearable filterable style="width: 200px">
               <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
            </el-select>
         </el-form-item>
         <el-form-item label="付款类型" prop="paymentType">
            <el-select v-model="queryParams.paymentType" placeholder="请选择付款类型" clearable style="width: 140px">
               <el-option v-for="d in proj_payment_type" :key="d.value" :label="d.label" :value="d.value" />
            </el-select>
         </el-form-item>
         <el-form-item label="付款单位" prop="payUnit">
            <el-input v-model="queryParams.payUnit" placeholder="请输入付款单位" clearable maxlength="200" style="width: 180px" />
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" size="small" @click="handleAdd" v-hasPermi="['project:payment:add']">新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" size="small" :disabled="single" @click="handleUpdate" v-hasPermi="['project:payment:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" size="small" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:payment:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:payment:export']">导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="paymentList" stripe border @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column label="所属项目" align="center" prop="projectName" min-width="170" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.projectName">{{ scope.row.projectName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="付款类型" align="center" prop="paymentType" min-width="100">
            <template #default="scope">
               <dict-tag :options="proj_payment_type" :value="scope.row.paymentType" />
            </template>
         </el-table-column>
         <el-table-column label="金额(元)" align="center" prop="amount" min-width="130">
            <template #default="scope">
               <span v-if="scope.row.amount != null">{{ formatMoney(scope.row.amount) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="付款时间" align="center" prop="payTime" min-width="110">
            <template #default="scope">
               <span v-if="scope.row.payTime">{{ parseTime(scope.row.payTime, '{y}-{m}-{d}') }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="付款单位" align="center" prop="payUnit" min-width="160" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.payUnit">{{ scope.row.payUnit }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="付款方式" align="center" prop="payMethod" min-width="120">
            <template #default="scope">
               <span v-if="scope.row.payMethod">{{ scope.row.payMethod }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="备注" align="center" prop="remark" min-width="150" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.remark">{{ scope.row.remark }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" size="small" @click="handleUpdate(scope.row)" v-hasPermi="['project:payment:edit']">修改</el-button>
               <el-button link type="primary" size="small" @click="handleDelete(scope.row)" v-hasPermi="['project:payment:remove']">删除</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改付款记录对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="80%" append-to-body>
         <el-form ref="paymentRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="所属项目" prop="projectId">
                     <el-select v-model="form.projectId" placeholder="请选择项目" filterable style="width: 100%">
                        <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="付款类型" prop="paymentType">
                     <el-select v-model="form.paymentType" placeholder="请选择付款类型" style="width: 100%">
                        <el-option v-for="d in proj_payment_type" :key="d.value" :label="d.label" :value="d.value" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="金额(元)" prop="amount">
                     <el-input-number v-model="form.amount" placeholder="请输入金额" :precision="2" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="付款时间" prop="payTime">
                     <el-date-picker v-model="form.payTime" type="date" placeholder="选择付款时间" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="付款单位" prop="payUnit">
                     <el-input v-model="form.payUnit" placeholder="请输入付款单位" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="付款方式" prop="payMethod">
                     <el-select v-model="form.payMethod" placeholder="请选择付款方式" clearable filterable allow-create style="width: 100%">
                        <el-option label="银行转账" value="银行转账" />
                        <el-option label="现金" value="现金" />
                        <el-option label="支票" value="支票" />
                        <el-option label="电汇" value="电汇" />
                     </el-select>
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
   </div>
</template>

<script setup name="Payment">
import { listPayment, getPayment, addPayment, updatePayment, delPayment } from "@/api/project/payment"
import { listProject } from "@/api/project/project"

const { proxy } = getCurrentInstance()
const { proj_payment_type } = useDict('proj_payment_type')

const paymentList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const ids = ref([])
const projectOptions = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    projectId: undefined,
    paymentType: undefined,
    payUnit: undefined
  },
  rules: {
    projectId: [{ required: true, message: "请选择项目", trigger: "change" }],
    paymentType: [{ required: true, message: "请选择付款类型", trigger: "change" }],
    amount: [{ required: true, message: "请输入金额", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 加载项目下拉选项 */
function loadOptions() {
  listProject({ pageNum: 1, pageSize: 999 }).then(r => { projectOptions.value = r.rows || [] })
}

/** 查询付款记录列表 */
function getList() {
  loading.value = true
  listPayment(queryParams.value).then(response => {
    paymentList.value = response.rows
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
    projectId: undefined,
    paymentType: undefined,
    amount: undefined,
    payTime: undefined,
    payUnit: undefined,
    payMethod: undefined,
    remark: undefined
  }
  proxy.resetForm("paymentRef")
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置 */
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
  title.value = "新增付款记录"
}

/** 修改 */
function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getPayment(id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改付款记录"
  })
}

/** 金额格式化 */
function formatMoney(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 提交 */
function submitForm() {
  proxy.$refs["paymentRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updatePayment(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addPayment(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除 */
function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除所选付款记录?').then(function() {
    return delPayment(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出 */
function handleExport() {
  proxy.download('/project/payment/export', {
    ...queryParams.value
  }, `payment_${new Date().getTime()}.xlsx`)
}

loadOptions()
getList()

// keep-alive 缓存下切回本页时刷新列表（避免项目删除后仍显示旧数据）
onActivated(() => {
  getList()
})
</script>
