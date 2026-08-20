<template>
   <div class="app-container">
      <!-- Row 1: 全局搜索 -->
      <div class="search-bar-row">
         <div class="search-input-wrapper">
            <el-input v-model="queryParams.keyword" placeholder="搜索合同编号/名称/委托单位/联系人..." clearable @keyup.enter="handleQuery" @clear="handleQuery" class="global-search-input">
               <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
         </div>
         <el-button type="primary" size="small" @click="handleQuery">搜索</el-button>
         <el-button size="small" @click="resetQuery">重置</el-button>
      </div>

      <!-- Row 2: 状态胶囊导航（字典驱动） -->
      <div class="status-capsule-row">
         <span
            v-for="item in statusCapsules"
            :key="item.value"
            :class="['status-capsule', { active: queryParams.status === item.value }]"
            @click="handleStatusClick(item.value)"
         >{{ item.label }}<span class="capsule-count">{{ item.count }}</span></span>
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
                  <div class="filter-item-label">合同类型</div>
                  <el-select v-model="queryParams.contractType" clearable placeholder="全部类型" style="width:100%" @change="handleQuery">
                     <el-option v-for="d in proj_contract_type" :key="d.value" :label="d.label" :value="d.value" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">委托单位</div>
                  <el-select v-model="queryParams.clientUnit" filterable clearable placeholder="全部单位" style="width:100%" @change="handleQuery">
                     <el-option v-for="u in clientUnitOptions" :key="u" :label="u" :value="u" />
                  </el-select>
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">联系人</div>
                  <el-input v-model="queryParams.contactName" placeholder="联系人" clearable @keyup.enter="handleQuery" @clear="handleQuery" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">签署日期</div>
                  <el-date-picker v-model="signDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onSignDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">委托时间</div>
                  <el-date-picker v-model="entrustDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onEntrustDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">审核日期</div>
                  <el-date-picker v-model="auditDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onAuditDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">完成日期</div>
                  <el-date-picker v-model="finishDateRange" value-format="YYYY-MM-DD" type="daterange" range-separator="-" start-placeholder="开始" end-placeholder="结束" style="width:100%" @change="onFinishDateChange" />
               </div>
               <div class="filter-item">
                  <div class="filter-item-label">合同金额</div>
                  <div style="display:flex;gap:8px;align-items:center">
                     <el-input-number v-model="queryParams.contractAmountMin" :min="0" :precision="2" controls-position="right" placeholder="最低" style="flex:1" @change="handleQuery" />
                     <span style="color:#999">~</span>
                     <el-input-number v-model="queryParams.contractAmountMax" :min="0" :precision="2" controls-position="right" placeholder="最高" style="flex:1" @change="handleQuery" />
                  </div>
               </div>
            </div>
            <!-- 快捷日期 + 方案 -->
            <div class="quick-filter-row">
               <span class="quick-label">快捷：</span>
               <span class="quick-chip" @click="setQuickDate('today')">今天</span>
               <span class="quick-chip" @click="setQuickDate('week')">本周</span>
               <span class="quick-chip" @click="setQuickDate('month')">本月</span>
               <span class="quick-chip" @click="setQuickDate('7days')">近7天</span>
               <span class="quick-chip" @click="setQuickDate('30days')">近30天</span>
               <el-divider direction="vertical" />
               <span class="quick-label">方案：</span>
               <span v-for="s in savedSchemes" :key="s.name" class="quick-chip scheme-chip" @click="activateScheme(s)">{{ s.name }}</span>
               <span class="quick-chip scheme-chip" @click="saveSchemeVisible = true">+ 保存当前</span>
               <span class="collapse-link" @click="advancedVisible = false">收起 ▲</span>
            </div>
         </div>
      </el-collapse-transition>

      <!-- Row 5: 操作按钮行 -->
      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" size="small" @click="handleAdd" v-hasPermi="['project:contract:add']">新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" size="small" :disabled="single" @click="handleUpdate" v-hasPermi="['project:contract:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" size="small" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:contract:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5" style="margin-left:auto;display:flex;gap:8px;align-items:center">
            <el-button v-if="false" type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:contract:export']">导出</el-button>
            <right-toolbar size="small" v-model:showSearch="showSearch" :columns="columns" storage-key="contract-list-columns" @queryTable="getList" />
         </el-col>
      </el-row>

      <!-- 保存方案弹窗 -->
      <el-dialog v-model="saveSchemeVisible" title="保存筛选方案" width="400px" append-to-body>
         <el-input v-model="schemeName" placeholder="请输入方案名称" maxlength="20" />
         <template #footer>
            <el-button @click="saveSchemeVisible = false">取消</el-button>
            <el-button type="primary" @click="saveScheme" :disabled="!schemeName">保存</el-button>
         </template>
      </el-dialog>

      <el-table v-loading="loading" :data="contractList" stripe border @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column v-for="col in visibleColumns" :key="col.key" align="center" :prop="col.prop" :show-overflow-tooltip="true" :min-width="colWidth(col)">
            <template #header>
               <!-- 合同金额列头：万元/元切换 -->
               <span v-if="col.key === 'contractAmount'">
                  合同金额
                  <el-button link type="primary" size="small" @click="amountUnit = amountUnit === 'wan' ? 'yuan' : 'wan'" style="margin-left:2px">
                     {{ amountUnit === 'wan' ? '万元' : '元' }}
                  </el-button>
               </span>
               <span v-else>{{ col.label }}</span>
            </template>
            <template #default="scope">
               <!-- 金额字段：万元/元切换格式化 -->
               <span v-if="col.type === 'money'">
                  <span v-if="scope.row[col.prop] != null">{{ formatAmount(scope.row[col.prop], amountUnit) }}</span>
               </span>
               <!-- 关联项目数：点击查看关联项目 -->
               <span v-else-if="col.key === 'projectCount'">
                  <el-button link type="primary" size="small" @click="handleShowProjects(scope.row)">
                     {{ scope.row.projectCount || 0 }} 个项目 ▸
                  </el-button>
               </span>
               <!-- 付款进度：进度条 + popover 明细 -->
               <span v-else-if="col.type === 'progress'">
                  <template v-if="scope.row.projectCount > 0 && scope.row.paidCount > 0">
                     <el-popover placement="bottom" :width="500" trigger="hover" :show-after="200" popper-class="payment-popover">
                        <template #reference>
                           <div class="payment-progress-cell" style="cursor:pointer" @click="openContractSettlement(scope.row)">
                              <div class="payment-bar-wrap">
                                 <div class="payment-bar" :style="{ width: paymentPercent(scope.row) + '%' }"></div>
                              </div>
                              <span class="payment-summary">{{ scope.row.paidCount }}笔 / ¥{{ fmtWan(scope.row.paidTotal) }}</span>
                           </div>
                        </template>
                        <div class="popover-payment-detail">
                           <div class="popover-title">付款明细</div>
                           <div v-for="(pay, idx) in (scope.row.paidList || [])" :key="pay.paymentId" class="pay-item">
                              <span class="pay-index">{{ idx + 1 }}</span>
                              <span class="pay-time">{{ parseDate(pay.payTime) }}</span>
                              <el-tag size="small" :type="paymentTypeTag(pay.paymentType)">{{ paymentTypeLabel(pay.paymentType) }}</el-tag>
                              <span class="pay-amount">¥{{ fmtWan(pay.amount) }}</span>
                              <span class="pay-unit">{{ pay.payUnit }}</span>
                              <span class="pay-project">{{ pay.projectCode }}</span>
                           </div>
                           <div class="popover-summary" v-if="scope.row.contractAmount">
                              合计 ¥{{ fmtWan(scope.row.paidTotal) }} / 合同总额 ¥{{ fmtWan(scope.row.contractAmount) }}（{{ paymentPercent(scope.row) }}%）
                           </div>
                        </div>
                     </el-popover>
                  </template>
               </span>
               <!-- 附件：popover 预览 -->
               <span v-else-if="col.type === 'attachment'">
                  <el-popover
                     v-if="scope.row.attachmentCount > 0"
                     placement="bottom"
                     :width="320"
                     trigger="hover"
                     :show-after="300"
                  >
                     <template #reference>
                        <el-button link type="primary" @click.stop="openSidePanel(scope.row)">
                           <el-icon size="14"><Paperclip /></el-icon>
                           {{ scope.row.attachmentCount }} 个附件 ▸
                        </el-button>
                     </template>
                     <div class="attachment-popover">
                        <div style="font-weight:600;margin-bottom:8px;font-size:13px">合同附件预览</div>
                        <div v-for="att in scope.row._attachments" :key="att.id" class="popover-att-item">
                           <el-icon size="14" :color="getFileIconColor(att.fileType)"><Document /></el-icon>
                           <span style="flex:1;font-size:13px">{{ att.fileName }}</span>
                           <el-tag v-if="att.isFinal==='1'" size="small" type="success">盖章版</el-tag>
                        </div>
                        <div v-if="scope.row.attachmentCount > 5" style="margin-top:8px;text-align:center;color:#909399;font-size:12px">
                           还有 {{ scope.row.attachmentCount - 5 }} 个附件...
                        </div>
                     </div>
                  </el-popover>
                  <span v-else style="color:#c0c4cc;font-size:13px">无附件</span>
               </span>
               <!-- 字典标签：按列 key 选择对应字典 -->
               <template v-else-if="col.type === 'dict'">
                  <template v-if="col.key === 'contractType'">
                     <dict-tag :options="proj_contract_type" :value="scope.row[col.prop]" />
                  </template>
                  <template v-else>
                     <dict-tag v-if="scope.row.status" :options="d('proj_contract_status')" :value="scope.row.status" />
                     <span v-else style="color: #c0c4cc">草稿</span>
                  </template>
               </template>
               <!-- 日期字段：创建/更新时间含时分秒 -->
               <span v-else-if="col.type === 'date' && scope.row[col.prop]">{{ col.key === 'createTime' || col.key === 'updateTime' ? parseTime(scope.row[col.prop]) : parseDate(scope.row[col.prop]) }}</span>
               <!-- 动态字段：从 extra_data JSONB 取值 -->
               <span v-else-if="col.type === 'dynamic'"><span v-if="scope.row.extraData && scope.row.extraData[col.key] != null">{{ scope.row.extraData[col.key] }}</span></span>
               <!-- 其他：直接显示 -->
               <span v-else>{{ scope.row[col.prop] }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" min-width="140" fixed="right" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" @click="handleView(scope.row)">详情</el-button>
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['project:contract:edit']">修改</el-button>
               <el-dropdown @command="(cmd) => handleCommand(cmd, scope.row)" style="vertical-align: middle">
                  <div>
                     <el-button link type="primary">更多▾</el-button>
                  </div>
                  <template #dropdown>
                     <el-dropdown-menu>
                        <el-dropdown-item command="status" icon="Switch">状态变更</el-dropdown-item>
                        <el-dropdown-item command="delete" icon="Delete" style="color: #f56c6c" v-hasPermi="['project:contract:remove']">删除</el-dropdown-item>
                     </el-dropdown-menu>
                  </template>
               </el-dropdown>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改合同对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="80%" append-to-body>
         <el-tabs v-model="activeTab">
            <el-tab-pane label="基本信息" name="info">
               <el-form ref="contractRef" :model="form" :rules="rules" label-width="90px">
                  <el-row :gutter="20">
                     <el-col :span="8">
                        <el-form-item label="合同编号" prop="contractNo">
                           <el-input v-model="form.contractNo" placeholder="请输入编号（不含前缀）" maxlength="50">
                              <template #prepend v-if="contractPrefix">{{ contractPrefix }}</template>
                           </el-input>
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="合同名称" prop="contractName">
                           <el-input v-model="form.contractName" placeholder="请输入合同名称" maxlength="200" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="合同类型" prop="contractType">
                           <el-select v-model="form.contractType" placeholder="请选择合同类型" style="width: 100%">
                              <el-option v-for="d in proj_contract_type" :key="d.value" :label="d.label" :value="d.value" />
                           </el-select>
                        </el-form-item>
                     </el-col>
                  </el-row>
                  <el-row :gutter="20">
                     <el-col :span="8">
                        <el-form-item label="合同金额" prop="contractAmount">
                           <el-input-number v-model="form.contractAmount" placeholder="请输入合同金额" :precision="2" :min="0" controls-position="right" style="width: 100%" />
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
                        <el-form-item label="合同期限" prop="contractPeriod">
                           <el-input v-model="form.contractPeriod" placeholder="请输入合同期限" maxlength="100" />
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
                        <el-form-item label="签署日期" prop="signDate">
                           <el-date-picker v-model="form.signDate" type="date" placeholder="选择签署日期" value-format="YYYY-MM-DD" style="width: 100%" />
                        </el-form-item>
                     </el-col>
                  </el-row>
                  <el-row :gutter="20">
                     <el-col :span="8">
                        <el-form-item label="登记时间" prop="entrustDate">
                           <el-date-picker v-model="form.entrustDate" type="date" placeholder="选择委托时间" value-format="YYYY-MM-DD" style="width: 100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="审核日期" prop="auditDate">
                           <el-date-picker v-model="form.auditDate" type="date" placeholder="选择审核日期" value-format="YYYY-MM-DD" style="width: 100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="返回日期" prop="returnDate">
                           <el-date-picker v-model="form.returnDate" type="date" placeholder="选择用户返回日期" value-format="YYYY-MM-DD" style="width: 100%" />
                        </el-form-item>
                     </el-col>
                  </el-row>
                  <el-row :gutter="20">
                     <el-col :span="8">
                        <el-form-item label="完成日期" prop="finishDate">
                           <el-date-picker v-model="form.finishDate" type="date" placeholder="选择完成日期" value-format="YYYY-MM-DD" style="width: 100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="归档日期" prop="archiveDate">
                           <el-date-picker v-model="form.archiveDate" type="date" placeholder="选择归档日期" value-format="YYYY-MM-DD" style="width: 100%" />
                        </el-form-item>
                     </el-col>
                     <el-col :span="8">
                        <el-form-item label="存储目录" prop="archivePath">
                           <el-input v-model="form.archivePath" placeholder="请输入存储目录路径" maxlength="500" />
                        </el-form-item>
                     </el-col>
                  </el-row>
                  <el-row :gutter="20" v-if="form.status">
                     <el-col :span="8">
                        <el-form-item label="当前状态">
                           <dict-tag :options="d('proj_contract_status')" :value="form.status" />
                        </el-form-item>
                     </el-col>
                  </el-row>
                  <el-row :gutter="20">
                     <el-col :span="24">
                        <el-form-item label="支付条件" prop="paymentTerms">
                           <el-input v-model="form.paymentTerms" type="textarea" placeholder="请输入支付条件" maxlength="2000" :rows="3" />
                        </el-form-item>
                     </el-col>
                  </el-row>
                  <el-row :gutter="20">
                     <el-col :span="24">
                        <el-form-item label="备注" prop="remark">
                           <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" maxlength="500" :rows="2" />
                        </el-form-item>
                     </el-col>
                  </el-row>
               </el-form>
            </el-tab-pane>

            <!-- 合同单价 Tab -->
            <el-tab-pane label="合同单价" name="price">
               <div style="margin-bottom: 8px; color: #909399; font-size: 13px;">
                  仅展示外部计费方式，按计费类别填写合同单价，保存随合同一起提交
               </div>
               <el-table
                  v-loading="priceLoading"
                  :data="priceTableData"
                  row-key="categoryId"
                  :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
                  border
                  stripe
                  size="default"
                  default-expand-all
                  max-height="430"
               >
                  <el-table-column prop="categoryName" label="项目类别 / 计费类别" min-width="220">
                     <template #default="scope">
                        <span v-if="scope.row.categoryLevel === 1" style="font-weight: 600;">{{ scope.row.categoryName }}</span>
                        <span v-else-if="scope.row.categoryLevel === 2" style="padding-left: 12px;">{{ scope.row.categoryName }}</span>
                        <span v-else style="padding-left: 28px; color: #606266;">{{ scope.row.billingCategory }}</span>
                     </template>
                  </el-table-column>
                  <el-table-column prop="categoryLevel" label="层级" width="70" align="center">
                     <template #default="scope">
                        <el-tag v-if="scope.row.categoryLevel === 1" size="small" disable-transitions>大类</el-tag>
                        <el-tag v-else-if="scope.row.categoryLevel === 2" type="info" size="small" disable-transitions>小类</el-tag>
                        <el-tag v-else type="warning" size="small" disable-transitions>计费</el-tag>
                     </template>
                  </el-table-column>
                  <el-table-column prop="dictUnitPrice" label="字典单价" width="120" align="right">
                     <template #default="scope">
                        <span v-if="scope.row.billingId">{{ scope.row.dictUnitPrice }}</span>
                     </template>
                  </el-table-column>
                  <el-table-column prop="priceUnit" label="计价单位" width="120" align="center">
                     <template #default="scope">
                        <span v-if="scope.row.billingId">{{ scope.row.priceUnit }}</span>
                     </template>
                  </el-table-column>
                  <el-table-column prop="minQuantity" label="起步量" width="100" align="right">
                     <template #default="scope">
                        <span v-if="scope.row.billingId">{{ scope.row.minQuantity }}</span>
                     </template>
                  </el-table-column>
                  <el-table-column label="合同单价" width="180" align="center">
                     <template #default="scope">
                        <template v-if="scope.row.billingId">
                           <el-input-number
                              v-model="scope.row.price"
                              :min="0"
                              :precision="2"
                              :step="10"
                              size="small"
                              style="width: 150px"
                              placeholder="请输入单价"
                              controls-position="right"
                           />
                        </template>
                     </template>
                  </el-table-column>
               </el-table>
            </el-tab-pane>

            <!-- 附件管理 Tab -->
            <el-tab-pane label="附件资料" name="attachment">
               <div class="attachment-manager">
                  <div
                     class="attachment-dropzone"
                     :class="{ 'is-dragover': dragOver }"
                     @dragover.prevent="dragOver = true"
                     @dragleave.prevent="dragOver = false"
                     @drop.prevent="onFileDrop($event)"
                  >
                     <div class="dz-content">
                        <el-icon :size="32" color="#909399"><UploadFilled /></el-icon>
                        <p>拖拽文件到此处上传，或 Ctrl+V 粘贴截图</p>
                        <p class="dz-hint">支持 PDF / Word / Excel / 图片（≤50MB）</p>
                        <div class="upload-row">
                           <span class="upload-label">上传为：</span>
                           <el-select v-model="uploadCategory" size="small" style="width:130px">
                              <el-option v-for="c in fileCategoryDict" :key="c.value" :label="c.label" :value="c.value" />
                           </el-select>
                           <el-switch v-model="uploadIsFinal" size="small" active-text="盖章版" inactive-text="普通" />
                           <input type="file" ref="hiddenFileInput" style="display:none"
                                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.xls,.xlsx"
                                  @change="onFileSelected" />
                           <el-button size="small" type="primary" @click="triggerFileInput">选择文件</el-button>
                        </div>
                     </div>
                  </div>

                  <div v-if="attachmentList.length > 0" style="margin-top:16px">
                     <div v-for="att in attachmentList" :key="att.id" class="attachment-slot">
                        <div class="slot-header">
                           <div class="slot-title">
                              <el-icon size="16"><Folder /></el-icon>
                              <span>{{ getCategoryLabel(att.fileCategory) }}</span>
                              <el-tag size="small" type="success" v-if="att.isFinal === '1'">盖章版</el-tag>
                              <span class="version-badge">v{{ att.version }}</span>
                           </div>
                           <div class="slot-actions">
                              <el-button link type="primary" size="small" @click="handleReplaceAttachment(att)">上传新版本</el-button>
                              <el-button link type="primary" size="small" @click="previewAttachment(att)">预览</el-button>
                              <el-button link type="danger" size="small" @click="handleDeleteAttachment(att)">删除</el-button>
                           </div>
                        </div>
                        <div class="slot-file-row">
                           <div class="file-info">
                              <el-icon :size="20" :color="getFileIconColor(att.fileType)"><Document /></el-icon>
                              <span class="file-name">{{ att.fileName }}</span>
                              <span class="file-meta">{{ formatFileSize(att.fileSize) }} · {{ att.fileType }}</span>
                           </div>
                           <el-button link type="info" size="small" @click="toggleHistory(att)">
                              📜 历史版本 ({{ att.version }})
                           </el-button>
                        </div>
                        <div v-if="historyMap[att.id] !== undefined" class="history-panel">
                           <el-table :data="historyMap[att.id]" border size="small" max-height="200">
                              <el-table-column label="版本" width="70" align="center">
                                 <template #default="scope">
                                    <el-tag :type="scope.row.version === att.version ? '' : 'info'" size="small">
                                       v{{ scope.row.version }}
                                       <span v-if="scope.row.version === att.version"> (当前)</span>
                                    </el-tag>
                                 </template>
                              </el-table-column>
                              <el-table-column label="文件名" prop="fileName" min-width="140" show-overflow-tooltip />
                              <el-table-column label="操作类型" width="80" align="center">
                                 <template #default="scope">
                                    <el-tag size="small" :type="actionTagType(scope.row.action)">{{ actionLabel(scope.row.action) }}</el-tag>
                                 </template>
                              </el-table-column>
                              <el-table-column label="操作时间" width="140" align="center">
                                 <template #default="scope">{{ parseTime(scope.row.operateTime) }}</template>
                              </el-table-column>
                              <el-table-column label="大小" width="80" align="right">
                                 <template #default="scope">{{ formatFileSize(scope.row.fileSize) }}</template>
                              </el-table-column>
                              <el-table-column label="操作" width="140" align="center">
                                 <template #default="scope">
                                    <el-button link type="primary" size="small" @click="previewAttachmentHistory(att, scope.row)">预览</el-button>
                                    <el-button v-if="scope.row.version !== att.version" link type="warning" size="small" @click="handleRestore(att, scope.row)">恢复</el-button>
                                 </template>
                              </el-table-column>
                           </el-table>
                        </div>
                     </div>
                  </div>
                  <el-empty v-else description="暂无附件，拖拽文件到上方区域上传" />
               </div>
            </el-tab-pane>
         </el-tabs>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" :loading="priceSaving" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 合同详情对话框 -->
      <el-dialog :title="'合同详情 — ' + detail.contractNo" :model-value="detailOpen" @update:model-value="detailOpen = $event" width="80%" append-to-body>
         <el-tabs v-model="detailActiveTab">
            <el-tab-pane label="基本信息" name="info">
               <el-descriptions :column="2" border>
                  <el-descriptions-item label="合同编号" :span="1">{{ detail.contractNo }}</el-descriptions-item>
                  <el-descriptions-item label="合同名称" :span="1">{{ detail.contractName }}</el-descriptions-item>
                  <el-descriptions-item label="合同类型"><dict-tag :options="proj_contract_type" :value="detail.contractType" /></el-descriptions-item>
                  <el-descriptions-item label="合同状态">
                     <dict-tag v-if="detail.status" :options="d('proj_contract_status')" :value="detail.status" />
                     <span v-else>草稿</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="合同金额">{{ detail.contractAmount != null ? formatAmount(detail.contractAmount, amountUnit) : '' }}</el-descriptions-item>
                  <el-descriptions-item label="委托单位">{{ detail.clientUnit }}</el-descriptions-item>
                  <el-descriptions-item label="合同期限">{{ detail.contractPeriod }}</el-descriptions-item>
                  <el-descriptions-item label="联系人">{{ detail.contactName }}</el-descriptions-item>
                  <el-descriptions-item label="联系电话">{{ detail.contactPhone }}</el-descriptions-item>
                  <el-descriptions-item label="签署日期">{{ parseDate(detail.signDate) }}</el-descriptions-item>
                  <el-descriptions-item label="登记时间">{{ parseDate(detail.entrustDate) }}</el-descriptions-item>
                  <el-descriptions-item label="审核日期">{{ parseDate(detail.auditDate) }}</el-descriptions-item>
                  <el-descriptions-item label="返回日期">{{ parseDate(detail.returnDate) }}</el-descriptions-item>
                  <el-descriptions-item label="完成日期">{{ parseDate(detail.finishDate) }}</el-descriptions-item>
                  <el-descriptions-item label="归档日期">{{ parseDate(detail.archiveDate) }}</el-descriptions-item>
                  <el-descriptions-item label="存储目录" :span="2">{{ detail.archivePath }}</el-descriptions-item>
                  <el-descriptions-item label="支付条件" :span="2">{{ detail.paymentTerms }}</el-descriptions-item>
                  <el-descriptions-item label="备注" :span="2">{{ detail.remark }}</el-descriptions-item>
                  <el-descriptions-item label="创建者">{{ detail.createBy }}</el-descriptions-item>
                  <el-descriptions-item label="创建时间">{{ parseTime(detail.createTime) }}</el-descriptions-item>
                  <el-descriptions-item label="修改者">{{ detail.updateBy }}</el-descriptions-item>
                  <el-descriptions-item label="修改时间">{{ parseTime(detail.updateTime) }}</el-descriptions-item>
               </el-descriptions>
            </el-tab-pane>
            <el-tab-pane label="合同单价" name="price">
               <div v-if="detailPriceList.length > 0">
                  <el-table :data="detailPriceList" border size="small" max-height="400">
                     <el-table-column label="大类" align="center" prop="parentName" min-width="120" :show-overflow-tooltip="true" />
                     <el-table-column label="项目类别" align="center" prop="categoryName" min-width="140" :show-overflow-tooltip="true" />
                     <el-table-column label="计费类别" align="center" prop="billingCategory" min-width="120" :show-overflow-tooltip="true" />
                     <el-table-column label="字典单价" align="right" prop="dictUnitPrice" min-width="100">
                        <template #default="scope">
                           <span v-if="scope.row.dictUnitPrice">¥{{ Number(scope.row.dictUnitPrice).toFixed(2) }}</span>
                        </template>
                     </el-table-column>
                     <el-table-column label="计价单位" align="center" prop="priceUnit" min-width="100" />
                     <el-table-column label="合同单价" align="center" min-width="120">
                        <template #default="scope">
                           <span style="font-weight: 600; color: #409EFF;">¥{{ Number(scope.row.price).toFixed(2) }}</span>
                        </template>
                     </el-table-column>
                  </el-table>
               </div>
               <el-empty v-else description="暂无合同单价数据" />
            </el-tab-pane>

            <el-tab-pane label="附件资料" name="attachment">
               <div v-if="detailAttachmentList.length > 0">
                  <el-table :data="detailAttachmentList" border size="small" max-height="400">
                     <el-table-column label="文件" align="left" min-width="200">
                        <template #default="scope">
                           <div style="display:flex;align-items:center;gap:8px">
                              <el-icon :size="20" :color="getFileIconColor(scope.row.fileType)"><Document /></el-icon>
                              <span>{{ scope.row.fileName }}</span>
                           </div>
                        </template>
                     </el-table-column>
                     <el-table-column label="分类" align="center" prop="fileCategory" min-width="100">
                        <template #default="scope">
                           {{ getCategoryLabel(scope.row.fileCategory) }}
                        </template>
                     </el-table-column>
                     <el-table-column label="标记" align="center" min-width="80">
                        <template #default="scope">
                           <el-tag v-if="scope.row.isFinal === '1'" size="small" type="success">盖章版</el-tag>
                        </template>
                     </el-table-column>
                     <el-table-column label="版本" align="center" min-width="60" prop="version">
                        <template #default="scope">v{{ scope.row.version }}</template>
                     </el-table-column>
                     <el-table-column label="大小" align="right" min-width="80">
                        <template #default="scope">{{ formatFileSize(scope.row.fileSize) }}</template>
                     </el-table-column>
                     <el-table-column label="操作" align="center" min-width="120">
                        <template #default="scope">
                           <el-button link type="primary" size="small" @click="previewAttachment(scope.row)">预览</el-button>
                           <el-button link type="primary" size="small" @click="downloadAttachment(scope.row)">下载</el-button>
                        </template>
                     </el-table-column>
                  </el-table>
               </div>
               <el-empty v-else description="暂无附件" />
            </el-tab-pane>
         </el-tabs>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="detailOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 状态变更弹窗 -->
      <el-dialog title="状态变更" :model-value="statusOpen" @update:model-value="statusOpen = $event" width="500px" append-to-body>
         <el-form :model="statusForm" label-width="100px">
            <el-form-item label="当前状态">
               <dict-tag :options="d('proj_contract_status')" :value="statusForm.currentStatus" />
            </el-form-item>
            <el-form-item label="变更为">
               <el-select v-model="statusForm.targetStatus" placeholder="请选择目标状态" style="width: 100%">
                  <el-option
                     v-for="s in statusForm.allowedStatuses"
                     :key="s"
                     :label="getDictLabel(d('proj_contract_status'), s)"
                     :value="s"
                  />
               </el-select>
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitStatusChange" :loading="statusSubmitting">确 定</el-button>
               <el-button @click="statusOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 关联项目弹窗 -->
      <el-dialog :title="'关联项目 — ' + currentContractName" :model-value="projectsOpen" @update:model-value="projectsOpen = $event" width="80%" append-to-body>
         <el-table :data="projectList" stripe border max-height="450">
            <el-table-column label="工程编号" align="center" prop="project_code" min-width="140" :show-overflow-tooltip="false" />
            <el-table-column label="委托单位" align="center" prop="client_unit" min-width="160" :show-overflow-tooltip="false" />
            <el-table-column label="联系人" align="center" prop="contact_name" min-width="100" :show-overflow-tooltip="false" />
            <el-table-column label="联系电话" align="center" prop="contact_phone" min-width="130" :show-overflow-tooltip="false" />
            <el-table-column label="工程项目" align="center" prop="engineering_project" min-width="180" :show-overflow-tooltip="false" />
            <el-table-column label="工程地点" align="center" prop="project_location" min-width="160" :show-overflow-tooltip="false" />
            <el-table-column label="状态" align="center" prop="status" min-width="90">
               <template #default="scope">
                  <dict-tag v-if="scope.row.status" :options="d('proj_project_status')" :value="scope.row.status" />
               </template>
            </el-table-column>
         </el-table>
         <template #footer>
            <div class="dialog-footer">
               <el-button @click="projectsOpen = false">关 闭</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 附件侧滑预览面板 -->
      <el-drawer
         v-model="attachmentPreviewVisible"
         :title="attachmentPreviewTitle"
         direction="rtl"
         size="45%"
         :before-close="closeSidePanel"
      >
         <div v-if="attachmentPreviewList.length > 0" class="side-panel-body">
            <div v-for="att in attachmentPreviewList" :key="att.id" class="side-att-card">
               <div class="side-att-header">
                  <div class="side-att-title">
                     <el-icon size="18" :color="getFileIconColor(att.fileType)">
                        <Document />
                     </el-icon>
                     <span>{{ getCategoryLabel(att.fileCategory) }}</span>
                     <el-tag v-if="att.isFinal === '1'" size="small" type="success">盖章版</el-tag>
                     <span style="color:#909399;font-size:12px">v{{ att.version }}</span>
                  </div>
                  <div class="side-att-actions">
                     <el-button link type="primary" size="small" @click="previewAttachment(att)">预览</el-button>
                     <el-button link type="primary" size="small" @click="downloadAttachment(att)">下载</el-button>
                     <el-button link type="info" size="small" @click="toggleSideHistory(att)">
                        🕐 历史
                     </el-button>
                  </div>
               </div>
               <div class="side-att-file">
                  <span class="file-name">{{ att.fileName }}</span>
                  <span class="file-meta">{{ formatFileSize(att.fileSize) }} · {{ att.fileType }}</span>
               </div>
               <!-- 历史版本列表 -->
               <div v-if="sideHistoryMap[att.id] !== undefined" class="side-history-panel">
                  <el-table :data="sideHistoryMap[att.id]" border size="small" max-height="200">
                     <el-table-column label="版本" width="70" align="center">
                        <template #default="scope">
                           <el-tag size="small" :type="scope.row.version === att.version ? '' : 'info'">
                              v{{ scope.row.version }}
                           </el-tag>
                        </template>
                     </el-table-column>
                     <el-table-column label="文件名" prop="fileName" min-width="120" show-overflow-tooltip />
                     <el-table-column label="操作时间" width="130" align="center">
                        <template #default="scope">{{ parseTime(scope.row.operateTime) }}</template>
                     </el-table-column>
                     <el-table-column label="操作" width="120" align="center">
                        <template #default="scope">
                           <el-button link type="primary" size="small" @click="previewAttachmentHistory(att, scope.row)">查看</el-button>
                           <el-button v-if="scope.row.version !== att.version" link type="warning" size="small" @click="handleRestore(att, scope.row)">恢复</el-button>
                        </template>
                     </el-table-column>
                  </el-table>
               </div>
            </div>
         </div>
         <el-empty v-else description="暂无附件" />
      </el-drawer>
      <!-- 付款结算详情弹窗 -->
      <el-dialog
         :model-value="paymentDialogVisible"
         @update:model-value="paymentDialogVisible = $event"
         :title="paymentDialogTitle"
         width="80%"
         destroy-on-close
      >
         <div v-if="paymentDialogRow">
            <!-- 合同基本信息 -->
            <div style="background:#f5f7fa;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:32px;flex-wrap:wrap">
               <span><span style="color:#909399">合同：</span><strong>{{ paymentDialogRow.contractName || '-' }}</strong></span>
               <span><span style="color:#909399">编号：</span>{{ paymentDialogRow.contractNo || '-' }}</span>
               <span><span style="color:#909399">金额：</span><strong>¥{{ formatAmount(paymentDialogRow.contractAmount) }}</strong></span>
               <span><span style="color:#909399">已付：</span><strong style="color:#e6a23c">{{ paymentDialogRow.paidCount || 0 }}笔 / ¥{{ formatAmount(paymentDialogRow.paidTotal) }}</strong>（{{ paymentPercent(paymentDialogRow) }}%）</span>
            </div>
            <!-- 付款明细列表 -->
            <el-table :data="paymentDialogRow.paidList || []" border stripe size="small" max-height="400" style="width:100%">
               <el-table-column label="#" width="45" align="center" type="index" fixed="left" />
               <el-table-column label="工程编号" prop="projectCode" min-width="120" />
               <el-table-column label="委托单位" prop="clientUnit" min-width="130" />
               <el-table-column label="联系人" prop="contactName" min-width="80" />
               <el-table-column label="联系电话" prop="contactPhone" min-width="120" />
               <el-table-column label="工程项目" min-width="130">
                  <template #default="scope">
                     {{ scope.row.engineeringProject || scope.row.projectName || '-' }}
                  </template>
               </el-table-column>
               <el-table-column label="工程地点" prop="projectLocation" min-width="130" />
               <el-table-column label="付款类型" min-width="90" align="center">
                  <template #default="scope">
                     <el-tag size="small" :type="paymentTypeTag(scope.row.paymentType)">{{ paymentTypeLabel(scope.row.paymentType) }}</el-tag>
                  </template>
               </el-table-column>
               <el-table-column label="付款金额" min-width="110" align="right">
                  <template #default="scope">
                     <span style="font-weight:600;color:#e6a23c">¥{{ formatAmount(scope.row.amount) }}</span>
                  </template>
               </el-table-column>
               <el-table-column label="付款单位" prop="payUnit" min-width="130" />
               <el-table-column label="付款时间" width="110" align="center">
                  <template #default="scope">{{ parseDate(scope.row.payTime) }}</template>
               </el-table-column>
            </el-table>
            <div v-if="!paymentDialogRow.paidList || paymentDialogRow.paidList.length === 0" style="text-align:center;padding:40px 0;color:#909399">暂无付款记录</div>
         </div>
         <template #footer>
            <el-button @click="paymentDialogVisible = false">关闭</el-button>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="Contract">
import { listContract, getContract, addContract, updateContract, delContract, changeContractStatus, getContractProjects, getContractStatusCounts, getContractColumns } from "@/api/project/contract"
import { listContractPrice, saveContractPrice } from "@/api/project/contractPrice"
import { getConfigKey } from "@/api/system/config"
import { getDistinctValues } from "@/api/project/project"
import { listAttachments, uploadAttachment, deleteAttachment, getAttachmentHistory, restoreVersion } from "@/api/project/contractAttachment"
import { UploadFilled, Folder, Document, Paperclip, Search } from '@element-plus/icons-vue'
import request from '@/utils/request'
import cache from '@/plugins/cache'

const { proxy } = getCurrentInstance()

// 字典
const dicts = useDict("proj_contract_status", "proj_project_status", "proj_contract_type", "proj_attachment_category")
const { proj_contract_type, proj_attachment_category } = dicts

/** 安全获取字典选项 */
function d(key) {
  const src = unref(dicts) || {}
  return unref(src[key]) || []
}

const contractList = ref([])
const open = ref(false)
const detailOpen = ref(false)
const statusOpen = ref(false)
const projectsOpen = ref(false)
const loading = ref(true)
const showSearch = ref(true)
/** 表格列显隐配置（后端接口动态加载；序号、操作列固定不参与） */
const columns = ref({})
/** 当前可见列（按接口返回顺序过滤） */
const visibleColumns = computed(() => Object.values(columns.value).filter(c => c.visible))
const COLUMNS_STORAGE_KEY = 'contract-list-columns'
/** 兜底清单：后端接口不可用（如后端未重启）时使用，保证表格不退化（与后端 getListColumns 默认可见列一致） */
const FALLBACK_COLUMNS = [
  { key: 'contractNo', label: '合同编号', type: 'text', group: 'business', prop: 'contractNo', defaultVisible: true },
  { key: 'contractName', label: '合同名称', type: 'text', group: 'business', prop: 'contractName', defaultVisible: true },
  { key: 'clientUnit', label: '委托单位', type: 'text', group: 'business', prop: 'clientUnit', defaultVisible: true },
  { key: 'contractType', label: '合同类型', type: 'dict', group: 'business', prop: 'contractType', defaultVisible: true },
  { key: 'contractAmount', label: '合同金额', type: 'money', group: 'business', prop: 'contractAmount', defaultVisible: true },
  { key: 'projectCount', label: '关联项目数', type: 'count', group: 'business', prop: 'projectCount', defaultVisible: true },
  { key: 'paymentProgress', label: '付款进度', type: 'progress', group: 'business', prop: 'paymentProgress', defaultVisible: true },
  { key: 'attachment', label: '附件', type: 'attachment', group: 'business', prop: 'attachment', defaultVisible: true },
  { key: 'paidCount', label: '付款笔数', type: 'count', group: 'business', prop: 'paidCount', defaultVisible: false },
  { key: 'paidTotal', label: '已付款总额', type: 'money', group: 'business', prop: 'paidTotal', defaultVisible: false },
  { key: 'contactName', label: '联系人', type: 'text', group: 'business', prop: 'contactName', defaultVisible: true },
  { key: 'contactPhone', label: '联系电话', type: 'text', group: 'business', prop: 'contactPhone', defaultVisible: false },
  { key: 'signDate', label: '签署日期', type: 'date', group: 'business', prop: 'signDate', defaultVisible: true },
  { key: 'entrustDate', label: '委托时间', type: 'date', group: 'business', prop: 'entrustDate', defaultVisible: false },
  { key: 'auditDate', label: '审核日期', type: 'date', group: 'business', prop: 'auditDate', defaultVisible: false },
  { key: 'returnDate', label: '返回日期', type: 'date', group: 'business', prop: 'returnDate', defaultVisible: false },
  { key: 'finishDate', label: '完成日期', type: 'date', group: 'business', prop: 'finishDate', defaultVisible: false },
  { key: 'archiveDate', label: '归档日期', type: 'date', group: 'business', prop: 'archiveDate', defaultVisible: false },
  { key: 'archivePath', label: '归档路径', type: 'text', group: 'business', prop: 'archivePath', defaultVisible: false },
  { key: 'contractPeriod', label: '合同期限', type: 'text', group: 'business', prop: 'contractPeriod', defaultVisible: false },
  { key: 'paymentTerms', label: '付款条款', type: 'text', group: 'business', prop: 'paymentTerms', defaultVisible: false },
  { key: 'receivedAmount', label: '已到账金额', type: 'money', group: 'business', prop: 'receivedAmount', defaultVisible: false },
  { key: 'status', label: '状态', type: 'dict', group: 'business', prop: 'status', defaultVisible: true },
  { key: 'isSettled', label: '是否结算', type: 'text', group: 'business', prop: 'isSettled', defaultVisible: false },
  { key: 'remark', label: '备注', type: 'text', group: 'business', prop: 'remark', defaultVisible: false },
  { key: 'id', label: 'ID', type: 'number', group: 'system', prop: 'id', defaultVisible: false },
  { key: 'createBy', label: '创建人', type: 'text', group: 'system', prop: 'createBy', defaultVisible: false },
  { key: 'createTime', label: '创建时间', type: 'date', group: 'system', prop: 'createTime', defaultVisible: true },
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
    const list = await getContractColumns()
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

/** 列宽自适应：按类型给宽 */
function colWidth(col) {
  if (col.type === 'date') return 120
  if (col.type === 'dict') return 100
  if (col.type === 'money') return 130
  if (col.type === 'progress') return 150
  if (col.type === 'attachment') return 100
  if (col.type === 'count') return 110
  if (col.type === 'dynamic') return 140
  return 140
}

const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const detail = ref({})
const detailActiveTab = ref("info")
const detailPriceList = ref([])  // 合同单价明细
const ids = ref([])
const statusSubmitting = ref(false)
const currentContractName = ref("")
const projectList = ref([])

// 付款结算详情弹窗
const paymentDialogVisible = ref(false)
const paymentDialogRow = ref(null)
const paymentDialogTitle = computed(() => {
  return paymentDialogRow.value ? '合同结算 — ' + paymentDialogRow.value.contractName : '合同结算'
})

// 新增：智能查询面板
const signDateRange = ref([])
const entrustDateRange = ref([])
const auditDateRange = ref([])
const finishDateRange = ref([])
const statusCounts = ref({})
const advancedVisible = ref(false)
const savedSchemes = ref([])
const saveSchemeVisible = ref(false)
const schemeName = ref("")
const currentSchemeName = ref("")
const clientUnitOptions = ref([])
const contractPrefix = ref("")
const amountUnit = ref("wan")  // 'wan'=万元 | 'yuan'=元

// ===== 合同单价 Tab 相关 =====
const activeTab = ref("info")
const priceTableData = ref([])
const priceLoading = ref(false)
const priceSaving = ref(false)

// ===== 附件管理相关 =====
const attachmentList = ref([])           // 当前活跃附件
const attachmentLoading = ref(false)     // 附件上传中
const attachmentPreviewVisible = ref(false)  // 侧滑预览面板
const attachmentPreviewList = ref([])    // 预览面板附件列表
const attachmentPreviewTitle = ref("")   // 预览面板标题
const historyMap = ref({})              // attachmentId → [{历史记录}]
const historyLoading = ref({})          // attachmentId → loading状态
const uploadingFiles = ref([])          // 正在上传的文件

// 文件分类（从后端字典动态获取，取不到时空数组兜底）
const fileCategoryDict = computed(() => proj_attachment_category.value || [])

const dragOver = ref(false)
const uploadCategory = ref('contract')
const uploadIsFinal = ref(false)
const detailAttachmentList = ref([])    // 详情弹窗附件列表
const sideHistoryMap = ref({})          // 侧滑面板历史版本
const replaceTarget = ref(null)         // 替换版本时的目标附件

/** 合同状态流转规则 */
const STATUS_TRANSITIONS = {
  "draft":     ["signed", "cancelled"],
  "signed":    ["ongoing", "cancelled"],
  "ongoing":   ["completed", "cancelled"],
  "completed": ["archived", "cancelled"]
}

const data = reactive({
  form: {},
  statusForm: {
    contractId: null,
    currentStatus: "",
    targetStatus: "",
    allowedStatuses: []
  },
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    keyword: undefined,
    contractNo: undefined,
    contractName: undefined,
    clientUnit: undefined,
    contractType: undefined,
    contactName: undefined,
    status: undefined,
    signDateBegin: undefined,
    signDateEnd: undefined,
    entrustDateBegin: undefined,
    entrustDateEnd: undefined,
    contractAmountMin: undefined,
    contractAmountMax: undefined,
    auditDateBegin: undefined,
    auditDateEnd: undefined,
    finishDateBegin: undefined,
    finishDateEnd: undefined
  },
  rules: {
    contractNo: [{ required: true, message: "合同编号不能为空", trigger: "blur" }],
    contractName: [{ required: true, message: "合同名称不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules, statusForm } = toRefs(data)

/** 根据字典值获取标签文本 */
function getDictLabel(dictList, value) {
  if (!dictList || !value) return value
  const item = dictList.find(d => d.value === value)
  return item ? item.label : value
}

/** 查询合同列表（含关联项目数） */
function getList() {
  loading.value = true
  listContract(queryParams.value).then(response => {
    contractList.value = response.rows || []
    total.value = response.total
    loading.value = false
    // 加载附件计数
    contractList.value.forEach(row => {
      if (row.id) {
        listAttachments(row.id).then(res => {
          const atts = res.data || []
          row.attachmentCount = atts.length
          row._attachments = atts.slice(0, 5)
        }).catch(() => {
          row.attachmentCount = 0
          row._attachments = []
        })
      }
    })
  })
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
    contractNo: undefined,
    contractName: undefined,
    clientUnit: undefined,
    contactName: undefined,
    contactPhone: undefined,
    contractType: undefined,
    contractAmount: undefined,
    signDate: undefined,
    entrustDate: undefined,
    auditDate: undefined,
    returnDate: undefined,
    finishDate: undefined,
    archiveDate: undefined,
    archivePath: undefined,
    contractPeriod: undefined,
    paymentTerms: undefined,
    status: undefined,
    remark: undefined
  }
  proxy.resetForm("contractRef")
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置搜索 */
function resetQuery() {
  signDateRange.value = []
  entrustDateRange.value = []
  auditDateRange.value = []
  finishDateRange.value = []
  queryParams.value.keyword = undefined
  queryParams.value.contractNo = undefined
  queryParams.value.contractName = undefined
  queryParams.value.clientUnit = undefined
  queryParams.value.contractType = undefined
  queryParams.value.contactName = undefined
  queryParams.value.status = undefined
  queryParams.value.signDateBegin = undefined
  queryParams.value.signDateEnd = undefined
  queryParams.value.entrustDateBegin = undefined
  queryParams.value.entrustDateEnd = undefined
  queryParams.value.contractAmountMin = undefined
  queryParams.value.contractAmountMax = undefined
  queryParams.value.auditDateBegin = undefined
  queryParams.value.auditDateEnd = undefined
  queryParams.value.finishDateBegin = undefined
  queryParams.value.finishDateEnd = undefined
  currentSchemeName.value = ''
  handleQuery()
}

/** 状态胶囊数据（字典驱动 - 始终显示全部字典定义的状态） */
const statusCapsules = computed(() => {
  const dict = d('proj_contract_status')
  const total = Object.values(statusCounts.value).reduce((sum, c) => sum + (Number(c) || 0), 0)
  const items = [{ label: '全部', value: undefined, count: total }]
  dict.forEach(d => {
    items.push({ label: d.label, value: d.value, count: statusCounts.value[d.value] || 0 })
  })
  return items
})

/** 加载状态统计（填充 statusCounts 对象） */
function loadStatusCounts() {
  getContractStatusCounts().then(response => {
    const counts = {}
    const list = response.data || []
    list.forEach(item => { counts[item.status] = Number(item.cnt) || 0 })
    statusCounts.value = counts
  }).catch(() => {})
}

/** 状态胶囊点击（支持取消选中） */
function handleStatusClick(status) {
  if (queryParams.value.status === status) {
    queryParams.value.status = undefined
  } else {
    queryParams.value.status = status
  }
  handleQuery()
}

/** 签署日期变更 */
function onSignDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.signDateBegin = val[0]
    queryParams.value.signDateEnd = val[1]
  } else {
    queryParams.value.signDateBegin = undefined
    queryParams.value.signDateEnd = undefined
  }
  handleQuery()
}

/** 委托时间变更 */
function onEntrustDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.entrustDateBegin = val[0]
    queryParams.value.entrustDateEnd = val[1]
  } else {
    queryParams.value.entrustDateBegin = undefined
    queryParams.value.entrustDateEnd = undefined
  }
  handleQuery()
}

/** 审核日期变更 */
function onAuditDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.auditDateBegin = val[0]
    queryParams.value.auditDateEnd = val[1]
  } else {
    queryParams.value.auditDateBegin = undefined
    queryParams.value.auditDateEnd = undefined
  }
  handleQuery()
}

/** 完成日期变更 */
function onFinishDateChange(val) {
  if (val && val.length === 2) {
    queryParams.value.finishDateBegin = val[0]
    queryParams.value.finishDateEnd = val[1]
  } else {
    queryParams.value.finishDateBegin = undefined
    queryParams.value.finishDateEnd = undefined
  }
  handleQuery()
}

/** 加载委托单位去重值（统一数据源：项目表+合同表 UNION） */
function loadClientUnits() {
  getDistinctValues('client_unit').then(response => {
    clientUnitOptions.value = (response.data || []).filter(Boolean)
  }).catch(() => {})
}

/** 加载合同单价树 */
function loadContractPrice(contractId) {
  if (!contractId) {
    priceTableData.value = []
    return
  }
  priceLoading.value = true
  listContractPrice(contractId).then(res => {
    const flatList = res.data || []
    priceTableData.value = buildPriceTree(flatList)
    priceLoading.value = false
  }).catch(() => {
    priceLoading.value = false
  })
}

/** 扁平列表 → 三层树形结构（大类 → 小类 → 外部计费方式明细行） */
function buildPriceTree(list) {
  const catMap = {}
  const roots = []

  // 第一遍：收集类别节点（大类/小类）和计费方式明细行
  // 类别节点不携带计费方式字段（billingId/dictUnitPrice/priceUnit/minQuantity/billingCategory）
  // 这些字段只属于计费方式明细行（categoryLevel=3）
  const billingFields = ['billingId', 'billingType', 'billingCategory', 'dictUnitPrice', 'priceUnit', 'minQuantity']
  function stripBilling(obj) {
    const o = { ...obj }
    billingFields.forEach(f => { o[f] = null })
    return o
  }
  list.forEach(item => {
    const cid = item.categoryId
    const bid = item.billingId

    if (bid) {
      // 计费方式明细行：归到所属小类的 children 下
      if (!catMap[cid]) {
        catMap[cid] = { ...stripBilling(item), children: [] }
      }
      catMap[cid].children.push({
        ...item,
        categoryId: 'billing_' + bid,
        billingId: bid,
        categoryName: item.billingCategory,
        categoryLevel: 3,
        children: []
      })
    } else {
      // 类别行（大类或小类）
      if (!catMap[cid]) {
        catMap[cid] = { ...item, children: [] }
      } else {
        Object.assign(catMap[cid], item, { children: catMap[cid].children })
      }
    }
  })

  // 第二遍：大类 → 小类 挂载
  list.forEach(item => {
    const cid = item.categoryId
    const node = catMap[cid]
    if (!node) return
    if (item.parentId && catMap[item.parentId]) {
      if (!catMap[item.parentId].children.find(c => c.categoryId === cid)) {
        catMap[item.parentId].children.push(node)
      }
    } else if (!roots.find(r => r.categoryId === cid)) {
      roots.push(node)
    }
  })

  return roots
}

/** 收集单价列表（只取计费方式明细行，按 billingId 维度） */
function collectPriceList(contractId) {
  const priceList = []
  priceTableData.value.forEach(group => {
    ;(group.children || []).forEach(child => {
      ;(child.children || []).forEach(billing => {
        if (billing.billingId) {
          priceList.push({
            id: billing.id || null,
            contractId: contractId,
            categoryId: child.categoryId,
            billingId: billing.billingId,
            price: billing.price
          })
        }
      })
    })
  })
  return priceList
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
    case 'today':
      begin = end = fmt(now)
      break
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
    case '7days': {
      const d7 = new Date(now.getTime() - 6 * 86400000)
      begin = fmt(d7); end = fmt(now)
      break
    }
    case '30days': {
      const d30 = new Date(now.getTime() - 29 * 86400000)
      begin = fmt(d30); end = fmt(now)
      break
    }
  }
  if (begin && end) {
    signDateRange.value = [begin, end]
    onSignDateChange([begin, end])
  }
}

/** 加载已保存的筛选方案 */
function loadSavedSchemes() {
  try {
    const raw = localStorage.getItem('contract_filter_schemes')
    if (raw) savedSchemes.value = JSON.parse(raw)
  } catch (e) { /* ignore */ }
}

/** 激活筛选方案 */
function activateScheme(scheme) {
  const qp = queryParams.value
  signDateRange.value = []
  entrustDateRange.value = []
  auditDateRange.value = []
  finishDateRange.value = []
  Object.keys(qp).forEach(k => { if (k !== 'pageNum' && k !== 'pageSize') qp[k] = undefined })
  if (scheme.data) {
    Object.assign(qp, scheme.data)
    if (scheme.data.signDateBegin && scheme.data.signDateEnd) {
      signDateRange.value = [scheme.data.signDateBegin, scheme.data.signDateEnd]
    }
    if (scheme.data.entrustDateBegin && scheme.data.entrustDateEnd) {
      entrustDateRange.value = [scheme.data.entrustDateBegin, scheme.data.entrustDateEnd]
    }
    if (scheme.data.auditDateBegin && scheme.data.auditDateEnd) {
      auditDateRange.value = [scheme.data.auditDateBegin, scheme.data.auditDateEnd]
    }
    if (scheme.data.finishDateBegin && scheme.data.finishDateEnd) {
      finishDateRange.value = [scheme.data.finishDateBegin, scheme.data.finishDateEnd]
    }
  }
  currentSchemeName.value = scheme.name
  handleQuery()
}

/** 保存当前筛选方案 */
function saveScheme() {
  if (!schemeName.value.trim()) return
  const name = schemeName.value.trim()
  const data = {}
  const qp = queryParams.value
  const keys = ['keyword','contractNo','contractName','clientUnit','contractType','contactName','status',
                'signDateBegin','signDateEnd','entrustDateBegin','entrustDateEnd',
                'auditDateBegin','auditDateEnd','finishDateBegin','finishDateEnd',
                'contractAmountMin','contractAmountMax']
  keys.forEach(k => { if (qp[k] !== undefined && qp[k] !== '') data[k] = qp[k] })
  const existing = savedSchemes.value.findIndex(s => s.name === name)
  if (existing >= 0) savedSchemes.value.splice(existing, 1)
  savedSchemes.value.unshift({ name, data })
  if (savedSchemes.value.length > 8) savedSchemes.value = savedSchemes.value.slice(0, 8)
  localStorage.setItem('contract_filter_schemes', JSON.stringify(savedSchemes.value))
  currentSchemeName.value = name
  saveSchemeVisible.value = false
  schemeName.value = ''
  proxy.$modal.msgSuccess('方案已保存')
}

/** 多选框 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 新增 */
function handleAdd() {
  reset()
  priceTableData.value = []
  attachmentList.value = []
  historyMap.value = {}
  activeTab.value = "info"
  open.value = true
  title.value = "新增合同"
  loadCategoryTreeForNew()
}

/** 新增合同时加载纯类别树（contractId=0 查全树无单价） */
function loadCategoryTreeForNew() {
  priceLoading.value = true
  listContractPrice(0).then(res => {
    const flatList = res.data || []
    priceTableData.value = buildPriceTree(flatList)
    priceLoading.value = false
  }).catch(() => {
    priceLoading.value = false
  })
}

/** 修改 */
function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getContract(id).then(response => {
    form.value = response.data
    // 拆出后缀：如果编号以配置前缀开头则去掉前缀，否则原样展示
    if (form.value.contractNo && contractPrefix.value && form.value.contractNo.startsWith(contractPrefix.value)) {
      form.value.contractNo = form.value.contractNo.substring(contractPrefix.value.length)
    }
    open.value = true
    title.value = "修改合同"
    activeTab.value = "info"
    historyMap.value = {}
    loadContractPrice(id)
    loadAttachments(id)
  })
}

/** 查看详情 */
function handleView(row) {
  getContract(row.id).then(response => {
    detail.value = response.data
    detailOpen.value = true
    // 加载合同单价
    listContractPrice(row.id).then(res => {
      const all = res.data || []
      // 按 categoryId 建索引，方便查大类名
      const catMap = {}
      all.forEach(item => { catMap[item.categoryId] = item })
      // 只保留有合同单价的计费方式明细行（billingId不为空），并附上大类名
      detailPriceList.value = all
        .filter(item => item.price != null && item.billingId)
        .map(item => ({
          ...item,
          parentName: catMap[item.parentId]?.categoryName || ''
        }))
    }).catch(() => {
      detailPriceList.value = []
    })
    // 加载附件
    listAttachments(row.id).then(res => {
      detailAttachmentList.value = res.data || []
    }).catch(() => {
      detailAttachmentList.value = []
    })
  })
}

/** 提交（先保存合同基本信息，拿到ID后再保存合同单价） */
function submitForm() {
  proxy.$refs["contractRef"].validate(valid => {
    if (!valid) {
      proxy.$modal.msgWarning("请先完成基本信息中的必填项（合同编号、合同名称）")
      activeTab.value = "info"
      return
    }
    const isAdd = form.value.id == undefined
    // 提交前拼接前缀 + 用户输入的后缀
    const suffix = form.value.contractNo || ""
    form.value.contractNo = contractPrefix.value + suffix

    const saveContract = isAdd ? addContract(form.value) : updateContract(form.value)

    saveContract.then(response => {
      // 新增时后端返回合同ID，修改时用已有ID
      const contractId = isAdd ? response.data : form.value.id
      // 收集单价列表
      const priceList = collectPriceList(contractId)
      // 如果没有计费方式数据（比如类别树为空），直接关闭
      if (priceList.length === 0) {
        proxy.$modal.msgSuccess(isAdd ? "新增成功" : "修改成功")
        open.value = false
        getList()
        return
      }
      // 保存单价
      priceSaving.value = true
      saveContractPrice(priceList).then(() => {
        proxy.$modal.msgSuccess(isAdd ? "新增成功" : "修改成功")
        priceSaving.value = false
        open.value = false
        getList()
      }).catch(() => {
        priceSaving.value = false
      })
    }).catch(() => {
      // 合同基本信息保存失败
    })
  })
}

/** 更多下拉操作 */
function handleCommand(cmd, row) {
  if (cmd === 'status') {
    handleStatusChange(row)
  } else if (cmd === 'delete') {
    handleDelete(row)
  }
}

/** 状态变更弹窗 */
function handleStatusChange(row) {
  const current = row.status || "draft"
  const allowed = STATUS_TRANSITIONS[current] || []
  if (allowed.length === 0) {
    proxy.$modal.msgWarning("当前状态【" + getDictLabel(d('proj_contract_status'), current) + "】为终态，不允许变更")
    return
  }
  statusForm.value = {
    contractId: row.id,
    currentStatus: current,
    targetStatus: "",
    allowedStatuses: allowed
  }
  statusOpen.value = true
}

/** 提交状态变更 */
function submitStatusChange() {
  if (!statusForm.value.targetStatus) {
    proxy.$modal.msgWarning("请选择目标状态")
    return
  }
  statusSubmitting.value = true
  changeContractStatus(statusForm.value.contractId, statusForm.value.targetStatus).then(() => {
    proxy.$modal.msgSuccess("状态变更成功")
    statusOpen.value = false
    statusSubmitting.value = false
    getList()
  }).catch(() => {
    statusSubmitting.value = false
  })
}

/** 删除 */
function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  const name = row.id ? row.contractNo : "所选合同"
  proxy.$modal.confirm('是否确认删除合同"' + name + '"?').then(function() {
    return delContract(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 查看关联项目 */
function handleShowProjects(row) {
  currentContractName.value = row.contractNo + " — " + row.contractName
  getContractProjects(row.id).then(response => {
    projectList.value = response.data || []
    projectsOpen.value = true
  })
}

/** 导出 */
function handleExport() {
  proxy.download('/project/contract/export', {
    ...queryParams.value
  }, `contract_${new Date().getTime()}.xlsx`)
}

/** 金额格式化（unit: 'wan'=万元 | 'yuan'=元） */
function formatAmount(val, unit = 'wan') {
  if (val == null) return ''
  const num = Number(val)
  if (unit === 'wan') {
    return (num / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' 万'
  }
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 日期解析 */
function parseDate(val) {
  if (!val) return ''
  return val
}

// ===== 附件管理方法 =====

/** 获取分类中文标签 */
function getCategoryLabel(cat) {
  const found = fileCategoryDict.value.find(c => c.value === cat)
  return found ? found.label : cat
}

/** 付款进度百分比 */
function paymentPercent(row) {
  if (!row.contractAmount || row.contractAmount === 0) return 0
  const paid = row.paidTotal || 0
  return Math.min(100, Math.round(paid / row.contractAmount * 100))
}

/** 万元格式化 */
function fmtWan(val) {
  if (val == null) return '0'
  const n = Number(val)
  return (n / 10000).toFixed(2) + '万'
}

/** 打开合同付款结算弹窗 */
function openContractSettlement(row) {
  paymentDialogRow.value = row
  paymentDialogVisible.value = true
}

/** 付款类型 → 标签颜色 */
function paymentTypeTag(type) {
  const map = { advance: '', progress: 'warning', final: 'success' }
  return map[type] || 'info'
}

/** 付款类型 → 中文 */
function paymentTypeLabel(type) {
  const map = { advance: '预付款', progress: '进度款', final: '尾款' }
  return map[type] || type
}

/** 格式化文件大小 */
function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = Number(bytes)
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

/** 文件图标颜色 */
function getFileIconColor(ext) {
  const map = { pdf: '#f56c6c', doc: '#409eff', docx: '#409eff', xls: '#67c23a', xlsx: '#67c23a', jpg: '#e6a23c', jpeg: '#e6a23c', png: '#e6a23c', gif: '#e6a23c' }
  return map[ext?.toLowerCase()] || '#909399'
}

/** 操作类型标签 */
function actionLabel(action) {
  const map = { upload: '上传', replace: '替换', delete: '删除', restore: '恢复' }
  return map[action] || action
}

function actionTagType(action) {
  const map = { upload: 'success', replace: 'warning', delete: 'danger', restore: 'primary' }
  return map[action] || 'info'
}

/** 加载附件列表 */
function loadAttachments(contractId) {
  if (!contractId) return
  listAttachments(contractId).then(res => {
    attachmentList.value = res.data || []
  }).catch(() => {
    attachmentList.value = []
  })
}

/** 触发文件选择 */
const hiddenFileInput = ref(null)
function triggerFileInput() {
  hiddenFileInput.value?.click()
}

/** 文件选择回调 */
function onFileSelected(event) {
  const files = event.target?.files || event.raw
  if (files && files.length > 0) {
    const file = files[0]
    if (replaceTarget.value) {
      // 替换模式
      doUpload(file)
      replaceTarget.value = null
    } else {
      doUpload(file)
    }
  }
  // Reset input for re-selection
  if (event.target) event.target.value = ''
}

/** 拖拽文件回调 */
function onFileDrop(event) {
  dragOver.value = false
  if (!form.value.id) {
    proxy.$modal.msgWarning('请先保存合同后再上传附件')
    return
  }
  const files = event.dataTransfer.files
  if (files.length > 0) doUpload(files[0])
}

/** 剪贴板粘贴上传 */
function onPasteUpload(event) {
  if (!form.value.id) return
  const items = event.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile()
      if (file) doUpload(file)
      break
    }
  }
}

/** 执行上传 */
function doUpload(file) {
  if (file.size > 50 * 1024 * 1024) {
    proxy.$modal.msgError('文件大小不能超过 50MB')
    return
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileCategory', uploadCategory.value)
  formData.append('isFinal', uploadIsFinal.value ? '1' : '0')

  attachmentLoading.value = true
  uploadAttachment(form.value.id, formData).then(res => {
    proxy.$modal.msgSuccess('上传成功')
    attachmentLoading.value = false
    loadAttachments(form.value.id)
  }).catch(() => {
    attachmentLoading.value = false
  })
}

/** 替换附件（打开上传框） */
function handleReplaceAttachment(att) {
  uploadCategory.value = att.fileCategory
  replaceTarget.value = att
  triggerFileInput()
}

/** 删除附件 */
function handleDeleteAttachment(att) {
  proxy.$modal.confirm('确定要删除附件 "' + att.fileName + '" 吗？删除后可查看历史版本。').then(() => {
    deleteAttachment(att.id).then(() => {
      proxy.$modal.msgSuccess('删除成功')
      loadAttachments(form.value.id)
    })
  }).catch(() => {})
}

/** 切换历史版本展开 */
function toggleHistory(att) {
  if (historyMap.value[att.id] !== undefined) {
    delete historyMap.value[att.id]
    return
  }
  if (historyLoading.value[att.id]) return
  historyLoading.value[att.id] = true
  getAttachmentHistory(att.id).then(res => {
    historyMap.value[att.id] = res.data || []
    historyLoading.value[att.id] = false
  }).catch(() => {
    historyLoading.value[att.id] = false
  })
}

/** 侧滑面板展开历史 */
function toggleSideHistory(att) {
  if (sideHistoryMap.value[att.id] !== undefined) {
    delete sideHistoryMap.value[att.id]
    return
  }
  getAttachmentHistory(att.id).then(res => {
    sideHistoryMap.value[att.id] = res.data || []
  }).catch(() => {})
}

/** 恢复历史版本 */
function handleRestore(att, logRow) {
  proxy.$modal.confirm('确定恢复 v' + logRow.version + ' 版本为当前版本吗？').then(() => {
    restoreVersion(att.id, logRow.id).then(() => {
      proxy.$modal.msgSuccess('版本恢复成功')
      loadAttachments(form.value.id || detail.value?.id || 0)
      // 同时刷新侧滑面板
      if (attachmentPreviewVisible.value) {
        const contractId = form.value.id || detail.value?.id
        if (contractId) {
          listAttachments(contractId).then(res => {
            attachmentPreviewList.value = res.data || []
          })
        }
      }
    })
  }).catch(() => {})
}

/** 预览附件（Axios blob + JSON 错误检测） */
async function previewAttachment(att, version) {
  try {
    const params = {}
    if (version) params.version = version
    const res = await request({
      url: '/project/contract/attachment/' + att.id + '/preview',
      method: 'get',
      params,
      responseType: 'blob'
    })
    const data = res.data

    // Axios 拦截器对 blob 不检查错误码，需手动检测 JSON 401/500
    if (data instanceof Blob && data.type === 'application/json') {
      const text = await data.text()
      try { const err = JSON.parse(text); proxy.$modal.msgError(err.msg || '预览失败') }
      catch (_) { proxy.$modal.msgError('预览失败') }
      return
    }

    const url = URL.createObjectURL(data)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write('<!DOCTYPE html><html><head><title>' + (att.fileName || '文件预览') + '</title></head><body style="margin:0;overflow:hidden"><iframe src="' + url + '" style="width:100vw;height:100vh;border:none;position:fixed;top:0;left:0"></iframe></body></html>')
    w.document.close()
  } catch (e) {
    console.error('预览失败', e)
  }
}

/** 下载附件（Axios blob + JSON 错误检测） */
async function downloadAttachment(att, version) {
  try {
    const params = {}
    if (version) params.version = version
    const res = await request({
      url: '/project/contract/attachment/' + att.id + '/preview',
      method: 'get',
      params,
      responseType: 'blob'
    })
    const data = res.data

    // JSON 错误检测
    if (data instanceof Blob && data.type === 'application/json') {
      const text = await data.text()
      try { const err = JSON.parse(text); proxy.$modal.msgError(err.msg || '下载失败') }
      catch (_) { proxy.$modal.msgError('下载失败') }
      return
    }

    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = att.fileName || 'file'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('下载失败', e)
  }
}

function previewAttachmentHistory(att, logRow) {
  previewAttachment(att, logRow.version)
}

/** 打开侧滑面板（从列表进入） */
function openSidePanel(row) {
  attachmentPreviewTitle.value = '合同附件 — ' + (row.contractNo || '')
  const contractId = row.id
  listAttachments(contractId).then(res => {
    attachmentPreviewList.value = res.data || []
    attachmentPreviewVisible.value = true
    sideHistoryMap.value = {}
  }).catch(() => {
    attachmentPreviewList.value = []
    attachmentPreviewVisible.value = true
  })
}

function closeSidePanel() {
  attachmentPreviewVisible.value = false
  sideHistoryMap.value = {}
}

loadColumns()
getList()
loadStatusCounts()
loadSavedSchemes()
loadClientUnits()
getConfigKey("contract.no.prefix").then(res => {
  contractPrefix.value = res.msg || ""
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
.scheme-chip { background: rgba(64,158,255,0.1); color: #79bbff; }
.scheme-chip:hover { background: rgba(64,158,255,0.3); }
.collapse-link {
  margin-left: auto;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  user-select: none;
}
.collapse-link:hover { color: #409eff; }

/* ===== 附件管理 ===== */
.attachment-manager { min-height: 200px; }
.attachment-dropzone {
  border: 2px dashed #d9d9d9;
  border-radius: 10px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s;
  background: #fafafa;
  cursor: pointer;
}
.attachment-dropzone:hover,
.attachment-dropzone.is-dragover {
  border-color: #409eff;
  background: #ecf5ff;
}
.dz-content p { margin: 8px 0 4px; color: #606266; font-size: 14px; }
.dz-hint { color: #909399 !important; font-size: 12px !important; }
.upload-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}
.upload-label { font-size: 13px; color: #606266; }

.attachment-slot {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 10px;
  background: #fff;
  transition: box-shadow 0.2s;
}
.attachment-slot:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.slot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.slot-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
}
.slot-actions { display: flex; gap: 4px; }
.version-badge {
  font-size: 11px;
  background: #ecf5ff;
  color: #409eff;
  padding: 0 6px;
  border-radius: 8px;
}
.slot-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 6px 28px;
}
.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.file-name { font-size: 13px; color: #303133; font-weight: 500; }
.file-meta { font-size: 12px; color: #909399; }

.history-panel {
  margin-top: 10px;
  padding: 8px 0 0 28px;
  border-top: 1px solid #f0f0f0;
}

/* ===== Popover 附件预览 ===== */
.attachment-popover .popover-att-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

/* ===== 侧滑面板 ===== */
.side-panel-body { padding: 0; }
.side-att-card {
  border-bottom: 1px solid #eee;
  padding: 14px 0;
}
.side-att-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.side-att-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.side-att-actions { display: flex; gap: 4px; }
.side-att-file {
  padding-left: 26px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.side-history-panel {
  margin-top: 10px;
  padding-left: 26px;
}

/* ===== 付款进度列 ===== */
.payment-progress-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.payment-bar-wrap {
  width: 100%;
  height: 6px;
  background: #ebeef5;
  border-radius: 3px;
  overflow: hidden;
}
.payment-bar {
  height: 100%;
  background: linear-gradient(90deg, #67c23a, #409eff);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.payment-summary {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
}
</style>

<style>
/* 付款明细 Popover（非 scoped，因渲染在 body 层级） */
.payment-popover {
  padding: 4px 0 !important;
}
.popover-payment-detail {
  font-size: 13px;
  padding: 8px 8px 4px 8px;
}
.popover-payment-detail .popover-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
.popover-payment-detail .pay-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.popover-payment-detail .pay-item:last-child {
  border-bottom: none;
}
.popover-payment-detail .pay-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.popover-payment-detail .pay-time {
  color: #909399;
  font-size: 12px;
  min-width: 70px;
}
.popover-payment-detail .pay-amount {
  font-weight: 600;
  color: #e6a23c;
  min-width: 70px;
  text-align: right;
}
.popover-payment-detail .pay-unit {
  color: #606266;
  font-size: 12px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.popover-payment-detail .pay-project {
  color: #909399;
  font-size: 11px;
  flex: 1;
}
.popover-payment-detail .popover-summary {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
  text-align: center;
}
</style>
