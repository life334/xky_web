<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="所属项目" prop="projectId">
            <el-select v-model="queryParams.projectId" placeholder="请选择项目" clearable filterable style="width: 200px">
               <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
            </el-select>
         </el-form-item>
         <el-form-item label="执行人" prop="userId">
            <el-select v-model="queryParams.userId" placeholder="请选择执行人" clearable filterable style="width: 160px">
               <el-option v-for="u in userOptions" :key="u.userId" :label="u.nickName" :value="u.userId" />
            </el-select>
         </el-form-item>
         <el-form-item label="项目类别" prop="categoryId">
            <el-tree-select
               v-model="queryParams.categoryId"
               :data="categoryOptions"
               :props="{ value: 'id', label: 'label', children: 'children' }"
               value-key="id"
               placeholder="请选择类别"
               check-strictly
               clearable
               style="width: 180px"
            />
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" size="small" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" size="small" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" size="small" @click="handleExport" v-hasPermi="['project:workload:export']">导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="workloadList" stripe border>
         <el-table-column label="所属项目" align="center" prop="projectName" min-width="160" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.projectName">{{ scope.row.projectName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="执行人" align="center" prop="userName" min-width="80">
            <template #default="scope">
               <span v-if="scope.row.userName">{{ scope.row.userName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="项目类别" align="center" prop="categoryName" min-width="120">
            <template #default="scope">
               <span v-if="scope.row.categoryName">{{ scope.row.categoryName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="工作量" align="center" prop="workload" min-width="100" />
         <el-table-column label="内部单价" align="center" prop="internalPrice" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.internalPrice != null">{{ formatMoney(scope.row.internalPrice) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="外部单价" align="center" prop="externalPrice" min-width="100">
            <template #default="scope">
               <span v-if="scope.row.externalPrice != null">{{ formatMoney(scope.row.externalPrice) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="内部产值" align="center" prop="internalOutput" min-width="110">
            <template #default="scope">
               <span v-if="scope.row.internalOutput != null">{{ formatMoney(scope.row.internalOutput) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="外部产值" align="center" prop="externalOutput" min-width="110">
            <template #default="scope">
               <span v-if="scope.row.externalOutput != null">{{ formatMoney(scope.row.externalOutput) }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="单价来源" align="center" prop="priceSource" min-width="90">
            <template #default="scope">
               <el-tag v-if="scope.row.priceSource === 'contract'" type="primary">合同价</el-tag>
               <el-tag v-else-if="scope.row.priceSource === 'dict'" type="info">默认价</el-tag>
               <el-tag v-else-if="scope.row.priceSource === 'manual'" type="warning">手动</el-tag>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="更新时间" align="center" prop="updateTime" width="160">
            <template #default="scope">
               <span>{{ parseTime(scope.row.updateTime) }}</span>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
   </div>
</template>

<script setup name="Workload">
import { listWorkload } from "@/api/project/workload"
import { listProject } from "@/api/project/project"
import { categoryTreeselect } from "@/api/project/category"
import { listUserOptions } from "@/api/system/user"

const { proxy } = getCurrentInstance()

const workloadList = ref([])
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const projectOptions = ref([])
const userOptions = ref([])
const categoryOptions = ref([])

const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    projectId: undefined,
    userId: undefined,
    categoryId: undefined
  }
})

const { queryParams } = toRefs(data)

/** 加载下拉选项 */
function loadOptions() {
  listProject({ pageNum: 1, pageSize: 999 }).then(r => { projectOptions.value = r.rows || [] })
  listUserOptions({ pageNum: 1, pageSize: 999 }).then(r => { userOptions.value = r.rows || [] })
  categoryTreeselect().then(r => { categoryOptions.value = r.data || [] })
}

/** 查询工作量列表 */
function getList() {
  loading.value = true
  listWorkload(queryParams.value).then(response => {
    workloadList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 金额格式化 */
function formatMoney(val) {
  if (val == null) return '—'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 导出 */
function handleExport() {
  proxy.download('/project/workload/export', {
    ...queryParams.value
  }, `workload_${new Date().getTime()}.xlsx`)
}

loadOptions()
getList()
</script>
