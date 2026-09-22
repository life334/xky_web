<template>
   <div class="app-container">
      <!-- ========== 统计卡片区（点击查看明细） ========== -->
      <el-row v-loading="statsLoading" :gutter="16" class="stat-row">
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card stat-card-clickable" @click="openCardDetail('pending')">
               <div class="stat-body">
                  <div class="stat-icon" style="background: #ecf5ff; color: #409eff"><el-icon><Coin /></el-icon></div>
                  <div class="stat-info">
                     <div class="stat-label">待回款总额</div>
                     <div class="stat-value">{{ money(stats.pendingAmount) }}</div>
                     <div class="stat-sub">{{ stats.pendingCount || 0 }} 个项目未结清</div>
                  </div>
               </div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card stat-card-clickable" @click="openCardDetail('received')">
               <div class="stat-body">
                  <div class="stat-icon" style="background: #f0f9eb; color: #67c23a"><el-icon><Wallet /></el-icon></div>
                  <div class="stat-info">
                     <div class="stat-label">本月已回款</div>
                     <div class="stat-value">{{ money(stats.monthReceived) }}</div>
                     <div class="stat-sub">
                        较上月
                        <span :style="{ color: monthTrend >= 0 ? '#f56c6c' : '#67c23a' }">
                           {{ monthTrend >= 0 ? '↑' : '↓' }} {{ money(Math.abs(monthTrend)) }}
                        </span>
                     </div>
                  </div>
               </div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card stat-card-clickable" @click="openCardDetail('overdue')">
               <div class="stat-body">
                  <div class="stat-icon" :style="{ background: overdueCount > 0 ? '#fef0f0' : '#f4f4f5', color: overdueCount > 0 ? '#f56c6c' : '#909399' }">
                     <el-icon><Bell /></el-icon>
                  </div>
                  <div class="stat-info">
                     <div class="stat-label">超账期预警</div>
                     <div class="stat-value" :style="{ color: overdueCount > 0 ? '#f56c6c' : '' }">{{ overdueCount || 0 }}</div>
                     <div class="stat-sub">账龄超 6 个月未结清</div>
                  </div>
               </div>
            </el-card>
         </el-col>
         <el-col :span="6">
            <el-card shadow="hover" class="stat-card stat-card-clickable" @click="openCardDetail('unsettled')">
               <div class="stat-body">
                  <div class="stat-icon" style="background: #fdf6ec; color: #e6a23c"><el-icon><Timer /></el-icon></div>
                  <div class="stat-info">
                     <div class="stat-label">待结算提醒</div>
                     <div class="stat-value">{{ unsettledTotal || 0 }}</div>
                     <div class="stat-sub">已办结未录产值，应收无法计算</div>
                  </div>
               </div>
            </el-card>
         </el-col>
      </el-row>

      <!-- ========== 页签：待回款 / 待结算 ========== -->
      <el-tabs v-model="activeTab" class="collection-tabs" @tab-change="handleTabChange">
         <!-- ========== 页签一：待回款 ========== -->
         <el-tab-pane label="待回款" name="pending">
            <!-- Row 1: 全局搜索 -->
            <div class="search-bar-row">
               <div class="search-input-wrapper">
                  <el-input v-model="queryParams.keyword" placeholder="搜索工程编号/项目名称/客户全称..." clearable @keyup.enter="handleQuery" @clear="handleQuery" class="global-search-input">
                     <template #prefix><el-icon><Search /></el-icon></template>
                  </el-input>
               </div>
               <el-button type="primary" size="small" @click="handleQuery">搜索</el-button>
               <el-button size="small" @click="resetQuery">重置</el-button>
            </div>

            <!-- Row 2: 状态胶囊（催收状态 + 视图切换） -->
            <div class="status-capsule-row">
               <span class="capsule-group-label">催收状态</span>
               <span class="status-capsule" :class="{ active: !queryParams.collectStatus }" @click="setCollectStatus(undefined)">全部</span>
               <span class="status-capsule" :class="{ active: queryParams.collectStatus === 'never' }" @click="setCollectStatus('never')">从未催收</span>
               <span class="status-capsule" :class="{ active: queryParams.collectStatus === 'calling' }" @click="setCollectStatus('calling')">催收中</span>
               <span class="status-capsule" :class="{ active: queryParams.collectStatus === 'overdue' }" @click="setCollectStatus('overdue')">超期未催</span>
               <span class="capsule-sep" />
               <span class="capsule-group-label">视图</span>
               <span class="status-capsule" :class="{ active: viewMode === 'project' }" @click="setViewMode('project')">项目视图</span>
               <span class="status-capsule" :class="{ active: viewMode === 'client' }" @click="setViewMode('client')">客户视图</span>
            </div>

            <!-- Row 3: 高级筛选 -->
            <div class="advanced-toggle-row" @click="advancedVisible = !advancedVisible">
               <span>{{ advancedVisible ? '▲' : '▼' }} 高级筛选</span>
            </div>

            <!-- Row 4: 高级面板 -->
            <el-collapse-transition>
               <div v-show="advancedVisible" class="advanced-filter-panel">
                  <div class="filter-grid">
                     <div class="filter-item">
                        <div class="filter-item-label">项目名称</div>
                        <el-input v-model="queryParams.projectName" placeholder="项目名称" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">客户全称</div>
                        <el-input v-model="queryParams.clientUnit" placeholder="客户全称" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">账龄(月)</div>
                        <div class="range-inline">
                           <el-input-number v-model="queryParams.ageBegin" :min="0" :controls="false" placeholder="起" class="range-input" @keyup.enter="handleQuery" />
                           <span class="range-sep">-</span>
                           <el-input-number v-model="queryParams.ageEnd" :min="0" :controls="false" placeholder="止" class="range-input" @keyup.enter="handleQuery" />
                           <el-button type="primary" size="small" icon="Search" @click="handleQuery">查询</el-button>
                        </div>
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">完成时间（办结）</div>
                        <el-date-picker v-model="closeTimeRange" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" @change="handleQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">到账时间</div>
                        <el-date-picker v-model="payTimeRange" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" @change="handleQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">负责人</div>
                        <el-select v-model="queryParams.leaderId" filterable clearable placeholder="全部负责人" style="width:100%" :loading="userLoading" @change="handleQuery">
                           <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                        </el-select>
                     </div>
                  </div>
                  <div class="quick-filter-row">
                     <span class="collapse-link" @click="advancedVisible = false">收起 ▲</span>
                  </div>
               </div>
            </el-collapse-transition>

            <!-- Row 5: 操作按钮行 -->
            <el-row :gutter="10" class="mb8">
               <el-col :span="1.5">
                  <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:collection:export']">导出催款清单</el-button>
               </el-col>
               <el-col :span="1.5" style="margin-left:auto">
                  <right-toolbar size="small" v-model:showSearch="showSearch" @queryTable="getList" />
               </el-col>
            </el-row>

            <!-- 项目视图 -->
            <el-table v-if="viewMode === 'project'" v-loading="loading" :data="pendingList" stripe border v-hover-h-scroll>
               <el-table-column label="工程编号" align="center" prop="projectCode" min-width="120" :show-overflow-tooltip="true" />
               <el-table-column label="项目名称" align="left" prop="projectName" min-width="160" :show-overflow-tooltip="true" />
               <el-table-column label="客户全称" align="left" prop="clientUnit" min-width="160" :show-overflow-tooltip="true" />
               <el-table-column label="办结时间" align="center" prop="closeTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.closeTime) }}</template>
               </el-table-column>
               <el-table-column label="账龄(月)" align="center" prop="debtMonths" min-width="100" sortable>
                  <template #default="scope">
                     <span :class="ageClass(scope.row.debtMonths)">{{ scope.row.debtMonths }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="应收金额(元)" align="right" prop="receivable" min-width="120">
                  <template #default="scope">{{ money(scope.row.receivable) }}</template>
               </el-table-column>
               <el-table-column label="已收金额(元)" align="right" prop="received" min-width="120">
                  <template #default="scope">{{ money(scope.row.received) }}</template>
               </el-table-column>
               <el-table-column label="未收金额(元)" align="right" prop="unpaidAmount" min-width="120">
                  <template #default="scope">
                     <span style="color: #f56c6c; font-weight: 600">{{ money(scope.row.unpaidAmount) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="回款进度" align="center" min-width="130">
                  <template #default="scope">
                     <el-progress :percentage="progressOf(scope.row)" :stroke-width="10" :color="progressColor" />
                  </template>
               </el-table-column>
               <el-table-column label="最近到账" align="center" prop="lastPayTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.lastPayTime) }}</template>
               </el-table-column>
               <el-table-column label="催收状态" align="center" prop="collectStatus" min-width="100">
                  <template #default="scope">
                     <el-tag :type="collectTagType(scope.row.collectStatus)" effect="dark" size="small">
                        {{ collectText(scope.row.collectStatus) }}
                     </el-tag>
                  </template>
               </el-table-column>
               <el-table-column label="操作" align="center" width="180" fixed="right" class-name="small-padding fixed-width">
                  <template #default="scope">
                     <el-button link type="primary" size="small" @click="handleAddPayment(scope.row)" v-hasPermi="['project:payment:add']">登记回款</el-button>
                     <el-button link type="warning" size="small" @click="handleShowLog(scope.row)" v-hasPermi="['project:collection:log']">催收</el-button>
                  </template>
               </el-table-column>
            </el-table>

            <!-- 客户视图 -->
            <el-table v-else v-loading="loading" :data="clientList" stripe border v-hover-h-scroll @expand-change="handleClientExpand">
               <el-table-column type="expand">
                  <template #default="scope">
                     <el-table :data="scope.row.projectRows || []" size="small" border style="margin: 4px 24px" v-loading="scope.row.expanding">
                        <el-table-column label="工程编号" align="center" prop="projectCode" min-width="110" />
                        <el-table-column label="项目名称" align="left" prop="projectName" min-width="150" :show-overflow-tooltip="true" />
                        <el-table-column label="办结时间" align="center" min-width="95">
                           <template #default="s">{{ fmtDate(s.row.closeTime) }}</template>
                        </el-table-column>
                        <el-table-column label="账龄(月)" align="center" min-width="85">
                           <template #default="s"><span :class="ageClass(s.row.debtMonths)">{{ s.row.debtMonths }}</span></template>
                        </el-table-column>
                        <el-table-column label="应收(元)" align="right" min-width="110">
                           <template #default="s">{{ money(s.row.receivable) }}</template>
                        </el-table-column>
                        <el-table-column label="已收(元)" align="right" min-width="110">
                           <template #default="s">{{ money(s.row.received) }}</template>
                        </el-table-column>
                        <el-table-column label="未收(元)" align="right" min-width="110">
                           <template #default="s"><span style="color: #f56c6c; font-weight: 600">{{ money(s.row.unpaidAmount) }}</span></template>
                        </el-table-column>
                        <el-table-column label="催收状态" align="center" min-width="95">
                           <template #default="s">
                              <el-tag :type="collectTagType(s.row.collectStatus)" size="small">{{ collectText(s.row.collectStatus) }}</el-tag>
                           </template>
                        </el-table-column>
                        <el-table-column label="操作" align="center" width="150">
                           <template #default="s">
                              <el-button link type="primary" size="small" @click="handleAddPayment(s.row)" v-hasPermi="['project:payment:add']">登记回款</el-button>
                              <el-button link type="warning" size="small" @click="handleShowLog(s.row)" v-hasPermi="['project:collection:log']">催收</el-button>
                           </template>
                        </el-table-column>
                     </el-table>
                  </template>
               </el-table-column>
               <el-table-column label="客户全称" align="left" prop="clientUnit" min-width="200" :show-overflow-tooltip="true" />
               <el-table-column label="项目数" align="center" prop="projectCount" min-width="80" />
               <el-table-column label="应收合计(元)" align="right" prop="receivable" min-width="130">
                  <template #default="scope">{{ money(scope.row.receivable) }}</template>
               </el-table-column>
               <el-table-column label="已收合计(元)" align="right" prop="received" min-width="130">
                  <template #default="scope">{{ money(scope.row.received) }}</template>
               </el-table-column>
               <el-table-column label="欠款合计(元)" align="right" prop="unpaidAmount" min-width="130">
                  <template #default="scope"><span style="color: #f56c6c; font-weight: 600">{{ money(scope.row.unpaidAmount) }}</span></template>
               </el-table-column>
               <el-table-column label="最大账龄(月)" align="center" prop="maxDebtMonths" min-width="105">
                  <template #default="scope"><span :class="ageClass(scope.row.maxDebtMonths)">{{ scope.row.maxDebtMonths }}</span></template>
               </el-table-column>
               <el-table-column label="最早办结" align="center" prop="oldestCloseTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.oldestCloseTime) }}</template>
               </el-table-column>
               <el-table-column label="催收预警" align="center" min-width="160">
                  <template #default="scope">
                     <el-tag v-if="(scope.row.overdueCount || 0) > 0" type="danger" size="small">{{ scope.row.overdueCount }} 个超期未催</el-tag>
                     <el-tag v-else-if="(scope.row.neverCount || 0) > 0" type="info" size="small">{{ scope.row.neverCount }} 个从未催收</el-tag>
                     <el-tag v-else type="success" size="small">催收中</el-tag>
                  </template>
               </el-table-column>
            </el-table>

            <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
         </el-tab-pane>

         <!-- ========== 页签二：待结算 ========== -->
         <el-tab-pane :label="'待结算' + (unsettledTotal > 0 ? `(${unsettledTotal})` : '')" name="unsettled">
            <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px"
               title="以下项目已办结但费用结算未录入工作量明细（外部产值），应收金额无法计算，请先完成结算，避免欠款静默遗漏。" />

            <!-- Row 1: 全局搜索 -->
            <div class="search-bar-row">
               <div class="search-input-wrapper">
                  <el-input v-model="unsettledQuery.keyword" placeholder="搜索工程编号/项目名称/客户全称..." clearable @keyup.enter="handleUnsettledQuery" @clear="handleUnsettledQuery" class="global-search-input">
                     <template #prefix><el-icon><Search /></el-icon></template>
                  </el-input>
               </div>
               <el-button type="primary" size="small" @click="handleUnsettledQuery">搜索</el-button>
               <el-button size="small" @click="resetUnsettledQuery">重置</el-button>
            </div>

            <!-- Row 2: 高级筛选 -->
            <div class="advanced-toggle-row" @click="unsettledAdvancedVisible = !unsettledAdvancedVisible">
               <span>{{ unsettledAdvancedVisible ? '▲' : '▼' }} 高级筛选</span>
            </div>

            <!-- Row 3: 高级面板 -->
            <el-collapse-transition>
               <div v-show="unsettledAdvancedVisible" class="advanced-filter-panel">
                  <div class="filter-grid">
                     <div class="filter-item">
                        <div class="filter-item-label">工程编号</div>
                        <el-input v-model="unsettledQuery.projectCode" placeholder="工程编号" clearable @keyup.enter="handleUnsettledQuery" @clear="handleUnsettledQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">项目名称</div>
                        <el-input v-model="unsettledQuery.projectName" placeholder="项目名称" clearable @keyup.enter="handleUnsettledQuery" @clear="handleUnsettledQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">客户全称</div>
                        <el-input v-model="unsettledQuery.clientUnit" placeholder="客户全称" clearable @keyup.enter="handleUnsettledQuery" @clear="handleUnsettledQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">完成时间（办结）</div>
                        <el-date-picker v-model="unsettledCloseRange" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" @change="handleUnsettledQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">到账时间</div>
                        <el-date-picker v-model="unsettledPayRange" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" @change="handleUnsettledQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">负责人</div>
                        <el-select v-model="unsettledQuery.leaderId" filterable clearable placeholder="全部负责人" style="width:100%" :loading="userLoading" @change="handleUnsettledQuery">
                           <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                        </el-select>
                     </div>
                  </div>
                  <div class="quick-filter-row">
                     <span class="collapse-link" @click="unsettledAdvancedVisible = false">收起 ▲</span>
                  </div>
               </div>
            </el-collapse-transition>

            <el-table v-loading="unsettledLoading" :data="unsettledList" stripe border v-hover-h-scroll>
               <el-table-column label="工程编号" align="center" prop="projectCode" min-width="120" />
               <el-table-column label="项目名称" align="left" prop="projectName" min-width="180" :show-overflow-tooltip="true" />
               <el-table-column label="工程项目" align="left" prop="engineeringProject" min-width="140" :show-overflow-tooltip="true" />
               <el-table-column label="客户全称" align="left" prop="clientUnit" min-width="180" :show-overflow-tooltip="true" />
               <el-table-column label="办结时间" align="center" prop="closeTime" min-width="100">
                  <template #default="scope">{{ fmtDate(scope.row.closeTime) }}</template>
               </el-table-column>
               <el-table-column label="已收金额(元)" align="right" prop="received" min-width="120">
                  <template #default="scope">{{ money(scope.row.received) }}</template>
               </el-table-column>
               <el-table-column label="操作" align="center" width="120" fixed="right" class-name="small-padding fixed-width">
                  <template #default="scope">
                     <el-button link type="primary" size="small" @click="handleEntryWorkload(scope.row)" v-hasPermi="['project:settlement:edit']">录入工作量</el-button>
                  </template>
               </el-table-column>
            </el-table>
            <pagination v-show="unsettledTotal > 0" :total="unsettledTotal" v-model:page="unsettledQuery.pageNum" v-model:limit="unsettledQuery.pageSize" @pagination="getUnsettledList" />
         </el-tab-pane>
         <!-- ========== 页签三：到账统计 ========== -->
         <el-tab-pane label="到账统计" name="summary">
            <!-- Row 1: 统计口径 + 快捷区间 -->
            <div class="status-capsule-row">
               <span class="capsule-group-label">统计口径</span>
               <span class="status-capsule" :class="{ active: summaryDimension === 'payTime' }" @click="setSummaryDimension('payTime')">按到账时间</span>
               <span class="status-capsule" :class="{ active: summaryDimension === 'closeTime' }" @click="setSummaryDimension('closeTime')">按办结时间</span>
               <span class="capsule-sep" />
               <span class="capsule-group-label">快捷区间</span>
               <span v-for="q in SUMMARY_QUICKS" :key="q.value" class="status-capsule" :class="{ active: summaryQuick === q.value }" @click="setSummaryQuick(q.value)">{{ q.label }}</span>
            </div>

            <!-- Row 2: 区间 / 分组 / 操作 -->
            <div class="search-bar-row">
               <el-date-picker v-model="summaryRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" class="sum-range-picker" @change="handleSummaryQuery" />
               <el-select v-model="summaryGroupBy" style="width: 180px" @change="handleSummaryQuery">
                  <el-option v-for="g in SUMMARY_GROUPS" :key="g.value" :label="g.label" :value="g.value" />
               </el-select>
               <el-button type="primary" size="small" @click="handleSummaryQuery">查询</el-button>
               <el-button size="small" @click="resetSummaryQuery">重置</el-button>
               <el-button type="warning" plain icon="Download" size="small" style="margin-left: auto" @click="handleSummaryExport" v-hasPermi="['project:collection:export']">导出到账明细</el-button>
            </div>

            <!-- Row 3: 高级筛选 -->
            <div class="advanced-toggle-row" @click="summaryAdvancedVisible = !summaryAdvancedVisible">
               <span>{{ summaryAdvancedVisible ? '▲' : '▼' }} 高级筛选</span>
            </div>

            <!-- Row 4: 高级面板 -->
            <el-collapse-transition>
               <div v-show="summaryAdvancedVisible" class="advanced-filter-panel">
                  <div class="filter-grid">
                     <div class="filter-item">
                        <div class="filter-item-label">工程编号/项目名称</div>
                        <el-input v-model="summaryQuery.keyword" placeholder="编号或名称关键词" clearable @keyup.enter="handleSummaryQuery" @clear="handleSummaryQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">客户全称</div>
                        <el-input v-model="summaryQuery.clientUnit" placeholder="客户全称" clearable @keyup.enter="handleSummaryQuery" @clear="handleSummaryQuery" />
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">负责人</div>
                        <el-select v-model="summaryQuery.leaderId" filterable clearable placeholder="全部负责人" style="width:100%" :loading="userLoading" @change="handleSummaryQuery">
                           <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                        </el-select>
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">项目类别</div>
                        <el-select v-model="summaryQuery.projectCategoryId" filterable clearable placeholder="全部类别" style="width:100%" :loading="categoryLoading" @change="handleSummaryQuery">
                           <el-option v-for="c in categoryOptions" :key="c.id" :label="c.name" :value="c.id" />
                        </el-select>
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">付款类型</div>
                        <el-select v-model="summaryQuery.paymentType" clearable placeholder="全部类型" style="width:100%" @change="handleSummaryQuery">
                           <el-option v-for="d in proj_payment_type" :key="d.value" :label="d.label" :value="d.value" />
                        </el-select>
                     </div>
                     <div class="filter-item">
                        <div class="filter-item-label">付款单位</div>
                        <el-input v-model="summaryQuery.payUnit" placeholder="付款单位" clearable @keyup.enter="handleSummaryQuery" @clear="handleSummaryQuery" />
                     </div>
                  </div>
                  <div class="quick-filter-row">
                     <span class="collapse-link" @click="summaryAdvancedVisible = false">收起 ▲</span>
                  </div>
               </div>
            </el-collapse-transition>

            <!-- Row 5: 合计指标 -->
            <el-row v-loading="summaryLoading" :gutter="16" class="sum-metric-row">
               <el-col :span="6">
                  <div class="sum-metric">
                     <div class="sum-metric-label">{{ summaryMetricLabel }}</div>
                     <div class="sum-metric-value">{{ money(summarySummary.amount) }}</div>
                  </div>
               </el-col>
               <el-col :span="6">
                  <div class="sum-metric">
                     <div class="sum-metric-label">退款金额(元)</div>
                     <div class="sum-metric-value" style="color: #e6a23c">{{ money(summarySummary.refundAmount) }}</div>
                  </div>
               </el-col>
               <el-col :span="6">
                  <div class="sum-metric">
                     <div class="sum-metric-label">净额(元)</div>
                     <div class="sum-metric-value" :style="{ color: Number(summarySummary.netAmount || 0) < 0 ? '#f56c6c' : '#303133' }">{{ money(summarySummary.netAmount) }}</div>
                  </div>
               </el-col>
               <el-col :span="6">
                  <div class="sum-metric">
                     <div class="sum-metric-label">到账笔数</div>
                     <div class="sum-metric-value">{{ summarySummary.count || 0 }}</div>
                  </div>
               </el-col>
            </el-row>

            <!-- Row 6: 分组明细 -->
            <el-table v-if="summaryGroupBy !== 'none'" v-loading="summaryLoading" :data="summaryGroups" stripe border max-height="420" v-hover-h-scroll @row-click="handleSummaryDrill">
               <el-table-column label="分组维度" align="left" min-width="180">
                  <template #default="scope">{{ summaryLabel(scope.row) }}</template>
               </el-table-column>
               <el-table-column label="笔数" align="center" prop="count" width="100" />
               <el-table-column label="金额(元)" align="right" width="170">
                  <template #default="scope">
                     <span :style="{ color: Number(scope.row.amount) < 0 ? '#f56c6c' : '#303133', fontWeight: 600 }">{{ money(scope.row.amount) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="占比" align="left" min-width="220">
                  <template #default="scope">
                     <el-progress :percentage="summaryShare(scope.row)" :stroke-width="10" :color="progressColor" />
                  </template>
               </el-table-column>
               <el-table-column label="操作" align="center" width="90" fixed="right">
                  <template #default="scope">
                     <el-button link type="primary" size="small" @click.stop="handleSummaryDrill(scope.row)">明细</el-button>
                  </template>
               </el-table-column>
            </el-table>
            <el-empty v-else description="选择分组维度后可按维度查看金额分布，点行可下钻明细" :image-size="70" />

            <div v-if="summaryGroupBy === 'leader'" class="sum-tip">⚠️ 一个项目有多位负责人时，同一笔到账会在每位负责人下各计一次（合计不受影响）。</div>
            <div v-if="summaryDimension === 'closeTime'" class="sum-tip">按办结时间统计 = 该区间内办结项目的<b>累计</b>到账金额（不再限制到账时间）。</div>
         </el-tab-pane>
      </el-tabs>

      <!-- ========== 工作量录入弹窗（公共组件，与费用结算页同一实现） ========== -->
      <WorkloadDialog
         v-model="workloadOpen"
         :project-id="workloadProject.projectId"
         :project-code="workloadProject.projectCode"
         :client-unit="workloadProject.clientUnit"
         :project-location="workloadProject.projectLocation"
         :engineering-project="workloadProject.engineeringProject"
         @saved="handleWorkloadSaved"
      />

      <!-- ========== 统计卡明细弹窗 ========== -->
      <el-dialog
         :model-value="cardDialog.open"
         @update:model-value="cardDialog.open = $event"
         :title="cardDialog.title"
         append-to-body
         destroy-on-close
         :close-on-click-modal="false"
         class="scrollbar"
         width="1080px"
         draggable
      >
         <el-table v-loading="cardDialog.loading" :data="cardDialog.rows" stripe border max-height="440" v-hover-h-scroll>
            <el-table-column v-for="col in cardColumns" :key="col.prop" :label="col.label" :prop="col.prop" :width="col.width" :min-width="col.minWidth" :align="col.align" :show-overflow-tooltip="col.tip">
               <template #default="scope">
                  <template v-if="col.type === 'date'">{{ fmtDate(scope.row[col.prop]) }}</template>
                  <template v-else-if="col.type === 'money'">{{ money(scope.row[col.prop]) }}</template>
                  <template v-else-if="col.type === 'money-danger'"><span style="color: #f56c6c; font-weight: 600">{{ money(scope.row[col.prop]) }}</span></template>
                  <template v-else-if="col.type === 'money-signed'">
                     <span :style="{ color: Number(scope.row[col.prop]) < 0 ? '#f56c6c' : '', fontWeight: 600 }">{{ money(scope.row[col.prop]) }}</span>
                  </template>
                  <template v-else-if="col.type === 'payType'">
                     <el-tag :type="paymentTagType(scope.row[col.prop])" size="small">{{ paymentTypeText(scope.row[col.prop]) }}</el-tag>
                  </template>
                  <template v-else>{{ scope.row[col.prop] }}</template>
               </template>
            </el-table-column>
         </el-table>
         <pagination v-show="cardDialog.total > 0" :total="cardDialog.total" v-model:page="cardDialog.pageNum" v-model:limit="cardDialog.pageSize" @pagination="loadCardDetail" />
      </el-dialog>

      <!-- ========== 登记回款对话框 ========== -->
      <el-dialog title="登记回款" :model-value="payOpen" @update:model-value="payOpen = $event" width="600px" append-to-body>
         <el-form ref="payRef" :model="payForm" :rules="payRules" label-width="90px">
            <el-form-item label="所属项目">
               <el-input :model-value="payForm.projectName" disabled />
            </el-form-item>
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="付款类型" prop="paymentType">
                     <el-select v-model="payForm.paymentType" placeholder="请选择付款类型" style="width: 100%">
                        <el-option v-for="d in proj_payment_type" :key="d.value" :label="d.label" :value="d.value" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="金额(元)" prop="amount">
                     <el-input-number v-model="payForm.amount" :precision="2" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="付款时间" prop="payTime">
                     <el-date-picker v-model="payForm.payTime" type="date" placeholder="选择付款时间" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="付款单位">
                     <el-input v-model="payForm.payUnit" :placeholder="payForm.defaultPayUnit || '请输入付款单位'" maxlength="200" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-form-item label="付款方式">
               <el-select v-model="payForm.payMethod" placeholder="请选择付款方式" clearable filterable allow-create style="width: 100%">
                  <el-option label="银行转账" value="银行转账" />
                  <el-option label="现金" value="现金" />
                  <el-option label="支票" value="支票" />
                  <el-option label="电汇" value="电汇" />
               </el-select>
            </el-form-item>
            <el-form-item label="备注">
               <el-input v-model="payForm.remark" type="textarea" maxlength="500" :rows="2" placeholder="请输入备注" />
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" :loading="submitLoading" @click="submitPay">确 定</el-button>
               <el-button @click="payOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- ========== 催收记录抽屉 ========== -->
      <el-drawer v-model="logOpen" :title="'催收记录 — ' + (currentProject.projectCode || '')" size="560px">
         <div v-if="currentProject.unpaidAmount != null" class="log-summary">
            该项目未收 <span style="color: #f56c6c; font-weight: 600">{{ money(currentProject.unpaidAmount) }}</span> 元，
            账龄 <span :class="ageClass(currentProject.debtMonths)">{{ currentProject.debtMonths }}</span> 个月
         </div>
         <div v-loading="logLoading">
            <el-timeline v-if="logList.length > 0" style="margin-top: 16px">
               <el-timeline-item v-for="log in logList" :key="log.id" :timestamp="fmtDate(log.collectTime)" placement="top"
                  :type="log.nextCollectTime && log.nextCollectTime < todayStr ? 'danger' : 'primary'">
                  <div class="log-item">
                     <div class="log-head">
                        <el-tag size="small" effect="plain">{{ log.collectMethod || '未填方式' }}</el-tag>
                        <span v-if="log.contactName" class="log-contact">联系人：{{ log.contactName }}</span>
                        <el-button link type="danger" size="small" @click="handleDeleteLog(log)" v-hasPermi="['project:collection:log']">删除</el-button>
                     </div>
                     <div class="log-result">{{ log.collectResult || '（未填结果）' }}</div>
                     <div class="log-next" v-if="log.nextCollectTime">
                        下次催收：{{ fmtDate(log.nextCollectTime) }}
                        <span v-if="log.nextCollectTime < todayStr" style="color: #f56c6c">（已超期）</span>
                     </div>
                     <div class="log-remark" v-if="log.remark">{{ log.remark }}</div>
                     <div class="log-creator">登记人：{{ log.createBy }}</div>
                  </div>
               </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无催收记录，请在下方登记首次催收" :image-size="60" />
         </div>

         <el-divider content-position="left">登记催收</el-divider>
         <el-form ref="logRef" :model="logForm" :rules="logRules" label-width="90px">
            <el-row :gutter="16">
               <el-col :span="12">
                  <el-form-item label="催收时间" prop="collectTime">
                     <el-date-picker v-model="logForm.collectTime" type="date" placeholder="选择时间" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="催收方式" prop="collectMethod">
                     <el-select v-model="logForm.collectMethod" placeholder="请选择" style="width: 100%">
                        <el-option label="电话" value="电话" />
                        <el-option label="函件" value="函件" />
                        <el-option label="上门" value="上门" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="16">
               <el-col :span="12">
                  <el-form-item label="联系人">
                     <el-input v-model="logForm.contactName" maxlength="50" placeholder="对方联系人" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="下次催收" prop="nextCollectTime">
                     <el-date-picker v-model="logForm.nextCollectTime" type="date" placeholder="超期未催预警" value-format="YYYY-MM-DD" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-form-item label="催收结果">
               <el-input v-model="logForm.collectResult" maxlength="200" placeholder="如：对方承诺月底付款" />
            </el-form-item>
            <el-form-item label="备注">
               <el-input v-model="logForm.remark" type="textarea" :rows="2" maxlength="500" />
            </el-form-item>
            <el-form-item>
               <el-button type="primary" :loading="logSubmitLoading" @click="submitLog" v-hasPermi="['project:collection:log']">登记催收记录</el-button>
            </el-form-item>
         </el-form>
      </el-drawer>
   </div>
</template>

<script setup name="Collection">
import { collectionList, collectionClientList, collectionStats, collectionUnsettledList, collectionReceivedDetail, collectionPaymentSummary, collectionLog, addCollectionLog, delCollectionLog } from "@/api/project/collection"
import { addPayment } from "@/api/project/payment"
import { listUserOptions } from "@/api/system/user"
import { paymentTypeText } from "@/utils/projStatus"
import { categoryTreeselectFull } from "@/api/project/category"
import WorkloadDialog from "@/components/WorkloadDialog"

const { proxy } = getCurrentInstance()
const { proj_payment_type } = useDict('proj_payment_type')

const activeTab = ref('pending')
const viewMode = ref('project')
const loading = ref(false)
const showSearch = ref(true)
const pendingList = ref([])
const clientList = ref([])
const total = ref(0)
const stats = ref({})
const statsLoading = ref(false)   // KPI 统计加载中
const closeTimeRange = ref([])
const payTimeRange = ref([])
const advancedVisible = ref(false)

// 负责人下拉
const userOptions = ref([])
const userLoading = ref(false)

// 待结算
const unsettledLoading = ref(false)
const unsettledList = ref([])
const unsettledTotal = ref(0)
const unsettledCloseRange = ref([])
const unsettledPayRange = ref([])
const unsettledAdvancedVisible = ref(false)

// 工作量录入
const workloadOpen = ref(false)
const workloadProject = ref({})

// 统计卡明细弹窗
const cardDialog = reactive({
   open: false,
   type: '',
   title: '',
   loading: false,
   rows: [],
   total: 0,
   pageNum: 1,
   pageSize: 10,
   drillParams: {}
})

// ===== 到账统计 =====
const SUMMARY_QUICKS = [
   { label: '本月', value: 'month' },
   { label: '本季', value: 'quarter' },
   { label: '本年', value: 'year' },
   { label: '近12个月', value: 'last12' },
   { label: '全部', value: 'all' }
]
const SUMMARY_GROUPS = [
   { label: '不分组（仅合计）', value: 'none' },
   { label: '按客户', value: 'clientUnit' },
   { label: '按负责人', value: 'leader' },
   { label: '按付款类型', value: 'paymentType' },
   { label: '按项目类别', value: 'category' },
   { label: '按月', value: 'month' },
   { label: '按季', value: 'quarter' },
   { label: '按年', value: 'year' }
]
const summaryDimension = ref('payTime')
const summaryQuick = ref('all')
const summaryRange = ref([])
const summaryGroupBy = ref('none')
const summaryAdvancedVisible = ref(false)
const summaryLoading = ref(false)
const summarySummary = ref({})
const summaryGroups = ref([])
const summaryQuery = ref({ keyword: undefined, clientUnit: undefined, leaderId: undefined, projectCategoryId: undefined, paymentType: undefined, payUnit: undefined })

// 项目类别下拉（扁平化树）
const categoryOptions = ref([])
const categoryLoading = ref(false)

// 登记回款
const payOpen = ref(false)
const payForm = ref({})
const submitLoading = ref(false)   // 回款登记提交中

// 催收记录
const logOpen = ref(false)
const logList = ref([])
const currentProject = ref({})
const logForm = ref({})
const logLoading = ref(false)       // 催收记录加载中（抽屉内局部遮罩）
const logSubmitLoading = ref(false) // 登记催收提交中

const todayStr = (() => {
   const d = new Date()
   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()

const data = reactive({
   queryParams: {
      pageNum: 1,
      pageSize: 10,
      keyword: undefined,
      projectName: undefined,
      clientUnit: undefined,
      collectStatus: undefined,
      ageBegin: undefined,
      ageEnd: undefined,
      leaderId: undefined
   },
   unsettledQuery: {
      pageNum: 1,
      pageSize: 10,
      keyword: undefined,
      projectCode: undefined,
      projectName: undefined,
      clientUnit: undefined,
      leaderId: undefined
   },
   payRules: {
      paymentType: [{ required: true, message: "请选择付款类型", trigger: "change" }],
      amount: [{ required: true, message: "请输入金额", trigger: "blur" }],
      payTime: [{ required: true, message: "请选择付款时间", trigger: "change" }]
   },
   logRules: {
      collectTime: [{ required: true, message: "请选择催收时间", trigger: "change" }],
      collectMethod: [{ required: true, message: "请选择催收方式", trigger: "change" }]
   }
})

const { queryParams, unsettledQuery, payRules, logRules } = toRefs(data)

/** 本月回款环比 */
const monthTrend = computed(() => {
   const m = Number(stats.value.monthReceived || 0)
   const l = Number(stats.value.lastMonthReceived || 0)
   return m - l
})

const overdueCount = computed(() => stats.value.overdueCount || 0)

const progressColor = [
   { color: '#f56c6c', percentage: 30 },
   { color: '#e6a23c', percentage: 70 },
   { color: '#67c23a', percentage: 100 }
]

// ---- 统计卡明细：列定义 ----
const PENDING_COLUMNS = [
   { label: '工程编号', prop: 'projectCode', width: 130, align: 'center' },
   { label: '项目名称', prop: 'projectName', minWidth: 180, align: 'left', tip: true },
   { label: '客户全称', prop: 'clientUnit', minWidth: 180, align: 'left', tip: true },
   { label: '办结时间', prop: 'closeTime', width: 110, align: 'center', type: 'date' },
   { label: '账龄(月)', prop: 'debtMonths', width: 90, align: 'center' },
   { label: '应收金额(元)', prop: 'receivable', width: 125, align: 'right', type: 'money' },
   { label: '已收金额(元)', prop: 'received', width: 125, align: 'right', type: 'money' },
   { label: '未收金额(元)', prop: 'unpaidAmount', width: 125, align: 'right', type: 'money-danger' }
]

const CARD_COLUMNS = {
   pending: PENDING_COLUMNS,
   overdue: PENDING_COLUMNS,
   received: [
      { label: '工程编号', prop: 'projectCode', width: 140, align: 'center' },
      { label: '项目名称', prop: 'projectName', minWidth: 180, align: 'left', tip: true },
      { label: '客户全称', prop: 'clientUnit', minWidth: 180, align: 'left', tip: true },
      { label: '付款类型', prop: 'paymentType', width: 100, align: 'center', type: 'payType' },
      { label: '金额(元)', prop: 'amount', width: 125, align: 'right', type: 'money-signed' },
      { label: '到账时间', prop: 'payTime', width: 110, align: 'center', type: 'date' },
      { label: '付款单位', prop: 'payUnit', minWidth: 160, align: 'left', tip: true },
      { label: '付款方式', prop: 'payMethod', width: 100, align: 'center' }
   ],
   unsettled: [
      { label: '工程编号', prop: 'projectCode', width: 140, align: 'center' },
      { label: '项目名称', prop: 'projectName', minWidth: 180, align: 'left', tip: true },
      { label: '工程项目', prop: 'engineeringProject', minWidth: 150, align: 'left', tip: true },
      { label: '客户全称', prop: 'clientUnit', minWidth: 180, align: 'left', tip: true },
      { label: '办结时间', prop: 'closeTime', width: 110, align: 'center', type: 'date' },
      { label: '已收金额(元)', prop: 'received', width: 125, align: 'right', type: 'money' }
   ],
   summaryDrill: [
      { label: '工程编号', prop: 'projectCode', width: 130, align: 'center' },
      { label: '项目名称', prop: 'projectName', minWidth: 170, align: 'left', tip: true },
      { label: '客户全称', prop: 'clientUnit', minWidth: 150, align: 'left', tip: true },
      { label: '付款类型', prop: 'paymentType', width: 100, align: 'center', type: 'payType' },
      { label: '金额(元)', prop: 'amount', width: 125, align: 'right', type: 'money-signed' },
      { label: '到账时间', prop: 'payTime', width: 105, align: 'center', type: 'date' },
      { label: '办结时间', prop: 'closeTime', width: 105, align: 'center', type: 'date' },
      { label: '付款单位', prop: 'payUnit', minWidth: 140, align: 'left', tip: true },
      { label: '付款方式', prop: 'payMethod', width: 100, align: 'center' }
   ]
}

const CARD_TITLES = {
   pending: '待回款明细（已办结未结清项目）',
   received: '本月已回款明细',
   overdue: '超账期预警明细（账龄 ≥ 6 个月未结清）',
   unsettled: '待结算明细（已办结未录外部产值）',
   summaryDrill: '到账明细'
}

const cardColumns = computed(() => CARD_COLUMNS[cardDialog.type] || [])

/** 付款类型标签色：预付款/尾款/退款 */
function paymentTagType(type) {
   if (type === 'advance') return 'primary'
   if (type === 'refund') return 'danger'
   return 'success'
}

/** 查询列表（按当前视图） */
function getList() {
   loading.value = true
   if (viewMode.value === 'project') {
      const params = buildParams()
      collectionList(params).then(res => {
         pendingList.value = res.rows
         total.value = res.total
         loading.value = false
      }).catch(() => { loading.value = false })
   } else {
      collectionClientList({ ...buildParams(), projectName: undefined }).then(res => {
         clientList.value = res.rows
         total.value = res.total
         loading.value = false
      }).catch(() => { loading.value = false })
   }
}

/** 组装查询参数（完成时间 → closeTimeBegin/End；到账时间 → payTimeBegin/End） */
function buildParams() {
   const params = { ...queryParams.value }
   if (closeTimeRange.value && closeTimeRange.value.length === 2) {
      params.closeTimeBegin = closeTimeRange.value[0]
      params.closeTimeEnd = closeTimeRange.value[1]
   } else {
      params.closeTimeBegin = undefined
      params.closeTimeEnd = undefined
   }
   if (payTimeRange.value && payTimeRange.value.length === 2) {
      params.payTimeBegin = payTimeRange.value[0]
      params.payTimeEnd = payTimeRange.value[1]
   } else {
      params.payTimeBegin = undefined
      params.payTimeEnd = undefined
   }
   return params
}

/** 查询统计卡 */
function getStats() {
   statsLoading.value = true
   collectionStats().then(res => { stats.value = res.data || {} }).finally(() => { statsLoading.value = false })
}

/** 查询待结算列表 */
function getUnsettledList() {
   unsettledLoading.value = true
   const params = { ...unsettledQuery.value }
   if (unsettledCloseRange.value && unsettledCloseRange.value.length === 2) {
      params.closeTimeBegin = unsettledCloseRange.value[0]
      params.closeTimeEnd = unsettledCloseRange.value[1]
   }
   if (unsettledPayRange.value && unsettledPayRange.value.length === 2) {
      params.payTimeBegin = unsettledPayRange.value[0]
      params.payTimeEnd = unsettledPayRange.value[1]
   }
   collectionUnsettledList(params).then(res => {
      unsettledList.value = res.rows
      unsettledTotal.value = res.total
      unsettledLoading.value = false
   }).catch(() => { unsettledLoading.value = false })
}

/** 加载负责人下拉（全量用户，仅首次） */
function loadUserOptions() {
   if (userOptions.value.length > 0) return
   userLoading.value = true
   listUserOptions({ pageNum: 1, pageSize: 1000 }).then(res => {
      userOptions.value = res.rows || []
   }).catch(() => { /* 下拉加载失败不影响主流程 */ }).finally(() => { userLoading.value = false })
}

/** 待回款搜索 */
function handleQuery() {
   queryParams.value.pageNum = 1
   getList()
}

/** 待回款重置 */
function resetQuery() {
   const q = queryParams.value
   q.keyword = undefined
   q.projectName = undefined
   q.clientUnit = undefined
   q.collectStatus = undefined
   q.ageBegin = undefined
   q.ageEnd = undefined
   q.leaderId = undefined
   q.pageNum = 1
   closeTimeRange.value = []
   payTimeRange.value = []
   getList()
}

/** 待结算搜索 */
function handleUnsettledQuery() {
   unsettledQuery.value.pageNum = 1
   getUnsettledList()
}

/** 待结算重置 */
function resetUnsettledQuery() {
   const q = unsettledQuery.value
   q.keyword = undefined
   q.projectCode = undefined
   q.projectName = undefined
   q.clientUnit = undefined
   q.leaderId = undefined
   q.pageNum = 1
   unsettledCloseRange.value = []
   unsettledPayRange.value = []
   getUnsettledList()
}

/** 胶囊：催收状态 */
function setCollectStatus(status) {
   queryParams.value.collectStatus = status
   handleQuery()
}

/** 胶囊：项目/客户视图 */
function setViewMode(mode) {
   if (viewMode.value === mode) return
   viewMode.value = mode
   queryParams.value.pageNum = 1
   getList()
}

/** 切回待结算页签时保证数据最新 */
function handleTabChange(name) {
   if (name === 'unsettled') {
      getUnsettledList()
      loadUserOptions()
   }
   if (name === 'summary') {
      loadUserOptions()
      loadCategoryOptions()
      getSummary()
   }
}

/** 客户视图展开：懒加载该客户欠款项目明细 */
function handleClientExpand(row, expanded) {
   if (expanded.length > 0 && !row.projectRows) {
      row.expanding = true
      collectionList({ pageNum: 1, pageSize: 999, clientUnit: row.clientUnit }).then(res => {
         row.projectRows = res.rows
         row.expanding = false
      }).catch(() => { row.expanding = false })
   }
}

/** 录入工作量（待结算列表） */
function handleEntryWorkload(row) {
   workloadProject.value = {
      projectId: row.projectId,
      projectCode: row.projectCode,
      projectLocation: row.projectLocation,
      clientUnit: row.clientUnit,
      engineeringProject: row.engineeringProject
   }
   workloadOpen.value = true
}

/** 工作量保存成功后：该项目已录外部产值，需从待结算列表移出并刷新 KPI */
function handleWorkloadSaved() {
   getUnsettledList()
   getStats()
   if (activeTab.value === 'pending') getList()
}

/** 打开统计卡明细弹窗 */
function openCardDetail(type) {
   cardDialog.type = type
   cardDialog.title = CARD_TITLES[type]
   cardDialog.pageNum = 1
   cardDialog.rows = []
   cardDialog.total = 0
   cardDialog.open = true
   loadCardDetail()
}

/** 本月起止（YYYY-MM-DD），与后端 date_trunc('month', current_date) 口径一致 */
function currentMonthRange() {
   const now = new Date()
   const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
   return {
      begin: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0))
   }
}

/** 加载统计卡明细（按卡片类型路由到对应接口） */
function loadCardDetail() {
   cardDialog.loading = true
   const base = { pageNum: cardDialog.pageNum, pageSize: cardDialog.pageSize }
   let req
   if (cardDialog.type === 'received') {
      req = collectionReceivedDetail({ ...base, ...currentMonthRange() })
   } else if (cardDialog.type === 'overdue') {
      req = collectionList({ ...base, ageBegin: 6 })
   } else if (cardDialog.type === 'unsettled') {
      req = collectionUnsettledList(base)
   } else if (cardDialog.type === 'summaryDrill') {
      req = collectionReceivedDetail({ ...base, ...cardDialog.drillParams })
   } else {
      req = collectionList(base)
   }
   req.then(res => {
      cardDialog.rows = res.rows || []
      cardDialog.total = Number(res.total) || 0
   }).catch(() => { cardDialog.rows = [] }).finally(() => { cardDialog.loading = false })
}

/** 登记回款 */
function handleAddPayment(row) {
   payForm.value = {
      projectId: row.projectId,
      projectName: row.projectName,
      defaultPayUnit: row.clientUnit,
      paymentType: undefined,
      amount: undefined,
      payTime: todayStr,
      payUnit: row.clientUnit,
      payMethod: undefined,
      remark: undefined
   }
   payOpen.value = true
}

/** 提交回款 */
function submitPay() {
   proxy.$refs["payRef"].validate(valid => {
      if (valid) {
         submitLoading.value = true
         addPayment(payForm.value).then(() => {
            proxy.$modal.msgSuccess("回款登记成功")
            payOpen.value = false
            getList()
            getStats()
         }).finally(() => { submitLoading.value = false })
      }
   })
}

/** 打开催收记录抽屉 */
function handleShowLog(row) {
   currentProject.value = row
   logForm.value = { projectId: row.projectId, collectTime: todayStr }
   logOpen.value = true
   loadLog(row.projectId)
}

/** 加载催收记录 */
function loadLog(projectId) {
   logLoading.value = true
   collectionLog(projectId).then(res => { logList.value = res.data || [] }).finally(() => { logLoading.value = false })
}

/** 提交催收记录 */
function submitLog() {
   proxy.$refs["logRef"].validate(valid => {
      if (valid) {
         logSubmitLoading.value = true
         addCollectionLog(logForm.value).then(() => {
            proxy.$modal.msgSuccess("催收记录登记成功")
            logForm.value = { projectId: currentProject.value.projectId, collectTime: todayStr }
            loadLog(currentProject.value.projectId)
            getList()
         }).finally(() => { logSubmitLoading.value = false })
      }
   })
}

/** 删除催收记录 */
function handleDeleteLog(log) {
   proxy.$modal.confirm('是否确认删除该条催收记录?').then(() => {
      logLoading.value = true  // 抽屉局部遮罩：成功时由 loadLog 接管 loading
      return delCollectionLog(log.id)
   }).then(() => {
      loadLog(currentProject.value.projectId)
      getList()
      proxy.$modal.msgSuccess("删除成功")
   }).catch(() => {
      logLoading.value = false  // 用户取消或请求失败复位
   })
}

/** 导出催款清单 */
function handleExport() {
   const params = buildParams()
   delete params.pageNum
   delete params.pageSize
   proxy.download('/project/collection/export', params, `催款清单_${new Date().getTime()}.xlsx`)
}

/** 账龄色阶：<3月绿 / 3~6月黄 / 6~12月橙 / ≥12月红 */
function ageClass(months) {
   const m = Number(months || 0)
   if (m >= 12) return 'age-red'
   if (m >= 6) return 'age-orange'
   if (m >= 3) return 'age-yellow'
   return 'age-green'
}

function collectText(status) {
   if (status === 'overdue') return '超期未催'
   if (status === 'calling') return '催收中'
   return '从未催收'
}

function collectTagType(status) {
   if (status === 'overdue') return 'danger'
   if (status === 'calling') return 'primary'
   return 'info'
}

function progressOf(row) {
   const p = Number(row.progress || 0)
   return p > 100 ? 100 : Math.round(p)
}

function money(val) {
   if (val == null) return '—'
   return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(val) {
   if (!val) return '—'
   return String(val).slice(0, 10)
}


// ===== 到账统计：逻辑 =====

function pad2(n) { return String(n).padStart(2, '0') }
function fmtYMD(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d) }
/** 某年某月（1-12）最后一天 */
function lastDayOf(y, m) { return new Date(y, m, 0).getDate() }

/** 快捷区间 → [begin, end]，口径与后端 date_trunc 一致 */
function quickRange(quick) {
   const now = new Date()
   const y = now.getFullYear()
   const m = now.getMonth()
   if (quick === 'month') return [fmtYMD(y, m + 1, 1), fmtYMD(y, m + 1, lastDayOf(y, m + 1))]
   if (quick === 'quarter') {
      const qs = Math.floor(m / 3) * 3 + 1
      return [fmtYMD(y, qs, 1), fmtYMD(y, qs + 2, lastDayOf(y, qs + 2))]
   }
   if (quick === 'year') return [fmtYMD(y, 1, 1), fmtYMD(y, 12, 31)]
   if (quick === 'last12') return [fmtYMD(y, m - 10, 1), fmtYMD(y, m + 1, lastDayOf(y, m + 1))]
   return []
}

/** 组装到账统计查询参数（extra 优先级最高，用于下钻追加分组限制） */
function buildSummaryParams(extra) {
   const r = summaryRange.value && summaryRange.value.length === 2 ? summaryRange.value : []
   const params = {
      dimension: summaryDimension.value,
      groupBy: summaryGroupBy.value,
      begin: r[0],
      end: r[1],
      ...summaryQuery.value,
      ...(extra || {})
   }
   return params
}

/** 查询到账统计（合计 + 分组明细） */
function getSummary() {
   summaryLoading.value = true
   collectionPaymentSummary(buildSummaryParams()).then(res => {
      const d = res.data || {}
      summarySummary.value = d.summary || {}
      summaryGroups.value = d.groups || []
   }).catch(() => {
      summarySummary.value = {}
      summaryGroups.value = []
   }).finally(() => { summaryLoading.value = false })
}

/** 加载项目类别下拉（仅首次） */
function loadCategoryOptions() {
   if (categoryOptions.value.length > 0) return
   categoryLoading.value = true
   categoryTreeselectFull().then(res => {
      const flat = []
      const walk = nodes => (nodes || []).forEach(n => {
         flat.push({ id: n.id, name: n.name || n.label })
         if (n.children && n.children.length) walk(n.children)
      })
      walk(res.data)
      categoryOptions.value = flat
   }).catch(() => { /* 下拉加载失败不影响主流程 */ }).finally(() => { categoryLoading.value = false })
}

/** 口径胶囊 */
function setSummaryDimension(v) {
   if (summaryDimension.value === v) return
   summaryDimension.value = v
   getSummary()
}

/** 快捷区间胶囊 */
function setSummaryQuick(v) {
   summaryQuick.value = v
   summaryRange.value = quickRange(v)
   getSummary()
}

/** 手动查询（改日期/筛选条件后） */
function handleSummaryQuery() {
   summaryQuick.value = 'custom'
   getSummary()
}

/** 重置到账统计 */
function resetSummaryQuery() {
   summaryDimension.value = 'payTime'
   summaryQuick.value = 'all'
   summaryRange.value = []
   summaryGroupBy.value = 'none'
   summaryQuery.value = { keyword: undefined, clientUnit: undefined, leaderId: undefined, projectCategoryId: undefined, paymentType: undefined, payUnit: undefined }
   getSummary()
}

/** 合计里「到账金额」的口径说明 */
const summaryMetricLabel = computed(() => summaryDimension.value === 'closeTime' ? '到账金额(元)·按办结时间' : '到账金额(元)·按到账时间')

/** 分组标签显示（付款类型走中文映射） */
function summaryLabel(row) {
   if (summaryGroupBy.value === 'paymentType') return paymentTypeText(row.label)
   return row.label || '—'
}

/** 分组占比（按各组金额绝对值分摊，总额恒 100%） */
function summaryShare(row) {
   const total = summaryGroups.value.reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0)
   if (!total) return 0
   return Math.min(100, Math.round(Math.abs(Number(row.amount || 0)) * 100 / total))
}

/** 由分组标签推导日期区间（月/季/年） */
function labelRange(group, label) {
   const s = String(label || '')
   if (group === 'year') {
      const y = Number(s)
      if (!y) return null
      return [fmtYMD(y, 1, 1), fmtYMD(y, 12, 31)]
   }
   if (group === 'month') {
      const parts = s.split('-')
      const y = Number(parts[0])
      const m = Number(parts[1])
      if (!y || !m) return null
      return [fmtYMD(y, m, 1), fmtYMD(y, m, lastDayOf(y, m))]
   }
   if (group === 'quarter') {
      const hit = /^(\d{4})-Q(\d)$/.exec(s)
      if (!hit) return null
      const y = Number(hit[1])
      const q = Number(hit[2])
      const sm = (q - 1) * 3 + 1
      return [fmtYMD(y, sm, 1), fmtYMD(y, sm + 2, lastDayOf(y, sm + 2))]
   }
   return null
}

/** 分组行下钻：时间维度按 label 推导区间，其他维度按 key 追加对应筛选 */
function handleSummaryDrill(row) {
   const g = summaryGroupBy.value
   if (g === 'none') return
   const extra = {}
   if (g === 'month' || g === 'quarter' || g === 'year') {
      const r = labelRange(g, row.label)
      if (!r) { proxy.$modal.msgWarning('无法解析该分组的时间区间'); return }
      extra.begin = r[0]
      extra.end = r[1]
   } else if (g === 'clientUnit') {
      extra.clientUnit = row.key
   } else if (g === 'leader') {
      extra.leaderId = row.key
   } else if (g === 'paymentType') {
      extra.paymentType = row.key
   } else if (g === 'category') {
      extra.projectCategoryId = row.key
   }
   cardDialog.type = 'summaryDrill'
   cardDialog.title = '到账明细 — ' + summaryLabel(row)
   cardDialog.pageNum = 1
   cardDialog.rows = []
   cardDialog.total = 0
   cardDialog.drillParams = buildSummaryParams(extra)
   cardDialog.open = true
   loadCardDetail()
}

/** 导出到账明细（按当前口径与筛选，不含分组维度限制） */
function handleSummaryExport() {
   const params = buildSummaryParams()
   delete params.groupBy
   delete params.pageNum
   delete params.pageSize
   proxy.download('/project/collection/paymentExport', params, '到账明细_' + new Date().getTime() + '.xlsx')
}

getList()
getStats()
getUnsettledList()
loadUserOptions()

// keep-alive 缓存下切回本页时刷新列表（避免项目删除后仍显示旧数据）
onActivated(() => {
  getList()
  getStats()
  getUnsettledList()
  if (activeTab.value === 'summary') getSummary()
})
</script>

<style scoped>
.stat-row { margin-bottom: 12px; }
.stat-card :deep(.el-card__body) { padding: 16px; }
.stat-card-clickable { cursor: pointer; transition: box-shadow 0.2s; }
.stat-body { display: flex; align-items: center; gap: 14px; }
.stat-icon {
   width: 48px; height: 48px; border-radius: 10px;
   display: flex; align-items: center; justify-content: center;
   font-size: 24px; flex-shrink: 0;
}
.stat-info { min-width: 0; }
.stat-label { font-size: 13px; color: #909399; }
.stat-value { font-size: 22px; font-weight: 600; color: #303133; margin: 2px 0; }
.stat-sub { font-size: 12px; color: #909399; }
.collection-tabs :deep(.el-tabs__content) { padding: 0 4px; }
.age-green { color: #67c23a; font-weight: 600; }
.age-yellow { color: #e6a23c; font-weight: 600; }
.age-orange { color: #cf9236; font-weight: 600; }
.age-red { color: #f56c6c; font-weight: 600; }
.log-summary { padding: 10px 12px; background: #f5f7fa; border-radius: 6px; font-size: 13px; }
.log-item { font-size: 13px; line-height: 1.7; }
.log-head { display: flex; align-items: center; gap: 8px; }
.log-contact { color: #909399; }
.log-result { margin-top: 2px; }
.log-next { color: #409eff; }
.log-remark { color: #909399; }
.log-creator { font-size: 12px; color: #c0c4cc; }

/* ===== 智能查询面板（与项目/结算/合同/资料页保持一致） ===== */
.search-bar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.search-input-wrapper { flex: 1; }
.global-search-input :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.status-capsule-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.status-capsule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  background: #f5f5f5;
  color: #606266;
  transition: all 0.2s;
  user-select: none;
}
.status-capsule:hover { background: #e8e8e8; }
.status-capsule.active { background: #409eff; color: #fff; }
.capsule-group-label {
  font-size: 12px;
  color: #909399;
  align-self: center;
  margin-right: 2px;
  user-select: none;
}
.capsule-sep {
  width: 1px;
  height: 18px;
  background: #dcdfe6;
  align-self: center;
  margin: 0 4px;
}
.advanced-toggle-row {
  cursor: pointer;
  color: #909399;
  font-size: 13px;
  padding: 4px 0;
  margin-bottom: 8px;
  user-select: none;
}
.advanced-toggle-row:hover { color: #409eff; }
.advanced-filter-panel {
  border-radius: 10px;
  padding: 10px 20px 12px;
  margin-bottom: 16px;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px 24px;
}
.filter-item-label {
  font-size: 12px;
  margin-bottom: 4px;
}
.range-inline { display: flex; align-items: center; gap: 8px; }
.range-input { width: 100px; }
.range-sep { color: #909399; }
.quick-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.collapse-link {
  margin-left: auto;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  user-select: none;
}
.collapse-link:hover { color: #409eff; }

/* ===== 到账统计页签 ===== */
.sum-metric-row { margin-bottom: 12px; }
.sum-metric {
   background: #f5f7fa;
   border: 1px solid #ebeef5;
   border-radius: 10px;
   padding: 12px 16px;
}
.sum-metric-label { font-size: 12px; color: #909399; }
.sum-metric-value { font-size: 20px; font-weight: 600; color: #303133; margin-top: 4px; }
.sum-tip { font-size: 12px; color: #909399; margin-top: 8px; line-height: 1.7; }
/* 日期区间控件固定宽度：Element Plus 的 .el-input__wrapper 自带 flex-grow:1，
   而该类正好挂在本控件根节点上，作为 .search-bar-row（flex 行）的直接子元素
   会被拉伸吃满整行剩余宽度（实测 1680 视口下 984px）。故必须显式写 flex:0 1 auto
   + 固定宽度，只写 width 是无效的（会被 flex 拉伸覆盖）。
   注：el-date-picker 内部经 el-tooltip 渲染，根节点不携带 scoped 的 data-v 属性，
   所以必须用 :deep() 才能命中。 */
.search-bar-row :deep(.sum-range-picker) {
   flex: 0 1 auto;
   width: 480px;
   min-width: 240px;
}
</style>
