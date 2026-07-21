<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="任务" prop="taskId">
        <el-select v-model="queryParams.taskId" placeholder="请选择任务" clearable filterable style="width: 220px" @change="handleQuery">
          <el-option
            v-for="t in taskOptions"
            :key="t.taskId"
            :label="t.taskName"
            :value="t.taskId" />
        </el-select>
      </el-form-item>
      <el-form-item label="红线名称" prop="redlineName">
        <el-input v-model="queryParams.redlineName" placeholder="请输入红线名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button size="small" type="primary" plain icon="Upload" @click="handleImport" v-hasPermi="['land:redline:import']">导入红线</el-button>
      </el-col>
      <!-- 执行判定按钮 - 红线不再参与业务逻辑，降级为参考展示 -->
      <!-- <el-col :span="1.5">
        <el-button size="small" type="warning" plain icon="Operation" :disabled="!queryParams.taskId" @click="handleJudge" v-hasPermi="['land:redline:judge']">执行判定</el-button>
      </el-col> -->
      <el-col :span="1.5">
        <el-tooltip content="切换地图视图" placement="top">
          <el-button size="small" :type="mapVisible ? 'warning' : ''" plain :icon="mapVisible ? 'Grid' : 'MapLocation'" circle @click="handleToggleMap" />
        </el-tooltip>
      </el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList" :size="'small'"/>
    </el-row>

    <!-- 列表视图 -->
    <el-table 
      v-show="!mapVisible" 
      v-loading="loading" 
      :data="redlineList" 
      stripe 
      border 
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="红线名称" align="center" prop="redlineName" min-width="160" show-overflow-tooltip />
      <el-table-column label="红线编号" align="center" prop="redlineCode" min-width="120" />
      <el-table-column label="所属任务" align="center" prop="taskName" min-width="140" show-overflow-tooltip />
      <el-table-column label="面积(亩)" align="center" prop="area" min-width="110">
        <template #default="scope">
          {{ scope.row.area != null ? scope.row.area.toFixed(2) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="手续文号" align="center" prop="legalDocumentNo" min-width="140" show-overflow-tooltip />
      <el-table-column label="有效起始" align="center" prop="validFrom" min-width="110">
        <template #default="scope">
          {{ scope.row.validFrom || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="有效截止" align="center" prop="validUntil" min-width="110">
        <template #default="scope">
          {{ scope.row.validUntil || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="来源文件" align="center" prop="sourceFile" min-width="140" show-overflow-tooltip />
      <el-table-column label="创建人" align="center" prop="createBy" min-width="100" />
      <el-table-column label="创建时间" align="center" prop="createTime" min-width="160" />
      <el-table-column label="操作" align="center" min-width="80" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-tooltip content="删除" placement="top">
            <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['land:redline:remove']" />
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>

    <!-- 地图视图（v-if 确保每次切换完整挂载，容器尺寸正确，避免 display:none 时初始化导致的 0×0 canvas 问题） -->
    <div v-if="mapVisible" class="redline-map-container" v-loading="mapLoading" element-loading-text="正在加载红线数据...">
      <land-map
        ref="landMapRef"
        :geojson="redlineGeojson"
        :fill-color="'rgba(220, 38, 38, 0.35)'"
        :stroke-color="'rgba(220, 38, 38, 0.9)'"
        :hide-panel="true"
        @map-ready="handleMapReady"
      />
    </div>

    <pagination v-show="total > 0 && !mapVisible" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <!-- 导入对话框 -->
    <el-dialog title="导入红线" v-model="importOpen" width="500px" append-to-body>
      <el-form :model="importForm" ref="importRef" label-width="100px">
        <el-form-item label="选择任务" required>
          <el-select v-model="importForm.taskId" placeholder="请选择所属任务" filterable style="width: 100%" @focus="loadTaskOptions">
            <el-option
              v-for="t in taskOptions"
              :key="t.taskId"
              :label="t.taskName"
              :value="t.taskId" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件" required>
          <el-upload
            ref="uploadRef"
            :limit="1"
            :auto-upload="false"
            accept=".json,.geojson,.shp,.zip"
            :on-change="handleFileChange"
            :file-list="fileList"
            drag>
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 .json / .geojson / .shp / .zip 文件</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" :loading="importLoading" @click="submitImport">开始导入</el-button>
          <el-button @click="importOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 执行判定确认对话框 - 红线不再参与业务逻辑，降级为参考展示 -->
    <!-- <el-dialog title="执行红线判定" v-model="judgeOpen" width="420px" append-to-body>
      <div style="padding: 10px 0;">
        <el-alert
          title="将对所选任务下所有图斑执行空间叠加判定"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 12px;" />
        <p style="color: #606266; font-size: 14px;">
          与任意红线相交的图斑判定为 <el-tag type="success" size="small">合法</el-tag>，
          完全不相交的图斑判定为 <el-tag type="danger" size="small">违法</el-tag>。
        </p>
        <p style="color: #909399; font-size: 13px; margin-top: 10px;">
          此操作会清空旧判定结果并重新判定，是否继续？
        </p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="warning" :loading="judgeLoading" @click="submitJudge">确认执行</el-button>
          <el-button @click="judgeOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog> -->
  </div>
</template>

<script setup name="LandRedline">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { listRedline, getRedlineGeoJson, getLastImportTask, importRedline, delRedline, executeJudge } from '@/api/land/redline'
import { listTask } from '@/api/land/task'
import LandMap from '@/components/LandMap/index.vue'

// ===== 响应式数据 =====
const loading = ref(false)
const ids = ref([])
const single = ref(true)
const multiple = ref(true)
const total = ref(0)
const redlineList = ref([])
const showSearch = ref(true)
const mapVisible = ref(false)
const mapLoading = ref(false)

// 任务选择
const taskOptions = ref([])
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  taskId: null,
  redlineName: null
})

// 地图相关
const landMapRef = ref(null)
const redlineGeojson =  ref({ type: 'FeatureCollection', features: [] })

// 导入相关
const importOpen = ref(false)
const importLoading = ref(false)
const importForm = reactive({ taskId: null })
const fileList = ref([])
const selectedFile = ref(null)

// 判定相关
const judgeOpen = ref(false)
const judgeLoading = ref(false)

// ===== 方法 =====

function getList() {
  loading.value = true
  listRedline(queryParams).then(res => {
    redlineList.value = res.rows
    total.value = res.total
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

function resetQuery() {
  queryParams.taskId = null
  queryParams.redlineName = null
  queryParams.pageNum = 1
  handleQuery()
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.redlineId)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

// 加载任务下拉选项
function loadTaskOptions() {
  if (taskOptions.value.length > 0) return
  listTask().then(res => {
    taskOptions.value = res.rows || []
  })
}

// 切换地图视图（v-if 确保组件每次完整挂载，容器尺寸正确）
function handleToggleMap() {
  mapVisible.value = !mapVisible.value
  if (mapVisible.value) {
    loadRedlineGeojson()
    nextTick(() => {
      if (landMapRef.value) {
        landMapRef.value.resize()
      }
    })
  }
}

// 加载红线 GeoJSON（按当前选中的任务）
function loadRedlineGeojson() {
  if (!queryParams.taskId) {
    ElMessage.warning('请先选择任务')
    return
  }
  mapLoading.value = true
  getRedlineGeoJson(queryParams.taskId).then(res => {
    redlineGeojson.value = res.data
  }).catch(() => {
    redlineGeojson.value = { type: 'FeatureCollection', features: [] }
  }).finally(() => {
    mapLoading.value = false
  })
}

function handleMapReady() {
  // 地图就绪
}

// 导入
function handleImport() {
  importForm.taskId = queryParams.taskId
  fileList.value = []
  selectedFile.value = null
  importOpen.value = true
}

function handleFileChange(file) {
  selectedFile.value = file.raw
}

function submitImport() {
  if (!importForm.taskId) {
    ElMessage.warning('请选择任务')
    return
  }
  if (!selectedFile.value) {
    ElMessage.warning('请选择导入文件')
    return
  }

  importLoading.value = true
  importRedline({ file: selectedFile.value, taskId: importForm.taskId })
    .then(res => {
      ElMessage.success(`成功导入 ${res.data.total} 条红线`)
      importOpen.value = false
      queryParams.taskId = importForm.taskId
      getList()
    })
    .catch(err => {
      ElMessage.error(err.message || '导入失败')
    })
    .finally(() => {
      importLoading.value = false
    })
}

// 删除
function handleDelete(row) {
  ElMessageBox.confirm('确定删除该红线数据吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    return delRedline(row.redlineId)
  }).then(() => {
    getList()
    ElMessage.success('删除成功')
  }).catch(() => {})
}

// 执行判定 - 红线不再参与业务逻辑，降级为参考展示
/* function handleJudge() {
  if (!queryParams.taskId) {
    ElMessage.warning('请先选择任务')
    return
  }
  judgeOpen.value = true
}

function submitJudge() {
  judgeLoading.value = true
  executeJudge(queryParams.taskId)
    .then(() => {
      ElMessage.success('红线判定执行成功')
      judgeOpen.value = false
    })
    .catch(err => {
      ElMessage.error(err.message || '判定执行失败')
    })
    .finally(() => {
      judgeLoading.value = false
    })
} */

// ===== 生命周期 =====
onMounted(() => {
  loadTaskOptions()
  getLastImportTask().then(res => {
    if (res.data && res.data.task_id) {
      queryParams.taskId = res.data.task_id
    }
  }).finally(() => {
    getList()
  })
})
</script>

<style scoped>
.redline-map-container {
  width: 100%;
  height: calc(100vh - 240px);
  min-height: 500px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}
</style>
