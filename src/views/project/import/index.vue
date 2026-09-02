<template>
  <div class="app-container import-page">
    <el-tabs v-model="activeTab" class="import-tabs">
      <el-tab-pane label="项目数据导入" name="output">
        <!-- 顶部步骤条 -->
        <el-steps :active="step" finish-status="success" align-center style="margin-bottom: 20px">
          <el-step title="上传 Excel" description="读取历史数据文件" />
          <el-step title="预览确认" description="查看可导入数据" />
          <el-step title="结果摘要" description="成功/跳过/失败明细" />
        </el-steps>

        <!-- Step1 上传 -->
        <div v-if="step === 0" class="step-box">
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :limit="1"
            :on-exceed="handleExceed"
            :on-change="handleFileChange"
            accept=".xlsx"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击选择</em></div>
            <template #tip>
              <div class="el-upload__tip">仅支持 .xlsx 格式（Sheet1 项目+工作量 / Sheet2 付款信息）</div>
            </template>
          </el-upload>
          <div class="upload-actions">
            <el-button type="primary" :disabled="!uploadFile" :loading="parsing" @click="doPreview">开始解析预览</el-button>
          </div>
        </div>

        <!-- Step2 预览 -->
        <div v-if="step === 1" class="step-box">
          <!-- 统计胶囊 -->
          <div class="stat-row">
            <div class="stat-pill stat-total">总行数 <b>{{ preview.totalRows ?? 0 }}</b></div>
            <div class="stat-pill stat-ready">可导入 ✅ <b>{{ preview.readyCount ?? 0 }}</b></div>
            <div class="stat-pill stat-warn">待修正 ⚠️ <b>{{ preview.warningCount ?? 0 }}</b></div>
            <div class="stat-pill stat-err">无法导入 ❌ <b>{{ preview.errorCount ?? 0 }}</b></div>
            <div style="flex:1"></div>
            <el-button @click="step = 0; resetAll()">重选文件</el-button>
            <el-button type="primary" :disabled="(preview.readyCount ?? 0) === 0" :loading="committing" @click="doCommit">
              确认导入（{{ preview.readyCount ?? 0 }}行）
            </el-button>
          </div>

          <!-- 问题摘要 + 下载按钮 -->
          <div v-if="hasProblems" class="problem-section">
            <div v-if="preview.warningCount > 0" class="problem-card problem-warn">
              <div class="problem-icon">⚠️</div>
              <div class="problem-body">
                <div class="problem-title">{{ preview.warningCount }} 行待修正</div>
                <div class="problem-desc">{{ preview.problemSummary?.warningDesc }}</div>
              </div>
              <el-button size="small" type="warning" plain @click="downloadProblemFile('warning')">下载明细</el-button>
            </div>
            <div v-if="preview.errorCount > 0" class="problem-card problem-err">
              <div class="problem-icon">❌</div>
              <div class="problem-body">
                <div class="problem-title">{{ preview.errorCount }} 行无法导入</div>
                <div class="problem-desc">{{ preview.problemSummary?.errorDesc }}</div>
              </div>
              <el-button size="small" type="danger" plain @click="downloadProblemFile('error')">下载明细</el-button>
            </div>
          </div>

          <!-- 问题明细表格（可折叠） -->
          <el-collapse v-if="hasProblems" v-model="problemCollapse" class="problem-collapse">
            <el-collapse-item name="problems">
              <template #title>
                <span class="collapse-title">问题明细（{{ (preview.problemRows || []).length }} 行）</span>
              </template>
              <el-table :data="preview.problemRows" border stripe size="small" max-height="40vh">
                <el-table-column prop="excelRow" label="Excel行" width="75" align="center" />
                <el-table-column prop="projectCode" label="工程编号" min-width="130" show-overflow-tooltip />
                <el-table-column prop="engineeringProject" label="委托任务" min-width="150" show-overflow-tooltip />
                <el-table-column label="问题类型" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag size="small" :type="problemTagType(row.problemType)">{{ row.problemType }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="problemDetail" label="问题详情" min-width="240" show-overflow-tooltip />
                <el-table-column prop="suggestion" label="解决建议" min-width="240" show-overflow-tooltip />
              </el-table>
            </el-collapse-item>
          </el-collapse>

          <!-- 可导入数据只读表格 -->
          <div v-if="(preview.readyCount ?? 0) > 0" class="ready-section">
            <div class="section-title">可导入数据预览（只读）</div>
            <el-table :data="preview.rows" border stripe size="small" height="50vh">
              <el-table-column type="index" label="序" width="50" />
              <el-table-column prop="excelRow" label="Excel行" width="75" />
              <el-table-column prop="projectCode" label="工程编号" min-width="130" />
              <el-table-column prop="clientUnit" label="委托单位" min-width="150" show-overflow-tooltip />
              <el-table-column prop="engineeringProject" label="委托任务" min-width="160" show-overflow-tooltip />
              <el-table-column prop="projectCategoryName" label="项目类别" min-width="130" show-overflow-tooltip />
              <el-table-column label="负责人" width="100">
                <template #default="{ row }">{{ row.leaderName || '-' }}</template>
              </el-table-column>
              <el-table-column label="验收日期" width="110">
                <template #default="{ row }">{{ row.finishDate || '-' }}</template>
              </el-table-column>
              <el-table-column label="内部产值" width="120" align="right">
                <template #default="{ row }">{{ fmt(row.internalTotalFromExcel) }}</template>
              </el-table-column>
              <el-table-column label="外部产值" width="120" align="right">
                <template #default="{ row }">{{ fmt(row.externalTotalFromExcel) }}</template>
              </el-table-column>
              <el-table-column label="付款" width="80" align="center">
                <template #default="{ row }">{{ row.payments?.length || 0 }}笔</template>
              </el-table-column>
              <el-table-column label="展开" width="90" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" link type="primary" @click="openDetail(row)">
                    工作量({{ row.workloads?.length || 0 }})
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>

        <!-- Step3 结果摘要 -->
        <div v-if="step === 2" class="step-box">
          <el-row :gutter="16" class="result-summary">
            <el-col :span="12">
              <el-card shadow="never" class="sum-card sum-ok">
                <div class="sum-label">导入成功</div>
                <div class="sum-num">{{ result.successCount ?? 0 }}</div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="never" class="sum-card sum-fail">
                <div class="sum-label">失败</div>
                <div class="sum-num">{{ result.failedCount ?? 0 }}</div>
                <el-button v-if="result.failedCount > 0" link type="primary" size="small" @click="downloadResultFile('failed')">下载失败明细</el-button>
              </el-card>
            </el-col>
          </el-row>
          <el-collapse v-if="result.failedDetails && result.failedDetails.length" class="mt20">
            <el-collapse-item name="fail" :title="'失败明细（' + result.failedDetails.length + '行）'">
              <el-table :data="result.failedDetails" size="small" border stripe max-height="300">
                <el-table-column label="Excel行号" prop="excelRow" width="100" align="center" />
                <el-table-column label="工程编号" prop="projectCode" width="180" />
                <el-table-column label="失败原因" prop="reason" show-overflow-tooltip />
              </el-table>
            </el-collapse-item>
          </el-collapse>
          <el-divider />
          <div class="result-actions">
            <el-button @click="step = 0; resetAll()">继续导入新文件</el-button>
          </div>
        </div>

        <!-- 明细查看Dialog（只读） -->
        <el-dialog v-model="detailDlg.open" append-to-body :title="detailDlg.title" width="70%" class="detail-dialog">
          <el-tabs v-model="detailDlg.tab">
            <el-tab-pane label="工作量明细" name="wl">
              <el-table :data="detailDlg.workloads" border size="small" max-height="50vh">
                <el-table-column type="index" label="序" width="50" />
                <el-table-column label="内/外" width="70" align="center">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.billingType === 'internal' ? '' : 'success'">
                      {{ row.billingType === 'internal' ? '内部' : '外部' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="billingCategory" label="计费类别" min-width="180" show-overflow-tooltip />
                <el-table-column prop="workload" label="工作量" width="110" align="right" />
                <el-table-column label="单价" width="100" align="right">
                  <template #default="{ row }">{{ fmt(row.unitPrice) }}</template>
                </el-table-column>
                <el-table-column label="小计产值" width="120" align="right">
                  <template #default="{ row }">{{ fmt(row.output) }}</template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane v-if="detailDlg.payments.length > 0" label="付款明细" name="pay">
              <el-table :data="detailDlg.payments" border size="small" max-height="50vh">
                <el-table-column type="index" label="序" width="50" />
                <el-table-column label="类型" width="90" align="center">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.paymentType === 'advance' ? 'warning' : 'primary'">{{ row.paymentType === 'advance' ? '预付款' : '尾款' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="金额" width="130" align="right">
                  <template #default="{ row }">{{ fmt(row.amount) }}</template>
                </el-table-column>
                <el-table-column label="付款时间" width="120">
                  <template #default="{ row }">{{ row.payTime || '-' }}</template>
                </el-table-column>
                <el-table-column prop="payMethod" label="付款方式" min-width="100" />
                <el-table-column prop="source" label="来源" min-width="140" show-overflow-tooltip />
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-dialog>
      </el-tab-pane>

      <el-tab-pane label="合同数据导入" name="contract">
        <!-- 合同导入步骤条 -->
        <el-steps :active="cStep" finish-status="success" align-center style="margin-bottom: 20px">
          <el-step title="上传 Excel" description="读取合同登记表" />
          <el-step title="预览确认" description="查看合同数据" />
          <el-step title="结果摘要" description="成功/跳过/失败明细" />
        </el-steps>

        <!-- 合同 Step1 上传 -->
        <div v-if="cStep === 0" class="step-box">
          <el-upload
            ref="cUploadRef"
            class="upload-demo"
            drag
            :auto-upload="false"
            :limit="1"
            :on-exceed="handleCExceed"
            :on-change="handleCFileChange"
            accept=".xls,.xlsx"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击选择</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 .xls / .xlsx 格式（多Sheet页自动解析）</div>
            </template>
          </el-upload>
          <div class="upload-actions">
            <el-button type="primary" :disabled="!cUploadFile" :loading="cParsing" @click="doCPreview">开始解析预览</el-button>
          </div>
        </div>

        <!-- 合同 Step2 预览 -->
        <div v-if="cStep === 1" class="step-box">
          <div class="stat-row">
            <div class="stat-pill stat-total">总行数 <b>{{ cPreview.totalRows ?? 0 }}</b></div>
            <div class="stat-pill stat-ready">可导入 <b>{{ cPreview.readyCount ?? 0 }}</b></div>
            <div class="stat-pill stat-dup">已存在 <b>{{ cPreview.duplicateCount ?? 0 }}</b></div>
            <div class="stat-pill stat-err">无法导入 <b>{{ cPreview.errorCount ?? 0 }}</b></div>
            <div style="flex:1"></div>
            <el-button @click="cStep = 0; resetCAll()">重选文件</el-button>
            <el-button type="primary" :disabled="(cPreview.readyCount ?? 0) === 0" :loading="cCommitting" @click="doCCommit">
              确认导入（{{ cPreview.readyCount ?? 0 }}行）
            </el-button>
          </div>

          <!-- 问题摘要 -->
          <div v-if="cHasProblems" class="problem-section">
            <div v-if="cPreview.duplicateCount > 0" class="problem-card problem-dup">
              <div class="problem-icon">🚫</div>
              <div class="problem-body">
                <div class="problem-title">{{ cPreview.duplicateCount }} 行合同编号已存在</div>
                <div class="problem-desc">将自动跳过</div>
              </div>
              <el-button size="small" type="info" plain @click="downloadCProblemFile('duplicate')">下载明细</el-button>
            </div>
            <div v-if="cPreview.errorCount > 0" class="problem-card problem-err">
              <div class="problem-icon">❌</div>
              <div class="problem-body">
                <div class="problem-title">{{ cPreview.errorCount }} 行无法导入</div>
                <div class="problem-desc">缺少必填字段（合同编号为空）</div>
              </div>
              <el-button size="small" type="danger" plain @click="downloadCProblemFile('error')">下载明细</el-button>
            </div>
          </div>

          <!-- 问题明细表格 -->
          <el-collapse v-if="cHasProblems" v-model="cProblemCollapse" class="problem-collapse">
            <el-collapse-item name="problems">
              <template #title>
                <span class="collapse-title">问题明细（{{ (cPreview.problemRows || []).length }} 行）</span>
              </template>
              <el-table :data="cPreview.problemRows" border stripe size="small" max-height="40vh">
                <el-table-column prop="excelRow" label="Excel行" width="75" align="center" />
                <el-table-column prop="contractNo" label="合同编号" min-width="180" show-overflow-tooltip />
                <el-table-column prop="clientUnit" label="委托单位" min-width="150" show-overflow-tooltip />
                <el-table-column label="问题类型" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag size="small" :type="row.isDuplicate ? 'info' : 'danger'">{{ row.isDuplicate ? '已存在' : '无法导入' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="问题详情" min-width="240" show-overflow-tooltip>
                  <template #default="{ row }">
                    <span v-if="row.errors && row.errors.length">{{ row.errors.join('；') }}</span>
                    <span v-else>{{ row.isDuplicate ? '合同编号已存在' : '-' }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
          </el-collapse>

          <!-- 可导入数据表格 -->
          <div v-if="(cPreview.readyCount ?? 0) > 0" class="ready-section">
            <div class="section-title">可导入合同预览（只读）</div>
            <el-table :data="cPreview.rows" border stripe size="small" height="50vh">
              <el-table-column type="index" label="序" width="50" />
              <el-table-column prop="excelRow" label="Excel行" width="75" />
              <el-table-column prop="contractNo" label="合同编号" min-width="180" show-overflow-tooltip />
              <el-table-column prop="clientUnit" label="委托单位" min-width="150" show-overflow-tooltip />
              <el-table-column prop="contractName" label="合同名称" min-width="200" show-overflow-tooltip />
              <el-table-column label="签署日期" width="110">
                <template #default="{ row }">{{ formatDate(row.signDate) }}</template>
              </el-table-column>
              <el-table-column label="合同金额" width="120" align="right">
                <template #default="{ row }">{{ row.contractAmount != null ? fmt(row.contractAmount) : '-' }}</template>
              </el-table-column>
              <el-table-column label="合同类型" width="100" align="center">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.contractType === '单价合同' ? 'warning' : ''">{{ row.contractType }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="projectType" label="项目类型" min-width="110" show-overflow-tooltip />
              <el-table-column prop="surveyAddress" label="测绘地址" min-width="160" show-overflow-tooltip />
              <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
            </el-table>
          </div>
        </div>

        <!-- 合同 Step3 结果摘要 -->
        <div v-if="cStep === 2" class="step-box">
          <el-row :gutter="16" class="result-summary">
            <el-col :span="8">
              <el-card shadow="never" class="sum-card sum-ok">
                <div class="sum-label">导入成功</div>
                <div class="sum-num">{{ cResult.successCount ?? 0 }}</div>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="never" class="sum-card sum-skip">
                <div class="sum-label">跳过（已存在）</div>
                <div class="sum-num">{{ cResult.skippedCount ?? 0 }}</div>
                <el-button v-if="cResult.skippedCount > 0" link type="primary" size="small" @click="downloadCResultFile('skipped')">下载跳过明细</el-button>
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="never" class="sum-card sum-fail">
                <div class="sum-label">失败</div>
                <div class="sum-num">{{ cResult.failedCount ?? 0 }}</div>
                <el-button v-if="cResult.failedCount > 0" link type="primary" size="small" @click="downloadCResultFile('failed')">下载失败明细</el-button>
              </el-card>
            </el-col>
          </el-row>
          <el-collapse v-if="(cResult.failedDetails && cResult.failedDetails.length) || (cResult.skippedDetails && cResult.skippedDetails.length)" class="mt20">
            <el-collapse-item v-if="cResult.failedDetails && cResult.failedDetails.length" name="fail" :title="'失败明细（' + cResult.failedDetails.length + '行）'">
              <el-table :data="cResult.failedDetails" size="small" border stripe max-height="300">
                <el-table-column label="Excel行号" prop="excelRow" width="100" align="center" />
                <el-table-column label="合同编号" prop="projectCode" width="180" />
                <el-table-column label="失败原因" prop="reason" show-overflow-tooltip />
              </el-table>
            </el-collapse-item>
            <el-collapse-item v-if="cResult.skippedDetails && cResult.skippedDetails.length" name="skip" :title="'跳过明细（' + cResult.skippedDetails.length + '行）'">
              <el-table :data="cResult.skippedDetails" size="small" border stripe max-height="300">
                <el-table-column label="Excel行号" prop="excelRow" width="100" align="center" />
                <el-table-column label="合同编号" prop="projectCode" width="180" />
                <el-table-column label="跳过原因" prop="reason" show-overflow-tooltip />
              </el-table>
            </el-collapse-item>
          </el-collapse>
          <el-divider />
          <div class="result-actions">
            <el-button @click="cStep = 0; resetCAll()">继续导入新文件</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>


<script setup>
import { ref, reactive, computed, getCurrentInstance } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import {
  previewImport, commitImport,
  downloadProblems, downloadImportFailures, downloadImportSkipped
} from '@/api/project/import'
import {
  previewContractImport, commitContractImport, downloadContractProblems
} from '@/api/project/contractImport'
import saveAs from 'file-saver'

const { proxy } = getCurrentInstance()

const step = ref(0)
const parsing = ref(false)
const committing = ref(false)
const uploadFile = ref(null)
const uploadRef = ref(null)
const problemCollapse = ref(['problems']) // 默认折叠

const preview = reactive({
  token: '', totalRows: 0, readyCount: 0, warningCount: 0, errorCount: 0,
  problemSummary: null,
  rows: [],
  problemRows: []
})

const result = reactive({ logId: null, successCount: 0, skippedCount: 0, failedCount: 0, failedDetails: [], skippedDetails: [] })

const hasProblems = computed(() =>
  (preview.warningCount > 0) || (preview.errorCount > 0)
)

function problemTagType(t) {
  if (t === '无法导入') return 'danger'
  return 'warning' // 待修正
}

// ============ Step1 上传 ============
function handleFileChange(file) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    ElMessage.error('请选择 .xlsx 文件')
    uploadFile.value = null
    return
  }
  uploadFile.value = file.raw
}
function handleExceed() {
  ElMessage.warning('仅允许选择 1 个文件，如需更换请先移除当前文件')
}

async function doPreview() {
  if (!uploadFile.value) return
  parsing.value = true
  try {
    const res = await previewImport(uploadFile.value)
    if (res.code !== 200) throw new Error(res.msg)
    const d = res.data
    preview.token = d.token
    preview.totalRows = d.totalRows
    preview.readyCount = d.readyCount
    preview.warningCount = d.warningCount
    preview.errorCount = d.errorCount
    preview.problemSummary = d.problemSummary
    preview.rows = d.rows || []
    preview.problemRows = d.problemRows || []
    problemCollapse.value = [] // 默认折叠
    step.value = 1
    const msg = `解析完成：${d.totalRows}行总计，${d.readyCount}行可导入`
      + (d.warningCount > 0 ? `，${d.warningCount}行待修正` : '')
      + (d.errorCount > 0 ? `，${d.errorCount}行无法导入` : '')
    ElMessage.success(msg)
  } catch (e) {
    ElMessage.error('解析失败：' + (e.message || e))
  } finally {
    parsing.value = false
  }
}

// ============ Step2 确认导入 ============
async function doCommit() {
  try {
    await ElMessageBox.confirm(
      `确认导入 ${preview.readyCount} 行可导入数据？（同一工程编号的多条记录将合并为同一项目的多个子项；待修正/无法导入的行将自动跳过）`,
      '确认导入', { type: 'warning' }
    )
  } catch { return }
  committing.value = true
  proxy.$modal.loading('正在导入，请稍候...')
  try {
    const res = await commitImport({ token: preview.token, rows: preview.rows })
    if (res.code !== 200) throw new Error(res.msg)
    const d = res.data
    result.logId = d.logId
    result.successCount = d.successCount
    result.skippedCount = d.skippedCount
    result.failedCount = d.failedCount
    result.failedDetails = Array.isArray(d.failedDetails) ? d.failedDetails : []
    result.skippedDetails = Array.isArray(d.skippedDetails) ? d.skippedDetails : []
    step.value = 2
    ElMessage.success('导入完成')
  } catch (e) {
    ElMessage.error('导入失败：' + (e.message || e))
  } finally {
    proxy.$modal.closeLoading()
    committing.value = false
  }
}

// ============ 下载 ============
function blobDownload(promise, filename) {
  promise.then(res => {
    const data = res.data || res
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, filename)
  }).catch(e => ElMessage.error('下载失败：' + (e.message || e)))
}
function downloadProblemFile(type) {
  if (!preview.token) return
  const name = type === 'warning' ? '待修正明细' : '无法导入明细'
  blobDownload(downloadProblems(preview.token, type), name + '.xlsx')
}
function downloadResultFile(type) {
  if (!result.logId) return
  if (type === 'skipped') {
    blobDownload(downloadImportSkipped(result.logId), '跳过明细_' + result.logId + '.xlsx')
  } else {
    blobDownload(downloadImportFailures(result.logId), '失败明细_' + result.logId + '.xlsx')
  }
}

// ============ 明细Dialog ============
const detailDlg = reactive({
  open: false, title: '', tab: 'wl',
  workloads: [], payments: []
})
function openDetail(row) {
  detailDlg.title = `${row.projectCode} - ${row.engineeringProject || ''}`
  detailDlg.workloads = row.workloads || []
  detailDlg.payments = row.payments || []
  detailDlg.tab = 'wl'
  detailDlg.open = true
}

// ============ 工具 ============
function fmt(v) {
  if (v == null) return '-'
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function resetAll() {
  uploadFile.value = null
  if (uploadRef.value) uploadRef.value.clearFiles()
  Object.assign(preview, {
    token: '', totalRows: 0, readyCount: 0, warningCount: 0, errorCount: 0,
    problemSummary: null, rows: [], problemRows: []
  })
  Object.assign(result, { logId: null, successCount: 0, skippedCount: 0, failedCount: 0 })
}

// ============ 合同导入 ============
const activeTab = ref('output')
const cStep = ref(0)
const cParsing = ref(false)
const cCommitting = ref(false)
const cUploadFile = ref(null)
const cUploadRef = ref(null)
const cProblemCollapse = ref([])

const cPreview = reactive({
  token: '', totalRows: 0, readyCount: 0, duplicateCount: 0, errorCount: 0,
  rows: [], problemRows: []
})
const cResult = reactive({ logId: null, successCount: 0, skippedCount: 0, failedCount: 0, failedDetails: [], skippedDetails: [] })

const cHasProblems = computed(() => (cPreview.duplicateCount > 0) || (cPreview.errorCount > 0))

function handleCFileChange(file) {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    ElMessage.error('请选择 .xls 或 .xlsx 文件')
    cUploadFile.value = null
    return
  }
  cUploadFile.value = file.raw
}
function handleCExceed() {
  ElMessage.warning('仅允许选择 1 个文件，如需更换请先移除当前文件')
}

async function doCPreview() {
  if (!cUploadFile.value) return
  cParsing.value = true
  try {
    const res = await previewContractImport(cUploadFile.value)
    if (res.code !== 200) throw new Error(res.msg)
    const d = res.data
    cPreview.token = d.token
    cPreview.totalRows = d.totalRows
    cPreview.readyCount = d.readyCount
    cPreview.duplicateCount = d.duplicateCount
    cPreview.errorCount = d.errorCount
    cPreview.rows = d.rows || []
    cPreview.problemRows = d.problemRows || []
    cProblemCollapse.value = []
    cStep.value = 1
    const msg = `解析完成：${d.totalRows}行总计，${d.readyCount}行可导入`
      + (d.duplicateCount > 0 ? `，${d.duplicateCount}行已存在` : '')
      + (d.errorCount > 0 ? `，${d.errorCount}行无法导入` : '')
    ElMessage.success(msg)
  } catch (e) {
    ElMessage.error('解析失败：' + (e.message || e))
  } finally {
    cParsing.value = false
  }
}

async function doCCommit() {
  try {
    await ElMessageBox.confirm(
      `确认导入 ${cPreview.readyCount} 行合同数据？（已存在/无法导入的行将自动跳过）`,
      '确认导入', { type: 'warning' }
    )
  } catch { return }
  cCommitting.value = true
  try {
    const res = await commitContractImport({ token: cPreview.token, rows: cPreview.rows })
    if (res.code !== 200) throw new Error(res.msg)
    const d = res.data
    cResult.logId = d.logId
    cResult.successCount = d.successCount
    cResult.skippedCount = d.skippedCount
    cResult.failedCount = d.failedCount
    cResult.failedDetails = Array.isArray(d.failedDetails) ? d.failedDetails : []
    cResult.skippedDetails = Array.isArray(d.skippedDetails) ? d.skippedDetails : []
    cStep.value = 2
    ElMessage.success('导入完成')
  } catch (e) {
    ElMessage.error('导入失败：' + (e.message || e))
  } finally {
    cCommitting.value = false
  }
}

function downloadCProblemFile(type) {
  if (!cPreview.token) return
  const name = type === 'duplicate' ? '已存在明细' : '无法导入明细'
  blobDownload(downloadContractProblems(cPreview.token, type), name + '.xlsx')
}
function downloadCResultFile(type) {
  if (!cResult.logId) return
  if (type === 'skipped') {
    blobDownload(downloadImportSkipped(cResult.logId), '跳过明细_' + cResult.logId + '.xlsx')
  } else {
    blobDownload(downloadImportFailures(cResult.logId), '失败明细_' + cResult.logId + '.xlsx')
  }
}

function formatDate(d) {
  if (!d) return '-'
  if (typeof d === 'string') return d.substring(0, 10)
  return d
}

function resetCAll() {
  cUploadFile.value = null
  if (cUploadRef.value) cUploadRef.value.clearFiles()
  Object.assign(cPreview, {
    token: '', totalRows: 0, readyCount: 0, duplicateCount: 0, errorCount: 0,
    rows: [], problemRows: []
  })
  Object.assign(cResult, { logId: null, successCount: 0, skippedCount: 0, failedCount: 0, failedDetails: [], skippedDetails: [] })
}
</script>


<style lang="scss" scoped>
.import-page { padding: 12px 16px 24px; }
.step-box {
  background: #fff;
  padding: 24px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.upload-demo {
  width: 100%;
  :deep(.el-upload-dragger) { padding: 32px 16px; }
}
.upload-actions { margin-top: 20px; text-align: center; }
.stat-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 4px 16px; flex-wrap: wrap;
}
.stat-pill {
  padding: 6px 14px; border-radius: 999px; background: #f4f4f5;
  font-size: 13px; display: flex; align-items: center; gap: 6px;
  b { font-size: 15px; margin-left: 4px; }
  &.stat-total { background: #ecf5ff; color: #409eff; }
  &.stat-ready { background: #f0f9eb; color: #67c23a; }
  &.stat-warn  { background: #fdf6ec; color: #e6a23c; }
  &.stat-dup   { background: #f4f4f5; color: #909399; }
  &.stat-err   { background: #fef0f0; color: #f56c6c; }
}
/* 问题摘要卡片 */
.problem-section { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.problem-card {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; border-radius: 6px; border: 1px solid;
}
.problem-warn { border-color: #e6a23c40; background: #fdf6ec; }
.problem-dup  { border-color: #90939940; background: #f4f4f5; }
.problem-err  { border-color: #f56c6c40; background: #fef0f0; }
.problem-icon { font-size: 20px; }
.problem-body { flex: 1; }
.problem-title { font-size: 14px; font-weight: 600; }
.problem-desc { font-size: 12px; color: #909399; margin-top: 2px; }
/* 问题明细折叠面板 */
.problem-collapse {
  margin-bottom: 16px;
  :deep(.el-collapse-item__header) { font-size: 14px; font-weight: 600; }
}
.collapse-title { padding-left: 4px; }
/* 可导入数据区 */
.ready-section { margin-top: 8px; }
.section-title {
  font-size: 13px; color: #606266; font-weight: 600;
  margin-bottom: 8px; padding-left: 4px;
  border-left: 3px solid #409eff;
}
/* 结果摘要 */
.result-summary { margin-bottom: 8px; }
.sum-card {
  text-align: center; border: none !important;
  .sum-label { font-size: 13px; color: #909399; }
  .sum-num   { font-size: 30px; font-weight: 700; margin: 6px 0 4px; }
  &.sum-ok   .sum-num { color: #67c23a; }
  &.sum-skip .sum-num { color: #909399; }
  &.sum-fail .sum-num { color: #f56c6c; }
}
.mt20 { margin-top: 20px; }
.result-actions { margin-top: 8px; text-align: center; }
</style>
<style>
.detail-dialog .el-dialog__body { max-height: 70vh; overflow-y: auto; }
</style>
