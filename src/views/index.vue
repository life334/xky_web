<template>
  <div class="dashboard-container">
    <!-- ===== 段0 口径中枢（单行：周期 + 快捷期 + 筛选 + 对比期 + 快捷入口） ===== -->
    <div class="dash-header">
      <div class="header-left">
        <span class="stat-label">统计周期</span>
        <el-date-picker
          v-model="dateRange"
          class="dash-range"
          type="daterange"
          range-separator="~"
          start-placeholder="起始日期"
          end-placeholder="截止日期"
          value-format="YYYY-MM-DD"
          size="default"
          :shortcuts="dateShortcuts"
          @change="onDateRangeChange"
        />
        <el-radio-group v-model="quickPeriod" size="small" @change="onQuickPeriodChange">
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="quarter">本季</el-radio-button>
          <el-radio-button value="year">本年</el-radio-button>
        </el-radio-group>
        <el-popover placement="bottom-end" :width="300" trigger="click">
          <template #reference>
            <el-button size="small" :type="filterCount ? 'primary' : 'default'" plain>
              筛选<template v-if="filterCount">（{{ filterCount }}）</template> ▾
            </el-button>
          </template>
          <div class="filter-pop-body">
            <div class="filter-pop-item">
              <div class="filter-pop-label">委托单位</div>
              <el-select v-model="filters.clientUnit" filterable clearable placeholder="全部单位" style="width: 100%" @change="onFilterChange">
                <el-option v-for="u in clientUnitOptions" :key="u" :label="u" :value="u" />
              </el-select>
            </div>
            <div class="filter-pop-item">
              <div class="filter-pop-label">项目负责人</div>
              <el-select v-model="filters.leaderId" filterable clearable placeholder="全部负责人" style="width: 100%" @change="onFilterChange">
                <el-option v-for="u in leaderOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
              </el-select>
            </div>
            <div class="filter-pop-item">
              <div class="filter-pop-label">项目小类</div>
              <el-select v-model="filters.categoryId" filterable clearable placeholder="全部小类" style="width: 100%" @change="onFilterChange">
                <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </div>
            <div class="filter-pop-footer">
              <el-button size="small" text type="primary" @click="clearFilter">清空筛选</el-button>
            </div>
          </div>
        </el-popover>
      </div>
      <div class="header-right">
        <el-tooltip placement="bottom-end" effect="dark">
          <template #content>对比期 {{ compareText }}<br />环比基准：与本期紧邻的上一等长周期</template>
          <span class="compare-badge">?</span>
        </el-tooltip>
        <div class="quick-links">
          <button
            v-for="qk in quickLinks"
            :key="qk.path"
            class="quick-link-btn"
            type="button"
            @click="goPage(qk.path)"
          >{{ qk.label }}</button>
        </div>
        <el-dropdown class="quick-links-dropdown" trigger="click" @command="goPage">
          <el-button size="small" plain>＋ 快捷</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="qk in quickLinks" :key="qk.path" :command="qk.path">{{ qk.label }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 筛选生效胶囊 -->
    <div v-if="filterCount" class="filter-tags">
      <el-tag v-if="filters.clientUnit" closable size="small" @close="removeFilterTag('clientUnit')">单位：{{ filters.clientUnit }}</el-tag>
      <el-tag v-if="filters.leaderId" closable size="small" @close="removeFilterTag('leaderId')">负责人：{{ leaderNameOf(filters.leaderId) }}</el-tag>
      <el-tag v-if="filters.categoryId" closable size="small" @close="removeFilterTag('categoryId')">小类：{{ categoryNameOf(filters.categoryId) }}</el-tag>
    </div>

    <!-- ===== 段1 经营快照：六磁贴 ===== -->
    <div class="seg-head">
      <span class="seg-title">经营快照</span>
      <span class="seg-pill">新增按安排日期 · 办结/产值按办结日期 · 到账按到账日期</span>
      <span class="kpi-strip">
        进行中 <b>{{ kpi.activeProjects ?? 0 }}</b> · 在册 <b>{{ kpi.allProjects ?? 0 }}</b> · 本期办结率 <b>{{ kpi.completedRate ?? 0 }}%</b>
      </span>
    </div>
    <div class="tile-row" v-loading="loading">
      <div v-for="t in tiles" :key="t.key" class="tile tile-click" @click="t.drill()">
        <div class="tile-label">
          {{ t.label }}
          <span v-if="t.pill" class="tile-pill">{{ t.pill }}</span>
        </div>
        <div class="tile-value">
          <template v-if="t.money">¥{{ formatMoney(t.value) }}</template>
          <template v-else>{{ t.value }}<span class="tile-unit">个</span></template>
        </div>
        <div class="tile-delta">
          <span
            v-if="t.delta != null"
            :class="['tile-trend', deltaClass(t.delta)]"
          >{{ deltaText(t.delta) }}<em> {{ t.deltaLabel }}</em></span>
          <span class="tile-prev">{{ t.prevText }}</span>
        </div>
      </div>
    </div>

    <!-- ===== 段2 业务结构：类型构成 + 类型画像 / 本期办结占比 ===== -->
    <div class="seg-head">
      <span class="seg-title">业务结构</span>
      <span class="seg-pill">数量/合同额按安排日期 · 产值按办结日期 · 类型口径：定线/验线/管线图/实测/其它</span>
    </div>
    <div class="chart-row">
      <div class="chart-card chart-wide" v-loading="structureLoading">
        <div class="chart-header">
          <span class="chart-title">项目类型构成与产值画像</span>
          <span class="chart-subtitle">按类型占比 · 点击饼图或表格行可下钻</span>
        </div>
        <div class="pie-quad">
          <div class="pie-cell">
            <div class="pie-cap">项目数量<span class="pie-cap-total">{{ pieCapTotal("count") }}</span></div>
            <div ref="pieCountRef" class="pie-canvas"></div>
          </div>
          <div class="pie-cell">
            <div class="pie-cap">合同额<span class="pie-cap-total">{{ pieCapTotal("contractAmount") }}</span></div>
            <div ref="pieContractRef" class="pie-canvas"></div>
          </div>
          <div class="pie-cell">
            <div class="pie-cap">内产值<span class="pie-cap-total">{{ pieCapTotal("internalOutput") }}</span></div>
            <div ref="pieInternalRef" class="pie-canvas"></div>
          </div>
          <div class="pie-cell">
            <div class="pie-cap">外产值<span class="pie-cap-total">{{ pieCapTotal("externalOutput") }}</span></div>
            <div ref="pieExternalRef" class="pie-canvas"></div>
          </div>
        </div>
        <div class="bucket-legend">
          <span v-for="c in categoryStats" :key="c.bucket" class="bucket-legend-item">
            <span class="bucket-dot" :style="{ background: BUCKET_COLORS[c.bucket] }"></span>{{ c.bucketName }}
          </span>
        </div>
        <div class="profile-wrap">
            <table class="profile-table">
              <thead>
                <tr>
                  <th class="pt-name">类型</th>
                  <th class="pt-num">数量</th>
                  <th class="pt-num">占比</th>
                  <th class="pt-num">合同额</th>
                  <th class="pt-num">内产值</th>
                  <th class="pt-num">外产值</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in categoryStats" :key="c.bucket" class="profile-row" @click="bucketDrill(c)">
                  <td class="pt-name">
                    <span class="bucket-dot" :style="{ background: BUCKET_COLORS[c.bucket] }"></span>{{ c.bucketName }}
                  </td>
                  <td class="pt-num">{{ c.count }}</td>
                  <td class="pt-num">{{ c.ratio }}%</td>
                  <td class="pt-num">¥{{ formatMoney(c.contractAmount) }}</td>
                  <td class="pt-num">¥{{ formatMoney(c.internalOutput) }}</td>
                  <td class="pt-num pt-strong">¥{{ formatMoney(c.externalOutput) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="externalMissing > 0" class="profile-missing">另有 {{ externalMissing }} 行工作量未填外部产值，未计入产值列</div>
          </div>
      </div>
      <div class="chart-card chart-narrow" v-loading="structureLoading">
        <div class="chart-header">
          <span class="chart-title">本期办结占比</span>
          <span class="chart-subtitle">共 {{ closedTotal }} 个</span>
        </div>
        <template v-if="closedSegments.length">
          <div class="stacked-bar">
            <div
              v-for="seg in closedSegments"
              :key="seg.bucket"
              class="stacked-seg"
              :style="{ width: seg.width + '%', background: BUCKET_COLORS[seg.bucket] }"
              :title="seg.bucketName + ' ' + seg.count + ' 个（' + seg.ratio + '%）'"
            ></div>
          </div>
          <div class="stacked-legend">
            <div v-for="seg in closedSegments" :key="seg.bucket" class="stacked-legend-item">
              <span class="bucket-dot" :style="{ background: BUCKET_COLORS[seg.bucket] }"></span>
              <span class="stacked-legend-name">{{ seg.bucketName }}</span>
              <span class="stacked-legend-num">{{ seg.count }} 个 · {{ seg.ratio }}%</span>
            </div>
          </div>
        </template>
        <el-empty v-else description="本期暂无办结项目" :image-size="60" />
      </div>
    </div>

    <!-- ===== 段3 人员效能：项目经理 × 类型矩阵 ===== -->
    <div class="seg-head">
      <span class="seg-title">人员效能</span>
      <span class="seg-pill">多负责人项目按人重复计数 · 颜色仅标识类型，大小看数字与条长</span>
    </div>
    <div class="chart-card matrix-card" v-loading="structureLoading">
      <div class="chart-header">
        <span class="chart-title">项目经理 × 类型</span>
        <span class="chart-subtitle">点列头排序 · 点格子下钻</span>
        <el-radio-group v-model="matrixMetric" size="small">
          <el-radio-button value="count">项目数</el-radio-button>
          <el-radio-button value="internalOutput">内产值</el-radio-button>
          <el-radio-button value="externalOutput">外产值</el-radio-button>
        </el-radio-group>
      </div>
      <div class="matrix-scroll scrollbar">
        <table class="mx-table">
          <thead>
            <tr>
              <th class="mx-th-name">
                <span class="mx-sort" :class="{ active: matrixSortKey === 'total' }" @click="sortMatrix('total')">
                  负责人<em>{{ sortMark('total') }}</em>
                </span>
              </th>
              <th v-for="b in matrixBuckets" :key="b" class="mx-th">
                <span class="mx-sort" :class="{ active: matrixSortKey === b }" @click="sortMatrix(b)">
                  {{ bucketName(b) }}<em>{{ sortMark(b) }}</em>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in matrixRows" :key="row.leaderId">
              <td class="mx-name">
                <div class="mx-name-txt">{{ row.leaderName }}</div>
                <div class="mx-name-sub">合计 {{ fmtMetric(row.total) }}</div>
              </td>
              <td
                v-for="b in matrixBuckets"
                :key="b"
                class="mx-cell"
                :class="{ 'mx-cell-hit': mxVal(row, b) > 0 }"
                @click="matrixCellClick(row, b)"
              >
                <template v-if="mxVal(row, b) > 0">
                  <span class="mx-num">{{ fmtMetric(mxVal(row, b)) }}</span>
                  <div class="mx-bar">
                    <div class="mx-bar-fill" :style="{ width: mxBarPct(mxVal(row, b)), background: BUCKET_COLORS[b] }"></div>
                  </div>
                </template>
                <span v-else class="mx-zero">—</span>
              </td>
            </tr>
            <tr v-if="!matrixRows.length" class="mx-empty-row">
              <td :colspan="matrixBuckets.length + 1">
                <el-empty description="暂无负责人数据" :image-size="50" />
              </td>
            </tr>
          </tbody>
          <tfoot v-if="matrixRows.length">
            <tr class="mx-total-row">
              <td class="mx-name">合计</td>
              <td v-for="b in matrixBuckets" :key="b" class="mx-cell">{{ fmtMetric(mxTotal(b)) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- ===== 段4 经营走势 ===== -->
    <div class="seg-head">
      <span class="seg-title">经营走势</span>
      <span class="seg-pill">产值按办结日期 · 仅外部产值 · 到账按到账日期</span>
    </div>
    <div class="chart-row">
      <div class="chart-card chart-wide" v-loading="trendLoading">
        <div class="chart-header">
          <span class="chart-title">外部产值累计趋势</span>
          <span class="chart-subtitle">柱=当月增量 · 线=年内累计</span>
        </div>
        <div ref="cumulativeRef" class="chart-canvas"></div>
      </div>
      <div class="chart-card chart-narrow" v-loading="trendLoading">
        <div class="chart-header">
          <span class="chart-title">项目动态</span>
          <span class="chart-subtitle">新增按安排日期 · 到账为金额线</span>
        </div>
        <div ref="dynamicRef" class="chart-canvas"></div>
      </div>
    </div>

    <!-- ===== 段5 风险与执行 ===== -->
    <div class="seg-head">
      <span class="seg-title">风险与执行</span>
      <span class="risk-badges">
        <span class="risk-badge">欠款 {{ riskCounts.debtCount ?? 0 }}</span>
        <span class="risk-badge">工期超期 {{ riskCounts.overdueCount ?? 0 }}</span>
        <span class="risk-badge">未关联合同 {{ riskCounts.contractMissingCount ?? 0 }}</span>
        <span class="risk-badge">待办 {{ riskCounts.alertCount ?? 0 }}</span>
      </span>
    </div>
    <div class="chart-row last">
      <div class="chart-card chart-wide">
        <div class="chart-header">
          <span class="chart-title">应收欠款（按办结年份）</span>
          <span class="chart-subtitle">欠款 = 外产值 − 已到账 · 线为回款率</span>
        </div>
        <div ref="debtRef" class="debt-canvas" v-loading="riskLoading"></div>
        <div class="chart-header risk-list-header">
          <span class="chart-title">风险行动清单</span>
          <span class="chart-subtitle">按严重度排序 · 点击跳转处理</span>
        </div>
        <div class="risk-list" v-loading="riskLoading">
          <div
            v-for="it in riskItems"
            :key="it.type + '-' + it.projectId"
            class="risk-item"
            :class="'sev-' + it.severity"
            @click="riskItemClick(it)"
          >
            <span class="risk-dot"></span>
            <div class="risk-main">
              <div class="risk-line1">
                <span class="risk-type">{{ riskTypeText(it.type) }}</span>
                <span class="risk-code">{{ it.projectCode }}</span>
                <span class="risk-days">{{ it.days }}天</span>
              </div>
              <div class="risk-line2">
                {{ it.clientUnit || it.projectName }}<template v-if="it.leaderNames"> · {{ it.leaderNames }}</template>
              </div>
              <div class="risk-hint">{{ it.hint }}</div>
            </div>
          </div>
          <el-empty v-if="!riskLoading && !riskItems.length" description="暂无风险项，一切正常" :image-size="60" />
        </div>
      </div>
      <div class="chart-card chart-narrow">
        <div class="chart-header">
          <span class="chart-title">项目产值排行</span>
          <span class="chart-subtitle">TOP10 · 累计外部产值</span>
        </div>
        <div class="rank-list">
          <div
            v-for="(item, idx) in outputTop"
            :key="item.projectId ?? idx"
            class="rank-item"
            @click="goProjectDetail(item.projectId)"
          >
            <span class="rank-badge" :class="'rank-top-' + (idx + 1)">{{ idx + 1 }}</span>
            <div class="rank-name">
              <span class="rank-code" :title="item.projectCode">{{ item.projectCode || "—" }}</span>
              <span class="rank-sub" :title="item.clientUnit || item.projectName">{{ item.clientUnit || item.projectName || "" }}</span>
            </div>
            <div class="rank-bar">
              <div class="rank-bar-fill" :style="{ width: barWidth(item.output) }"></div>
            </div>
            <span class="rank-amount">¥{{ formatMoney(item.output) }}</span>
          </div>
          <el-empty v-if="!riskLoading && !outputTop.length" description="暂无产值数据" :image-size="50" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="Index">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from "vue"
import { useRouter } from "vue-router"
import * as echarts from "echarts"
import {
  getDashboardSummary,
  getDashboardStructure,
  getDashboardTrend,
  getDashboardRisk
} from "@/api/project/dashboard"
import { getLeaderOptions, getDistinctValues } from "@/api/project/project"
import { categoryTreeselectFull } from "@/api/project/category"

const router = useRouter()

// ===== 类型 5 桶（口径与后端契约一致：定线/验线/管线图/实测/其它） =====
const DEFAULT_BUCKETS = ["dingxian", "yinxian", "guanxiantu", "shice", "qita"]
const BUCKET_NAMES = { dingxian: "定线", yinxian: "验线", guanxiantu: "管线图", shice: "实测", qita: "其它" }
const BUCKET_COLORS = {
  dingxian: "#1890ff",
  yinxian: "#52c41a",
  guanxiantu: "#722ed1",
  shice: "#fa8c16",
  qita: "#909399"
}
const RISK_TYPE_TEXT = { debt: "欠款逾期", overdue: "工期超期", contractMissing: "未关联合同" }

// ===== 段0：周期与筛选 =====
const quickPeriod = ref("month")
const dateRange = ref([])
const dateShortcuts = [
  { text: "本月", value: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth(), 1), new Date()] } },
  { text: "本季", value: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return [new Date(d.getFullYear(), q * 3, 1), new Date()] } },
  { text: "本年", value: () => { const d = new Date(); return [new Date(d.getFullYear(), 0, 1), new Date()] } },
  { text: "近3个月", value: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth() - 2, 1), new Date()] } },
  { text: "近6个月", value: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth() - 5, 1), new Date()] } },
]

const filters = reactive({ clientUnit: undefined, leaderId: undefined, categoryId: undefined })
const clientUnitOptions = ref([])
const leaderOptions = ref([])
const categoryOptions = ref([])

const quickLinks = [
  { label: "新增项目", path: "/project/list" },
  { label: "录入工作量", path: "/settlement" },
  { label: "登记合同", path: "/contract/list" },
  { label: "提交资料", path: "/material" }
]

const filterCount = computed(() =>
  (filters.clientUnit ? 1 : 0) + (filters.leaderId ? 1 : 0) + (filters.categoryId ? 1 : 0)
)

function leaderNameOf(id) {
  const u = leaderOptions.value.find(x => String(x.userId) === String(id))
  return u ? u.nickName : id
}
function categoryNameOf(id) {
  const c = categoryOptions.value.find(x => String(x.id) === String(id))
  return c ? c.name : id
}

/** 本地日期格式化（避免 toISOString 的 UTC 时区坑） */
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function initDateRange() {
  const now = new Date()
  dateRange.value = [fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), fmtDate(now)]
}

function setRangeByQuick(val) {
  const now = new Date()
  let b
  if (val === "month") b = new Date(now.getFullYear(), now.getMonth(), 1)
  else if (val === "quarter") { const q = Math.floor(now.getMonth() / 3); b = new Date(now.getFullYear(), q * 3, 1) }
  else b = new Date(now.getFullYear(), 0, 1)
  dateRange.value = [fmtDate(b), fmtDate(now)]
}

function onQuickPeriodChange(val) {
  setRangeByQuick(val)
  fetchAll()
}

function onDateRangeChange() {
  if (dateRange.value && dateRange.value.length === 2) {
    quickPeriod.value = ""
    fetchAll()
  }
}

/** 对比期 = 紧贴本期之前的等长周期（与后端缺省推算逻辑一致） */
const compareRange = computed(() => {
  if (!dateRange.value || dateRange.value.length !== 2) return []
  const b = new Date(dateRange.value[0] + "T00:00:00")
  const e = new Date(dateRange.value[1] + "T00:00:00")
  const days = Math.round((e - b) / 86400000) + 1
  const ce = new Date(b); ce.setDate(ce.getDate() - 1)
  const cb = new Date(ce); cb.setDate(cb.getDate() - (days - 1))
  return [fmtDate(cb), fmtDate(ce)]
})
const compareText = computed(() => {
  const r = compareRange.value
  return r.length === 2 ? `${r[0]} ~ ${r[1]}` : "—"
})

function onFilterChange() { fetchAll() }
function clearFilter() {
  filters.clientUnit = undefined
  filters.leaderId = undefined
  filters.categoryId = undefined
  fetchAll()
}
function removeFilterTag(key) {
  filters[key] = undefined
  fetchAll()
}

// ===== 公共入参 =====
function buildParams() {
  const p = {}
  if (dateRange.value && dateRange.value.length === 2) {
    p.beginDate = dateRange.value[0]
    p.endDate = dateRange.value[1]
  }
  const cr = compareRange.value
  if (cr.length === 2) {
    p.compareBeginDate = cr[0]
    p.compareEndDate = cr[1]
  }
  if (filters.clientUnit) p.clientUnit = filters.clientUnit
  if (filters.leaderId) p.leaderId = filters.leaderId
  if (filters.categoryId) p.categoryId = filters.categoryId
  return p
}

// ===== 数据 =====
const loading = ref(false)
const structureLoading = ref(false)
const trendLoading = ref(false)
const riskLoading = ref(false)
const summary = ref({})
const structure = ref({})
const trend = ref({})
const risk = ref({})

// ===== 图表 refs =====
const pieCountRef = ref(null)
const pieContractRef = ref(null)
const pieInternalRef = ref(null)
const pieExternalRef = ref(null)
const cumulativeRef = ref(null)
const dynamicRef = ref(null)
const debtRef = ref(null)
let charts = {}

// ===== 计算属性 =====
const kpi = computed(() => summary.value.kpi || {})
const categoryStats = computed(() => structure.value.categoryStats || [])
const externalMissing = computed(() => (structure.value.meta || {}).externalOutputMissingCount || 0)
const matrixBuckets = computed(() => {
  const b = (structure.value.leaderMatrix || {}).buckets
  return b && b.length ? b : DEFAULT_BUCKETS
})
const bucketCategoryId = computed(() => {
  const m = {}
  categoryStats.value.forEach(c => { if (c.categoryId) m[c.bucket] = c.categoryId })
  return m
})

const closedTotal = computed(() =>
  (structure.value.closedByBucket || []).reduce((s, c) => s + Number(c.count || 0), 0)
)
const closedSegments = computed(() => {
  const list = (structure.value.closedByBucket || []).filter(c => Number(c.count) > 0)
  const total = list.reduce((s, c) => s + Number(c.count), 0)
  if (!total) return []
  return list.map(c => ({ ...c, width: Number(c.count) / total * 100 }))
})

const riskItems = computed(() => risk.value.riskItems || [])
const riskCounts = computed(() => risk.value.counts || {})
const outputTop = computed(() => risk.value.projectOutputTop || [])
const maxOutput = computed(() => {
  const list = outputTop.value
  return list.length ? Math.max(...list.map(d => Number(d.output) || 0)) : 0
})

// ===== 段1 六磁贴 =====
const tiles = computed(() => {
  const snap = summary.value.snapshot || {}
  const ac = snap.annualContract || {}
  const mc = snap.monthContract || {}
  const pn = snap.periodNew || {}
  const pc = snap.periodCompleted || {}
  const pp = snap.periodPayment || {}
  const po = snap.periodOverdue || {}
  return [
    {
      key: "annualContract", label: "本年合同额", pill: "按签署日期", money: true,
      value: ac.value ?? 0, prev: ac.prev ?? 0, delta: ac.deltaPct ?? null, deltaLabel: ac.deltaLabel || "同比",
      prevText: `上年 ¥${formatMoney(ac.prev ?? 0)}`,
      drill: () => goPage("/contract/list")
    },
    {
      key: "monthContract", label: "本月合同额", pill: "按签署日期", money: true,
      value: mc.value ?? 0, prev: mc.prev ?? 0, delta: mc.deltaPct ?? null, deltaLabel: mc.deltaLabel || "环比",
      prevText: `上月 ¥${formatMoney(mc.prev ?? 0)}`,
      drill: () => goPage("/contract/list")
    },
    {
      key: "periodNew", label: "本期新增", pill: "按安排日期", money: false,
      value: pn.value ?? 0, prev: pn.prev ?? 0,
      prevText: `上期 ${pn.prev ?? 0} 个`,
      drill: () => drillProjects({ dateField: "assign" })
    },
    {
      key: "periodCompleted", label: "本期办结", pill: "按办结日期", money: false,
      value: pc.value ?? 0, prev: pc.prev ?? 0,
      prevText: `上期 ${pc.prev ?? 0} 个`,
      drill: () => drillProjects({ dateField: "close" })
    },
    {
      key: "periodPayment", label: "本期到账", pill: "按到账日期", money: true,
      value: pp.value ?? 0, prev: pp.prev ?? 0,
      prevText: `上期 ¥${formatMoney(pp.prev ?? 0)}`,
      drill: () => goCollection()
    },
    {
      key: "periodOverdue", label: "本期超期", pill: "手动录入项目", money: false,
      value: po.value ?? 0, prev: po.prev ?? 0,
      prevText: `上期 ${po.prev ?? 0} 个`,
      drill: () => drillProjects({ overdue: "true" })
    }
  ]
})

function deltaClass(delta) {
  return Number(delta) > 0 ? "up" : Number(delta) < 0 ? "down" : "flat"
}
function deltaText(delta) {
  const v = Number(delta)
  if (v > 0) return `+${v}%`
  if (v < 0) return `${v}%`
  return "持平"
}

// ===== 段3 效能矩阵 =====
const matrixMetric = ref("count")
const matrixSortKey = ref("total")
const matrixSortDesc = ref(true)

const matrixRows = computed(() => {
  const leaders = (structure.value.leaderMatrix || {}).leaders || []
  const metric = matrixMetric.value
  const rows = leaders.map(l => {
    const total = metric === "count" ? l.totalCount
      : metric === "internalOutput" ? l.totalInternal : l.totalExternal
    const cells = {}
    matrixBuckets.value.forEach(b => {
      const c = (l.cells || {})[b] || {}
      cells[b] = Number(c[metric]) || 0
    })
    return { leaderId: l.leaderId, leaderName: l.leaderName, total: Number(total) || 0, cells }
  })
  const key = matrixSortKey.value
  const val = r => (key === "total" ? r.total : (r.cells[key] || 0))
  rows.sort((a, b) => (matrixSortDesc.value ? val(b) - val(a) : val(a) - val(b)))
  return rows
})
const matrixMax = computed(() => {
  let max = 1
  matrixRows.value.forEach(r => {
    if (r.total > max) max = r.total
    Object.values(r.cells).forEach(v => { if (v > max) max = v })
  })
  return max
})

function bucketName(b) { return BUCKET_NAMES[b] || b }
function mxVal(row, b) { return b === "total" ? row.total : (row.cells[b] || 0) }
function mxTotal(b) { return matrixRows.value.reduce((s, r) => s + (r.cells[b] || 0), 0) }
function mxBarPct(v) {
  if (v <= 0) return "0%"
  return Math.max(4, Math.round(v / matrixMax.value * 100)) + "%"
}
function fmtMetric(v) { return matrixMetric.value === "count" ? (v ?? 0) : formatMoney(v) }
function sortMark(b) {
  if (matrixSortKey.value !== b) return ""
  return matrixSortDesc.value ? "↓" : "↑"
}
function sortMatrix(b) {
  if (matrixSortKey.value === b) {
    matrixSortDesc.value = !matrixSortDesc.value
  } else {
    matrixSortKey.value = b
    matrixSortDesc.value = true
  }
}
function matrixCellClick(row, b) {
  const v = mxVal(row, b)
  if (v <= 0) return
  const extra = { leaderId: row.leaderId }
  const cid = bucketCategoryId.value[b]
  if (cid) extra.categoryId = cid
  drillProjects(extra)
}

// ===== 格式化 =====
function formatMoney(val) {
  if (val == null) return "0"
  const num = Number(val)
  if (isNaN(num)) return "0"
  if (Math.abs(num) >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, "") + "万"
  return num.toLocaleString("zh-CN", { maximumFractionDigits: 0 })
}

/** 条形宽度：按榜首值等比缩放，最小保留 6% 保证可见 */
function barWidth(val) {
  const max = maxOutput.value
  if (!max) return "0%"
  const pct = (Number(val) || 0) / max * 100
  return Math.max(6, Math.round(pct)) + "%"
}

// ===== 拉取数据（summary 唯一首屏阻塞，其余并行） =====
async function fetchSummary() {
  loading.value = true
  try {
    const res = await getDashboardSummary(buildParams())
    summary.value = res.data || {}
  } catch (e) {
    console.error("Dashboard summary error:", e)
  } finally {
    loading.value = false
  }
}

async function fetchStructure() {
  structureLoading.value = true
  try {
    const res = await getDashboardStructure(buildParams())
    structure.value = res.data || {}
    await nextTick()
    renderPies()
  } catch (e) {
    console.error("Dashboard structure error:", e)
  } finally {
    structureLoading.value = false
  }
}

async function fetchTrend() {
  trendLoading.value = true
  try {
    const res = await getDashboardTrend(buildParams())
    trend.value = res.data || {}
    await nextTick()
    renderCumulativeChart()
    renderDynamicChart()
  } catch (e) {
    console.error("Dashboard trend error:", e)
  } finally {
    trendLoading.value = false
  }
}

async function fetchRisk() {
  riskLoading.value = true
  try {
    const res = await getDashboardRisk(buildParams())
    risk.value = res.data || {}
    await nextTick()
    renderDebtChart()
  } catch (e) {
    console.error("Dashboard risk error:", e)
  } finally {
    riskLoading.value = false
  }
}

function fetchAll() {
  fetchSummary()
  fetchStructure()
  fetchTrend()
  fetchRisk()
}

// ===== 图表渲染 =====
function renderPies() {
  renderBucketPie(pieCountRef.value, "pieCount", "count")
  renderBucketPie(pieContractRef.value, "pieContract", "contractAmount")
  renderBucketPie(pieInternalRef.value, "pieInternal", "internalOutput")
  renderBucketPie(pieExternalRef.value, "pieExternal", "externalOutput")
}

/** 饼图标题右侧合计 */
function pieCapTotal(metric) {
  const total = categoryStats.value.reduce((s, c) => s + (Number(c[metric]) || 0), 0)
  return metric === "count" ? total + " 个" : "¥" + formatMoney(total)
}

/** 单个「按类型占比」饼图：颜色标识类型，合计显示在标题右侧，点击切片下钻 */
function renderBucketPie(el, chartKey, metric) {
  if (!el) return
  if (!charts[chartKey]) charts[chartKey] = echarts.init(el)
  const chart = charts[chartKey]
  const money = metric !== "count"
  const rows = categoryStats.value.filter(c => Number(c[metric]) > 0)
  const data = rows.map(c => ({
    name: c.bucketName,
    value: Number(c[metric]) || 0,
    categoryId: c.categoryId,
    itemStyle: { color: BUCKET_COLORS[c.bucket] || "#c0c4cc" }
  }))
  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: p => `${p.marker} ${p.name}<br/>${money ? "¥" + formatMoney(p.value) : p.value + " 个"}（${p.percent}%）`
    },
    series: [{
      type: "pie", radius: "72%", center: ["50%", "50%"],
      avoidLabelOverlap: false,
      label: { show: false },
      labelLine: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.12)" } },
      labelLine: { show: false },
      data: data.length ? data : [{ name: "暂无数据", value: 0, itemStyle: { color: "#e8eaed" } }]
    }]
  }, true)
  chart.off("click").on("click", params => {
    const d = params.data || {}
    if (d.categoryId) drillProjects({ categoryId: d.categoryId })
  })
}

// 段4 左：外部产值月增量（柱）+ 累计（面积线），双 Y 轴
function renderCumulativeChart() {
  const el = cumulativeRef.value
  if (!el) return
  if (!charts.cumulative) charts.cumulative = echarts.init(el)
  const chart = charts.cumulative
  const data = trend.value.cumulativeOutput || []
  const labels = data.map(d => d.label)
  const monthly = data.map(d => Number(d.monthly) || 0)
  const cumulative = data.map(d => Number(d.cumulative) || 0)

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: p => {
        let h = `<b>${p[0].axisValue}</b><br/>`
        p.forEach(v => { h += `${v.marker} ${v.seriesName}: ¥${formatMoney(v.value)}<br/>` })
        return h
      }
    },
    legend: { data: ["当月产值", "累计产值"], bottom: 0, icon: "rect", itemWidth: 10, itemHeight: 10, textStyle: { color: "#909399", fontSize: 12 } },
    grid: { top: 16, left: 8, right: 52, bottom: 36, containLabel: true },
    xAxis: {
      type: "category", data: labels, boundaryGap: true,
      axisLine: { lineStyle: { color: "#e8eaed" } },
      axisLabel: { color: "#909399", fontSize: 11, rotate: labels.length > 8 ? 30 : 0 },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: "value", name: "当月",
        splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
        axisLabel: { color: "#909399", fontSize: 11, formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + "万" : v }
      },
      {
        type: "value", name: "累计",
        splitLine: { show: false },
        axisLabel: { color: "#909399", fontSize: 11, formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + "万" : v }
      }
    ],
    series: [
      {
        name: "当月产值", type: "bar", data: monthly,
        barWidth: "38%", itemStyle: { color: "#1890ff", borderRadius: [3, 3, 0, 0] }
      },
      {
        name: "累计产值", type: "line", data: cumulative, yAxisIndex: 1,
        smooth: true, symbol: "circle", symbolSize: 5,
        lineStyle: { width: 3, color: "#52c41a" },
        itemStyle: { color: "#52c41a", borderWidth: 2, borderColor: "#fff" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(82,196,26,0.25)" },
            { offset: 1, color: "rgba(82,196,26,0.02)" }
          ])
        },
        endLabel: {
          show: true,
          formatter: p => `¥${formatMoney(p.value)}`,
          color: "#52c41a", fontSize: 11, offset: [10, 0]
        }
      }
    ]
  }, true)
}

// 段4 右：项目动态（新增/办结柱 + 到账金额线，双 Y 轴）
function renderDynamicChart() {
  const el = dynamicRef.value
  if (!el) return
  if (!charts.dynamic) charts.dynamic = echarts.init(el)
  const chart = charts.dynamic
  const data = trend.value.dynamicTrend || []
  const labels = data.map(d => d.label)
  const newP = data.map(d => Number(d.newProjects) || 0)
  const completedP = data.map(d => Number(d.completedProjects) || 0)
  const payAmt = data.map(d => Number(d.paymentAmount) || 0)

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: p => {
        let h = `<b>${p[0].axisValue}</b><br/>`
        p.forEach(v => {
          const isMoney = v.seriesName === "到账金额"
          h += `${v.marker} ${v.seriesName}: ${isMoney ? "¥" + formatMoney(v.value) : v.value + " 个"}<br/>`
        })
        return h
      }
    },
    legend: { data: ["新增", "办结", "到账金额"], bottom: 0, icon: "rect", itemWidth: 10, itemHeight: 10, textStyle: { color: "#909399", fontSize: 12 } },
    grid: { top: 16, left: 8, right: 52, bottom: 36, containLabel: true },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: "#e8eaed" } },
      axisLabel: { color: "#909399", fontSize: 11, rotate: labels.length > 8 ? 30 : 0 },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: "value", minInterval: 1,
        splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
        axisLabel: { color: "#909399", fontSize: 11 }
      },
      {
        type: "value",
        splitLine: { show: false },
        axisLabel: { color: "#909399", fontSize: 11, formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + "万" : v }
      }
    ],
    series: [
      { name: "新增", type: "bar", data: newP, barWidth: "28%", itemStyle: { color: "#1890ff", borderRadius: [3, 3, 0, 0] } },
      { name: "办结", type: "bar", data: completedP, barWidth: "28%", itemStyle: { color: "#52c41a", borderRadius: [3, 3, 0, 0] } },
      {
        name: "到账金额", type: "line", data: payAmt, yAxisIndex: 1,
        smooth: true, symbol: "circle", symbolSize: 5,
        lineStyle: { width: 2, color: "#fa8c16" },
        itemStyle: { color: "#fa8c16", borderWidth: 2, borderColor: "#fff" }
      }
    ]
  }, true)
}

// 段5 左上：欠款按年（柱）+ 回款率（线），双 Y 轴
function renderDebtChart() {
  const el = debtRef.value
  if (!el) return
  if (!charts.debt) charts.debt = echarts.init(el)
  const chart = charts.debt
  const data = risk.value.debtByYear || []
  const labels = data.map(d => d.year + "年")
  const debt = data.map(d => Number(d.debt) || 0)
  const rate = data.map(d => Number(d.collectionRate) || 0)

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: p => {
        let h = `<b>${p[0].axisValue}</b><br/>`
        p.forEach(v => {
          h += v.seriesName === "回款率"
            ? `${v.marker} ${v.seriesName}: ${v.value}%<br/>`
            : `${v.marker} ${v.seriesName}: ¥${formatMoney(v.value)}<br/>`
        })
        return h
      }
    },
    legend: { data: ["欠款", "回款率"], bottom: 0, icon: "rect", itemWidth: 10, itemHeight: 10, textStyle: { color: "#909399", fontSize: 12 } },
    grid: { top: 16, left: 8, right: 44, bottom: 30, containLabel: true },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: "#e8eaed" } },
      axisLabel: { color: "#909399", fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: "value",
        splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
        axisLabel: { color: "#909399", fontSize: 11, formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + "万" : v }
      },
      {
        type: "value", max: 100, min: 0,
        splitLine: { show: false },
        axisLabel: { color: "#909399", fontSize: 11, formatter: "{value}%" }
      }
    ],
    series: [
      {
        name: "欠款", type: "bar", data: debt,
        barWidth: "40%", itemStyle: { color: "#ff7875", borderRadius: [3, 3, 0, 0] }
      },
      {
        name: "回款率", type: "line", data: rate, yAxisIndex: 1,
        smooth: true, symbol: "circle", symbolSize: 5,
        lineStyle: { width: 2, color: "#36cfc9" },
        itemStyle: { color: "#36cfc9", borderWidth: 2, borderColor: "#fff" }
      }
    ]
  }, true)
}

// ===== 下钻导航 =====
function goPage(path) { router.push(path) }
function goProjectDetail(id) { router.push({ path: "/project/list", query: { id } }) }

/** 下钻项目列表（携带当前周期 + 轻筛选） */
function drillProjects(extra) {
  const q = {}
  if (dateRange.value && dateRange.value.length === 2) {
    q.beginDate = dateRange.value[0]
    q.endDate = dateRange.value[1]
  }
  if (filters.clientUnit) q.clientUnit = filters.clientUnit
  if (filters.leaderId) q.leaderId = filters.leaderId
  if (filters.categoryId) q.categoryId = filters.categoryId
  Object.assign(q, extra || {})
  router.push({ path: "/project/list", query: q })
}

/** 下钻回款管理页「到账统计」tab */
function goCollection() {
  const q = { tab: "summary" }
  if (dateRange.value && dateRange.value.length === 2) {
    q.beginDate = dateRange.value[0]
    q.endDate = dateRange.value[1]
  }
  if (filters.clientUnit) q.clientUnit = filters.clientUnit
  if (filters.leaderId) q.leaderId = filters.leaderId
  if (filters.categoryId) q.projectCategoryId = filters.categoryId
  router.push({ path: "/project/collection", query: q })
}

function bucketDrill(c) {
  if (c.categoryId) drillProjects({ categoryId: c.categoryId })
  else drillProjects({})
}

function riskTypeText(t) { return RISK_TYPE_TEXT[t] || t }
function riskItemClick(it) {
  if (it.type === "contractMissing") drillProjects({ contractStatus: "unbound" })
  else if (it.type === "overdue") drillProjects({ overdue: "true" })
  else goProjectDetail(it.projectId)
}

// ===== 窗口缩放 =====
function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

// ===== 筛选下拉数据 =====
function loadFilterOptions() {
  getDistinctValues("client_unit").then(res => {
    clientUnitOptions.value = res.data || []
  }).catch(() => { /* 下拉加载失败不影响主流程 */ })
  getLeaderOptions().then(res => {
    leaderOptions.value = res.data || []
  }).catch(() => { /* 下拉加载失败不影响主流程 */ })
  categoryTreeselectFull().then(res => {
    const flat = []
    const walk = nodes => (nodes || []).forEach(n => {
      flat.push({ id: n.id, name: n.name || n.label })
      if (n.children && n.children.length) walk(n.children)
    })
    walk(res.data)
    categoryOptions.value = flat
  }).catch(() => { /* 下拉加载失败不影响主流程 */ })
}

// ===== 生命周期 =====
onMounted(() => {
  initDateRange()
  loadFilterOptions()
  fetchAll()
  window.addEventListener("resize", handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize)
  Object.values(charts).forEach(c => c?.dispose())
  charts = {}
})
</script>

<!-- 全局样式：EP 日期区间根节点不带 scoped data-v（经 tooltip 渲染），铁律14 必须 :deep/全局且 flex:0 1 auto -->
<style lang="scss">
.dash-header .el-input__wrapper.dash-range,
.dash-header .el-date-editor.dash-range {
  flex: 0 1 auto;
  width: 250px;
  min-width: 220px;
}
</style>

<style scoped lang="scss">
/* ===== 亮色主题设计令牌 ===== */
$bg-page: #f5f7fa;
$bg-card: #ffffff;
$border-card: #e8eaed;
$text-primary: #303133;
$text-secondary: #909399;
$text-muted: #c0c4cc;
$accent-blue: #1890ff;
$accent-green: #52c41a;
$accent-cyan: #36cfc9;
$accent-orange: #faad14;
$accent-red: #ff4d4f;

.dashboard-container {
  padding: 16px;
  background: $bg-page;
  min-height: calc(100vh - 84px);
}

/* ===== 段0 口径中枢 ===== */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 10px 16px;
  background: $bg-card;
  border-radius: 10px;
  border: 1px solid $border-card;
  flex-wrap: wrap;
  gap: 10px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .stat-label {
    font-size: 14px;
    font-weight: 600;
    color: $text-primary;
    white-space: nowrap;
  }

  .compare-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    font-size: 11px;
    color: $text-muted;
    border: 1px solid $text-muted;
    cursor: help;
    user-select: none;
  }
}

.quick-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.quick-link-btn {
  height: 24px;
  line-height: 22px;
  padding: 0 10px;
  font-size: 12px;
  color: $text-secondary;
  background: #f5f7fa;
  border: 1px solid $border-card;
  border-radius: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;

  &:hover {
    color: $accent-blue;
    border-color: rgba(24, 144, 255, 0.35);
    background: rgba(24, 144, 255, 0.06);
  }
}

.quick-links-dropdown {
  display: none;
}

@media (max-width: 1200px) {
  .quick-links { display: none; }
  .quick-links-dropdown { display: inline-flex; }
}

/* 筛选弹层 */
.filter-pop-body {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .filter-pop-label {
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 4px;
  }

  .filter-pop-footer {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid $border-card;
    padding-top: 8px;
  }
}

.filter-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

/* ===== 段标题行 ===== */
.seg-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0 10px;

  .seg-title {
    font-size: 15px;
    font-weight: 700;
    color: $text-primary;
    white-space: nowrap;

    &::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 14px;
      border-radius: 2px;
      background: linear-gradient(180deg, $accent-blue, #40a9ff);
      margin-right: 8px;
      vertical-align: -2px;
    }
  }

  .seg-pill {
    font-size: 11px;
    color: $text-muted;
    background: #f2f4f7;
    border-radius: 10px;
    padding: 2px 8px;
    white-space: nowrap;
  }

  .kpi-strip {
    margin-left: auto;
    font-size: 12px;
    color: $text-secondary;
    white-space: nowrap;

    b { color: $text-primary; font-size: 13px; }
  }

  .risk-badges {
    margin-left: auto;
    display: flex;
    gap: 6px;

    .risk-badge {
      font-size: 11px;
      color: $text-secondary;
      background: #f2f4f7;
      border-radius: 10px;
      padding: 2px 8px;
      white-space: nowrap;
    }
  }
}

/* ===== 段1 六磁贴 ===== */
.tile-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  min-height: 108px;
}

@media (max-width: 1500px) { .tile-row { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .tile-row { grid-template-columns: repeat(2, 1fr); } }

.tile {
  background: $bg-card;
  border: 1px solid $border-card;
  border-radius: 10px;
  padding: 14px 16px;
  transition: box-shadow 0.25s ease;
  display: flex;
  flex-direction: column;
  justify-content: center;

  &.tile-click { cursor: pointer; }
  &.tile-click:hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); }

  .tile-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: $text-secondary;
    margin-bottom: 6px;
    white-space: nowrap;
  }

  .tile-pill {
    font-size: 10px;
    font-weight: 400;
    color: $text-muted;
    background: #f2f4f7;
    border-radius: 4px;
    padding: 1px 5px;
    line-height: 1.4;
  }

  .tile-value {
    font-size: 26px;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.1;

    .tile-unit {
      font-size: 12px;
      font-weight: 400;
      color: $text-muted;
      margin-left: 4px;
    }
  }

  .tile-delta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
    font-size: 11px;
    min-height: 16px;

    .tile-trend {
      font-weight: 700;

      em { font-style: normal; font-weight: 400; color: $text-muted; }

      &.up { color: $accent-red; }
      &.down { color: $accent-green; }
      &.flat { color: $text-muted; }
    }

    .tile-prev { color: $text-muted; white-space: nowrap; }
  }
}

/* ===== 通用图表卡 ===== */
.chart-row {
  display: grid;
  grid-template-columns: 14fr 10fr;
  gap: 12px;
  margin-bottom: 16px;

  &.last { margin-bottom: 0; }
}

@media (max-width: 1200px) { .chart-row { grid-template-columns: 1fr; } }

.chart-card {
  background: $bg-card;
  border: 1px solid $border-card;
  border-radius: 10px;
  padding: 14px 16px 16px;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  .chart-title { font-size: 14px; font-weight: 600; color: $text-primary; white-space: nowrap; }
  .chart-subtitle { font-size: 12px; color: $text-muted; }

  .el-radio-group { margin-left: auto; }
}

.chart-canvas { height: 260px; }
.pie-canvas { height: 160px; }
.debt-canvas { height: 210px; }

/* ===== 段2：类型构成 + 画像 ===== */
.pie-quad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

@media (max-width: 1500px) { .pie-quad { grid-template-columns: repeat(2, 1fr); } }

.pie-cell {
  border: 1px solid #f0f2f5;
  border-radius: 8px;
  padding: 6px 8px 2px;
}

.pie-cap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
}

.pie-cap-total {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.bucket-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  justify-content: center;
  margin-bottom: 10px;

  .bucket-legend-item {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    color: $text-secondary;
  }
}

.profile-wrap { min-width: 0; }

.profile-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  th, td {
    padding: 7px 8px;
    border-bottom: 1px solid #f0f2f5;
    text-align: right;
    white-space: nowrap;
  }

  th {
    color: $text-secondary;
    font-weight: 600;
    background: #fafbfc;
  }

  .pt-name {
    text-align: left;
    color: $text-primary;
    font-weight: 600;
  }

  .pt-strong { color: $text-primary; font-weight: 600; }

  .profile-row {
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover { background: #f5f7fa; }
  }
}

.bucket-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 3px;
  margin-right: 6px;
  vertical-align: 1px;
}

.profile-missing {
  margin-top: 8px;
  font-size: 11px;
  color: $accent-orange;
}

/* 段2 右：办结占比堆叠条 */
.stacked-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 6px;
}

.stacked-bar {
  display: flex;
  width: 100%;
  height: 18px;
  border-radius: 9px;
  overflow: hidden;
  background: #f0f2f5;

  .stacked-seg {
    height: 100%;
    min-width: 2px;
    transition: width 0.4s ease;
  }
}

.stacked-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .stacked-legend-item {
    display: flex;
    align-items: center;
    font-size: 12px;

    .stacked-legend-name {
      color: $text-primary;
      font-weight: 600;
      width: 64px;
    }

    .stacked-legend-num { color: $text-secondary; margin-left: auto; }
  }
}

/* ===== 段3：效能矩阵 ===== */
.matrix-card { margin-bottom: 16px; }

.matrix-scroll { overflow-x: auto; }

.mx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 720px;

  th, td {
    padding: 8px 10px;
    border-bottom: 1px solid #f0f2f5;
    text-align: center;
  }

  thead th {
    background: #fafbfc;
    color: $text-secondary;
    font-weight: 600;
    border-bottom: 1px solid $border-card;
  }

  .mx-sort {
    cursor: pointer;
    user-select: none;
    display: inline-flex;
    align-items: center;
    gap: 2px;

    &:hover { color: $accent-blue; }
    &.active { color: $accent-blue; }

    em { font-style: normal; }
  }

  .mx-th-name { text-align: left; min-width: 120px; }

  .mx-name {
    text-align: left;

    .mx-name-txt {
      color: $text-primary;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }

    .mx-name-sub { color: $text-muted; font-size: 11px; margin-top: 2px; }
  }

  .mx-cell {
    min-width: 90px;

    &.mx-cell-hit { cursor: pointer; }
    &.mx-cell-hit:hover { background: #f5f7fa; }
  }

  .mx-num {
    display: block;
    color: $text-primary;
    font-weight: 600;
    margin-bottom: 3px;
  }

  .mx-bar {
    height: 5px;
    border-radius: 3px;
    background: #f0f2f5;
    overflow: hidden;

    .mx-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }
  }

  .mx-zero { color: #dcdfe6; }

  .mx-empty-row td { padding: 16px 0; }

  .mx-total-row td {
    background: #fafbfc;
    font-weight: 700;
    color: $text-primary;
    border-top: 1px solid $border-card;
  }
}

/* ===== 段5：风险清单 ===== */
.risk-list-header { margin-top: 14px; }

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 120px;
  max-height: 260px;
  overflow-y: auto;
}

.risk-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  border: 1px solid transparent;

  &:hover { background: #f5f7fa; }

  &.sev-high {
    background: rgba(255, 77, 79, 0.05);
    .risk-dot { background: $accent-red; }
    .risk-type { color: $accent-red; background: rgba(255, 77, 79, 0.1); }
  }

  &.sev-medium {
    background: rgba(250, 173, 20, 0.06);
    .risk-dot { background: $accent-orange; }
    .risk-type { color: #d48806; background: rgba(250, 173, 20, 0.14); }
  }

  &.sev-low {
    .risk-dot { background: $accent-blue; }
    .risk-type { color: $accent-blue; background: rgba(24, 144, 255, 0.1); }
  }

  .risk-dot {
    flex: 0 0 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 5px;
  }

  .risk-main { flex: 1; min-width: 0; }

  .risk-line1 {
    display: flex;
    align-items: center;
    gap: 8px;

    .risk-type {
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      padding: 1px 6px;
      white-space: nowrap;
    }

    .risk-code {
      font-size: 12px;
      font-weight: 600;
      color: $text-primary;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .risk-days {
      margin-left: auto;
      font-size: 12px;
      font-weight: 700;
      color: $text-secondary;
      white-space: nowrap;
    }
  }

  .risk-line2 {
    margin-top: 3px;
    font-size: 12px;
    color: $text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .risk-hint {
    margin-top: 2px;
    font-size: 11px;
    color: $text-muted;
  }
}

/* ===== TOP10 排行 ===== */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 160px;
}

.rank-item {
  display: grid;
  grid-template-columns: 22px minmax(0, 1.1fr) minmax(70px, 1.4fr) 76px;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover { background: #f5f7fa; }
}

.rank-badge {
  width: 22px;
  height: 22px;
  line-height: 22px;
  border-radius: 6px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #c0c4cc;

  &.rank-top-1 { background: linear-gradient(135deg, #ffc53d, #fa8c16); box-shadow: 0 2px 6px rgba(250, 140, 22, 0.35); }
  &.rank-top-2 { background: linear-gradient(135deg, #c3cbd8, #8d9bad); }
  &.rank-top-3 { background: linear-gradient(135deg, #e3af85, #c9834d); }
}

.rank-name {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  .rank-code {
    font-size: 12px;
    font-weight: 600;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rank-sub {
    font-size: 11px;
    color: $text-muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.rank-bar {
  height: 8px;
  border-radius: 4px;
  background: #f0f2f5;
  overflow: hidden;

  .rank-bar-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #5aa9ff, #1890ff);
    transition: width 0.5s ease;
  }
}

.rank-amount {
  font-size: 13px;
  font-weight: 700;
  color: $text-primary;
  text-align: right;
  white-space: nowrap;
}
</style>
