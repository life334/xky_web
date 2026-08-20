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
          仅展示外部计费方式，按计费类别填写合同单价
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
        <el-table-column prop="categoryName" label="项目类别 / 计费类别" min-width="220">
          <template slot-scope="scope">
            <span v-if="scope.row.categoryLevel === 1" style="font-weight: 600;">{{ scope.row.categoryName }}</span>
            <span v-else-if="scope.row.categoryLevel === 2" style="padding-left: 12px;">{{ scope.row.categoryName }}</span>
            <span v-else style="padding-left: 28px; color: #606266;">{{ scope.row.billingCategory }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="categoryLevel" label="层级" width="70" align="center">
          <template slot-scope="scope">
            <el-tag v-if="scope.row.categoryLevel === 1" type="" size="small" disable-transitions>大类</el-tag>
            <el-tag v-else-if="scope.row.categoryLevel === 2" type="info" size="small" disable-transitions>小类</el-tag>
            <el-tag v-else type="warning" size="small" disable-transitions>计费</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dictUnitPrice" label="字典单价" width="120" align="right">
          <template slot-scope="scope">
            <span v-if="scope.row.billingId">{{ scope.row.dictUnitPrice }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="priceUnit" label="计价单位" width="120" align="center">
          <template slot-scope="scope">
            <span v-if="scope.row.billingId">{{ scope.row.priceUnit }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="minQuantity" label="起步量" width="100" align="right">
          <template slot-scope="scope">
            <span v-if="scope.row.billingId">{{ scope.row.minQuantity }}</span>
            <span v-else style="color: #c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="合同单价" width="180" align="center">
          <template slot-scope="scope">
            <template v-if="scope.row.billingId">
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
import { ref, reactive, getCurrentInstance } from 'vue'
import { listContractPrice, saveContractPrice } from '@/api/project/contractPrice'
import { listContract } from '@/api/project/contract'

const { proxy } = getCurrentInstance()
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
    tableData.value = buildTree(flatList)
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

/** 扁平列表 → 三层树形结构（大类 → 小类 → 计费方式明细行） */
function buildTree(list) {
  const map = {}
  const roots = []

  // 第一遍：按 categoryId 和 billingId 建立节点
  list.forEach(item => {
    const cid = item.categoryId
    const bid = item.billingId

    if (bid) {
      // 计费方式明细行：归到所属小类的 children 下
      if (!map[cid]) map[cid] = { ...item, categoryId: cid, children: [] }
      const billingNode = {
        ...item,
        categoryId: 'billing_' + bid,
        billingId: bid,
        categoryName: item.billingCategory,
        categoryLevel: 3,
        children: []
      }
      map[cid].children.push(billingNode)
    } else {
      // 类别行（大类或小类）
      if (!map[cid]) {
        map[cid] = { ...item, children: [] }
      } else {
        // 已有占位节点，补充类别信息
        Object.assign(map[cid], item)
      }
    }
  })

  // 第二遍：大类 → 小类 挂载
  list.forEach(item => {
    const cid = item.categoryId
    const node = map[cid]
    if (!node) return
    if (item.parentId && map[item.parentId]) {
      // 避免重复添加
      if (!map[item.parentId].children.find(c => c.categoryId === cid)) {
        map[item.parentId].children.push(node)
      }
    } else if (!roots.find(r => r.categoryId === cid)) {
      roots.push(node)
    }
  })

  return roots
}

/** 保存 */
function handleSave() {
  if (!queryForm.contractId) return

  // 收集所有计费方式明细行的单价数据
  const priceList = []
  tableData.value.forEach(group => {
    ;(group.children || []).forEach(child => {
      ;(child.children || []).forEach(billing => {
        if (billing.billingId) {
          priceList.push({
            id: billing.id || null,
            contractId: queryForm.contractId,
            categoryId: child.categoryId,
            billingId: billing.billingId,
            price: billing.price
          })
        }
      })
    })
  })

  saving.value = true
  saveContractPrice(priceList).then(() => {
    proxy.$modal.msgSuccess('保存成功')
    handleContractChange(queryForm.contractId)
    saving.value = false
  }).catch(() => {
    saving.value = false
  })
}

// 初始化加载合同列表
loadContractOptions()
</script>
