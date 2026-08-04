<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="类别名称" prop="name">
            <el-input
               v-model="queryParams.name"
               placeholder="请输入类别名称"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="类别状态" clearable style="width: 200px">
               <el-option
                  v-for="dict in sys_normal_disable"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
         </el-form-item>
      </el-form>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button
               type="primary"
               plain
               icon="Plus"
               @click="handleAdd"
               v-hasPermi="['project:category:add']"
            >新增大类</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button
               type="info"
               plain
               icon="Sort"
               @click="toggleExpandAll"
            >展开/折叠</el-button>
         </el-col>
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
      </el-row>

      <el-table
         v-if="refreshTable"
         v-loading="loading"
         :data="categoryList"
         row-key="id"
         :default-expand-all="isExpandAll"
         :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
      >
         <el-table-column prop="name" label="类别名称" width="260"></el-table-column>
         <el-table-column prop="level" label="层级" width="100" align="center">
            <template #default="scope">
               <el-tag v-if="scope.row.level === 1" type="primary">大类</el-tag>
               <el-tag v-else type="success">小类</el-tag>
            </template>
         </el-table-column>
         <el-table-column prop="internalPrice" label="内部单价" width="150" align="center">
            <template #default="scope">
               <span v-if="scope.row.level === 2 && scope.row.internalPrice != null">{{ scope.row.internalPrice }}</span>
               <span v-else>—</span>
            </template>
         </el-table-column>
         <el-table-column prop="externalPrice" label="外部单价" width="150" align="center">
            <template #default="scope">
               <span v-if="scope.row.level === 2 && scope.row.externalPrice != null">{{ scope.row.externalPrice }}</span>
               <span v-else>—</span>
            </template>
         </el-table-column>
         <el-table-column prop="sortOrder" label="排序" width="100" align="center"></el-table-column>
         <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="scope">
               <dict-tag :options="sys_normal_disable" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="创建时间" align="center" prop="createTime" width="200">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['project:category:edit']">修改</el-button>
               <el-button v-if="scope.row.level === 1" link type="primary" icon="Plus" @click="handleAdd(scope.row)" v-hasPermi="['project:category:add']">新增小类</el-button>
               <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['project:category:remove']">删除</el-button>
            </template>
         </el-table-column>
      </el-table>

      <!-- 添加或修改项目类别对话框 -->
      <el-dialog :title="title" :model-value="open" @update:model-value="open = $event" width="600px" append-to-body>
         <el-form ref="categoryRef" :model="form" :rules="rules" label-width="100px">
            <el-row>
               <el-col :span="24" v-if="form.parentId !== undefined && form.parentId !== null">
                  <el-form-item label="上级类别" prop="parentId">
                     <el-tree-select
                        v-model="form.parentId"
                        :data="categoryOptions"
                        :props="{ value: 'id', label: 'label', children: 'children' }"
                        value-key="id"
                        placeholder="选择上级类别"
                        check-strictly
                        disabled
                     />
                  </el-form-item>
               </el-col>
               <el-col :span="24" v-else>
                  <el-form-item label="上级类别">
                     <el-tag type="info">无（顶级大类）</el-tag>
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="类别名称" prop="name">
                     <el-input v-model="form.name" placeholder="请输入类别名称" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="显示排序" prop="sortOrder">
                     <el-input-number v-model="form.sortOrder" controls-position="right" :min="0" />
                  </el-form-item>
               </el-col>
               <template v-if="form.parentId !== undefined && form.parentId !== null">
                  <el-col :span="12">
                     <el-form-item label="内部单价" prop="internalPrice">
                        <el-input-number v-model="form.internalPrice" controls-position="right" :precision="2" :min="0" placeholder="内部单价" />
                     </el-form-item>
                  </el-col>
                  <el-col :span="12">
                     <el-form-item label="外部单价" prop="externalPrice">
                        <el-input-number v-model="form.externalPrice" controls-position="right" :precision="2" :min="0" placeholder="外部单价" />
                     </el-form-item>
                  </el-col>
               </template>
               <el-col :span="12">
                  <el-form-item label="状态">
                     <el-radio-group v-model="form.status">
                        <el-radio
                           v-for="dict in sys_normal_disable"
                           :key="dict.value"
                           :value="dict.value"
                        >{{ dict.label }}</el-radio>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
               <el-col :span="24">
                  <el-form-item label="备注" prop="remark">
                     <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
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

<script setup name="Category">
import { listCategory, categoryTreeselect, getCategory, addCategory, updateCategory, delCategory } from "@/api/project/category"

const { proxy } = getCurrentInstance()
const { sys_normal_disable } = useDict("sys_normal_disable")

const categoryList = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const title = ref("")
const categoryOptions = ref([])
const isExpandAll = ref(true)
const refreshTable = ref(true)

const data = reactive({
  form: {},
  queryParams: {
    name: undefined,
    status: undefined
  },
  rules: {
    name: [{ required: true, message: "类别名称不能为空", trigger: "blur" }],
    sortOrder: [{ required: true, message: "显示排序不能为空", trigger: "blur" }]
  },
})

const { queryParams, form, rules } = toRefs(data)

/** 查询项目类别列表 */
function getList() {
  loading.value = true
  listCategory(queryParams.value).then(response => {
    categoryList.value = proxy.handleTree(response.data, "id")
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
    parentId: undefined,
    name: undefined,
    level: undefined,
    internalPrice: undefined,
    externalPrice: undefined,
    sortOrder: 0,
    status: "0",
    remark: undefined
  }
  proxy.resetForm("categoryRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 新增按钮操作 */
function handleAdd(row) {
  reset()
  if (row != undefined && row.id != undefined) {
    // 新增小类，预填父类别
    form.value.parentId = row.id
    categoryTreeselect().then(response => {
      categoryOptions.value = response.data
    })
  }
  open.value = true
  title.value = form.value.parentId ? "添加小类" : "添加大类"
}

/** 展开/折叠操作 */
function toggleExpandAll() {
  refreshTable.value = false
  isExpandAll.value = !isExpandAll.value
  nextTick(() => {
    refreshTable.value = true
  })
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  getCategory(row.id).then(response => {
    form.value = response.data
    if (form.value.parentId != null && form.value.parentId > 0) {
      // 小类：加载父类别树
      categoryTreeselect().then(res => {
        categoryOptions.value = res.data
      })
    }
    open.value = true
    title.value = "修改项目类别"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["categoryRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updateCategory(form.value).then(response => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addCategory(form.value).then(response => {
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
  proxy.$modal.confirm('是否确认删除类别"' + row.name + '"？').then(function() {
    return delCategory(row.id)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getList()
</script>
