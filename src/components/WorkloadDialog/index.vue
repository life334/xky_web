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
         <!-- 空态提示：项目类别未配置/已停用计费方式（严格作用域，不回退全部类别） -->
         <el-alert
            v-if="!workloadLoading && billingScopeEmpty"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 12px"
            :title="billingScopeHint"
         />
         <!-- 外部工作量区（按负责人录入：每人若干栏，重复计费类别自动另开一栏） -->
         <el-divider content-position="left">
            <span class="section-title-external">外部工作量</span>
            <span class="section-output-mini">产值合计：{{ formatMoney(externalOutputTotal) }}</span>
         </el-divider>

         <div v-for="leader in externalLeaders" :key="'ext-' + leader.userId" class="leader-card">
            <div class="leader-card-header">
               <span class="leader-name">{{ leader.nickName }}</span>
               <span class="leader-mini-total">外部：{{ formatMoney(leaderExternalOutput(leader.userId)) }}</span>
               <el-button v-if="!leader.unassigned" type="primary" size="small" icon="Plus" plain style="margin-left: auto" @click="addExternalRecord(leader)">添加</el-button>
            </div>

            <!-- 每栏 = 一个外部子项：自带录入栏 + 已录入行 + 小计（≥2 栏时才显示栏头，含删除） -->
            <div v-for="(rec, recIdx) in leader.records" :key="rec._uid" class="record-card">
               <div v-if="leader.records.length > 1" class="record-card-header">
                  <span class="record-name">第 {{ recIdx + 1 }} 栏</span>
                  <el-button link type="danger" icon="Delete" style="margin-left: auto" @click="removeExternalLane(leader, rec)">删除</el-button>
               </div>

               <!-- 外部快速录入栏（归属该负责人该栏；未指定负责人行不允许新增） -->
               <div v-if="!leader.unassigned" class="quick-add-bar">
                  <span class="qa-label">计费类别</span>
                  <el-select v-model="rec.quickExternalCat" placeholder="选择计费类别" style="width: 220px" @change="(val) => onQuickCatChange(val, rec, 'external')">
                     <el-option v-for="o in externalBillingOptions()" :key="o.value" :label="o.label" :value="o.value" />
                  </el-select>
                  <span class="qa-label">工作量</span>
                  <el-input-number v-model="rec.quickExternalWorkload" :min="0" :precision="2" controls-position="right" style="width: 130px" :disabled="!rec.quickExternalCat" @keyup.enter="quickAddWorkload(rec, 'external')" />
                  <span class="qa-label">单价</span>
                  <el-input-number v-model="rec.quickExternalPrice" :min="0" :precision="2" controls-position="right" style="width: 120px" :disabled="!rec.quickExternalCat" />
                  <span class="qa-unit" v-if="rec.quickExternalUnit">{{ rec.quickExternalUnit }}</span>
                  <el-button type="primary" size="small" icon="Plus" :disabled="!rec.quickExternalCat || rec.quickExternalWorkload == null" @click="quickAddWorkload(rec, 'external')">添加</el-button>
               </div>

               <!-- 该负责人该栏已录入行 -->
               <el-table :data="externalRowsByUserAndSub(rec.userId, rec.subItemNo)" border size="small" :row-class-name="() => 'wl-row-external'">
                  <el-table-column label="计费类别" prop="billingCategory" align="center" min-width="120" />
                  <el-table-column label="工作量" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.workload" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="calcRow(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="单价" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.unitPrice" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="onUnitPriceChange(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="起步量" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.minQuantity" :min="0" :precision="4" controls-position="right" size="small" style="width: 100%" @change="onMinQuantityChange(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="单位" prop="priceUnit" align="center" width="70" />
                  <el-table-column label="产值" align="center" min-width="110">
                     <template #default="scope">
                        <span class="row-output">{{ scope.row.output != null ? formatMoney(scope.row.output) : '-' }}</span>
                        <div v-if="calcExpr(scope.row)" class="cell-sub calc-hint" style="display:none">{{ calcExpr(scope.row) }}</div>
                     </template>
                  </el-table-column>
                  <!-- 未指定负责人的存量行：可在此直接指定归属，指定后自动移入该负责人卡片 -->
                  <el-table-column v-if="leader.unassigned" label="指定负责人" align="center" width="170">
                     <template #default="scope">
                        <el-select :model-value="scope.row.userId || null" placeholder="选择负责人" size="small" filterable style="width: 100%" @change="(val) => assignExternalRow(scope.row, val)">
                           <el-option v-for="u in assignableLeaders()" :key="u.userId" :label="u.nickName" :value="u.userId" />
                        </el-select>
                     </template>
                  </el-table-column>
                  <el-table-column label="操作" align="center" :width="leader.unassigned ? 90 : 60">
                     <template #default="scope"><el-button link type="danger" icon="Delete" @click="removeWorkloadRowByIdx(scope.row, null, 'external')" /></template>
                  </el-table-column>
               </el-table>

               <!-- 该栏小计 -->
               <div class="lane-subtotal">
                  <span class="lane-sub-label">小计</span>
                  <span class="lane-sub-value lane-sub-value-ext">{{ formatMoney(laneExternalOutput(rec.userId, rec.subItemNo)) }}</span>
               </div>
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
               <el-button type="primary" size="small" icon="Plus" plain style="margin-left: auto" @click="addInternalRecord(leader)">添加</el-button>
            </div>

            <!-- 每栏 = 一个记录号：自带录入栏 + 已录入行 + 小计（≥2 栏时才显示栏头，含删除） -->
            <div v-for="(rec, recIdx) in leader.records" :key="leader.userId + '-' + rec.subItemNo" class="record-card">
               <div v-if="leader.records.length > 1" class="record-card-header">
                  <span class="record-name">第 {{ recIdx + 1 }} 栏</span>
                  <el-button link type="danger" icon="Delete" style="margin-left: auto" @click="removeLane(leader, rec)">删除</el-button>
               </div>

               <!-- 内部快速录入栏（归属该记录） -->
               <div class="quick-add-bar">
                  <span class="qa-label">计费类别</span>
                  <el-select v-model="rec.quickInternalCat" placeholder="选择计费类别" style="width: 220px" @change="(val) => onQuickCatChange(val, rec, 'internal')">
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
                  <el-table-column label="计费类别" prop="billingCategory" align="center" min-width="120" />
                  <el-table-column label="工作量" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.workload" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="calcRow(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="单价" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.unitPrice" :min="0" :precision="2" controls-position="right" size="small" style="width: 100%" @change="onUnitPriceChange(scope.row)" /></template>
                  </el-table-column>
                  <el-table-column label="起步量" align="center" width="120">
                     <template #default="scope"><el-input-number v-model="scope.row.minQuantity" :min="0" :precision="4" controls-position="right" size="small" style="width: 100%" @change="onMinQuantityChange(scope.row)" /></template>
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

               <!-- 每栏小计（含「管线新测/修测」保底 6000） -->
               <div class="lane-subtotal">
                  <span class="lane-sub-label">小计</span>
                  <span class="lane-sub-value">{{ formatMoney(laneInternalOutput(leader.userId, rec.subItemNo)) }}</span>
               </div>
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
import { ensureCategoryBaseData } from '@/utils/categoryBaseData'

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
// 外部工作量负责人卡片（外部也按负责人录入，每人若干栏；user_id 为空/0 的存量行归入「未指定负责人」卡片）
const externalLeaders = ref([])
/** 外部栏本地自增 id：仅用于 v-for 的 key（空栏 subItemNo 可能为 null，不能拿它当 key） */
let externalRecSeq = 0
const userOptions = ref([])
const leaderOptions = ref([])
/** 全量计费方式：categoryId -> [{billingType, billingCategory, unitPrice, priceUnit, minQuantity}] */
const billingMap = ref({})
/** 当前编辑项目对应的小类 id（用于下拉只显示该小类下的计费类别） */
const currentProjectCategoryId = ref(null)
/** 项目类别 id -> 名称（用于 project_category_id 失效/重建时按名称兜底匹配计费类别） */
const categoryNameMap = ref({})
/** 合同单价映射：categoryId#billingId -> {price} */
const contractPriceMap = ref({})
/** 弹窗内容加载中（先开弹窗再异步填充，消除点击后的空白等待） */
const workloadLoading = ref(false)
const workloadSaving = ref(false)
// ---- 基础数据（类别树 / 计费项 / 用户）：统一走共享缓存模块 @/utils/categoryBaseData ----
// 「项目类别」页增/改/删后会显式作废该缓存，另有 TTL 兜底，避免新类别进不了下拉。

const onVisibleChange = (val) => { emit('update:modelValue', val) }

watch(() => props.modelValue, (val) => {
   if (val) openDialog()
})

/** 打开弹窗：立即显示 loading，数据就绪后填充内容（基础数据走缓存，二次打开秒回） */
function openDialog() {
   // 重置上一次的残留状态，避免串数据
   workloadForm.value = { workloads: [] }
   leaderList.value = []
   externalLeaders.value = []
   contractPriceMap.value = {}
   currentProjectCategoryId.value = null
   loadWorkloadDetail()
}

function loadWorkloadDetail() {
   workloadLoading.value = true
   Promise.all([ensureCategoryBaseData(), getSettlementDetail(props.projectId)])
      .then(([base, detailRes]) => {
         userOptions.value = base.userOptions
         billingMap.value = base.billingMap
         categoryNameMap.value = base.categoryNameMap

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
               // 登记人姓名（保存不用，仅供外部区在用户下拉查不到此人时兜底显示，避免行被漏掉）
               userName: w.userName || null,
               categoryId: w.categoryId,
               billingKey: w.billingType ? (w.billingType + '#' + w.billingCategory) : null,
               billingType: w.billingType || null,
               billingCategory: w.billingCategory || null,
               priceUnit: w.priceUnit || null,
               minQuantity: w.minQuantity != null ? Number(w.minQuantity) : null,
               minQuantitySource: w.minQuantitySource || (w.minQuantity != null ? 'dict' : null),
               unitPrice: w.unitPrice != null ? w.unitPrice : (w.internalPrice != null ? w.internalPrice : w.externalPrice),
               priceSource: w.priceSource || 'dict',
               workload: w.workload,
               internalPrice: w.internalPrice,
               externalPrice: w.externalPrice,
               internalOutput: w.internalOutput,
               externalOutput: w.externalOutput,
               output: output != null ? Number(output) : null,
               subItemNo: w.subItemNo != null ? Number(w.subItemNo) : null,
               dupNo: w.dupNo != null ? Number(w.dupNo) : 1,
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

         // 构建外部负责人卡片（外部工作量同样按负责人录入，与内部同构：
         // 每位负责人若干栏，一栏一个子项；同栏重复录入同一计费类别时自动另开一栏）
         externalLeaders.value = buildExternalLeaders()
      })
      .catch(err => {
         proxy.$modal.msgError('工作量数据加载失败：' + (err.message || err))
         emit('update:modelValue', false)
      })
      .finally(() => { workloadLoading.value = false })
}

/**
 * 构建外部负责人卡片列表
 *
 * <p>卡片 = 项目负责人 ∪ 有工作量的负责人（与内部区一致），每人至少一栏可录入；
 * {@code user_id} 为空 / 0 的存量外部行单独归入「未指定负责人」卡片，可在卡片内指定归属，
 * 不做自动猜测。</p>
 */
function buildExternalLeaders() {
   const extRows = workloadForm.value.workloads.filter(r => r.billingType === 'external')
   const leaders = leaderOptions.value.map(u => ({
      userId: u.userId,
      nickName: u.nickName,
      unassigned: false,
      records: []
   }))
   // 未指定负责人的存量行（历史数据 / 早期新增导致）单独一张卡
   if (extRows.some(r => !r.userId)) {
      leaders.push({ userId: 0, nickName: '未指定负责人', unassigned: true, records: [] })
   }
   // 兜底：外部行的登记人不在负责人下拉里（账号已停用等）也要给一张卡，
   // 否则该行在界面上无处可去，保存（全量替换）时会被静默丢掉
   const knownIds = new Set(leaders.map(l => Number(l.userId)))
   extRows.forEach(r => {
      const uid = Number(r.userId || 0)
      if (!uid || knownIds.has(uid)) return
      knownIds.add(uid)
      leaders.push({ userId: uid, nickName: r.userName || ('用户#' + uid), unassigned: false, records: [] })
   })
   leaders.forEach(leader => {
      const mine = extRows.filter(r => Number(r.userId || 0) === Number(leader.userId))
      // 该负责人已有的栏号（无行则给一个空栏，栏号待首次录入时分配，避免白占号）
      const lanes = [...new Set(mine.map(r => (r.subItemNo != null ? Number(r.subItemNo) : null)))]
         .filter(n => n != null)
         .sort((a, b) => a - b)
      leader.records = (lanes.length ? lanes : [null]).map(no => newExternalRecord(leader.userId, no))
   })
   return leaders
}

/** 新建一个外部栏（快速录入栏状态容器）；subItemNo 为 null 表示尚未分配栏号的空白栏 */
function newExternalRecord(userId, subItemNo) {
   return {
      _uid: ++externalRecSeq,
      userId: userId,
      subItemNo: subItemNo,
      quickExternalCat: null,
      quickExternalWorkload: null,
      quickExternalPrice: null,
      quickExternalUnit: ''
   }
}

// 内部产值合计（含「管线新测 + 管线修测」保底 6000；⚠️ 保底按「栏」各自计算 = Σ 各负责人各栏小计）
const internalOutputTotal = computed(() => {
   let total = 0
   leaderList.value.forEach(leader => { total += leaderInternalOutput(leader.userId) })
   return total
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

/** 某负责人某栏的外部行（blank 栏 subItemNo 为 null，无行） */
function externalRowsByUserAndSub(userId, subItemNo) {
   if (subItemNo == null) return []
   return workloadForm.value.workloads.filter(r =>
      r.billingType === 'external'
      && Number(r.userId || 0) === Number(userId || 0)
      && Number(r.subItemNo) === Number(subItemNo))
}

/** 某负责人外部产值合计（该人全部外部行之和，不按栏分） */
function leaderExternalOutput(userId) {
   let sum = 0
   workloadForm.value.workloads.forEach(row => {
      if (row.billingType !== 'external') return
      if (Number(row.userId || 0) !== Number(userId || 0)) return
      if (row.output) sum += Number(row.output)
   })
   return sum
}

/** 某负责人某栏外部产值小计 */
function laneExternalOutput(userId, subItemNo) {
   let sum = 0
   externalRowsByUserAndSub(userId, subItemNo).forEach(row => {
      if (row.output) sum += Number(row.output)
   })
   return sum
}

/** 某栏内部小计（含每栏保底：该栏其他行 + max(该栏「管线新测+修测」, 6000)；无保底类别则照实求和） */
function laneInternalOutput(userId, subItemNo) {
   let sum = 0
   let reviseSum = 0
   workloadForm.value.workloads.forEach(row => {
      if (row.billingType !== 'internal' || row.output == null) return
      if (Number(row.userId) !== Number(userId)) return
      if (Number(row.subItemNo) !== Number(subItemNo)) return
      const v = Number(row.output)
      sum += v
      if (row.billingCategory === '管线新测' || row.billingCategory === '管线修测') reviseSum += v
   })
   return reviseSum > 0 ? (sum - reviseSum + Math.max(reviseSum, 6000)) : sum
}

/** 某负责人内部产值 = Σ 该负责人各栏小计（含每栏保底） */
function leaderInternalOutput(userId) {
   const lanes = new Set()
   workloadForm.value.workloads.forEach(row => {
      if (row.billingType !== 'internal' || Number(row.userId) !== Number(userId)) return
      lanes.add(row.subItemNo != null ? Number(row.subItemNo) : 0)
   })
   const leader = leaderList.value.find(l => Number(l.userId) === Number(userId))
   if (leader) leader.records.forEach(rec => lanes.add(Number(rec.subItemNo)))
   let total = 0
   lanes.forEach(no => { total += laneInternalOutput(userId, no) })
   return total
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
   // 起步量 = 最低计费数量：工作量低于起步量时按起步量计费，达到/超过则按实际计费
   const effQty = (min > 0 && w > 0 && w < min) ? min : w
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

/** 是否命中起步量兜底（工作量低于起步量，按起步量计费） */
function minQtyHit(row) {
   const w = Number(row.workload) || 0
   const min = Number(row.minQuantity) || 0
   return min > 0 && w > 0 && w < min
}

/** 起步量兜底后的计费数量 = max(工作量, 起步量) */
function billWorkload(row) {
   const w = Number(row.workload) || 0
   const min = Number(row.minQuantity) || 0
   return (min > 0 && w > 0 && w < min) ? min : w
}

/** 产值计算式小字（如 0.5公里（实际0.2，按起步量）× 4,000.00 = 2,000.00） */
function calcExpr(row) {
   const w = Number(row.workload) || 0
   const p = Number(row.unitPrice) || 0
   if (!(w > 0) || !(p > 0)) return ''
   const effQty = billWorkload(row)
   const unit = row.priceUnit || ''
   const qtyStr = minQtyHit(row) ? `${effQty}${unit}（实际${w}，按起步量）` : `${effQty}${unit}`
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

/** 解析合同起步量（与合同单价同一匹配维度）；未配置合同起步量返回 null（回退字典） */
function resolveContractMin(categoryId, billingId) {
   const cp = resolveContractPrice(categoryId, billingId)
   return cp && cp.contractMinQuantity != null ? Number(cp.contractMinQuantity) : null
}

/** 手动修改单价：标记来源为手动 */
function onUnitPriceChange(row) {
   if (row.unitPrice != null) {
      row.priceSource = 'manual'
   }
   calcRow(row)
}

/** 手动修改起步量：标记来源为手动；清空则回退默认（合同 → 字典） */
function onMinQuantityChange(row) {
   row.minQuantitySource = row.minQuantity != null ? 'manual' : null
   calcRow(row)
}

/**
 * 当前项目类别下计费类别所属的 categoryId 列表（严格作用域，绝不回退到全部类别）
 * 1) 优先按项目类别 id 命中；
 * 2) 未命中则按项目类别名称（engineeringProject）再匹配一次，应对类别 id 失效/被重建、项目挂在父级类别等情况；
 * 3) 仍无命中返回空数组 —— 不再回退「全部类别」，避免下拉里冒出其它类别的计费类别。
 */
function scopedCategoryIds() {
   const cid = currentProjectCategoryId.value
   if (cid != null && billingMap.value[cid]) return [cid]
   const name = (props.engineeringProject || '').trim()
   if (name) {
      const matched = Object.keys(categoryNameMap.value)
         .filter(k => categoryNameMap.value[k] === name && billingMap.value[k])
      if (matched.length) return matched
   }
   return []
}

/** 计费类别作用域是否为空（空态提示：该项目类别未配置/已停用计费方式） */
const billingScopeEmpty = computed(() => scopedCategoryIds().length === 0)

/** 空态提示文案 */
const billingScopeHint = computed(() => {
   const name = (props.engineeringProject || '').trim()
   if (name) {
      return '该项目类别「' + name + '」尚未配置（或已停用）计费方式，请先到「项目类别」中配置后再录入工作量。'
   }
   return '当前项目未关联有效的「项目类别」，无法确定可用的计费类别，请先设置项目类别或到「项目类别」中配置计费方式。'
})

/** 内部计费方式下拉选项（仅当前项目类别下的内部计费方式，已过滤当前负责人当前记录已添加过的类别） */
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

/** 外部计费方式下拉选项（聚合所有类别下的外部计费方式；⚠️ 不再过滤已录入类别 ⇒ 同一栏内同类别可多行） */
function externalBillingOptions() {
   const opts = []
   const seen = new Set()
   scopedCategoryIds().forEach(catId => {
      const list = billingMap.value[catId] || []
      list.filter(b => b.billingType === 'external').forEach(b => {
         const val = b.billingType + '#' + b.billingCategory
         if (!seen.has(val)) {
            seen.add(val)
            const label = b.billingCategory + '（¥' + formatMoney(b.unitPrice) + '/' + (b.priceUnit || '项') + (Number(b.minQuantity) > 1 ? ('，起步' + b.minQuantity) : '') + '）'
            opts.push({ value: val, label: label, raw: b, categoryId: catId })
         }
      })
   })
   return opts
}

/** 快速录入栏选择计费类别后带出单价（外部不依赖负责人） */
function onQuickCatChange(val, rec, type) {
   if (type === 'external') {
      const options = externalBillingOptions()
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

/** 快速添加工作量行（内外都按负责人 + 栏归属）
 *  · 外部：同一位负责人的同一栏已有该计费类别 → 给该人另开一栏（一栏一个类别实例，与历史导入同形）
 *  · 内部：下拉已隐藏本栏已用类别，兜底同类别仍累加（避免重复行） */
function quickAddWorkload(rec, type) {
   const isExternal = type === 'external'
   const cat = isExternal ? rec.quickExternalCat : rec.quickInternalCat
   const workload = isExternal ? rec.quickExternalWorkload : rec.quickInternalWorkload
   const price = isExternal ? rec.quickExternalPrice : rec.quickInternalPrice
   if (!cat || workload == null) return

   let subItemNo = rec.subItemNo
   const options = isExternal ? externalBillingOptions() : internalBillingOptions(rec.userId, rec.subItemNo)
   const opt = options.find(o => o.value === cat)
   if (!opt || !opt.raw) return

   // 外部：空白栏首次录入先分配栏号；本栏已有同一计费类别 → 给该负责人另开一栏
   let openedNewLane = false
   if (isExternal) {
      if (subItemNo == null) {
         subItemNo = nextExternalSubItemNo()
         rec.subItemNo = subItemNo
      }
      const dup = workloadForm.value.workloads.some(r =>
         r.billingType === 'external'
         && Number(r.userId || 0) === Number(rec.userId || 0)
         && Number(r.subItemNo) === Number(subItemNo)
         && Number(r.categoryId) === Number(opt.categoryId)
         && r.billingCategory === opt.raw.billingCategory)
      if (dup) {
         subItemNo = nextExternalSubItemNo()
         const leader = externalLeaders.value.find(l => Number(l.userId) === Number(rec.userId || 0))
         if (leader) leader.records.push(newExternalRecord(rec.userId, subItemNo))
         openedNewLane = true
      }
   }

   // 内部：同栏同类别累加（正常走不到 —— 下拉已隐藏，仅兜底）
   if (!isExternal) {
      const existRow = workloadForm.value.workloads.find(r =>
         r.billingType === 'internal' && r.billingKey === cat &&
         Number(r.subItemNo) === Number(subItemNo) && Number(r.userId) === Number(rec.userId))
      if (existRow) {
         existRow.workload = (Number(existRow.workload) || 0) + (Number(workload) || 0)
         calcRow(existRow)
         clearQuickBar(rec, isExternal)
         return
      }
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

   // 起步量：合同起步量优先 → 字典起步量（仅外部走合同，与单价同维度）
   const contractMin = isExternal ? resolveContractMin(opt.categoryId, b.id) : null
   let finalMin = b.minQuantity != null ? Number(b.minQuantity) : null
   let minSource = finalMin != null ? 'dict' : null
   if (contractMin != null) {
      finalMin = contractMin
      minSource = 'contract'
   }

   const subName = workloadForm.value.workloads.find(r => Number(r.subItemNo) === Number(rec.subItemNo) && r.subItemName)?.subItemName || ''

   const newRow = {
      workloadId: null,
      // 外部同样记在录入人身上（2026-10 起外部按负责人录入；历史数据的 user_id 也是真人）
      userId: rec.userId,
      categoryId: opt.categoryId,
      billingKey: cat,
      billingType: b.billingType,
      billingCategory: b.billingCategory,
      priceUnit: b.priceUnit,
      minQuantity: finalMin,
      minQuantitySource: minSource,
      unitPrice: finalPrice,
      priceSource: priceSource,
      workload: workload,
      internalPrice: isExternal ? null : finalPrice,
      externalPrice: isExternal ? finalPrice : null,
      internalOutput: null,
      externalOutput: null,
      output: null,
      subItemNo: subItemNo,
      // dupNo 恒为 1：外部重复类别已改为「另开一栏」，同一栏内不会再出现同类别的两行
      dupNo: 1,
      subItemName: subName
   }
   calcRow(newRow)
   workloadForm.value.workloads.push(newRow)

   if (openedNewLane) {
      const leader = externalLeaders.value.find(l => Number(l.userId) === Number(rec.userId || 0))
      const laneIdx = leader ? leader.records.findIndex(rc => Number(rc.subItemNo) === Number(subItemNo)) : -1
      proxy.$modal.msgWarning('该负责人本栏已录入该计费类别，已自动新增第 ' + (laneIdx + 1) + ' 栏')
   }

   // 清空快速录入栏
   clearQuickBar(rec, isExternal)
}

/** 计算外部的新栏号：只统计外部行的最大化栏号 + 1
 *  ⚠️ 不能复用 nextSubItemNo() —— 那个把内外栏号混算，会让外部栏号跳号
 *  （内外是两套独立的栏空间：唯一索引里含 billing_type，编号重号互不干扰） */
function nextExternalSubItemNo() {
   let max = 0
   workloadForm.value.workloads.forEach(r => {
      if (r.billingType !== 'external') return
      const n = Number(r.subItemNo)
      if (n > max) max = n
   })
   return max + 1
}

/** 外部区：为指定负责人新增一栏空白录入位（栏号待首次录入时分配，避免白占号） */
function addExternalRecord(leader) {
   leader.records.push(newExternalRecord(leader.userId, null))
}

/**
 * 外部区：清掉已删空的栏，并把「未指定负责人」卡片在没行时整张摘掉
 *
 * <p>栏号不做压紧重排 —— 卡片标题用显示序号（第 N 栏），真实 sub_item_no 只用于归属行，
 * 不动存量栏号，避免为界面美观去改写几千行历史数据。</p>
 */
function pruneExternalLanes(userId) {
   const leader = externalLeaders.value.find(l => Number(l.userId) === Number(userId || 0))
   if (!leader) return
   if (leader.records.length > 1) {
      const kept = leader.records.filter(rc => rc.subItemNo == null || externalRowsByUserAndSub(rc.userId, rc.subItemNo).length > 0)
      leader.records = kept.length ? kept : [leader.records[0]]
   }
   if (leader.unassigned && !workloadForm.value.workloads.some(r => r.billingType === 'external' && !r.userId)) {
      const i = externalLeaders.value.indexOf(leader)
      if (i >= 0) externalLeaders.value.splice(i, 1)
   }
}

/** 可指定的负责人下拉（未指定卡片里用） */
function assignableLeaders() {
   return leaderOptions.value.filter(u => Number(u.userId) !== 0)
}

/**
 * 把「未指定负责人」的外部行指定给某位负责人
 *
 * <p>换新栏号后再归入目标卡片：沿用原栏号可能与目标人已有栏号撞唯一索引
 * （project_id + user_id + category + billing_type + billing_category + sub_item_no + dup_no）。
 * 指定后该行会从「未指定负责人」卡片消失、出现在目标负责人的新栏里。</p>
 */
function assignExternalRow(row, userId) {
   if (!userId) return
   const target = leaderOptions.value.find(u => Number(u.userId) === Number(userId))
   if (!target) return
   row.userId = target.userId
   row.subItemNo = nextExternalSubItemNo()
   let leader = externalLeaders.value.find(l => Number(l.userId) === Number(target.userId))
   if (!leader) {
      leader = { userId: target.userId, nickName: target.nickName, unassigned: false, records: [] }
      externalLeaders.value.unshift(leader)
   }
   leader.records.push(newExternalRecord(target.userId, row.subItemNo))
   pruneExternalLanes(0)
   proxy.$modal.msgSuccess('已指定给 ' + target.nickName)
}

/** 内部：某负责人删除一栏后，把该负责人后续栏的栏号前移一位（内部栏号按人独立，不影响他人） */
function renumberInternalLanesAfter(leader, removed) {
   const uid = Number(leader.userId)
   workloadForm.value.workloads.forEach(r => {
      if (r.billingType !== 'internal' || Number(r.userId) !== uid) return
      const n = Number(r.subItemNo)
      if (n > removed) r.subItemNo = n - 1
   })
   leader.records.forEach(rc => {
      const n = Number(rc.subItemNo)
      if (n > removed) rc.subItemNo = n - 1
   })
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

/** 计算下一个内部记录号（内部区手动「添加」时用；外部另有 nextExternalSubItemNo()） */
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
   externalLeaders.value.forEach(l => l.records.forEach(rc => {
      const n = Number(rc.subItemNo)
      if (n > max) max = n
   }))
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

/** 删除工作量行（按行对象引用） */
function removeWorkloadRowByIdx(row) {
   const idx = workloadForm.value.workloads.indexOf(row)
   if (idx < 0) return
   workloadForm.value.workloads.splice(idx, 1)
   // 外部：删光某栏最后一行后，该栏自动收起（每人至少留一栏）；未指定卡片空了则整张摘掉
   // 内部删行不动栏（内部栏是用户手动「添加」出来的，可能是预留的空白录入栏，不能随便清掉）
   if (row.billingType === 'external') pruneExternalLanes(row.userId)
}

/** 删除外部某栏（含栏内所有行）；仅该负责人 ≥2 栏时可删（末栏禁止删——删光就没录入入口了），二次确认 */
function removeExternalLane(leader, rec) {
   if (leader.records.length <= 1) return
   const rows = externalRowsByUserAndSub(rec.userId, rec.subItemNo)
   const tip = rows.length > 0
      ? '删除该栏将同时删除栏内 ' + rows.length + ' 行工作量，确定删除？'
      : '删除该空白栏？'
   proxy.$modal.confirm(tip).then(() => {
      rows.forEach(r => {
         const i = workloadForm.value.workloads.indexOf(r)
         if (i >= 0) workloadForm.value.workloads.splice(i, 1)
      })
      const idx = leader.records.indexOf(rec)
      if (idx >= 0) leader.records.splice(idx, 1)
      pruneExternalLanes(leader.userId)
      proxy.$modal.msgSuccess('已删除该栏')
   }).catch(() => {})
}

/** 删除整栏（含栏内所有行）；仅 ≥2 栏时可删（末栏禁止删，UI 上栏头此时也已隐藏），二次确认 */
function removeLane(leader, rec) {
   if (leader.records.length <= 1) return
   const rows = internalRowsByUserAndSub(leader.userId, rec.subItemNo)
   const tip = rows.length > 0
      ? '删除该栏将同时删除栏内 ' + rows.length + ' 行工作量，确定删除？'
      : '删除该空白栏？'
   proxy.$modal.confirm(tip).then(() => {
      rows.forEach(r => removeWorkloadRowByIdx(r))
      renumberInternalLanesAfter(leader, Number(rec.subItemNo))
      const idx = leader.records.indexOf(rec)
      if (idx >= 0) leader.records.splice(idx, 1)
      proxy.$modal.msgSuccess('已删除该栏')
   }).catch(() => {})
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
.lane-subtotal { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 5px 12px; background: var(--el-fill-color-light); border-top: 1px solid var(--el-border-color-lighter); }
.lane-sub-label { font-size: 12px; color: var(--el-text-color-secondary); }
.lane-sub-value { font-size: 13px; font-weight: 600; color: var(--el-color-primary); font-variant-numeric: tabular-nums; }
.lane-sub-value-ext { color: var(--el-color-warning); }
.quick-add-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--el-fill-color-lighter); border-bottom: 1px solid var(--el-border-color-lighter); flex-wrap: wrap; }
.qa-label { font-size: 12px; color: var(--el-text-color-secondary); white-space: nowrap; }
.qa-unit { font-size: 12px; color: var(--el-text-color-placeholder); }
.section-title-internal { color: var(--el-color-primary); font-weight: 600; }
.section-title-external { color: var(--el-color-warning); font-weight: 600; }
.section-output-mini { margin-left: 12px; font-size: 12px; font-weight: 400; color: var(--el-text-color-secondary); }
</style>
