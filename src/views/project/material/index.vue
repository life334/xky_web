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
                  <el-select v-model="queryParams.projectId" filterable clearable placeholder="全部项目" style="width:100%" @change="handleQuery">
                     <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">成果类型</div>
                  <el-select v-model="queryParams.resultType" clearable placeholder="全部类型" style="width:100%" @change="handleQuery">
                     <el-option v-for="dict in proj_material_result_type" :key="dict.value" :label="dict.label" :value="dict.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">提交状态</div>
                  <el-select v-model="queryParams.submitStatus" clearable placeholder="全部状态" style="width:100%" @change="handleQuery">
                     <el-option v-for="dict in proj_material_submit_status" :key="dict.value" :label="dict.label" :value="dict.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">交付时间</div>
                  <el-date-picker v-model="submitTimeRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onSubmitTimeChange" />
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
         <el-col :span="1.5" style="margin-left:auto">
            <el-button type="warning" size="small" plain icon="Download" @click="handleExport" v-hasPermi="['project:material:export']">导出</el-button>
         </el-col>
         <el-col :span="1.5">
            <right-toolbar v-model:showSearch="showSearch" :columns="columns" storage-key="material-list-columns" @queryTable="getList" />
         </el-col>
      </el-row>

      <el-table v-loading="loading" :data="materialList" row-key="id" stripe border @selection-change="handleSelectionChange" @expand-change="handleExpandChange">
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
                              <el-tag v-if="s.row.invoiceStatus === '已开'" type="success" size="small">已开</el-tag>
                              <el-tag v-else-if="s.row.invoiceStatus === '已作废'" type="danger" size="small">已作废</el-tag>
                              <el-tag v-else-if="s.row.invoiceStatus === '未开'" type="info" size="small">未开</el-tag>
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
         <el-table-column label="操作" align="center" min-width="200" class-name="small-padding fixed-width" fixed="right">
            <template #default="scope">
               <el-button v-if="scope.row.status === 'pending' || scope.row.status === 'returned'" link type="warning" @click="handleBorrow(scope.row)" v-hasPermi="['project:material:borrow']">领取</el-button>
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['project:material:edit']">修改</el-button>
               <el-button link type="info" @click="handleFlow(scope.row)">领取记录</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 修改资料提交对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="700px" append-to-body>
         <!-- 项目信息（只读） -->
         <el-descriptions :column="2" border size="small" class="mb20">
            <el-descriptions-item label="工程编号">{{ form.projectCode}}</el-descriptions-item>
            <el-descriptions-item label="委托任务">{{ form.engineeringProject }}</el-descriptions-item>
            <el-descriptions-item label="工程地点">{{ form.projectLocation}}</el-descriptions-item>
            <el-descriptions-item label="项目名称">{{ form.projectName}}</el-descriptions-item>
         </el-descriptions>
         <!-- 资料属性（可编辑） -->
         <el-form ref="materialRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="12">
                  <el-form-item label="交付时间" prop="submitTime">
                     <el-date-picker v-model="form.submitTime" type="datetime" placeholder="选择交付时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="成果类型" prop="resultType">
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
            </el-row>
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
                     <el-checkbox v-model="form.guarantorFlag" true-value="Y" false-value="N">需要担保人</el-checkbox>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item v-if="form.guarantorFlag === 'Y'" label="担保人" prop="guarantorId" :rules="[{ required: true, message: '请选择担保人', trigger: 'change' }]">
                     <el-select v-model="form.guarantorId" filterable clearable placeholder="请选择担保人" style="width: 100%">
                        <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="存档目录" prop="archiveDir">
                     <el-input v-model="form.archiveDir" placeholder="请输入存档目录" maxlength="500" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="档案室归档">
                     <el-checkbox v-model="form.archiveFlag" true-value="Y" false-value="N">已档案室归档</el-checkbox>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="24">
                  <el-form-item label="备注" prop="remark">
                     <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" :rows="3" />
                  </el-form-item>
               </el-col>
            </el-row>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 领取记录对话框 -->
      <el-dialog title="领取记录" :model-value="flowOpen" @update:model-value="flowOpen = $event" width="600px" append-to-body>
         <el-timeline v-if="flowList.length > 0">
            <el-timeline-item v-for="item in flowList" :key="item.id"
               :type="item.flowType === '领取' ? 'primary' : 'success'"
               :timestamp="item.operateTime" placement="top">
               <el-card shadow="never">
                  <p><strong>{{ item.flowType }}</strong></p>
                  <p v-if="item.guarantorName">担保人：{{ item.guarantorName }}</p>
                  <p v-if="item.remark">备注：{{ item.remark }}</p>
               </el-card>
            </el-timeline-item>
         </el-timeline>
         <el-empty v-else description="暂无领取记录" />
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
            <div class="payment-grid">
               <div class="payment-cell">
                  <div class="payment-label">合同金额</div>
                  <div class="payment-value">{{ formatMoney(paymentInfo.contractAmount) }}</div>
               </div>
               <div class="payment-cell">
                  <div class="payment-label">已收金额</div>
                  <div class="payment-value" style="color: #67c23a">{{ formatMoney(paymentInfo.receivedAmount) }}</div>
               </div>
               <div class="payment-cell">
                  <div class="payment-label">未收金额</div>
                  <div class="payment-value" style="color: #f56c6c">{{ formatMoney(paymentInfo.pendingAmount) }}</div>
               </div>
               <div class="payment-cell">
                  <div class="payment-label">收款比例</div>
                  <div class="payment-value">{{ paymentInfo.paymentRatio }}%</div>
               </div>
            </div>
            <div class="payment-progress-row">
               <div class="payment-label">收款进度</div>
               <el-progress :percentage="Number(paymentInfo.paymentRatio) || 0" :color="'#67c23a'" :stroke-width="14" />
            </div>
            <el-checkbox v-model="paymentConfirm" class="mt20">我已知晓欠款情况，确认领取资料</el-checkbox>
         </div>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="paymentOpen = false">取消</el-button>
               <el-button type="primary" :disabled="!paymentConfirm" @click="confirmBorrowWithDebt">确认领取</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Material">
import { listMaterial, getMaterial, updateMaterial, delMaterial, borrowMaterial, getFlowList, getMaterialStatusCounts, getMaterialColumns, checkPayment, toggleArchive } from "@/api/project/material"
import { getSettlementDetail, getSettlementOverview } from "@/api/project/settlement"
import { listProject } from "@/api/project/project"
import { listUserOptions } from "@/api/system/user"
import useSearchMemoryStore from "@/store/modules/searchMemory"
import cache from '@/plugins/cache'


const { proxy } = getCurrentInstance()
const searchMemory = useSearchMemoryStore()

// 字典
const { proj_material_result_type, proj_material_status, proj_material_submit_status } = useDict("proj_material_result_type", "proj_material_status", "proj_material_submit_status")

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
  { key: 'engineeringProject', label: '委托任务', type: 'text', group: 'business', prop: 'engineeringProject', defaultVisible: true },
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
  { key: 'submitStatus', label: '提交状态', type: 'dict', group: 'business', prop: 'submitStatus', defaultVisible: false },
  { key: 'guarantorFlag', label: '是否担保', type: 'dict', group: 'business', prop: 'guarantorFlag', defaultVisible: false },
  { key: 'guarantorId', label: '担保人', type: 'user', group: 'business', prop: 'guarantorId', defaultVisible: false },
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
  if (key === 'submitStatus') return proj_material_submit_status.value
  if (key === 'guarantorFlag') return [{ value: 'Y', label: '需要' }, { value: 'N', label: '不需要' }]
  if (key === 'archiveFlag') return [{ value: 'Y', label: '已归档' }, { value: 'N', label: '未归档' }]
  return []
}

/** 用户ID → 昵称（担保人列显示） */
function userNick(userId) {
  if (!userId) return ''
  const u = userOptions.value.find(u => u.userId === userId)
  return u ? u.nickName : userId
}

const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const ids = ref([])
const projectOptions = ref([])
const userOptions = ref([])

// 新增：智能查询面板
const submitTimeRange = ref([])
const statusCounts = ref({})
const advancedVisible = ref(false)

// 流转记录
const flowOpen = ref(false)
const flowList = ref([])

// 欠款确认弹窗
const paymentOpen = ref(false)
const paymentInfo = ref(null)
const paymentConfirm = ref(false)
const pendingBorrowRow = ref(null)

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    projectId: undefined,
    contactName: undefined,
    contactPhone: undefined,
    projectCode: undefined,
    projectLocation: undefined,
    resultType: undefined,
    status: undefined,
    submitStatus: undefined,
    submitTimeBegin: undefined,
    submitTimeEnd: undefined
  },
  rules: {}
})

const { queryParams, form, rules } = toRefs(data)

/** 加载下拉选项 */
function loadOptions() {
  listProject({ pageNum: 1, pageSize: 999 }).then(r => { projectOptions.value = r.rows || [] })
  listUserOptions({ pageNum: 1, pageSize: 1000 }).then(r => { userOptions.value = r.rows || [] })
}

/** 查询 */
function getList() {
  loading.value = true
  const params = { ...queryParams.value }
  listMaterial(params).then(response => {
    materialList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

function cancel() { open.value = false; reset() }

function reset() {
  form.value = {
    id: undefined, projectId: undefined, submitTime: undefined,
    contactName: undefined, contactPhone: undefined,
    resultType: undefined, archiveDir: undefined, remark: undefined,
    guarantorFlag: 'N', guarantorId: undefined,
    archiveFlag: 'N'
  }
  proxy.resetForm("materialRef")
}

function handleQuery() { queryParams.value.pageNum = 1; searchMemory.setProjectCode(queryParams.value.projectCode); getList() }
function resetQuery() {
  submitTimeRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.projectId = undefined
  queryParams.value.contactName = undefined
  queryParams.value.contactPhone = undefined
  queryParams.value.projectCode = undefined
  queryParams.value.projectLocation = undefined
  queryParams.value.resultType = undefined
  queryParams.value.status = undefined
  queryParams.value.submitStatus = undefined
  queryParams.value.submitTimeBegin = undefined
  queryParams.value.submitTimeEnd = undefined
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

/** 交付时间变更 */
function onSubmitTimeChange(val) {
  if (val && val.length === 2) {
    queryParams.value.submitTimeBegin = val[0]
    queryParams.value.submitTimeEnd = val[1] + ' 23:59:59'
  } else {
    queryParams.value.submitTimeBegin = undefined
    queryParams.value.submitTimeEnd = undefined
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
    submitTimeRange.value = [begin, end]
    onSubmitTimeChange([begin, end])
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
  getMaterial(id).then(response => {
    form.value = response.data
    // 联系人/电话默认取关联项目当前值（同步项目最新，弹窗内可编辑，保存后写入资料表）
    const proj = projectOptions.value.find(p => p.id === form.value.projectId)
    if (proj) {
      form.value.contactName = proj.contactName
      form.value.contactPhone = proj.contactPhone
    }
    open.value = true
    title.value = "修改资料提交"
  })
}

function submitForm() {
  proxy.$refs["materialRef"].validate(valid => {
    if (valid) {
      updateMaterial(form.value).then(() => {
        proxy.$modal.msgSuccess("修改成功")
        open.value = false
        getList()
      })
    }
  })
}

/** 领取：先检查担保人，再检查欠款 */
function handleBorrow(row) {
  // 资料标记需要担保但未设置担保人时拦截
  if (row.guarantorFlag === 'Y' && !row.guarantorId) {
    proxy.$modal.msgWarning("该资料需要担保人，请先在编辑页设置担保人")
    return
  }
  // 查询欠款信息
  checkPayment(row.projectId).then(res => {
    const info = res.data
    if (info && info.hasDebt) {
      // 有欠款 → 弹出确认弹窗
      paymentInfo.value = info
      paymentConfirm.value = false
      pendingBorrowRow.value = row
      paymentOpen.value = true
    } else {
      // 无欠款 → 直接确认领取
      proxy.$modal.confirm("确认领取该资料？").then(() => {
        borrowMaterial(row.id).then(() => {
          proxy.$modal.msgSuccess("领取成功")
          getList()
        })
      }).catch(() => {})
    }
  }).catch(() => {
    // 查询失败 → 兜底直接确认
    proxy.$modal.confirm("确认领取该资料？").then(() => {
      borrowMaterial(row.id).then(() => {
        proxy.$modal.msgSuccess("领取成功")
        getList()
      })
    }).catch(() => {})
  })
}

/** 欠款弹窗确认领取 */
function confirmBorrowWithDebt() {
  if (!pendingBorrowRow.value) return
  borrowMaterial(pendingBorrowRow.value.id).then(() => {
    proxy.$modal.msgSuccess("领取成功")
    paymentOpen.value = false
    getList()
  })
}

/** 快捷切换归档状态 */
function handleToggleArchive(row) {
  const action = row.archiveFlag === 'Y' ? '取消归档' : '归档'
  proxy.$modal.confirm(`确认${action}该资料？`).then(() => {
    toggleArchive(row.id).then(() => {
      proxy.$modal.msgSuccess(`${action}成功`)
      getList()
    })
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

/** 查看领取记录 */
function handleFlow(row) {
  getFlowList(row.id).then(response => {
    flowList.value = response.data || []
    flowOpen.value = true
  })
}

function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除所选资料提交记录?').then(function() {
    return delMaterial(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
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
  color: #666;
  transition: all 0.2s;
  user-select: none;
}
.status-capsule:hover { background: #e8e8e8; }
.status-capsule.active { background: #409eff; color: #fff; }
.capsule-count {
  font-size: 11px;
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

/* ===== 欠款确认弹窗 ===== */
.payment-check-body { padding: 0 4px; }
.payment-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.payment-cell {
  border-radius: 8px;
  padding: 16px;
  background: var(--el-fill-color-light, #f5f5f5);
  text-align: center;
}
.payment-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}
.payment-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}
.payment-progress-row {
  margin-bottom: 16px;
}
.payment-progress-row .payment-label {
  margin-bottom: 10px;
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
.check-value { font-size: 15px; font-weight: bold; color: #303133; font-family: "JetBrains Mono", Consolas, monospace; }
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
.summary-label { font-size: 13px; font-weight: 700; }
.summary-label.external { color: #e6a23c; }
.summary-label.internal { color: #409eff; }
.summary-value { font-family: "JetBrains Mono", Consolas, monospace; font-size: 14px; }
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
</style>
