<template>
   <div class="app-container">
      <!-- 第一行：全局搜索 + 搜索/重置按钮 -->
      <div class="search-toolbar" v-show="showSearch">
         <el-input
            v-model="queryParams.keyword"
            placeholder="全局搜索 — 工程编号 / 项目名称 / 委托单位 / 工程项目 / 联系人"
            clearable
            size="default"
            class="global-search"
            @keyup.enter="handleQuery"
            @clear="handleQuery"
         >
            <template #prefix>
               <svg-icon icon-class="search" />
            </template>
         </el-input>
         <el-button type="primary" size="small" @click="handleQuery" style="flex-shrink:0;margin-left:8px">搜索</el-button>
         <el-button size="small" @click="resetQuery" style="flex-shrink:0;margin-left:4px">重置</el-button>
      </div>

      <!-- 第二行：状态胶囊导航 -->
      <div class="status-capsules" v-show="showSearch">
         <span class="status-label">状态：</span>
         <span
            v-for="item in statusCapsules"
            :key="item.value"
            :class="['status-capsule', { active: queryParams.status === item.value }]"
            @click="toggleStatus(item.value)"
         >
            {{ item.label }} {{ item.count > 0 ? item.count : '' }}
         </span>
      </div>

      <!-- 第三行：高级筛选折叠触发器 -->
      <div class="advanced-toggle" v-show="showSearch" @click="advancedVisible = !advancedVisible">
         <span class="toggle-arrow" :class="{ 'is-open': advancedVisible }">▼</span>
         <span class="toggle-label">高级筛选</span>
         <span class="toggle-hint">（负责人、合同、时间范围等）</span>
      </div>

      <!-- 第四行：高级筛选面板 -->
      <el-collapse-transition>
         <div v-show="advancedVisible" class="advanced-filter-panel">
            <div class="filter-grid">
               <!-- 项目类别已移除：类别属于工作量维度，不属于项目维度 -->
               <div class="filter-item">
                  <div class="filter-item-label">负责人</div>
                  <el-select v-model="queryParams.leaderId" filterable clearable placeholder="全部负责人" style="width: 100%">
                     <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">合同</div>
                  <el-select
                     v-model="queryParams.contractId"
                     filterable remote reserve-keyword clearable
                     placeholder="全部合同"
                     :remote-method="searchContracts"
                     :loading="contractLoading"
                     style="width: 100%"
                     @visible-change="onContractVisibleChange"
                  >
                     <el-option v-for="c in contractOptions" :key="c.id" :label="c.contractNo + ' — ' + c.contractName" :value="c.id" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程编号</div>
                  <el-input v-model="queryParams.projectCode" placeholder="模糊搜索" clearable style="width: 100%" @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">委托单位</div>
                  <el-select v-model="queryParams.clientUnit" filterable clearable placeholder="全部单位" style="width: 100%">
                     <el-option v-for="item in clientUnitOptions" :key="item" :label="item" :value="item" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程项目</div>
                  <el-select v-model="queryParams.engineeringProject" filterable clearable placeholder="全部项目" style="width: 100%">
                     <el-option v-for="item in engineeringProjectOptions" :key="item" :label="item" :value="item" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">工程地点</div>
                  <el-input v-model="queryParams.projectLocation" placeholder="模糊搜索" clearable style="width: 100%" @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">联系人</div>
                  <el-input v-model="queryParams.contactName" placeholder="模糊搜索" clearable style="width: 100%" @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">安排日期</div>
                  <el-date-picker
                     v-model="assignDateRange"
                     value-format="YYYY-MM-DD"
                     type="daterange"
                     range-separator="-"
                     start-placeholder="开始"
                     end-placeholder="结束"
                     style="width: 100%"
                     @change="onAssignDateChange"
                  />
               </div>
            </div>
            <!-- 快捷日期 -->
            <div class="quick-date-row">
               <span class="quick-date-label">快捷：</span>
               <el-button size="small" v-for="btn in quickDateBtns" :key="btn.label" @click="setQuickDate(btn.range)">{{ btn.label }}</el-button>
            </div>
            <!-- 分割线 -->
            <div class="filter-divider"></div>
            <!-- 筛选方案 -->
            <div class="scheme-row">
               <span class="scheme-label">筛选方案：</span>
               <span
                  v-for="s in savedSchemes"
                  :key="s.name"
                  :class="['scheme-tag', { active: currentSchemeName === s.name }]"
                  @click="loadSavedScheme(s.name)"
               >{{ s.name }}</span>
               <el-button link type="primary" size="small" @click="saveSchemeVisible = true">+ 保存当前</el-button>
               <span class="collapse-link" @click="advancedVisible = false">
                  收起 <span class="collapse-arrow">▲</span>
               </span>
            </div>
         </div>
      </el-collapse-transition>

      <!-- 第四行：操作按钮行（左：增删改，右：导出+列设置） -->
      <el-row :gutter="6" class="mb8 compact-ops" justify="space-between">
         <div style="display:flex;gap:6px;flex-wrap:wrap">
            <el-button type="primary" plain icon="Plus" size="small" @click="handleAdd" v-hasPermi="['project:project:add']">新增</el-button>
            <el-button type="info" plain icon="Upload" size="small" @click="handleImport" v-hasPermi="['project:project:import']">导入</el-button>
            <el-button type="info" plain icon="DocumentCopy" size="small" @click="handlePaste" v-hasPermi="['project:project:add']">粘贴</el-button>
            <el-button type="success" plain icon="Edit" size="small" :disabled="single || editDisabledByClosed" @click="handleUpdate" v-hasPermi="['project:project:edit']">修改</el-button>
            <el-button type="danger" plain icon="Delete" size="small" :disabled="multiple || deleteDisabledByClosed" @click="handleDelete" v-hasPermi="['project:project:remove']">删除</el-button>
         </div>
         <div style="display:flex;align-items:center;gap:6px">
            <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:project:export']">导出</el-button>
            <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" />
         </div>
      </el-row>

      <el-table ref="tableRef" v-loading="loading" :data="projectList" stripe border @selection-change="handleSelectionChange">
         <el-table-column min-width="70" align="center" label="序号">
            <template #header>
               <el-checkbox :model-value="isAllChecked" :indeterminate="isIndeterminate" @change="handleCheckAll" /> 序号
            </template>
            <template #default="scope">
               <el-checkbox :model-value="checkedMap[scope.row.id]" style="margin-right:6px" @change="toggleRow(scope.row)" />
               <span>{{ (queryParams.pageNum - 1) * queryParams.pageSize + scope.$index + 1 }}</span>
            </template>
         </el-table-column>
         <el-table-column label="工程编号" align="center" prop="projectCode" :show-overflow-tooltip="true" min-width="140" />
         <el-table-column label="委托单位" align="center" prop="clientUnit"  min-width="180" />
         <el-table-column label="联系人" align="center" prop="contactName" min-width="90" />
         <el-table-column label="联系电话" align="center" prop="contactPhone"  :show-overflow-tooltip="true" min-width="120" />
          <el-table-column label="工程项目" align="center" prop="engineeringProject" :show-overflow-tooltip="true" min-width="140" />
         <el-table-column label="工程地点" align="center" prop="projectLocation" min-width="180" />
         <el-table-column label="状态" align="center" prop="status" min-width="90">
            <template #default="scope">
               <dict-tag :options="proj_project_status" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="项目名称" align="center" prop="projectName" :show-overflow-tooltip="true" min-width="150" />
         
         <el-table-column label="合同" align="center" prop="contractName" min-width="100" />
         <el-table-column label="负责人" align="center" prop="leaderNames" min-width="110" />
         <el-table-column label="安排日期" align="center" prop="assignDate" width="110">
            <template #default="scope">
               <span v-if="scope.row.assignDate">{{ parseTime(scope.row.assignDate, '{y}-{m}-{d}') }}</span>
            </template>
         </el-table-column>
         <el-table-column label="工期要求" align="center" prop="durationRequire" width="100">
            <template #default="scope">
               <span v-if="scope.row.durationRequire != null">{{ scope.row.durationRequire }}天</span>
            </template>
         </el-table-column>
         <el-table-column label="总时长" align="center" prop="totalDuration" width="105">
            <template #default="scope">
               <!-- 办结/归档：固定显示存储值 -->
               <span v-if="scope.row.status === 'closed' || scope.row.status === 'archived'">
                  <span v-if="scope.row.totalDuration != null">{{ scope.row.totalDuration }}天</span>
                  <span v-else>-</span>
               </span>
               <!-- 进行中：按"安排日期→今天"实时计算工作日 -->
               <span v-else>
                  <span v-if="scope.row._duration != null">{{ scope.row._duration }}天</span>
                  <span v-else-if="scope.row.assignDate" class="duration-loading">计算中...</span>
                  <span v-else>-</span>
               </span>
            </template>
         </el-table-column>
         
         <el-table-column label="操作" align="center" min-width="120" class-name="small-padding fixed-width" fixed="right">
            <template #default="scope">
               <el-button link type="primary" size="small" @click="handleView(scope.row)">详情</el-button>
               <el-button link type="primary" size="small" @click="handleUpdate(scope.row)" v-if="scope.row.status !== 'closed' || checkRole(['admin'])" v-hasPermi="['project:project:edit']">修改</el-button>
               <el-button link size="small" type="primary" v-if="scope.row.status !== 'closed'" v-hasPermi="['project:project:complete']" @click="handleComplete(scope.row)">办结</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改项目对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="80%" append-to-body>
         <el-form ref="projectRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="工程编号" prop="projectCode">
                     <el-input v-model="form.projectCode" placeholder="请输入工程编号" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="16">
                  <el-form-item label="项目名称" prop="projectName">
                     <el-input v-model="form.projectName" placeholder="请输入项目名称" maxlength="200" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="工程项目" prop="engineeringProject">
                     <el-input v-model="form.engineeringProject" placeholder="请输入工程项目名称" maxlength="200" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="委托单位" prop="clientUnit">
                     <el-select v-model="form.clientUnit" filterable clearable allow-create placeholder="请选择或输入委托单位" style="width: 100%">
                        <el-option v-for="item in clientUnitOptions" :key="item" :label="item" :value="item" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="工程地点" prop="projectLocation">
                     <el-input v-model="form.projectLocation" placeholder="请输入工程地点" maxlength="300" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="联系人" prop="contactName">
                     <el-input v-model="form.contactName" placeholder="请输入联系人" maxlength="50" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="联系电话" prop="contactPhone">
                     <el-input v-model="form.contactPhone" placeholder="请输入联系电话" maxlength="30" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="负责人" prop="leaderIds">
                     <el-select v-model="form.leaderIds" multiple filterable placeholder="请选择项目负责人" style="width: 100%" @change="onLeaderChange">
                        <el-option
                           v-for="user in leaderOptions"
                           :key="user.userId"
                           :label="user.nickName"
                           :value="user.userId"
                        />
                     </el-select>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="合同" prop="contractId">
                     <el-select
                        v-model="form.contractId"
                        filterable
                        remote
                        reserve-keyword
                        placeholder="输入合同名称/编号搜索"
                        :remote-method="searchContracts"
                        :loading="contractLoading"
                        clearable
                        style="width: 100%"
                        @visible-change="onContractVisibleChange"
                     >
                        <el-option
                           v-for="item in contractOptions"
                           :key="item.id"
                           :label="item.contractNo + ' — ' + item.contractName"
                           :value="item.id"
                        />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="状态" v-if="form.id">
                     <dict-tag :options="proj_project_status" :value="form.status" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="安排日期" prop="assignDate">
                     <el-date-picker v-model="form.assignDate" value-format="YYYY-MM-DD" type="date" placeholder="选择日期" clearable style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="工期要求" prop="durationRequire">
                     <el-input-number v-model="form.durationRequire" :min="0" placeholder="天" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="总时长" prop="totalDuration">
                     <el-input
                        :model-value="durationDisplay"
                        disabled
                        title="按工作日自动计算：安排日期 → 今天（含头含尾，自动排除周末/法定节假日）；项目办结后固定"
                     />
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

            <!-- 首笔付款（可折叠） -->
            <el-divider />
            <div class="first-payment-header" @click="firstPaymentExpanded = !firstPaymentExpanded" style="cursor:pointer;display:flex;align-items:center;margin-bottom:12px;user-select:none">
               <el-icon :size="18" style="margin-right:8px;transition:transform .3s" :style="{ transform: firstPaymentExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }">
                  <ArrowRight />
               </el-icon>
               <span style="font-weight:600;font-size:14px">预付款</span>
               <el-tag v-if="firstPaymentAdvice" size="small" :type="firstPaymentAdvice.type" style="margin-left:12px">{{ firstPaymentAdvice.text }}</el-tag>
               <span v-if="selectedContractClientUnit" style="margin-left:auto;font-size:12px;color:#909399">💡 付款单位自动带入委托单位「{{ selectedContractClientUnit }}」</span>
            </div>
            <el-collapse-transition>
               <div v-show="firstPaymentExpanded" class="first-payment-panel">
                  <el-row :gutter="20">
                     <el-col :span="6">
                        <el-form-item label="付款金额" prop="firstPaymentAmount">
                           <el-input-number v-model="form.firstPaymentAmount" :min="0" :precision="2" placeholder="金额" controls-position="right" style="width: 100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="6">
                        <el-form-item label="付款时间" prop="firstPaymentTime">
                           <el-date-picker v-model="form.firstPaymentTime" value-format="YYYY-MM-DD" type="date" placeholder="选择日期" clearable style="width: 100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="6">
                     <el-form-item label="付款单位" prop="firstPaymentUnit">
                        <el-select v-model="form.firstPaymentUnit" filterable clearable allow-create placeholder="请选择或输入付款单位" style="width: 100%">
                           <el-option v-for="item in clientUnitOptions" :key="item" :label="item" :value="item" />
                        </el-select>
                     </el-form-item>
                     </el-col>
                     <el-col :span="6">
                        <el-form-item label="付款方式" prop="firstPaymentMethod">
                           <el-select v-model="form.firstPaymentMethod" clearable placeholder="请选择" style="width:100%">
                              <el-option label="银行转账" value="银行转账" />
                              <el-option label="现金" value="现金" />
                              <el-option label="支票" value="支票" />
                              <el-option label="电汇" value="电汇" />
                           </el-select>
                        </el-form-item>
                     </el-col>
                  </el-row>
               </div>
            </el-collapse-transition>
            <el-divider />
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 项目详情对话框 -->
      <el-dialog :title="'项目详情 — ' + detail.projectCode" :model-value="detailOpen" @update:model-value="detailOpen = $event" width="750px" append-to-body>
         <el-descriptions :column="2" border>
            <el-descriptions-item label="工程编号" :span="1">{{ detail.projectCode }}</el-descriptions-item>
            <el-descriptions-item label="项目名称" :span="1">{{ detail.projectName }}</el-descriptions-item>
            <el-descriptions-item label="项目类别">{{ detail.categoryName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工程项目">{{ detail.engineeringProject || '-' }}</el-descriptions-item>
            <el-descriptions-item label="委托单位">{{ detail.clientUnit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工程地点">{{ detail.projectLocation || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ detail.contactName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ detail.contactPhone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="合同">{{ detail.contractName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
               <dict-tag :options="proj_project_status" :value="detail.status" />
            </el-descriptions-item>
            <el-descriptions-item label="负责人" :span="2">{{ detail.leaderNames || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remark || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建者">{{ detail.createBy || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="修改者">{{ detail.updateBy || '-' }}</el-descriptions-item>
            <el-descriptions-item label="修改时间">{{ parseTime(detail.updateTime) }}</el-descriptions-item>
         </el-descriptions>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="detailOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 作业清单对话框 -->
      <el-dialog :title="'作业清单 — ' + currentProjectName" :model-value="taskListOpen" @update:model-value="taskListOpen = $event" width="900px" append-to-body>
         <el-table v-loading="taskLoading" :data="taskListData" stripe border max-height="500">
            <el-table-column label="任务名称" align="center" prop="taskName" :show-overflow-tooltip="true" min-width="160" />
            <el-table-column label="执行人" align="center" prop="userName" min-width="100" />
            <el-table-column label="安排日期" align="center" prop="assignDate" width="120">
               <template #default="scope">
                  <span>{{ parseTime(scope.row.assignDate, '{y}-{m}-{d}') }}</span>
               </template>
            </el-table-column>
            <el-table-column label="要求完成" align="center" prop="requiredFinishDate" width="120">
               <template #default="scope">
                  <span>{{ parseTime(scope.row.requiredFinishDate, '{y}-{m}-{d}') }}</span>
               </template>
            </el-table-column>
            <el-table-column label="实际完成" align="center" prop="actualFinishDate" width="120">
               <template #default="scope">
                  <span v-if="scope.row.actualFinishDate">{{ parseTime(scope.row.actualFinishDate, '{y}-{m}-{d}') }}</span>
                  <span v-else style="color: #c0c4cc">—</span>
               </template>
            </el-table-column>
            <el-table-column label="工期要求" align="center" prop="durationRequire" min-width="120" />
            <el-table-column label="总时长(天)" align="center" prop="totalDuration" width="100" />
            <el-table-column label="状态" align="center" prop="status" width="100">
               <template #default="scope">
                  <dict-tag :options="proj_task_status" :value="scope.row.status" />
               </template>
            </el-table-column>
            <el-table-column label="创建时间" align="center" prop="createTime" width="170">
               <template #default="scope">
                  <span>{{ parseTime(scope.row.createTime) }}</span>
               </template>
            </el-table-column>
         </el-table>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="taskListOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 状态变更对话框 -->
      <el-dialog title="变更项目状态" :model-value="statusOpen" @update:model-value="statusOpen = $event" width="420px" append-to-body>
         <el-form label-width="80px">
            <el-form-item label="项目名称">
               <span>{{ currentRow.projectName }}</span>
            </el-form-item>
            <el-form-item label="当前状态">
               <dict-tag :options="proj_project_status" :value="currentRow.status" />
            </el-form-item>
            <el-form-item label="变更为">
               <el-select v-model="targetStatus" placeholder="请选择目标状态" style="width: 100%">
                  <el-option v-for="s in allowedStatuses" :key="s.value" :label="s.label" :value="s.value" />
               </el-select>
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitStatusChange">确 定</el-button>
               <el-button @click="statusOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 区域粘贴对话框 -->
      <el-dialog title="区域粘贴录入" :model-value="pasteOpen" @update:model-value="pasteOpen = $event" width="950px" append-to-body>
         <el-alert type="info" :closable="false" style="margin-bottom: 12px">
            从 Excel 中选中一块区域（Ctrl+C），然后在此处粘贴（Ctrl+V）。点击「解析数据」后可调整列映射。
         </el-alert>
         <el-input
            v-model="pasteText"
            type="textarea"
            :rows="6"
            placeholder="工程编号(Tab)项目名称(Tab)工程项目(Tab)委托单位(Tab)联系人(Tab)联系电话(Tab)工程地点(Tab)负责人(Tab)备注&#10;从 Excel 复制后粘贴到此处..."
         />
         <div style="margin-top: 10px; text-align: right;">
            <el-button type="primary" @click="parsePasteData">解析数据</el-button>
            <el-button @click="pasteText = ''; pasteRows = []; pasteHeaders = []">清空</el-button>
         </div>
         <el-table v-if="pasteRows.length > 0" :data="pasteRows" border stripe max-height="300" style="margin-top: 12px">
            <el-table-column v-for="(header, index) in pasteHeaders" :key="index" :min-width="120" align="center">
               <template #header>
                  <el-select v-model="header.field" size="small" style="width: 130px" placeholder="选择字段">
                     <el-option v-for="opt in fieldOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
               </template>
               <template #default="scope">
                  {{ scope.row[index] }}
               </template>
            </el-table-column>
         </el-table>
         <template #footer>
            <div class="dialog-footer">
               <span v-if="pasteRows.length > 0" style="float: left; color: #909399; line-height: 32px;">共解析到 {{ pasteRows.length }} 行数据</span>
               <el-button type="primary" :disabled="pasteRows.length === 0" @click="submitPasteData">确认导入</el-button>
               <el-button @click="pasteOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 保存筛选方案对话框 -->
      <el-dialog title="保存筛选方案" :model-value="saveSchemeVisible" @update:model-value="saveSchemeVisible = $event" width="400px" append-to-body>
         <el-form label-width="80px">
            <el-form-item label="方案名称">
               <el-input v-model="schemeName" placeholder="请输入方案名称" maxlength="30" @keyup.enter="saveScheme" />
            </el-form-item>
         </el-form>
         <template #footer>
            <el-button type="primary" @click="saveScheme">保 存</el-button>
            <el-button @click="saveSchemeVisible = false">取 消</el-button>
         </template>
      </el-dialog>

      <!-- Excel导入对话框 -->
      <excel-import-dialog ref="importRef" title="项目导入" action="/project/project/importData" template-action="/project/project/importTemplate" template-file-name="project_template" update-support-label="是否更新已存在的项目数据" @success="getList" />
   </div>
</template>

<script setup name="Project">
import { listProject, getProject, addProject, updateProject, delProject, completeProject, changeProjectStatus, batchAddProject, getProjectStatusCounts, getDistinctValues } from "@/api/project/project"
import { categoryTreeselect } from "@/api/project/category"
import { listUserOptions } from "@/api/system/user"
import { listTask } from "@/api/project/task"
import { listContract } from "@/api/project/contract"
import ExcelImportDialog from "@/components/ExcelImportDialog"
import { ArrowRight } from '@element-plus/icons-vue'
import { checkRole } from "@/utils/permission"
import { countWorkdays } from "@/utils/workday"
/** 格式化日期 YYYY-MM-DD */
function fmt(d) { return d.toISOString().slice(0, 10) }

const { proxy } = getCurrentInstance()
const { proj_project_status, proj_task_status } = useDict("proj_project_status", "proj_task_status")

const projectList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const tableRef = ref(null)
/** 当前勾选的行对象（用于判断选中项是否含已办结项目） */
const currentSelection = ref([])
/** 已办结项目非超管不可修改：单选且选中已办结且非超管 → 禁用修改按钮 */
const editDisabledByClosed = computed(() =>
  currentSelection.value.length === 1
  && currentSelection.value[0].status === 'closed'
  && !checkRole(['admin'])
)
/** 已办结项目非超管不可删除：勾选范围含已办结且非超管 → 禁用删除按钮 */
const deleteDisabledByClosed = computed(() =>
  currentSelection.value.some(r => r.status === 'closed') && !checkRole(['admin'])
)
const categoryOptions = ref([])
const userOptions = ref([])
const leaderOptions = ref([])
const contractOptions = ref([])
const contractLoading = ref(false)
const detail = ref({})
const ids = ref([])
const dateRange = ref([])
const assignDateRange = ref([])
const advancedVisible = ref(false)
const statusCounts = ref({})
const savedSchemes = ref([])
const saveSchemeVisible = ref(false)
const schemeName = ref("")
const currentSchemeName = ref("")
const clientUnitOptions = ref([])
const engineeringProjectOptions = ref([])
const taskListOpen = ref(false)
const taskLoading = ref(false)
const taskListData = ref([])
const currentProjectName = ref("")

// 状态变更
const statusOpen = ref(false)
const currentRow = ref({})
const targetStatus = ref("")

// 首笔付款
const firstPaymentExpanded = ref(true)
const selectedContractClientUnit = ref("")

const STATUS_FLOW = {
   "ongoing": ["closed"],
   "closed": ["archived"],
   "archived": [],
}
const allowedStatuses = computed(() => {
   const flow = STATUS_FLOW[currentRow.value.status] || []
   return flow.map(s => {
      const dict = (proj_project_status.value || []).find(d => d.value === s)
      return { label: dict ? dict.label : s, value: s }
   })
})

// 状态胶囊数据（字典 + 计数）
const statusCapsules = computed(() => {
  const dict = proj_project_status.value || []
  const total = Object.values(statusCounts.value).reduce((sum, c) => sum + (Number(c) || 0), 0)
  const items = [{ label: '全部', value: undefined, count: total }]
  dict.forEach(d => {
    items.push({ label: d.label, value: d.value, count: statusCounts.value[d.value] || 0 })
  })
  return items
})

// 快捷时间按钮
const quickDateBtns = [
   { label: '今天', range: () => { const d = fmt(new Date()); return [d, d] } },
   { label: '本周', range: () => { const d = new Date(); const day = d.getDay(); const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return [fmt(mon), fmt(sun)] } },
   { label: '本月', range: () => [fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), fmt(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0))] },
   { label: '近7天', range: () => { const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - 6); return [fmt(start), fmt(end)] } },
   { label: '近30天', range: () => { const end = new Date(); const start = new Date(end); start.setDate(end.getDate() - 29); return [fmt(start), fmt(end)] } },
]

// 区域粘贴
const pasteOpen = ref(false)
const pasteText = ref("")
const pasteRows = ref([])
const pasteHeaders = ref([])
const fieldOptions = [
   { label: "工程编号", value: "projectCode" },
   { label: "项目名称", value: "projectName" },
   { label: "工程项目", value: "engineeringProject" },
   { label: "委托单位", value: "clientUnit" },
   { label: "联系人", value: "contactName" },
   { label: "联系电话", value: "contactPhone" },
   { label: "工程地点", value: "projectLocation" },
   { label: "负责人", value: "leaderNames" },
   { label: "备注", value: "remark" },
]

// 基于 ids 计算当前页选中状态
const checkedMap = computed(() => {
  const map = {}
  ids.value.forEach(id => { map[id] = true })
  return map
})
const isAllChecked = computed(() => {
  return projectList.value.length > 0 && projectList.value.every(row => ids.value.includes(row.id))
})
const isIndeterminate = computed(() => {
  const len = projectList.value.filter(row => ids.value.includes(row.id)).length
  return len > 0 && len < projectList.value.length
})

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    status: undefined,
    projectCategoryId: undefined,
    leaderId: undefined,
    contractId: undefined,
    projectCode: undefined,
    contactName: undefined,
    projectLocation: undefined,
    engineeringProject: undefined,
    clientUnit: undefined,
    assignDateBegin: undefined,
    assignDateEnd: undefined
  },
  rules: {
    projectCode: [{ required: true, message: "工程编号不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 首笔付款智能建议：根据合同金额给出提醒 */
const firstPaymentAdvice = computed(() => {
  const amt = form.value.firstPaymentAmount
  if (!amt || amt <= 0) return null
  const contract = contractOptions.value.find(c => c.id === form.value.contractId)
  if (!contract || !contract.contractAmount) return null
  const pct = (amt / contract.contractAmount * 100).toFixed(1)
  if (pct < 30) return { type: 'warning', text: '⚠ 首付占比 ' + pct + '%，偏低（建议≥30%）' }
  if (pct > 90) return { type: 'warning', text: '⚠ 首付占比 ' + pct + '%，偏高' }
  return { type: 'success', text: '✓ 首付占比 ' + pct + '%，合理' }
})

/** 选择合同时自动带出委托单位作为付款单位 */
watch(() => form.value.contractId, (newVal) => {
  if (newVal) {
    const contract = contractOptions.value.find(c => c.id === newVal)
    selectedContractClientUnit.value = contract ? (contract.clientUnit || '') : ''
    // 仅在新增模式且未手动填写付款单位时自动填充
    if (!form.value.id && (!form.value.firstPaymentUnit || form.value.firstPaymentUnit === '')) {
      form.value.firstPaymentUnit = contract ? (contract.clientUnit || '') : ''
    }
  } else {
    selectedContractClientUnit.value = ''
  }
})

/** 表单总时长展示：进行中按"安排日期→今天"实时计算工作日（含头含尾）；办结/归档固定显示存储值 */
const formDuration = ref(null)
const durationLoading = ref(false)
const durationDisplay = computed(() => {
  const st = form.value.status
  if (st === 'closed' || st === 'archived') {
    return form.value.totalDuration != null ? form.value.totalDuration + ' 天（已固定）' : '-'
  }
  if (!form.value.assignDate) return '-'
  if (durationLoading.value) return '计算中...'
  return formDuration.value != null ? formDuration.value + ' 天' : '-'
})

/** 实时刷新表单总时长（工作日，自动排除周末/法定节假日） */
function refreshFormDuration() {
  formDuration.value = null
  const st = form.value.status
  if (st === 'closed' || st === 'archived') return
  if (!form.value.assignDate) return
  durationLoading.value = true
  countWorkdays(form.value.assignDate, new Date())
    .then(v => { formDuration.value = v })
    .catch(err => { console.error('[项目总时长] 计算失败', err) })
    .finally(() => { durationLoading.value = false })
}

watch(() => form.value.assignDate, refreshFormDuration)

/** 模糊搜索合同（keyword 后端 OR 匹配：编号/名称/委托单位/联系人） */
function searchContracts(query) {
  contractLoading.value = true
  const params = { pageNum: 1, pageSize: 50 }
  if (query) {
    params.keyword = query
  }
  listContract(params).then(response => {
    contractOptions.value = response.rows || []
    contractLoading.value = false
  }).catch(() => { contractLoading.value = false })
}

/** 下拉框展开时加载合同列表 */
function onContractVisibleChange(visible) {
  if (visible && contractOptions.value.length === 0) {
    searchContracts("")
  }
}

/** 查询项目列表 */
function getList() {
  loading.value = true
  proxy.addDateRange(queryParams.value, dateRange.value)
  listProject(queryParams.value).then(response => {
    projectList.value = response.rows
    total.value = response.total
    loading.value = false
    refreshRowDurations()
  })
  fetchStatusCounts()
}

/** 列表进行中项目：按"安排日期→今天"实时计算工作日总时长（办结/归档不计算，显示存储值） */
function refreshRowDurations() {
  const rows = projectList.value || []
  rows.forEach(r => {
    if (r.status === 'closed' || r.status === 'archived') return
    if (!r.assignDate) {
      r._duration = null
      return
    }
    r._duration = null // 先显示"计算中..."
    countWorkdays(r.assignDate, new Date())
      .then(v => { r._duration = v })
      .catch(() => { r._duration = r.totalDuration != null ? r.totalDuration : null })
  })
}

/** 加载状态统计数据 */
function fetchStatusCounts() {
  getProjectStatusCounts().then(response => {
    const counts = {}
    const list = response.data || []
    list.forEach(item => { counts[item.status] = Number(item.cnt) || 0 })
    statusCounts.value = counts
  }).catch(() => {})
}

/** 状态胶囊点击切换 */
function toggleStatus(val) {
  if (queryParams.value.status === val) {
    queryParams.value.status = undefined
  } else {
    queryParams.value.status = val
  }
  handleQuery()
}

/** 安排日期变化 */
function onAssignDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.assignDateBegin = val[0]
    queryParams.value.assignDateEnd = val[1]
  } else {
    queryParams.value.assignDateBegin = undefined
    queryParams.value.assignDateEnd = undefined
  }
}

/** 快捷时间按钮 */
function setQuickDate(rangeFn) {
  const range = rangeFn()
  if (range) {
    assignDateRange.value = range
    onAssignDateChange(range)
    handleQuery()
  }
}

/** 筛选方案：保存当前 */
function saveScheme() {
  const name = (schemeName.value || '').trim()
  if (!name) { proxy.$modal.msgWarning('请输入方案名称'); return }
  const scheme = {}
  Object.keys(queryParams.value).forEach(k => {
    const v = queryParams.value[k]
    if (v !== undefined && v !== '' && v !== null && !(Array.isArray(v) && v.length === 0)) {
      scheme[k] = v
    }
  })
  if (dateRange.value && dateRange.value.length === 2) {
    scheme._dateRange = [...dateRange.value]
  }
  if (assignDateRange.value && assignDateRange.value.length === 2) {
    scheme._assignDateRange = [...assignDateRange.value]
  }
  const schemes = [...savedSchemes.value]
  const idx = schemes.findIndex(s => s.name === name)
  if (idx >= 0) { schemes[idx] = { name, params: scheme } }
  else { schemes.push({ name, params: scheme }) }
  localStorage.setItem('proj_filter_schemes', JSON.stringify(schemes))
  savedSchemes.value = schemes
  saveSchemeVisible.value = false
  schemeName.value = ''
  currentSchemeName.value = name
  proxy.$modal.msgSuccess('方案已保存')
}

/** 筛选方案：加载 */
function loadSavedScheme(name) {
  const scheme = savedSchemes.value.find(s => s.name === name)
  if (!scheme) return
  const p = scheme.params
  Object.keys(queryParams.value).forEach(k => {
    if (k === 'pageNum' || k === 'pageSize') return
    queryParams.value[k] = undefined
  })
  Object.entries(p).forEach(([k, v]) => {
    if (k.startsWith('_')) return
    queryParams.value[k] = v
  })
  if (p._dateRange) dateRange.value = [...p._dateRange]
  else dateRange.value = []
  if (p._assignDateRange) {
    assignDateRange.value = [...p._assignDateRange]
    onAssignDateChange(assignDateRange.value)
  } else {
    assignDateRange.value = []
    queryParams.value.assignDateBegin = undefined
    queryParams.value.assignDateEnd = undefined
  }
  handleQuery()
  currentSchemeName.value = name
}

/** 筛选方案：删除 */
function deleteScheme(name) {
  const schemes = savedSchemes.value.filter(s => s.name !== name)
  localStorage.setItem('proj_filter_schemes', JSON.stringify(schemes))
  savedSchemes.value = schemes
  if (currentSchemeName.value === name) currentSchemeName.value = ''
  proxy.$modal.msgSuccess('方案已删除')
}

/** 加载已保存的筛选方案 */
function loadSavedSchemes() {
  try {
    const raw = localStorage.getItem('proj_filter_schemes')
    if (raw) savedSchemes.value = JSON.parse(raw)
  } catch (e) { /* ignore */ }
}

/** 加载高级筛选下拉选项（委托单位、工程项目去重列表） */
function loadDistinctValues() {
  getDistinctValues('client_unit').then(res => {
    clientUnitOptions.value = (res.data || []).filter(Boolean)
  }).catch(() => {})
  getDistinctValues('engineering_project').then(res => {
    engineeringProjectOptions.value = (res.data || []).filter(Boolean)
  }).catch(() => {})
}

/** 加载类别树 */
function loadCategoryTree() {
  categoryTreeselect().then(response => {
    categoryOptions.value = response.data
  })
}

/** 加载用户列表（搜索栏用，全量） */
function loadUserList() {
  listUserOptions({ pageNum: 1, pageSize: 1000 }).then(response => {
    userOptions.value = response.rows || []
  })
}

/** 加载项目负责人列表（仅"项目经理"岗位） */
function loadLeaderList() {
  listUserOptions({ pageNum: 1, pageSize: 1000, params: { postName: '项目经理' } }).then(response => {
    leaderOptions.value = response.rows || []
  })
}

/** 负责人变化联动安排日期：首次选人填当前日期（仅空时填，不覆盖手填）；清空负责人则清空安排日期 */
function onLeaderChange(val) {
  if (val && val.length > 0) {
    if (!form.value.assignDate) {
      form.value.assignDate = proxy.parseTime(new Date(), '{y}-{m}-{d}')
    }
  } else {
    form.value.assignDate = undefined
  }
}

/** 类别树节点过滤（只展示小类可选，大类不可选） */
function filterCategoryNode(value, data) {
  if (!value) return true
  return data.label.indexOf(value) !== -1
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    id: undefined,
    projectCode: undefined,
    projectName: undefined,
    engineeringProject: undefined,
    clientUnit: undefined,
    contactName: undefined,
    contactPhone: undefined,
    projectLocation: undefined,
    contractId: undefined,
    status: "ongoing",
    leaderIds: [],
    assignDate: undefined,
    durationRequire: undefined,
    totalDuration: undefined,
    remark: undefined,
    // 首笔付款
    firstPaymentAmount: undefined,
    firstPaymentTime: undefined,
    firstPaymentUnit: undefined,
    firstPaymentMethod: undefined
  }
  proxy.resetForm("projectRef")
  firstPaymentExpanded.value = true
  selectedContractClientUnit.value = ""
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  dateRange.value = []
  assignDateRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.status = undefined
  queryParams.value.projectCategoryId = undefined
  queryParams.value.leaderId = undefined
  queryParams.value.contractId = undefined
  queryParams.value.projectCode = undefined
  queryParams.value.contactName = undefined
  queryParams.value.projectLocation = undefined
  queryParams.value.engineeringProject = undefined
  queryParams.value.clientUnit = undefined
  queryParams.value.assignDateBegin = undefined
  queryParams.value.assignDateEnd = undefined
  currentSchemeName.value = ''
  handleQuery()
}

/** 多选框选中数据 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  currentSelection.value = selection
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 全选切换 */
function handleCheckAll(checked) {
  projectList.value.forEach(row => {
    tableRef.value?.toggleRowSelection(row, checked)
  })
}

/** 单行选中切换 */
function toggleRow(row) {
  tableRef.value?.toggleRowSelection(row)
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  loadUserList()
  loadLeaderList()
  open.value = true
  title.value = "新增项目"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  loadUserList()
  loadLeaderList()
  const id = row.id || ids.value[0]
  getProject(id).then(response => {
    form.value = response.data
    if (!form.value.leaderIds) {
      form.value.leaderIds = []
    }
    // 预加载合同选项，确保已选合同能回显名称
    if (form.value.contractId) {
      searchContracts("")
    }
    open.value = true
    title.value = "修改项目"
    // 打开弹窗即按"安排日期→今天"实时计算总时长（不依赖用户重新选择日期）
    refreshFormDuration()
  })
}

/** 查看详情（跳转项目工作台） */
function handleView(row) {
  proxy.$router.push('/project/project-detail/index/' + row.id)
}

/** 查看作业清单 */
function handleTaskList(row) {
  currentProjectName.value = row.projectName
  taskListOpen.value = true
  taskLoading.value = true
  listTask({ projectId: row.id, pageNum: 1, pageSize: 1000 }).then(response => {
    taskListData.value = response.rows || []
    taskLoading.value = false
  })
}

/** 办结按钮操作 */
function handleComplete(row) {
  proxy.$modal.confirm('确认将项目"' + row.projectName + '"设为已办结吗？办结后不可撤销，该项目将出现在费用结算页面。').then(function() {
    return completeProject(row.id)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("办结成功")
  }).catch(() => {})
}

/** 状态变更 */
function handleStatusChange(row) {
   currentRow.value = row
   targetStatus.value = ""
   statusOpen.value = true
}

/** 提交状态变更 */
function submitStatusChange() {
   if (!targetStatus.value) {
      proxy.$modal.msgError("请选择目标状态")
      return
   }
   changeProjectStatus(currentRow.value.id, targetStatus.value).then(() => {
      proxy.$modal.msgSuccess("状态变更成功")
      statusOpen.value = false
      getList()
   })
}

/** 导入按钮 */
function handleImport() {
   proxy.$refs["importRef"].open()
}

/** 区域粘贴按钮 */
function handlePaste() {
   pasteText.value = ""
   pasteRows.value = []
   pasteHeaders.value = []
   pasteOpen.value = true
}

/** 解析粘贴数据 */
function parsePasteData() {
   if (!pasteText.value || !pasteText.value.trim()) {
      proxy.$modal.msgError("请先粘贴数据")
      return
   }
   const lines = pasteText.value.trim().split(/\n/).filter(l => l.trim())
   if (lines.length === 0) {
      proxy.$modal.msgError("没有有效数据")
      return
   }
   const rows = lines.map(line => line.split(/\t/))
   const headerKeywords = ["工程编号", "项目名称", "工程项目", "委托单位", "联系人", "联系电话", "工程地点", "负责人", "备注"]
   const firstRowIsHeader = rows[0].some(cell => headerKeywords.some(kw => cell.includes(kw)))
   const dataRows = firstRowIsHeader ? rows.slice(1) : rows
   pasteRows.value = dataRows
   const numCols = dataRows[0]?.length || 0
   pasteHeaders.value = []
   for (let i = 0; i < numCols; i++) {
      pasteHeaders.value.push({ field: fieldOptions[i]?.value || "", label: "第" + (i + 1) + "列" })
   }
}

/** 提交粘贴数据 */
function submitPasteData() {
   const projects = pasteRows.value.map(row => {
      const project = {}
      pasteHeaders.value.forEach((header, index) => {
         if (header.field && row[index] !== undefined) {
            project[header.field] = row[index].trim()
         }
      })
      return project
   }).filter(p => p.projectCode)
   if (projects.length === 0) {
      proxy.$modal.msgError("没有有效数据（工程编号不能为空）")
      return
   }
   batchAddProject(projects).then(response => {
      proxy.$modal.msgSuccess(response.msg)
      pasteOpen.value = false
      pasteText.value = ""
      pasteRows.value = []
      pasteHeaders.value = []
      getList()
   })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["projectRef"].validate(valid => {
    if (valid) {
      // 总时长由后端自动计算：进行中项目提交时不携带，后端按"安排日期→今天"重算；
      // 办结/归档项目保留固定值（后端跳过重算）
      const st = form.value.status
      if (st !== 'closed' && st !== 'archived') {
        form.value.totalDuration = null
      }
      if (form.value.id != undefined) {
        updateProject(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addProject(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除按钮操作 */
function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  const name = row.id ? row.projectName : "所选项目"
  proxy.$modal.confirm('是否确认删除"' + name + '"?').then(function() {
    return delProject(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download('/project/project/export', {
    ...queryParams.value
  }, `project_${new Date().getTime()}.xlsx`)
}

getList()
loadSavedSchemes()
loadCategoryTree()
loadUserList()
loadDistinctValues()
</script>

<style scoped>
/* 搜索工具栏 */
.search-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.global-search {
  flex: 1;
}
.global-search :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* 状态胶囊导航 */
.status-capsules {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 0 12px 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 0;
}
.status-label {
  font-size: 13px;
  color: #606266;
  margin-right: 4px;
}
.status-capsule {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  background: #f5f7fa;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  border: 1px solid transparent;
}
.status-capsule:hover {
  background: #ecf5ff;
  color: #409EFF;
}
.status-capsule.active {
  background: #ecf5ff;
  color: #409EFF;
  border-color: #409EFF;
  font-weight: 600;
}

/* 高级筛选折叠触发器 */
.advanced-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #ebeef5;
}
.advanced-toggle:hover {
  color: #409EFF;
}
.toggle-arrow {
  font-size: 10px;
  transition: transform 0.2s ease;
  color: #909399;
}
.toggle-arrow.is-open {
  transform: rotate(180deg);
}
.toggle-label {
  font-weight: 500;
  color: #303133;
}
.toggle-hint {
  color: #909399;
  font-size: 12px;
}

/* 高级筛选面板 */
.advanced-filter-panel {
  border-radius: 8px;
  padding: 16px 20px;
  margin: 10px 0;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px 24px;
}
.filter-item-label {
  font-size: 13px;
  margin-bottom: 6px;
}


/* 快捷日期 */
.quick-date-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
}
.quick-date-label {
  font-size: 13px;
}
.quick-date-row .el-button {
  padding: 4px 12px;
  font-size: 12px;
  background: transparent;
}
.quick-date-row .el-button:hover {
  border-color: #409EFF;
  color: #409EFF;
}

/* 分割线 */
.filter-divider {
  height: 1px;
  background: #ebeef5;
  margin: 14px 0;
}

/* 筛选方案 */
.scheme-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  position: relative;
}
.scheme-label {
  font-size: 13px;
  color: #c0c4cc;
}
.scheme-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 4px;
  font-size: 12px;
  background: #3a3a3a;
  color: #c0c4cc;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.scheme-tag:hover {
  background: #4a4a4a;
}
.scheme-tag.active {
  background: #409EFF;
  color: #fff;
  border-color: #409EFF;
}
.collapse-link {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.collapse-link:hover {
  color: #409EFF;
}
.collapse-arrow {
  font-size: 10px;
}

/* 操作栏紧凑化（保留兼容） */
.compact-ops {
  margin-top: 5px !important;
  margin-bottom: 0 !important;
}

/* 列表总时长"计算中..." */
.duration-loading {
  color: #a8abb2;
  font-size: 12px;
}
</style>
