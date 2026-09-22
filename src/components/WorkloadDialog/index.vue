<template>
   <!-- 工作量明细弹窗（费用结算页 / 回款页共用）：外部按记录分栏 + 内部按负责人分栏 -->
   <el-dialog
      :model-value="modelValue"
      @update:model-value="onVisibleChange"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      class="scrollbar"
      width="80%"
      draggable
      :title="projectCode"
   >
      <el-form v-loading="workloadLoading" element-loading-text="数据加载中..." element-loading-background="rgba(255, 255, 255, 0.7)" :model="workloadForm" label-width="90px">
         <!-- 外部工作量区（不按人录入，直接按项目类别录入） -->
         <el-divider content-position="left">
            <span class="section-title-external">外部工作量</span>
            <span class="section-output-mini">产值合计：{{ formatMoney(externalOutputTotal) }}</span>
         </el-divider>

         <div class="leader-card">
            <div style="padding: 10px 12px 0; display: flex; justify-content: flex-end">
               <el-button v-if="false" type="primary" size="small" icon="Plus" plain @click="addExternalRecord">新增记录</el-button>
            </div>

            <!-- 外部按记录分栏：每条记录一个子卡片 -->
            <div v-for="rec in externalRecords" :key="'ext-' + rec.subItemNo" class="record-card">
               <div v-if="externalRecords.length > 1" class="record-card-header">
                  <span class="record-name">第 {{ rec.subItemNo }} 条</span>
               </div>

               <!-- 外部快速录入栏（归属该记录） -->
               <div class="quick-add-bar">
                  <span class="qa-label">项目类别</span>
                  <el-select v-model="rec.quickExternalCat" placeholder="选择项目类别" style="width: 220px" @change="(val) => onQuickCatChange(val, rec, 'external')">
                     <el-option v-for="o in externalBillingOptions(rec.subItemNo)" :key="o.value" :label="o.label" :value="o.value" />
                  </el-select>
                  <span class="qa-label">工作量</span>
                  <el-input-number v-model="rec.quickExternalWorkload" :min="0" :precision="2" controls-position="right" style="width: 130px" :disabled="!rec.quickExternalCat" @keyup.enter="quickAddWorkload(rec, 'external')" />
                  <span class="qa-label">单价</span>
                  <el-input-number v-model="rec.quickExternalPrice" :min="0" :precision="2" controls-position="right" style="width: 120px" :disabled="!rec.quickExternalCat" />
                  <span class="qa-unit" v-if="rec.quickExternalUnit">{{ rec.quickExternalUnit }}</span>
                  <el-button type="primary" size="small" icon="Plus" :disabled="!rec.quickExternalCat || rec.quickExternalWorkload == null" @click="quickAddWorkload(rec, 'external')">添加</el-button>
               </div>

               <!-- 该记录外部已录入行 -->
               <el-table :data="externalRowsBySub(rec.subItemNo)" border size="small" :row-class-name="() => 'wl-row-external'">
                  <el-table-column label="项目类别" prop="billingCategory" align="center" min-width="120" />
                  <el-table-column label="工作量" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.workload" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="calcRow(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="单价" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.unitPrice" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="onUnitPriceChange(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="单位" prop="priceUnit" align="center" width="70" />
                  <el-table-column label="产值" align="center" min-width="110">
                     <template #default="scope">
                        <span class="row-output">{{ scope.row.output != null ? formatMoney(scope.row.output) : '-' }}</span>
                        <div v-if="calcExpr(scope.row)" class="cell-sub calc-hint" style="display:none">{{ calcExpr(scope.row) }}</div>
                     </template>
                  </el-table-column>
                  <el-table-column label="操作" align="center" width="60">
                     <template #default="scope"><el-button link type="danger" icon="Delete" @click="removeWorkloadRowByIdx(scope.row, null, 'external')" /></template>
                  </el-table-column>
               </el-table>
            </div>
         </div>

         <!-- 内部工作量区 -->
         <el-divider content-position="left">
            <span class="section-title-internal">内部工作量</span>
            <span class="section-output-mini">产值合计：{{ formatMoney(internalOutputTotal) }}</span>
         </el-divider>

         <!-- 按负责人卡片，内部按记录分栏 -->
         <div v-for="leader in leaderList" :key="leader.userId" class="leader-card">
            <div class="leader-card-header">
               <span class="leader-name">{{ leader.nickName }}</span>
               <span class="leader-mini-total">内部：{{ formatMoney(leaderInternalOutput(leader.userId)) }}</span>
               <el-button type="primary" v-if="false" size="small" icon="Plus" plain style="margin-left: auto" @click="addInternalRecord(leader)">新增记录</el-button>
            </div>

            <!-- 按记录分栏：每条记录一个子卡片 -->
            <div v-for="rec in leader.records" :key="leader.userId + '-' + rec.subItemNo" class="record-card">
               <div v-if="leader.records.length > 1" class="record-card-header">
                  <span class="record-name">第 {{ rec.subItemNo }} 条</span>
               </div>

               <!-- 内部快速录入栏（归属该记录） -->
               <div class="quick-add-bar">
                  <span class="qa-label">项目类别</span>
                  <el-select v-model="rec.quickInternalCat" placeholder="选择项目类别" style="width: 220px" @change="(val) => onQuickCatChange(val, rec, 'internal')">
                     <el-option v-for="o in internalBillingOptions(rec.userId, rec.subItemNo)" :key="o.value" :label="o.label" :value="o.value" />
                  </el-select>
                  <span class="qa-label">工作量</span>
                  <el-input-number v-model="rec.quickInternalWorkload" :min="0" :precision="2" controls-position="right" style="width: 130px" :disabled="!rec.quickInternalCat" @keyup.enter="quickAddWorkload(rec, 'internal')" />
                  <span class="qa-label">单价</span>
                  <el-input-number v-model="rec.quickInternalPrice" :min="0" :precision="2" controls-position="right" style="width: 120px" :disabled="!rec.quickInternalCat" />
                  <span class="qa-unit" v-if="rec.quickInternalUnit">{{ rec.quickInternalUnit }}</span>
                  <el-button type="primary" size="small" icon="Plus" :disabled="!rec.quickInternalCat || rec.quickInternalWorkload == null" @click="quickAddWorkload(rec, 'internal')">添加</el-button>
               </div>

               <!-- 该记录内部已录入行 -->
               <el-table :data="internalRowsByUserAndSub(rec.userId, rec.subItemNo)" border size="small" :row-class-name="() => 'wl-row-internal'">
                  <el-table-column label="项目类别" prop="billingCategory" align="center" min-width="120" />
                  <el-table-column label="工作量" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.workload" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="calcRow(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="单价" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.unitPrice" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="onUnitPriceChange(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="单位" prop="priceUnit" align="center" width="70" />
                  <el-table-column label="产值" align="center" min-width="110">
                     <template #default="scope">
                        <span class="row-output">{{ scope.row.output != null ? formatMoney(scope.row.output) : '-' }}</span>
                        <div v-if="calcExpr(scope.row)" class="cell-sub calc-hint" style="display:none">{{ calcExpr(scope.row) }}</div>
                     </template>
                  </el-table-column>
                  <el-table-column label="操作" align="center" width="60">
                     <template #default="scope"><el-button link type="danger" icon="Delete" @click="removeWorkloadRowByIdx(scope.row, leader.userId, 'internal')" /></template>
                  </el-table-column>
               </el-table>
            </div>
         </div>

         <!-- 产值统计条 -->
         <div class="output-summary-bar">
            <span class="sum-inline sum-external"><i class="sum-dot" />外部产值<b>{{ formatMoney(externalOutputTotal) }}</b><small>{{ externalRowCount }} 行</small></span>
            <span class="sum-sep" />
            <span class="sum-inline sum-internal"><i class="sum-dot" />内部产值<b>{{ formatMoney(internalOutputTotal) }}</b><small>{{ internalRowCount }} 行</small></span>
            <span class="sum-sep" />
            <span class="sum-inline sum-total"><i class="sum-dot" />结算总额<b>{{ formatMoney(externalOutputTotal) }}</b><small>= 外部合计</small></span>
         </div>
      </el-form>
      <template #footer>
         <el-button @click="onVisibleChange(false)">取消</el-button>
         <el-button type="primary" @click="saveWorkloadData" :loading="workloadSaving" :disabled="workloadLoading">保 存</el-button>
      </template>
   </el-dialog>
</template>

<script setup name="WorkloadDialog">
import { ref, computed, watch, getCurrentInstance } from 'vue'
import { getSettlementDetail, saveWorkload } from '@/api/project/settlement'
import { categoryTreeselectFull, listBilling } from '@/api/project/category'
import { listUserOptions } from '@/api/system/user'

const { proxy } = getCurrentInstance()

const props = defineProps({
   modelValue: { type: Boolean, default: false },
   projectId: { type: [Number, String], default: null },
   projectCode: { type: String, default: '' },
   clientUnit: { type: String, default: '' },
   projectLocation: { type: String, default: '' },
   engineeringProject: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'saved'])

// 工作量表单：仅含 workloads
const workloadForm = ref({ workloads: [] })
// 负责人卡片列表（内部工作量按负责人 + 记录分栏）
const leaderList = ref([])
// 外部工作量记录列表（外部不挂负责人，按记录号分栏；每项含快速录入栏状态）
const externalRecords = ref([])
const userOptions = ref([])
const leaderOptions = ref([])
/** 全量计费方式：categoryId -> [{billingType, billingCategory, unitPrice, priceUnit, minQuantity}] */
const billingMap = ref({})
/** 当前编辑项目对应的小类 id（用于下拉只显示该小类下的计费类别） */
const currentProjectCategoryId = ref(null)
/** 合同单价映射：categoryId#billingId -> {price} */
const contractPriceMap = ref({})
/** 弹窗内容加载中（先开弹窗再异步填充，消除点击后的空白等待） */
const workloadLoading = ref(false)
const workloadSaving = ref(false)
/** 基础数据（类别树/计费项/用户）懒加载中 */
const baseDataLoading = ref(false)

// ---- 基础数据缓存：类别树 / 用户列表 / 计费档位 运行期基本不变，首次成功后复用（模块级，跨实例共享） ----
let baseDataCache = null   // 已 resolve 的 Promise（命中即同步返回）
let baseDataPending = null // 进行中的 Promise（防止并发重复请求）
function ensureBaseData() {
   if (baseDataCache) return baseDataCache
   if (!baseDataPending) {
      baseDataLoading.value = true
      baseDataPending = Promise.all([
         categoryTreeselectFull(),
         listUserOptions({ pageNum: 1, pageSize: 1000 }),
         listBilling()
      ]).then(([catRes, userRes, billingRes]) => {
         const base = {
            categoryOptions: catRes.data || [],
            userOptions: userRes.rows || [],
            billingMap: buildBillingMap(billingRes.data || [])
         }
         baseDataCache = Promise.resolve(base)
         return base
      }).catch(err => {
         baseDataPending = null
         throw err
      }).finally(() => { baseDataLoading.value = false })
   }
   return baseDataPending
}

/** 计费方式映射：categoryId -> 启用中的计费方式列表（停用 status=1 过滤） */
function buildBillingMap(list) {
   const bMap = {}
   ;(list || []).forEach(b => {
      if (b.status === '1') return
      if (!bMap[b.categoryId]) bMap[b.categoryId] = []
      bMap[b.categoryId].push(b)
   })
   return bMap
}

const onVisibleChange = (val) => { emit('update:modelValue', val) }

watch(() => props.modelValue, (val) => {
   if (val) openDialog()
})

/** 打开弹窗：立即显示 loading，数据就绪后填充内容（基础数据走缓存，二次打开秒回） */
function openDialog() {
   // 重置上一次的残留状态，避免串数据
   workloadForm.value = { workloads: [] }
   leaderList.value = []
   externalRecords.value = []
   contractPriceMap.value = {}
   currentProjectCategoryId.value = null
   loadWorkloadDetail()
}

function loadWorkloadDetail() {
   workloadLoading.value = true
   Promise.all([ensureBaseData(), getSettlementDetail(props.projectId)])
      .then(([base, detailRes]) => {
         userOptions.value = base.userOptions
         billingMap.value = base.billingMap

         const detail = detailRes.data
         currentProjectCategoryId.value = detail.project ? detail.project.projectCategoryId : null
         const workloads = detail.workloads || []

         // 解析合同单价映射（key = categoryId#billingId；categoryId 兜底）
         const contractPrices = detail.contractPrices || []
         const cpMap = {}
         contractPrices.forEach(cp => {
            if (cp.categoryId && cp.billingId != null) cpMap[cp.categoryId + '#' + cp.billingId] = cp
            if (cp.categoryId && cpMap[cp.categoryId] === undefined) cpMap[cp.categoryId] = cp
         })
         contractPriceMap.value = cpMap

         // 填充工作量
         workloadForm.value.workloads = workloads.map(w => {
            const output = w.internalOutput != null ? w.internalOutput : w.externalOutput
            return {
               workloadId: w.id,
               userId: w.userId,
               categoryId: w.categoryId,
               billingKey: w.billingType ? (w.billingType + '#' + w.billingCategory) : null,
               billingType: w.billingType || null,
               billingCategory: w.billingCategory || null,
               priceUnit: w.priceUnit || null,
               minQuantity: w.minQuantity != null ? Number(w.minQuantity) : null,
               unitPrice: w.unitPrice != null ? w.unitPrice : (w.internalPrice != null ? w.internalPrice : w.externalPrice),
               priceSource: w.priceSource || 'dict',
               workload: w.workload,
               internalPrice: w.internalPrice,
               externalPrice: w.externalPrice,
               internalOutput: w.internalOutput,
               externalOutput: w.externalOutput,
               output: output != null ? Number(output) : null,
               subItemNo: w.subItemNo != null ? Number(w.subItemNo) : null,
               subItemName: w.subItemName || null
            }
         })

         // 负责人列表：项目负责人 + 已有工作量行的负责人
         const leaderIdSet = new Set((detail.leaderIds || []).map(id => Number(id)))
         workloadForm.value.workloads.forEach(w => { if (w.userId != null) leaderIdSet.add(Number(w.userId)) })
         const filtered = userOptions.value.filter(u => leaderIdSet.has(Number(u.userId)))
         const leaderSource = filtered.length > 0 ? filtered : userOptions.value
         leaderOptions.value = leaderSource

         // 构建负责人卡片列表（含按记录分栏的快速录入栏状态）
         leaderList.value = leaderSource.map(u => {
            const uid = u.userId
            // 该负责人内部工作量的 distinct subItemNo（记录号），兜底 [1] 保证可录入
            const subNos = [...new Set(
               workloadForm.value.workloads
                  .filter(w => w.billingType === 'internal' && Number(w.userId) === Number(uid))
                  .map(w => w.subItemNo != null ? Number(w.subItemNo) : 0)
            )].sort((a, b) => a - b)
            const records = (subNos.length ? subNos : [1]).map(no => ({
               userId: uid,
               subItemNo: no,
               quickInternalCat: null,
               quickInternalWorkload: null,
               quickInternalPrice: null,
               quickInternalUnit: ''
            }))
            return { userId: uid, nickName: u.nickName, records }
         })

         // 构建外部记录列表（外部不挂负责人，按记录号分栏）
         const extNos = [...new Set(
            workloadForm.value.workloads
               .filter(w => w.billingType === 'external')
               .map(w => w.subItemNo != null ? Number(w.subItemNo) : 0)
         )].sort((a, b) => a - b)
         externalRecords.value = (extNos.length ? extNos : [1]).map(no => ({
            subItemNo: no,
            quickExternalCat: null,
            quickExternalWorkload: null,
            quickExternalPrice: null,
            quickExternalUnit: ''
         }))
      })
      .catch(err => {
         proxy.$modal.msgError('工作量数据加载失败：' + (err.message || err))
         emit('update:modelValue', false)
      })
      .finally(() => { workloadLoading.value = false })
}

// 内部产值合计（含「管线新测 + 管线修测」保底 6000：差额只进合计，不改变各行产值）
const internalOutputTotal = computed(() => {
   let sum = 0
   let reviseSum = 0
   let hasRevise = false
   workloadForm.value.workloads.forEach(row => {
      if (row.billingType !== 'internal' || row.output == null) return
      const v = Number(row.output)
      sum += v
      if (row.billingCategory === '管线新测' || row.billingCategory === '管线修测') {
         reviseSum += v
         hasRevise = true
      }
   })
   if (hasRevise && reviseSum < 6000) {
      sum = sum - reviseSum + 6000
   }
   return sum
})

// 外部产值合计（= 结算总额）
const externalOutputTotal = computed(() => {
   let sum = 0
   workloadForm.value.workloads.forEach(row => {
      if (row.billingType === 'external' && row.output) sum += Number(row.output)
   })
   return sum
})

// 内部计费行数
const internalRowCount = computed(() => workloadForm.value.workloads.filter(r => r.billingType === 'internal').length)
// 外部计费行数
const externalRowCount = computed(() => workloadForm.value.workloads.filter(r => r.billingType === 'external').length)

/** 某记录的外部行（按记录 subItemNo 归属） */
function externalRowsBySub(subItemNo) {
   return workloadForm.value.workloads.filter(r => r.billingType === 'external' && Number(r.subItemNo) === Number(subItemNo))
}

/** 某负责人内部产值 */
function leaderInternalOutput(userId) {
   let sum = 0
   workloadForm.value.workloads.forEach(row => {
      if (Number(row.userId) === Number(userId) && row.billingType === 'internal' && row.output) {
         sum += Number(row.output)
      }
   })
   return sum
}

/** 某负责人某记录的内部行（按记录 subItemNo 归属） */
function internalRowsByUserAndSub(userId, subItemNo) {
   return workloadForm.value.workloads.filter(r => Number(r.userId) === Number(userId) && r.billingType === 'internal' && Number(r.subItemNo) === Number(subItemNo))
}

/** 金额格式化 */
function formatMoney(val) {
   if (val == null) return ""
   return Number(val).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 计算单行产值（起步量兜底）并同步内部/外部产值字段（供后端汇总口径） */
function calcRow(row) {
   const w = Number(row.workload) || 0
   const p = Number(row.unitPrice) || 0
   const min = Number(row.minQuantity) || 0
   // 起步量向上取整：工作量按起步量的整数倍计费
   const effQty = (min > 0 && w > 0) ? Math.ceil(w / min) * min : w
   row.output = (w > 0 && p > 0) ? (effQty * p).toFixed(2) : null
   // 同步旧字段：内部行写 internal_*，外部行写 external_*（列表页/总览汇总依赖）
   if (row.billingType === 'internal') {
      row.internalPrice = row.unitPrice
      row.internalOutput = row.output
      row.externalPrice = null
      row.externalOutput = null
   } else if (row.billingType === 'external') {
      row.externalPrice = row.unitPrice
      row.externalOutput = row.output
      row.internalPrice = null
      row.internalOutput = null
   }
}

/** 是否命中起步量取整（实际工作量非起步量整数倍） */
function minQtyHit(row) {
   const w = Number(row.workload) || 0
   const min = Number(row.minQuantity) || 0
   return min > 0 && w > 0 && Math.ceil(w / min) * min !== w
}

/** 起步量取整后的计费数量 */
function ceilWorkload(row) {
   const w = Number(row.workload) || 0
   const min = Number(row.minQuantity) || 0
   return (min > 0 && w > 0) ? Math.ceil(w / min) * min : w
}

/** 产值计算式小字（如 2公里（实际1.5）× 2,000.00 = 4,000.00） */
function calcExpr(row) {
   const w = Number(row.workload) || 0
   const p = Number(row.unitPrice) || 0
   if (!(w > 0) || !(p > 0)) return ''
   const effQty = ceilWorkload(row)
   const unit = row.priceUnit || ''
   const qtyStr = minQtyHit(row) ? `${effQty}${unit}（实际${w}）` : `${effQty}${unit}`
   return `${qtyStr} × ${formatMoney(p)} = ${formatMoney(effQty * p)}`
}

/**
 * 解析合同单价：按 categoryId#billingId 精确匹配，未命中时回退 categoryId 维度（兼容旧数据）
 */
function resolveContractPrice(categoryId, billingId) {
   if (categoryId == null) return null
   if (billingId != null) {
      const exact = contractPriceMap.value[categoryId + '#' + billingId]
      if (exact) return exact
   }
   return contractPriceMap.value[categoryId] || null
}

/** 手动修改单价：标记来源为手动 */
function onUnitPriceChange(row) {
   if (row.unitPrice != null) {
      row.priceSource = 'manual'
   }
   calcRow(row)
}

/** 当前项目小类下计费类别所属的 categoryId 列表（未绑定小类时回退全部类别，保持旧行为） */
function scopedCategoryIds() {
   const cid = currentProjectCategoryId.value
   if (cid != null && billingMap.value[cid]) return [cid]
   return Object.keys(billingMap.value)
}

/** 内部计费方式下拉选项（仅当前项目小类下的内部计费方式，已过滤当前负责人当前记录已添加过的类别） */
function internalBillingOptions(userId, subItemNo) {
   const opts = []
   const seen = new Set()
   const usedKeys = new Set(
      workloadForm.value.workloads
         .filter(r => Number(r.userId) === Number(userId) && r.billingType === 'internal' && Number(r.subItemNo) === Number(subItemNo))
         .map(r => r.billingKey)
   )
   scopedCategoryIds().forEach(catId => {
      const list = billingMap.value[catId] || []
      list.filter(b => b.billingType === 'internal').forEach(b => {
         const val = b.billingType + '#' + b.billingCategory
         if (!seen.has(val)) {
            seen.add(val)
            if (usedKeys.has(val)) return
            const label = b.billingCategory + '（¥' + formatMoney(b.unitPrice) + '/' + (b.priceUnit || '项') + (Number(b.minQuantity) > 1 ? ('，起步' + b.minQuantity) : '') + '）'
            opts.push({ value: val, label: label, raw: b, categoryId: catId })
         }
      })
   })
   return opts
}

/** 外部计费方式下拉选项（聚合所有类别下的外部计费方式，已过滤当前记录已添加过的类别） */
function externalBillingOptions(subItemNo) {
   const opts = []
   const seen = new Set()
   const usedKeys = new Set(
      workloadForm.value.workloads
         .filter(r => r.billingType === 'external' && Number(r.subItemNo) === Number(subItemNo))
         .map(r => r.billingKey)
   )
   scopedCategoryIds().forEach(catId => {
      const list = billingMap.value[catId] || []
      list.filter(b => b.billingType === 'external').forEach(b => {
         const val = b.billingType + '#' + b.billingCategory
         if (!seen.has(val)) {
            seen.add(val)
            if (usedKeys.has(val)) return
            const label = b.billingCategory + '（¥' + formatMoney(b.unitPrice) + '/' + (b.priceUnit || '项') + (Number(b.minQuantity) > 1 ? ('，起步' + b.minQuantity) : '') + '）'
            opts.push({ value: val, label: label, raw: b, categoryId: catId })
         }
      })
   })
   return opts
}

/** 快速录入栏选择项目类别后带出单价（外部不依赖负责人） */
function onQuickCatChange(val, rec, type) {
   if (type === 'external') {
      const options = externalBillingOptions(rec.subItemNo)
      const opt = options.find(o => o.value === val)
      if (!opt || !opt.raw) {
         rec.quickExternalPrice = null
         rec.quickExternalUnit = ''
         return
      }
      const b = opt.raw
      const cp = resolveContractPrice(opt.categoryId, b.id)
      if (cp && cp.price != null) {
         rec.quickExternalPrice = cp.price
      } else {
         rec.quickExternalPrice = b.unitPrice
      }
      rec.quickExternalUnit = b.priceUnit || ''
      return
   }
   // 内部：按负责人 + 记录
   const options = internalBillingOptions(rec.userId, rec.subItemNo)
   const opt = options.find(o => o.value === val)
   if (!opt || !opt.raw) {
      rec.quickInternalPrice = null
      rec.quickInternalUnit = ''
      return
   }
   const b = opt.raw
   rec.quickInternalPrice = b.unitPrice
   rec.quickInternalUnit = b.priceUnit || ''
}

/** 快速添加工作量行（外部不依赖负责人；内部按记录 rec 归属 subItemNo）；兜底：若同类别已存在则累加工作量 */
function quickAddWorkload(rec, type) {
   const isExternal = type === 'external'
   const cat = isExternal ? rec.quickExternalCat : rec.quickInternalCat
   const workload = isExternal ? rec.quickExternalWorkload : rec.quickInternalWorkload
   const price = isExternal ? rec.quickExternalPrice : rec.quickInternalPrice
   if (!cat || workload == null) return

   const subItemNo = rec.subItemNo
   const options = isExternal ? externalBillingOptions(rec.subItemNo) : internalBillingOptions(rec.userId, rec.subItemNo)
   const opt = options.find(o => o.value === cat)
   if (!opt || !opt.raw) return

   const existRow = workloadForm.value.workloads.find(r => {
      if (r.billingType !== (isExternal ? 'external' : 'internal') || r.billingKey !== cat) return false
      if (Number(r.subItemNo) !== Number(subItemNo)) return false
      return isExternal ? true : Number(r.userId) === Number(rec.userId)
   })
   if (existRow) {
      existRow.workload = (Number(existRow.workload) || 0) + (Number(workload) || 0)
      calcRow(existRow)
      clearQuickBar(rec, isExternal)
      return
   }

   const b = opt.raw
   const cp = resolveContractPrice(opt.categoryId, b.id)
   let finalPrice = price
   let priceSource = 'manual'
   if (isExternal && cp && cp.price != null) {
      finalPrice = cp.price
      priceSource = 'contract'
   } else if (finalPrice === b.unitPrice) {
      priceSource = 'dict'
   }

   const subName = workloadForm.value.workloads.find(r => Number(r.subItemNo) === Number(subItemNo) && r.subItemName)?.subItemName || ''

   const newRow = {
      workloadId: null,
      userId: isExternal ? 0 : rec.userId,
      categoryId: opt.categoryId,
      billingKey: cat,
      billingType: b.billingType,
      billingCategory: b.billingCategory,
      priceUnit: b.priceUnit,
      minQuantity: b.minQuantity != null ? Number(b.minQuantity) : null,
      unitPrice: finalPrice,
      priceSource: priceSource,
      workload: workload,
      internalPrice: isExternal ? null : finalPrice,
      externalPrice: isExternal ? finalPrice : null,
      internalOutput: null,
      externalOutput: null,
      output: null,
      subItemNo: subItemNo,
      subItemName: subName
   }
   calcRow(newRow)
   workloadForm.value.workloads.push(newRow)

   // 清空快速录入栏
   clearQuickBar(rec, isExternal)
}

/** 清空快速录入栏 */
function clearQuickBar(rec, isExternal) {
   if (isExternal) {
      rec.quickExternalCat = null
      rec.quickExternalWorkload = null
      rec.quickExternalPrice = null
      rec.quickExternalUnit = ''
   } else {
      rec.quickInternalCat = null
      rec.quickInternalWorkload = null
      rec.quickInternalPrice = null
      rec.quickInternalUnit = ''
   }
}

/** 计算下一条新记录的记录号（内外部共用一个记录号空间，取全局最大 + 1） */
function nextSubItemNo() {
   let max = 0
   workloadForm.value.workloads.forEach(r => {
      const n = Number(r.subItemNo)
      if (n > max) max = n
   })
   leaderList.value.forEach(l => l.records.forEach(rc => {
      const n = Number(rc.subItemNo)
      if (n > max) max = n
   }))
   externalRecords.value.forEach(rc => {
      const n = Number(rc.subItemNo)
      if (n > max) max = n
   })
   return max + 1
}

/** 内部区：为指定负责人新增一条空白记录 */
function addInternalRecord(leader) {
   leader.records.push({
      userId: leader.userId,
      subItemNo: nextSubItemNo(),
      quickInternalCat: null,
      quickInternalWorkload: null,
      quickInternalPrice: null,
      quickInternalUnit: ''
   })
}

/** 外部区：新增一条空白记录 */
function addExternalRecord() {
   externalRecords.value.push({
      subItemNo: nextSubItemNo(),
      quickExternalCat: null,
      quickExternalWorkload: null,
      quickExternalPrice: null,
      quickExternalUnit: ''
   })
}

/** 删除工作量行（按行对象引用） */
function removeWorkloadRowByIdx(row) {
   const idx = workloadForm.value.workloads.indexOf(row)
   if (idx >= 0) workloadForm.value.workloads.splice(idx, 1)
}

/** 保存工作量 */
function saveWorkloadData() {
   workloadSaving.value = true
   const payload = {
      projectId: props.projectId,
      workloads: workloadForm.value.workloads
   }
   saveWorkload(payload).then(() => {
      proxy.$modal.msgSuccess("保存成功")
      emit('update:modelValue', false)
      emit('saved')
   }).finally(() => {
      workloadSaving.value = false
   })
}

defineExpose({ workloadForm, externalOutputTotal, internalOutputTotal })
</script>

<style scoped>
/* ===== 编辑弹窗：产值统计条（紧凑单行） ===== */
.output-summary-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 8px;
  padding: 6px 16px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}
.sum-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}
.sum-inline b {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.sum-inline small {
  font-size: 12px;
  color: #c0c4cc;
}
.sum-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sum-internal .sum-dot { background: #409eff; }
.sum-internal b { color: #409eff; }
.sum-external .sum-dot { background: #e6a23c; }
.sum-external b { color: #e6a23c; }
.sum-total .sum-dot { background: #67c23a; }
.sum-total b { color: #67c23a; }
.sum-sep {
  width: 1px;
  height: 18px;
  background: #dcdfe6;
  flex-shrink: 0;
}

/* ===== 工作量明细行底色微染 ===== */
:deep(.wl-row-internal td.el-table__cell) {
  background: #f0f7ff !important;
}
:deep(.wl-row-external td.el-table__cell) {
  background: #fdf6ec !important;
}

/* ===== 工作量明细单元格辅助文字 ===== */
.cell-sub {
   font-size: 12px;
   color: #909399;
   line-height: 16px;
   margin-top: 2px;
   text-align: center;
}
.calc-hint { color: #a8abb2; font-variant-numeric: tabular-nums; }
.row-output {
   font-weight: 600;
   font-variant-numeric: tabular-nums;
}

/* ===== 工作量弹窗：负责人卡片 / 快速录入栏 ===== */
.leader-card { margin-bottom: 16px; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; overflow: hidden; }
.leader-card-header { display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: var(--el-fill-color-light); font-size: 14px; }
.leader-name { font-weight: 600; color: var(--el-text-color-primary); }
.leader-mini-total { font-size: 12px; color: var(--el-text-color-secondary); }
.record-card { margin: 12px; border: 1px dashed var(--el-border-color); border-radius: 6px; overflow: hidden; }
.record-card-header { display: flex; align-items: center; padding: 6px 12px; background: var(--el-fill-color-lighter); border-bottom: 1px solid var(--el-border-color-lighter); }
.record-name { font-size: 13px; font-weight: 600; color: var(--el-text-color-primary); }
.quick-add-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--el-fill-color-lighter); border-bottom: 1px solid var(--el-border-color-lighter); flex-wrap: wrap; }
.qa-label { font-size: 12px; color: var(--el-text-color-secondary); white-space: nowrap; }
.qa-unit { font-size: 12px; color: var(--el-text-color-placeholder); }
.section-title-internal { color: var(--el-color-primary); font-weight: 600; }
.section-title-external { color: var(--el-color-warning); font-weight: 600; }
.section-output-mini { margin-left: 12px; font-size: 12px; font-weight: 400; color: var(--el-text-color-secondary); }
</style>
