<template>
   <div class="app-container">
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
                  <el-select v-model="queryParams.clientUnit" filterable clearable placeholder="全部单位" style="width:100%" @change="handleQuery">
                     <el-option v-for="u in clientUnitOptions" :key="u" :label="u" :value="u" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程地点</div>
                  <el-input v-model="queryParams.projectLocation" placeholder="工程地点" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程项目</div>
                  <el-input v-model="queryParams.engineeringProject" placeholder="工程项目" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">负责人</div>
                  <el-select v-model="queryParams.leaderId" filterable clearable placeholder="全部负责人" style="width:100%" @change="handleQuery">
                     <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">联系人</div>
                  <el-input v-model="queryParams.contactName" placeholder="联系人" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">联系电话</div>
                  <el-input v-model="queryParams.contactPhone" placeholder="联系电话" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">安排日期</div>
                  <el-date-picker v-model="assignDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onAssignDateChange" />
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
         <el-col :span="1.5">
            <el-button type="warning" size="small" plain icon="Download" @click="handleExport" v-hasPermi="['project:settlement:export']">导出</el-button>
         </el-col>
         <el-col :span="1.5" style="margin-left:auto">
            <right-toolbar v-model:showSearch="showSearch" :columns="columns" storage-key="settlement-list-columns" @queryTable="getList" />
         </el-col>
      </el-row>

      <el-table
         v-loading="loading"
         :data="treeData"
         row-key="id"
         stripe border
         highlight-current-row
         @current-change="handleCurrentChange"
         @expand-change="handleExpandChange"
      >
         <!-- 展开行明细卡列（默认收起，点击箭头懒加载明细） -->
         <el-table-column type="expand" width="46">
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
                              <div v-if="!s.row._isSummary && minQtyHit(s.row)" class="cell-sub min-qty-hit">按起步量取整：{{ s.row.workload }} → {{ ceilWorkload(s.row) }}</div>
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
                              <el-tag v-if="s.row.invoiceStatus === '已开'" type="success" size="small">已开</el-tag>
                              <el-tag v-else-if="s.row.invoiceStatus === '已作废'" type="danger" size="small">已作废</el-tag>
                              <el-tag v-else-if="s.row.invoiceStatus === '未开'" type="info" size="small">未开</el-tag>
                              <span v-else class="cell-placeholder">-</span>
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

         <el-table-column label="序号" align="center" width="60">
            <template #default="scope">
               <span>{{ scope.$index + 1 }}</span>
            </template>
         </el-table-column>
         <el-table-column v-for="col in visibleColumns" :key="col.key" :label="col.label" align="center" :prop="col.prop" :show-overflow-tooltip="true" :min-width="colWidth(col)">
            <template #default="scope">
               <!-- 工程编号：加粗 -->
               <span v-if="col.key === 'projectCode' && scope.row.projectCode" style="font-weight:bold">{{ scope.row.projectCode }}</span>
               <!-- 开票状态：标签 -->
               <template v-else-if="col.key === 'invoiceStatus'">
                  <el-tag v-if="scope.row.invoiceStatus === '未开'" type="info">未开</el-tag>
                  <el-tag v-else-if="scope.row.invoiceStatus === '已开'" type="success">已开</el-tag>
                  <el-tag v-else-if="scope.row.invoiceStatus === '已作废'" type="danger">已作废</el-tag>
               </template>
               <!-- 金额字段 -->
               <span v-else-if="col.type === 'money'"><span v-if="scope.row[col.prop] != null">{{ formatMoney(scope.row[col.prop]) }}</span></span>
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
         <el-table-column v-if="checkPermi(['project:settlement:edit'])" label="操作" align="center" width="80" fixed="right">
            <template #default="scope">
               <el-button
                  v-if="scope.row.projectId"
                  link type="primary"
                  @click="handleEdit(scope.row)"
               >编辑</el-button>
            </template>
         </el-table-column>
      </el-table>

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

      <!-- 编辑结算弹窗 -->
      <el-dialog 
         :title="'费用结算 — ' + editProjectCode" 
         :model-value="editOpen" 
         @update:model-value="editOpen = $event" 
         width="80%" 
         append-to-body 
         destroy-on-close
         :close-on-click-modal="false"
      >
         <el-form ref="settlementRef" :model="editForm" label-width="100px">
            <!-- ① 工程信息（只读） -->
            <el-divider content-position="left">工程信息</el-divider>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="工程编号">
                     <el-input :model-value="editProjectCode" disabled />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="委托单位">
                     <el-input :model-value="editClientUnit" disabled />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="工程地点">
                     <el-input :model-value="editProjectLocation" disabled />
                  </el-form-item>
               </el-col>
            </el-row>

            <!-- ② 工作量明细（先算产值） -->
            <el-divider content-position="left">
               工作量明细
               <el-button type="primary" link icon="Plus" @click="addWorkloadRow" style="margin-left:10px">添加行</el-button>
            </el-divider>
            <el-table :data="editForm.workloads" border :row-class-name="workloadRowClass">
               <el-table-column label="负责人" align="center" min-width="110">
                  <template #default="scope">
                     <el-select v-model="scope.row.userId" filterable placeholder="选择负责人" style="width:100%">
                        <el-option v-for="u in leaderOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </template>
               </el-table-column>
               <el-table-column label="项目类别" align="center" min-width="140">
                  <template #default="scope">
                     <el-tree-select
                        v-model="scope.row.categoryId"
                        :data="categoryOptions"
                        :props="{ value: 'id', label: 'name', children: 'children' }"
                        value-key="id"
                        placeholder="类别（小类）"
                        :check-strictly="false"
                        style="width:100%"
                        @change="(val) => onCategoryChange(val, scope.row)"
                     />
                  </template>
               </el-table-column>
               <el-table-column label="类型" align="center" width="72">
                  <template #default="scope">
                     <el-tag v-if="scope.row.billingType === 'internal'" type="info" size="small" effect="dark">内部</el-tag>
                     <el-tag v-else-if="scope.row.billingType === 'external'" type="warning" size="small" effect="dark">外部</el-tag>
                     <span v-else class="cell-placeholder">—</span>
                  </template>
               </el-table-column>
               <el-table-column label="计费方式" align="center" min-width="180">
                  <template #default="scope">
                     <el-select
                        v-model="scope.row.billingKey"
                        placeholder="先选类别"
                        style="width:100%"
                        :disabled="!scope.row.categoryId"
                        @change="(val) => onBillingChange(val, scope.row)"
                     >
                        <el-option-group v-for="g in billingGroups(scope.row.categoryId)" :key="g.label" :label="g.label">
                           <el-option v-for="o in g.options" :key="o.value" :label="o.label" :value="o.value" />
                        </el-option-group>
                     </el-select>
                  </template>
               </el-table-column>
               <el-table-column label="工作量" align="center" width="150">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.workload" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                     <div v-if="scope.row.priceUnit" class="cell-sub">
                        {{ scope.row.priceUnit }}
                        <span v-if="minQtyHit(scope.row)" class="min-qty-hit">按起步量取整：{{ scope.row.workload }} → {{ ceilWorkload(scope.row) }}</span>
                     </div>
                  </template>
               </el-table-column>
               <el-table-column label="单价（元）" align="center" width="140">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.unitPrice" :min="0" :precision="2" controls-position="right" style="width:100%" @change="onUnitPriceChange(scope.row)" />
                     <div v-if="scope.row.priceSource && scope.row.unitPrice != null" class="cell-sub">
                        <el-tag :type="priceSourceMeta(scope.row.priceSource).type" size="small" effect="plain">{{ priceSourceMeta(scope.row.priceSource).text }}</el-tag>
                     </div>
                  </template>
               </el-table-column>
               <el-table-column label="产值" align="center" min-width="140">
                  <template #default="scope">
                     <span v-if="scope.row.output != null && scope.row.billingType" :class="['output-dot', scope.row.billingType]"></span>
                     <span class="row-output">{{ scope.row.output != null ? formatMoney(scope.row.output) : '-' }}</span>
                     <div v-if="calcExpr(scope.row)" class="cell-sub calc-hint">{{ calcExpr(scope.row) }}</div>
                  </template>
               </el-table-column>
               <el-table-column label="操作" align="center" width="60">
                  <template #default="scope">
                     <el-button link type="danger" icon="Delete" @click="removeWorkloadRow(scope.$index)" />
                  </template>
               </el-table-column>
            </el-table>

            <!-- 产值统计条（紧凑单行） -->
            <div class="output-summary-bar">
               <span class="sum-inline sum-internal">
                  <i class="sum-dot" />内部产值
                  <b>{{ formatMoney(internalOutputTotal) }}</b>
                  <small>{{ internalRowCount }} 行</small>
               </span>
               <span class="sum-sep" />
               <span class="sum-inline sum-external">
                  <i class="sum-dot" />外部产值
                  <b>{{ formatMoney(externalOutputTotal) }}</b>
                  <small>{{ externalRowCount }} 行</small>
               </span>
               <span class="sum-sep" />
               <span class="sum-inline sum-total">
                  <i class="sum-dot" />结算总额
                  <b>{{ formatMoney(externalOutputTotal) }}</b>
                  <small>= 外部合计</small>
               </span>
            </div>

            <!-- ③ 付款信息 -->
            <el-divider content-position="left">付款信息</el-divider>
            <div class="settle-panel">
               <!-- 付款单位（预付款与尾款共用，与下方三列对齐） -->
               <el-row :gutter="20">
                  <el-col :span="8">
                     <el-form-item label="付款单位">
                        <el-select v-model="editForm.payUnit" filterable clearable allow-create placeholder="请选择或输入付款单位" style="width: 100%">
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
                           <el-input-number v-model="editForm.prepayAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="金额" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="付款时间">
                           <el-date-picker v-model="editForm.prepayDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="付款方式">
                           <el-select v-model="editForm.prepayMethod" clearable placeholder="选择" style="width:100%">
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
                           <el-input-number v-model="editForm.tailAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="金额" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="尾款时间">
                           <el-date-picker v-model="editForm.tailDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="付款方式">
                           <el-select v-model="editForm.tailMethod" clearable placeholder="选择" style="width:100%">
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
                  <div v-for="(rf, idx) in editForm.refunds" :key="idx" class="pay-row refund-row">
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
                  <div v-if="!editForm.refunds.length" class="refund-empty">暂无退款记录，点击「添加退款」录入</div>
               </div>
               <!-- 备注 -->
               <el-form-item label="备注">
                  <el-input v-model="editForm.remark" placeholder="备注" maxlength="500" />
               </el-form-item>
            </div>

            <!-- ④ 结算金额核对区（结算总额=外部产值，只读自动） -->
            <el-divider content-position="left">结算金额</el-divider>
            <div class="settle-check-row">
               <div class="settle-cell">
                  <span class="settle-label">结算总额</span>
                  <span class="settle-value">{{ formatMoney(externalOutputTotal) }}</span>
                  <span class="settle-hint">（自动 = 外部产值合计，不可改）</span>
               </div>
               <div class="settle-divider" />
               <div class="settle-cell">
                  <span class="settle-label">已收</span>
                  <span class="settle-value">{{ formatMoney(receivedAmount) }}</span>
                  <span class="settle-hint">（预付款 + 尾款 − 退款，自动汇总）</span>
               </div>
               <div class="settle-divider" />
               <div class="settle-cell" v-if="refundTotal > 0">
                  <span class="settle-label">退款合计</span>
                  <span class="settle-value" style="color:var(--el-color-danger)">-{{ formatMoney(refundTotal) }}</span>
               </div>
               <div class="settle-divider" v-if="refundTotal > 0" />
               <div class="settle-cell">
                  <span class="settle-label">待收差额</span>
                  <span class="settle-value" :class="balanceTextClass">{{ settleStatus === 'settled' ? '¥0.00' : formatMoney(Math.abs(balanceAmount)) }}</span>
                  <el-tag :type="settleTagType" size="small" effect="light" style="margin-left:8px">{{ settleTagText }}</el-tag>
               </div>
            </div>

            <!-- ⑤ 开票信息 -->
            <el-divider content-position="left">开票信息</el-divider>
            <div class="settle-panel">
               <!-- 开票方式 -->
               <div class="invoice-mode-row">
                  <span class="pay-options-label">开票方式：</span>
                  <el-radio-group v-model="editForm.invoiceMode">
                     <el-radio-button value="unified">统一开票</el-radio-button>
                     <el-radio-button value="split">分笔开票</el-radio-button>
                  </el-radio-group>
               </div>
               <!-- 统一开票：一组发票 -->
               <el-row v-if="editForm.invoiceMode === 'unified'" :gutter="20">
                  <el-col :span="6">
                     <el-form-item label="开票状态">
                        <el-select v-model="editForm.invoiceStatus" placeholder="开票状态" clearable style="width:100%">
                           <el-option v-for="s in invoiceStatusOptions" :key="s" :label="s" :value="s" />
                        </el-select>
                     </el-form-item>
                  </el-col>
                  <el-col :span="6">
                     <el-form-item label="发票号码">
                        <el-input v-model="editForm.invoiceNo" placeholder="发票号码" maxlength="100" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="6">
                     <el-form-item label="开票日期">
                        <el-date-picker v-model="editForm.invoiceDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="6">
                     <el-form-item label="开票金额">
                        <el-input-number v-model="editForm.invoiceAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="开票金额" />
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
                              <el-select v-model="editForm.invoiceStatus" placeholder="开票状态" clearable style="width:100%">
                                 <el-option v-for="s in invoiceStatusOptions" :key="s" :label="s" :value="s" />
                              </el-select>
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="发票号码">
                              <el-input v-model="editForm.invoiceNo" placeholder="发票号码" maxlength="100" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票日期">
                              <el-date-picker v-model="editForm.invoiceDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票金额">
                              <el-input-number v-model="editForm.invoiceAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="开票金额" />
                           </el-form-item>
                        </el-col>
                     </el-row>
                  </div>
                  <div class="invoice-group">
                     <div class="invoice-group-title">尾款发票</div>
                     <el-row :gutter="20">
                        <el-col :span="6">
                           <el-form-item label="开票状态">
                              <el-select v-model="editForm.tailInvoiceStatus" placeholder="开票状态" clearable style="width:100%">
                                 <el-option v-for="s in invoiceStatusOptions" :key="s" :label="s" :value="s" />
                              </el-select>
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="发票号码">
                              <el-input v-model="editForm.tailInvoiceNo" placeholder="发票号码" maxlength="100" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票日期">
                              <el-date-picker v-model="editForm.tailInvoiceDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%" />
                           </el-form-item>
                        </el-col>
                        <el-col :span="6">
                           <el-form-item label="开票金额">
                              <el-input-number v-model="editForm.tailInvoiceAmount" :min="0" :precision="2" controls-position="right" style="width:100%" placeholder="开票金额" />
                           </el-form-item>
                        </el-col>
                     </el-row>
                  </div>
               </template>
            </div>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitSettlement" :loading="saveLoading">保 存</el-button>
               <el-button @click="editOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Settlement">
import { ElMessageBox } from 'element-plus'
import { treeListSettlement, getSettlementDetail, saveSettlement, getSettlementColumns } from "@/api/project/settlement"
import { categoryTreeselectFull, listBilling } from "@/api/project/category"
import { listUserOptions } from "@/api/system/user"
import { getDistinctValues } from "@/api/project/project"
import { checkPermi } from "@/utils/permission"
import useSearchMemoryStore from "@/store/modules/searchMemory"
import cache from '@/plugins/cache'

const { proxy } = getCurrentInstance()
const searchMemory = useSearchMemoryStore()

const treeData = ref([])
const loading = ref(false)
const showSearch = ref(true)
/** 当前选中行（底部结算核对条用） */
const currentRow = ref(null)
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
  { key: 'engineeringProject', label: '工程项目', type: 'text', group: 'business', prop: 'engineeringProject', defaultVisible: false },
  { key: 'leaderNames', label: '负责人', type: 'text', group: 'business', prop: 'leaderNames', defaultVisible: false },
  { key: 'userName', label: '人员', type: 'text', group: 'business', prop: 'userName', defaultVisible: false },
  { key: 'categoryName', label: '项目类别', type: 'text', group: 'business', prop: 'categoryName', defaultVisible: false },
  { key: 'workload', label: '工作量', type: 'number', group: 'business', prop: 'workload', defaultVisible: true },
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

const selectedStatuses = ref(['closed', 'archived'])
const editOpen = ref(false)
const saveLoading = ref(false)
const editProjectCode = ref("")
const editClientUnit = ref("")
const editProjectLocation = ref("")
const editProjectId = ref(null)
const userOptions = ref([])
const leaderOptions = ref([])   // 当前项目负责人（编辑弹窗里用）
const categoryOptions = ref([])
const contractPriceMap = ref({})
const clientUnitOptions = ref([])
/** 全量计费方式：categoryId -> [{billingType, billingCategory, unitPrice, priceUnit, minQuantity}] */
const billingMap = ref({})

// 新增：智能查询面板
const assignDateRange = ref([])
const advancedVisible = ref(false)

const data = reactive({
  queryParams: {
    keyword: undefined,
    projectCode: undefined,
    clientUnit: undefined,
    projectLocation: undefined,
    engineeringProject: undefined,
    leaderId: undefined,
    contactName: undefined,
    contactPhone: undefined,
    assignDateBegin: undefined,
    assignDateEnd: undefined
  },
  editForm: {
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
    tailInvoiceAmount: null,
    workloads: []
  }
})

const { queryParams, editForm } = toRefs(data)

// 内部产值合计（按行 billingType 分组求和）
const internalOutputTotal = computed(() => {
  let sum = 0
  editForm.value.workloads.forEach(row => {
    if (row.billingType === 'internal' && row.output) sum += Number(row.output)
  })
  return sum
})

// 外部产值合计（= 结算总额）
const externalOutputTotal = computed(() => {
  let sum = 0
  editForm.value.workloads.forEach(row => {
    if (row.billingType === 'external' && row.output) sum += Number(row.output)
  })
  return sum
})

// 内部计费行数
const internalRowCount = computed(() => editForm.value.workloads.filter(r => r.billingType === 'internal').length)
// 外部计费行数
const externalRowCount = computed(() => editForm.value.workloads.filter(r => r.billingType === 'external').length)

// 退款合计（多笔求和）
const refundTotal = computed(() => {
  return editForm.value.refunds.reduce((s, r) => s + (Number(r.amount) || 0), 0)
})

// 已收 = 预付款 + 尾款 - 退款合计（实时联动）
const receivedAmount = computed(() => {
  const a = Number(editForm.value.prepayAmount) || 0
  const b = Number(editForm.value.tailAmount) || 0
  return a + b - refundTotal.value
})

// 待收差额 = 结算总额 - 已收
const balanceAmount = computed(() => externalOutputTotal.value - receivedAmount.value)

// 结算状态：settled 已结清 / unsettled 未结清 / overpaid 超额
const settleStatus = computed(() => {
  const b = balanceAmount.value
  if (Math.abs(b) < 0.01) return 'settled'
  return b > 0 ? 'unsettled' : 'overpaid'
})

const settleTagText = computed(() => settleStatus.value === 'settled' ? '已结清' : (settleStatus.value === 'unsettled' ? '未结清' : '超额'))
const settleTagType = computed(() => settleStatus.value === 'settled' ? 'success' : (settleStatus.value === 'unsettled' ? 'warning' : 'danger'))
const balanceTextClass = computed(() => settleStatus.value === 'settled' ? 'text-success' : (settleStatus.value === 'unsettled' ? 'text-warning' : 'text-danger'))

// 付款方式 / 开票状态选项
const payMethodOptions = ['转账', '现金', '支票', '其他']
const invoiceStatusOptions = ['未开', '已开', '已作废']

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

/** 单价来源徽标 */
function priceSourceMeta(source) {
  if (source === 'contract') return { text: '合同价', type: 'success' }
  if (source === 'manual') return { text: '手动', type: 'danger' }
  return { text: '类别价', type: 'info' }
}

/** 类别的计费方式下拉分组（内部/外部） */
function billingGroups(categoryId) {
  const list = (billingMap.value[categoryId] || [])
  const build = type => ({
    label: type === 'internal' ? '内部' : '外部',
    options: list
      .filter(b => b.billingType === type)
      .map(b => ({
        value: `${b.billingType}#${b.billingCategory}`,
        label: `${b.billingCategory}（¥${formatMoney(b.unitPrice)}/${b.priceUnit || '项'}${Number(b.minQuantity) > 1 ? `，起步${b.minQuantity}` : ''}）`,
        raw: b
      }))
  })
  return [build('internal'), build('external')].filter(g => g.options.length)
}

/** 选择类别后重置计费方式（仅一个选项时自动选中） */
function onCategoryChange(categoryId, row) {
  row.billingKey = null
  row.billingType = null
  row.billingCategory = null
  row.priceUnit = null
  row.minQuantity = null
  row.unitPrice = null
  row.priceSource = null
  calcRow(row)
  const groups = billingGroups(categoryId)
  if (groups.length === 1 && groups[0].options.length === 1) {
    onBillingChange(groups[0].options[0].value, row)
  }
}

/** 选择计费方式后带出 单价/单位/起步量（外部优先合同价） */
function onBillingChange(billingKey, row) {
  const groups = billingGroups(row.categoryId)
  let opt = null
  groups.forEach(g => g.options.forEach(o => { if (o.value === billingKey) opt = o }))
  if (!opt || !opt.raw) return
  const b = opt.raw
  row.billingType = b.billingType
  row.billingCategory = b.billingCategory
  row.priceUnit = b.priceUnit
  row.minQuantity = b.minQuantity
  // 外部计费方式：有合同价优先合同价
  const cp = contractPriceMap.value[row.categoryId]
  if (b.billingType === 'external' && cp && cp.price != null) {
    row.unitPrice = cp.price
    row.priceSource = 'contract'
  } else {
    row.unitPrice = b.unitPrice
    row.priceSource = 'dict'
  }
  calcRow(row)
}

/** 手动修改单价：标记来源为手动 */
function onUnitPriceChange(row) {
  if (row.unitPrice != null) {
    row.priceSource = 'manual'
  }
  calcRow(row)
}

/** 查询树形列表 */
function getList() {
  loading.value = true
  const params = { ...queryParams.value }
  params.projectStatus = selectedStatuses.value.join(',')
  treeListSettlement(params).then(response => {
    treeData.value = response.data || []
    // 数据刷新后清理展开明细与选中行，避免旧数据残留
    Object.keys(expandDetails).forEach(k => delete expandDetails[k])
    currentRow.value = null
    loading.value = false
  })
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

/** 展开/收起回调：首次展开时懒加载明细 */
function handleExpandChange(row, expandedRows) {
  if (expandedRows.includes(row) && !expandDetails[row.projectId]) {
    loadExpandDetail(row)
  }
}

/** 加载展开明细（工作量 + 付款记录） */
function loadExpandDetail(row) {
  expandDetails[row.projectId] = { loading: true, workloads: [], payments: [] }
  getSettlementDetail(row.projectId).then(res => {
    const detail = res.data || {}
    expandDetails[row.projectId] = {
      loading: false,
      workloads: (() => {
        const sorted = (detail.workloads || [])
          .map(w => ({
            ...w,
            output: w.internalOutput != null ? w.internalOutput : (w.externalOutput != null ? w.externalOutput : null)
          }))
          .sort((a, b) => {
            // 外部在前、内部在后
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
    expandDetails[row.projectId] = { loading: false, workloads: [], payments: [] }
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
  getList()
}

/** 状态筛选变更 */
function onStatusChange(val) {
  getList()
}

function handleQuery() {
  // 同步工程编号到全局记忆（含清空）
  searchMemory.setProjectCode(queryParams.value.projectCode)
  getList()
}

function resetQuery() {
  assignDateRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.projectCode = undefined
  queryParams.value.clientUnit = undefined
  queryParams.value.projectLocation = undefined
  queryParams.value.engineeringProject = undefined
  queryParams.value.leaderId = undefined
  queryParams.value.contactName = undefined
  queryParams.value.contactPhone = undefined
  queryParams.value.assignDateBegin = undefined
  queryParams.value.assignDateEnd = undefined
  handleQuery()
}

/** 安排日期变更 */
function onAssignDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.assignDateBegin = val[0]
    queryParams.value.assignDateEnd = val[1]
  } else {
    queryParams.value.assignDateBegin = undefined
    queryParams.value.assignDateEnd = undefined
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
    assignDateRange.value = [begin, end]
    onAssignDateChange([begin, end])
  }
}

/** 编辑结算 */
function handleEdit(row) {
  editProjectId.value = row.projectId
  editProjectCode.value = row.projectCode
  editClientUnit.value = row.clientUnit || ""
  editProjectLocation.value = row.projectLocation || ""

  // 加载基础数据
  Promise.all([categoryTreeselectFull(), listUserOptions({ pageNum: 1, pageSize: 1000 }), getSettlementDetail(row.projectId), listBilling()])
    .then(([catRes, userRes, detailRes, billingRes]) => {
      categoryOptions.value = catRes.data
      userOptions.value = userRes.rows || []

      // 计费方式映射：categoryId -> 启用中的计费方式列表
      const bMap = {}
      ;(billingRes.data || []).forEach(b => {
        if (b.status === '1') return // 停用的不参与
        if (!bMap[b.categoryId]) bMap[b.categoryId] = []
        bMap[b.categoryId].push(b)
      })
      billingMap.value = bMap

      const detail = detailRes.data
      const payments = detail.payments || []
      const workloads = detail.workloads || []

      // 解析合同单价映射（categoryId → {price}），用于自动带出外部单价
      const contractPrices = detail.contractPrices || []
      const cpMap = {}
      contractPrices.forEach(cp => {
        if (cp.categoryId) cpMap[cp.categoryId] = cp
      })
      contractPriceMap.value = cpMap

      // 填充付款信息
      const prepay = payments.find(p => p.paymentType === "advance")
      const tail = payments.find(p => p.paymentType === "final")
      editForm.value.prepayAmount = prepay ? prepay.amount : null
      editForm.value.prepayDate = prepay ? prepay.payTime : null
      editForm.value.payUnit = prepay ? prepay.payUnit : (tail ? tail.payUnit : null)
      editForm.value.prepayMethod = prepay ? prepay.payMethod : null
      editForm.value.tailMethod = tail ? tail.payMethod : null
      editForm.value.tailAmount = tail ? tail.amount : null
      editForm.value.tailDate = tail ? tail.payTime : null
      editForm.value.remark = prepay ? prepay.remark : (tail ? tail.remark : null)

      // 退款信息回填（多笔，按时间升序；兼容旧接口无 refunds 字段时从 payments 过滤）
      const refunds = detail.refunds || payments.filter(p => p.paymentType === 'refund')
      editForm.value.refunds = refunds.map(r => ({
        amount: r.amount != null ? Number(r.amount) : null,
        payTime: r.payTime || null,
        payMethod: r.payMethod || null,
        remark: r.remark || null
      }))

      // 开票信息：尾款存在发票数据 → 分笔开票；否则统一开票（发票挂预付款，无预付款取尾款）
      const tailHasInvoice = tail && (tail.invoiceStatus || tail.invoiceNo || tail.invoiceDate || tail.invoiceAmount != null)
      editForm.value.invoiceMode = tailHasInvoice ? 'split' : 'unified'
      const invSrc = prepay || tail
      editForm.value.invoiceStatus = invSrc ? invSrc.invoiceStatus : null
      editForm.value.invoiceNo = invSrc ? invSrc.invoiceNo : null
      editForm.value.invoiceDate = invSrc ? invSrc.invoiceDate : null
      editForm.value.invoiceAmount = invSrc ? invSrc.invoiceAmount : null
      // 尾款发票（仅分笔开票时使用）
      editForm.value.tailInvoiceStatus = tail ? tail.invoiceStatus : null
      editForm.value.tailInvoiceNo = tail ? tail.invoiceNo : null
      editForm.value.tailInvoiceDate = tail ? tail.invoiceDate : null
      editForm.value.tailInvoiceAmount = tail ? tail.invoiceAmount : null

      // 填充工作量（新计费模型：一行一种计费方式）
      editForm.value.workloads = workloads.map(w => {
        const output = w.internalOutput != null ? w.internalOutput : w.externalOutput
        return {
          workloadId: w.id,
          userId: w.userId,
          categoryId: w.categoryId,
          billingKey: w.billingType ? `${w.billingType}#${w.billingCategory}` : null,
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
          output: output != null ? Number(output) : null
        }
      })

      // 负责人下拉：项目负责人 + 已有工作量行的负责人（Number 归一化，防 Long/字符串 类型失配）
      const leaderIdSet = new Set((detailRes.data.leaderIds || []).map(id => Number(id)))
      editForm.value.workloads.forEach(w => { if (w.userId != null) leaderIdSet.add(Number(w.userId)) })
      let filtered = userOptions.value.filter(u => leaderIdSet.has(Number(u.userId)))
      // 兜底：项目未关联负责人时回退显示全部用户，保证下拉可用
      leaderOptions.value = filtered.length > 0 ? filtered : userOptions.value

      editOpen.value = true
    })
}

/** 行样式：内部行淡蓝底，外部行淡橙底 */
function workloadRowClass({ row }) {
  if (row.billingType === 'internal') return 'wl-row-internal'
  if (row.billingType === 'external') return 'wl-row-external'
  return ''
}

/** 添加工作量行 */
function addWorkloadRow() {
  editForm.value.workloads.push({
    workloadId: null,
    userId: null,
    categoryId: null,
    billingKey: null,
    billingType: null,
    billingCategory: null,
    priceUnit: null,
    minQuantity: null,
    unitPrice: null,
    priceSource: null,
    workload: null,
    internalPrice: null,
    externalPrice: null,
    internalOutput: null,
    externalOutput: null,
    output: null
  })
}

/** 删除工作量行 */
function removeWorkloadRow(index) {
  editForm.value.workloads.splice(index, 1)
}

/** 添加退款行 */
function addRefundRow() {
  editForm.value.refunds.push({ amount: null, payTime: null, payMethod: null, remark: null })
}

/** 删除退款行 */
function removeRefundRow(index) {
  editForm.value.refunds.splice(index, 1)
}

/** 提交结算：已收 ≠ 结算总额时先弹确认 */
function submitSettlement() {
  const received = receivedAmount.value
  const total = externalOutputTotal.value
  if (Math.abs(received - total) > 0.01) {
    const balance = total - received
    const over = balance < 0
    const diff = Math.abs(balance)
    const title = over ? "超额收款提示" : "未结清提示"
    // 三要素齐全：应收金额 / 已收金额 / 差额（未收 or 超出），差额红色强调
    const msg =
      `应收金额：<b>${formatMoney(total)}</b><br/>` +
      `已收金额：<b>${formatMoney(received)}</b><br/>` +
      `${over ? "超出金额" : "未收金额"}：<b style="color:#f56c6c">${formatMoney(diff)}</b>`
    ElMessageBox.confirm(msg, title, {
      confirmButtonText: "仍要保存",
      cancelButtonText: "返回修改",
      type: "warning",
      dangerouslyUseHTMLString: true
    }).then(() => {
      doSaveSettlement()
    }).catch(() => {})
  } else {
    doSaveSettlement()
  }
}

/** 实际保存 */
function doSaveSettlement() {
  saveLoading.value = true
  const payload = {
    projectId: editProjectId.value,
    remark: editForm.value.remark,
    workloads: editForm.value.workloads
  }
  const invoiceMode = editForm.value.invoiceMode

  // 只有金额或日期有值时才提交预付款
  if (editForm.value.prepayAmount != null || editForm.value.prepayDate) {
    payload.prepay = {
      amount: editForm.value.prepayAmount,
      payTime: editForm.value.prepayDate,
      payUnit: editForm.value.payUnit,
      payMethod: editForm.value.prepayMethod,
      invoiceStatus: editForm.value.invoiceStatus,
      invoiceNo: editForm.value.invoiceNo,
      invoiceDate: editForm.value.invoiceDate,
      invoiceAmount: editForm.value.invoiceAmount
    }
  }

  // 只有金额或日期有值时才提交尾款
  if (editForm.value.tailAmount != null || editForm.value.tailDate) {
    const tail = {
      amount: editForm.value.tailAmount,
      payTime: editForm.value.tailDate,
      payUnit: editForm.value.payUnit,
      payMethod: editForm.value.tailMethod
    }
    // 分笔开票：尾款独立发票
    if (invoiceMode === 'split') {
      tail.invoiceStatus = editForm.value.tailInvoiceStatus
      tail.invoiceNo = editForm.value.tailInvoiceNo
      tail.invoiceDate = editForm.value.tailInvoiceDate
      tail.invoiceAmount = editForm.value.tailInvoiceAmount
    }
    payload.tail = tail
  }

  // 退款（多笔，整组替换；金额和时间都为空的行不提交）
  payload.refunds = editForm.value.refunds
    .filter(rf => rf && (rf.amount != null || rf.payTime))
    .map(rf => ({
      amount: rf.amount != null ? Number(rf.amount) : null,
      payTime: rf.payTime || null,
      payMethod: rf.payMethod || null,
      remark: rf.remark || ''
    }))

  saveSettlement(payload).then(() => {
    proxy.$modal.msgSuccess("保存成功")
    editOpen.value = false
    saveLoading.value = false
    getList()
  }).catch(() => {
    saveLoading.value = false
  })
}

/** 导出 */
function handleExport() {
  proxy.$modal.msgWarning("导出功能暂未实现")
}

/** 加载委托单位去重值 */
function loadDistinctValues() {
  getDistinctValues('client_unit').then(res => {
    clientUnitOptions.value = (res.data || []).filter(Boolean)
  }).catch(() => {})
}

loadColumns()
getList()
// 全局工程编号回填：仅回填输入框，不自动查询（用户点「查询」才生效）
if (searchMemory.projectCode && !queryParams.value.projectCode) {
  queryParams.value.projectCode = searchMemory.projectCode
}
loadDistinctValues()
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
  color: #666;
  transition: all 0.2s;
  user-select: none;
}
.status-capsule:hover { background: #e8e8e8; }
.status-capsule.active { background: #409eff; color: #fff; }

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
.quick-label { font-size: 12px; color: #888; }
.quick-chip {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(255,255,255,0.07);
  color: #aaa;
  transition: all 0.2s;
  user-select: none;
}
.quick-chip:hover { background: rgba(64,158,255,0.25); color: #409eff; }
.collapse-link {
  margin-left: auto;
  font-size: 12px;
  color: #666;
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
  font-weight: bold;
  font-family: "JetBrains Mono", Consolas, monospace;
}
.sum-inline small {
  font-size: 11px;
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
.settle-value { font-size: 16px; font-weight: bold; color: #303133; font-family: "JetBrains Mono", Consolas, monospace; }
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
  .refund-total-num { color: #f56c6c; font-weight: 600; }
}
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
.check-value { font-size: 15px; font-weight: bold; color: #303133; font-family: "JetBrains Mono", Consolas, monospace; }
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
  font-weight: 700;
}
.summary-label.external { color: #e6a23c; }
.summary-label.internal { color: #409eff; }
.summary-value {
  font-family: "JetBrains Mono", Consolas, monospace;
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
.calc-hint { color: #a8abb2; font-family: "JetBrains Mono", Consolas, monospace; }
.row-output {
   font-weight: 600;
   font-family: "JetBrains Mono", Consolas, monospace;
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
.bar-value { font-size: 16px; font-weight: bold; color: #303133; font-family: "JetBrains Mono", Consolas, monospace; }
.bar-divider { width: 1px; height: 20px; background: #d9ecff; }
</style>
