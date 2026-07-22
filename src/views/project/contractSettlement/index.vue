<template>
  <div class="app-container">
    <!-- 查询表单 -->
    <el-form :model="queryParams" ref="queryFormRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="合同名称" prop="contractName">
        <el-input v-model="queryParams.contractName" placeholder="请输入" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="合同编号" prop="contractNo">
        <el-input v-model="queryParams.contractNo" placeholder="请输入" clearable style="width: 180px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['project:contractSettlement:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 树形表格 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      row-key="id"
      :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      border
      stripe
      :header-cell-style="{ background: '#f5f7fa', color: '#333' }"
      style="width: 100%"
    >
      <el-table-column label="序号" width="60" align="center" type="index" />
      <el-table-column label="合同名称" prop="contractName" min-width="160" show-overflow-tooltip />
      <el-table-column label="合同编号" prop="contractNo" min-width="130" show-overflow-tooltip />
      <el-table-column label="合同金额" prop="contractAmount" min-width="110" align="right">
        <template #default="scope">
          {{ scope.row.contractAmount ? new Intl.NumberFormat().format(scope.row.contractAmount) : '' }}
        </template>
      </el-table-column>
      <el-table-column label="合同单价" prop="priceSummary" min-width="140" align="center">
        <template #default="scope">
          <!-- 合同行：可点击链接 -->
          <el-link v-if="scope.row.priceSummary && scope.row.priceSummary !== '—'" type="primary" @click.stop="openPriceDetail(scope.row)">
            [{{ scope.row.priceSummary }}▸]
          </el-link>
          <!-- 项目行：显示类别+单价 -->
          <span v-else-if="scope.row.categoryName">
            {{ scope.row.categoryName }} {{ scope.row.contractPrice != null ? scope.row.contractPrice : '—' }}
          </span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="签署日期" prop="signDate" min-width="110" align="center" />
      <el-table-column label="合同期限" prop="contractPeriod" min-width="110" show-overflow-tooltip align="center" />
      <el-table-column label="支付条件" prop="paymentTerms" min-width="130" show-overflow-tooltip />
      <el-table-column label="已到账" prop="receivedAmount" min-width="110" align="right">
        <template #default="scope">
          <span v-if="scope.row.receivedAmount != null" :class="{ 'text-success font-medium': scope.row.receivedAmount > 0 }">
            {{ new Intl.NumberFormat().format(scope.row.receivedAmount) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="工程编号" prop="projectCode" min-width="130" show-overflow-tooltip />
      <el-table-column label="备注" prop="remark" min-width="120" show-overflow-tooltip />
      <el-table-column label="操作" align="center" width="120" fixed="right">
        <template #default="scope">
          <el-button v-if="!scope.row.projectCode" link type="primary" @click="handleEdit(scope.row)" v-hasPermi="['project:contractSettlement:edit']">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑弹窗 -->
    <el-dialog :title="'合同结算「' + editForm.contractName + '」'" v-model="dialogVisible" width="700px" destroy-on-close>
      <el-form ref="formRef" :model="editForm" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="已到账" prop="receivedAmount">
              <el-input-number v-model="editForm.receivedAmount" :min="0" :precision="2" style="width: 100%" controls-position="right" placeholder="请输入" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同期限" prop="contractPeriod">
              <el-input v-model="editForm.contractPeriod" placeholder="如：12个月" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="支付条件" prop="paymentTerms">
              <el-input v-model="editForm.paymentTerms" placeholder="请输入支付条件" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="editForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 合同单价明细弹窗 -->
    <el-dialog :title="'合同单价明细「' + currentContractName + '」'" v-model="priceDialogVisible" width="500px" destroy-on-close>
      <el-table :data="priceData" border stripe size="small">
        <el-table-column label="测绘项目" prop="categoryName" />
        <el-table-column label="合同单价" prop="price" align="right">
          <template #default="scope">
            {{ scope.row.price != null ? scope.row.price : '—' }}
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="priceDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ContractSettlement">
import { ref, reactive, onMounted } from 'vue'
import { treeListContractSettlement, getPriceDetail, saveContractSettlement } from '@/api/project/contractSettlement'
import { ElMessage, ElMessageBox } from 'element-plus'

const showSearch = ref(true)
const loading = ref(false)
const tableData = ref([])
const allData = ref([])

const queryParams = reactive({
  contractName: '',
  contractNo: ''
})

// 编辑弹窗
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const editForm = reactive({
  contractId: null,
  contractName: '',
  receivedAmount: null,
  contractPeriod: '',
  paymentTerms: '',
  remark: ''
})
const rules = {}

// 单价明细弹窗
const priceDialogVisible = ref(false)
const currentContractName = ref('')
const priceData = ref([])

/** 查询列表 */
async function getList() {
  loading.value = true
  try {
    const res = await treeListContractSettlement()
    allData.value = res.data || []
    tableData.value = filterTable(allData.value)
  } finally {
    loading.value = false
  }
}

/** 前端筛选 */
function filterTable(data) {
  let result = data
  if (queryParams.contractName) {
    result = result.filter(c => c.contractName && c.contractName.includes(queryParams.contractName))
  }
  if (queryParams.contractNo) {
    result = result.filter(c => c.contractNo && c.contractNo.includes(queryParams.contractNo))
  }
  return result
}

/** 搜索 */
function handleQuery() {
  tableData.value = filterTable(allData.value)
}

/** 重置 */
function resetQuery() {
  queryParams.contractName = ''
  queryParams.contractNo = ''
  tableData.value = filterTable(allData.value)
}

/** 编辑 */
function handleEdit(row) {
  editForm.contractId = row.contractId
  editForm.contractName = row.contractName
  editForm.receivedAmount = row.receivedAmount
  editForm.contractPeriod = row.contractPeriod || ''
  editForm.paymentTerms = row.paymentTerms || ''
  editForm.remark = row.remark || ''
  dialogVisible.value = true
}

/** 提交 */
async function submitForm() {
  submitting.value = true
  try {
    await saveContractSettlement({
      contractId: editForm.contractId,
      receivedAmount: editForm.receivedAmount,
      contractPeriod: editForm.contractPeriod,
      paymentTerms: editForm.paymentTerms,
      remark: editForm.remark
    })
    ElMessage.success('保存成功')
    dialogVisible.value = false
    getList()
  } finally {
    submitting.value = false
  }
}

/** 打开单价明细弹窗 */
async function openPriceDetail(row) {
  currentContractName.value = row.contractName
  try {
    const res = await getPriceDetail(row.contractId)
    priceData.value = res.data || []
  } catch {
    priceData.value = []
  }
  priceDialogVisible.value = true
}

/** 导出 */
function handleExport() {
  ElMessage.info('导出功能开发中')
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.text-success {
  color: #67c23a;
}
.font-medium {
  font-weight: 600;
}
</style>
