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
         :tree-props="{ children: 'children' }"
         stripe border
         :default-expand-all="false"
      >
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
            <el-table :data="editForm.workloads" stripe border>
               <el-table-column label="负责人" align="center" min-width="110">
                  <template #default="scope">
                     <el-select v-model="scope.row.userId" filterable placeholder="选择负责人" style="width:100%">
                        <el-option v-for="u in leaderOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                     </el-select>
                  </template>
               </el-table-column>
               <el-table-column label="项目类别" align="center" min-width="130">
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
               <el-table-column label="工作量" align="center" width="120">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.workload" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                  </template>
               </el-table-column>
               <el-table-column label="内部单价" align="center" width="120">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.internalPrice" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                  </template>
               </el-table-column>
               <el-table-column label="外部单价" align="center" width="120">
                  <template #default="scope">
                     <el-input-number v-model="scope.row.externalPrice" :min="0" :precision="2" controls-position="right" style="width:100%" @change="calcRow(scope.row)" />
                  </template>
               </el-table-column>
               <el-table-column label="内部产值" align="center" width="120">
                  <template #default="scope">
                     <span>{{ formatMoney(scope.row.internalOutput) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="外部产值" align="center" width="120">
                  <template #default="scope">
                     <span>{{ formatMoney(scope.row.externalOutput) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="操作" align="center" width="60">
                  <template #default="scope">
                     <el-button link type="danger" icon="Delete" @click="removeWorkloadRow(scope.$index)" />
                  </template>
               </el-table-column>
            </el-table>

            <!-- 产值统计条（内部/外部各计，无总产值） -->
            <div class="output-summary-bar">
               <span class="sum-item">
                  <span class="sum-label">内部产值合计</span>
                  <span class="sum-value">{{ formatMoney(internalOutputTotal) }}</span>
               </span>
               <span class="sum-item">
                  <span class="sum-label">外部产值合计</span>
                  <span class="sum-value">{{ formatMoney(externalOutputTotal) }}</span>
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
                  <span class="settle-hint">（预付款 + 尾款，自动汇总）</span>
               </div>
               <div class="settle-divider" />
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
import { categoryTreeselectFull } from "@/api/project/category"
import { listUserOptions } from "@/api/system/user"
import { getDistinctValues } from "@/api/project/project"
import { checkPermi } from "@/utils/permission"
import cache from '@/plugins/cache'

const { proxy } = getCurrentInstance()

const treeData = ref([])
const loading = ref(false)
const showSearch = ref(true)
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
  { key: 'output', label: '总产值', type: 'money', group: 'business', prop: 'output', defaultVisible: false },
  { key: 'prepayAmount', label: '预付款', type: 'money', group: 'business', prop: 'prepayAmount', defaultVisible: true },
  { key: 'prepayDate', label: '预付款时间', type: 'date', group: 'business', prop: 'prepayDate', defaultVisible: true },
  { key: 'payUnit', label: '付款单位', type: 'text', group: 'business', prop: 'payUnit', defaultVisible: true },
  { key: 'payMethod', label: '付款方式', type: 'text', group: 'business', prop: 'payMethod', defaultVisible: true },
  { key: 'tailAmount', label: '尾款', type: 'money', group: 'business', prop: 'tailAmount', defaultVisible: true },
  { key: 'tailDate', label: '尾款时间', type: 'date', group: 'business', prop: 'tailDate', defaultVisible: true },
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

// 内部产值合计
const internalOutputTotal = computed(() => {
  let sum = 0
  editForm.value.workloads.forEach(row => {
    if (row.internalOutput) sum += Number(row.internalOutput)
  })
  return sum
})

// 外部产值合计（= 结算总额）
const externalOutputTotal = computed(() => {
  let sum = 0
  editForm.value.workloads.forEach(row => {
    if (row.externalOutput) sum += Number(row.externalOutput)
  })
  return sum
})

// 已收 = 预付款 + 尾款（实时联动）
const receivedAmount = computed(() => {
  const a = Number(editForm.value.prepayAmount) || 0
  const b = Number(editForm.value.tailAmount) || 0
  return a + b
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

/** 计算单行产值 */
function calcRow(row) {
  if (row.workload && row.internalPrice) {
    row.internalOutput = (Number(row.workload) * Number(row.internalPrice)).toFixed(2)
  } else {
    row.internalOutput = null
  }
  if (row.workload && row.externalPrice) {
    row.externalOutput = (Number(row.workload) * Number(row.externalPrice)).toFixed(2)
  } else {
    row.externalOutput = null
  }
}

/** 选择类别后自动填默认单价 */
function onCategoryChange(categoryId, row) {
  if (!categoryId || !categoryOptions.value.length) return
  // 递归查找类别节点获取单价
  function findNode(nodes, id) {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const found = findNode(n.children, id)
        if (found) return found
      }
    }
    return null
  }
  const node = findNode(categoryOptions.value, categoryId)
  // 内部单价：始终取类别默认值
  if (node && node.internalPrice != null) {
    row.internalPrice = node.internalPrice
  }
  // 外部单价：有合同取合同价，无合同取类别默认值
  const cp = contractPriceMap.value[categoryId]
  if (cp && cp.price != null) {
    row.externalPrice = cp.price
  } else if (node && node.externalPrice != null) {
    row.externalPrice = node.externalPrice
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
    loading.value = false
  })
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
  Promise.all([categoryTreeselectFull(), listUserOptions({ pageNum: 1, pageSize: 1000 }), getSettlementDetail(row.projectId)])
    .then(([catRes, userRes, detailRes]) => {
      categoryOptions.value = catRes.data
      userOptions.value = userRes.rows || []

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

      // 填充工作量
      editForm.value.workloads = workloads.map(w => ({
        workloadId: w.id,
        userId: w.userId,
        categoryId: w.categoryId,
        workload: w.workload,
        internalPrice: w.internalPrice,
        externalPrice: w.externalPrice,
        internalOutput: w.internalOutput,
        externalOutput: w.externalOutput
      }))

      // 负责人下拉：项目负责人 + 已有工作量行的负责人（Number 归一化，防 Long/字符串 类型失配）
      const leaderIdSet = new Set((detailRes.data.leaderIds || []).map(id => Number(id)))
      editForm.value.workloads.forEach(w => { if (w.userId != null) leaderIdSet.add(Number(w.userId)) })
      let filtered = userOptions.value.filter(u => leaderIdSet.has(Number(u.userId)))
      // 兜底：项目未关联负责人时回退显示全部用户，保证下拉可用
      leaderOptions.value = filtered.length > 0 ? filtered : userOptions.value

      editOpen.value = true
    })
}

/** 添加工作量行 */
function addWorkloadRow() {
  editForm.value.workloads.push({
    workloadId: null,
    userId: null,
    categoryId: null,
    workload: null,
    internalPrice: null,
    externalPrice: null,
    internalOutput: null,
    externalOutput: null
  })
}

/** 删除工作量行 */
function removeWorkloadRow(index) {
  editForm.value.workloads.splice(index, 1)
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

/* ===== 编辑弹窗：产值统计条 ===== */
.output-summary-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 40px;
  margin-top: 12px;
  padding: 8px 20px;
  background: #ecf5ff;
  border-radius: 6px;
  border: 1px solid #d9ecff;
}
.sum-item { display: inline-flex; align-items: baseline; gap: 8px; }
.sum-label { font-size: 13px; color: #606266; }
.sum-value { font-size: 14px; font-weight: bold; color: #409eff; font-family: "JetBrains Mono", Consolas, monospace; }

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
</style>
