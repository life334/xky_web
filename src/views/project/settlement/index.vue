<template>
   <div class="app-container">
      <el-tabs v-model="viewTab" class="settlement-tabs" @tab-change="handleViewTabChange">
      <el-tab-pane label="结算录入" name="list">
      <!-- Row 1: 全局搜索 -->
      <div class="search-bar-row">
         <div class="search-input-wrapper">
            <el-input v-model="queryParams.keyword" placeholder="搜索工程编号/委托单位/工程地点..." clearable @keyup.enter="handleQuery" @clear="handleQuery" class="global-search-input">
               <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
         </div>
         <el-button type="primary" size="small" @click="handleQuery">搜索</el-button>
         <el-button size="small" @click="resetQuery">重置</el-button>
      </div>

      <!-- Row 2: 状态胶囊 -->
      <!-- <div class="status-capsule-row">
         <span class="status-capsule" :class="{ active: selectedStatuses.length === 0 }" @click="onStatusCapsuleClick([])">全部</span>
         <span class="status-capsule" :class="{ active: selectedStatuses.includes('closed') && selectedStatuses.length === 1 }" @click="onStatusCapsuleClick(['closed'])">已办结</span>
         <span class="status-capsule" :class="{ active: selectedStatuses.includes('archived') && selectedStatuses.length === 1 }" @click="onStatusCapsuleClick(['archived'])">已归档</span>
         <span class="status-capsule" :class="{ active: selectedStatuses.includes('closed') && selectedStatuses.includes('archived') }" @click="onStatusCapsuleClick(['closed','archived'])">已办结 + 已归档</span>
      </div> -->

      <!-- Row 2b: 录入状态胶囊（工作量 + 到账 + 发票，筛选与计数均下推后端） -->
      <div class="status-capsule-row entry-capsules">
         <span class="capsule-group-label">工作量</span>
         <span class="status-capsule" :class="{ active: workloadFilter === 'all' }" @click="setWorkloadFilter('all')">全部 <em>{{ entryAllCount }}</em></span>
         <span class="status-capsule" :class="{ active: workloadFilter === 'done' }" @click="setWorkloadFilter('done')">已录入 <em>{{ workloadDoneCount }}</em></span>
         <span class="status-capsule" :class="{ active: workloadFilter === 'undone' }" @click="setWorkloadFilter('undone')">未录入 <em>{{ workloadUndoneCount }}</em></span>
         <span class="capsule-sep" />
         <span class="capsule-group-label">到账</span>
         <span class="status-capsule" :class="{ active: paymentFilter === 'all' }" @click="setPaymentFilter('all')">全部 <em>{{ entryAllCount }}</em></span>
         <span class="status-capsule" :class="{ active: paymentFilter === 'done' }" @click="setPaymentFilter('done')">已录入 <em>{{ paymentDoneCount }}</em></span>
         <span class="status-capsule" :class="{ active: paymentFilter === 'undone' }" @click="setPaymentFilter('undone')">未录入 <em>{{ paymentUndoneCount }}</em></span>
         <span class="capsule-sep" />
         <span class="capsule-group-label">发票</span>
         <span class="status-capsule capsule-warn" :class="{ active: invoiceUnpaidFilter }" @click="toggleInvoiceUnpaidFilter()">已开未付 <em>{{ invoiceUnpaidCount }}</em></span>
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
                  <div class="filter-item-label">工程编号</div>
                  <el-input v-model="queryParams.projectCode" placeholder="工程编号" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">委托单位</div>
                  <el-select v-model="queryParams.clientUnit" filterable clearable placeholder="全部单位" style="width:100%" :loading="distinctLoading" @change="handleQuery">
                     <el-option v-for="u in clientUnitOptions" :key="u" :label="u" :value="u" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程地点</div>
                  <el-input v-model="queryParams.projectLocation" placeholder="工程地点" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">项目类别</div>
                  <el-select v-model="queryParams.projectCategoryId" filterable clearable placeholder="全部类别" style="width:100%" @change="handleQuery">
                     <el-option v-for="c in projectCategoryOptions" :key="c.id" :label="c.name" :value="c.id" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">负责人</div>
                  <el-select v-model="queryParams.leaderId" filterable clearable placeholder="全部负责人" style="width:100%" @change="handleQuery">
                     <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">合同</div>
                  <el-select v-model="queryParams.contractId" filterable remote reserve-keyword clearable placeholder="输入合同编号/名称/委托单位搜索" no-data-text="无匹配合同（可按编号 / 名称 / 委托单位 / 联系人搜索）" :remote-method="searchContracts" :loading="contractLoading" style="width:100%" @visible-change="onContractVisibleChange">
                     <el-option v-for="c in contractOptions" :key="c.id" :label="fmtContractOption(c)" :value="c.id" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">项目来源</div>
                  <el-select v-model="queryParams.dataSource" clearable placeholder="全部来源" style="width:100%" @change="handleQuery">
                     <el-option v-for="dict in sourceOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">办结日期</div>
                  <el-date-picker v-model="closeDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onCloseDateChange" />
               </div>
            </div>
            <!-- 快捷日期 -->
            <div class="quick-filter-row">
               <span class="quick-label">快捷：</span>
               <span class="quick-chip" @click="setQuickDate('today')">今天</span>
               <span class="quick-chip" @click="setQuickDate('week')">本周</span>
               <span class="quick-chip" @click="setQuickDate('month')">本月</span>
               <span class="quick-chip" @click="setQuickDate('7days')">近7天</span>
               <span class="quick-chip" @click="setQuickDate('30days')">近30天</span>
               <span class="collapse-link" @click="advancedVisible = false">收起 ▲</span>
            </div>
         </div>
      </el-collapse-transition>

      <!-- Row 5: 操作按钮行 -->
      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5" v-if="false">
            <el-button type="warning" size="small" plain icon="Download" @click="handleExport" v-hasPermi="['project:settlement:export']">导出</el-button>
         </el-col>
         <el-col :span="1.5" style="margin-left:auto">
            <right-toolbar size="small" v-model:showSearch="showSearch" :columns="columns" storage-key="settlement-list-columns" @queryTable="refreshAll" />
         </el-col>
      </el-row>

      <el-table
         v-loading="loading"
         :data="pagedTreeData"
         row-key="id"
         :expand-row-keys="expandedKeys"
         stripe border
         v-hover-h-scroll
         highlight-current-row
         @current-change="handleCurrentChange"
      >
         <!-- 展开行明细卡列（默认收起，点击箭头懒加载明细） -->
         <el-table-column type="expand" width="1" class-name="expand-hidden-col">
            <template #default="scope">
               <div class="expand-panel" v-loading="expandDetailLoading(scope.row.projectId)">
                  <template v-if="expandDetails[scope.row.projectId]">
                     <!-- ① 结算核对条 -->
                     <div class="expand-check-bar">
                        <div class="check-cell">
                           <span class="check-label">结算总额</span>
                           <span class="check-value">{{ formatMoney(scope.row.externalOutput) }}</span>
                        </div>
                        <div class="check-divider" />
                        <div class="check-cell">
                           <span class="check-label">已收金额</span>
                           <span class="check-value">{{ formatMoney(effectiveReceived(scope.row)) }}</span>
                        </div>
                        <div class="check-divider" />
                        <div class="check-cell">
                           <span class="check-label">待收差额</span>
                           <span class="check-value" :class="'text-' + effectiveStatus(scope.row)">{{ formatMoney(Math.abs(effectivePending(scope.row))) }}</span>
                        </div>
                        <el-tag :type="effectiveStatusMeta(scope.row).type" effect="dark" size="small">{{ effectiveStatusMeta(scope.row).text }}</el-tag>
                     </div>

                     <!-- ② 产值构成明细 -->
                     <div class="expand-section-title">产值构成明细</div>
                     <el-table :data="expandDetails[scope.row.projectId].workloads" border size="small" :row-class-name="expandRowClass">
                        <el-table-column label="负责人" align="center" prop="userName" width="120" show-overflow-tooltip>
                           <template #default="s"><span v-if="!s.row.userName" class="cell-placeholder">-</span>{{ s.row.userName }}</template>
                        </el-table-column>
                        <el-table-column label="项目类别" align="center" prop="categoryName" width="200" show-overflow-tooltip>
                           <template #default="s"><span v-if="!s.row.categoryName" class="cell-placeholder">-</span>{{ s.row.categoryName }}</template>
                        </el-table-column>
                        <el-table-column label="子项" align="center" width="100">
                           <template #default="s">
                              <span v-if="s.row._isSummary"></span>
                              <span v-else-if="expandDetails[scope.row.projectId].hasMultipleSubItems && s.row.subItemNo > 0">{{ '第' + s.row.subItemNo + '条' }}</span>
                              <span v-else-if="s.row.subItemName">{{ s.row.subItemName }}</span>
                              <span v-else class="cell-placeholder">-</span>
                           </template>
                        </el-table-column>
                        <el-table-column label="计费方式" align="center" width="200">
                           <template #default="s">
                              <template v-if="s.row._isSummary">
                                 <span :class="['summary-label', s.row.billingType]">{{ s.row.billingType === 'internal' ? '内部合计' : '外部合计' }}</span>
                              </template>
                              <template v-else-if="s.row.billingType">
                                 <el-tag :type="s.row.billingType === 'internal' ? 'info' : 'warning'" size="small">{{ s.row.billingType === 'internal' ? '内部' : '外部' }}</el-tag>
                                 <span style="margin-left:4px">{{ s.row.billingCategory || '-' }}</span>
                              </template>
                           </template>
                        </el-table-column>
                        <el-table-column label="工作量" align="center" prop="workload" width="150">
                           <template #default="s">
                              <span :class="{ 'summary-value': s.row._isSummary }">{{ s.row.workload != null ? s.row.workload : '-' }}</span>
                              <span v-if="s.row.priceUnit" class="cell-sub-inline">{{ s.row.priceUnit }}</span>
                           </template>
                        </el-table-column>
                        <el-table-column label="单价" align="center" width="150">
                           <template #default="s">
                              <span v-if="s.row._isSummary"></span>
                              <span v-else-if="s.row.unitPrice != null">{{ formatMoney(s.row.unitPrice) }}</span>
                              <span v-else class="cell-placeholder">{{ s.row.internalPrice != null || s.row.externalPrice != null ? formatMoney(s.row.internalPrice || s.row.externalPrice) : '-' }}</span>
                           </template>
                        </el-table-column>
                        <el-table-column label="产值" align="center" prop="output" width="250">
                           <template #default="s">
                              <span v-if="s.row.output != null && s.row.billingType" :class="['output-dot', s.row.billingType]"></span>
                              <span :class="{ 'summary-value': s.row._isSummary }">{{ s.row.output != null ? formatMoney(s.row.output) : '-' }}</span>
                              <div v-if="!s.row._isSummary && minQtyHit(s.row)" class="cell-sub min-qty-hit">按起步量计费：{{ s.row.workload }} → {{ billWorkload(s.row) }}</div>
                           </template>
                        </el-table-column>
                     </el-table>

                     <!-- ③ 付款记录 -->
                     <div class="expand-section-title">付款记录</div>
                     <el-table v-if="(expandDetails[scope.row.projectId].payments || []).length" :data="expandDetails[scope.row.projectId].payments" border size="small" :span-method="(args) => paymentSpanMethod(args, scope.row.projectId)">
                        <el-table-column label="付款类型" align="center"  width="120">
                           <template #default="s">
                              <el-tag :type="s.row.paymentType === 'advance' ? 'primary' : (s.row.paymentType === 'refund' ? 'danger' : 'success')" size="small">{{ s.row.paymentType === 'advance' ? '预付款' : (s.row.paymentType === 'refund' ? '退款' : '尾款') }}</el-tag>
                           </template>
                        </el-table-column>
                        <el-table-column label="金额" align="center"  width="150">
                           <template #default="s">
                              <span v-if="s.row.paymentType === 'refund'" style="color:var(--el-color-danger)">-{{ formatMoney(s.row.amount) }}</span>
                              <span v-else>{{ formatMoney(s.row.amount) }}</span>
                           </template>
                        </el-table-column>
                        <el-table-column label="付款时间" align="center" prop="payTime" width="150">
                           <template #default="s">{{ s.row.paymentType === 'refund' ? (s.row.payTime || '-') : s.row.payTime }}</template>
                        </el-table-column>
                        <el-table-column label="付款方式" align="center" prop="payMethod" width="120">
                           <template #default="s">{{ s.row.payMethod }}</template>
                        </el-table-column>
                        <el-table-column label="付款单位" align="center" prop="payUnit" width="200">
                           <template #default="s">{{ s.row.payUnit }}</template>
                        </el-table-column>
                        <el-table-column label="开票金额" align="center" width="150">
                           <template #default="s">{{ s.row.invoiceAmount != null ? formatMoney(s.row.invoiceAmount) : '' }}</template>
                        </el-table-column>
                        <el-table-column label="开票状态" align="center" width="100">
                           <template #default="s">
                              <el-tag v-if="invoiceStatusText(s.row.invoiceStatus)" :type="invoiceStatusTagType(s.row.invoiceStatus)" size="small">{{ invoiceStatusText(s.row.invoiceStatus) }}</el-tag>
                           </template>
                        </el-table-column>
                        <el-table-column label="发票号码" align="center" prop="invoiceNo" width="130" >
                           <template #default="s"><span v-if="!s.row.invoiceNo" class="cell-placeholder">-</span>{{ s.row.invoiceNo }}</template>
                        </el-table-column>
                        <el-table-column label="备注" align="center" prop="remark" width="150">
                           <template #default="s"><span v-if="!s.row.remark" class="cell-placeholder">-</span>{{ s.row.remark }}</template>
                        </el-table-column>
                     </el-table>
                     <div v-else class="expand-empty">暂无付款记录</div>
                  </template>
               </div>
            </template>
         </el-table-column>

         <el-table-column label="序号" align="center" width="76">
            <template #default="scope">
               <span class="seq-expand-cell">
                  <el-icon class="seq-expand-icon" :class="{ expanded: expandedKeys.includes(scope.row.id) }" @click.stop="toggleExpand(scope.row)">
                     <ArrowRight v-if="!expandedKeys.includes(scope.row.id)" />
                     <ArrowDown v-else />
                  </el-icon>
                  <span class="seq-num">{{ seqNo(scope.$index) }}</span>
               </span>
            </template>
         </el-table-column>
         <el-table-column v-for="col in visibleColumns" :key="col.key" :label="col.label" align="center" :prop="col.prop" :show-overflow-tooltip="false" :min-width="colWidth(col)">
            <template #default="scope">
               <!-- 工程编号：加粗 -->
               <span v-if="col.key === 'projectCode' && scope.row.projectCode">{{ scope.row.projectCode }}</span>
               <!-- 开票状态：项目级「开票+付款」组合状态标签（未开未付/已开未付/已开已付/已作废） -->
               <template v-else-if="col.key === 'invoiceStatus'">
                  <el-tag v-if="invoicePaymentText(scope.row.invoicePaymentStatus)" :type="invoicePaymentTagType(scope.row.invoicePaymentStatus)" size="small">{{ invoicePaymentText(scope.row.invoicePaymentStatus) }}</el-tag>
                  <span v-else class="cell-placeholder">-</span>
               </template>
               <!-- 内部工作量：数值 + 悬浮明细 -->
               <template v-else-if="col.key === 'internalWorkload'">
                  <span v-if="isWlEmpty(scope.row.internalWorkload)" class="cell-placeholder">-</span>
                  <el-tooltip v-else-if="(scope.row.internalWorkloadDetail || []).length" placement="top" effect="light" :show-after="120">
                     <template #content>
                        <div class="wl-tip">
                           <div class="wl-tip-title"><span class="wl-dot internal"></span>内部工作量构成</div>
                           <div class="wl-tip-head">
                              <span class="wl-tip-cat">计费类别</span>
                              <span class="wl-tip-price">单价</span>
                              <span class="wl-tip-val">工作量</span>
                           </div>
                           <div v-for="it in scope.row.internalWorkloadDetail" :key="it.category + '|' + it.unit" class="wl-tip-row">
                              <span class="wl-tip-cat">{{ it.category }}</span>
                              <span class="wl-tip-price">{{ it.unitPrice != null ? (formatMoney(it.unitPrice) + (it.unit ? ' /' + it.unit : '')) : '-' }}</span>
                              <span class="wl-tip-val">{{ fmtWorkload(it.value) }}<em v-if="it.unit"> {{ it.unit }}</em></span>
                           </div>
                        </div>
                     </template>
                     <span class="wl-hoverable">{{ fmtWorkload(scope.row.internalWorkload) }}</span>
                  </el-tooltip>
                  <span v-else>{{ fmtWorkload(scope.row.internalWorkload) }}</span>
               </template>
               <!-- 外部工作量：数值 + 悬浮明细 -->
               <template v-else-if="col.key === 'externalWorkload'">
                  <span v-if="isWlEmpty(scope.row.externalWorkload)" class="cell-placeholder">-</span>
                  <el-tooltip v-else-if="(scope.row.externalWorkloadDetail || []).length" placement="top" effect="light" :show-after="120">
                     <template #content>
                        <div class="wl-tip">
                           <div class="wl-tip-title"><span class="wl-dot external"></span>外部工作量构成</div>
                           <div class="wl-tip-head">
                              <span class="wl-tip-cat">计费类别</span>
                              <span class="wl-tip-price">单价</span>
                              <span class="wl-tip-val">工作量</span>
                           </div>
                           <div v-for="it in scope.row.externalWorkloadDetail" :key="it.category + '|' + it.unit" class="wl-tip-row">
                              <span class="wl-tip-cat">{{ it.category }}</span>
                              <span class="wl-tip-price">{{ it.unitPrice != null ? (formatMoney(it.unitPrice) + (it.unit ? ' /' + it.unit : '')) : '-' }}</span>
                              <span class="wl-tip-val">{{ fmtWorkload(it.value) }}<em v-if="it.unit"> {{ it.unit }}</em></span>
                           </div>
                        </div>
                     </template>
                     <span class="wl-hoverable">{{ fmtWorkload(scope.row.externalWorkload) }}</span>
                  </el-tooltip>
                  <span v-else>{{ fmtWorkload(scope.row.externalWorkload) }}</span>
               </template>
               <!-- 金额字段 -->
               <span v-else-if="col.type === 'money'"><span v-if="scope.row[col.prop] != null">{{ formatMoney(scope.row[col.prop]) }}</span></span>
               <!-- 数字字段（工作量等，去除尾随 0） -->
               <span v-else-if="col.type === 'number'"><span v-if="scope.row[col.prop] != null">{{ fmtWorkload(scope.row[col.prop]) }}</span></span>
               <!-- 日期字段：原样显示 -->
               <span v-else-if="col.type === 'date' && scope.row[col.prop]">{{ scope.row[col.prop] }}</span>
               <!-- 其他：直接显示 -->
               <span v-else>{{ scope.row[col.prop] }}</span>
            </template>
         </el-table-column>
         <!-- 结算状态：已结清 / 未结清 / 超额（不参与列显隐） -->
         <el-table-column label="结算状态" align="center" width="92">
            <template #default="scope">
               <el-tag :type="effectiveStatusMeta(scope.row).type" effect="light">{{ effectiveStatusMeta(scope.row).text }}</el-tag>
            </template>
         </el-table-column>
         <el-table-column v-if="checkPermi(['project:settlement:edit'])" label="操作" align="center" width="140" fixed="right">
            <template #default="scope">
               <el-button v-if="scope.row.projectId" link type="primary" size="small" @click="handleEditWorkload(scope.row)">工作量</el-button>
               <el-button v-if="scope.row.projectId" link type="success" size="small" @click="handleEditPayment(scope.row)">到账信息</el-button>
            </template>
         </el-table-column>
      </el-table>

      <!-- 分页 -->
      <pagination
         v-show="total > 0"
         :total="total"
         v-model:page="pageNum"
         v-model:limit="pageSize"
         :page-sizes="[10, 20, 50, 100]"
         all-option
         @pagination="handlePagination"
      />

      <!-- 底部结算核对条（点击选中项目行后固定显示） -->
      <div class="settle-check-bar" v-if="currentRow">
         <div class="bar-title">结算核对 · {{ currentRow.projectCode }}</div>
         <div class="bar-cell">
            <span class="bar-label">结算总额</span>
            <span class="bar-value">{{ formatMoney(currentRow.externalOutput) }}</span>
         </div>
         <div class="bar-divider" />
         <div class="bar-cell">
            <span class="bar-label">已收</span>
            <span class="bar-value">{{ formatMoney(effectiveReceived(currentRow)) }}</span>
         </div>
         <div class="bar-divider" />
         <div class="bar-cell">
            <span class="bar-label">待收差额</span>
            <span class="bar-value" :class="'text-' + effectiveStatus(currentRow)">{{ formatMoney(Math.abs(effectivePending(currentRow))) }}</span>
         </div>
         <el-tag :type="effectiveStatusMeta(currentRow).type" effect="dark">{{ effectiveStatusMeta(currentRow).text }}</el-tag>
      </div>

      </el-tab-pane>

      <!-- ========== 页签二：产值统计（镜像回款页「到账统计」交互） ========== -->
      <el-tab-pane label="产值统计" name="output">
         <!-- Row 1: 统计口径 + 快捷区间 -->
         <div class="status-capsule-row">
            <span class="capsule-group-label">统计口径</span>
            <span class="status-capsule active">按办结时间</span>
            <span class="capsule-sep" />
            <span class="capsule-group-label">快捷区间</span>
            <span v-for="q in OUTPUT_QUICKS" :key="q.value" class="status-capsule" :class="{ active: outputQuick === q.value }" @click="setOutputQuick(q.value)">{{ q.label }}</span>
         </div>

         <!-- Row 2: 视图切换（项目 / 客户 / 负责人） -->
         <div class="status-capsule-row">
            <span class="capsule-group-label">视图</span>
            <span v-for="v in OUTPUT_VIEWS" :key="v.value" class="status-capsule" :class="{ active: outputView === v.value }" @click="setOutputView(v.value)">{{ v.label }}</span>
            <span class="capsule-sep" />
            <span class="output-view-hint">{{ OUTPUT_VIEW_HINT[outputView] }}</span>
         </div>

         <!-- Row 3: 时间维度 / 区间 / 操作 -->
         <div class="search-bar-row">
            <el-select v-if="outputView === 'project'" v-model="outputGroupBy" style="width: 150px;flex:0 0 150px" @change="handleOutputQuery">
               <el-option v-for="g in OUTPUT_GROUPS" :key="g.value" :label="g.label" :value="g.value" />
            </el-select>
            <el-date-picker v-model="outputRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" class="sum-range-picker" @change="handleOutputQuery" />
            <el-button type="primary" size="small" @click="handleOutputQuery">查询</el-button>
            <el-button size="small" @click="resetOutputQuery">重置</el-button>
            <el-button type="warning" plain icon="Download" size="small" style="margin-left: auto" @click="handleOutputExport" v-hasPermi="['project:settlement:export']">导出产值明细</el-button>
         </div>

         <!-- Row 3: 高级筛选 -->
         <div class="advanced-toggle-row" @click="outputAdvancedVisible = !outputAdvancedVisible">
            <span>{{ outputAdvancedVisible ? '▲' : '▼' }} 高级筛选</span>
         </div>

         <!-- Row 4: 高级面板 -->
         <el-collapse-transition>
            <div v-show="outputAdvancedVisible" class="advanced-filter-panel">
               <div class="filter-grid">
                  <div class="filter-item">
                     <div class="filter-item-label">工程编号/项目名称</div>
                     <el-input v-model="outputQuery.keyword" placeholder="编号或名称关键词" clearable @keyup.enter="handleOutputQuery" @clear="handleOutputQuery" />
                  </div>
                  <div class="filter-item">
                     <div class="filter-item-label">委托单位</div>
                     <el-select v-model="outputQuery.clientUnit" filterable clearable placeholder="全部单位" style="width:100%" :loading="distinctLoading" @change="handleOutputQuery">
                        <el-option v-for="u in clientUnitOptions" :key="u" :label="u" :value="u" />
                     </el-select>
                  </div>
                  <div class="filter-item">
                     <div class="filter-item-label">负责人</div>
                     <el-select v-model="outputQuery.leaderId" filterable clearable placeholder="全部负责人" style="width:100%" @change="handleOutputQuery">
                        <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </div>
                  <div class="filter-item">
                     <div class="filter-item-label">项目类别</div>
                     <el-select v-model="outputQuery.projectCategoryId" filterable clearable placeholder="全部类别" style="width:100%" @change="handleOutputQuery">
                        <el-option v-for="c in projectCategoryOptions" :key="c.id" :label="c.name" :value="c.id" />
                     </el-select>
                  </div>
               </div>
               <div class="quick-filter-row">
                  <span class="collapse-link" @click="outputAdvancedVisible = false">收起 ▲</span>
               </div>
            </div>
         </el-collapse-transition>

         <!-- Row 5: 合计指标（内外产值不相加：内部=成本 / 外部=结算基准；指令性任务外部产值单独列示） -->
         <el-row v-loading="outputLoading" :gutter="14" class="sum-metric-row">
            <el-col :span="6">
               <div class="sum-metric">
                  <div class="sum-metric-label">外部产值(元) · 按办结时间</div>
                  <div class="sum-metric-value" style="color:#409eff">{{ formatMoney(outputSummary.externalOutput) }}</div>
                  <div class="sum-metric-sub">已剔除指令性任务 <b class="text-mandate">{{ formatMoney(outputSummary.mandateExternalOutput) }}</b></div>
               </div>
            </el-col>
            <el-col :span="6">
               <div class="sum-metric">
                  <div class="sum-metric-label">内部产值(元) · 按办结时间</div>
                  <div class="sum-metric-value">{{ formatMoney(outputSummary.internalOutput) }}</div>
                  <div class="sum-metric-sub">指令性任务同样计入</div>
               </div>
            </el-col>
            <el-col :span="6">
               <div class="sum-metric sum-metric-mandate">
                  <div class="sum-metric-label">指令性任务 · 外部产值(元)</div>
                  <div class="sum-metric-value text-mandate">{{ formatMoney(outputSummary.mandateExternalOutput) }}</div>
                  <div class="sum-metric-sub">{{ outputSummary.mandateProjectCount || 0 }} 个项目 · 不计入应收</div>
               </div>
            </el-col>
            <el-col :span="6">
               <div class="sum-metric">
                  <div class="sum-metric-label">办结项目数</div>
                  <div class="sum-metric-value">{{ outputSummary.projectCount || 0 }}</div>
                  <div class="sum-metric-sub">含指令性任务 {{ outputSummary.mandateProjectCount || 0 }} 个</div>
               </div>
            </el-col>
         </el-row>

         <!-- Row 5b: 全量外部产值构成条（用于对账：市场性任务 + 指令性 = 全量） -->
         <div v-loading="outputLoading" class="output-compose">
            <div class="output-compose-head">
               <span>全量外部产值构成</span>
               <span class="output-compose-total">合计 ￥{{ formatMoney(outputCompose.total) }}</span>
            </div>
            <div class="output-compose-bar">
               <div v-if="outputCompose.normalPct > 0" class="compose-seg compose-normal" :style="{ width: outputCompose.normalPct + '%' }">{{ outputCompose.normalPct }}%</div>
               <div v-if="outputCompose.mandatePct > 0" class="compose-seg compose-mandate" :style="{ width: outputCompose.mandatePct + '%' }">{{ outputCompose.mandatePct }}%</div>
            </div>
            <div class="output-compose-legend">
               <span><i class="dot dot-normal"></i>市场性任务 ￥{{ formatMoney(outputSummary.externalOutput) }}</span>
               <span><i class="dot dot-mandate"></i>指令性任务 ￥{{ formatMoney(outputSummary.mandateExternalOutput) }}</span>
            </div>
         </div>

         <!-- Row 6: 分组明细 -->
         <el-table v-if="outputGroupByValue !== 'none'" v-loading="outputLoading" :data="outputGroups" stripe border max-height="420" v-hover-h-scroll @row-click="handleOutputDrill">
            <el-table-column :label="outputGroupLabelText" align="left" min-width="180">
               <template #default="scope">{{ scope.row.label || '—' }}</template>
            </el-table-column>
            <el-table-column label="办结项目数" align="center" prop="projectCount" width="110" />
            <el-table-column label="内部产值(元)" align="right" width="160">
               <template #default="scope">{{ formatMoney(scope.row.internalOutput) }}</template>
            </el-table-column>
            <el-table-column label="外部产值(元)" align="right" width="160">
               <template #default="scope"><span style="font-weight:600">{{ formatMoney(scope.row.externalOutput) }}</span></template>
            </el-table-column>
            <el-table-column v-if="outputView !== 'project'" label="指令性外部产值(元)" align="right" width="150">
               <template #default="scope">
                  <span class="text-mandate" style="font-weight:600">{{ formatMoney(scope.row.mandateExternalOutput) }}</span>
               </template>
            </el-table-column>
            <el-table-column label="外部产值占比" align="left" min-width="200">
               <template #default="scope">
                  <el-progress :percentage="outputShare(scope.row)" :stroke-width="10" color="#409eff" />
               </template>
            </el-table-column>
            <el-table-column label="操作" align="center" width="90" fixed="right">
               <template #default="scope">
                  <el-button link type="primary" size="small" @click.stop="handleOutputDrill(scope.row)">明细</el-button>
               </template>
            </el-table-column>
         </el-table>
         <el-empty v-else description="选择时间维度（按月/季/年）可查看产值分布；或切换到客户视图 / 负责人视图按维度汇总。点行可下钻项目明细" :image-size="70" />

      </el-tab-pane>
      </el-tabs>

      <!-- 工作量明细弹窗（公共组件 WorkloadDialog，回款页共用同一实现） -->
      <WorkloadDialog
         v-model="workloadOpen"
         :project-id="editProjectId"
         :project-code="editProjectCode"
         :client-unit="editClientUnit"
         :project-location="editProjectLocation"
         :engineering-project="editEngineeringProject"
         @saved="refreshAll(false)"
      />

      <!-- 产值明细下钻弹窗（产值统计页签） -->
      <el-dialog
         :model-value="outputDrill.open"
         @update:model-value="outputDrill.open = $event"
         :title="outputDrill.title"
         append-to-body
         destroy-on-close
         :close-on-click-modal="false"
         class="scrollbar"
         width="1080px"
         draggable
      >
         <el-table v-loading="outputDrill.loading" :data="outputDrill.rows" stripe border max-height="440" v-hover-h-scroll>
            <el-table-column label="工程编号" prop="projectCode" width="140" align="center" />
            <el-table-column label="项目名称" prop="projectName" min-width="200" align="left" show-overflow-tooltip />
            <el-table-column label="委托单位" prop="clientUnit" min-width="180" align="left" show-overflow-tooltip />
            <el-table-column label="项目性质" width="110" align="center">
               <template #default="scope">
                  <el-tag :type="projectNatureTagType(scope.row.projectNature)" size="small" effect="plain">{{ projectNatureText(scope.row.projectNature) }}</el-tag>
               </template>
            </el-table-column>
            <el-table-column label="办结时间" width="115" align="center">
               <template #default="scope">{{ String(scope.row.closeTime || '').slice(0, 10) }}</template>
            </el-table-column>
            <el-table-column label="内部产值(元)" width="140" align="right">
               <template #default="scope">{{ formatMoney(scope.row.internalOutput) }}</template>
            </el-table-column>
            <el-table-column label="外部产值(元)" width="145" align="right">
               <template #default="scope">
                  <span style="font-weight:600" :class="{ 'text-mandate': scope.row.projectNature === 'mandate' }">{{ formatMoney(scope.row.externalOutput) }}</span>
               </template>
            </el-table-column>
         </el-table>
         <div class="sum-tip" style="margin-top:8px">
            明细按<b>项目实际值</b>显示；其中「指令性任务」项目的外部产值<b>不计入</b>上方合计（已改道到「指令性任务」指标），仅用于查看项目真实金额。
         </div>
         <pagination v-show="outputDrill.total > 0" :total="outputDrill.total" v-model:page="outputDrill.pageNum" v-model:limit="outputDrill.pageSize" @pagination="loadOutputDetail" />
      </el-dialog>

      <!-- 到账信息弹窗 -->
      <el-dialog
         :model-value="paymentOpen"
         @update:model-value="paymentOpen = $event"
         append-to-body
         destroy-on-close
         :close-on-click-modal="false"
         width="80%"
         draggable
      >
         <el-form ref="paymentRef" v-loading="paymentLoading" element-loading-text="数据加载中..." element-loading-background="rgba(255, 255, 255, 0.7)" :model="paymentForm" label-width="100px">
            <!-- 付款信息（保持原有结构） -->
            <el-divider content-position="left">付款信息</el-divider>
            <div class="settle-panel">
               <!-- 付款单位 -->
               <el-row :gutter="20">
                  <el-col :span="8">
                     <el-form-item label="付款单位">
                        <el-select v-model="paymentForm.payUnit" filterable clearable allow-create placeholder="请选择或输入付款单位" style="width: 100%">
                           <el-option v-for="u in clientUnitOptions" :key="u" :label="u" :value="u" />
                        </el-select>
                     </el-form-item>
                  </el-col>
               </el-row>
               <!-- 预付款（①） -->
               <div class="pay-row">
                  <el-row :gutter="20">
                     <el-col :span="8">
                        <el-form-item>
                           <template #label><span class="pay-label pay-label-advance">① 预付款</span></template>
                           <el-input-number v-model="paymentForm.prepayAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="金额" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="付款时间">
                           <el-date-picker v-model="paymentForm.prepayDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="付款方式">
                           <el-select v-model="paymentForm.prepayMethod" clearable placeholder="选择" style="width:100%">
                              <el-option v-for="m in payMethodOptions" :key="m" :label="m" :value="m" />
                           </el-select>
                        </el-form-item>
                     </el-col>
                  </el-row>
               </div>
               <!-- 尾款（②） -->
               <div class="pay-row">
                  <el-row :gutter="20">
                     <el-col :span="8">
                        <el-form-item>
                           <template #label><span class="pay-label pay-label-tail">② 尾款</span></template>
                           <el-input-number v-model="paymentForm.tailAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="金额" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="尾款时间">
                           <el-date-picker v-model="paymentForm.tailDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="付款方式">
                           <el-select v-model="paymentForm.tailMethod" clearable placeholder="选择" style="width:100%">
                              <el-option v-for="m in payMethodOptions" :key="m" :label="m" :value="m" />
                           </el-select>
                        </el-form-item>
                     </el-col>
                  </el-row>
               </div>
               <!-- 退款信息（③，多笔动态列表） -->
               <div class="refund-section">
                  <div class="refund-header">
                     <span class="pay-label pay-label-refund">③ 退款信息</span>
                     <span class="refund-total">退款合计：<b class="refund-total-num">{{ formatMoney(refundTotal) }}</b></span>
                     <el-button type="primary" link icon="Plus" @click="addRefundRow">添加退款</el-button>
                  </div>
                  <div v-for="(rf, idx) in paymentForm.refunds" :key="idx" class="pay-row refund-row">
                     <el-row :gutter="20">
                        <el-col :span="6">
                           <el-form-item :label="`第${idx + 1}笔金额`">
                              <el-input-number v-model="rf.amount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="退款金额" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="5">
                           <el-form-item label="退款时间">
                              <el-date-picker v-model="rf.payTime" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="5">
                           <el-form-item label="退款方式">
                              <el-select v-model="rf.payMethod" clearable placeholder="选择" style="width:100%">
                                 <el-option v-for="m in payMethodOptions" :key="m" :label="m" :value="m" />
                              </el-select>
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="退款原因">
                              <el-input v-model="rf.remark" placeholder="选填" maxlength="200" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="2">
                           <el-button type="danger" link icon="Delete" class="refund-del" @click="removeRefundRow(idx)">删除</el-button>
                        </el-col>
                     </el-row>
                  </div>
                  <div v-if="!paymentForm.refunds.length" class="refund-empty">暂无退款记录，点击「添加退款」录入</div>
               </div>
               <!-- 备注 -->
               <el-form-item label="备注">
                  <el-input v-model="paymentForm.remark" placeholder="备注" maxlength="500" />
               </el-form-item>
            </div>

            <!-- 开票信息（保持原有结构） -->
            <el-divider content-position="left">开票信息</el-divider>
            <div class="settle-panel">
               <!-- 开票方式 -->
               <div class="invoice-mode-row">
                  <span class="pay-options-label">开票方式：</span>
                  <el-radio-group v-model="paymentForm.invoiceMode">
                     <el-radio-button value="unified">统一开票</el-radio-button>
                     <el-radio-button value="split">分笔开票</el-radio-button>
                  </el-radio-group>
               </div>
               <!-- 统一开票：一组发票 -->
               <el-row v-if="paymentForm.invoiceMode === 'unified'" :gutter="20">
                  <el-col :span="6">
                     <el-form-item label="开票状态">
                        <div class="invoice-status-cell">
                           <el-tag v-if="isVoidedInvoice(paymentForm.invoiceStatus)" type="danger" size="small">已作废</el-tag>
                           <el-tag v-else-if="paymentForm.invoiceDate || (paymentForm.invoiceAmount != null && paymentForm.invoiceAmount > 0)" type="success" size="small">已开票</el-tag>
                           <el-checkbox :model-value="isVoidedInvoice(paymentForm.invoiceStatus)" @change="(v) => paymentForm.invoiceStatus = v ? 'voided' : null">标记作废</el-checkbox>
                        </div>
                     </el-form-item>
                  </el-col>
                  <el-col :span="6">
                     <el-form-item label="发票号码">
                        <el-input v-model="paymentForm.invoiceNo" placeholder="发票号码" maxlength="100" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="6">
                     <el-form-item label="开票日期">
                        <el-date-picker v-model="paymentForm.invoiceDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="6">
                     <el-form-item label="开票金额">
                        <el-input-number v-model="paymentForm.invoiceAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="开票金额" />
                     </el-form-item>
                  </el-col>
               </el-row>
               <!-- 分笔开票：预付款发票 + 尾款发票 -->
               <template v-else>
                  <div class="invoice-group">
                     <div class="invoice-group-title">预付款发票</div>
                     <el-row :gutter="20">
                        <el-col :span="6">
                           <el-form-item label="开票状态">
                              <div class="invoice-status-cell">
                                 <el-tag v-if="isVoidedInvoice(paymentForm.invoiceStatus)" type="danger" size="small">已作废</el-tag>
                                 <el-tag v-else-if="paymentForm.invoiceDate || (paymentForm.invoiceAmount != null && paymentForm.invoiceAmount > 0)" type="success" size="small">已开票</el-tag>
                                 <el-checkbox :model-value="isVoidedInvoice(paymentForm.invoiceStatus)" @change="(v) => paymentForm.invoiceStatus = v ? 'voided' : null">标记作废</el-checkbox>
                              </div>
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="发票号码">
                              <el-input v-model="paymentForm.invoiceNo" placeholder="发票号码" maxlength="100" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票日期">
                              <el-date-picker v-model="paymentForm.invoiceDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票金额">
                              <el-input-number v-model="paymentForm.invoiceAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="开票金额" />
                           </el-form-item>
                        </el-col>
                     </el-row>
                  </div>
                  <div class="invoice-group">
                     <div class="invoice-group-title">尾款发票</div>
                     <el-row :gutter="20">
                        <el-col :span="6">
                           <el-form-item label="开票状态">
                              <div class="invoice-status-cell">
                                 <el-tag v-if="isVoidedInvoice(paymentForm.tailInvoiceStatus)" type="danger" size="small">已作废</el-tag>
                                 <el-tag v-else-if="paymentForm.tailInvoiceDate || (paymentForm.tailInvoiceAmount != null && paymentForm.tailInvoiceAmount > 0)" type="success" size="small">已开票</el-tag>
                                 <el-checkbox :model-value="isVoidedInvoice(paymentForm.tailInvoiceStatus)" @change="(v) => paymentForm.tailInvoiceStatus = v ? 'voided' : null">标记作废</el-checkbox>
                              </div>
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="发票号码">
                              <el-input v-model="paymentForm.tailInvoiceNo" placeholder="发票号码" maxlength="100" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票日期">
                              <el-date-picker v-model="paymentForm.tailInvoiceDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票金额">
                              <el-input-number v-model="paymentForm.tailInvoiceAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="开票金额" />
                           </el-form-item>
                        </el-col>
                     </el-row>
                  </div>
               </template>
            </div>
         </el-form>
         <template #footer>
            <el-button @click="paymentOpen = false">取消</el-button>
            <el-button type="primary" @click="savePaymentData" :loading="paymentSaving" :disabled="paymentLoading">保 存</el-button>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Settlement">
import { treeListSettlement, getSettlementDetail, savePayment, getSettlementColumns, getSettlementEntryStatusCounts } from "@/api/project/settlement"
import { workloadOutputSummary, workloadOutputDetail } from "@/api/project/workload"
import WorkloadDialog from "@/components/WorkloadDialog"
import { categoryTreeselectFull } from "@/api/project/category"
import { listUserOptions } from "@/api/system/user"
import { getDistinctValues } from "@/api/project/project"
import { listContract } from "@/api/project/contract"
import { checkPermi } from "@/utils/permission"
import { invoiceStatusText, invoiceStatusTagType, invoicePaymentText, invoicePaymentTagType, isVoidedInvoice, projectNatureText, projectNatureTagType } from "@/utils/projStatus"
import useSearchMemoryStore from "@/store/modules/searchMemory"
import cache from '@/plugins/cache'

const { proxy } = getCurrentInstance()

// 字典：项目来源（manual=手动录入 / import=Excel 导入）；字典未部署时用内置项兜底，避免下拉为空
const { proj_project_source } = useDict("proj_project_source")
const sourceOptions = computed(() => {
  const dict = proj_project_source.value || []
  if (dict.length) return dict
  return [
    { value: 'manual', label: '手动录入' },
    { value: 'import', label: 'Excel 导入' }
  ]
})
const searchMemory = useSearchMemoryStore()

const treeData = ref([])
const loading = ref(false)
const showSearch = ref(true)
/** 当前选中行（底部结算核对条用） */
const currentRow = ref(null)
/** 展开行 row-key 集合（受控展开，用于合并列箭头方向 + 翻页清空） */
const expandedKeys = ref([])
/** 分页状态 */
const pageNum = ref(1)
const pageSize = ref(10)
/** 展开明细缓存：projectId -> { loading, workloads, payments }（懒加载，刷新时清理） */
const expandDetails = reactive({})
/** 表格列显隐配置（后端接口动态加载；序号、操作列固定不参与） */
const columns = ref({})
/** 当前可见列（按接口返回顺序过滤） */
const visibleColumns = computed(() => Object.values(columns.value).filter(c => c.visible))
const COLUMNS_STORAGE_KEY = 'settlement-list-columns'
/** 兜底清单：后端接口不可用（如后端未重启）时使用，保证表格不退化（与后端 /columns 默认可见列一致） */
const FALLBACK_COLUMNS = [
  { key: 'projectCode', label: '工程编号', type: 'text', group: 'business', prop: 'projectCode', defaultVisible: true },
  { key: 'projectName', label: '项目名称', type: 'text', group: 'business', prop: 'projectName', defaultVisible: false },
  { key: 'clientUnit', label: '委托单位', type: 'text', group: 'business', prop: 'clientUnit', defaultVisible: true },
  { key: 'projectLocation', label: '工程地点', type: 'text', group: 'business', prop: 'projectLocation', defaultVisible: true },
  { key: 'leaderNames', label: '负责人', type: 'text', group: 'business', prop: 'leaderNames', defaultVisible: false },
  { key: 'userName', label: '人员', type: 'text', group: 'business', prop: 'userName', defaultVisible: false },
  { key: 'categoryName', label: '项目类别', type: 'text', group: 'business', prop: 'categoryName', defaultVisible: false },
  { key: 'internalWorkload', label: '内部工作量', type: 'number', group: 'business', prop: 'internalWorkload', defaultVisible: true },
  { key: 'externalWorkload', label: '外部工作量', type: 'number', group: 'business', prop: 'externalWorkload', defaultVisible: true },
  { key: 'workload', label: '工作量', type: 'number', group: 'business', prop: 'workload', defaultVisible: false },
  { key: 'internalPrice', label: '内部单价', type: 'money', group: 'business', prop: 'internalPrice', defaultVisible: false },
  { key: 'externalPrice', label: '外部单价', type: 'money', group: 'business', prop: 'externalPrice', defaultVisible: false },
  { key: 'internalOutput', label: '内部产值', type: 'money', group: 'business', prop: 'internalOutput', defaultVisible: true },
  { key: 'externalOutput', label: '外部产值', type: 'money', group: 'business', prop: 'externalOutput', defaultVisible: true },
  { key: 'prepayAmount', label: '预付款', type: 'money', group: 'business', prop: 'prepayAmount', defaultVisible: true },
  { key: 'prepayDate', label: '预付款时间', type: 'date', group: 'business', prop: 'prepayDate', defaultVisible: true },
  { key: 'payUnit', label: '付款单位', type: 'text', group: 'business', prop: 'payUnit', defaultVisible: true },
  { key: 'payMethod', label: '付款方式', type: 'text', group: 'business', prop: 'payMethod', defaultVisible: true },
  { key: 'tailAmount', label: '尾款', type: 'money', group: 'business', prop: 'tailAmount', defaultVisible: true },
  { key: 'tailDate', label: '尾款时间', type: 'date', group: 'business', prop: 'tailDate', defaultVisible: true },
  { key: 'refundAmount', label: '退款金额', type: 'money', group: 'business', prop: 'refundAmount', defaultVisible: true },
  { key: 'refundDate', label: '退款时间', type: 'date', group: 'business', prop: 'refundDate', defaultVisible: true },
  { key: 'invoiceStatus', label: '开票状态', type: 'text', group: 'business', prop: 'invoiceStatus', defaultVisible: true },
  { key: 'invoiceNo', label: '发票号码', type: 'text', group: 'business', prop: 'invoiceNo', defaultVisible: true },
  { key: 'invoiceAmount', label: '开票金额', type: 'money', group: 'business', prop: 'invoiceAmount', defaultVisible: true },
  { key: 'payRemark', label: '备注', type: 'text', group: 'business', prop: 'payRemark', defaultVisible: true }
]

/** 把列元数据数组构建为 columns 对象（合并 localStorage 偏好） */
function buildColumns(list) {
  let saved = {}
  try {
    saved = cache.local.getJSON(COLUMNS_STORAGE_KEY) || {}
  } catch (e) { /* 忽略本地存储异常 */ }
  const obj = {}
  list.forEach(col => {
    obj[col.key] = {
      key: col.key,
      label: col.label,
      type: col.type,
      group: col.group,
      prop: col.prop,
      visible: saved[col.key] !== undefined ? !!saved[col.key] : !!col.defaultVisible
    }
  })
  columns.value = obj
}

/** 从后端加载可显隐列元数据；接口不可用时降级到内置兜底清单 */
async function loadColumns() {
  try {
    const list = await getSettlementColumns()
    if (Array.isArray(list) && list.length > 0) {
      buildColumns(list)
    } else {
      buildColumns(FALLBACK_COLUMNS)
    }
  } catch (e) {
    console.error('加载列配置失败，使用内置默认列', e)
    buildColumns(FALLBACK_COLUMNS)
  }
}

/** 列宽自适应：日期/金额窄列，其余文本宽列 */
function colWidth(col) {
  if (col.type === 'date') return 120
  if (col.type === 'money' || col.type === 'number') return 110
  return 130
}

/** 录入状态胶囊：工作量/到账/发票（筛选条件全部下推后端，计数由后端全局口径返回） */
const workloadFilter = ref('all')
const paymentFilter = ref('all')
const invoiceUnpaidFilter = ref(false)
/** 录入状态全局计数（后端 /entryStatusCounts 返回；忽略录入状态筛选本身） */
const entryCounts = ref({
  workloadDone: 0,
  workloadUndone: 0,
  paymentDone: 0,
  paymentUndone: 0,
  invoiceUnpaid: 0
})
const workloadDoneCount = computed(() => Number(entryCounts.value.workloadDone) || 0)
const workloadUndoneCount = computed(() => Number(entryCounts.value.workloadUndone) || 0)
const paymentDoneCount = computed(() => Number(entryCounts.value.paymentDone) || 0)
const paymentUndoneCount = computed(() => Number(entryCounts.value.paymentUndone) || 0)
const invoiceUnpaidCount = computed(() => Number(entryCounts.value.invoiceUnpaid) || 0)
/** 「全部」胶囊的计数 = 当前项目状态+高级筛选下的项目总数（后端 total） */
const entryAllCount = computed(() => total.value)

/** 总条数（后端分页 total） */
const total = ref(0)

/** 当前页数据（直接使用后端返回的当前页 rows） */
const pagedTreeData = computed(() => treeData.value)

const selectedStatuses = ref(['closed', 'archived'])
const editProjectCode = ref("")
const editClientUnit = ref("")
const editProjectLocation = ref("")
const editProjectId = ref(null)
const workloadOpen = ref(false)
const paymentOpen = ref(false)
const paymentSaving = ref(false)
const editEngineeringProject = ref('')
/** 到账信息表单：付款 + 开票字段（到账信息弹窗使用） */
const paymentForm = ref({
   prepayAmount: null,
   prepayDate: null,
   payUnit: null,
   prepayMethod: null,
   tailMethod: null,
   tailAmount: null,
   tailDate: null,
   refunds: [],
   remark: null,
   invoiceMode: 'unified',
   invoiceStatus: null,
   invoiceNo: null,
   invoiceDate: null,
   invoiceAmount: null,
   tailInvoiceStatus: null,
   tailInvoiceNo: null,
   tailInvoiceDate: null,
   tailInvoiceAmount: null
})
const paymentRef = ref(null)
const userOptions = ref([])
/**
 * 项目类别选项（产值统计高级筛选用）：与首页同源（/project/category/treeselectFull），
 * 把树递归打平后只保留「有父节点」的节点 ⇒ 只出小类，不含「管线 / 工程」两个大类。
 * 把树递归打平后只保留「有父节点」的小类（不含「管线 / 工程」两个大类）。
 */
const projectCategoryOptions = ref([])
const clientUnitOptions = ref([])
/** 工作量弹窗内容加载中（先开弹窗再异步填充，消除点击后的空白等待） */
const workloadLoading = ref(false)
/** 到账信息弹窗内容加载中 */
const paymentLoading = ref(false)
/** 基础数据（类别树/计费项/用户）懒加载中（单一 ref，被多入口 await 时由缓存机制保证不会互相提前关掉遮罩） */
const baseDataLoading = ref(false)
/** 委托单位去重值（筛选下拉）加载中 */
const distinctLoading = ref(false)

// 新增：智能查询面板
const closeDateRange = ref([])
const contractOptions = ref([])
const contractLoading = ref(false)
const advancedVisible = ref(false)

const data = reactive({
  queryParams: {
    keyword: undefined,
    projectCode: undefined,
    clientUnit: undefined,
    projectLocation: undefined,
    projectCategoryId: undefined,
    leaderId: undefined,
    contractId: undefined,
    dataSource: undefined,
    closeDateBegin: undefined,
    closeDateEnd: undefined
  },
})

const { queryParams } = toRefs(data)

// 退款合计（多笔求和）
const refundTotal = computed(() => {
  return paymentForm.value.refunds.reduce((s, r) => s + (Number(r.amount) || 0), 0)
})

// 付款方式选项（开票状态不提供手选项：由发票信息/作废标记自动推断，码值 pending/invoiced/voided）
const payMethodOptions = ['转账', '现金', '支票', '其他']

/** 金额格式化 */
function formatMoney(val) {
  if (val == null) return ""
  return Number(val).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 工作量格式化：千分位 + 最多 2 位小数并去除尾随 0（如 1200 → 1,200；12.50 → 12.5） */
function fmtWorkload(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 工作量是否为空（null / 0 视作无数据） */
function isWlEmpty(val) {
  return val == null || Number(val) === 0
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

/** 查询列表（后端分页；`resetPage` 为 true 时回到第 1 页） */
function getList(resetPage = true) {
  if (resetPage) pageNum.value = 1
  loading.value = true
  const params = {
    ...queryParams.value,
    projectStatus: selectedStatuses.value.join(','),
    pageNum: pageNum.value,
    pageSize: pageSize.value
  }
  // 录入状态筛选下推后端（'all' 与 false 不传，表示不限）
  if (workloadFilter.value === 'done' || workloadFilter.value === 'undone') {
    params.workloadEntry = workloadFilter.value
  }
  if (paymentFilter.value === 'done' || paymentFilter.value === 'undone') {
    params.paymentEntry = paymentFilter.value
  }
  if (invoiceUnpaidFilter.value) {
    params.invoiceUnpaid = 'true'
  }
  treeListSettlement(params).then(response => {
    treeData.value = response.rows || []
    total.value = Number(response.total) || 0
    // 数据刷新后清理展开明细与选中行，避免旧数据残留
    Object.keys(expandDetails).forEach(k => delete expandDetails[k])
    expandedKeys.value = []
    currentRow.value = null
  }).finally(() => {
    loading.value = false
  })
}

/** 加载录入状态胶囊的全局计数（忽略录入状态筛选本身，只受项目状态+高级筛选影响） */
function loadEntryStatusCounts() {
  const params = {
    ...queryParams.value,
    projectStatus: selectedStatuses.value.join(',')
  }
  getSettlementEntryStatusCounts(params).then(response => {
    const d = response.data || response || {}
    entryCounts.value = {
      workloadDone: Number(d.workloadDone) || 0,
      workloadUndone: Number(d.workloadUndone) || 0,
      paymentDone: Number(d.paymentDone) || 0,
      paymentUndone: Number(d.paymentUndone) || 0,
      invoiceUnpaid: Number(d.invoiceUnpaid) || 0
    }
  }).catch(() => { /* 计数失败不影响主列表 */ })
}

/** 状态/高级筛选变化后统一刷新（列表 + 胶囊计数） */
function refreshAll(resetPage = true) {
  loadEntryStatusCounts()
  getList(resetPage)
}

// ===== 展开行明细卡 + 结算核对（平表模式） =====

/** 已收金额：优先后端汇总值，缺失时前端兜底（预付款+尾款） */
function effectiveReceived(row) {
  if (row.receivedAmount != null) return Number(row.receivedAmount)
  return (Number(row.prepayAmount) || 0) + (Number(row.tailAmount) || 0)
}

/** 待收差额 = 结算总额(外部产值) - 已收 */
function effectivePending(row) {
  const output = Number(row.externalOutput) || 0
  return output - effectiveReceived(row)
}

/** 结算状态：settled 已结清 / pending 未结清 / overdue 超额（后端字段优先，缺失时前端兜底计算） */
function effectiveStatus(row) {
  if (row.settlementStatus) return row.settlementStatus
  const output = Number(row.externalOutput) || 0
  const pending = effectivePending(row)
  if (pending < -0.01) return 'overdue'
  if (Math.abs(pending) <= 0.01 && output > 0) return 'settled'
  return 'pending'
}

/** 状态标签元数据 */
function effectiveStatusMeta(row) {
  const st = effectiveStatus(row)
  if (st === 'settled') return { text: '已结清', type: 'success' }
  if (st === 'overdue') return { text: '超额', type: 'danger' }
  return { text: '未结清', type: 'warning' }
}

/** 行选中（底部核对条） */
function handleCurrentChange(row) {
  currentRow.value = row || null
}

/** 展开态 loading 标记 */
function expandDetailLoading(projectId) {
  return expandDetails[projectId] ? expandDetails[projectId].loading : false
}

/** 合并列箭头：切换展开/收起（受控 expandedKeys + 首次展开懒加载明细） */
function toggleExpand(row) {
  const key = row.id
  const idx = expandedKeys.value.indexOf(key)
  if (idx >= 0) {
    expandedKeys.value.splice(idx, 1)
  } else {
    expandedKeys.value.push(key)
    if (!expandDetails[row.projectId]) loadExpandDetail(row)
  }
}

/** 分页变化：清空展开与选中 + 按新页码重新查询 */
function handlePagination() {
  expandedKeys.value = []
  currentRow.value = null
  getList(false)
}

/** 全局序号（翻页后连续） */
function seqNo(index) {
  return (pageNum.value - 1) * pageSize.value + index + 1
}

/** 加载展开明细（工作量 + 付款记录） */
function loadExpandDetail(row) {
  expandDetails[row.projectId] = { loading: true, workloads: [], payments: [] }
  getSettlementDetail(row.projectId).then(res => {
    const detail = res.data || {}
    const rawWorkloads = detail.workloads || []
    const subSet = new Set()
    rawWorkloads.forEach(w => { if (w.subItemNo != null && Number(w.subItemNo) > 0) subSet.add(Number(w.subItemNo)) })
    expandDetails[row.projectId] = {
      loading: false,
      hasMultipleSubItems: subSet.size > 1,
      workloads: (() => {
        const sorted = rawWorkloads
          .map(w => ({
            ...w,
            output: w.internalOutput != null ? w.internalOutput : (w.externalOutput != null ? w.externalOutput : null)
          }))
          .sort((a, b) => {
            // 先按子项（记录）排序，同一记录内外部在前、内部在后
            const an = Number(a.subItemNo) || 0
            const bn = Number(b.subItemNo) || 0
            if (an !== bn) return an - bn
            const order = { external: 0, internal: 1 }
            return (order[a.billingType] ?? 2) - (order[b.billingType] ?? 2)
          })
        // 追加分组合计行
        const makeSummary = (type, rows) => {
          if (!rows.length) return null
          const sumWL = rows.reduce((s, r) => s + (Number(r.workload) || 0), 0)
          const sumOut = rows.reduce((s, r) => s + (Number(r.output) || 0), 0)
          return {
            _isSummary: true,
            billingType: type,
            userName: '',
            categoryName: '',
            billingCategory: '',
            workload: sumWL,
            unitPrice: null,
            output: sumOut,
            priceUnit: '',
            minQuantity: null
          }
        }
        const extRows = sorted.filter(r => r.billingType === 'external')
        const intRows = sorted.filter(r => r.billingType === 'internal')
        const result = []
        // 外部行 + 外部合计
        if (extRows.length) {
          result.push(...extRows)
          const extSum = makeSummary('external', extRows)
          if (extSum) result.push(extSum)
        }
        // 内部行 + 内部合计
        if (intRows.length) {
          result.push(...intRows)
          const intSum = makeSummary('internal', intRows)
          if (intSum) result.push(intSum)
        }
        return result
      })(),
      payments: (detail.payments || []).sort((a, b) => {
        // 预付款在前、尾款在后
        const order = { advance: 0, final: 1 }
        return (order[a.paymentType] ?? 2) - (order[b.paymentType] ?? 2)
      })
    }
  }).catch(() => {
    expandDetails[row.projectId] = { loading: false, hasMultipleSubItems: false, workloads: [], payments: [] }
    proxy.$modal.msgError("加载结算明细失败")
  })
}

/** 展开明细表行样式：合计行高亮 */
function expandRowClass({ row }) {
  if (row._isSummary) {
    return 'expand-summary-row ' + row.billingType
  }
  return ''
}

/** 付款记录表合并：统一开票时合并开票金额/开票状态/发票号码三列（退款行不参与合并） */
function paymentSpanMethod({ rowIndex, columnIndex }, projectId) {
  const payments = expandDetails[projectId]?.payments || []
  if (payments.length <= 1) return
  // 退款行不携带发票信息：存在退款行时跳过合并，避免退款行被并入发票区
  if (payments.some(p => p.paymentType === 'refund')) return
  // 检测是否分笔开票：尾款有独立发票信息 → split
  const hasSplit = payments.slice(1).some(p => p.invoiceNo || p.invoiceStatus || p.invoiceAmount != null)
  if (hasSplit) return
  // 统一开票：合并开票金额(5)、开票状态(6)、发票号码(7)
  if (columnIndex === 5 || columnIndex === 6 || columnIndex === 7) {
    if (rowIndex === 0) {
      return { rowspan: payments.length, colspan: 1 }
    }
    return { rowspan: 0, colspan: 0 }
  }
}

/** 状态胶囊点击 */
function onStatusCapsuleClick(statuses) {
  selectedStatuses.value = statuses
  refreshAll()
}

/** 录入状态胶囊：工作量筛选（下推后端，重新查询并回到第 1 页） */
function setWorkloadFilter(val) {
  if (workloadFilter.value === val) return
  workloadFilter.value = val
  getList()
}

/** 录入状态胶囊：到账筛选（下推后端，重新查询并回到第 1 页） */
function setPaymentFilter(val) {
  if (paymentFilter.value === val) return
  paymentFilter.value = val
  getList()
}

/** 已开未付快捷胶囊：切换筛选（下推后端，重新查询并回到第 1 页） */
function toggleInvoiceUnpaidFilter() {
  invoiceUnpaidFilter.value = !invoiceUnpaidFilter.value
  getList()
}

/** 状态筛选变更 */
function onStatusChange(val) {
  refreshAll()
}

function handleQuery() {
  // 同步工程编号到全局记忆（含清空）
  searchMemory.setProjectCode(queryParams.value.projectCode)
  refreshAll()
}

function resetQuery() {
  closeDateRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.projectCode = undefined
  queryParams.value.clientUnit = undefined
  queryParams.value.projectLocation = undefined
  queryParams.value.projectCategoryId = undefined
  queryParams.value.leaderId = undefined
  queryParams.value.contractId = undefined
  queryParams.value.dataSource = undefined
  queryParams.value.closeDateBegin = undefined
  queryParams.value.closeDateEnd = undefined
  handleQuery()
}

/** 合同下拉：远程搜索（按编号 / 名称 / 委托单位 / 联系人） */
function searchContracts(query) {
  contractLoading.value = true
  const params = { pageNum: 1, pageSize: 50 }
  const kw = (query || '').trim()
  if (kw) { params.keyword = kw }
  listContract(params).then(response => {
    contractOptions.value = response.rows || []
  }).finally(() => { contractLoading.value = false })
}

/** 合同下拉：展开时若无数据则预加载 */
function onContractVisibleChange(visible) {
  if (visible && contractOptions.value.length === 0) { searchContracts("") }
}

/** 合同下拉展示：编号 + 名称（【编号】名称；缺失部分自动省略） */
function fmtContractOption(c) {
  const no = (c.contractNo || '').trim()
  const name = (c.contractName || '').trim()
  if (no && name) return '【' + no + '】' + name
  return no || name || '-'
}

/** 办结日期变更 */
function onCloseDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.closeDateBegin = val[0]
    queryParams.value.closeDateEnd = val[1]
  } else {
    queryParams.value.closeDateBegin = undefined
    queryParams.value.closeDateEnd = undefined
  }
  handleQuery()
}

/** 快捷日期 */
function setQuickDate(type) {
  const now = new Date()
  const fmt = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  let begin, end
  switch (type) {
    case 'today': begin = end = fmt(now); break
    case 'week': {
      const d = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
      const mon = new Date(now.getFullYear(), now.getMonth(), d)
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)
      begin = fmt(mon); end = fmt(sun)
      break
    }
    case 'month':
      begin = fmt(new Date(now.getFullYear(), now.getMonth(), 1))
      end = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0))
      break
    case '7days': begin = fmt(new Date(now.getTime() - 6 * 86400000)); end = fmt(now); break
    case '30days': begin = fmt(new Date(now.getTime() - 29 * 86400000)); end = fmt(now); break
  }
  if (begin && end) {
    closeDateRange.value = [begin, end]
    onCloseDateChange([begin, end])
  }
}

// ---- 基础数据缓存：类别树 / 用户列表 / 计费档位 页面运行期基本不变，首次成功后复用 ----
/** 把 /project/category/treeselectFull 的树递归打平；onlyLeaf=true 时只保留「有父节点」的小类 */
function flattenCategoryTree(nodes, onlyLeaf) {
  const out = []
  const walk = list => (list || []).forEach(n => {
    if (!onlyLeaf || n.parentId != null) out.push({ id: n.id, name: n.name })
    walk(n.children)
  })
  walk(nodes)
  return out
}

let baseDataCache = null   // 已 resolve 的 Promise（命中即同步返回）
let baseDataPending = null // 进行中的 Promise（防止并发重复请求）
function ensureBaseData() {
  if (baseDataCache) return baseDataCache
  if (!baseDataPending) {
    baseDataLoading.value = true
    baseDataPending = Promise.all([
      categoryTreeselectFull(),
      listUserOptions({ pageNum: 1, pageSize: 1000 })
    ]).then(([catRes, userRes]) => {
      const base = {
        userOptions: userRes.rows || [],
        projectCategoryOptions: flattenCategoryTree(catRes.data || [], true)
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

/** 把 ensureBaseData 的结果写入各下拉的 ref（缓存命中时同步返回，重复调用不产生额外请求） */
function applyBaseData(base) {
  userOptions.value = base.userOptions
  projectCategoryOptions.value = base.projectCategoryOptions
}

/** 打开工作量弹窗（明细由公共组件自行加载；本页只负责传参 + 打开） */
function handleEditWorkload(row) {
  editProjectId.value = row.projectId
  editProjectCode.value = row.projectCode
  editClientUnit.value = row.clientUnit || ""
  editProjectLocation.value = row.projectLocation || ""
  editEngineeringProject.value = row.engineeringProject || ""

  workloadOpen.value = true
}

/** 打开到账信息弹窗（先立即开窗显示 loading，明细就绪后填充） */
function handleEditPayment(row) {
  editProjectId.value = row.projectId
  editProjectCode.value = row.projectCode
  editClientUnit.value = row.clientUnit || ""
  editProjectLocation.value = row.projectLocation || ""
  editEngineeringProject.value = row.engineeringProject || ""

  // 立即打开弹窗 + 内容 loading，明细在后台加载
  paymentOpen.value = true
  paymentLoading.value = true
  getSettlementDetail(row.projectId)
    .then(detailRes => {
      const detail = detailRes.data
      const payments = detail.payments || []
      // 填充付款信息
      const prepay = payments.find(p => p.paymentType === "advance")
      const tail = payments.find(p => p.paymentType === "final")
      paymentForm.value.prepayAmount = prepay ? prepay.amount : null
      paymentForm.value.prepayDate = prepay ? prepay.payTime : null
      paymentForm.value.payUnit = prepay ? prepay.payUnit : (tail ? tail.payUnit : null)
      paymentForm.value.prepayMethod = prepay ? prepay.payMethod : null
      paymentForm.value.tailMethod = tail ? tail.payMethod : null
      paymentForm.value.tailAmount = tail ? tail.amount : null
      paymentForm.value.tailDate = tail ? tail.payTime : null
      paymentForm.value.remark = prepay ? prepay.remark : (tail ? tail.remark : null)

      // 退款回填
      const refunds = detail.refunds || payments.filter(p => p.paymentType === 'refund')
      paymentForm.value.refunds = refunds.map(r => ({
        amount: r.amount != null ? Number(r.amount) : null,
        payTime: r.payTime || null,
        payMethod: r.payMethod || null,
        remark: r.remark || null
      }))

      // 开票信息：尾款存在发票数据 → 分笔开票；否则统一开票
      // 分笔开票判定：仅「有发票实质数据」（发票号 / 开票日期 / 开票金额>0，或已开/已作废）才算分笔；
      // 「未开 / pending」只是状态占位，不算——否则导入数据的编辑弹窗会默认切到分笔模式
      const tailInvText = invoiceStatusText(tail && tail.invoiceStatus)
      const tailHasInvoice = !!tail && (
        !!tail.invoiceNo || !!tail.invoiceDate || (tail.invoiceAmount != null && tail.invoiceAmount > 0)
        || tailInvText === '已开' || tailInvText === '已作废'
      )
      paymentForm.value.invoiceMode = tailHasInvoice ? 'split' : 'unified'
      const invSrc = prepay || tail
      paymentForm.value.invoiceStatus = invSrc ? invSrc.invoiceStatus : null
      paymentForm.value.invoiceNo = invSrc ? invSrc.invoiceNo : null
      paymentForm.value.invoiceDate = invSrc ? invSrc.invoiceDate : null
      paymentForm.value.invoiceAmount = invSrc ? invSrc.invoiceAmount : null
      paymentForm.value.tailInvoiceStatus = tail ? tail.invoiceStatus : null
      paymentForm.value.tailInvoiceNo = tail ? tail.invoiceNo : null
      paymentForm.value.tailInvoiceDate = tail ? tail.invoiceDate : null
      paymentForm.value.tailInvoiceAmount = tail ? tail.invoiceAmount : null
    })
    .catch(err => {
      proxy.$modal.msgError('到账信息加载失败：' + (err.message || err))
      paymentOpen.value = false
    })
    .finally(() => { paymentLoading.value = false })
}

/** 保存到账信息 */
function savePaymentData() {
  paymentSaving.value = true
  const payload = {
    projectId: editProjectId.value,
    remark: paymentForm.value.remark
  }
  const invoiceMode = paymentForm.value.invoiceMode

  const hasPrepayInvoice = paymentForm.value.invoiceNo || paymentForm.value.invoiceDate
    || (paymentForm.value.invoiceAmount != null && paymentForm.value.invoiceAmount > 0)
    || isVoidedInvoice(paymentForm.value.invoiceStatus)
  if (paymentForm.value.prepayAmount != null || paymentForm.value.prepayDate || hasPrepayInvoice) {
    payload.prepay = {
      amount: paymentForm.value.prepayAmount,
      payTime: paymentForm.value.prepayDate,
      payUnit: paymentForm.value.payUnit,
      payMethod: paymentForm.value.prepayMethod,
      invoiceStatus: paymentForm.value.invoiceStatus,
      invoiceNo: paymentForm.value.invoiceNo,
      invoiceDate: paymentForm.value.invoiceDate,
      invoiceAmount: paymentForm.value.invoiceAmount
    }
  }

  const hasTailInvoice = invoiceMode === 'split' && (paymentForm.value.tailInvoiceNo || paymentForm.value.tailInvoiceDate
    || (paymentForm.value.tailInvoiceAmount != null && paymentForm.value.tailInvoiceAmount > 0)
    || isVoidedInvoice(paymentForm.value.tailInvoiceStatus))
  if (paymentForm.value.tailAmount != null || paymentForm.value.tailDate || hasTailInvoice) {
    const tail = {
      amount: paymentForm.value.tailAmount,
      payTime: paymentForm.value.tailDate,
      payUnit: paymentForm.value.payUnit,
      payMethod: paymentForm.value.tailMethod
    }
    if (invoiceMode === 'split') {
      tail.invoiceStatus = paymentForm.value.tailInvoiceStatus
      tail.invoiceNo = paymentForm.value.tailInvoiceNo
      tail.invoiceDate = paymentForm.value.tailInvoiceDate
      tail.invoiceAmount = paymentForm.value.tailInvoiceAmount
    }
    payload.tail = tail
  }

  payload.refunds = paymentForm.value.refunds
    .filter(rf => rf && (rf.amount != null || rf.payTime))
    .map(rf => ({
      amount: rf.amount != null ? Number(rf.amount) : null,
      payTime: rf.payTime || null,
      payMethod: rf.payMethod || null,
      remark: rf.remark || ''
    }))

  savePayment(payload).then(() => {
    proxy.$modal.msgSuccess("保存成功")
    paymentOpen.value = false
    paymentSaving.value = false
    refreshAll(false)
  }).catch(() => {
    paymentSaving.value = false
  })
}

/** 添加退款行 */
function addRefundRow() {
  paymentForm.value.refunds.push({ amount: null, payTime: null, payMethod: null, remark: null })
}

/** 删除退款行 */
function removeRefundRow(index) {
  paymentForm.value.refunds.splice(index, 1)
}

/** 导出 */
function handleExport() {
  proxy.$modal.msgWarning("导出功能暂未实现")
}

/** 加载委托单位去重值 */
function loadDistinctValues() {
  distinctLoading.value = true
  getDistinctValues('client_unit').then(res => {
    clientUnitOptions.value = (res.data || []).filter(Boolean)
  }).catch(() => {}).finally(() => { distinctLoading.value = false })
}

// ============================================================
// ===== 产值统计（页签二）：口径 = 项目办结时间，内外产值不相加 =====
// ============================================================
const OUTPUT_QUICKS = [
   { label: '本月', value: 'month' },
   { label: '本季', value: 'quarter' },
   { label: '本年', value: 'year' },
   { label: '近12个月', value: 'last12' },
   { label: '全部', value: 'all' }
]
const OUTPUT_GROUPS = [
   { label: '不分组（仅合计）', value: 'none' },
   { label: '按月', value: 'month' },
   { label: '按季', value: 'quarter' },
   { label: '按年', value: 'year' }
]
// 三视图切换：项目视图（时间维度）/ 客户视图（按委托单位）/ 负责人视图（按负责人）
const OUTPUT_VIEWS = [
   { label: '项目视图', value: 'project' },
   { label: '客户视图', value: 'client' },
   { label: '负责人视图', value: 'leader' }
]
const OUTPUT_VIEW_HINT = {
   project: '按时间维度汇总（可下钻到项目）',
   client: '按委托单位汇总外部 / 内部产值',
   leader: '按负责人汇总外部 / 内部产值'
}
const outputView = ref('project')
const viewTab = ref('list')
const outputQuick = ref('all')
const outputRange = ref([])
const outputGroupBy = ref('none')
const outputAdvancedVisible = ref(false)
const outputLoading = ref(false)
const outputSummary = ref({})
const outputGroups = ref([])
const outputQuery = ref({ keyword: undefined, clientUnit: undefined, leaderId: undefined, projectCategoryId: undefined })
/** 三视图 → 实际分组维度（项目视图用时间维度，客户/负责人视图固定维度） */
const outputGroupByValue = computed(() => {
   if (outputView.value === 'client') return 'clientUnit'
   if (outputView.value === 'leader') return 'leader'
   return outputGroupBy.value
})
/** 分组表第一列表头（随视图变化） */
const outputGroupLabelText = computed(() => {
   if (outputView.value === 'client') return '委托单位'
   if (outputView.value === 'leader') return '负责人'
   return '分组维度'
})
/** 全量外部产值构成（市场性任务 + 指令性 = 全量，用于对账） */
const outputCompose = computed(() => {
   const normal = Number(outputSummary.value.externalOutput || 0)
   const mandate = Number(outputSummary.value.mandateExternalOutput || 0)
   const total = normal + mandate
   const normalPct = total ? Math.round(normal * 100 / total) : 0
   return { total, normalPct, mandatePct: total ? 100 - normalPct : 0 }
})
const outputDrill = reactive({ open: false, title: '', loading: false, rows: [], total: 0, pageNum: 1, pageSize: 10, drillParams: {} })

function pad2(n) { return String(n).padStart(2, '0') }
function fmtYMD(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d) }
/** 某年某月（1-12）最后一天 */
function lastDayOf(y, m) { return new Date(y, m, 0).getDate() }

/** 快捷区间 → [begin, end]，口径与后端 date_trunc 一致 */
function outputQuickRange(quick) {
   const now = new Date()
   const y = now.getFullYear()
   const m = now.getMonth()
   if (quick === 'month') return [fmtYMD(y, m + 1, 1), fmtYMD(y, m + 1, lastDayOf(y, m + 1))]
   if (quick === 'quarter') {
      const qs = Math.floor(m / 3) * 3 + 1
      return [fmtYMD(y, qs, 1), fmtYMD(y, qs + 2, lastDayOf(y, qs + 2))]
   }
   if (quick === 'year') return [fmtYMD(y, 1, 1), fmtYMD(y, 12, 31)]
   if (quick === 'last12') {
      // 含当月共 12 个自然月：起始 = 当月前推 11 个月。
      // m 是 0-based，直接用 m-11 交给 Date 归一化跨年，避免拼出负数月份（如 2026--2-01）
      const start = new Date(y, m - 11, 1)
      return [fmtYMD(start.getFullYear(), start.getMonth() + 1, 1), fmtYMD(y, m + 1, lastDayOf(y, m + 1))]
   }
   return []
}

/** 组装产值统计查询参数（extra 优先级最高，用于下钻追加分组限制） */
function buildOutputParams(extra) {
   const r = outputRange.value && outputRange.value.length === 2 ? outputRange.value : []
   return {
      groupBy: outputGroupByValue.value,
      begin: r[0],
      end: r[1],
      ...outputQuery.value,
      ...(extra || {})
   }
}

/** 查询产值统计（合计 + 分组明细） */
function getOutputSummary() {
   outputLoading.value = true
   workloadOutputSummary(buildOutputParams()).then(res => {
      const d = res.data || {}
      outputSummary.value = d.summary || {}
      outputGroups.value = d.groups || []
   }).catch(() => {
      outputSummary.value = {}
      outputGroups.value = []
   }).finally(() => { outputLoading.value = false })
}

/** 视图切换（项目 / 客户 / 负责人） */
function setOutputView(v) {
   if (outputView.value === v) return
   outputView.value = v
   getOutputSummary()
}

/** 快捷区间胶囊 */
function setOutputQuick(v) {
   outputQuick.value = v
   outputRange.value = outputQuickRange(v)
   getOutputSummary()
}

/** 手动查询（改日期/筛选条件后） */
function handleOutputQuery() {
   outputQuick.value = 'custom'
   getOutputSummary()
}

/** 重置产值统计 */
function resetOutputQuery() {
   outputQuick.value = 'all'
   outputRange.value = []
   outputView.value = 'project'
   outputGroupBy.value = 'none'
   outputQuery.value = { keyword: undefined, clientUnit: undefined, leaderId: undefined, projectCategoryId: undefined }
   getOutputSummary()
}

/** 分组占比（按各组外部产值绝对值分摊，总额恒 100%） */
function outputShare(row) {
   const total = outputGroups.value.reduce((s, r) => s + Math.abs(Number(r.externalOutput || 0)), 0)
   if (!total) return 0
   return Math.min(100, Math.round(Math.abs(Number(row.externalOutput || 0)) * 100 / total))
}

/** 由分组标签推导日期区间（月/季/年） */
function outputLabelRange(group, label) {
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
function handleOutputDrill(row) {
   const g = outputGroupByValue.value
   if (g === 'none') return
   const extra = {}
   if (g === 'month' || g === 'quarter' || g === 'year') {
      const r = outputLabelRange(g, row.label)
      if (!r) { proxy.$modal.msgWarning('无法解析该分组的时间区间'); return }
      extra.begin = r[0]
      extra.end = r[1]
   } else if (g === 'clientUnit') {
      extra.clientUnit = row.key
   } else if (g === 'leader') {
      extra.leaderId = row.key
   } else if (g === 'category') {
      extra.projectCategoryId = row.key
   }
   outputDrill.title = '产值明细 — ' + (row.label || '')
   outputDrill.pageNum = 1
   outputDrill.rows = []
   outputDrill.total = 0
   outputDrill.drillParams = buildOutputParams(extra)
   outputDrill.open = true
   loadOutputDetail()
}

/** 加载产值明细（下钻弹窗分页） */
function loadOutputDetail() {
   outputDrill.loading = true
   workloadOutputDetail({ pageNum: outputDrill.pageNum, pageSize: outputDrill.pageSize, ...outputDrill.drillParams }).then(res => {
      outputDrill.rows = res.rows || []
      outputDrill.total = Number(res.total) || 0
   }).catch(() => { outputDrill.rows = [] }).finally(() => { outputDrill.loading = false })
}

/** 导出产值明细（按当前口径与筛选，不含分组维度限制） */
function handleOutputExport() {
   const params = buildOutputParams()
   delete params.groupBy
   delete params.pageNum
   delete params.pageSize
   proxy.download('/project/workload/outputExport', params, '产值明细_' + new Date().getTime() + '.xlsx')
}

/** 页签切换：首次进入产值统计时查询 */
function handleViewTabChange(name) {
   if (name !== 'output') return
   getOutputSummary()
   // 「负责人 / 项目类别」下拉的数据源需要预热，否则切到产值统计页签时为空列表。
   // ensureBaseData 自带缓存 + 防并发，重复进入页签不会产生额外请求。
   ensureBaseData().then(base => {
      applyBaseData(base)
   }).catch(() => {})
}

loadColumns()
refreshAll()
// 全局工程编号回填：仅回填输入框，不自动查询（用户点「查询」才生效）
if (searchMemory.projectCode && !queryParams.value.projectCode) {
  queryParams.value.projectCode = searchMemory.projectCode
}
loadDistinctValues()

// 高级筛选「负责人 / 项目类别」下拉的数据源在此预热：ensureBaseData 自带缓存 + 防并发，
// 切到产值统计页签时命中缓存、零额外请求。
// 注意：此前 userOptions 只在「打开结算编辑弹窗」或「切产值统计页签」时才加载，
// 导致默认的「结算录入」页签里「负责人」下拉首次进入为空。
ensureBaseData().then(base => applyBaseData(base)).catch(() => {})

// keep-alive 缓存下切回本页时刷新列表（否则在项目列表删除项目后，本页仍显示旧数据）
onActivated(() => {
  refreshAll(false)
})
</script>

<style scoped>
/* ===== 智能查询面板 ===== */
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
/* 录入胶囊：分组标签/分隔符/警告色 */
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
.entry-capsules { align-items: center; }
.capsule-warn { background: #fdf6ec; color: #e6a23c; border: 1px solid #f5dab1; }
.capsule-warn:hover { background: #faecd8; }
.capsule-warn.active { background: #e6a23c; color: #fff; border-color: #e6a23c; }
.status-capsule em {
  font-style: normal;
  font-weight: 600;
  margin-left: 2px;
}
/* 开票状态单元格：状态标签 + 标记作废勾选 横排 */
.invoice-status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.invoice-status-cell .el-checkbox { margin-right: 0; }

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
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px 24px;
}
.filter-item-label {
  font-size: 12px;
  margin-bottom: 4px;
}

.quick-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.quick-label { font-size: 12px; color: #909399; }
.quick-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(255,255,255,0.07);
  color: #c0c4cc;
  transition: all 0.2s;
  user-select: none;
}
.quick-chip:hover { background: rgba(64,158,255,0.25); color: #409eff; }
.collapse-link {
  margin-left: auto;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  user-select: none;
}
.collapse-link:hover { color: #409eff; }

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

/* ===== 产值列色点 ===== */
.output-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
}
.output-dot.internal { background: #409eff; }
.output-dot.external { background: #e6a23c; }

/* ===== 编辑弹窗：结算金额核对区 ===== */
.settle-check-row {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  background: #f8fafc;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  gap: 20px;
}
.settle-cell { display: inline-flex; align-items: baseline; gap: 8px; flex: 1; }
.settle-label { font-size: 13px; color: #909399; }
.settle-value { font-size: 16px; font-weight: 600; color: #303133; font-variant-numeric: tabular-nums; }
.settle-hint { font-size: 12px; color: #a8abb2; }
.settle-divider { width: 1px; height: 24px; background: #e4e7ed; }
.text-success { color: #67c23a; }
.text-warning { color: #e6a23c; }
.text-danger { color: #f56c6c; }

/* ===== 编辑弹窗：付款信息 / 开票信息（上下分栏） ===== */
.settle-panel {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafbfc;
  padding: 12px 16px 4px;
}
.invoice-mode-row {
  display: flex;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px dashed #e4e7ed;
}
.pay-options-label { font-size: 13px; color: #606266; margin-right: 6px; }
.pay-row { margin-bottom: 0; }
.pay-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.pay-label-advance { color: #409eff; }
.pay-label-tail { color: #67c23a; }
.pay-label-refund { color: #f56c6c; }
/* ===== 退款信息小节（多笔动态列表） ===== */
.refund-section {
  margin-bottom: 4px;
  padding: 8px 12px 4px;
  border-radius: 6px;
  background: #fef6f6;
}
.refund-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
  font-size: 14px;
}
.refund-total {
  font-size: 13px;
  color: #909399;
}
.refund-total-num { color: #f56c6c; font-weight: 600; }

.refund-empty {
  padding: 8px 0 6px;
  font-size: 12px;
  color: #c0c4cc;
}
.refund-del { margin-top: 4px; }
.invoice-group {
  margin-bottom: 12px;
}
.invoice-group-title {
  font-size: 12px;
  color: #909399;
  line-height: 14px;
  margin-bottom: 6px;
  padding-left: 8px;
  border-left: 2px solid #c0c4cc;
}

/* ===== 展开行明细卡 ===== */
.expand-panel {
  padding: 12px 20px 16px;
  background: #fafbfd;
}
.expand-check-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.check-cell { display: inline-flex; align-items: baseline; gap: 8px; }
.check-label { font-size: 12px; color: #909399; }
.check-value { font-size: 15px; font-weight: 600; color: #303133; font-variant-numeric: tabular-nums; }
.check-divider { width: 1px; height: 20px; background: #e4e7ed; }
.expand-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin: 6px 0 8px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
  line-height: 16px;
}
.cell-placeholder { color: #c0c4cc; }
/* ===== 展开明细合计行 ===== */
.expand-summary-row td {
  background: #f5f7fa !important;
  font-weight: 600;
}
.expand-summary-row.external td {
  background: #fdf6ec !important;
  border-top: 2px solid #e6a23c;
}
.expand-summary-row.internal td {
  background: #ecf5ff !important;
  border-top: 2px solid #409eff;
}
.summary-label {
  font-size: 13px;
  font-weight: 600;
}
.summary-label.external { color: #e6a23c; }
.summary-label.internal { color: #409eff; }
.summary-value {
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}
/* ===== 工作量明细单元格辅助文字 ===== */
.cell-sub {
   font-size: 12px;
   color: #909399;
   line-height: 16px;
   margin-top: 2px;
   text-align: center;
}
.cell-sub-inline { font-size: 12px; color: #909399; margin-left: 3px; }
.min-qty-hit { color: #e6a23c; margin-left: 4px; }
.calc-hint { color: #a8abb2; font-variant-numeric: tabular-nums; }
.row-output {
   font-weight: 600;
   font-variant-numeric: tabular-nums;
}
.expand-empty {
  padding: 16px;
  text-align: center;
  color: #909399;
  font-size: 13px;
  background: #fff;
  border: 1px dashed #e4e7ed;
  border-radius: 6px;
}

/* ===== 底部结算核对条 ===== */
.settle-check-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  padding: 10px 20px;
  background: linear-gradient(90deg, #f0f7ff, #f8fafc);
  border: 1px solid #d9ecff;
  border-radius: 8px;
  flex-wrap: wrap;
}
.bar-title {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
  margin-right: 8px;
}
.bar-cell { display: inline-flex; align-items: baseline; gap: 8px; }
.bar-label { font-size: 12px; color: #909399; }
.bar-value { font-size: 16px; font-weight: 600; color: #303133; font-variant-numeric: tabular-nums; }
.bar-divider { width: 1px; height: 20px; background: #d9ecff; }

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
.empty-hint { text-align: center; color: var(--el-text-color-placeholder); font-size: 12px; padding: 12px 0; }
.section-title-internal { color: var(--el-color-primary); font-weight: 600; }
.section-title-external { color: var(--el-color-warning); font-weight: 600; }
.section-output-mini { margin-left: 12px; font-size: 12px; font-weight: 400; color: var(--el-text-color-secondary); }

/* ===== 合并展开箭头到序号列 ===== */
/* 隐藏原生 expand 列箭头（width=1，仅保留其展开行内容渲染能力） */
:deep(.expand-hidden-col .cell) {
  padding: 0 !important;
}
:deep(.expand-hidden-col .el-table__expand-icon) {
  display: none;
}
.seq-expand-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
/* 展开热区：原生小三角只有 14px，稍偏就落在单元格 padding 上没反应
   ⇒ 撑成 26×26 的可点方块并加 hover 反馈（负外边距抵消视觉位移，不影响行高） */
.seq-expand-icon {
  cursor: pointer;
  color: #909399;
  font-size: 16px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin: -5px 0 -5px -5px;
  transition: color .2s, background-color .2s;
}
.seq-expand-icon:hover {
  color: #409eff;
  background-color: rgba(64, 158, 255, .1);
}
.seq-expand-icon.expanded {
  color: #409eff;
}
.seq-num {
  color: #606266;
}

/* ===== 工作量列：数值本身悬浮显示明细 ===== */
.wl-hoverable {
  cursor: help;
  border-bottom: 1px dashed #c0c4cc;
}
/* 悬浮明细浮层 */
.wl-tip {
  min-width: 240px;
  font-size: 12px;
  line-height: 1.7;
  color: #303133;
}
.wl-tip-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  font-size: 13px;
  color: #303133;
  padding-bottom: 6px;
  margin-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
}
.wl-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.wl-dot.internal { background: #409eff; }
.wl-dot.external { background: #e6a23c; }
.wl-tip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 1px dashed #ebeef5;
  color: #909399;
  font-size: 12px;
}
.wl-tip-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.wl-tip-cat {
  flex: 1;
  color: #606266;
}
.wl-tip-price {
  width: 110px;
  text-align: right;
  color: #909399;
  white-space: nowrap;
}
.wl-tip-val {
  width: 96px;
  text-align: right;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
}
.wl-tip-val em {
  font-style: normal;
  font-weight: 400;
  color: #909399;
}

/* ===== 产值统计页签 ===== */
.settlement-tabs :deep(.el-tabs__header) { margin-bottom: 12px; }
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
/* 日期区间控件固定宽度（EP 的 .el-input__wrapper 自带 flex-grow:1 且挂在控件根节点上，
   作为 flex 行直接子元素会被拉伸吃满整行；只写 width 无效），必须 :deep() 命中。 */
.search-bar-row :deep(.sum-range-picker) {
   flex: 0 1 auto;
   width: 480px;
   min-width: 240px;
}

/* ===== 指令性任务 & 构成条 ===== */
.text-mandate { color: #e6a23c; }
.sum-metric-sub { font-size: 12px; color: #909399; margin-top: 4px; }
.sum-metric-mandate { border-left: 3px solid #e6a23c; }
.output-view-hint { font-size: 12px; color: #909399; }
.output-compose {
  margin: 0 0 14px;
  padding: 12px 14px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}
.output-compose-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}
.output-compose-total { font-weight: 600; color: #303133; }
.output-compose-bar {
  display: flex;
  height: 22px;
  border-radius: 6px;
  overflow: hidden;
  background: #ebeef5;
}
.compose-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  transition: width 0.4s ease;
  white-space: nowrap;
  overflow: hidden;
}
.compose-normal { background: #409eff; }
.compose-mandate { background: #e6a23c; }
.output-compose-legend {
  display: flex;
  gap: 20px;
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}
.output-compose-legend .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.dot-normal { background: #409eff; }
.dot-mandate { background: #e6a23c; }
</style>
