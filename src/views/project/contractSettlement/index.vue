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
        <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:contractSettlement:export']">导出</el-button>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <!-- 扁平表格 -->
    <el-table
      v-loading="loading"
      :data="flatTableData"
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
          {{ scope.row.contractAmount ? formatAmount(scope.row.contractAmount) : '' }}
        </template>
      </el-table-column>

      <!-- ===== 智能价格胶囊（含大类层级） ===== -->
      <el-table-column label="合同单价" min-width="175" align="center">
        <template #default="scope">
          <el-popover
            v-if="scope.row._priceItems && scope.row._priceItems.length"
            placement="bottom"
            :width="300"
            trigger="hover"
            :show-after="300"
            popper-class="price-popover"
          >
            <template #reference>
              <div class="price-capsule" @click.stop="openPriceCard(scope.row)">
                <span class="capsule-icon">◆</span>
                <span class="capsule-count">{{ scope.row._priceItems.length }}项</span>
                <span class="capsule-range" v-if="scope.row._priceMin != null && scope.row._priceMax != null">
                  &nbsp;· ¥{{ scope.row._priceMin }}~{{ scope.row._priceMax }}
                </span>
                <span class="capsule-arrow">▸</span>
              </div>
            </template>
            <!-- 悬浮预览：按大类分组 -->
            <div class="popover-price-list">
              <template v-for="(group, gIdx) in scope.row._priceGroups" :key="gIdx">
                <div v-if="group.parent" class="popover-parent-label">
                  <span class="popover-parent-icon">📁</span> {{ group.parent }}
                </div>
                <div
                  v-for="(item, idx) in group.items"
                  :key="idx"
                  class="popover-price-row"
                  :class="{ 'popover-price-child': group.parent }"
                >
                  <span class="popover-cat">{{ item.name }}</span>
                  <span class="popover-price" :class="{ 'text-muted': item.price == null }">
                    {{ item.price != null ? '¥' + item.price : '未设' }}
                  </span>
                </div>
              </template>
            </div>
          </el-popover>
          <span v-else></span>
        </template>
      </el-table-column>

      <el-table-column label="签署日期" prop="signDate" min-width="110" align="center" />

      <!-- ===== 到账状态指示器（无 emoji 进度条式） ===== -->
      <el-table-column label="已到账" min-width="190" align="center">
        <template #default="scope">
          <div
            v-if="scope.row.contractAmount && scope.row.contractAmount > 0"
            class="payment-card"
            :class="'payment-card--' + scope.row._paymentStatus"
            @click.stop="openReceivedDetail(scope.row)"
          >
            <!-- 进度条 + 百分比 -->
            <div class="payment-card-bar-wrap">
              <div class="payment-card-bar">
                <div
                  class="payment-card-fill"
                  :class="'payment-card-fill--' + scope.row._paymentStatus"
                  :style="{ width: scope.row._paymentPercent + '%' }"
                />
              </div>
              <span class="payment-card-pct" :class="'pct--' + scope.row._paymentStatus">
                {{ scope.row._paymentPercent }}%
              </span>
            </div>
            <!-- 金额行 -->
            <div class="payment-card-amounts">
              <span class="payment-card-label">{{ scope.row._paymentStatus === 'full' ? '已全额到账' : scope.row._paymentStatus === 'partial' ? '部分到账' : '未到账' }}</span>
              <span class="payment-card-detail" v-if="scope.row._paymentStatus === 'partial'">
                ¥{{ formatAmount(scope.row.receivedAmount) }} / ¥{{ formatAmount(scope.row.contractAmount) }}
              </span>
              <span class="payment-card-detail" v-else-if="scope.row._paymentStatus === 'full'">
                ¥{{ formatAmount(scope.row.contractAmount) }}
              </span>
            </div>
          </div>
          <div v-else-if="scope.row.contractAmount != null && scope.row.contractAmount === 0" class="payment-card payment-card--zero">
            <span class="payment-card-zero-text">合同金额为 0</span>
          </div>
          <span v-else></span>
        </template>
      </el-table-column>

      <el-table-column label="是否结算" prop="isSettled" min-width="90" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.isSettled === '1'" type="success" size="small">已结算</el-tag>
          <el-tag v-else type="info" size="small">未结算</el-tag>
        </template>
      </el-table-column>

      <!-- ===== 关联项目列 ===== -->
      <el-table-column label="关联项目" min-width="150" align="center">
        <template #default="scope">
          <div
            v-if="scope.row._projectCodes && scope.row._projectCodes.length"
            class="project-codes"
            @click.stop="openProjectList(scope.row)"
          >
            <template v-if="scope.row._projectCodes.length <= 2">
              <el-tag
                v-for="code in scope.row._projectCodes"
                :key="code"
                size="small"
                type="primary"
                class="project-code-tag"
              >{{ code }}</el-tag>
            </template>
            <template v-else>
              <el-tag size="small" type="primary" class="project-code-tag">{{ scope.row._projectCodes[0] }}</el-tag>
              <el-tag size="small" type="primary" class="project-code-tag">{{ scope.row._projectCodes[1] }}</el-tag>
              <span class="project-code-more">+{{ scope.row._projectCodes.length - 2 }}</span>
            </template>
          </div>
          <span v-else></span>
        </template>
      </el-table-column>

      <el-table-column label="操作" align="center" width="100" fixed="right">
        <template #default="scope">
          <el-button link type="primary" size="small" @click="handleEdit(scope.row)" v-hasPermi="['project:contractSettlement:edit']">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ==================== 弹窗区 ==================== -->

    <!-- 编辑弹窗 -->
    <el-dialog :title="'合同结算「' + editForm.contractName + '」'" :model-value="dialogVisible" @update:model-value="dialogVisible = $event" width="80%" destroy-on-close>
      <el-form ref="formRef" :model="editForm" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="已到账">
              <el-input :model-value="formatMoney(editForm.receivedAmount)" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否结算" prop="isSettled">
              <el-switch v-model="editForm.isSettled" active-value="1" inactive-value="0" />
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

    <!-- 合同单价卡片墙弹窗（按大类分组） -->
    <el-dialog :title="'合同单价 — ' + priceDialogTitle" :model-value="priceCardVisible" @update:model-value="priceCardVisible = $event" width="80%" destroy-on-close>
      <div v-if="priceCardGroups && priceCardGroups.length" class="price-card-container">
        <div v-for="(group, gIdx) in priceCardGroups" :key="gIdx" class="price-group-section">
          <!-- 大类标题 -->
          <div v-if="group.parent" class="price-group-header">
            <span class="price-group-header-icon">📁</span>
            <span>{{ group.parent }}</span>
          </div>
          <!-- 卡片网格 -->
          <div class="price-card-wall">
            <div v-for="(item, idx) in group.items" :key="idx" class="price-card-item">
              <div class="price-card-icon" :style="{ background: gradientColor(globalItemIdx(priceCardGroups, gIdx, idx), totalCardCount) }">
                <span>{{ item.name ? item.name.charAt(0) : '?' }}</span>
              </div>
              <div class="price-card-body">
                <div class="price-card-name">{{ item.name || '' }}</div>
                <div class="price-card-value" :class="{ 'text-muted': item.price == null }">
                  {{ item.price != null ? '¥' + item.price : '未设置' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无单价数据" />
      <template #footer>
        <el-button @click="priceCardVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 到账明细弹窗 -->
    <el-dialog :title="'到账明细 — ' + receivedDialogTitle" :model-value="receivedDialogVisible" @update:model-value="receivedDialogVisible = $event" width="80%" destroy-on-close>
      <div v-loading="receivedLoading">
        <!-- 汇总横幅 -->
        <div class="received-summary" v-if="receivedSummary">
          <div class="summary-item">
            <span class="summary-label">合同总额</span>
            <span class="summary-value">¥{{ formatAmount(receivedSummary.contractAmount) }}</span>
          </div>
          <div class="summary-divider" />
          <div class="summary-item">
            <span class="summary-label">已到账</span>
            <span class="summary-value highlight">¥{{ formatAmount(receivedSummary.receivedAmount) }}</span>
          </div>
          <div class="summary-divider" />
          <div class="summary-item">
            <span class="summary-label">到账率</span>
            <span class="summary-value" :class="receivedSummary.percent >= 100 ? 'text-success' : 'text-warning'">
              {{ receivedSummary.percent }}%
            </span>
          </div>
        </div>

        <!-- 明细表格 -->
        <el-table :data="receivedDetailData" border stripe size="small" style="margin-top: 16px" max-height="360">
          <el-table-column label="工程编号" prop="project_code" min-width="130" />
          <el-table-column label="工程项目" prop="engineering_project" min-width="140"/>
          <el-table-column label="委托单位" prop="client_unit" min-width="130" />
          <el-table-column label="预付款" prop="advance_amount" min-width="100" align="right">
            <template #default="scope">{{ fmtPay(scope.row.advance_amount) }}</template>
          </el-table-column>
          <el-table-column label="尾款" prop="final_amount" min-width="100" align="right">
            <template #default="scope">{{ fmtPay(scope.row.final_amount) }}</template>
          </el-table-column>
          <el-table-column label="小计" prop="total_received" min-width="100" align="right">
            <template #default="scope">
              <span :class="{ 'text-success font-bold': scope.row.total_received > 0 }">
                ¥{{ formatAmount(scope.row.total_received) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!receivedLoading && (!receivedDetailData || !receivedDetailData.length)" description="暂无到账记录" />
      </div>
      <template #footer>
        <el-button @click="receivedDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 关联项目列表弹窗 -->
    <el-dialog :title="'关联项目 — ' + projectDialogTitle" :model-value="projectDialogVisible" @update:model-value="projectDialogVisible = $event" width="80%" destroy-on-close>
      <el-table :data="projectDialogData" border stripe size="small" max-height="400">
        <el-table-column label="工程编号" prop="projectCode" min-width="140" show-overflow-tooltip="false" />
        <el-table-column label="委托单位" prop="clientUnit" min-width="160" show-overflow-tooltip="false" />
        <el-table-column label="联系人" prop="contactName" min-width="100" show-overflow-tooltip="false" />
        <el-table-column label="联系电话" prop="contactPhone" min-width="130" show-overflow-tooltip="false" />
        <el-table-column label="工程项目" prop="engineeringProject" min-width="180" show-overflow-tooltip="false" />
        <el-table-column label="工程地点" prop="projectLocation" min-width="160" show-overflow-tooltip="false" />
        <el-table-column label="状态" prop="status" min-width="90" show-overflow-tooltip="false">
          <template #default="scope">
            <dict-tag v-if="scope.row.status" :options="d('proj_project_status')" :value="scope.row.status" />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="projectDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="ContractSettlement">
import { ref, reactive, onMounted, computed, unref } from 'vue'
import { treeListContractSettlement, getPriceDetail, getReceivedDetail, saveContractSettlement } from '@/api/project/contractSettlement'
import { ElMessage } from 'element-plus'

const dicts = useDict('proj_project_status')
function d(key) {
  const src = unref(dicts) || {}
  return unref(src[key]) || []
}

const showSearch = ref(true)
const loading = ref(false)
const allContractNodes = ref([])

// ===== 扁平表格数据 =====
const flatTableData = computed(() => {
  let nodes = allContractNodes.value
  if (queryParams.contractName) {
    nodes = nodes.filter(c => c.contractName && c.contractName.includes(queryParams.contractName))
  }
  if (queryParams.contractNo) {
    nodes = nodes.filter(c => c.contractNo && c.contractNo.includes(queryParams.contractNo))
  }
  return nodes.map(flattenNode)
})

const queryParams = reactive({
  contractName: '',
  contractNo: ''
})

// ===== 编辑弹窗 =====
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref(null)
const editForm = reactive({
  contractId: null,
  contractName: '',
  receivedAmount: null,
  isSettled: '0',
  contractPeriod: '',
  paymentTerms: '',
  remark: ''
})
const rules = {}

// ===== 单价卡片弹窗 =====
const priceCardVisible = ref(false)
const priceDialogTitle = ref('')
const priceCardGroups = ref([])
const totalCardCount = ref(0)

// ===== 到账明细弹窗 =====
const receivedDialogVisible = ref(false)
const receivedDialogTitle = ref('')
const receivedDetailData = ref([])
const receivedLoading = ref(false)

// ===== 关联项目弹窗 =====
const projectDialogVisible = ref(false)
const projectDialogTitle = ref('')
const projectDialogData = ref([])

// ===== 辅助函数 =====

/** 将树形节点扁平化，聚合子节点信息 */
function flattenNode(node) {
  const children = node.children || []
  const priceItems = parsePriceItems(node.priceDetail || [])
  const contractAmount = node.contractAmount ? Number(node.contractAmount) : 0
  const receivedAmount = node.receivedAmount != null ? Number(node.receivedAmount) : 0

  // 计算单价区间
  let priceMin = null
  let priceMax = null
  if (priceItems.length) {
    const prices = priceItems.map(p => p.price).filter(p => p != null)
    if (prices.length) {
      priceMin = Math.min(...prices)
      priceMax = Math.max(...prices)
    }
  }

  // 到账状态
  let paymentStatus, paymentPercent
  if (contractAmount > 0) {
    if (receivedAmount >= contractAmount) {
      paymentStatus = 'full'
      paymentPercent = 100
    } else if (receivedAmount > 0) {
      paymentStatus = 'partial'
      paymentPercent = Math.round(receivedAmount * 100 / contractAmount)
    } else {
      paymentStatus = 'none'
      paymentPercent = 0
    }
  } else {
    paymentStatus = 'none'
    paymentPercent = 0
  }

  // 按大类分组（供悬浮预览用）
  const priceGroups = groupByParent(priceItems)

  return {
    ...node,
    _priceItems: priceItems,
    _priceMin: priceMin,
    _priceMax: priceMax,
    _priceGroups: priceGroups,
    _paymentStatus: paymentStatus,
    _paymentPercent: paymentPercent,
    _projectCodes: children.map(c => c.projectCode).filter(Boolean),
    _children: children
  }
}

/** 从 priceDetail Set 解析出 [{parent, name, price}]，支持 "大类 > 小类 价格" 格式 */
function parsePriceItems(detailSet) {
  if (!detailSet || !Array.isArray(detailSet)) return []
  return detailSet
    .map(s => {
      if (typeof s !== 'string') return null
      const lastSpace = s.lastIndexOf(' ')
      if (lastSpace === -1) return { parent: null, name: s, price: null }
      const fullName = s.substring(0, lastSpace)
      const priceStr = s.substring(lastSpace + 1)
      const price = priceStr ? Number(priceStr) : null
      const gtIdx = fullName.indexOf(' > ')
      if (gtIdx !== -1) {
        return {
          parent: fullName.substring(0, gtIdx),
          name: fullName.substring(gtIdx + 3),
          price: isNaN(price) ? null : price
        }
      }
      return { parent: null, name: fullName, price: isNaN(price) ? null : price }
    })
    .filter(Boolean)
}

/** 按 parent 分组 [{parent, items:[{name,price}]}] */
function groupByParent(items) {
  if (!items || !items.length) return []
  const map = {}
  const order = []
  items.forEach(item => {
    const key = item.parent || '__root__'
    if (!map[key]) {
      map[key] = { parent: key === '__root__' ? null : key, items: [] }
      order.push(key)
    }
    map[key].items.push(item)
  })
  return order.map(k => map[k])
}

/** 全局卡片序号 */
function globalItemIdx(groups, gIdx, idx) {
  let count = 0
  for (let i = 0; i < gIdx; i++) {
    count += groups[i].items.length
  }
  return count + idx
}

/** 颜色渐变 */
function gradientColor(idx, total) {
  const colors = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)'
  ]
  return colors[idx % colors.length]
}

// 到账明细汇总
const receivedSummary = computed(() => {
  if (!receivedDetailData.value || !receivedDetailData.value.length) return null
  const total = receivedDetailData.value.reduce((s, r) => s + (Number(r.total_received) || 0), 0)
  const ca = receivedDetailData.value.length > 0 ? receivedDialogContractAmount : 0
  const pct = ca > 0 ? Math.round(total * 100 / ca) : 0
  return {
    contractAmount: ca,
    receivedAmount: total,
    percent: pct
  }
})
let receivedDialogContractAmount = 0

// ===== 列表查询 =====
async function getList() {
  loading.value = true
  try {
    const res = await treeListContractSettlement()
    allContractNodes.value = res.data || []
  } finally {
    loading.value = false
  }
}

function handleQuery() {}
function resetQuery() {
  queryParams.contractName = ''
  queryParams.contractNo = ''
}

// ===== 编辑 =====
function handleEdit(row) {
  editForm.contractId = row.contractId
  editForm.contractName = row.contractName
  editForm.receivedAmount = row.receivedAmount
  editForm.isSettled = row.isSettled || '0'
  editForm.contractPeriod = row.contractPeriod || ''
  editForm.paymentTerms = row.paymentTerms || ''
  editForm.remark = row.remark || ''
  dialogVisible.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    await saveContractSettlement({
      contractId: editForm.contractId,
      isSettled: editForm.isSettled,
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

// ===== 单价卡片弹窗（按大类分组） =====
async function openPriceCard(row) {
  priceDialogTitle.value = row.contractName
  priceCardGroups.value = []
  totalCardCount.value = 0
  priceCardVisible.value = true
  try {
    const res = await getPriceDetail(row.contractId)
    const items = (res.data || []).map(item => ({
      parent: item.parent_name || null,
      name: item.category_name || item.name || '',
      price: item.price != null ? item.price : null
    }))
    priceCardGroups.value = groupByParent(items)
    totalCardCount.value = items.length
  } catch {
    priceCardGroups.value = []
    totalCardCount.value = 0
  }
}

// ===== 到账明细弹窗 =====
async function openReceivedDetail(row) {
  receivedDialogTitle.value = row.contractName
  receivedDialogContractAmount = row.contractAmount ? Number(row.contractAmount) : 0
  receivedDetailData.value = []
  receivedDialogVisible.value = true
  receivedLoading.value = true
  try {
    const res = await getReceivedDetail(row.contractId)
    receivedDetailData.value = res.data || []
  } catch {
    receivedDetailData.value = []
  } finally {
    receivedLoading.value = false
  }
}

// ===== 关联项目弹窗 =====
function openProjectList(row) {
  projectDialogTitle.value = row.contractName
  projectDialogData.value = row._children || []
  projectDialogVisible.value = true
}

// ===== 导出 =====
function handleExport() {
  ElMessage.info('导出功能开发中')
}

// ===== 金额格式化 =====
function formatAmount(val) {
  if (val == null || val === 0) return '0'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMoney(val) {
  if (val == null || val === 0) return ''
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtPay(val) {
  const n = Number(val) || 0
  if (n === 0) return ''
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
/* ===== 智能价格胶囊 ===== */
.price-capsule {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #ecf5ff, #d9ecff);
  border: 1px solid #a0cfff;
  border-radius: 20px;
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  white-space: nowrap;
}
.price-capsule:hover {
  background: linear-gradient(135deg, #d9ecff, #c6e2ff);
  border-color: #79bbff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25);
  transform: translateY(-1px);
}
.capsule-icon {
  color: #409eff;
  font-size: 10px;
}
.capsule-count {
  color: #409eff;
  font-weight: 700;
}
.capsule-range {
  color: #606266;
  font-size: 12px;
}
.capsule-arrow {
  color: #a0cfff;
  font-size: 11px;
  margin-left: 2px;
}

/* ===== 悬浮预览 popover 内样式 ===== */
.popover-price-list {
  padding: 4px 0;
}
.popover-parent-label {
  font-size: 12px;
  font-weight: 600;
  color: #409eff;
  padding: 8px 0 4px 0;
  border-bottom: 1px dashed #e4e7ed;
  margin-bottom: 2px;
}
.popover-parent-label:first-child {
  padding-top: 0;
}
.popover-parent-icon {
  font-size: 14px;
  margin-right: 2px;
}
.popover-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px solid #f2f3f5;
  font-size: 13px;
}
.popover-price-row:last-child {
  border-bottom: none;
}
.popover-price-child {
  padding-left: 12px;
}
.popover-cat { color: #606266; }
.popover-price { color: #303133; font-weight: 600; }

/* ===== 到账卡片（无 emoji，进度条式） ===== */
.payment-card {
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  position: relative;
}
.payment-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.payment-card--full {
  background: #f6fef6;
  border: 1px solid #d9f0d9;
}
.payment-card--partial {
  background: #fefcf5;
  border: 1px solid #f5e6c0;
}
.payment-card--none {
  background: #f9fafb;
  border: 1px solid #e4e7ed;
}
.payment-card--zero {
  background: #f9fafb;
  border: 1px solid #e4e7ed;
  cursor: default;
  padding: 6px 12px;
}
.payment-card-zero-text {
  font-size: 12px;
  color: #c0c4cc;
}

/* 进度条行 */
.payment-card-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.payment-card-bar {
  flex: 1;
  height: 6px;
  background: #e8eaed;
  border-radius: 3px;
  overflow: hidden;
}
.payment-card-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.payment-card-fill--full {
  background: linear-gradient(90deg, #52c41a, #73d13d);
}
.payment-card-fill--partial {
  background: linear-gradient(90deg, #fa8c16, #ffc53d);
}
.payment-card-fill--none {
  background: #d9d9d9;
}

.payment-card-pct {
  font-size: 12px;
  font-weight: 700;
  min-width: 34px;
  text-align: right;
}
.pct--full {
  color: #52c41a;
}
.pct--partial {
  color: #fa8c16;
}
.pct--none {
  color: #bfbfbf;
}

/* 金额信息行 */
.payment-card-amounts {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
}
.payment-card-label {
  color: #595959;
  font-weight: 500;
}
.payment-card-detail {
  color: #8c8c8c;
  margin-left: auto;
}

/* ===== 关联项目标签 ===== */
.project-codes {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 0;
}
.project-codes:hover {
  opacity: 0.85;
}
.project-code-tag {
  margin: 0;
}
.project-code-more {
  font-size: 12px;
  color: #409eff;
  padding: 0 4px;
  font-weight: 600;
}

/* ===== 单价卡片墙（按大类分组） ===== */
.price-card-container {
  max-height: 480px;
  overflow-y: auto;
}
.price-group-section {
  margin-bottom: 16px;
}
.price-group-section:last-child {
  margin-bottom: 0;
}
.price-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
  padding: 4px 0 8px 0;
  border-bottom: 1px dashed #d9ecff;
  margin-bottom: 10px;
}
.price-group-header-icon {
  font-size: 16px;
}
.price-card-wall {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
}
.price-card-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 14px 16px;
  transition: all 0.2s ease;
}
.price-card-item:hover {
  border-color: #c6e2ff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}
.price-card-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}
.price-card-body {
  flex: 1;
  min-width: 0;
}
.price-card-name {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.price-card-value {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
  margin-top: 2px;
}

/* ===== 到账明细横幅 ===== */
.received-summary {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: linear-gradient(135deg, #f5f7fa, #ebeef5);
  border-radius: 12px;
  padding: 18px 10px;
}
.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.summary-label {
  font-size: 12px;
  color: #909399;
}
.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}
.summary-value.highlight {
  color: #409eff;
}
.summary-divider {
  width: 1px;
  height: 36px;
  background: #dcdfe6;
}

/* ===== 通用 ===== */
.text-muted { color: #c0c4cc; }
.text-success { color: #67c23a; }
.text-warning { color: #e6a23c; }
.font-bold { font-weight: 700; }
</style>

<style>
/* 非 scoped — popover 全局样式 */
.price-popover {
  padding: 8px 14px !important;
}
</style>
