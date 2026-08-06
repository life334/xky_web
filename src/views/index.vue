<template>
  <div class="dashboard-container">
    <!-- 顶部日期栏 -->
    <div class="dash-header">
      <div class="header-left">
        <span class="stat-label">统计周期</span>
        <el-date-picker
          v-model="dateRange"
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
      </div>
      <div class="header-right">
        <el-button type="primary" plain size="small" :icon="Refresh" @click="fetchData">对比周期</el-button>
      </div>
    </div>

    <!-- 第一行：项目动态宽卡 + 待办预警 + 进行中项目 -->
    <div class="kpi-row" v-loading="loading">
      <!-- 项目动态宽卡 -->
      <div class="kpi-card kpi-wide">
        <div class="kpi-dynamic-inner">
          <div class="dyn-left">
            <div class="dyn-label">本期新增</div>
            <div class="dyn-value">{{ k.newProjects ?? 0 }}</div>
            <div class="dyn-unit">项目</div>
          </div>
          <div class="dyn-divider">
            <div class="dyn-divider-line"></div>
            <div class="dyn-divider-text">项目动态</div>
            <div class="dyn-divider-line"></div>
          </div>
          <div class="dyn-right">
            <div class="dyn-label">本期办结</div>
            <div class="dyn-value">{{ k.completedProjects ?? 0 }}</div>
          </div>
          <div class="dyn-progress">
            <el-progress
              :percentage="Math.min(k.completedRate ?? 0, 100)"
              :stroke-width="6"
              :show-text="false"
              color="#36cfc9"
            />
            <span class="dyn-progress-text">{{ k.completedRate ?? 0 }}%</span>
          </div>
        </div>
      </div>

      <!-- 待办预警 -->
      <div class="kpi-card">
        <div class="kpi-simple">
          <div class="kpi-simple-label">待办预警</div>
          <div class="kpi-simple-value">{{ k.alertCount ?? 0 }}</div>
          <div class="kpi-simple-sub">超期 {{ k.overdueCount ?? 0 }} · 待领 {{ k.pendingMaterialCount ?? 0 }}</div>
        </div>
      </div>

      <!-- 进行中项目 -->
      <div class="kpi-card">
        <div class="kpi-simple">
          <div class="kpi-simple-label">进行中项目</div>
          <div class="kpi-simple-value">{{ k.activeProjectCount ?? 0 }}</div>
          <div class="kpi-simple-sub">占比 {{ k.activeRatio ?? 0 }}%</div>
        </div>
      </div>
    </div>

    <!-- 第二行：财务卡片（4张） -->
    <div class="finance-row" v-loading="loading">
      <div class="finance-card">
        <div class="finance-label">本月到账</div>
        <div class="finance-value">¥{{ formatMoney(f.periodPayment) }}</div>
        <div class="finance-meta">
          <span>年度 ¥{{ formatMoney(f.annualPayment) }}</span>
          <span class="finance-pct">{{ f.paymentAnnualRatio ?? 0 }}%</span>
        </div>
      </div>
      <div class="finance-card">
        <div class="finance-label">本月产值</div>
        <div class="finance-value">¥{{ formatMoney(f.periodOutput) }}</div>
        <div class="finance-meta">
          <span>年度 ¥{{ formatMoney(f.annualOutput) }}</span>
          <span class="finance-pct">{{ f.outputMonthlyRatio ?? 0 }}%</span>
        </div>
      </div>
      <div class="finance-card">
        <div class="finance-label">合同总额</div>
        <div class="finance-value">¥{{ formatMoney(f.contractTotalAmount) }}</div>
        <div class="finance-meta">
          <span>{{ f.contractCount ?? 0 }}份合同</span>
        </div>
      </div>
      <div class="finance-card">
        <div class="finance-label">应收未收</div>
        <div class="finance-value red">¥{{ formatMoney(f.pendingPayment) }}</div>
        <div class="finance-meta">
          <span>回款率 {{ paymentRatio }}%</span>
        </div>
      </div>
    </div>

    <!-- 第三行：产值与到账趋势 + 项目类型产值分布 -->
    <div class="chart-row">
      <div class="chart-card chart-wide">
        <div class="chart-header">
          <span class="chart-title">产值与到账趋势</span>
        </div>
        <div ref="outputPaymentRef" class="chart-canvas"></div>
      </div>
      <div class="chart-card chart-narrow">
        <div class="chart-header">
          <span class="chart-title">项目类型产值分布</span>
        </div>
        <div ref="categoryDistRef" class="chart-canvas"></div>
      </div>
    </div>

    <!-- 第四行：产值累计趋势 + 项目动态 -->
    <div class="chart-row">
      <div class="chart-card chart-wide">
        <div class="chart-header">
          <span class="chart-title">产值累计趋势</span>
          <span class="chart-subtitle">面积折线</span>
        </div>
        <div ref="cumulativeRef" class="chart-canvas"></div>
      </div>
      <div class="chart-card chart-narrow">
        <div class="chart-header">
          <span class="chart-title">项目动态</span>
        </div>
        <div ref="dynamicRef" class="chart-canvas"></div>
      </div>
    </div>

    <!-- 第五行：合同收款进度 + 快捷入口 -->
    <div class="bottom-row">
      <div class="bottom-card bottom-wide">
        <div class="chart-header">
          <span class="chart-title">合同收款进度</span>
        </div>
        <div class="contract-list" v-loading="loading">
          <div v-for="item in dashboard.contractPaymentList" :key="item.contractNo" class="contract-item">
            <span class="contract-code">{{ item.contractNo }}</span>
            <el-progress
              :percentage="Number(item.progress)"
              :stroke-width="8"
              :show-text="false"
              :color="getProgressColor(Number(item.progress))"
              class="contract-progress"
            />
            <span class="contract-pct" :style="{ color: getProgressColor(Number(item.progress)) }">{{ item.progress }}%</span>
            <span class="contract-amount">¥{{ formatMoney(item.receivedAmount) }}/¥{{ formatMoney(item.contractAmount) }}</span>
          </div>
          <el-empty v-if="!loading && !dashboard.contractPaymentList?.length" description="暂无合同数据" :image-size="50" />
        </div>
      </div>

      <div class="bottom-card bottom-narrow">
        <div class="chart-header">
          <span class="chart-title">快捷入口</span>
        </div>
        <div class="quick-grid">
          <div class="quick-btn" @click="goPage('/project/list')">
            <span>新增项目</span>
          </div>
          <div class="quick-btn" @click="goPage('/settlement')">
            <span>录入工作量</span>
          </div>
          <div class="quick-btn" @click="goPage('/contract/list')">
            <span>登记合同</span>
          </div>
          <div class="quick-btn" @click="goPage('/material')">
            <span>提交资料</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="Index">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from "vue"
import { useRouter } from "vue-router"
import * as echarts from "echarts"
import { getDashboardData, getAlertList } from "@/api/project/dashboard"
import { Refresh } from "@element-plus/icons-vue"

const router = useRouter()

// ===== 日期范围 =====
const quickPeriod = ref("month")
const dateRange = ref([])
const dateShortcuts = [
  { text: "本月", value: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth(), 1), new Date()] } },
  { text: "本季", value: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return [new Date(d.getFullYear(), q * 3, 1), new Date()] } },
  { text: "本年", value: () => { const d = new Date(); return [new Date(d.getFullYear(), 0, 1), new Date()] } },
  { text: "近3个月", value: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth() - 2, 1), new Date()] } },
  { text: "近6个月", value: () => { const d = new Date(); return [new Date(d.getFullYear(), d.getMonth() - 5, 1), new Date()] } },
]

// ===== 数据 =====
const loading = ref(false)
const alertLoading = ref(false)
const dashboard = ref({})
const timeoutAlerts = ref([])

// ===== 图表 refs =====
const outputPaymentRef = ref(null)
const categoryDistRef = ref(null)
const cumulativeRef = ref(null)
const dynamicRef = ref(null)
let charts = {}

// ===== 计算属性 =====
const k = computed(() => dashboard.value.kpis || {})
const f = computed(() => dashboard.value.finance || {})

const paymentRatio = computed(() => {
  const c = dashboard.value.contractPayment
  if (!c || !c.totalAmount || Number(c.totalAmount) === 0) return 0
  return Math.round(Number(c.receivedAmount) / Number(c.totalAmount) * 1000) / 10
})

const totalProjects = computed(() => {
  const kpi = dashboard.value.kpis || {}
  return (kpi.activeProjectCount || 0) + (kpi.completedProjects || 0)
})

// ===== 初始化日期 =====
function initDateRange() {
  const now = new Date()
  dateRange.value = [
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    now.toISOString().slice(0, 10)
  ]
}

// ===== 快捷周期 =====
function onQuickPeriodChange(val) {
  const now = new Date()
  if (val === "month") { dateRange.value = [new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)] }
  else if (val === "quarter") { const q = Math.floor(now.getMonth() / 3); dateRange.value = [new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)] }
  else if (val === "year") { dateRange.value = [new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), now.toISOString().slice(0, 10)] }
  fetchData()
}

function onDateRangeChange() {
  if (dateRange.value && dateRange.value.length === 2) {
    quickPeriod.value = ""
    fetchData()
  }
}

// ===== 格式化 =====
function formatMoney(val) {
  if (val == null) return "0"
  const num = Number(val)
  if (isNaN(num)) return "0"
  if (num >= 10000) return (num / 10000).toFixed(0) + "万"
  return num.toLocaleString("zh-CN", { maximumFractionDigits: 0 })
}

function formatDate(val) {
  if (!val) return "—"
  const d = new Date(val)
  if (isNaN(d)) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getProgressColor(pct) {
  if (pct >= 80) return "#52c41a"
  if (pct >= 50) return "#1890ff"
  if (pct >= 30) return "#faad14"
  return "#ff4d4f"
}

// ===== 拉取数据 =====
async function fetchData() {
  loading.value = true
  alertLoading.value = true
  try {
    const params = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.beginDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const [dashRes, alertRes] = await Promise.all([
      getDashboardData(params),
      getAlertList()
    ])
    dashboard.value = dashRes.data || {}
    timeoutAlerts.value = alertRes.data || []
    await nextTick()
    renderAllCharts()
  } catch (e) {
    console.error("Dashboard fetch error:", e)
  } finally {
    loading.value = false
    alertLoading.value = false
  }
}

// ===== 渲染所有图表 =====
function renderAllCharts() {
  renderOutputPaymentChart()
  renderCategoryDistChart()
  renderCumulativeChart()
  renderDynamicChart()
}

// 图表1：产值与到账趋势（分组柱状图）
function renderOutputPaymentChart() {
  const el = outputPaymentRef.value
  if (!el) return
  if (!charts.outputPayment) charts.outputPayment = echarts.init(el)
  const chart = charts.outputPayment
  const data = dashboard.value.outputPaymentTrend || []
  const labels = data.map(d => d.label)
  const outputs = data.map(d => Number(d.output) || 0)
  const payments = data.map(d => Number(d.payment) || 0)

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: (p) => {
        let h = `<b>${p[0].axisValue}</b><br/>`
        p.forEach(v => { h += `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${v.color};margin-right:6px"></span>${v.seriesName}: ¥${formatMoney(v.value)}<br/>` })
        return h
      }
    },
    legend: { data: ["产值", "到账"], bottom: 0, icon: "rect", itemWidth: 10, itemHeight: 10, textStyle: { color: "#909399", fontSize: 12 } },
    grid: { top: 16, left: 8, right: 16, bottom: 36, containLabel: true },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: "#e8eaed" } },
      axisLabel: { color: "#909399", fontSize: 11, rotate: labels.length > 8 ? 30 : 0 },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
      axisLabel: { color: "#909399", fontSize: 11, formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + "万" : v }
    },
    series: [
      { name: "产值", type: "bar", data: outputs, barWidth: "35%", itemStyle: { color: "#1890ff", borderRadius: [3, 3, 0, 0] } },
      { name: "到账", type: "bar", data: payments, barWidth: "35%", itemStyle: { color: "#52c41a", borderRadius: [3, 3, 0, 0] } }
    ]
  }, true)
}

// 图表2：项目类型产值分布（环形图）
function renderCategoryDistChart() {
  const el = categoryDistRef.value
  if (!el) return
  if (!charts.categoryDist) charts.categoryDist = echarts.init(el)
  const chart = charts.categoryDist
  const data = (dashboard.value.categoryOutputDist || []).map(d => ({
    name: d.name, value: Number(d.value)
  }))
  const colors = ["#1890ff", "#52c41a", "#faad14", "#f759ab", "#722ed1", "#13c2c2", "#909399", "#fa8c16"]

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: "{b}: ¥{c} ({d}%)"
    },
    legend: {
      orient: "vertical", right: 10, top: "center",
      icon: "roundRect", itemWidth: 10, itemHeight: 10,
      textStyle: { color: "#909399", fontSize: 12 },
      formatter: name => {
        const item = data.find(d => d.name === name)
        const pct = item && data.reduce((s, d) => s + d.value, 0) > 0
          ? Math.round(item.value / data.reduce((s, d) => s + d.value, 0) * 100) + "%"
          : "0%"
        return `${name}  ${pct}`
      }
    },
    series: [{
      type: "pie", radius: ["50%", "75%"], center: ["35%", "50%"],
      avoidLabelOverlap: false,
      label: {
        show: true, position: "center",
        formatter: () => `{a|${totalProjects.value}}\n{b|项目}`,
        rich: { a: { fontSize: 28, fontWeight: "bold", color: "#303133", lineHeight: 36 }, b: { fontSize: 12, color: "#909399" } }
      },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" }, itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.12)" } },
      labelLine: { show: false },
      data: data.length ? data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })) : [{ name: "暂无数据", value: 0, itemStyle: { color: "#e8eaed" } }]
    }]
  }, true)
}

// 图表3：产值累计趋势（面积折线图）
function renderCumulativeChart() {
  const el = cumulativeRef.value
  if (!el) return
  if (!charts.cumulative) charts.cumulative = echarts.init(el)
  const chart = charts.cumulative
  const data = dashboard.value.outputCumulativeTrend || []
  const labels = data.map(d => d.label)
  const cumulative = data.map(d => Number(d.cumulative) || 0)

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: (p) => {
        let h = `<b>${p[0].axisValue}</b><br/>`
        p.forEach(v => { h += `${v.marker} ${v.seriesName}: ¥${formatMoney(v.value)}<br/>` })
        return h
      }
    },
    grid: { top: 16, left: 8, right: 48, bottom: 20, containLabel: true },
    xAxis: {
      type: "category", data: labels, boundaryGap: false,
      axisLine: { lineStyle: { color: "#e8eaed" } },
      axisLabel: { color: "#909399", fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
      axisLabel: { color: "#909399", fontSize: 11, formatter: v => v >= 10000 ? (v / 10000).toFixed(1) + "万" : v }
    },
    series: [{
      name: "累计产值", type: "line", data: cumulative,
      smooth: true, symbol: "circle", symbolSize: 6,
      lineStyle: { width: 3, color: "#52c41a" },
      itemStyle: { color: "#52c41a", borderWidth: 2, borderColor: "#fff" },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(82,196,26,0.3)" },
          { offset: 1, color: "rgba(82,196,26,0.02)" }
        ])
      },
      endLabel: {
        show: true,
        formatter: p => `¥${formatMoney(p.value)}`,
        color: "#52c41a",
        fontSize: 11,
        offset: [10, 0]
      }
    }]
  }, true)
}

// 图表4：项目动态（分组柱状图）
function renderDynamicChart() {
  const el = dynamicRef.value
  if (!el) return
  if (!charts.dynamic) charts.dynamic = echarts.init(el)
  const chart = charts.dynamic
  const data = dashboard.value.projectDynamicTrend || []
  const labels = data.map(d => d.label)
  const newP = data.map(d => Number(d.newProjects) || 0)
  const completedP = data.map(d => Number(d.completedProjects) || 0)

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: (p) => {
        let h = `<b>${p[0].axisValue}</b><br/>`
        p.forEach(v => { h += `${v.marker} ${v.seriesName}: ${v.value} 个<br/>` })
        return h
      }
    },
    legend: { data: ["新增", "办结"], bottom: 0, icon: "rect", itemWidth: 10, itemHeight: 10, textStyle: { color: "#909399", fontSize: 12 } },
    grid: { top: 16, left: 8, right: 16, bottom: 36, containLabel: true },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: "#e8eaed" } },
      axisLabel: { color: "#909399", fontSize: 11, rotate: labels.length > 8 ? 30 : 0 },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
      axisLabel: { color: "#909399", fontSize: 11 },
      minInterval: 1
    },
    series: [
      { name: "新增", type: "bar", data: newP, barWidth: "35%", itemStyle: { color: "#1890ff", borderRadius: [3, 3, 0, 0] } },
      { name: "办结", type: "bar", data: completedP, barWidth: "35%", itemStyle: { color: "#52c41a", borderRadius: [3, 3, 0, 0] } }
    ]
  }, true)
}

// ===== 导航 =====
function goPage(path) { router.push(path) }
function goProjectDetail(id) { router.push({ path: "/project/list", query: { id } }) }
function goTaskDetail() { router.push({ path: "/project/task" }) }
function goMaterial() { router.push({ path: "/material" }) }
function goContractDetail(id) { router.push({ path: "/contract/list", query: { id } }) }

// ===== 窗口缩放 =====
function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

// ===== 生命周期 =====
onMounted(() => {
  initDateRange()
  fetchData()
  window.addEventListener("resize", handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize)
  Object.values(charts).forEach(c => c?.dispose())
})
</script>

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
$accent-purple: #722ed1;

.dashboard-container {
  padding: 16px;
  background: $bg-page;
  min-height: calc(100vh - 84px);
}

/* ===== 顶部日期栏 ===== */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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

  .stat-label {
    font-size: 14px;
    font-weight: 600;
    color: $text-primary;
  }
}

/* ===== 第一行：KPI 卡片 ===== */
.kpi-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 1200px) {
  .kpi-row { grid-template-columns: 1fr 1fr; }
  .kpi-wide { grid-column: span 2; }
}
@media (max-width: 768px) {
  .kpi-row { grid-template-columns: 1fr; }
  .kpi-wide { grid-column: span 1; }
}

.kpi-card {
  background: $bg-card;
  border: 1px solid $border-card;
  border-radius: 10px;
  padding: 16px;
  transition: box-shadow 0.25s ease;
  &:hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); }
}

/* 项目动态宽卡 */
.kpi-dynamic-inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: 1fr auto;
  gap: 0 16px;
  align-items: center;
  height: 100%;

  .dyn-left, .dyn-right {
    text-align: center;
    .dyn-label { font-size: 12px; color: $text-secondary; margin-bottom: 4px; }
    .dyn-value { font-size: 32px; font-weight: 700; color: $text-primary; line-height: 1.1; }
    .dyn-unit { font-size: 12px; color: $text-muted; margin-top: 4px; }
  }

  .dyn-divider {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    height: 100%;
    justify-content: center;

    .dyn-divider-line { width: 1px; flex: 1; background: $border-card; min-height: 20px; }
    .dyn-divider-text {
      font-size: 11px;
      color: $text-muted;
      writing-mode: vertical-rl;
      letter-spacing: 2px;
      white-space: nowrap;
    }
  }

  .dyn-progress {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid $border-card;

    :deep(.el-progress) { flex: 1; }
    :deep(.el-progress-bar__outer) {
      background: #f0f0f0;
      border-radius: 3px;
    }
    .dyn-progress-text {
      font-size: 12px;
      font-weight: 600;
      color: $accent-cyan;
      white-space: nowrap;
    }
  }
}

/* 简易KPI卡 */
.kpi-simple {
  .kpi-simple-label { font-size: 12px; color: $text-secondary; margin-bottom: 6px; }
  .kpi-simple-value { font-size: 28px; font-weight: 700; color: $text-primary; line-height: 1.1; }
  .kpi-simple-sub { font-size: 12px; color: $text-muted; margin-top: 6px; }
}

/* ===== 第二行：财务卡片 ===== */
.finance-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 1200px) { .finance-row { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .finance-row { grid-template-columns: 1fr; } }

.finance-card {
  background: $bg-card;
  border: 1px solid $border-card;
  border-radius: 10px;
  padding: 14px 16px;
  transition: box-shadow 0.25s ease;
  &:hover { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06); }

  .finance-label { font-size: 12px; color: $text-secondary; margin-bottom: 6px; }
  .finance-value {
    font-size: 20px;
    font-weight: 700;
    color: $text-primary;
    line-height: 1.2;
    &.red { color: $accent-red; }
  }
  .finance-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 11px;
    color: $text-muted;
    .finance-pct { color: $accent-cyan; font-weight: 600; }
  }
}

/* ===== 图表行 ===== */
.chart-row {
  display: grid;
  grid-template-columns: 14fr 10fr;
  gap: 12px;
  margin-bottom: 16px;
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

  .chart-title { font-size: 14px; font-weight: 600; color: $text-primary; }
  .chart-subtitle { font-size: 12px; color: $text-muted; }
}

.chart-canvas { height: 260px; }

/* ===== 底部行：合同收款 + 快捷入口 ===== */
.bottom-row {
  display: grid;
  grid-template-columns: 14fr 10fr;
  gap: 12px;
}

@media (max-width: 1200px) { .bottom-row { grid-template-columns: 1fr; } }

.bottom-card {
  background: $bg-card;
  border: 1px solid $border-card;
  border-radius: 10px;
  padding: 14px 16px 16px;
}

/* 合同收款进度 */
.contract-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 160px;
}

.contract-item {
  display: grid;
  grid-template-columns: 110px 1fr 50px auto;
  align-items: center;
  gap: 12px;

  .contract-code {
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
    white-space: nowrap;
  }

  .contract-progress {
    :deep(.el-progress-bar__outer) { background: #f0f0f0; border-radius: 4px; }
  }

  .contract-pct {
    font-size: 13px;
    font-weight: 600;
    text-align: right;
  }

  .contract-amount {
    font-size: 12px;
    color: $text-secondary;
    white-space: nowrap;
    text-align: right;
  }
}

/* 快捷入口 */
.quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.quick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  background: #f5f7fa;
  border: 1px solid $border-card;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: $text-secondary;
  font-size: 13px;

  &:hover {
    background: rgba(24, 144, 255, 0.06);
    border-color: rgba(24, 144, 255, 0.3);
    color: $accent-blue;
    transform: translateY(-1px);
  }
}
</style>
