<template>
  <el-dialog
    v-model="localVisible"
    :title="title"
    width="min(1160px, 94vw)"
    top="6vh"
    append-to-body
    destroy-on-close
    class="project-drill-dialog"
  >
    <div class="drill-body" v-loading="loading">
      <el-table
        :data="rows"
        size="small"
        border
        stripe
        class="drill-table"
        max-height="440"
        :row-class-name="rowClass"
        @row-click="onRowClick"
      >
        <el-table-column
          v-for="col in columns"
          :key="col.prop || col.label"
          :prop="col.prop"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :align="col.align || 'left'"
          :show-overflow-tooltip="col.tip !== false"
        >
          <template v-if="col.type" #default="scope">
            <dict-tag v-if="col.type === 'status'" :options="proj_project_status" :value="scope.row.status" />
            <dict-tag v-else-if="col.type === 'payType'" :options="proj_payment_type" :value="scope.row.paymentType" />
            <span v-else-if="col.type === 'date'">{{ dateOnly(scope.row[col.prop]) }}</span>
            <span v-else-if="col.type === 'money'">¥{{ formatMoney(scope.row[col.prop]) }}</span>
            <span v-else-if="col.type === 'moneySigned'" :class="{ 'amt-neg': Number(scope.row[col.prop]) < 0 }">¥{{ formatMoney(scope.row[col.prop]) }}</span>
            <span v-else-if="col.type === 'severity'" class="sev-tag" :class="'sev-' + scope.row.severity">{{ sevText(scope.row.severity) }}</span>
            <span v-else>{{ scope.row[col.prop] }}</span>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty :description="emptyText" :image-size="60" />
        </template>
      </el-table>

      <div class="drill-foot">
        <span class="drill-hint">{{ footHint }}</span>
        <el-pagination
          v-if="paged && total > 0"
          v-model:current-page="pageNum"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="fetchList"
        />
      </div>
    </div>

    <template #footer>
      <el-button v-if="openLabel" plain @click="openInList">{{ openLabel }}</el-button>
      <el-button type="primary" @click="localVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <ProjectDetailDrawer v-model:visible="detailVisible" :project-id="detailId" />
</template>

<script setup>
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { listProject } from "@/api/project/project"
import { listContract } from "@/api/project/contract"
import { collectionReceivedDetail } from "@/api/project/collection"
import ProjectDetailDrawer from "@/components/ProjectDetailDrawer/index.vue"

const props = defineProps({
  /** 弹窗显隐（v-model:visible） */
  visible: { type: Boolean, default: false },
  /** 弹窗标题 */
  title: { type: String, default: "明细" },
  /**
   * 弹窗类型，决定数据源 / 列 / 底部跳转 / 行点击行为：
   *  project 项目明细（分页，行点击开项目详情抽屉）
   *  contract 合同明细（分页）
   *  payment 到账明细（分页）
   *  data 数据直传（外部传入 dataRows，不分页；按 columns 渲染，行点击开抽屉）
   *  debt / overdue / contractMissing 风险清单三类（数据直传）
   */
  type: { type: String, default: "project" },
  /** 查询参数（project/contract/payment 直接透传后端接口） */
  query: { type: Object, default: () => ({}) },
  /** 数据直传模式的行（type='data' / debt / overdue / contractMissing） */
  dataRows: { type: Array, default: () => [] },
  /** 列覆盖（不传则用内置预设） */
  columns: { type: Array, default: null }
})

const emit = defineEmits(["update:visible"])

const { proj_project_status, proj_payment_type } = useDict("proj_project_status", "proj_payment_type")
const router = useRouter()

const localVisible = computed({
  get: () => props.visible,
  set: v => emit("update:visible", v)
})

// ===== 列预设 =====
const PRESET = {
  project: [
    { prop: "projectCode", label: "项目编号", width: 150 },
    { prop: "projectName", label: "项目名称", minWidth: 220 },
    { prop: "clientUnit", label: "委托单位", minWidth: 150 },
    { prop: "leaderNames", label: "负责人", width: 130 },
    { prop: "status", label: "项目状态", width: 100, align: "center", type: "status" },
    { prop: "closeTime", label: "办结日期", width: 112, align: "center", type: "date" },
    { prop: "internalOutput", label: "内产值", width: 110, align: "right", type: "money" },
    { prop: "externalOutput", label: "外产值", width: 110, align: "right", type: "money" }
  ],
  contract: [
    { prop: "contractNo", label: "合同编号", width: 160 },
    { prop: "contractName", label: "合同名称", minWidth: 220 },
    { prop: "clientUnit", label: "委托单位", minWidth: 160 },
    { prop: "contractAmount", label: "合同金额", width: 130, align: "right", type: "money" },
    { prop: "signDate", label: "签署日期", width: 112, align: "center", type: "date" }
  ],
  payment: [
    { prop: "projectCode", label: "工程编号", width: 140, align: "center" },
    { prop: "projectName", label: "项目名称", minWidth: 180 },
    { prop: "clientUnit", label: "客户全称", minWidth: 160 },
    { prop: "paymentType", label: "付款类型", width: 100, align: "center", type: "payType" },
    { prop: "amount", label: "金额(元)", width: 130, align: "right", type: "moneySigned" },
    { prop: "payTime", label: "到账时间", width: 112, align: "center", type: "date" },
    { prop: "payUnit", label: "付款单位", minWidth: 150 }
  ],
  debt: [
    { prop: "projectCode", label: "项目编号", width: 150 },
    { prop: "projectName", label: "项目名称", minWidth: 200 },
    { prop: "clientUnit", label: "委托单位", minWidth: 150 },
    { prop: "leaderNames", label: "负责人", width: 120 },
    { prop: "closeTime", label: "办结日期", width: 112, align: "center", type: "date" },
    { prop: "severity", label: "级别", width: 80, align: "center", type: "severity" },
    { prop: "days", label: "欠款天数", width: 100, align: "center" },
    { prop: "amount", label: "欠款金额", width: 130, align: "right", type: "money" },
    { prop: "hint", label: "说明", minWidth: 180 }
  ],
  overdue: [
    { prop: "projectCode", label: "项目编号", width: 150 },
    { prop: "projectName", label: "项目名称", minWidth: 200 },
    { prop: "clientUnit", label: "委托单位", minWidth: 150 },
    { prop: "leaderNames", label: "负责人", width: 120 },
    { prop: "severity", label: "级别", width: 80, align: "center", type: "severity" },
    { prop: "days", label: "超期(工作日)", width: 120, align: "center" },
    { prop: "hint", label: "说明", minWidth: 180 }
  ],
  contractMissing: [
    { prop: "projectCode", label: "项目编号", width: 150 },
    { prop: "projectName", label: "项目名称", minWidth: 200 },
    { prop: "clientUnit", label: "委托单位", minWidth: 150 },
    { prop: "leaderNames", label: "负责人", width: 120 },
    { prop: "severity", label: "级别", width: 80, align: "center", type: "severity" },
    { prop: "days", label: "未关联(工作日)", width: 130, align: "center" },
    { prop: "hint", label: "说明", minWidth: 180 }
  ]
}

const DATA_TYPES = ["data", "debt", "overdue", "contractMissing"]
const CLICKABLE = ["project", "data", "debt", "overdue", "contractMissing"]

const paged = computed(() => !DATA_TYPES.includes(props.type))
const columns = computed(() => props.columns || PRESET[props.type] || PRESET.project)

const emptyText = computed(() => ({
  project: "没有符合条件的项目",
  contract: "没有符合条件的合同",
  payment: "没有符合条件的到账记录"
}[props.type] || "暂无数据"))

const footHint = computed(() => (CLICKABLE.includes(props.type) ? "点击任意行查看项目详情" : ""))

const openLabel = computed(() => ({
  project: "在项目列表中打开",
  contract: "在合同列表中打开",
  payment: "在回款管理中打开"
}[props.type] || ""))

// ===== 数据 =====
const loading = ref(false)
const fetchedRows = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const rows = computed(() => (DATA_TYPES.includes(props.type) ? props.dataRows : fetchedRows.value))

const detailVisible = ref(false)
const detailId = ref(null)

watch(() => props.visible, v => {
  if (v) {
    pageNum.value = 1
    if (paged.value) fetchList()
  }
})

function fetchList() {
  loading.value = true
  const q = { ...props.query, pageNum: pageNum.value, pageSize: pageSize.value }
  let req
  if (props.type === "contract") req = listContract(q)
  else if (props.type === "payment") req = collectionReceivedDetail(q)
  else req = listProject(q)
  req.then(res => {
    fetchedRows.value = res.rows || []
    total.value = res.total || 0
  }).catch(() => {
    fetchedRows.value = []
    total.value = 0
  }).finally(() => {
    loading.value = false
  })
}

function onRowClick(row) {
  if (!CLICKABLE.includes(props.type)) return
  if (!row || !row.id && !row.projectId) return
  detailId.value = row.id || row.projectId
  detailVisible.value = true
}

function rowClass() {
  return CLICKABLE.includes(props.type) ? "drill-row-clickable" : ""
}

/** 在对应模块中打开（携带同口径筛选） */
function openInList() {
  const q = { ...props.query }
  delete q.pageNum
  delete q.pageSize
  delete q.outputOrder
  localVisible.value = false
  if (props.type === "project") {
    if (q.projectCategoryIds) {
      q.categoryIds = q.projectCategoryIds
      delete q.projectCategoryIds
    }
    router.push({ path: "/project/list", query: q })
  } else if (props.type === "contract") {
    if (q.signDateBegin) q.signDateBegin = q.signDateBegin
    router.push({ path: "/contract/list", query: q })
  } else if (props.type === "payment") {
    router.push({
      path: "/project/collection",
      query: {
        tab: "summary",
        beginDate: q.begin,
        endDate: q.end,
        clientUnit: q.clientUnit,
        leaderId: q.leaderId,
        projectCategoryId: q.projectCategoryId
      }
    })
  }
}

function dateOnly(v) {
  if (!v) return "-"
  return String(v).slice(0, 10)
}

function sevText(s) {
  return { high: "高", medium: "中", low: "低" }[s] || s || "-"
}

function formatMoney(val) {
  if (val == null) return "0"
  const num = Number(val)
  if (isNaN(num)) return "0"
  const abs = Math.abs(num)
  const sign = num < 0 ? "-" : ""
  if (abs >= 10000) return sign + (abs / 10000).toFixed(1).replace(/\.0$/, "") + "万"
  return sign + abs.toLocaleString("zh-CN", { maximumFractionDigits: 0 })
}
</script>

<style scoped lang="scss">
.drill-body { min-height: 180px; }

.drill-table {
  :deep(.drill-row-clickable) { cursor: pointer; }
}

.drill-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;

  .drill-hint { color: #909399; font-size: 12px; }
}

.amt-neg { color: #52c41a; }

.sev-tag {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.5;

  &.sev-high { color: #f5222d; background: rgba(245, 34, 45, 0.1); }
  &.sev-medium { color: #d48806; background: rgba(250, 173, 20, 0.16); }
  &.sev-low { color: #1890ff; background: rgba(24, 144, 255, 0.1); }
}
</style>
