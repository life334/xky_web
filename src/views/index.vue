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
              <div class="filter-pop-label">项目类别</div>
              <el-select v-model="filters.categoryId" filterable clearable placeholder="全部类别" style="width: 100%" @change="onFilterChange">
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
        <el-button size="small" plain @click="toggleAll">{{ allCollapsed ? '全部展开' : '全部收起' }}</el-button>
      </div>
    </div>

    <!-- 筛选生效胶囊 -->
    <div v-if="filterCount" class="filter-tags">
      <el-tag v-if="filters.clientUnit" closable size="small" @close="removeFilterTag('clientUnit')">单位：{{ filters.clientUnit }}</el-tag>
      <el-tag v-if="filters.leaderId" closable size="small" @close="removeFilterTag('leaderId')">负责人：{{ leaderNameOf(filters.leaderId) }}</el-tag>
      <el-tag v-if="filters.categoryId" closable size="small" @close="removeFilterTag('categoryId')">类别：{{ categoryNameOf(filters.categoryId) }}</el-tag>
    </div>

    <!-- ===== 段1 经营快照：六磁贴 ===== -->
    <div class="seg-head seg-toggle" :class="{ 'seg-collapsed': collapsed.seg1 }" @click="toggleSeg('seg1')">
      <span class="seg-caret"></span>
      <span class="seg-title">经营快照</span>
      <span class="seg-pill">新增按创建日期 · 办结/产值按办结日期 · 到账按到账日期</span>
      <span class="kpi-strip">
        进行中 <b>{{ kpi.activeProjects ?? 0 }}</b> · 在册 <b>{{ kpi.allProjects ?? 0 }}</b> · 本期办结率 <b>{{ kpi.completedRate ?? 0 }}%</b>
      </span>
    </div>
    <el-collapse-transition>
    <div v-show="!collapsed.seg1" class="tile-row" v-loading="loading">
      <div v-for="t in tiles" :key="t.key" class="tile tile-click" :class="{ 'tile-warn': t.warn }" @click="t.drill()">
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
    </el-collapse-transition>

    <!-- ===== 段2 业务结构：类别构成 + 类别画像 / 本期办结占比 ===== -->
    <div class="seg-head seg-toggle" :class="{ 'seg-collapsed': collapsed.seg2 }" @click="toggleSeg('seg2')">
      <span class="seg-caret"></span>
      <span class="seg-title">业务结构</span>
      <span class="seg-pill">数量/合同额按创建日期 · 产值按办结日期 · 类别口径：定线/验线/管线图/实测/其它</span>
      <span v-if="collapsed.seg2" class="seg-collapse-summary">{{ seg2Summary }}</span>
    </div>
    <!-- ⚠️ el-collapse-transition 只接受单一子节点：段内多行必须用下面这层 div 包住，
         否则第二个及以后的兄弟节点会被 Vue Transition 直接丢弃（不报错、不渲染） -->
    <el-collapse-transition>
    <div v-show="!collapsed.seg2">
    <div class="chart-row structure-row">
      <div class="chart-card chart-wide" v-loading="structureLoading">
        <div class="chart-header">
          <span class="chart-title">项目类别构成与产值画像</span>
          <span class="chart-subtitle">按类别占比 · 点击饼图或表格行查看明细</span>
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
                  <th class="pt-name">类别</th>
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
      <div class="chart-card chart-narrow seg2-right" v-loading="structureLoading || pipelineLoading">
        <div class="seg2-block">
        <div class="chart-header">
          <span class="chart-title">本期办结占比</span>
          <span class="chart-subtitle">点击条形或图例查看明细</span>
        </div>
        <template v-if="closedSegments.length">
          <div class="biz-close-hero">
            <span class="biz-close-num">{{ closedTotal }}</span>
            <span class="biz-close-unit">个办结</span>
            <span class="biz-close-sub">覆盖 {{ closedSegments.length }} 个类别</span>
          </div>
          <div class="stacked-bar">
            <div
              v-for="seg in closedSegments"
              :key="seg.bucket"
              class="stacked-seg stacked-clickable"
              :style="{ width: seg.width + '%', background: BUCKET_COLORS[seg.bucket] }"
              :title="seg.bucketName + ' ' + seg.count + ' 个（' + seg.ratio + '%）'"
              @click="closedDrill(seg)"
            ></div>
          </div>
          <div class="stacked-legend">
            <div
              v-for="seg in closedSegments"
              :key="seg.bucket"
              class="stacked-legend-item stacked-clickable"
              :title="seg.bucketName + ' ' + seg.count + ' 个（' + seg.ratio + '%）'"
              @click="closedDrill(seg)"
            >
              <span class="bucket-dot" :style="{ background: BUCKET_COLORS[seg.bucket] }"></span>
              <span class="stacked-legend-name">{{ seg.bucketName }}</span>
              <span class="sl-track"><span class="sl-fill" :style="{ width: seg.ratio + '%', background: BUCKET_COLORS[seg.bucket] }"></span></span>
              <span class="stacked-legend-num">{{ seg.count }} 个 · {{ seg.ratio }}%</span>
            </div>
          </div>
        </template>
        <div v-else class="biz-close-empty">
          <el-empty description="本期暂无办结项目" :image-size="70" />
        </div>
        </div>
        <div class="seg2-sep"></div>
        <div class="seg2-block pipe-block">
          <div class="chart-header">
            <span class="chart-title">管线长度统计</span>
            <span class="chart-subtitle">{{ pipelineScopeText }}</span>
            <el-button class="trend-btn" link type="primary" size="small" @click="openPipelineTrend">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 11.5 L5.5 8 L8 10 L14 4" />
                <path d="M10.5 4 H14 V7.5" />
                <path d="M2 2 V14 H14" />
              </svg>
              趋势图
            </el-button>
          </div>
          <div class="pipe-hero">
            <span class="pipe-num">{{ pipelineHasData ? formatKm(pipelineTotalKm) : '—' }}</span>
            <span class="pipe-unit">千米</span>
            <span class="pipe-cover">覆盖 {{ pipelineProjectCount }} 个项目</span>
            <el-tooltip placement="top" :content="'统计周期：' + (pipeline.beginDate || '') + ' ~ ' + (pipeline.endDate || '')">
              <span class="pipe-hero-hint">统计口径</span>
            </el-tooltip>
          </div>
          <div class="pipe-split">
            <template v-if="pipelineCategories.length">
              <div
                v-for="c in pipelineCategories"
                :key="c.categoryId"
                class="pipe-row pipe-clickable"
                :title="c.categoryName + ' ' + formatKm(c.km) + ' 千米 / ' + c.projectCount + ' 个项目'"
                @click="pipelineCategoryDrill(c)"
              >
                <span class="pipe-row-name">{{ c.categoryName }}</span>
                <span class="pipe-track"><span class="pipe-fill" :style="{ width: (Number(c.km) / (Number(pipelineCategories[0].km) || 1) * 100) + '%' }"></span></span>
                <span class="pipe-row-km">{{ formatKm(c.km) }}<span class="pipe-row-unit">km</span></span>
              </div>
            </template>
            <div v-else class="pipe-empty">当前统计周期内无办结项目</div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </el-collapse-transition>

    <!-- ===== 段3 人员效能：项目经理 × 类别矩阵 ===== -->
    <div class="seg-head seg-toggle" :class="{ 'seg-collapsed': collapsed.seg3 }" @click="toggleSeg('seg3')">
      <span class="seg-caret"></span>
      <span class="seg-title">人员效能</span>
      <span class="seg-pill">多负责人项目按人重复计数 · 颜色仅标识类别，大小看数字与条长 · 三项指标均按项目办结日期计入统计周期</span>
      <span v-if="collapsed.seg3" class="seg-collapse-summary">{{ seg3Summary }}</span>
    </div>
    <el-collapse-transition>
    <div v-show="!collapsed.seg3" class="chart-card matrix-card" v-loading="structureLoading">
      <div class="chart-header">
        <span class="chart-title">项目经理 × 类别</span>
        <span class="chart-subtitle">点列头排序 · 点格子查看明细</span>
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
    </el-collapse-transition>

    <!-- ===== 段4 经营走势 ===== -->
    <div class="seg-head seg-toggle" :class="{ 'seg-collapsed': collapsed.seg4 }" @click="toggleSeg('seg4')">
      <span class="seg-caret"></span>
      <span class="seg-title">经营走势</span>
      <span class="seg-pill">产值按办结日期 · 仅外部产值 · 到账按到账日期</span>
      <span v-if="collapsed.seg4" class="seg-collapse-summary">{{ seg4Summary }}</span>
    </div>
    <el-collapse-transition>
    <div v-show="!collapsed.seg4" class="chart-row">
      <div class="chart-card chart-wide" v-loading="trendLoading">
        <div class="chart-header">
          <span class="chart-title">外部产值累计趋势</span>
          <span class="chart-subtitle">柱=当月增量 · 线=年内累计 · 点击查看明细</span>
        </div>
        <div ref="cumulativeRef" class="chart-canvas"></div>
      </div>
      <div class="chart-card chart-narrow" v-loading="trendLoading">
        <div class="chart-header">
          <span class="chart-title">项目动态</span>
          <span class="chart-subtitle">新增按创建日期 · 点击查看明细</span>
        </div>
        <div ref="dynamicRef" class="chart-canvas"></div>
      </div>
    </div>
    </el-collapse-transition>

    <!-- ===== 段5 风险与执行 ===== -->
    <div class="seg-head seg-toggle" :class="{ 'seg-collapsed': collapsed.seg5 }" @click="toggleSeg('seg5')">
      <span class="seg-caret"></span>
      <span class="seg-title">风险与执行</span>
      <span class="risk-badges">
        <span class="risk-badge clickable" @click.stop="openRiskGroup('debt')">欠款 {{ riskCounts.debtCount ?? 0 }}</span>
        <span class="risk-badge clickable" @click.stop="openRiskGroup('overdue')">工期超期 {{ riskCounts.overdueCount ?? 0 }}</span>
        <span class="risk-badge clickable" @click.stop="openRiskGroup('contractMissing')">未关联合同 {{ riskCounts.contractMissingCount ?? 0 }}</span>
        <!-- 旧版叫「待办」且取 alertCount = 工期超期数 + 待流转资料数：
             ① 与登录用户无关却叫"待办"，用户以为是自己的待办；
             ② overdueCount 被计两次（本行与"工期超期"徽标里的同一批）。
             现改为只表示资料口径并去掉可点击外观，避免误点。 -->
        <span class="risk-badge static" title="尚未完成资料登记流转的项目数（全局口径，非个人待办）">
          待流转资料 {{ riskCounts.pendingMaterialCount ?? 0 }}
        </span>
      </span>
    </div>
    <el-collapse-transition>
    <div v-show="!collapsed.seg5" class="chart-row last">
      <div class="chart-card chart-wide">
        <div class="chart-header">
          <span class="chart-title">应收欠款（按办结年份）</span>
          <span class="chart-subtitle">欠款 = 外产值 − 已到账 · 线为回款率 · 点击年份查看明细</span>
        </div>
        <div ref="debtRef" class="debt-canvas" v-loading="riskLoading"></div>
        <div class="chart-header risk-list-header">
          <span class="chart-title">风险行动清单</span>
          <span class="chart-subtitle">按严重度排序 · 点击查看项目详情</span>
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
          <span class="chart-subtitle">TOP10 · 累计外部产值 · 点击查看详情</span>
        </div>
        <div class="rank-list">
          <div
            v-for="(item, idx) in outputTop"
            :key="item.projectId ?? idx"
            class="rank-item"
            @click="openProjectDetail(item.projectId)"
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
    </el-collapse-transition>

    <!-- ===== 明细弹窗（磁贴 / 饼图 / 效能矩阵 / 类别画像 / 走势 / 风险区 统一点击后弹窗显示明细） ===== -->
    <ProjectDrillDialog
      v-model:visible="drillVisible"
      :title="drillTitle"
      :type="drillType"
      :query="drillQuery"
      :data-rows="drillDataRows"
    />

    <!-- 项目详情抽屉（风险清单项 / 产值排行行 / 明细弹窗行 点击打开） -->
    <ProjectDetailDrawer v-model:visible="detailVisible" :project-id="detailId" />

    <!-- 管线长度月度趋势（右列空间有限，卡片内只保留入口，点开看大图） -->
    <el-dialog
      v-model="pipelineTrendOpen"
      title="管线长度月度趋势"
      width="760px"
      top="8vh"
      @opened="renderPipelineTrendDialog"
    >
      <div class="pipe-dlg-meta">
        <span>统计周期：{{ pipeline.beginDate || "—" }} ~ {{ pipeline.endDate || "—" }}</span>
        <span>范围：{{ pipelineScopeText }}</span>
        <span>归属时间按项目办结日期 · 单位 千米</span>
      </div>
      <div ref="pipelineTrendRef" class="pipe-dlg-canvas"></div>
      <template #footer>
        <el-button size="small" @click="pipelineTrendOpen = false">关闭</el-button>
      </template>
    </el-dialog>
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
  getDashboardRisk,
  getDashboardPipelineLength
} from "@/api/project/dashboard"
import { getLeaderOptions, getDistinctValues } from "@/api/project/project"
import { categoryTreeselectFull } from "@/api/project/category"
import ProjectDrillDialog from "@/components/ProjectDrillDialog/index.vue"
import ProjectDetailDrawer from "@/components/ProjectDetailDrawer/index.vue"

const router = useRouter()

// ===== 类别 5 桶（口径与后端契约一致：定线/验线/管线图/实测/其它） =====
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
const quickPeriod = ref("year")
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
  // 默认「本年」：本月口径下办结项目常为 0，驾驶舱多张卡片会同时空态
  dateRange.value = [fmtDate(new Date(now.getFullYear(), 0, 1)), fmtDate(now)]
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
const pipelineLoading = ref(false)
const summary = ref({})
const structure = ref({})
const trend = ref({})
const risk = ref({})
const pipeline = ref({})

// ===== 图表 refs =====
const pieCountRef = ref(null)
const pieContractRef = ref(null)
const pieInternalRef = ref(null)
const pieExternalRef = ref(null)
const cumulativeRef = ref(null)
const dynamicRef = ref(null)
const debtRef = ref(null)
const pipelineTrendRef = ref(null)
let charts = {}
/** 趋势弹窗的图表实例单独管理：弹窗销毁后容器会消失，不能并入 handleResize 的 charts */
let pipelineTrendChart = null

// ===== 计算属性 =====
const kpi = computed(() => summary.value.kpi || {})
const categoryStats = computed(() => structure.value.categoryStats || [])

// ===== 管线长度统计卡片 =====
const pipelineTrendOpen = ref(false)
const pipelineTotalKm = computed(() => Number(pipeline.value.totalKm) || 0)
const pipelineProjectCount = computed(() => Number(pipeline.value.projectCount) || 0)
const pipelineCategories = computed(() => pipeline.value.categories || [])
/** 周期内有办结项目才算有数据；否则大数字显示「—」，避免 0.00 被误读成"算出0" */
const pipelineHasData = computed(() => pipelineProjectCount.value > 0 || pipelineCategories.value.length > 0)
/** 当前生效的统计范围（回显后端配置，便于核对某类别为何没算进来） */
const pipelineScopeText = computed(() => {
  const keys = pipeline.value.categoryKeys || ""
  const ex = pipeline.value.categoryExcludes || ""
  return `类别名含「${keys}」` + (ex ? ` · 排除「${ex}」` : "")
})
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
      drill: () => openContractDrill("本年合同额 · 明细", "year")
    },
    {
      key: "monthContract", label: "本月合同额", pill: "按签署日期", money: true,
      value: mc.value ?? 0, prev: mc.prev ?? 0, delta: mc.deltaPct ?? null, deltaLabel: mc.deltaLabel || "环比",
      prevText: `上月 ¥${formatMoney(mc.prev ?? 0)}`,
      drill: () => openContractDrill("本月合同额 · 明细", "month")
    },
    {
      key: "periodNew", label: "本期新增", pill: "按创建日期", money: false,
      value: pn.value ?? 0, prev: pn.prev ?? 0,
      prevText: `上期 ${pn.prev ?? 0} 个`,
      drill: () => openDrill("本期新增 · 明细", "new")
    },
    {
      key: "periodCompleted", label: "本期办结", pill: "按办结日期", money: false,
      value: pc.value ?? 0, prev: pc.prev ?? 0,
      prevText: `上期 ${pc.prev ?? 0} 个`,
      drill: () => openDrill("本期办结 · 明细", "close")
    },
    {
      key: "periodPayment", label: "本期到账", pill: "按到账日期", money: true,
      value: pp.value ?? 0, prev: pp.prev ?? 0,
      prevText: `上期 ¥${formatMoney(pp.prev ?? 0)}`,
      drill: () => openPaymentRange("本期到账 · 明细")
    },
    {
      key: "periodOverdue", label: "本期超期", pill: "手动录入项目", money: false,
      value: po.value ?? 0, prev: po.prev ?? 0,
      prevText: `上期 ${po.prev ?? 0} 个`,
      // 明细与磁贴数字**同源**（后端同一次 collectOverdueInPeriod 产出，含「本期内超期、后已办结」的项目）。
      // ⚠️ 不能走项目列表 overdue 筛选：那是「在办超期」口径，会把这些项目漏掉 ⇒ 磁贴有数字、弹窗空白。
      drill: () => {
        const rows = summary.value.periodOverdueProjects || []
        openDataDrill(`本期超期 · 明细（${rows.length} 个）`, "overdue", rows)
      }
    },
    {
      // 合同超期：录入满 3 个工作日仍未关联合同的在册项目（当前时点口径，非区间）
      key: "contractMissing", label: "合同超期", pill: "实时", money: false,
      value: riskCounts.value.contractMissingCount ?? 0,
      warn: (riskCounts.value.contractMissingCount ?? 0) > 0,
      prevText: "点击查看明细",
      drill: () => openRiskGroup("contractMissing")
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
  const metric = matrixMetric.value
  // 矩阵三指标统一按「项目办结日期」口径（见 ProjDashboardMapper#leaderBucketMatrix）
  // ⇒ 下钻一律用办结窗口，保证弹窗明细与格子数值同源（若用新增窗口会与格子数字对不上）
  const dateField = "close"
  const outputOrder = metric === "count" ? null : `${metric}_desc`
  openDrill(
    `${row.leaderName} · ${bucketName(b)} · ${METRIC_LABEL[metric] || metric}`,
    dateField,
    { leaderId: row.leaderId, ...bucketFilter(b), outputOrder }
  )
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

async function fetchPipelineLength() {
  pipelineLoading.value = true
  try {
    const res = await getDashboardPipelineLength(buildParams())
    pipeline.value = res.data || {}
    await nextTick()
  } catch (e) {
    console.error("Dashboard pipelineLength error:", e)
  } finally {
    pipelineLoading.value = false
  }
}

/** 打开管线长度趋势弹窗（弹窗动画结束后容器才有尺寸，必须等 @opened 再 init 图表） */
function openPipelineTrend() {
  pipelineTrendOpen.value = true
}

function renderPipelineTrendDialog() {
  const el = pipelineTrendRef.value
  if (!el) return
  if (!pipelineTrendChart) pipelineTrendChart = echarts.init(el)
  const monthly = pipeline.value.monthly || []
  const labels = monthly.map(d => d.label)
  const kms = monthly.map(d => Number(d.km) || 0)

  pipelineTrendChart.setOption({
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: "#e8eaed",
      textStyle: { color: "#303133" },
      formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker} 管线长度: ${formatKm(p[0].value)} 千米`
    },
    grid: { top: 28, left: 6, right: 22, bottom: 6, containLabel: true },
    xAxis: {
      type: "category", data: labels,
      axisLine: { lineStyle: { color: "#e8eaed" } },
      axisLabel: { color: "#909399", fontSize: 12 },
      axisTick: { show: false }
    },
    yAxis: {
      type: "value", name: "千米",
      nameTextStyle: { color: "#909399", fontSize: 11 },
      splitLine: { lineStyle: { color: "#f0f0f0", type: "dashed" } },
      axisLabel: { color: "#909399", fontSize: 12, formatter: v => Number(v).toLocaleString("zh-CN") }
    },
    series: [{
      type: "bar", data: kms, barMaxWidth: 38,
      itemStyle: { color: "#36cfc9", borderRadius: [4, 4, 0, 0] },
      label: {
        show: labels.length <= 13,
        position: "top",
        color: "#8c8c8c",
        fontSize: 11,
        formatter: p => (Number(p.value) > 0 ? Number(p.value).toFixed(0) : "")
      }
    }]
  })
  pipelineTrendChart.resize()
}

/** 管线长度千分位展示（保留 2 位小数） */
function formatKm(v) {
  const n = Number(v) || 0
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 管线长度卡片：类别行 → 项目明细弹窗（办结窗口 + 该类别） */
function pipelineCategoryDrill(item) {
  openDrill(`${item.categoryName} · 管线长度明细`, "close", { categoryIds: [item.categoryId] })
}

function fetchAll() {
  fetchSummary()
  fetchStructure()
  fetchTrend()
  fetchRisk()
  fetchPipelineLength()
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

/** 单个「按类别占比」饼图：颜色标识类别，合计显示在标题右侧，点击切片下钻 */
function renderBucketPie(el, chartKey, metric) {
  if (!el) return
  if (!charts[chartKey]) charts[chartKey] = echarts.init(el)
  const chart = charts[chartKey]
  const money = metric !== "count"
  const rows = categoryStats.value.filter(c => Number(c[metric]) > 0)
  const data = rows.map(c => ({
    name: c.bucketName,
    value: Number(c[metric]) || 0,
    bucket: c.bucket,
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
    if (!d.bucket) return
    // 日期口径跟指标走：数量/合同额按新增日期，内/外产值按办结日期，并按该指标排序
    const dateField = (metric === "count" || metric === "contractAmount") ? "new" : "close"
    const outputOrder = metric === "count" ? null : `${metric}_desc`
    openDrill(
      `${d.name} · 本期${METRIC_LABEL[metric] || metric}`,
      dateField,
      { ...bucketFilter(d.bucket), outputOrder }
    )
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
  chart.off("click").on("click", params => {
    if (params.seriesName !== "当月产值") return
    const r = monthRange(params.name)
    openDrill(`${params.name} · 产值明细`, "none", {
      closeDateBegin: r.begin, closeDateEnd: r.end, outputOrder: "externalOutput_desc"
    })
  })
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
  chart.off("click").on("click", params => {
    const label = params.name
    const r = monthRange(label)
    if (params.seriesName === "新增") {
      openDrill(`${label} · 新增项目`, "none", { newDateBegin: r.begin, newDateEnd: r.end })
    } else if (params.seriesName === "办结") {
      openDrill(`${label} · 办结项目`, "none", { closeDateBegin: r.begin, closeDateEnd: r.end })
    } else if (params.seriesName === "到账金额") {
      openPaymentRange(`${label} · 到账明细`, r.begin, r.end)
    }
  })
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
  chart.off("click").on("click", params => {
    const y = String(params.name).replace("年", "")
    const rows = debtProjects.value.filter(r => String(r.closeTime || "").slice(0, 4) === y)
    openDataDrill(`${y}年 · 欠款项目明细`, "debt", rows)
  })
}

// ===== 下钻导航 =====
function goPage(path) { router.push(path) }
function goProjectDetail(id) { router.push({ path: "/project/list", query: { id } }) }

/** 当前周期闭区间 { beginDate, endDate }（YYYY-MM-DD） */
function periodWindow() {
  if (!dateRange.value || dateRange.value.length !== 2) return {}
  return { beginDate: dateRange.value[0], endDate: dateRange.value[1] }
}

/** 叠加全局轻筛选（委托单位/负责人/类别）→ 项目列表查询参数 */
function withGlobalFilters(q) {
  const out = { ...(q || {}) }
  if (filters.clientUnit) out.clientUnit = filters.clientUnit
  if (filters.leaderId) out.leaderId = filters.leaderId
  if (filters.categoryId) out.projectCategoryId = filters.categoryId
  return out
}

/**
 * 日期口径 → 项目列表查询参数。
 * dateField：'new' 新增口径（默认，后端按来源分流）/ 'close' 办结口径 / 'assign' 安排日期 / 'none' 不带日期窗
 */
function dateWindowParams(dateField) {
  const w = periodWindow()
  if (!w.beginDate || dateField === "none") return {}
  if (dateField === "close") return { closeDateBegin: w.beginDate, closeDateEnd: w.endDate }
  if (dateField === "assign") return { assignDateBegin: w.beginDate, assignDateEnd: w.endDate }
  return { newDateBegin: w.beginDate, newDateEnd: w.endDate }
}

// ⚠️ 原「下钻项目列表页」入口已下线：带条件跳 /project/list 会把隐藏筛选带进列表页，
//    用户看不到、再叠加条件查询时结果不符预期。统计明细一律在弹窗内查看。

// ===== 明细弹窗（磁贴 / 饼图 / 效能矩阵 / 类别画像 / 走势 / 风险区 统一改为弹窗显示明细） =====
const drillVisible = ref(false)
const drillTitle = ref("明细")
const drillType = ref("project")
const drillQuery = ref({})
const drillDataRows = ref([])

const METRIC_LABEL = { count: "项目数", contractAmount: "合同额", internalOutput: "内产值", externalOutput: "外产值" }

/** 桶 → 小类 id 数组（后端 categoryIds；缺省回退到单一 categoryId） */
function bucketIdsOf(bucket) {
  const hit = categoryStats.value.find(c => c.bucket === bucket)
  if (hit && Array.isArray(hit.categoryIds) && hit.categoryIds.length) return hit.categoryIds
  const single = bucketCategoryId.value[bucket]
  return single ? [single] : []
}

/**
 * 桶 → 项目列表查询参数（下钻弹窗 / 列表页共用）。
 * ⚠️「其它」桶的口径含「未分类」项目（无 project_category_id 的项目按类别名映射恒落「其它」），
 * 故下钻必须带 categoryIncludeNull，否则桶内数字有值、点开明细为空（NULL 不匹配任何 IN）。
 * 四大主桶（定线/验线/管线图/实测）只含其自身小类，无需该标记。
 */
function bucketFilter(bucket) {
  const out = {}
  const ids = bucketIdsOf(bucket)
  if (ids.length) out.categoryIds = ids
  if (bucket === "qita") out.categoryIncludeNull = true
  return out
}

/**
 * 打开明细弹窗。query 直接透传给 /project/project/list。
 * @param {string} title 标题
 * @param {string} dateField 日期口径（'new'|'close'|'none'）
 * @param {object} extra 额外筛选（categoryIds 数组 / leaderId / outputOrder）
 */
function openDrill(title, dateField, extra) {
  const e = extra || {}
  const q = dateWindowParams(dateField)
  if (e.categoryIds && e.categoryIds.length) q.projectCategoryIds = e.categoryIds.join(",")
  // 「其它」桶下钻：连同「未分类」项目一并纳入，保证桶内数字与明细同口径
  if (e.categoryIncludeNull) q.categoryIncludeNull = "true"
  if (e.leaderId != null) q.leaderId = e.leaderId
  if (e.outputOrder) q.outputOrder = e.outputOrder
  if (e.contractStatus) q.contractStatus = e.contractStatus
  if (e.overdue) q.overdue = e.overdue
  if (e.closeDateBegin && e.closeDateEnd) { q.closeDateBegin = e.closeDateBegin; q.closeDateEnd = e.closeDateEnd }
  if (e.newDateBegin && e.newDateEnd) { q.newDateBegin = e.newDateBegin; q.newDateEnd = e.newDateEnd }
  drillType.value = "project"
  drillDataRows.value = []
  drillTitle.value = title
  drillQuery.value = withGlobalFilters(q)
  drillVisible.value = true
}

/** 打开「数据直传」明细弹窗（风险清单全量等，不走接口） */
function openDataDrill(title, type, rows) {
  drillType.value = type
  drillDataRows.value = rows || []
  drillQuery.value = {}
  drillTitle.value = title
  drillVisible.value = true
}

/** 'YYYY-MM' → 该月起止（含末日） */
function monthRange(label) {
  const parts = String(label).split("-")
  const y = Number(parts[0])
  const m = Number(parts[1])
  return { begin: `${label}-01`, end: fmtDate(new Date(y, m, 0)) }
}

/** 类别画像表格行 → 明细弹窗（数量口径：新增窗口） */
function bucketDrill(c) {
  openDrill(`${c.bucketName} · 本期明细`, "new", { ...bucketFilter(c.bucket) })
}

/** 本期办结占比（堆叠条 / 图例）→ 明细弹窗（办结窗口） */
function closedDrill(seg) {
  if (!seg || !Number(seg.count)) return
  openDrill(`${seg.bucketName} · 本期办结明细`, "close", { ...bucketFilter(seg.bucket) })
}

/** 合同额磁贴 → 合同明细弹窗（签署日期窗口：本年 / 本月 至今天） */
function openContractDrill(title, range) {
  const now = new Date()
  const begin = range === "year"
    ? `${now.getFullYear()}-01-01`
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  drillType.value = "contract"
  drillDataRows.value = []
  drillTitle.value = title
  drillQuery.value = { signDateBegin: begin, signDateEnd: fmtDate(now) }
  drillVisible.value = true
}

/** 到账明细弹窗（到账时间窗口；缺省=当前统计周期） */
function openPaymentRange(title, begin, end) {
  const w = periodWindow()
  const q = { dimension: "payTime", begin: begin || w.beginDate, end: end || w.endDate }
  if (filters.clientUnit) q.clientUnit = filters.clientUnit
  if (filters.leaderId) q.leaderId = filters.leaderId
  if (filters.categoryId) q.projectCategoryId = filters.categoryId
  drillType.value = "payment"
  drillDataRows.value = []
  drillTitle.value = title || "到账明细"
  drillQuery.value = q
  drillVisible.value = true
}

/** 风险分类徽标 → 该类全部风险明细弹窗（数据直传） */
const RISK_GROUP_TITLE = { debt: "欠款项目", overdue: "工期超期项目", contractMissing: "未关联合同项目" }
function openRiskGroup(type) {
  const rows = type === "debt" ? debtProjects.value
    : type === "overdue" ? overdueProjects.value
      : contractMissingProjects.value
  openDataDrill(`${RISK_GROUP_TITLE[type] || "风险"} · 全部 ${rows.length} 个`, type, rows)
}

function riskTypeText(t) { return RISK_TYPE_TEXT[t] || t }
function riskItemClick(it) {
  if (it && it.projectId != null) openProjectDetail(it.projectId)
}

// ===== 项目详情抽屉（风险清单项 / 排行行 / 明细弹窗行 共用） =====
const detailVisible = ref(false)
const detailId = ref(null)
function openProjectDetail(id) {
  if (id == null) return
  detailId.value = id
  detailVisible.value = true
}

// ===== 风险区数据（数据直传弹窗用） =====
const debtProjects = computed(() => risk.value.debtProjects || [])
const overdueProjects = computed(() => risk.value.overdueProjects || [])
const contractMissingProjects = computed(() => risk.value.contractMissingProjects || [])

// ===== 窗口缩放 =====
function handleResize() {
  Object.values(charts).forEach(c => c?.resize())
}

// ===== 栏目折叠（段级，纯展示状态，不影响数据请求与口径） =====
const SEG_KEYS = ["seg1", "seg2", "seg3", "seg4", "seg5"]
const collapsed = reactive({ seg1: false, seg2: false, seg3: false, seg4: false, seg5: false })
const allCollapsed = computed(() => SEG_KEYS.every(k => collapsed[k]))

/** 段2 收起态摘要：本期办结数与覆盖类别数 */
const seg2Summary = computed(() =>
  "本期办结 " + closedTotal.value + " 个 · 覆盖 " + closedSegments.value.length + " 个类别"
)

/** 段3 收起态摘要：负责人数与当前指标合计（跟随矩阵指标切换） */
const matrixGrandTotal = computed(() => matrixRows.value.reduce((s, r) => s + (Number(r.total) || 0), 0))
const seg3Summary = computed(() => matrixRows.value.length + " 人 · 合计 " + fmtMetric(matrixGrandTotal.value))

/** 段4 收起态摘要：累计外部产值与末月增量 */
const seg4Summary = computed(() => {
  const list = trend.value.cumulativeOutput || []
  if (!list.length) return ""
  const last = list[list.length - 1]
  return "累计外产值 ¥" + formatMoney(last.cumulative) + " · 末月新增 ¥" + formatMoney(last.monthly)
})

function toggleSeg(key) {
  collapsed[key] = !collapsed[key]
  if (!collapsed[key]) resizeVisibleCharts()
}

function toggleAll() {
  const next = !allCollapsed.value
  SEG_KEYS.forEach(k => { collapsed[k] = next })
  if (!next) resizeVisibleCharts()
}

/**
 * 折叠用 display:none 隐藏内容 ⇒ ECharts 容器宽高归零，展开后必须重算尺寸。
 * 等折叠高度过渡（约 0.3s）结束，仅对「当前真实渲染」的图表 resize，隐藏的跳过。
 */
function resizeVisibleCharts() {
  const entries = [
    ["pieCount", pieCountRef], ["pieContract", pieContractRef],
    ["pieInternal", pieInternalRef], ["pieExternal", pieExternalRef],
    ["cumulative", cumulativeRef], ["dynamic", dynamicRef], ["debt", debtRef]
  ]
  nextTick(() => {
    window.setTimeout(() => {
      entries.forEach(([key, elRef]) => {
        const el = elRef.value
        const chart = charts[key]
        if (!chart || !el) return
        if (!el.getClientRects().length) return
        chart.resize()
      })
    }, 320)
  })
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
    // 只取叶子节点（小类）：项目只能挂小类，列出大类会选不到任何数据
    const flat = []
    const walk = nodes => (nodes || []).forEach(n => {
      if (n.children && n.children.length) {
        walk(n.children)
      } else {
        flat.push({ id: n.id, name: n.name || n.label })
      }
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

/* ===== 段标题行（点击整行收起 / 展开该栏目） ===== */
.seg-head {
  display: flex;
  align-items: center;
  gap: 10px;
  /* 负外边距抵消 hover 内边距，保证标题视觉位置与改动前完全一致 */
  margin: -2px -12px 10px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(24, 144, 255, 0.06);

    .seg-caret { border-color: $accent-blue; }
  }

  /* 折叠箭头：展开态朝下，收起态朝右 */
  .seg-caret {
    flex: 0 0 auto;
    width: 6px;
    height: 6px;
    margin-top: -4px;
    border-right: 1.5px solid $text-muted;
    border-bottom: 1.5px solid $text-muted;
    transform: rotate(45deg);
    transition: transform 0.2s ease, border-color 0.15s ease;
  }

  &.seg-collapsed {
    margin-bottom: 12px;

    .seg-caret { transform: rotate(-45deg); }
  }

  /* 收起后仍可见的关键数字（段2 / 段3 / 段4） */
  .seg-collapse-summary {
    margin-left: auto;
    font-size: 12px;
    color: $text-secondary;
    white-space: nowrap;
  }

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

      &.clickable {
        cursor: pointer;
        transition: color 0.15s ease, background 0.15s ease;

        &:hover { color: $accent-blue; background: rgba(24, 144, 255, 0.1); }
      }

      // 纯展示型徽标：与可点击项在视觉上明确区分（此前四枚外观一致，用户点了没反应以为坏了）
      &.static {
        cursor: default;
        color: $text-muted;
        background: #f7f8fa;
      }
    }
  }
}

/* ===== 段1 经营快照磁贴（7 个，按容器自适应列宽） ===== */
.tile-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
  min-height: 108px;
}

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
  /* 合同超期（风险类）数值用警示色，与正向指标区分 */
  &.tile-warn .tile-value { color: $accent-red; }

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

/* 段2：右卡与左卡等高，卡内内容纵向分布，消除卡外留白 */
.chart-row.structure-row { align-items: stretch; }

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

/* ===== 段2：类别构成 + 画像 ===== */
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

/* 段2 右：办结占比卡（与左卡等高，内容纵向分布） */
.biz-close-card {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.biz-close-hero {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;

  .biz-close-num {
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
  }

  .biz-close-unit { font-size: 12px; color: $text-secondary; }
  .biz-close-sub { margin-left: auto; font-size: 11px; color: $text-muted; }
}

.biz-close-foot {
  margin-top: 8px;
  font-size: 11px;
  color: $text-muted;
}

.biz-close-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;

  .biz-close-empty-sub { font-size: 11px; color: $text-muted; }
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
  height: 30px;
  border-radius: 15px;
  overflow: hidden;
  background: #f0f2f5;

  .stacked-seg {
    height: 100%;
    min-width: 2px;
    transition: width 0.4s ease;
  }
}

.stacked-clickable { cursor: pointer; }
.stacked-bar .stacked-seg.stacked-clickable:hover { box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.18); }
.stacked-legend-item.stacked-clickable:hover { border-color: #d9e2ef; background: #f2f6fc; }

/* 图例：单行紧凑排布（5 类别时约占 130px）。刻意不用 flex:1 + space-between 撑满，
   避免类别少时在卡片底部留出 300px 的假空白 */
.stacked-legend {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;

  .stacked-legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 6px;
    background: #fafbfc;

    .stacked-legend-name {
      flex: 0 0 42px;
      color: $text-primary;
      font-weight: 600;
      white-space: nowrap;
    }

    .sl-track {
      flex: 1 1 auto;
      height: 6px;
      border-radius: 3px;
      background: #eef1f5;
      overflow: hidden;
    }

    .sl-fill {
      display: block;
      height: 100%;
      border-radius: 3px;
      transition: width 0.4s ease;
    }

    .stacked-legend-num {
      flex: 0 0 auto;
      min-width: 66px;
      text-align: right;
      font-size: 11px;
      color: $text-secondary;
    }
  }
}

/* ===== 段3：效能矩阵 ===== */
.matrix-card { margin-bottom: 16px; }

/* 限高滚动（约 8 行可见）：项目经理人多时不再撑高整页；表头吸顶、合计行吸底便于对照
   高度 = 表头 27 + 合计行 27 + 8 行 × 44 ≈ 406px（真实行高实测值，勿凭感觉调）
   曾为 566px（10 行 × 50），用户反馈整块太高，行距压紧后收到 8 行 */
.matrix-scroll {
  overflow: auto;
  max-height: 406px;

  thead th {
    position: sticky;
    top: 0;
    z-index: 2;
  }

  tfoot td {
    position: sticky;
    bottom: 0;
    z-index: 2;
    box-shadow: 0 -1px 0 $border-card;
  }
}

.mx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 720px;

  th, td {
    padding: 5px 10px;
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
      line-height: 17px;
    }

    .mx-name-sub { color: $text-muted; font-size: 11px; margin-top: 1px; line-height: 15px; }
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

/* ===== 段2 右列：本期办结占比 + 管线长度，两块共用一张卡（整体高度由左卡约束）===== */
.seg2-right {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.seg2-block {
  min-height: 0;
}

.pipe-block {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}

.seg2-sep {
  flex: 0 0 1px;
  height: 1px;
  margin: 9px 0;
  background: #f0f2f5;
}

.pipe-hero {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-bottom: 7px;
}

.pipe-num {
  font-size: 28px;
  font-weight: 700;
  color: #13c2c2;
  line-height: 1.1;
  letter-spacing: -0.4px;
}

.pipe-unit {
  font-size: 12px;
  color: $text-primary;
  font-weight: 600;
}

.pipe-cover {
  margin-left: auto;
  margin-right: 4px;
  font-size: 12px;
  color: #909399;
}

.pipe-hero-hint {
  padding: 1px 6px;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  font-size: 11px;
  color: #909399;
  cursor: help;
}

.pipe-split {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.pipe-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 5px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover {
    background: #f7fbfa;
  }
}

.pipe-row-name {
  flex: 0 0 58px;
  font-size: 12px;
  color: $text-primary;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pipe-track {
  flex: 1 1 auto;
  height: 6px;
  border-radius: 3px;
  background: #f2f4f7;
  overflow: hidden;
}

.pipe-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #5ad8d0, #13c2c2);
  transition: width 0.5s ease;
}

.pipe-row-km {
  flex: 0 0 auto;
  min-width: 56px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  color: #13c2c2;
  white-space: nowrap;
}

.pipe-row-unit {
  font-size: 10px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}

.pipe-empty {
  padding: 10px 0;
  text-align: center;
  font-size: 12px;
  color: #909399;
}

/* 右上「趋势图」入口：卡片内只留按钮，大图走弹窗 */
.trend-btn {
  margin-left: auto;
  padding: 0;
  height: auto;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 3px;

  &:hover { opacity: 0.8; }
}

/* 趋势弹窗 */
.pipe-dlg-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fafbfc;
  font-size: 12px;
  color: #909399;
}

.pipe-dlg-canvas {
  width: 100%;
  height: 340px;
}
</style>
