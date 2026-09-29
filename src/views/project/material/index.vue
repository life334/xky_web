<template>
   <div class="app-container">
      <!-- Row 1: 全局搜索 -->
      <div class="search-bar-row">
         <div class="search-input-wrapper">
            <el-input v-model="queryParams.keyword" placeholder="搜索工程编号/项目名称/联系人/存档目录..." clearable @keyup.enter="handleQuery" @clear="handleQuery" class="global-search-input">
               <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
         </div>
         <el-button type="primary" size="small" @click="handleQuery">搜索</el-button>
         <el-button size="small" @click="resetQuery">重置</el-button>
      </div>

      <!-- Row 2: 状态胶囊 -->
      <div class="status-capsule-row">
         <span v-for="sc in statusCapsules" :key="sc.value ?? '__all__'" class="status-capsule" :class="{ active: queryParams.status === sc.value }" @click="handleStatusClick(sc.value)">{{ sc.label }}<span class="capsule-count">{{ sc.count }}</span></span>
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
                  <div class="filter-item-label">所属项目</div>
                  <el-select v-model="queryParams.projectId" filterable clearable placeholder="全部项目" style="width:100%" :loading="optionsLoading" @change="handleQuery">
                     <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">成果类型</div>
                  <el-select v-model="queryParams.resultType" clearable placeholder="全部类型" style="width:100%" @change="handleQuery">
                     <el-option v-for="dict in proj_material_result_type" :key="dict.value" :label="dict.label" :value="dict.value" />
                  </el-select>
               </div>
               <div class="filter-item" v-if="false">
                  <div class="filter-item-label">资料状态</div>
                  <el-select v-model="queryParams.status" clearable placeholder="全部状态" style="width:100%" @change="handleQuery">
                     <el-option v-for="dict in proj_material_status" :key="dict.value" :label="dict.label" :value="dict.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">归档状态</div>
                  <el-select v-model="queryParams.archiveFlag" clearable placeholder="全部" style="width:100%" @change="handleQuery">
                     <el-option label="已归档" value="Y" />
                     <el-option label="未归档" value="N" />
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
               <div class="filter-item">
                  <div class="filter-item-label">工程编号</div>
                  <el-input v-model="queryParams.projectCode" placeholder="工程编号" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程地点</div>
                  <el-input v-model="queryParams.projectLocation" placeholder="工程地点" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
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
         <right-toolbar size="small" v-model:showSearch="showSearch" :columns="columns" storage-key="material-list-columns" @queryTable="getList" />

         <el-col :span="1.5" style="margin-left:auto" v-if="false">
            <el-button type="warning" size="small" plain icon="Download" @click="handleExport" v-hasPermi="['project:material:export']">导出</el-button>
         </el-col>

      </el-row>

      <el-table v-loading="loading" :data="materialList" row-key="id" stripe border v-hover-h-scroll @selection-change="handleSelectionChange" @expand-change="handleExpandChange">
         <el-table-column type="expand">
            <template #default="scope">
               <div class="expand-panel" v-loading="expandDetailLoading(scope.row.projectId)">
                  <template v-if="expandDetails[scope.row.projectId] && expandDetails[scope.row.projectId].overview">
                     <!-- ① 结算核对条 -->
                     <div class="expand-check-bar">
                        <div class="check-cell">
                           <span class="check-label">结算总额</span>
                           <span class="check-value">{{ formatMoney(expandDetails[scope.row.projectId].overview.externalOutput) }}</span>
                        </div>
                        <div class="check-divider" />
                        <div class="check-cell">
                           <span class="check-label">已收金额</span>
                           <span class="check-value">{{ formatMoney(expandDetails[scope.row.projectId].overview.receivedAmount) }}</span>
                        </div>
                        <div class="check-divider" />
                        <div class="check-cell">
                           <span class="check-label">待收差额</span>
                           <span class="check-value" :class="'text-' + effectiveStatus(scope.row.projectId)">{{ formatMoney(Math.abs(effectivePending(scope.row.projectId))) }}</span>
                        </div>
                        <el-tag :type="effectiveStatusMeta(scope.row.projectId).type" effect="dark" size="small">{{ effectiveStatusMeta(scope.row.projectId).text }}</el-tag>
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
                        <el-table-column label="付款类型" align="center" width="120">
                           <template #default="s">
                              <el-tag :type="s.row.paymentType === 'advance' ? 'primary' : 'success'" size="small">{{ s.row.paymentType === 'advance' ? '预付款' : '尾款' }}</el-tag>
                           </template>
                        </el-table-column>
                        <el-table-column label="金额" align="center" width="150">
                           <template #default="s">{{ formatMoney(s.row.amount) }}</template>
                        </el-table-column>
                        <el-table-column label="付款时间" align="center" prop="payTime" width="150">
                           <template #default="s">{{ s.row.payTime }}</template>
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
                              <span v-else class="cell-placeholder">-</span>
                           </template>
                        </el-table-column>
                        <el-table-column label="发票号码" align="center" prop="invoiceNo" width="130">
                           <template #default="s"><span v-if="!s.row.invoiceNo" class="cell-placeholder">-</span>{{ s.row.invoiceNo }}</template>
                        </el-table-column>
                        <el-table-column label="备注" align="center" prop="remark" width="150">
                           <template #default="s"><span v-if="!s.row.remark" class="cell-placeholder">-</span>{{ s.row.remark }}</template>
                        </el-table-column>
                     </el-table>
                     <div v-else class="expand-empty">暂无付款记录</div>
                  </template>
                  <div v-else-if="expandDetails[scope.row.projectId] && !expandDetails[scope.row.projectId].loading" class="expand-empty">
                     暂无结算信息
                  </div>
               </div>
            </template>
         </el-table-column>
         <el-table-column v-for="col in visibleColumns" :key="col.key" :label="col.label" align="center" :prop="col.prop" :show-overflow-tooltip="false" :min-width="colWidth(col)">
            <template #default="scope">
               <!-- 字典标签：按列 key 选择对应字典 -->
               <template v-if="col.type === 'dict'">
                  <dict-tag v-if="scope.row[col.prop]" :options="dictOptions(col.key)" :value="scope.row[col.prop]" />
               </template>
               <!-- 日期字段 -->
               <span v-else-if="col.type === 'date' && scope.row[col.prop]">{{ parseTime(scope.row[col.prop], '{y}-{m}-{d}') }}</span>
               <!-- 用户字段：显示昵称 -->
               <span v-else-if="col.type === 'user'">{{ userNick(scope.row[col.prop]) }}</span>
               <!-- 动态字段：从 extra_data JSONB 取值 -->
               <span v-else-if="col.type === 'dynamic'"><span v-if="scope.row.extraData && scope.row.extraData[col.key] != null">{{ scope.row.extraData[col.key] }}</span></span>
               <!-- 其他：直接显示 -->
               <span v-else>{{ scope.row[col.prop] }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" min-width="160" class-name="small-padding fixed-width" fixed="right">
            <template #default="scope">
               <el-button link type="primary" size="small" @click="handleUpdate(scope.row)" v-hasPermi="['project:material:edit']">登记 / 领取</el-button>
               <el-button link type="info" size="small" @click="handleFlow(scope.row)">历史记录</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" all-option @pagination="getList" />

      <!-- 修改资料提交对话框 -->
      <el-dialog 
         :model-value="open" 
         @update:model-value="open = $event" 
         :title="title"
         :body-style="{ maxHeight: '70vh', overflowY: 'auto' }"
         width="80%" 
         append-to-body
         draggable
      >
         <!-- 状态条：当前资料状态 + 派生说明 -->
         <div class="material-status-bar">
            <span class="msb-label">当前状态</span>
            <el-tag :type="currentStatusMeta.type" effect="dark" size="small">{{ currentStatusMeta.text }}</el-tag>
            <span class="msb-tip">{{ currentStatusTip }}</span>
         </div>

         <el-form ref="materialRef" :model="form" :rules="rules" label-width="90px">
            <!-- ① 资料信息（档案管理员登记：成果类型 / 存档目录 / 登记备注） -->
            <div class="form-group-title">资料信息</div>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="成果类型" prop="resultType" :rules="[{ required: true, message: '请选择成果类型', trigger: 'change' }]">
                     <el-select v-model="form.resultType" placeholder="请选择成果类型" clearable filterable style="width: 100%">
                        <el-option
                           v-for="dict in proj_material_result_type"
                           :key="dict.value"
                           :label="dict.label"
                           :value="dict.value"
                        />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="16">
                  <el-form-item label="存档目录" prop="archiveDir">
                     <el-input v-model="form.archiveDir" placeholder="请输入存档目录" maxlength="500" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="登记备注" prop="remark">
                     <el-input v-model="form.remark" type="textarea" placeholder="资料登记说明（长期保留，不随领取覆盖）" maxlength="500" :rows="2" />
                  </el-form-item>
               </el-col>
            </el-row>

            <!-- ②③ 登记完成后出现：领取信息 + 归档 -->
            <template v-if="isRegistered">
               <div class="form-group-title">领取信息<span class="form-group-sub">每次领取都会追加一条历史记录</span></div>
               <el-row :gutter="20">
                  <el-col :span="12">
                     <el-form-item label="联系人" prop="contactName">
                        <el-input v-model="form.contactName" placeholder="请输入联系人" maxlength="50" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="联系电话" prop="contactPhone">
                        <el-input v-model="form.contactPhone" placeholder="请输入联系电话" maxlength="30" />
                     </el-form-item>
                  </el-col>
               </el-row>
               <el-row :gutter="20">
                  <el-col :span="12">
                     <el-form-item label="是否担保">
                        <el-checkbox v-model="form.guarantorFlag" true-value="Y" false-value="N" @change="onGuarantorFlagChange">需要担保人</el-checkbox>
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item v-if="form.guarantorFlag === 'Y'" label="担保人" prop="guarantorName" :rules="[{ required: true, message: '请输入担保人姓名', trigger: 'blur' }]">
                        <el-input v-model="form.guarantorName" placeholder="请输入担保人姓名（手动输入）" maxlength="50" />
                     </el-form-item>
                  </el-col>
               </el-row>
               <el-row :gutter="20">
                  <el-col :span="12">
                     <el-form-item label="领取类型" required>
                        <el-select v-model="form.pickupType" placeholder="请选择领取类型" clearable style="width: 100%">
                           <el-option
                              v-for="dict in proj_material_pickup_type"
                              :key="dict.value"
                              :label="dict.label"
                              :value="dict.value"
                           />
                        </el-select>
                     </el-form-item>
                  </el-col>
               </el-row>
               <el-row :gutter="20">
                  <el-col :span="24">
                     <el-form-item label="领取备注" prop="borrowRemark">
                        <el-input v-model="form.borrowRemark" placeholder="本次领取说明（追加到领取历史，不覆盖登记备注）" maxlength="500" />
                     </el-form-item>
                  </el-col>
               </el-row>

               <div class="form-group-title">归档</div>
               <el-row :gutter="20">
                  <el-col :span="24">
                     <el-form-item label="档案室归档">
                        <el-checkbox v-model="form.archiveFlag" true-value="Y" false-value="N">已档案室归档</el-checkbox>
                     </el-form-item>
                  </el-col>
               </el-row>
            </template>
         </el-form>
         <!-- 领取历史记录（内嵌时间轴） -->
         <div class="flow-history-block">
            <div class="flow-history-title" @click="flowHistoryExpanded = !flowHistoryExpanded">
               <span>领取历史记录 <span class="flow-count">{{ flowList.length }}</span></span>
               <span class="flow-toggle-arrow" :class="{ expanded: flowHistoryExpanded }"></span>
            </div>
            <el-collapse-transition>
               <div v-show="flowHistoryExpanded" class="flow-history-content" style="margin-top: 10px;" v-loading="flowLoading">
                  <el-timeline v-if="flowList.length > 0" class="flow-timeline">
                     <el-timeline-item v-for="item in flowList" :key="item.id"
                        :type="item.flowType === '领取' ? 'primary' : 'success'"
                        :timestamp="item.operateTime" placement="top">
                        <el-card shadow="never" class="flow-card">
                           <div v-if="item.guarantorName" class="flow-card-head">
                              <span class="flow-guarantor">担保人：{{ item.guarantorName }}</span>
                           </div>
                           <div v-if="item.snapshotObj" class="flow-snapshot">
                              <span v-if="item.snapshotObj.contactName" class="flow-snap-item">联系人：{{ item.snapshotObj.contactName }}</span>
                              <span v-if="item.snapshotObj.contactPhone" class="flow-snap-item">电话：{{ item.snapshotObj.contactPhone }}</span>
                              <span v-if="item.snapshotObj.resultType" class="flow-snap-item">成果类型：{{ resultTypeLabel(item.snapshotObj.resultType) }}</span>
                              <span v-if="item.pickupType" class="flow-snap-item">领取类型：{{ pickupTypeLabel(item.pickupType) }}</span>
                           </div>
                           <p v-if="item.remark" class="flow-remark">备注：{{ item.remark }}</p>
                        </el-card>
                     </el-timeline-item>
                  </el-timeline>
                  <el-empty v-else description="暂无历史记录" :image-size="60" />
               </div>
            </el-collapse-transition>
         </div>
         <template #footer>
            <div class="dialog-footer">
               <el-button :type="isRegistered ? '' : 'primary'" @click="submitRegister" :loading="submitLoading">保存登记</el-button>
               <el-button v-if="isRegistered" type="primary" @click="submitForm" :loading="submitLoading">确认领取</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 历史记录对话框 -->
      <el-dialog title="历史记录" :model-value="flowOpen" @update:model-value="flowOpen = $event" width="600px" append-to-body>
         <div class="flow-dialog-body" v-loading="flowLoading">
            <el-timeline v-if="flowList.length > 0" class="flow-timeline">
            <el-timeline-item v-for="item in flowList" :key="item.id"
               :type="item.flowType === '领取' ? 'primary' : 'success'"
               :timestamp="item.operateTime" placement="top">
               <el-card shadow="never" class="flow-card">
                  <div v-if="item.guarantorName" class="flow-card-head">
                     <span class="flow-guarantor">担保人：{{ item.guarantorName }}</span>
                  </div>
                  <div v-if="item.snapshotObj" class="flow-snapshot">
                     <span v-if="item.snapshotObj.contactName" class="flow-snap-item">联系人：{{ item.snapshotObj.contactName }}</span>
                     <span v-if="item.snapshotObj.contactPhone" class="flow-snap-item">电话：{{ item.snapshotObj.contactPhone }}</span>
                     <span v-if="item.snapshotObj.resultType" class="flow-snap-item">成果类型：{{ resultTypeLabel(item.snapshotObj.resultType) }}</span>
                     <span v-if="item.pickupType" class="flow-snap-item">领取类型：{{ pickupTypeLabel(item.pickupType) }}</span>
                  </div>
                  <p v-if="item.remark" class="flow-remark">备注：{{ item.remark }}</p>
               </el-card>
            </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无历史记录" />
         </div>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="flowOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 欠款确认弹窗 -->
      <el-dialog title="欠款确认" :model-value="paymentOpen" @update:model-value="paymentOpen = $event" width="520px" append-to-body>
         <div v-if="paymentInfo" class="payment-check-body">
            <el-alert type="warning" :closable="false" show-icon class="mb20">
               <span>该项目存在未结清款项，请确认是否领取资料</span>
            </el-alert>
            <div class="payment-rows">
               <div class="payment-row">
                  <span class="payment-row-label">项目金额</span>
                  <span class="payment-row-value">{{ formatMoney(paymentInfo.contractAmount) }}</span>
               </div>
               <div class="payment-row">
                  <span class="payment-row-label">已收金额</span>
                  <span class="payment-row-value" style="color: #67c23a">{{ formatMoney(paymentInfo.receivedAmount) }}</span>
               </div>
               <div class="payment-row">
                  <span class="payment-row-label">未收金额</span>
                  <span class="payment-row-value" style="color: #f56c6c">{{ formatMoney(paymentInfo.pendingAmount) }}</span>
               </div>
               <div class="payment-row">
                  <span class="payment-row-label">收款比例</span>
                  <span class="payment-row-value">{{ paymentInfo.paymentRatio }}%</span>
               </div>
            </div>
            <div class="payment-progress-row">
               <div class="payment-row-label">收款进度</div>
               <el-progress :percentage="Number(paymentInfo.paymentRatio) || 0" :color="'#67c23a'" :stroke-width="10" />
            </div>
            <el-checkbox v-model="paymentConfirm" class="mt20">我已知晓欠款情况，确认领取资料</el-checkbox>
         </div>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="paymentOpen = false">取消</el-button>
               <el-button type="primary" :disabled="!paymentConfirm" @click="confirmBorrowWithDebt" :loading="submitLoading">确认领取</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Material">
import { listMaterial, getMaterial, delMaterial, updateMaterial, borrowMaterial, getFlowList, getMaterialStatusCounts, getMaterialColumns, checkPayment, toggleArchive } from "@/api/project/material"
import { getSettlementDetail, getSettlementOverview } from "@/api/project/settlement"
import { listProject } from "@/api/project/project"
import { listContract } from "@/api/project/contract"
import useSearchMemoryStore from "@/store/modules/searchMemory"
import { invoiceStatusText, invoiceStatusTagType } from "@/utils/projStatus"
import cache from '@/plugins/cache'


const { proxy } = getCurrentInstance()
const searchMemory = useSearchMemoryStore()

// 字典
const { proj_material_result_type, proj_material_status, proj_material_pickup_type } = useDict("proj_material_result_type", "proj_material_status", "proj_material_pickup_type")
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

const materialList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
/** 表格列显隐配置（后端接口动态加载；序号、操作列固定不参与） */
const columns = ref({})
/** 当前可见列（按接口返回顺序过滤） */
const visibleColumns = computed(() => Object.values(columns.value).filter(c => c.visible))
const COLUMNS_STORAGE_KEY = 'material-list-columns'
/** 兜底清单：后端接口不可用（如后端未重启）时使用，保证表格不退化（与后端 getListColumns 默认可见列一致） */
const FALLBACK_COLUMNS = [
  { key: 'projectCode', label: '工程编号', type: 'text', group: 'business', prop: 'projectCode', defaultVisible: true },
  { key: 'engineeringProject', label: '项目类别', type: 'text', group: 'business', prop: 'engineeringProject', defaultVisible: true },
  { key: 'projectLocation', label: '工程地点', type: 'text', group: 'business', prop: 'projectLocation', defaultVisible: true },
  { key: 'projectName', label: '项目名称', type: 'text', group: 'business', prop: 'projectName', defaultVisible: true },
  { key: 'submitTime', label: '交付时间', type: 'date', group: 'business', prop: 'submitTime', defaultVisible: true },
  { key: 'contactName', label: '联系人', type: 'text', group: 'business', prop: 'contactName', defaultVisible: true },
  { key: 'contactPhone', label: '联系电话', type: 'text', group: 'business', prop: 'contactPhone', defaultVisible: true },
  { key: 'resultType', label: '成果类型', type: 'dict', group: 'business', prop: 'resultType', defaultVisible: true },
  { key: 'archiveDir', label: '存档目录', type: 'text', group: 'business', prop: 'archiveDir', defaultVisible: true },
  { key: 'status', label: '资料状态', type: 'dict', group: 'business', prop: 'status', defaultVisible: true },
  { key: 'receiveTime', label: '领取时间', type: 'date', group: 'business', prop: 'receiveTime', defaultVisible: true },
  { key: 'archiveFlag', label: '归档状态', type: 'dict', group: 'business', prop: 'archiveFlag', defaultVisible: true },
  { key: 'guarantorFlag', label: '是否担保', type: 'dict', group: 'business', prop: 'guarantorFlag', defaultVisible: false },
  { key: 'guarantorName', label: '担保人', type: 'text', group: 'business', prop: 'guarantorName', defaultVisible: false },
  { key: 'remark', label: '备注', type: 'text', group: 'business', prop: 'remark', defaultVisible: true },
  { key: 'id', label: 'ID', type: 'number', group: 'system', prop: 'id', defaultVisible: false },
  { key: 'createBy', label: '创建人', type: 'text', group: 'system', prop: 'createBy', defaultVisible: false },
  { key: 'createTime', label: '创建时间', type: 'date', group: 'system', prop: 'createTime', defaultVisible: false },
  { key: 'updateBy', label: '更新人', type: 'text', group: 'system', prop: 'updateBy', defaultVisible: false },
  { key: 'updateTime', label: '更新时间', type: 'date', group: 'system', prop: 'updateTime', defaultVisible: false }
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
    const list = await getMaterialColumns()
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

/** 列宽自适应：日期/字典窄列，其余文本宽列 */
function colWidth(col) {
  if (col.type === 'date') return 110
  if (col.type === 'dict') return 100
  if (col.type === 'dynamic') return 140
  if (col.type === 'user') return 110
  return 140
}

/** 字典标签映射：dict 列按 key 选择对应字典 */
function dictOptions(key) {
  if (key === 'resultType') return proj_material_result_type.value
  if (key === 'status') return proj_material_status.value
  if (key === 'pickupType') return proj_material_pickup_type.value
  if (key === 'guarantorFlag') return [{ value: 'Y', label: '需要' }, { value: 'N', label: '不需要' }]
  if (key === 'archiveFlag') return [{ value: 'Y', label: '已归档' }, { value: 'N', label: '未归档' }]
  return []
}

/** 列显隐面板中 user 类型列的兜底显示（当前已无 user 列，保留分支避免模板失配） */
function userNick(val) {
  return val == null ? '' : val
}

const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const ids = ref([])
const projectOptions = ref([])
const optionsLoading = ref(false)    // 下拉选项加载中
const submitLoading = ref(false)     // 表单提交中（防重复提交）

// 新增：智能查询面板
const closeDateRange = ref([])
const contractOptions = ref([])
const contractLoading = ref(false)
const statusCounts = ref({})
const advancedVisible = ref(false)

// 流转记录
const flowOpen = ref(false)
const flowList = ref([])
const flowHistoryExpanded = ref(false)
const flowLoading = ref(false)        // 流转记录局部加载中

// 欠款确认弹窗
const paymentOpen = ref(false)
const paymentInfo = ref(null)
const paymentConfirm = ref(false)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    projectId: undefined,
    projectCode: undefined,
    projectLocation: undefined,
    resultType: undefined,
    status: undefined,
    archiveFlag: undefined,
    contractId: undefined,
    dataSource: undefined,
    closeDateBegin: undefined,
    closeDateEnd: undefined
  },
  rules: {}
})

const { queryParams, form, rules } = toRefs(data)

/** 加载下拉选项 */
function loadOptions() {
  optionsLoading.value = true
  listProject({ pageNum: 1, pageSize: 999 })
    .then(r => { projectOptions.value = r.rows || [] })
    .finally(() => { optionsLoading.value = false })
}

/** 查询 */
function getList() {
  loading.value = true
  const params = { ...queryParams.value }
  listMaterial(params).then(response => {
    materialList.value = response.rows
    total.value = response.total
  }).finally(() => {
    loading.value = false
  })
}

function cancel() { open.value = false; reset() }

function reset() {
  form.value = {
    id: undefined, projectId: undefined, submitTime: undefined,
    contactName: undefined, contactPhone: undefined,
    resultType: undefined, archiveDir: undefined, remark: undefined,
    guarantorFlag: 'N', guarantorName: undefined, borrowRemark: undefined,
    pickupType: undefined, archiveFlag: 'N'
  }
  proxy.resetForm("materialRef")
}

function handleQuery() { queryParams.value.pageNum = 1; searchMemory.setProjectCode(queryParams.value.projectCode); getList() }
function resetQuery() {
  closeDateRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.projectId = undefined
  queryParams.value.projectCode = undefined
  queryParams.value.projectLocation = undefined
  queryParams.value.resultType = undefined
  queryParams.value.status = undefined
  queryParams.value.archiveFlag = undefined
  queryParams.value.contractId = undefined
  queryParams.value.dataSource = undefined
  queryParams.value.closeDateBegin = undefined
  queryParams.value.closeDateEnd = undefined
  handleQuery()
}

/** 状态胶囊 computed（字典驱动） */
const statusCapsules = computed(() => {
  const dict = proj_material_status.value || []
  const counts = statusCounts.value || {}
  const total = Object.values(counts).reduce((sum, c) => sum + (Number(c) || 0), 0)
  const items = [{ label: '全部', value: undefined, count: total }]
  dict.forEach(d => {
    items.push({ label: d.label, value: d.value, count: Number(counts[d.value]) || 0 })
  })
  return items
})

/** 是否已完成资料登记（登记后填写了成果类型） */
const isRegistered = computed(() => !!form.value.resultType)

/** 当前资料状态（打开时取派生列；未登记按未领取展示） */
const currentStatusMeta = computed(() => {
  const st = form.value.resultType ? form.value.status : 'pending'
  if (st === 'received_both') return { text: '已领取(电子+纸质)', type: 'success' }
  if (st === 'received_paper') return { text: '已领取(纸质版)', type: 'primary' }
  if (st === 'received_electronic') return { text: '已领取(电子版)', type: 'primary' }
  return { text: '未领取', type: 'info' }
})

/** 状态说明（指导下一步操作） */
const currentStatusTip = computed(() => {
  if (!form.value.resultType) return '请先登记成果类型与存档目录'
  const archivedTip = form.value.archiveFlag === 'Y' ? '；已档案室归档' : ''
  if (form.value.status && form.value.status !== 'pending') {
    return '已有领取记录；再次领取会追加一条历史记录' + archivedTip
  }
  return '已完成登记，尚未领取' + archivedTip
})

/** 领取类型字典翻译 */
function pickupTypeLabel(val) {
  if (!val) return ''
  const d = (proj_material_pickup_type.value || []).find(x => x.value === val)
  return d ? d.label : val
}

/** 取消担保时清掉担保人姓名 */
function onGuarantorFlagChange(val) {
  if (val !== 'Y') form.value.guarantorName = undefined
}

/** 加载状态统计 */
function loadStatusCounts() {
  getMaterialStatusCounts().then(response => {
    const data = response.data || []
    const counts = {}
    data.forEach(item => { counts[item.status] = Number(item.cnt) || 0 })
    statusCounts.value = counts
  }).catch(() => {})
}

/** 状态胶囊点击（支持 toggle） */
function handleStatusClick(status) {
  queryParams.value.status = queryParams.value.status === status ? undefined : status
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

/** 办结日期变更（按项目办结时间 close_time 过滤，替代已废弃的交付时间） */
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

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  loading.value = true
  getMaterial(id).then(response => {
    form.value = response.data
    // 联系人/电话：资料有值则保留（保留本次领取修改），为空才从关联项目带出
    const proj = projectOptions.value.find(p => p.id === form.value.projectId)
    if (proj) {
      if (!form.value.contactName) form.value.contactName = proj.contactName
      if (!form.value.contactPhone) form.value.contactPhone = proj.contactPhone
    }
    // 本次领取备注每次新填（不沿用登记备注）
    form.value.borrowRemark = undefined
    open.value = true
    title.value = isRegistered.value ? "资料领取 / 修改" : "资料登记"
    // 加载历史记录供编辑页内嵌时间轴展示
    loadFlowList(id)
  }).finally(() => {
    loading.value = false
  })
}

function submitForm() {
  // 领取类型必填（只在「确认领取」时校验，「保存登记」不受影响）
  if (!form.value.pickupType) { proxy.$modal.msgWarning("请选择领取类型（电子版 / 纸质版 / 电子+纸质版）"); return }
  proxy.$refs["materialRef"].validate(valid => {
    if (!valid) return
    // 交付时间即领取时间，未填默认当前
    if (!form.value.submitTime) {
      form.value.submitTime = proxy.parseTime(new Date(), '{y}-{m}-{d} {h}:{i}:{s}')
    }
    submitLoading.value = true
    // 领取前欠款检查
    checkPayment(form.value.projectId).then(res => {
      const info = res.data
      if (info && info.hasDebt) {
        paymentInfo.value = info
        paymentConfirm.value = false
        paymentOpen.value = true
        submitLoading.value = false   // 欠款确认弹窗接管，复位主提交按钮
      } else {
        doBorrow()
      }
    }).catch(() => doBorrow())
  })
}

/** 保存资料登记（成果类型 / 存档目录 / 登记备注 / 归档标志；不产生领取记录） */
function submitRegister() {
  proxy.$refs["materialRef"].validate(valid => {
    if (!valid) return
    submitLoading.value = true
    const payload = {
      id: form.value.id,
      projectId: form.value.projectId,
      resultType: form.value.resultType,
      archiveDir: form.value.archiveDir,
      remark: form.value.remark,
      guarantorFlag: form.value.guarantorFlag,
      guarantorName: form.value.guarantorFlag === 'Y' ? form.value.guarantorName : null,
      archiveFlag: form.value.archiveFlag
    }
    updateMaterial(payload).then(() => {
      proxy.$modal.msgSuccess("登记保存成功")
      open.value = false
      getList()
      loadStatusCounts()
    }).finally(() => { submitLoading.value = false })
  })
}

/** 执行领取保存：更新主表 + 追加历史记录 */
function doBorrow() {
  submitLoading.value = true
  borrowMaterial(form.value.id, form.value).then(() => {
    proxy.$modal.msgSuccess("领取成功")
    open.value = false
    getList()
    loadStatusCounts()
  }).finally(() => { submitLoading.value = false })
}

/** 欠款弹窗确认后领取 */
function confirmBorrowWithDebt() {
  doBorrow()
}

/** 加载领取历史记录 */
function loadFlowList(id) {
  flowLoading.value = true
  getFlowList(id).then(response => {
    flowList.value = (response.data || []).map(item => ({
      ...item,
      snapshotObj: safeParseSnapshot(item.snapshot)
    }))
  }).catch(() => { flowList.value = [] }).finally(() => { flowLoading.value = false })
}

/** 解析历史快照 JSON */
function safeParseSnapshot(s) {
  try { return s ? JSON.parse(s) : null } catch (e) { return null }
}

/** 成果类型字典翻译 */
function resultTypeLabel(val) {
  if (!val) return ''
  const d = (proj_material_result_type.value || []).find(x => x.value === val)
  return d ? d.label : val
}

/** 快捷切换归档状态 */
function handleToggleArchive(row) {
  const action = row.archiveFlag === 'Y' ? '取消归档' : '归档'
  proxy.$modal.confirm(`确认${action}该资料？`).then(() => {
    loading.value = true
    toggleArchive(row.id).then(() => {
      proxy.$modal.msgSuccess(`${action}成功`)
      getList()  // getList 会接管 loading
    }).catch(() => { loading.value = false })
  }).catch(() => {})
}

/** 格式化金额 */
function formatMoney(val) {
  if (val == null) return '¥0.00'
  return '¥' + Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ===== 展开行：结算明细（复用费用结算接口） =====
const expandDetails = reactive({})

/** 展开态 loading */
function expandDetailLoading(projectId) {
  return expandDetails[projectId] ? expandDetails[projectId].loading : false
}

/** 展开/收起回调：首次展开懒加载 */
function handleExpandChange(row, expandedRows) {
  const isExpanded = expandedRows.some(r => r.id === row.id)
  if (isExpanded && !expandDetails[row.projectId]) {
    loadExpandDetail(row.projectId)
  }
}

/** 加载展开明细（overview + workloads + payments） */
function loadExpandDetail(projectId) {
  expandDetails[projectId] = { loading: true, overview: null, workloads: [], payments: [] }
  Promise.all([getSettlementOverview(projectId), getSettlementDetail(projectId)]).then(([ovRes, detRes]) => {
    const overview = ovRes.data || {}
    const detail = detRes.data || {}
    expandDetails[projectId] = {
      loading: false,
      overview,
      workloads: (() => {
        const sorted = (detail.workloads || [])
          .map(w => ({
            ...w,
            output: w.internalOutput != null ? w.internalOutput : (w.externalOutput != null ? w.externalOutput : null)
          }))
          .sort((a, b) => {
            const order = { external: 0, internal: 1 }
            return (order[a.billingType] ?? 2) - (order[b.billingType] ?? 2)
          })
        const makeSummary = (type, rows) => {
          if (!rows.length) return null
          const sumWL = rows.reduce((s, r) => s + (Number(r.workload) || 0), 0)
          const sumOut = rows.reduce((s, r) => s + (Number(r.output) || 0), 0)
          return { _isSummary: true, billingType: type, userName: '', categoryName: '', billingCategory: '', workload: sumWL, unitPrice: null, output: sumOut, priceUnit: '', minQuantity: null }
        }
        const extRows = sorted.filter(r => r.billingType === 'external')
        const intRows = sorted.filter(r => r.billingType === 'internal')
        const result = []
        if (extRows.length) { result.push(...extRows); const s = makeSummary('external', extRows); if (s) result.push(s) }
        if (intRows.length) { result.push(...intRows); const s = makeSummary('internal', intRows); if (s) result.push(s) }
        return result
      })(),
      payments: (detail.payments || []).sort((a, b) => {
        const order = { advance: 0, final: 1 }
        return (order[a.paymentType] ?? 2) - (order[b.paymentType] ?? 2)
      })
    }
  }).catch(() => {
    expandDetails[projectId] = { loading: false, overview: null, workloads: [], payments: [] }
  })
}

/** 待收差额 = 结算总额(外部产值) - 已收 */
function effectivePending(projectId) {
  const ov = expandDetails[projectId]?.overview
  if (!ov) return 0
  return (Number(ov.externalOutput) || 0) - (Number(ov.receivedAmount) || 0)
}

/** 结算状态 */
function effectiveStatus(projectId) {
  const ov = expandDetails[projectId]?.overview
  if (!ov) return 'pending'
  if (ov.settlementStatus) return ov.settlementStatus
  const pending = effectivePending(projectId)
  const output = Number(ov.externalOutput) || 0
  if (pending < -0.01) return 'overdue'
  if (Math.abs(pending) <= 0.01 && output > 0) return 'settled'
  return 'pending'
}

/** 状态标签元数据 */
function effectiveStatusMeta(projectId) {
  const st = effectiveStatus(projectId)
  if (st === 'settled') return { text: '已结清', type: 'success' }
  if (st === 'overdue') return { text: '超额', type: 'danger' }
  return { text: '未结清', type: 'warning' }
}

/** 展开明细表行样式：合计行高亮 */
function expandRowClass({ row }) {
  if (row._isSummary) return 'expand-summary-row ' + row.billingType
  return ''
}

/** 起步量取整检测 */
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

/** 付款记录表合并：统一开票时合并开票金额/开票状态/发票号码三列 */
function paymentSpanMethod({ rowIndex, columnIndex }, projectId) {
  const payments = expandDetails[projectId]?.payments || []
  if (payments.length <= 1) return
  const hasSplit = payments.slice(1).some(p => p.invoiceNo || p.invoiceStatus || p.invoiceAmount != null)
  if (hasSplit) return
  if (columnIndex === 5 || columnIndex === 6 || columnIndex === 7) {
    if (rowIndex === 0) return { rowspan: payments.length, colspan: 1 }
    return { rowspan: 0, colspan: 0 }
  }
}

/** 查看历史记录 */
function handleFlow(row) {
  loadFlowList(row.id)
  flowOpen.value = true
}

function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除所选资料提交记录?').then(function() {
    loading.value = true
    return delMaterial(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {
    loading.value = false
  })
}

function handleExport() {
  proxy.download('/project/material/export', { ...queryParams.value }, `material_${new Date().getTime()}.xlsx`)
}

loadOptions()
loadColumns()
getList()
// 全局工程编号回填：仅回填输入框，不自动查询（用户点「查询」才生效）
if (searchMemory.projectCode && !queryParams.value.projectCode) {
  queryParams.value.projectCode = searchMemory.projectCode
}
loadStatusCounts()
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
.capsule-count {
  font-size: 12px;
  background: rgba(0,0,0,0.08);
  border-radius: 10px;
  padding: 0 6px;
  min-width: 20px;
  text-align: center;
}
.status-capsule.active .capsule-count { background: rgba(255,255,255,0.25); }

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

/* ===== 欠款确认弹窗 ===== */
.payment-check-body { padding: 0 4px; }
.payment-rows {
  margin-bottom: 16px;
}
.payment-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 4px; border-bottom: 1px dashed #ebeef5; font-size: 14px;
}
.payment-row:last-child { border-bottom: none; }
.payment-row-label { color: #606266; }
.payment-row-value { font-weight: 600; color: #303133; }
.payment-progress-row {
  margin-bottom: 16px;
}
.payment-progress-row .payment-row-label {
  margin-bottom: 10px; color: #606266; font-size: 14px;
}
.mt20 { margin-top: 20px; }
.mb20 { margin-bottom: 20px; }

/* ===== 展开行：结算明细面板 ===== */
.expand-panel { padding: 12px 20px 16px; background: #fafbfd; }
.expand-check-bar {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 20px; background: #fff;
  border: 1px solid #e4e7ed; border-radius: 8px;
  margin-bottom: 14px; flex-wrap: wrap;
}
.check-cell { display: inline-flex; align-items: baseline; gap: 8px; }
.check-label { font-size: 12px; color: #909399; }
.check-value { font-size: 15px; font-weight: 600; color: #303133; font-variant-numeric: tabular-nums; }
.check-divider { width: 1px; height: 20px; background: #e4e7ed; }
.expand-section-title {
  font-size: 13px; font-weight: 600; color: #303133;
  margin: 6px 0 8px; padding-left: 8px;
  border-left: 3px solid #409eff; line-height: 16px;
}
.cell-placeholder { color: #c0c4cc; }
.expand-summary-row td { background: #f5f7fa !important; font-weight: 600; }
.expand-summary-row.external td { background: #fdf6ec !important; border-top: 2px solid #e6a23c; }
.expand-summary-row.internal td { background: #ecf5ff !important; border-top: 2px solid #409eff; }
.summary-label { font-size: 13px; font-weight: 600; }
.summary-label.external { color: #e6a23c; }
.summary-label.internal { color: #409eff; }
.summary-value { font-variant-numeric: tabular-nums; font-size: 14px; }
.cell-sub { font-size: 12px; color: #909399; line-height: 16px; margin-top: 2px; text-align: center; }
.cell-sub-inline { font-size: 12px; color: #909399; margin-left: 3px; }
.min-qty-hit { color: #e6a23c; margin-left: 4px; }
.output-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.output-dot.internal { background: #409eff; }
.output-dot.external { background: #e6a23c; }
.expand-empty {
  padding: 16px; text-align: center; color: #909399; font-size: 13px;
  background: #fff; border: 1px dashed #e4e7ed; border-radius: 6px;
}

/* ===== 资料登记 / 领取弹窗 ===== */
.material-status-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 12px; margin-bottom: 14px;
  background: #f5f7fa; border: 1px solid #e4e7ed; border-radius: 6px;
}
.msb-label { font-size: 13px; color: #909399; }
.msb-tip { font-size: 12px; color: #909399; }
.form-group-title {
  font-size: 13px; font-weight: 600; color: #303133;
  margin: 4px 0 12px; padding-left: 8px;
  border-left: 3px solid #409eff; line-height: 16px;
}
.form-group-sub { font-size: 12px; font-weight: 400; color: #909399; margin-left: 8px; }

/* 领取历史时间轴 */
.flow-history-block {
  margin-top: 12px; padding: 10px 12px; background: #fafafa;
  border: 1px solid #ebeef5; border-radius: 6px;
}
.flow-history-title {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; font-weight: 600; color: #303133;
  padding-left: 6px; border-left: 3px solid #409eff;
  cursor: pointer; user-select: none;
}
.flow-count {
  display: inline-block; margin-left: 6px; padding: 0 6px;
  background: #e4e7ed; color: #606266; border-radius: 10px; font-size: 12px; font-weight: 400;
}
.flow-toggle-arrow {
  display: inline-block; width: 0; height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #909399;
  transition: transform 0.2s;
}
.flow-toggle-arrow.expanded { transform: rotate(180deg); }
.flow-history-content { padding-top: 10px; }
.dialog-top-divider { height: 1px; background: #dcdfe6; margin: 0 0 12px; }
.flow-dialog-body { max-height: 60vh; overflow-y: auto; padding-right: 8px; }
.flow-timeline { padding-left: 8px; }
.flow-card { border: none !important; background: #fff; }
.flow-card-head {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  font-size: 13px; margin-bottom: 4px;
}
.flow-type { font-weight: 600; color: #409eff; }
.flow-user { color: #606266; }
.flow-guarantor { color: #e6a23c; }
.flow-remark { margin: 6px 0 0; color: #606266; font-size: 13px; line-height: 1.5; }
.flow-snapshot {
  display: flex; flex-wrap: wrap; gap: 12px; margin: 6px 0;
  padding: 6px 8px; background: #f5f7fa; border-radius: 4px;
  font-size: 12px; color: #606266;
}
.flow-snap-item::before { content: '·'; margin-right: 4px; color: #c0c4cc; }
.flow-snap-item:first-child::before { content: ''; margin-right: 0; }
</style>
