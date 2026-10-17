<template>
   <div class="app-container">
      <!-- 备份环境状态 -->
      <el-alert
         v-if="!env.pgDumpReady"
         type="warning"
         :closable="false"
         show-icon
         style="margin-bottom: 16px"
         title="未检测到 pg_dump（PostgreSQL 备份工具）"
      >
         <template #default>
            <div>
               任选一种方式解决，无需重装 PostgreSQL：
               <b>①</b> 把免安装版 pg_dump（<code>pg_dump.exe</code> + <code>libpq.dll</code> + <code>zlib.dll</code> +
               <code>libssl-3-x64.dll</code> + <code>libcrypto-3-x64.dll</code>，约 7MB）放进应用目录下的 <b>pgtools/</b>；
               <b>②</b> 在 <b>application.yml</b> 配置 <b>xky-project.backup.pgDumpPath</b> 指向 pg_dump 完整路径；
               <b>③</b> 安装 PostgreSQL 客户端并把 bin 加入 PATH。改完后重启后端。
            </div>
            <div style="margin-top: 4px">注意：pg_dump 主版本号需 ≥ 数据库主版本号。</div>
         </template>
      </el-alert>

      <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
         <el-descriptions-item label="备份目录">{{ env.dir || '-' }}</el-descriptions-item>
         <el-descriptions-item label="定时备份">{{ env.enabled ? '已开启（每天 23:00）' : '已关闭' }}</el-descriptions-item>
         <el-descriptions-item label="数据库版本">{{ env.serverVersion || '-' }}</el-descriptions-item>
         <el-descriptions-item label="pg_dump">
            <el-tag v-if="env.pgDumpReady" type="success" size="small">已就绪</el-tag>
            <el-tag v-else type="danger" size="small">未找到</el-tag>
            <span v-if="env.pgDump" class="path-text">{{ env.pgDump }}</span>
         </el-descriptions-item>
         <el-descriptions-item label="pg_dump 版本">
            <span v-if="env.pgDumpVersion">{{ env.pgDumpVersion }}</span>
            <span v-else>-</span>
         </el-descriptions-item>
      </el-descriptions>

      <el-row :gutter="10" class="mb8">
         <el-col :span="1.5">
            <el-button type="primary" plain icon="Refresh" :loading="loading" @click="getList">刷新</el-button>
         </el-col>
         <el-col :span="1.5">
            <el-button type="warning" plain icon="Download" :loading="running" @click="handleRun">立即备份</el-button>
         </el-col>
      </el-row>

      <el-table v-loading="loading" :data="rows" border>
         <el-table-column label="文件名" prop="name" min-width="260" show-overflow-tooltip />
         <el-table-column label="大小" prop="sizeText" align="center" width="120" />
         <el-table-column label="备份时间" align="center" width="180">
            <template #default="scope">{{ formatTime(scope.row.lastModified) }}</template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Download" @click="handleDownload(scope.row)">下载</el-button>
               <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
         </el-table-column>
         <template #empty>
            <span>暂无备份文件</span>
         </template>
      </el-table>
   </div>
</template>

<script setup name="DbBackup">
import { listDbBackup, runDbBackup, delDbBackup } from "@/api/system/dbBackup"

const { proxy } = getCurrentInstance()

const rows = ref([])
const loading = ref(false)
const running = ref(false)
const env = reactive({ dir: "", enabled: true, pgDump: "", pgDumpReady: false, pgDumpVersion: "", serverVersion: "" })

/** 查询备份文件列表（⚠️ 拦截器已解包一层，接口体在 res.data） */
async function getList() {
   loading.value = true
   try {
      const res = await listDbBackup()
      const data = res && res.data ? res.data : {}
      rows.value = Array.isArray(data.rows) ? data.rows : []
      env.dir = data.dir || ""
      env.enabled = data.enabled !== false
      env.pgDump = data.pgDump || ""
      env.pgDumpReady = data.pgDumpReady === true
      env.pgDumpVersion = data.pgDumpVersion || ""
      env.serverVersion = data.serverVersion || ""
   } catch (err) {
      proxy.$modal.msgError("备份列表加载失败：" + (err.message || err))
   } finally {
      loading.value = false
   }
}

/** 立即备份（同步执行，可能耗时较久） */
function handleRun() {
   proxy.$modal.confirm("确认立即执行一次数据库备份？大库可能需要数分钟，期间请耐心等待。").then(async () => {
      running.value = true
      try {
         const res = await runDbBackup()
         const data = res && res.data ? res.data : {}
         proxy.$modal.msgSuccess("备份完成：" + (data.file || "") + (data.sizeText ? "（" + data.sizeText + "）" : ""))
         getList()
      } catch (err) {
         proxy.$modal.msgError("备份失败：" + (err.message || err))
      } finally {
         running.value = false
      }
   }).catch(() => {})
}

/** 下载备份文件 */
function handleDownload(row) {
   proxy.download("/system/dbBackup/download", { name: row.name }, row.name)
}

/** 删除备份文件 */
function handleDelete(row) {
   proxy.$modal.confirm('确认删除备份文件「' + row.name + '」？').then(async () => {
      await delDbBackup(row.name)
      proxy.$modal.msgSuccess("删除成功")
      getList()
   }).catch(() => {})
}

/** 时间格式化（后端返回 Date，此处统一本地展示格式） */
function formatTime(val) {
   if (!val) return "-"
   const d = new Date(val)
   if (isNaN(d.getTime())) return "-"
   const p = n => String(n).padStart(2, "0")
   return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds())
}

getList()
</script>

<style scoped>
.path-text {
   margin-left: 8px;
   color: var(--el-text-color-secondary);
   font-size: 12px;
}
</style>
