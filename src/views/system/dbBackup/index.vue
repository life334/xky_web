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

      <!-- 灾备目录配置了但当前访问不到：必须显式告警，否则运维以为灾备是好的 -->
      <el-alert
         v-if="env.secondaryEnabled && !env.secondaryReachable"
         type="warning"
         :closable="false"
         show-icon
         style="margin-bottom: 16px"
         title="异地灾备目录当前不可达"
      >
         <template #default>
            <div>
               目录 <code>{{ env.secondaryDir }}</code> 访问不到，通常是：① 灾备机宕机或关机；② 网络中断；
               ③ 共享目录没给权限（<b>应用以 Windows 服务 / SYSTEM 账号启动时访问不了 UNC，最常见</b>）。
            </div>
            <div style="margin-top: 4px">
               影响：备份<b>仍会正常写入本机</b>，但不会产生异地副本；列表里也看不到只存在于灾备机的备份文件。
               请修好后点「刷新」。
            </div>
         </template>
      </el-alert>

      <!-- 列表里出现"只存在于灾备机"的备份文件（换新机器后的典型场景），说明它能直接恢复 -->
      <el-alert
         v-if="remoteOnlyCount > 0"
         type="info"
         :closable="false"
         show-icon
         style="margin-bottom: 16px"
         :title="'列表中有 ' + remoteOnlyCount + ' 个备份文件只在灾备目录里（本机备份目录没有）'"
      >
         <template #default>
            这类文件<b>可以直接「一键恢复」</b>：系统会在恢复前自动把它从灾备目录取回本机，再执行 pg_restore。
            适用于服务器整机挂掉、换机重新部署后从灾备机恢复数据的场景。
         </template>
      </el-alert>

      <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
         <el-descriptions-item label="备份目录">{{ env.dir || '-' }}</el-descriptions-item>
         <el-descriptions-item label="异地灾备目录">
            <span v-if="env.secondaryEnabled">{{ env.secondaryDir }}</span>
            <span v-else class="text-muted">未启用（配置项 xky-project.backup.secondaryDir）</span>
         </el-descriptions-item>
         <el-descriptions-item label="灾备目录状态">
            <el-tag v-if="!env.secondaryEnabled" size="small" type="info">未启用</el-tag>
            <el-tag v-else-if="env.secondaryReachable" size="small" type="success">可访问</el-tag>
            <el-tag v-else size="small" type="danger">不可访问</el-tag>
         </el-descriptions-item>
         <el-descriptions-item label="定时备份">{{ env.enabled ? '已开启（每 4 小时一次）' : '已关闭' }}</el-descriptions-item>
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
         <el-descriptions-item label="pg_restore（一键恢复）">
            <el-tag v-if="env.pgRestoreReady" type="success" size="small">已就绪</el-tag>
            <el-tag v-else type="danger" size="small">未找到</el-tag>
            <span v-if="env.pgRestore" class="path-text">{{ env.pgRestore }}</span>
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
                     <div style="margin-top: 4px">
                        不想敲命令？直接用表格里的 <b>「一键恢复」</b>：选好目标库后由系统自动执行 pg_restore，本页实时看进度。
                     </div>
                     <div style="margin-top: 4px">
                        <b>换机或重装后本机备份目录是空的？</b>两条路：把灾备机上的 <code>.dump</code> 拷回
                        <code>{{ env.dir || '备份目录' }}</code> 后点「刷新」；或配置
                        <code>xky-project.backup.secondaryDir</code> 指向灾备机共享目录，刷新后灾备机上的备份文件会直接列出来，可一键恢复。
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
         <el-table-column label="文件名" prop="name" min-width="230" show-overflow-tooltip />
         <el-table-column label="大小" prop="sizeText" align="center" width="110" />
         <el-table-column label="备份时间" align="center" width="180">
            <template #default="scope">{{ formatTime(scope.row.lastModified) }}</template>
         </el-table-column>
         <el-table-column label="所在位置" align="center" width="140">
            <template #default="scope">
               <el-tag v-if="scope.row.location === 'both'" type="success" size="small">本机 + 异地</el-tag>
               <el-tag v-else-if="scope.row.location === 'secondary'" type="warning" size="small">仅异地（可恢复）</el-tag>
               <span v-else class="text-muted">仅本机</span>
            </template>
         </el-table-column>
         <el-table-column label="异地副本" align="center" width="110">
            <template #default="scope">
               <!-- 文件本身就在异地时不存在"副本"一说，直接划掉，避免和「所在位置」列矛盾 -->
               <span v-if="scope.row.location === 'secondary'" class="text-muted">—</span>
               <el-tag v-else-if="scope.row.secondary === 'synced'" type="success" size="small">已同步</el-tag>
               <el-tag v-else-if="scope.row.secondary === 'missing'" type="danger" size="small">缺失</el-tag>
               <span v-else class="text-muted">未启用</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" align="center" width="330" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" icon="Download" @click="handleDownload(scope.row)">下载</el-button>
               <el-button link type="danger" icon="RefreshRight" @click="openRestore(scope.row)">一键恢复</el-button>
               <el-button link type="warning" icon="Guide" @click="showRestore(scope.row)">恢复命令</el-button>
               <el-button link type="danger" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
         </el-table-column>
         <template #empty>
            <div style="padding: 8px 0">
               <div>暂无备份文件</div>
               <div v-if="env.dir" class="text-muted" style="margin-top: 6px; font-size: 12px">
                  备份文件在别的机器上？两条路：
                  <b>①</b> 把 <code>.dump</code> 拷到备份目录 <code>{{ env.dir }}</code> 后点「刷新」；
                  <b>②</b> 在 <b>application.yml</b> 配置 <b>xky-project.backup.secondaryDir</b> 指向灾备机共享目录
                  （如 <code>\\\\192.168.1.20\\db-backup</code>），刷新后灾备机上的备份文件会直接出现在列表里，可一键恢复。
               </div>
            </div>
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

      <!-- 一键恢复：由后端异步执行 pg_restore，页面只负责选目标库 + 看进度 -->
      <el-dialog v-model="runDlg.visible" title="一键恢复（pg_restore）" width="780px" append-to-body destroy-on-close>
         <div class="restore-dlg-file">
            备份文件：<b>{{ runDlg.file }}</b>
            <span v-if="runDlg.sizeText" class="text-muted">（{{ runDlg.sizeText }}）</span>
            <el-tag v-if="runDlg.location === 'secondary'" type="warning" size="small" style="margin-left: 6px">仅存在于灾备目录</el-tag>
         </div>

         <el-alert v-if="runDlg.location === 'secondary'" type="info" :closable="false" show-icon style="margin-bottom: 12px"
            title="这个文件只存在于灾备目录。点「开始恢复」后系统会先把它取回本机备份目录，再执行 pg_restore" />

         <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 12px"
            title="恢复只写入「目标库」，不会碰现有库；已有业务数据的库一律拒绝覆盖（确需覆盖现库请停应用后走命令行方式 B）。" />

         <el-radio-group v-model="runDlg.mode" :disabled="rst.running" style="margin-bottom: 10px">
            <el-radio value="new">恢复到新建库（推荐）</el-radio>
            <el-radio value="exist">恢复到已有空库</el-radio>
         </el-radio-group>

         <div v-if="runDlg.mode === 'new'" class="db-pick">
            <span class="db-pick-label">新库名</span>
            <el-input v-model="runDlg.newDb" :disabled="rst.running" style="width: 330px" placeholder="xky_project_r_20261022_103000" />
            <span class="text-muted">小写字母 / 数字 / 下划线；库不存在会自动创建</span>
         </div>
         <div v-else class="db-pick">
            <span class="db-pick-label">目标库</span>
            <el-select v-model="runDlg.existDb" :disabled="rst.running" filterable placeholder="请选择库" style="width: 330px" @change="onSelectExistDb">
               <el-option v-for="d in runDlg.dbRows" :key="d.name" :label="d.name + (d.current ? '（当前）' : '')" :value="d.name" />
            </el-select>
            <span v-if="runDlg.checking" class="text-muted">检查中…</span>
            <span v-else-if="runDlg.check" :class="runDlg.check.restorable ? 'ok-text' : 'err-text'">
               表数量 {{ runDlg.check.tableCount }} · {{ runDlg.check.sizeText }} · {{ runDlg.check.reason }}
            </span>
         </div>

         <!-- 恢复进度 -->
         <div v-if="rst.started" class="restore-progress">
            <div class="rp-line">
               <el-tag v-if="rst.running" type="warning" size="small">{{ rst.phase || '执行中' }}</el-tag>
               <el-tag v-else-if="rst.success === true" type="success" size="small">恢复完成</el-tag>
               <el-tag v-else-if="rst.success === false" type="danger" size="small">恢复失败</el-tag>
               <span class="text-muted">已用时 {{ rst.running ? rst.elapsed : Math.round(rst.costMs / 1000) }} 秒</span>
            </div>
            <el-progress v-if="rst.running" :percentage="100" :indeterminate="true" :show-text="false" />
            <div v-if="rst.message" class="rp-msg">{{ rst.message }}</div>
            <pre v-if="rst.log" class="cmd-block log-block">{{ rst.log }}</pre>
            <pre v-if="rst.success === true" class="cmd-block">{{ switchTip() }}</pre>
         </div>

         <template #footer>
            <el-button @click="runDlg.visible = false">关闭</el-button>
            <el-button type="danger" icon="RefreshRight" :loading="runDlg.starting" :disabled="!canStart()" @click="startRestore">
               开始恢复
            </el-button>
         </template>
      </el-dialog>

      <!-- 恢复库管理 -->
      <el-collapse v-model="dbPanels" class="restore-help" style="margin-top: 16px">
         <el-collapse-item name="db" title="恢复库管理（数据库服务器上的库）">
            <el-row :gutter="10" class="mb8">
               <el-col :span="1.5">
                  <el-button type="primary" plain icon="Refresh" :loading="dbMgr.loading" @click="loadDatabases(false)">刷新</el-button>
               </el-col>
            </el-row>
            <el-table v-loading="dbMgr.loading" :data="dbMgr.rows" border size="small">
               <el-table-column label="库名" prop="name" min-width="240">
                  <template #default="scope">
                     <span>{{ scope.row.name }}</span>
                     <el-tag v-if="scope.row.current" type="warning" size="small" style="margin-left: 6px">应用当前库</el-tag>
                  </template>
               </el-table-column>
               <el-table-column label="大小" prop="sizeText" align="center" width="120" />
               <el-table-column label="操作" align="center" width="120">
                  <template #default="scope">
                     <el-button v-if="scope.row.droppable" link type="danger" icon="Delete" @click="handleDropDb(scope.row)">删除</el-button>
                     <span v-else class="text-muted">不可删除</span>
                  </template>
               </el-table-column>
               <template #empty><span>点击「刷新」加载库列表</span></template>
            </el-table>
            <div class="restore-tips" style="margin-top: 10px">
               只允许删除 <b>xky_project_r_</b> 前缀的历史恢复库；应用当前库与其它业务库一律不可删除。
            </div>
         </el-collapse-item>
      </el-collapse>
   </div>
</template>

<script setup name="DbBackup">
import {
   listDbBackup,
   runDbBackup,
   delDbBackup,
   listDatabases,
   inspectDb,
   restoreDbBackup,
   restoreStatus,
   dropDatabase
} from "@/api/system/dbBackup"

const { proxy } = getCurrentInstance()

const rows = ref([])
const loading = ref(false)
const running = ref(false)
// 只存在于灾备机、本机没有的备份文件数量 > 0 时，顶部给出"可以一键恢复"的说明
const remoteOnlyCount = ref(0)
const env = reactive({
   dir: "",
   enabled: true,
   // 异地（灾备）目录：留空表示未启用，表格里"异地副本"列会显示为「未启用」
   secondaryDir: "",
   secondaryEnabled: false,
   // 灾备目录当前能否访问（不可达时顶部告警：运维得知道灾备其实没生效）
   secondaryReachable: false,
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

// 恢复说明：默认收起；给命令方式（手工执行）的步骤
const helpPanels = ref([])
const helpTab = ref("a")
// 恢复库管理面板：默认收起
const dbPanels = ref([])
// 当前查看恢复命令的备份文件（空 = 说明区，用占位符）
const currentDump = ref("")
// 当前备份文件所在位置（决定生成的命令里用本机目录还是灾备目录）
const currentDumpLoc = ref("local")
const restoreDlg = reactive({ visible: false, file: "", tab: "a" })

/* ---------------- 一键恢复（后端异步执行 pg_restore，页面轮询进度） ---------------- */

// 恢复对话框
const runDlg = reactive({
   visible: false,
   file: "",
   sizeText: "",
   // 备份文件所在位置：local / both / secondary（secondary=只在灾备目录，恢复前会自动取回本机）
   location: "local",
   // new=恢复到新建库；exist=恢复到已有空库
   mode: "new",
   newDb: "",
   existDb: "",
   dbRows: [],
   dbLoading: false,
   checking: false,
   check: null, // { exists, tableCount, sizeText, restorable, reason }
   starting: false
})

// 恢复任务状态（轮询填充）
const rst = reactive({
   running: false,
   phase: "",
   success: null,
   message: "",
   log: "",
   file: "",
   targetDb: "",
   createdDb: false,
   tableCount: -1,
   costMs: 0,
   elapsed: 0,
   started: false
})

// 应用当前连接的库（库列表里标出来，避免误选）
const currentDb = ref("")
// 库管理面板
const dbMgr = reactive({ rows: [], loading: false })

let pollTimer = null
let tickTimer = null

/** 查询备份文件列表（⚠️ 拦截器已解包一层，接口体在 res.data） */
async function getList() {
   loading.value = true
   try {
      const res = await listDbBackup()
      const data = res && res.data ? res.data : {}
      const list = Array.isArray(data.rows) ? data.rows : []
      rows.value = list
      // 只存在于灾备机的文件数量：>0 说明当前正处在"本机没备份、靠灾备机"的状态
      remoteOnlyCount.value = list.filter(r => r.location === "secondary").length
      env.dir = data.dir || ""
      env.enabled = data.enabled !== false
      env.secondaryDir = data.secondaryDir || ""
      env.secondaryEnabled = data.secondaryEnabled === true
      env.secondaryReachable = data.secondaryReachable === true
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
         // 异地副本失败不算备份失败，但必须明确提示——否则运维以为灾备是好的
         if (data.secondaryOk === false) {
            proxy.$modal.msgWarning("异地灾备未写入：" + (data.secondaryError || "未知原因"))
         }
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

/** 删除备份文件（只存在于灾备目录的文件，删掉就没了 —— 确认框里说清楚） */
function handleDelete(row) {
   const tip = row.location === "secondary"
      ? '确认删除备份文件「' + row.name + '」？\n\n该文件只存在于灾备目录，删除后本机与灾备机上的这一份都会消失，无法恢复。'
      : '确认删除备份文件「' + row.name + '」？'
   proxy.$modal.confirm(tip).then(async () => {
      await delDbBackup(row.name)
      proxy.$modal.msgSuccess("删除成功")
      getList()
   }).catch(() => {})
}

/* ---------------- 一键恢复：对话框 / 目标库检查 / 启动与轮询 ---------------- */

/** 打开一键恢复对话框 */
async function openRestore(row) {
   runDlg.file = row.name
   runDlg.sizeText = row.sizeText || ""
   runDlg.location = row.location || "local"
   runDlg.mode = "new"
   runDlg.newDb = targetDbOf(row.name)
   runDlg.existDb = ""
   runDlg.check = null
   runDlg.visible = true
   await loadDatabases(true)
}

/** 加载数据库列表（intoDlg=true 时只填对话框下拉，否则填下方库管理表格） */
async function loadDatabases(intoDlg) {
   if (intoDlg) {
      runDlg.dbLoading = true
   } else {
      dbMgr.loading = true
   }
   try {
      const res = await listDatabases()
      const data = res && res.data ? res.data : {}
      const rows = Array.isArray(data.rows) ? data.rows : []
      currentDb.value = data.currentDb || ""
      if (intoDlg) {
         runDlg.dbRows = rows
         dbMgr.rows = rows
      } else {
         dbMgr.rows = rows
      }
   } catch (err) {
      proxy.$modal.msgError("库列表加载失败：" + (err.message || err))
   } finally {
      runDlg.dbLoading = false
      dbMgr.loading = false
   }
}

/** 选中已有库 → 立即检查它能不能作为恢复目标 */
async function onSelectExistDb(db) {
   runDlg.check = null
   if (!db) return
   runDlg.checking = true
   try {
      const res = await inspectDb(db)
      runDlg.check = res && res.data ? res.data : null
   } catch (err) {
      proxy.$modal.msgError("检查目标库失败：" + (err.message || err))
   } finally {
      runDlg.checking = false
   }
}

/** 目标库名（按当前模式） */
function currentTargetDb() {
   return runDlg.mode === "new" ? runDlg.newDb : runDlg.existDb
}

/** 是否可以点「开始恢复」 */
function canStart() {
   if (rst.running) return false
   const target = currentTargetDb()
   if (!target) return false
   if (runDlg.mode === "exist") {
      return !runDlg.checking && runDlg.check != null && runDlg.check.restorable === true
   }
   return true
}

/** 启动恢复 */
function startRestore() {
   const target = currentTargetDb()
   if (!target) {
      proxy.$modal.msgWarning("请先填写或选择目标库")
      return
   }
   const tip = runDlg.mode === "new"
      ? "确认把「" + runDlg.file + "」恢复到新建库 " + target + "？\n\n该库不存在会自动创建；现有库完全不受影响。"
      : "确认把「" + runDlg.file + "」恢复到已有库 " + target + "？\n\n该库必须为空库，恢复只写入这一个库。"
   proxy.$modal.confirm(tip).then(async () => {
      runDlg.starting = true
      try {
         await restoreDbBackup(runDlg.file, target)
         rst.started = true
         rst.running = true
         rst.success = null
         rst.message = ""
         rst.log = ""
         rst.file = runDlg.file
         rst.targetDb = target
         rst.elapsed = 0
         startPoll()
         proxy.$modal.msgSuccess("恢复任务已启动，留意下方进度")
      } catch (err) {
         proxy.$modal.msgError("启动恢复失败：" + (err.message || err))
      } finally {
         runDlg.starting = false
      }
   }).catch(() => {})
}

function startPoll() {
   stopPoll()
   pollTimer = setInterval(pollStatus, 1500)
   tickTimer = setInterval(() => {
      if (rst.running) rst.elapsed += 1
   }, 1000)
   pollStatus()
}

function stopPoll() {
   if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
   }
   if (tickTimer) {
      clearInterval(tickTimer)
      tickTimer = null
   }
}

async function pollStatus() {
   try {
      const res = await restoreStatus()
      const d = res && res.data ? res.data : {}
      rst.running = d.running === true
      rst.phase = d.phase || ""
      rst.success = d.success === true || d.success === false ? d.success : null
      rst.message = d.message || ""
      rst.log = d.log || ""
      rst.file = d.file || rst.file
      rst.targetDb = d.targetDb || rst.targetDb
      rst.createdDb = d.createdDb === true
      rst.tableCount = typeof d.tableCount === "number" ? d.tableCount : -1
      rst.costMs = d.costMs || 0
      if (!rst.running && rst.started) {
         stopPoll()
         if (rst.success === true) {
            proxy.$modal.msgSuccess("恢复完成：" + rst.targetDb)
            loadDatabases(true)
         } else if (rst.success === false) {
            proxy.$modal.msgError("恢复失败：" + (rst.message || "未知原因"))
         }
      }
   } catch (err) {
      // 轮询偶尔失败无所谓，下一轮继续
   }
}

/** 页面刚打开时同步一次任务状态：在跑就接着轮询，跑完了也能在对话框里看到结果 */
async function checkRunningTask() {
   try {
      const res = await restoreStatus()
      const d = res && res.data ? res.data : {}
      if (d.startedAt) {
         rst.started = true
         rst.running = d.running === true
         rst.success = d.success === true || d.success === false ? d.success : null
         rst.message = d.message || ""
         rst.log = d.log || ""
         rst.file = d.file || ""
         rst.targetDb = d.targetDb || ""
         rst.createdDb = d.createdDb === true
         rst.tableCount = typeof d.tableCount === "number" ? d.tableCount : -1
         rst.costMs = d.costMs || 0
         if (rst.running) {
            startPoll()
         }
      }
   } catch (err) {
      // 忽略
   }
}

/** 删除历史恢复库（后端只允许删 xky_project_r_ 前缀） */
function handleDropDb(row) {
   proxy.$modal.confirm("确认删除库「" + row.name + "」？该库内所有数据会被清空且不可恢复。").then(async () => {
      await dropDatabase(row.name)
      proxy.$modal.msgSuccess("已删除：" + row.name)
      loadDatabases(false)
   }).catch(() => {})
}

/** 恢复完成后：把应用切到这个库的操作提示 */
function switchTip() {
   const base = "jdbc:postgresql://" + (env.host || "<host>") + ":" + (env.port || "5432") + "/"
   return [
      ":: 恢复完成。若要让应用改用这个库：",
      "1. 修改 application.yml（生产改 config/application.yml）里主数据源的库名：",
      "   spring.datasource.druid.master.url = " + base + rst.targetDb,
      "   （原来是 " + base + (env.dbName || "xky_project") + "）",
      "2. 重启应用，登录后核对数据",
      "",
      ":: 确认无误后，可在本页下方「恢复库管理」里删掉临时的恢复库"
   ].join("\n")
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

/** 备份文件的完整路径（Windows 反斜杠；未指定文件时用占位符）。
 *  文件只在灾备目录时路径要指到灾备目录，否则生成的命令在本机执行会找不到文件 */
function dumpPathOf(file) {
   const raw = (currentDumpLoc.value === "secondary" && env.secondaryDir) ? env.secondaryDir : (env.dir || "D:\\xky-db-backup")
   const dir = raw.replace(/\//g, "\\").replace(/\\+$/, "")
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
   currentDumpLoc.value = row.location || "local"
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

onUnmounted(() => stopPoll())

getList()
checkRunningTask()
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

/* 一键恢复对话框 */
.db-pick {
   display: flex;
   align-items: center;
   gap: 10px;
   margin-bottom: 6px;
}
.db-pick-label {
   width: 56px;
   flex-shrink: 0;
   font-size: 13px;
   color: var(--el-text-color-regular);
}
.ok-text {
   font-size: 12px;
   color: var(--el-color-success);
}
.err-text {
   font-size: 12px;
   color: var(--el-color-danger);
}
.restore-progress {
   margin-top: 12px;
   padding-top: 10px;
   border-top: 1px solid var(--el-border-color-lighter);
}
.rp-line {
   display: flex;
   align-items: center;
   gap: 10px;
   margin-bottom: 8px;
}
.rp-msg {
   margin: 6px 0 8px;
   font-size: 13px;
   color: var(--el-text-color-primary);
}
.log-block {
   max-height: 200px;
   font-size: 11px;
   line-height: 1.6;
   color: var(--el-text-color-secondary);
}
</style>
