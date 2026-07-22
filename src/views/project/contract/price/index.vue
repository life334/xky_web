<template>
  <div class="app-container">
    <!-- 合同选择 -->
    <el-card class="mb8">
      <el-form :inline="true" :model="queryForm" size="default">
        <el-form-item label="选择合同">
          <el-select
            v-model="queryForm.contractId"
            placeholder="请选择合同"
            filterable
            clearable
            style="width: 320px"
            @change="handleContractChange"
          >
            <el-option
              v-for="item in contractOptions"
              :key="item.id"
              :label="item.contractNo + ' — ' + item.contractName"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 单价表格 -->
    <el-card v-if="queryForm.contractId">
      <div slot="header">
        <span>合同单价配置</span>
        <span style="color: #909399; font-size: 13px; margin-left: 12px;">
          仅小类（二级）需要填写单价
        </span>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="categoryId"
        :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
        border
        stripe
        size="default"
        default-expand-all
      >
        <el-table-column prop="categoryName" label="项目类别" min-width="200" />
        <el-table-column prop="categoryLevel" label="层级" width="70" align="center">
          <template slot-scope="scope">
            <el-tag :type="scope.row.categoryLevel === 1 ? '' : 'info'" size="small" disable-transitions>
              {{ scope.row.categoryLevel === 1 ? '大类' : '小类' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dictInternalPrice" label="字典内部单价" width="130" align="right">
          <template slot-scope="scope">
            <span v-if="scope.row.categoryLevel === 2">{{ scope.row.dictInternalPrice }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="dictExternalPrice" label="字典外部单价" width="130" align="right">
          <template slot-scope="scope">
            <span v-if="scope.row.categoryLevel === 2">{{ scope.row.dictExternalPrice }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="合同单价" width="180" align="center">
          <template slot-scope="scope">
            <template v-if="scope.row.categoryLevel === 2">
              <el-input-number
                v-model="scope.row.price"
                :min="0"
                :precision="2"
                :step="10"
                size="small"
                style="width: 150px"
                placeholder="请输入单价"
                controls-position="right"
              />
            </template>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div style="text-align: center; margin-top: 20px;">
        <el-button
          type="primary"
          icon="el-icon-check"
          :loading="saving"
          @click="handleSave"
        >
          保 存
        </el-button>
      </div>
    </el-card>

    <!-- 未选择合同的提示 -->
    <el-empty v-else description="请先选择一个合同" />
  </div>
</template>

<script setup name="ContractPrice">
import { ref, reactive } from 'vue'
import { listContractPrice, saveContractPrice } from '@/api/project/contractPrice'
import { listContract } from '@/api/project/contract'

const loading = ref(false)
const saving = ref(false)
const contractOptions = ref([])
const tableData = ref([])

const queryForm = reactive({
  contractId: null
})

/** 加载合同下拉选项 */
function loadContractOptions() {
  listContract({ pageNum: 1, pageSize: 999 }).then(res => {
    contractOptions.value = res.rows || []
  })
}

/** 切换合同 → 加载类别树+已填单价 */
function handleContractChange(contractId) {
  if (!contractId) {
    tableData.value = []
    return
  }
  loading.value = true
  listContractPrice(contractId).then(res => {
    const flatList = res.data || []
    // 转为树形（大类包小类）
    tableData.value = buildTree(flatList)
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

/** 扁平列表 → 树形结构 */
function buildTree(list) {
  const map = {}
  const roots = []

  list.forEach(item => {
    map[item.categoryId] = { ...item, children: [] }
  })

  list.forEach(item => {
    const node = map[item.categoryId]
    if (item.parentId && map[item.parentId]) {
      map[item.parentId].children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

/** 保存 */
function handleSave() {
  if (!queryForm.contractId) return

  // 收集所有小类的单价数据
  const priceList = []
  tableData.value.forEach(group => {
    ;(group.children || []).forEach(child => {
      priceList.push({
        id: child.id || null,
        contractId: queryForm.contractId,
        categoryId: child.categoryId,
        price: child.price
      })
    })
  })

  saving.value = true
  saveContractPrice(priceList).then(() => {
    this.$modal.msgSuccess('保存成功')
    // 刷新
    handleContractChange(queryForm.contractId)
    saving.value = false
  }).catch(() => {
    saving.value = false
  })
}

// 初始化加载合同列表
loadContractOptions()
</script>
