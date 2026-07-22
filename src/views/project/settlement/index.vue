<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="工程编号" prop="projectCode">
            <el-input v-model="queryParams.projectCode" placeholder="请输入工程编号" clearable style="width: 180px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item label="委托单位" prop="clientUnit">
            <el-input v-model="queryParams.clientUnit" placeholder="请输入委托单位" clearable style="width: 180px" @keyup.enter="handleQuery" />
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['project:settlement:export']">导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table
         v-loading="loading"
         :data="treeData"
         row-key="id"
         :tree-props="{ children: 'children' }"
         stripe border
         :default-expand-all="false"
      >
         <el-table-column label="序号" align="center" width="60">
            <template #default="scope">
               <span>{{ scope.$index + 1 }}</span>
            </template>
         </el-table-column>
         <el-table-column label="工程编号" align="center" prop="projectCode" min-width="120" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.projectCode" style="font-weight:bold">{{ scope.row.projectCode }}</span>
            </template>
         </el-table-column>
         <el-table-column label="委托单位" align="center" prop="clientUnit" min-width="120" :show-overflow-tooltip="true" />
         <el-table-column label="工程地点" align="center" prop="projectLocation" min-width="120" :show-overflow-tooltip="true" />
         <el-table-column label="内部工作量" align="center" prop="internalWorkload" width="110">
            <template #default="scope">
               <span v-if="scope.row.internalWorkload != null">{{ scope.row.internalWorkload }}</span>
            </template>
         </el-table-column>
         <el-table-column label="外部工作量" align="center" prop="externalWorkload" width="110">
            <template #default="scope">
               <span v-if="scope.row.externalWorkload != null">{{ scope.row.externalWorkload }}</span>
            </template>
         </el-table-column>
         <el-table-column label="内部产值" align="center" prop="internalOutput" width="120">
            <template #default="scope">
               <span v-if="scope.row.internalOutput != null">{{ formatMoney(scope.row.internalOutput) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="项目金额" align="center" prop="externalOutput" width="120">
            <template #default="scope">
               <span v-if="scope.row.externalOutput != null">{{ formatMoney(scope.row.externalOutput) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="预付款" align="center" prop="prepayAmount" width="100">
            <template #default="scope">
               <span v-if="scope.row.prepayAmount != null">{{ formatMoney(scope.row.prepayAmount) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="时间" align="center" prop="prepayDate" width="110">
            <template #default="scope">
               <span v-if="scope.row.prepayDate">{{ scope.row.prepayDate }}</span>
            </template>
         </el-table-column>
         <el-table-column label="付款单位" align="center" prop="payUnit" min-width="110" :show-overflow-tooltip="true" />
         <el-table-column label="付款方式" align="center" prop="payMethod" width="100" />
         <el-table-column label="尾款" align="center" prop="tailAmount" width="100">
            <template #default="scope">
               <span v-if="scope.row.tailAmount != null">{{ formatMoney(scope.row.tailAmount) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="时间" align="center" prop="tailDate" width="110">
            <template #default="scope">
               <span v-if="scope.row.tailDate">{{ scope.row.tailDate }}</span>
            </template>
         </el-table-column>
         <el-table-column label="备注" align="center" prop="payRemark" min-width="140" :show-overflow-tooltip="true" />
         <el-table-column label="操作" align="center" width="80" fixed="right">
            <template #default="scope">
               <el-button
                  v-if="scope.row.projectId"
                  link type="primary"
                  @click="handleEdit(scope.row)"
                  v-hasPermi="['project:settlement:edit']"
               >编辑</el-button>
            </template>
         </el-table-column>
      </el-table>

      <!-- 编辑结算弹窗 -->
      <el-dialog :title="'费用结算 — ' + editProjectCode" v-model="editOpen" width="80%" append-to-body destroy-on-close>
         <el-form ref="settlementRef" :model="editForm" label-width="100px">
            <!-- 工程信息（只读） -->
            <el-divider content-position="left">工程信息</el-divider>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="工程编号">
                     <el-input :model-value="editProjectCode" disabled />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="委托单位">
                     <el-input :model-value="editClientUnit" disabled />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="工程地点">
                     <el-input :model-value="editProjectLocation" disabled />
                  </el-form-item>
               </el-col>
            </el-row>

            <!-- 付款信息 -->
            <el-divider content-position="left">付款信息</el-divider>
            <el-row :gutter="20">
               <el-col :span="6">
                  <el-form-item label="预付款">
                     <el-input-number v-model="editForm.prepayAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="预付款金额" />
                  </el-form-item>
               </el-col>
               <el-col :span="6">
                  <el-form-item label="付款时间">
                     <el-date-picker v-model="editForm.prepayDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="6">
                  <el-form-item label="付款单位">
                     <el-input v-model="editForm.payUnit" placeholder="付款单位" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="6">
                  <el-form-item label="付款方式">
                     <el-select v-model="editForm.payMethod" placeholder="付款方式" style="width:100%">
                        <el-option label="转账" value="转账" />
                        <el-option label="现金" value="现金" />
                        <el-option label="支票" value="支票" />
                        <el-option label="其他" value="其他" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="6">
                  <el-form-item label="尾款">
                     <el-input-number v-model="editForm.tailAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="尾款金额" />
                  </el-form-item>
               </el-col>
               <el-col :span="6">
                  <el-form-item label="尾款时间">
                     <el-date-picker v-model="editForm.tailDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="备注">
                     <el-input v-model="editForm.remark" placeholder="备注" maxlength="500" />
                  </el-form-item>
               </el-col>
            </el-row>

            <!-- 工作量明细 -->
            <el-divider content-position="left">
               工作量明细
               <el-button type="primary" link icon="Plus" @click="addWorkloadRow" style="margin-left:10px">添加行</el-button>
            </el-divider>
            <el-table :data="editForm.workloads" stripe border>
               <el-table-column label="负责人" align="center" min-width="110">
                  <template #default="scope">
                     <el-select v-model="scope.row.userId" filterable placeholder="选择负责人" style="width:100%">
                        <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </template>
               </el-table-column>
               <el-table-column label="项目类别" align="center" min-width="130">
                  <template #default="scope">
                     <el-tree-select
                        v-model="scope.row.categoryId"
                        :data="categoryOptions"
                        :props="{ value: 'id', label: 'label', children: 'children' }"
                        value-key="id"
                        placeholder="类别（小类）"
                        check-strictly
                        style="width:100%"
                        @change="(val) => onCategoryChange(val, scope.row)"
                     />
                  </template>
               </el-table-column>
               <el-table-column label="内部工作量" align="center" width="120">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.internalWorkload" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                  </template>
               </el-table-column>
               <el-table-column label="内部单价" align="center" width="120">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.internalPrice" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                  </template>
               </el-table-column>
               <el-table-column label="内部产值" align="center" width="120">
                  <template #default="scope">
                     <span>{{ formatMoney(scope.row.internalOutput) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="外部工作量" align="center" width="120">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.externalWorkload" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                  </template>
               </el-table-column>
               <el-table-column label="外部单价" align="center" width="120">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.externalPrice" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                  </template>
               </el-table-column>
               <el-table-column label="外部产值" align="center" width="120">
                  <template #default="scope">
                     <span>{{ formatMoney(scope.row.externalOutput) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="操作" align="center" width="60">
                  <template #default="scope">
                     <el-button link type="danger" icon="Delete" @click="removeWorkloadRow(scope.$index)" />
                  </template>
               </el-table-column>
            </el-table>

            <!-- 产值合计 -->
            <el-row style="margin-top:12px">
               <el-col :span="24" style="text-align:right;font-weight:bold;color:#409eff">
                  外部产值（项目金额）合计：{{ formatMoney(totalExternalOutput) }}
               </el-col>
            </el-row>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitSettlement" :loading="saveLoading">保 存</el-button>
               <el-button @click="editOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Settlement">
import { treeListSettlement, getSettlementDetail, saveSettlement } from "@/api/project/settlement"
import { categoryTreeselect } from "@/api/project/category"
import { listUser } from "@/api/system/user"

const { proxy } = getCurrentInstance()

const treeData = ref([])
const loading = ref(false)
const showSearch = ref(true)
const editOpen = ref(false)
const saveLoading = ref(false)
const editProjectCode = ref("")
const editClientUnit = ref("")
const editProjectLocation = ref("")
const editProjectId = ref(null)
const userOptions = ref([])
const categoryOptions = ref([])

const data = reactive({
  queryParams: {
    projectCode: undefined,
    clientUnit: undefined
  },
  editForm: {
    prepayAmount: null,
    prepayDate: null,
    payUnit: null,
    payMethod: null,
    tailAmount: null,
    tailDate: null,
    remark: null,
    workloads: []
  }
})

const { queryParams, editForm } = toRefs(data)

// 计算外部产值合计
const totalExternalOutput = computed(() => {
  let sum = 0
  editForm.value.workloads.forEach(row => {
    if (row.externalOutput) sum += Number(row.externalOutput)
  })
  return sum
})

/** 金额格式化 */
function formatMoney(val) {
  if (val == null) return "—"
  return Number(val).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 计算单行产值 */
function calcRow(row) {
  if (row.internalWorkload && row.internalPrice) {
    row.internalOutput = (Number(row.internalWorkload) * Number(row.internalPrice)).toFixed(2)
  } else {
    row.internalOutput = null
  }
  if (row.externalWorkload && row.externalPrice) {
    row.externalOutput = (Number(row.externalWorkload) * Number(row.externalPrice)).toFixed(2)
  } else {
    row.externalOutput = null
  }
}

/** 选择类别后自动填默认单价 */
function onCategoryChange(categoryId, row) {
  if (!categoryId || !categoryOptions.value.length) return
  // 递归查找类别节点获取单价
  function findNode(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const found = findNode(n.children, id)
        if (found) return found
      }
    }
    return null
  }
  const node = findNode(categoryOptions.value, categoryId)
  if (node) {
    if (node.internalPrice != null) row.internalPrice = node.internalPrice
    if (node.externalPrice != null) row.externalPrice = node.externalPrice
    calcRow(row)
  }
}

/** 查询树形列表 */
function getList() {
  loading.value = true
  treeListSettlement(queryParams.value).then(response => {
    treeData.value = response.data || []
    loading.value = false
  })
}

function handleQuery() {
  getList()
}

function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 编辑结算 */
function handleEdit(row) {
  editProjectId.value = row.projectId
  editProjectCode.value = row.projectCode
  editClientUnit.value = row.clientUnit || ""
  editProjectLocation.value = row.projectLocation || ""

  // 加载基础数据
  Promise.all([categoryTreeselect(), listUser({ pageNum: 1, pageSize: 1000 }), getSettlementDetail(row.projectId)])
    .then(([catRes, userRes, detailRes]) => {
      categoryOptions.value = catRes.data
      userOptions.value = userRes.rows || []

      const detail = detailRes.data
      const payments = detail.payments || []
      const workloads = detail.workloads || []

      // 填充付款信息
      const prepay = payments.find(p => p.paymentType === "预付款")
      const tail = payments.find(p => p.paymentType === "尾款")
      editForm.value.prepayAmount = prepay ? prepay.amount : null
      editForm.value.prepayDate = prepay ? prepay.payTime : null
      editForm.value.payUnit = prepay ? prepay.payUnit : (tail ? tail.payUnit : null)
      editForm.value.payMethod = prepay ? prepay.payMethod : (tail ? tail.payMethod : null)
      editForm.value.tailAmount = tail ? tail.amount : null
      editForm.value.tailDate = tail ? tail.payTime : null
      editForm.value.remark = prepay ? prepay.remark : (tail ? tail.remark : null)

      // 填充工作量
      editForm.value.workloads = workloads.map(w => ({
        workloadId: w.id,
        userId: w.userId,
        categoryId: w.categoryId,
        internalWorkload: w.internalWorkload,
        internalPrice: w.internalPrice,
        internalOutput: w.internalOutput,
        externalWorkload: w.externalWorkload,
        externalPrice: w.externalPrice,
        externalOutput: w.externalOutput
      }))

      editOpen.value = true
    })
}

/** 添加工作量行 */
function addWorkloadRow() {
  editForm.value.workloads.push({
    workloadId: null,
    userId: null,
    categoryId: null,
    internalWorkload: null,
    internalPrice: null,
    internalOutput: null,
    externalWorkload: null,
    externalPrice: null,
    externalOutput: null
  })
}

/** 删除工作量行 */
function removeWorkloadRow(index) {
  editForm.value.workloads.splice(index, 1)
}

/** 提交结算 */
function submitSettlement() {
  saveLoading.value = true
  const payload = {
    projectId: editProjectId.value,
    prepay: {
      amount: editForm.value.prepayAmount,
      payTime: editForm.value.prepayDate,
      payUnit: editForm.value.payUnit,
      payMethod: editForm.value.payMethod
    },
    tail: {
      amount: editForm.value.tailAmount,
      payTime: editForm.value.tailDate,
      payUnit: editForm.value.payUnit,
      payMethod: editForm.value.payMethod
    },
    remark: editForm.value.remark,
    workloads: editForm.value.workloads
  }

  saveSettlement(payload).then(() => {
    proxy.$modal.msgSuccess("保存成功")
    editOpen.value = false
    saveLoading.value = false
    getList()
  }).catch(() => {
    saveLoading.value = false
  })
}

/** 导出 */
function handleExport() {
  proxy.$modal.msgWarning("导出功能暂未实现")
}

getList()
</script>
