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

      <!-- 恢复步骤提示：页面上不做一键恢复（恢复是破坏性操作，且应用在线时无法安全覆盖自身数据库），
           这里给出可直接执行的命令，具体备份文件点表格行的「恢复命令」生成 -->
      <el-collapse v-model="helpPanels" class="restore-help">
         <el-collapse-item name="restore" title="如何恢复数据库（两种方式，点开看步骤）">
            <div class="restore-box">
               <el-alert type="info" :closable="false" show-icon style="margin-bottom: 12px">
                  <template #default>
                     恢复需要在数据库服务器上手工执行命令，页面只提供步骤与命令，<b>不会动你的数据</b>。
                     建议<b>先做方式 A</b>：恢复到新库既能验证这份备份到底能不能用，又完全不碰现有库，
                     确认数据对得上之后，再决定要不要用方式 B 切到正式库。
                     <div style="margin-top: 4px">
                        当前备份目录：<code>{{ env.dir || '-' }}</code>；
                        恢复工具：
                        <b v-if="env.pgRestoreReady">{{ env.pgRestore }}</b>
                        <b v-else style="color: var(--el-color-danger)">未找到 pg_restore</b>。
                     </div>
                  </template>
               </el-alert>

               <el-tabs v-model="helpTab">
                  <el-tab-pane label="方式 A：恢复到新库（推荐，不影响现有库）" name="a">
                     <pre class="cmd-block">{{ cmdA() }}</pre>
                     <el-button type="primary" plain size="small" icon="CopyDocument" @click="copyText(cmdA())">复制 A 的命令</el-button>
                  </el-tab-pane>
                  <el-tab-pane label="方式 B：覆盖恢复当前库（高风险）" name="b">
                     <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 10px"
                        title="会先删掉当前库里的所有表再重建。必须先在服务器上停掉应用，执行前建议再手动备份一次当前库。" />
                     <pre class="cmd-block">{{ cmdB() }}</pre>
                     <el-button type="danger" plain size="small" icon="CopyDocument" @click="copyText(cmdB())">复制 B 的命令</el-button>
                  </el-tab-pane>
               </el-tabs>

               <div class="restore-tips">
                  <div class="restore-tips-title">两个必须注意的点</div>
                  <div>① <b>pg_restore 版本要 ≥ 备份文件的 pg_dump 版本</b>，否则报版本不匹配（当前：{{ env.pgDumpVersion || '-' }} / {{ env.pgRestoreVersion || '-' }}）。</div>
                  <div>② <b>--single-transaction 不能与 -j 同时使用</b>（pg_restore 会直接报错），所以方式 A 用 -j 并发、方式 B 用单事务但不开并发。</div>
               </div>
            </div>
         </el-collapse-item>
      </el-collapse>

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
         <el-table-column label="操作" align="center" width="230" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Download" @click="handleDownload(scope.row)">下载</el-button>
               <el-button link type="warning" icon="Guide" @click="showRestore(scope.row)">恢复命令</el-button>
               <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
         </el-table-column>
         <template #empty>
            <span>暂无备份文件</span>
         </template>
      </el-table>

      <!-- 针对某个具体备份文件的恢复命令 -->
      <el-dialog v-model="restoreDlg.visible" title="恢复命令" width="860px" append-to-body destroy-on-close>
         <div class="restore-dlg-file">备份文件：<b>{{ restoreDlg.file }}</b></div>
         <el-tabs v-model="restoreDlg.tab">
            <el-tab-pane label="方式 A：恢复到新库（不影响现有库）" name="a">
               <pre class="cmd-block">{{ cmdA() }}</pre>
               <el-button type="primary" plain size="small" icon="CopyDocument" @click="copyText(cmdA())">复制命令</el-button>
            </el-tab-pane>
            <el-tab-pane label="方式 B：覆盖当前库（高风险）" name="b">
               <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 10px"
                  title="会先删掉当前库里的所有表再重建。必须先停应用，执行前建议再手动备份一次当前库。" />
               <pre class="cmd-block">{{ cmdB() }}</pre>
               <el-button type="danger" plain size="small" icon="CopyDocument" @click="copyText(cmdB())">复制命令</el-button>
            </el-tab-pane>
         </el-tabs>
         <template #footer>
            <el-button @click="restoreDlg.visible = false">关闭</el-button>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="DbBackup">
import { listDbBackup, runDbBackup, delDbBackup } from "@/api/system/dbBackup"

const { proxy } = getCurrentInstance()

const rows = ref([])
const loading = ref(false)
const running = ref(false)
const env = reactive({
   dir: "",
   enabled: true,
   pgDump: "",
   pgDumpReady: false,
   pgDumpVersion: "",
   serverVersion: "",
   // 恢复相关（后端不下发密码，密码一律由执行人自己填）
   pgRestore: "",
   pgRestoreReady: false,
   pgRestoreVersion: "",
   host: "",
   port: "",
   dbName: "",
   user: ""
})

// 恢复说明：默认收起；页面不做一键恢复，只给步骤与命令
const helpPanels = ref([])
const helpTab = ref("a")
// 当前查看恢复命令的备份文件（空 = 说明区，用占位符）
const currentDump = ref("")
const restoreDlg = reactive({ visible: false, file: "", tab: "a" })

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
      env.pgRestore = data.pgRestore || ""
      env.pgRestoreReady = data.pgRestoreReady === true
      env.pgRestoreVersion = data.pgRestoreVersion || ""
      env.host = data.host || ""
      env.port = data.port || ""
      env.dbName = data.dbName || ""
      env.user = data.user || ""
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

/* ---------------- 恢复命令生成（页面不执行恢复，只给可直接粘贴的命令） ---------------- */

/** 恢复工具路径：优先用后端探测到的，探测不到则退回 PATH 里的 pg_restore */
function restoreExe() {
   return env.pgRestore || "pg_restore"
}

/** -h host -p port -U user */
function connArgs() {
   const a = []
   if (env.host) a.push("-h " + env.host)
   if (env.port) a.push("-p " + env.port)
   if (env.user) a.push("-U " + env.user)
   return a.join(" ")
}

/** 备份文件的完整路径（Windows 反斜杠；未指定文件时用占位符） */
function dumpPathOf(file) {
   const dir = (env.dir || "D:\\xky-db-backup").replace(/\//g, "\\").replace(/\\+$/, "")
   return dir + "\\" + (file || "<备份文件名>.dump")
}

/** 从文件名里的时间戳生成新库名，避免和现有库重名 */
function targetDbOf(file) {
   const m = /(\d{8})_(\d{6})/.exec(file || "")
   return "xky_project_r_" + (m ? m[1] + "_" + m[2] : "yyyyMMdd_HHmmss")
}

/** 方式 A：恢复到新库 —— 不碰现有库，失败删掉新库重来即可 */
function cmdA() {
   const file = currentDump.value
   const target = targetDbOf(file)
   return [
      ":: ① 建空库（在 Navicat / DBeaver 里执行 SQL）",
      "CREATE DATABASE " + target + " TEMPLATE template0;",
      "",
      ":: ② 恢复到这个新库（-j 并发；失败就把新库删掉重来，现有库完全不受影响）",
      "set PGPASSWORD=你的数据库密码",
      restoreExe() + " " + connArgs() + " -d " + target + " -j 4 --no-owner \"" + dumpPathOf(file) + "\"",
      "",
      ":: ③ 抽查数据（可选）",
      "select (select count(*) from proj_project) as 项目数, (select count(*) from proj_workload) as 工作量行数;",
      "",
      ":: ④ 验证完删除（DROP 前先断开该库连接）",
      "DROP DATABASE " + target + ";"
   ].join("\n")
}

/** 方式 B：原地覆盖 —— 不可中断，必须停应用；--single-transaction 保证失败整体回滚 */
function cmdB() {
   const file = currentDump.value
   const db = env.dbName || "xky_project"
   return [
      ":: ① 先停掉应用（必须，否则连接池占用会导致恢复失败）",
      "",
      ":: ② 断开该库的残留连接（连 postgres 库执行）",
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity",
      " WHERE datname = '" + db + "' AND pid <> pg_backend_pid();",
      "",
      ":: ③ 覆盖恢复：--clean 先删对象再重建，--single-transaction 失败整体回滚",
      "::    注意：--single-transaction 不能与 -j 同时使用，所以这里不加 -j",
      "set PGPASSWORD=你的数据库密码",
      restoreExe() + " " + connArgs() + " -d " + db + " --clean --if-exists --no-owner --single-transaction \"" + dumpPathOf(file) + "\"",
      "",
      ":: ④ 重启应用，登录验证"
   ].join("\n")
}

/** 打开某个备份文件的恢复命令弹窗 */
function showRestore(row) {
   currentDump.value = row.name
   restoreDlg.file = row.name
   restoreDlg.tab = "a"
   restoreDlg.visible = true
}

/** 复制文本：内网 http 下 navigator.clipboard 不可用，退回 execCommand */
function copyText(text) {
   if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
         .then(() => proxy.$modal.msgSuccess("已复制到剪贴板"))
         .catch(() => fallbackCopy(text))
   } else {
      fallbackCopy(text)
   }
}

function fallbackCopy(text) {
   const el = document.createElement("textarea")
   el.value = text
   el.setAttribute("readonly", "")
   el.style.position = "absolute"
   el.style.left = "-9999px"
   document.body.appendChild(el)
   el.select()
   let ok = false
   try {
      ok = document.execCommand("copy")
   } catch (e) {
      ok = false
   }
   el.remove()
   ok ? proxy.$modal.msgSuccess("已复制到剪贴板") : proxy.$modal.msgError("复制失败，请手动选中命令文本复制")
}

getList()
</script>

<style scoped>
.path-text {
   margin-left: 8px;
   color: var(--el-text-color-secondary);
   font-size: 12px;
}

/* 恢复步骤提示 */
.restore-help {
   margin-bottom: 12px;
}
.restore-help :deep(.el-collapse-item__header) {
   font-weight: 600;
}
.restore-box {
   padding: 2px 2px 0;
}
.cmd-block {
   margin: 0 0 8px;
   padding: 10px 12px;
   background: var(--el-fill-color-light);
   border: 1px solid var(--el-border-color-lighter);
   border-radius: 4px;
   font-family: Consolas, Monaco, "Courier New", monospace;
   font-size: 12px;
   line-height: 1.7;
   color: var(--el-text-color-primary);
   white-space: pre-wrap;
   word-break: break-all;
   max-height: 340px;
   overflow: auto;
}
.restore-tips {
   margin-top: 12px;
   padding: 10px 12px;
   background: var(--el-fill-color-lighter);
   border-left: 3px solid var(--el-color-warning);
   border-radius: 2px;
   font-size: 12px;
   line-height: 1.9;
   color: var(--el-text-color-regular);
}
.restore-tips-title {
   margin-bottom: 2px;
   font-weight: 600;
   color: var(--el-text-color-primary);
}
.restore-dlg-file {
   margin-bottom: 10px;
   font-size: 13px;
   color: var(--el-text-color-regular);
}
</style>
