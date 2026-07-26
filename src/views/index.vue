<template>
  <div class="dashboard-container">
    <!-- 顶部标题 + 全局时间筛选 -->
    <div class="dash-header">
      <div class="header-title">
        <span class="title-bar"></span>
        <h2>项目运营驾驶舱</h2>
      </div>
      <div class="header-actions">
        <el-radio-group v-model="globalPeriod" size="small" @change="onGlobalPeriodChange">
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="quarter">本季</el-radio-button>
          <el-radio-button value="year">本年</el-radio-button>
        </el-radio-group>
        <el-button :icon="Refresh" circle size="small" @click="fetchData" />
      </div>
    </div>

    <!-- ① KPI 卡片区 -->
    <div class="kpi-grid" v-loading="loading">
      <div v-for="(card, i) in kpiCards" :key="i" class="kpi-card" :class="card.cls">
        <div class="kpi-icon-wrap">
          <el-icon :size="22"><component :is="card.icon" /></el-icon>
        </div>
        <div class="kpi-body">
          <div class="kpi-value">
            <span class="num">{{ card.display }}</span>
            <span class="unit">{{ card.unit }}</span>
          </div>
          <div class="kpi-label">{{ card.label }}</div>
          <div class="kpi-trend" v-if="card.trend !== null" :class="card.trend >= 0 ? 'up' : 'down'">
            <el-icon size="12"><CaretTop v-if="card.trend >= 0" /><CaretBottom v-else /></el-icon>
            {{ Math.abs(card.trend) }}% 环比
          </div>
          <div class="kpi-sub" v-if="card.sub">{{ card.sub }}</div>
        </div>
        <div class="kpi-pulse" v-if="card.pulse"></div>
      </div>
    </div>

    <!-- ② 合同收款 + 快捷入口 -->
    <el-row :gutter="16" class="bottom-row">
      <!-- 合同收款进度 -->
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="dash-card">
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">合同收款进度</span>
              <el-link type="primary" :underline="false" @click="goPage('/contract/list')">更多</el-link>
            </div>
          </template>
          <div class="payment-section" v-loading="loading">
            <div class="payment-summary">
              <div class="pay-item">
                <span class="pay-label">合同总额</span>
                <span class="pay-value">¥{{ formatMoney(dashboard.contractPayment?.totalAmount) }}</span>
              </div>
              <div class="pay-item">
                <span class="pay-label">已收款</span>
                <span class="pay-value green">¥{{ formatMoney(dashboard.contractPayment?.receivedAmount) }}</span>
              </div>
              <div class="pay-item">
                <span class="pay-label">待收款</span>
                <span class="pay-value red">¥{{ formatMoney(dashboard.contractPayment?.pendingAmount) }}</span>
              </div>
            </div>
            <div class="payment-bar-wrap">
              <el-progress :percentage="paymentRatio" :stroke-width="22" :format="() => paymentRatio + '%'"
                           color="#67c23a" />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 快捷入口 -->
      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="dash-card">
          <template #header><span class="card-title">快捷入口</span></template>
          <div class="quick-actions">
            <div class="action-btn" @click="goPage('/project/list')">
              <el-icon :size="20"><FolderAdd /></el-icon>
              <span>新建项目</span>
            </div>
            <div class="action-btn" @click="goPage('/settlement')">
              <el-icon :size="20"><EditPen /></el-icon>
              <span>录工作量</span>
            </div>
            <div class="action-btn" @click="goPage('/contract/list')">
              <el-icon :size="20"><Document /></el-icon>
              <span>登记合同</span>
            </div>
            <div class="action-btn" @click="goPage('/material')">
              <el-icon :size="20"><Files /></el-icon>
              <span>登记资料</span>
            </div>
            <div class="action-btn todo-btn" @click="showMyTodos = true">
              <el-icon :size="20"><Bell /></el-icon>
              <span>我的待办</span>
              <el-badge :value="dashboard.myTodos?.length || 0" type="danger" class="todo-badge" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ③ 核心图表区 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="14">
        <el-card shadow="never" class="dash-card">
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">产值趋势</span>
              <el-radio-group v-model="outputPeriod" size="small" @change="fetchData">
                <el-radio-button value="month">本月</el-radio-button>
                <el-radio-button value="quarter">本季</el-radio-button>
                <el-radio-button value="year">本年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="outputChartRef" class="chart-canvas"></div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card shadow="never" class="dash-card">
          <template #header><span class="card-title">项目状态分布</span></template>
          <div ref="statusChartRef" class="chart-canvas"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ④ 三栏看板 -->
    <el-row :gutter="16" class="panel-row">
      <!-- 项目进度 TOP5 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="dash-card">
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">项目进度 TOP5</span>
              <el-link type="primary" :underline="false" @click="goPage('/project/list')">更多</el-link>
            </div>
          </template>
          <div class="progress-list" v-loading="loading">
            <div v-for="(item, idx) in dashboard.projectProgress" :key="item.id" class="progress-item"
                 @click="goProjectDetail(item.id)">
              <div class="progress-rank" :class="'rank-' + (idx + 1)">{{ idx + 1 }}</div>
              <div class="progress-main">
                <div class="progress-info">
                  <span class="progress-name" :title="item.projectName">{{ item.projectName }}</span>
                  <span class="progress-pct">{{ item.progress }}%</span>
                </div>
                <el-progress :percentage="Number(item.progress)" :show-text="false" :stroke-width="6"
                             :color="progressColors" />
                <div class="progress-meta">{{ item.completedTasks }}/{{ item.totalTasks }} 任务</div>
              </div>
            </div>
            <el-empty v-if="!loading && !dashboard.projectProgress?.length" description="暂无进行中项目" :image-size="50" />
          </div>
        </el-card>
      </el-col>

      <!-- 任务预警 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="dash-card alert-card">
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">
                任务预警
                <el-badge :value="dashboard.taskAlerts?.length || 0" type="danger" class="alert-badge" />
              </span>
              <el-link type="primary" :underline="false" @click="goPage('/project/task')">更多</el-link>
            </div>
          </template>
          <div class="alert-list" v-loading="loading">
            <div v-for="item in dashboard.taskAlerts" :key="item.id" class="alert-item"
                 @click="goTaskDetail(item.id)">
              <div class="alert-dot" :class="Number(item.overdueDays) > 3 ? 'severe' : 'warning'"></div>
              <div class="alert-body">
                <div class="alert-title" :title="item.taskName">{{ item.taskName }}</div>
                <div class="alert-meta">{{ item.projectName }}</div>
              </div>
              <div class="alert-days">
                <span class="days-num" :class="Number(item.overdueDays) > 3 ? 'severe' : 'warning'">
                  +{{ item.overdueDays }}
                </span>
                <span class="days-label">天</span>
              </div>
            </div>
            <el-empty v-if="!loading && !dashboard.taskAlerts?.length" description="暂无超期任务" :image-size="50" />
          </div>
        </el-card>
      </el-col>

      <!-- 资料流转 -->
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="dash-card">
          <template #header>
            <div class="card-header-flex">
              <span class="card-title">资料流转</span>
              <el-link type="primary" :underline="false" @click="goPage('/material')">更多</el-link>
            </div>
          </template>
          <div class="material-stats" v-loading="loading">
            <div class="material-stat-item" @click="goMaterial('待领取')">
              <div class="stat-circle stat-pending">
                <span class="stat-num">{{ dashboard.materialFlow?.pendingReceive || 0 }}</span>
              </div>
              <span class="stat-label">待领取</span>
            </div>
            <div class="material-stat-item" @click="goMaterial('已领取')">
              <div class="stat-circle stat-active">
                <span class="stat-num">{{ dashboard.materialFlow?.pendingReturn || 0 }}</span>
              </div>
              <span class="stat-label">待归还</span>
            </div>
            <div class="material-stat-item" @click="goMaterial('已归还')">
              <div class="stat-circle stat-done">
                <span class="stat-num">{{ dashboard.materialFlow?.returned || 0 }}</span>
              </div>
              <span class="stat-label">已归还</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 我的待办弹窗 -->
    <el-dialog :model-value="showMyTodos" @update:model-value="showMyTodos = $event" title="我的待办任务" width="680px" append-to-body>
      <el-table :data="dashboard.myTodos" stripe size="small" @row-click="goTaskDetail">
        <el-table-column prop="taskName" label="任务名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="projectName" label="所属项目" min-width="150" show-overflow-tooltip />
        <el-table-column prop="requiredFinishDate" label="截止日期" width="120">
          <template #default="{ row }">
            <span :class="{ 'overdue-text': Number(row.overdueDays) > 0 }">{{ formatDate(row.requiredFinishDate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="Number(row.overdueDays) > 0" type="danger" size="small">超期{{ row.overdueDays }}天</el-tag>
            <el-tag v-else type="warning" size="small">进行中</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup name="Index">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from "vue"
import { useRouter } from "vue-router"
import * as echarts from "echarts"
import { getDashboardData } from "@/api/project/dashboard"
import {
  Refresh, CaretTop, CaretBottom, FolderAdd, EditPen, Document, Files, Bell,
  Folder, Loading, TrendCharts, Wallet
} from "@element-plus/icons-vue"

const router = useRouter()

// ===== 数据 =====
const loading = ref(false)
const globalPeriod = ref("month")
const outputPeriod = ref("month")
const showMyTodos = ref(false)
const dashboard = ref({})

// ===== 图表 ref =====
const outputChartRef = ref(null)
const statusChartRef = ref(null)
let outputChart = null
let statusChart = null

// ===== KPI 卡片计算 =====
const kpiCards = computed(() => {
  const k = dashboard.value.kpis || {}
  return [
    {
      label: "在册项目",
      display: k.projectCount ?? 0,
      unit: "个",
      trend: k.projectTrend ?? null,
      icon: Folder,
      cls: "card-blue"
    },
    {
      label: "进行中项目",
      display: k.activeProjectCount ?? 0,
      unit: "个",
      trend: null,
      sub: k.activeRatio != null ? `占比 ${k.activeRatio}%` : "",
      icon: Loading,
      cls: "card-cyan"
    },
    {
      label: "本期产值",
      display: formatMoney(k.periodOutput),
      unit: "元",
      trend: k.outputTrend ?? null,
      sub: `内 ${formatMoney(k.internalOutput)} / 外 ${formatMoney(k.externalOutput)}`,
      icon: TrendCharts,
      cls: "card-green"
    },
    {
      label: "合同总额",
      display: formatMoney(k.contractTotalAmount),
      unit: "元",
      trend: null,
      icon: Document,
      cls: "card-purple"
    },
    {
      label: "待收款",
      display: formatMoney(k.pendingPayment),
      unit: "元",
      trend: null,
      icon: Wallet,
      cls: "card-red"
    },
    {
      label: "待办预警",
      display: k.alertCount ?? 0,
      unit: "项",
      trend: null,
      icon: Bell,
      cls: "card-amber",
      pulse: (k.alertCount ?? 0) > 0
    }
  ]
})

// ===== 收款进度比 =====
const paymentRatio = computed(() => {
  const c = dashboard.value.contractPayment
  if (!c || !c.totalAmount || Number(c.totalAmount) === 0) return 0
  return Math.round(Number(c.receivedAmount) / Number(c.totalAmount) * 1000) / 10
})

// ===== 进度条渐变色 =====
const progressColors = [
  { color: "#409eff", percentage: 50 },
  { color: "#36cfc9", percentage: 80 },
  { color: "#52c41a", percentage: 100 }
]

// ===== 格式化金额（万元） =====
function formatMoney(val) {
  if (val == null) return "0"
  const num = Number(val)
  if (isNaN(num)) return "0"
  if (num >= 10000) {
    return (num / 10000).toFixed(2) + "万"
  }
  return num.toLocaleString("zh-CN", { maximumFractionDigits: 2 })
}

// ===== 格式化日期 =====
function formatDate(val) {
  if (!val) return "—"
  const d = new Date(val)
  if (isNaN(d)) return val
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// ===== 全局周期切换 → 同步产值趋势周期 =====
function onGlobalPeriodChange(val) {
  outputPeriod.value = val
  fetchData()
}

// ===== 拉取数据 =====
async function fetchData() {
  loading.value = true
  try {
    const res = await getDashboardData(outputPeriod.value)
    dashboard.value = res.data || {}
    await nextTick()
    renderOutputChart()
    renderStatusChart()
  } catch (e) {
    console.error("Dashboard data fetch error:", e)
  } finally {
    loading.value = false
  }
}

// ===== 产值趋势折线图 =====
function renderOutputChart() {
  if (!outputChartRef.value) return
  if (!outputChart) {
    outputChart = echarts.init(outputChartRef.value)
  }
  const trend = dashboard.value.outputTrend || {}
  const labels = trend.labels || []
  const internal = (trend.internal || []).map(v => Number(v))
  const external = (trend.external || []).map(v => Number(v))

  outputChart.setOption({
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        let html = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`
        params.forEach(p => {
          html += `<div style="display:flex;align-items:center;gap:6px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
            <span>${p.seriesName}</span>
            <span style="font-weight:600;margin-left:auto">${formatMoney(p.value)}元</span>
          </div>`
        })
        return html
      }
    },
    legend: {
      data: ["内部产值", "外部产值"],
      bottom: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8
    },
    grid: { top: 20, left: 10, right: 20, bottom: 35, containLabel: true },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#dcdfe6" } },
      axisLabel: { color: "#909399", fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
      axisLabel: {
        color: "#909399",
        fontSize: 11,
        formatter: (v) => v >= 10000 ? (v / 10000).toFixed(1) + "万" : v
      }
    },
    series: [
      {
        name: "内部产值",
        type: "line",
        data: internal,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2, color: "#409eff" },
        itemStyle: { color: "#409eff" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(64,158,255,0.25)" },
            { offset: 1, color: "rgba(64,158,255,0.01)" }
          ])
        }
      },
      {
        name: "外部产值",
        type: "line",
        data: external,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        lineStyle: { width: 2, color: "#faad14" },
        itemStyle: { color: "#faad14" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(250,173,20,0.2)" },
            { offset: 1, color: "rgba(250,173,20,0.01)" }
          ])
        }
      }
    ]
  })
}

// ===== 项目状态分布环形图 =====
function renderStatusChart() {
  if (!statusChartRef.value) return
  if (!statusChart) {
    statusChart = echarts.init(statusChartRef.value)
  }
  const dist = dashboard.value.projectStatusDist || []
  const colorMap = {
    "待开始": "#909399",
    "进行中": "#409eff",
    "已暂停": "#e6a23c",
    "已完成": "#67c23a",
    "已办结": "#13ce66",
    "已取消": "#f56c6c"
  }
  const data = dist.map(d => ({
    name: d.name,
    value: Number(d.value),
    itemStyle: { color: colorMap[d.name] || "#409eff" }
  }))
  const total = data.reduce((s, d) => s + d.value, 0)

  statusChart.setOption({
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}个 ({d}%)"
    },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 12 }
    },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      center: ["50%", "42%"],
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: "center",
        formatter: () => `{a|${total}}\n{b|项目总数}`,
        rich: {
          a: { fontSize: 28, fontWeight: "bold", color: "#303133", lineHeight: 36 },
          b: { fontSize: 12, color: "#909399" }
        }
      },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: "bold" },
        itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.15)" }
      },
      labelLine: { show: false },
      data: data.length ? data : [{ name: "暂无数据", value: 0, itemStyle: { color: "#e0e0e0" } }]
    }]
  })
}

// ===== 导航 =====
function goPage(path) {
  router.push(path)
}
function goProjectDetail(id) {
  router.push({ path: "/project/list", query: { id } })
}
function goTaskDetail(id) {
  router.push({ path: "/project/task" })
}
function goMaterial(status) {
  router.push({ path: "/material" })
}

// ===== 窗口缩放 =====
function handleResize() {
  outputChart?.resize()
  statusChart?.resize()
}

// ===== 生命周期 =====
onMounted(() => {
  fetchData()
  window.addEventListener("resize", handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize)
  outputChart?.dispose()
  statusChart?.dispose()
})
</script>

<style scoped lang="scss">
.dashboard-container {
  padding: 16px;
  background: #f5f7fa;
  min-height: calc(100vh - 84px);
}

/* ===== 顶部标题 ===== */
.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .header-title {
    display: flex;
    align-items: center;
    gap: 10px;

    .title-bar {
      width: 4px;
      height: 20px;
      border-radius: 2px;
      background: linear-gradient(180deg, #409eff, #36cfc9);
    }

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

/* ===== KPI 卡片区 ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

@media (max-width: 1400px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 768px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

.kpi-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  transition: all 0.25s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  }

  .kpi-icon-wrap {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .kpi-body {
    flex: 1;
    min-width: 0;
  }

  .kpi-value {
    display: flex;
    align-items: baseline;
    gap: 3px;

    .num {
      font-size: 22px;
      font-weight: 700;
      color: #303133;
      line-height: 1.2;
    }

    .unit {
      font-size: 12px;
      color: #909399;
    }
  }

  .kpi-label {
    font-size: 13px;
    color: #606266;
    margin-top: 2px;
  }

  .kpi-trend {
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 2px;
    margin-top: 4px;

    &.up { color: #67c23a; }
    &.down { color: #f56c6c; }
  }

  .kpi-sub {
    font-size: 11px;
    color: #c0c4cc;
    margin-top: 2px;
  }

  /* 卡片配色 */
  &.card-blue .kpi-icon-wrap { background: linear-gradient(135deg, #409eff, #66b1ff); }
  &.card-cyan .kpi-icon-wrap { background: linear-gradient(135deg, #36cfc9, #5cdbd3); }
  &.card-green .kpi-icon-wrap { background: linear-gradient(135deg, #67c23a, #85ce61); }
  &.card-purple .kpi-icon-wrap { background: linear-gradient(135deg, #722ed1, #9254de); }
  &.card-red .kpi-icon-wrap { background: linear-gradient(135deg, #f56c6c, #f89898); }
  &.card-amber .kpi-icon-wrap { background: linear-gradient(135deg, #e6a23c, #f0c78a); }

  /* 预警脉冲 */
  .kpi-pulse {
    position: absolute;
    top: 0;
    right: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e6a23c;
    margin: 12px;
    animation: pulse-ring 1.5s ease-out infinite;
  }
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.5); }
  100% { box-shadow: 0 0 0 10px rgba(230, 162, 60, 0); }
}

/* ===== 图表区 ===== */
.chart-row {
  margin-bottom: 16px;
}

.dash-card {
  border-radius: 10px;
  border: 1px solid #ebeef5;

  :deep(.el-card__header) {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  :deep(.el-card__body) {
    padding: 16px;
  }

  .card-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .card-header-flex {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.chart-canvas {
  height: 300px;
}

/* ===== 三栏看板 ===== */
.panel-row {
  margin-bottom: 16px;
}

/* 项目进度 */
.progress-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 200px;
}

.progress-item {
  display: flex;
  gap: 10px;
  cursor: pointer;
  padding: 4px 0;
  transition: opacity 0.2s;

  &:hover { opacity: 0.75; }

  .progress-rank {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    background: #c0c4cc;

    &.rank-1 { background: linear-gradient(135deg, #ff4d4f, #ff7875); }
    &.rank-2 { background: linear-gradient(135deg, #fa8c16, #ffa940); }
    &.rank-3 { background: linear-gradient(135deg, #faad14, #ffc53d); }
  }

  .progress-main {
    flex: 1;
    min-width: 0;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;

    .progress-name {
      font-size: 13px;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 180px;
    }

    .progress-pct {
      font-size: 13px;
      font-weight: 600;
      color: #409eff;
    }
  }

  .progress-meta {
    font-size: 11px;
    color: #c0c4cc;
    margin-top: 3px;
  }
}

/* 任务预警 */
.alert-badge {
  margin-left: 6px;
}

.alert-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f0f7ff;
  }

  .alert-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &.severe { background: #f56c6c; box-shadow: 0 0 4px rgba(245, 108, 108, 0.5); }
    &.warning { background: #e6a23c; }
  }

  .alert-body {
    flex: 1;
    min-width: 0;

    .alert-title {
      font-size: 13px;
      color: #303133;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .alert-meta {
      font-size: 11px;
      color: #909399;
      margin-top: 2px;
    }
  }

  .alert-days {
    display: flex;
    align-items: baseline;
    gap: 2px;

    .days-num {
      font-size: 16px;
      font-weight: 700;

      &.severe { color: #f56c6c; }
      &.warning { color: #e6a23c; }
    }

    .days-label {
      font-size: 11px;
      color: #909399;
    }
  }
}

/* 资料流转 */
.material-stats {
  display: flex;
  justify-content: space-around;
  align-items: center;
  min-height: 200px;
  padding: 10px 0;
}

.material-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover { transform: scale(1.08); }

  .stat-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid transparent;

    .stat-num {
      font-size: 22px;
      font-weight: 700;
    }

    &.stat-pending {
      background: #fff7e6;
      border-color: #ffd591;
      .stat-num { color: #fa8c16; }
    }

    &.stat-active {
      background: #e6f7ff;
      border-color: #91d5ff;
      .stat-num { color: #1890ff; }
    }

    &.stat-done {
      background: #f6ffed;
      border-color: #b7eb8f;
      .stat-num { color: #52c41a; }
    }
  }

  .stat-label {
    font-size: 12px;
    color: #606266;
  }
}

/* ===== 合同收款 + 快捷入口 ===== */
.bottom-row {
  margin-bottom: 16px;
}

.payment-section {
  .payment-summary {
    display: flex;
    gap: 32px;
    margin-bottom: 16px;

    .pay-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .pay-label {
        font-size: 12px;
        color: #909399;
      }

      .pay-value {
        font-size: 20px;
        font-weight: 700;
        color: #303133;

        &.green { color: #67c23a; }
        &.red { color: #f56c6c; }
      }
    }
  }

  .payment-bar-wrap {
    :deep(.el-progress-bar__outer) {
      border-radius: 12px;
    }
    :deep(.el-progress-bar__inner) {
      border-radius: 12px;
      transition: width 0.8s ease;
    }
  }
}

/* 快捷入口 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 10px;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #606266;
  position: relative;

  &:hover {
    background: #ecf5ff;
    color: #409eff;
    transform: translateY(-2px);
  }

  span {
    font-size: 12px;
  }

  &.todo-btn {
    background: linear-gradient(135deg, #fff7e6, #fffbe6);

    &:hover {
      background: linear-gradient(135deg, #fff1d6, #fff5cc);
      color: #e6a23c;
    }
  }

  .todo-badge {
    position: absolute;
    top: 4px;
    right: 4px;
  }
}

/* ===== 弹窗 ===== */
.overdue-text {
  color: #f56c6c;
  font-weight: 600;
}

:deep(.el-table__row) {
  cursor: pointer;
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .quick-actions {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 768px) {
  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }
  .payment-summary {
    flex-wrap: wrap;
    gap: 16px !important;
  }
}
</style>
