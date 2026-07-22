<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
         <el-form-item label="所属项目" prop="projectId">
            <el-select v-model="queryParams.projectId" placeholder="请选择项目" clearable filterable style="width: 200px">
               <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
            </el-select>
         </el-form-item>
         <el-form-item label="联系人" prop="contactName">
            <el-input v-model="queryParams.contactName" placeholder="请输入联系人" clearable maxlength="50" style="width: 160px" />
         </el-form-item>
         <el-form-item label="成果类型" prop="resultType">
            <el-select v-model="queryParams.resultType" placeholder="请选择成果类型" clearable style="width: 160px">
               <el-option label="报告" value="报告" />
               <el-option label="图纸" value="图纸" />
               <el-option label="数据" value="数据" />
               <el-option label="影像" value="影像" />
               <el-option label="文档" value="文档" />
               <el-option label="其他" value="其他" />
            </el-select>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['project:material:add']">新增</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['project:material:edit']">修改</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['project:material:remove']">删除</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['project:material:export']">导出</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table v-loading="loading" :data="materialList" stripe border @selection-change="handleSelectionChange">
         <el-table-column type="selection" width="50" align="center" />
         <el-table-column label="所属项目" align="center" prop="projectName" min-width="170" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.projectName">{{ scope.row.projectName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="提交时间" align="center" prop="submitTime" min-width="155">
            <template #default="scope">
               <span v-if="scope.row.submitTime">{{ parseTime(scope.row.submitTime, '{y}-{m}-{d} {h}:{i}:{s}') }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="联系人" align="center" prop="contactName" min-width="100" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.contactName">{{ scope.row.contactName }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="联系电话" align="center" prop="contactPhone" min-width="130">
            <template #default="scope">
               <span v-if="scope.row.contactPhone">{{ scope.row.contactPhone }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="成果类型" align="center" prop="resultType" min-width="100">
            <template #default="scope">
               <el-tag v-if="scope.row.resultType" :type="resultTypeTag(scope.row.resultType)">{{ scope.row.resultType }}</el-tag>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="备注" align="center" prop="remark" min-width="160" :show-overflow-tooltip="true">
            <template #default="scope">
               <span v-if="scope.row.remark">{{ scope.row.remark }}</span>
               <span v-else style="color: #c0c4cc">—</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="150" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['project:material:edit']">修改</el-button>
               <el-button link type="primary" @click="handleDelete(scope.row)" v-hasPermi="['project:material:remove']">删除</el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

      <!-- 添加或修改资料提交对话框 -->
      <el-dialog :title="title" v-model="open" width="80%" append-to-body>
         <el-form ref="materialRef" :model="form" :rules="rules" label-width="90px">
            <el-row :gutter="20">
               <el-col :span="8">
                  <el-form-item label="所属项目" prop="projectId">
                     <el-select v-model="form.projectId" placeholder="请选择项目" filterable style="width: 100%">
                        <el-option v-for="p in projectOptions" :key="p.id" :label="p.projectName" :value="p.id" />
                     </el-select>
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="提交时间" prop="submitTime">
                     <el-date-picker v-model="form.submitTime" type="datetime" placeholder="选择提交时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                  </el-form-item>
               </el-col>
               <el-col :span="8">
                  <el-form-item label="成果类型" prop="resultType">
                     <el-select v-model="form.resultType" placeholder="请选择成果类型" clearable filterable allow-create style="width: 100%">
                        <el-option label="报告" value="报告" />
                        <el-option label="图纸" value="图纸" />
                        <el-option label="数据" value="数据" />
                        <el-option label="影像" value="影像" />
                        <el-option label="文档" value="文档" />
                        <el-option label="其他" value="其他" />
                     </el-select>
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
   </div>
</template>

<script setup name="Material">
import { listMaterial, getMaterial, addMaterial, updateMaterial, delMaterial } from "@/api/project/material"
import { listProject } from "@/api/project/project"

const { proxy } = getCurrentInstance()

const materialList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const total = ref(0)
const single = ref(true)
const multiple = ref(true)
const ids = ref([])
const projectOptions = ref([])

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    projectId: undefined,
    contactName: undefined,
    resultType: undefined
  },
  rules: {
    projectId: [{ required: true, message: "请选择项目", trigger: "change" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 加载项目下拉选项 */
function loadOptions() {
  listProject({ pageNum: 1, pageSize: 999 }).then(r => { projectOptions.value = r.rows || [] })
}

/** 查询资料提交列表 */
function getList() {
  loading.value = true
  listMaterial(queryParams.value).then(response => {
    materialList.value = response.rows
    total.value = response.total
    loading.value = false
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
    projectId: undefined,
    submitTime: undefined,
    contactName: undefined,
    contactPhone: undefined,
    resultType: undefined,
    remark: undefined
  }
  proxy.resetForm("materialRef")
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

/** 多选框 */
function handleSelectionChange(selection) {
  ids.value = selection.map(item => item.id)
  single.value = selection.length !== 1
  multiple.value = !selection.length
}

/** 成果类型 Tag 颜色 */
function resultTypeTag(type) {
  const map = { '报告': '', '图纸': 'success', '数据': 'primary', '影像': 'warning', '文档': 'info' }
  return map[type] || 'info'
}

/** 新增 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "新增资料提交"
}

/** 修改 */
function handleUpdate(row) {
  reset()
  const id = row.id || ids.value[0]
  getMaterial(id).then(response => {
    form.value = response.data
    open.value = true
    title.value = "修改资料提交"
  })
}

/** 提交 */
function submitForm() {
  proxy.$refs["materialRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updateMaterial(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addMaterial(form.value).then(response => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 删除 */
function handleDelete(row) {
  const idsToDelete = row.id ? [row.id] : ids.value
  proxy.$modal.confirm('是否确认删除所选资料提交记录?').then(function() {
    return delMaterial(idsToDelete.join(","))
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

/** 导出 */
function handleExport() {
  proxy.download('/project/material/export', {
    ...queryParams.value
  }, `material_${new Date().getTime()}.xlsx`)
}

loadOptions()
getList()
</script>
