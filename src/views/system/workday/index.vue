<template>
  <div class="app-container">
    <!-- 顶部：年份 + 状态 + 操作 -->
    <el-card shadow="never" class="header-card">
      <div class="header-row">
        <div class="header-left">
          <el-date-picker
            v-model="year"
            type="year"
            value-format="YYYY"
            format="YYYY 年"
            placeholder="选择年份"
            :clearable="false"
            style="width: 140px"
            @change="loadData"
          />
          <el-tag v-if="status" :type="status.maintained ? 'success' : 'warning'" effect="light" size="large">
            {{ status.maintained ? '本年度节假日已维护' : '本年度未维护节假日，自动按周末计算' }}
          </el-tag>
          <span v-if="status" class="stats-text">
            节假日 {{ status.holidayCount }} 天 · 调休上班 {{ status.workdayCount }} 天 · 周末基线 {{ status.weekendCount }} 天
          </span>
        </div>
        <div class="header-right">
          <el-button
            type="success"
            plain
            icon="Date"
            v-hasPermi="['system:workday:batch']"
            @click="openBatch"
          >批量录入</el-button>
          <el-button
            type="danger"
            plain
            icon="Delete"
            v-hasPermi="['system:workday:remove']"
            @click="openClearBatch"
          >批量清除</el-button>
          <el-button
            type="primary"
            plain
            icon="Plus"
            v-hasPermi="['system:workday:add']"
            @click="openAdd"
          >新增记录</el-button>
        </div>
      </div>
      <div class="legend-row">
        <span class="legend-item"><i class="dot dot-holiday"></i>法定节假日</span>
        <span class="legend-item"><i class="dot dot-workday"></i>调休上班</span>
        <span class="legend-item"><i class="dot dot-weekend"></i>周末休息</span>
        <span class="legend-item"><i class="dot dot-normal"></i>工作日</span>
        <span class="legend-item"><i class="dot dot-today"></i>今天</span>
        <span class="hint">点击任意日期可设置 / 修改 / 清除该日记录</span>
      </div>
    </el-card>

    <!-- 12 个月历 -->
    <div v-loading="loading" class="calendar-grid">
      <div v-for="m in months" :key="m.month" class="month-card">
        <div class="month-title">{{ year }} 年 {{ m.month }} 月</div>
        <div class="week-head">
          <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span>
        </div>
        <div class="day-grid">
          <div v-for="d in m.days" :key="d.key" class="day-cell" :class="d.cls" @click="openDay(d)">
            <span v-if="d.day" class="day-num">{{ d.day }}</span>
            <span v-if="d.day && d.remark" class="day-mark" :title="d.remark">{{ d.remark }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 维护说明 -->
    <el-card shadow="never" class="tip-card">
      <div class="tip-title"><el-icon><InfoFilled /></el-icon> 维护说明</div>
      <p>1. 打开任意年份时，系统自动生成当年全部周六 / 周日（纯算法、幂等，不会覆盖已录入的节假日 / 调休记录）；</p>
      <p>2. 参照国务院办公厅当年放假通知，用「新增记录」或「批量录入」录入法定节假日与调休上班日；</p>
      <p>3. 未维护的年份自动按「仅排除周末」计算，总时长不会中断；</p>
      <p>4. 项目总时长 = 安排日期 → 当前日期（含头含尾）的工作日数，项目办结时自动固定。</p>
    </el-card>

    <!-- 单日设置弹窗 -->
    <el-dialog v-model="dayDialogVisible" :title="'日历设置 ' + dayForm.date" width="440px" append-to-body>
      <el-form ref="dayFormRef" :model="dayForm" label-width="90px">
        <el-form-item label="日期">
          <el-input :model-value="dayForm.date" disabled />
        </el-form-item>
        <el-form-item label="日类型">
          <el-radio-group v-model="dayForm.dayType">
            <el-radio value="holiday">法定节假日休息</el-radio>
            <el-radio value="workday">调休上班日</el-radio>
            <el-radio value="weekend">周末休息</el-radio>
            <el-radio value="__clear__">恢复默认（删除记录）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="dayForm.dayType !== '__clear__'" label="备注">
          <el-input
            v-model="dayForm.remark"
            type="textarea"
            :rows="2"
            placeholder="如：国庆节、春节调休"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dayDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="daySaving" @click="saveDay">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量录入弹窗 -->
    <el-dialog v-model="batchDialogVisible" title="批量录入日历" width="500px" append-to-body>
      <el-form ref="batchFormRef" :model="batchForm" :rules="batchRules" label-width="90px">
        <el-form-item label="日期区间" prop="range">
          <el-date-picker
            v-model="batchForm.range"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="日类型" prop="dayType">
          <el-radio-group v-model="batchForm.dayType">
            <el-radio value="holiday">法定节假日</el-radio>
            <el-radio value="workday">调休上班</el-radio>
            <el-radio value="weekend">周末休息</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="batchForm.remark" placeholder="如：2026 年春节假期" maxlength="100" />
        </el-form-item>
        <el-form-item label="覆盖已有">
          <el-switch v-model="batchForm.overwrite" />
          <span class="form-tip">开启后将覆盖区间内已有的记录</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchSaving" @click="submitBatch">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量清除弹窗 -->
    <el-dialog v-model="clearDialogVisible" title="批量清除日历" width="500px" append-to-body>
      <el-form ref="clearFormRef" :model="clearForm" :rules="clearRules" label-width="90px">
        <el-form-item label="日期区间" prop="range">
          <el-date-picker
            v-model="clearForm.range"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="清除范围">
          <el-radio-group v-model="clearForm.dayType">
            <el-radio value="">全部记录</el-radio>
            <el-radio value="holiday">仅节假日</el-radio>
            <el-radio value="workday">仅调休上班</el-radio>
            <el-radio value="weekend">仅周末基线</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 8px"
      >
        清除后该区间对应日期将恢复默认规则（工作日上班 / 周末休息），项目总时长会自动重算。
      </el-alert>
      <template #footer>
        <el-button @click="clearDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="clearSaving" @click="submitClearBatch">确定清除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { InfoFilled } from '@element-plus/icons-vue'
import {
  listWorkday,
  getWorkdayStatus,
  addWorkday,
  delWorkday,
  generateWorkday,
  batchWorkday,
  clearBatchWorkday
} from '@/api/system/workday'
import { clearCache } from '@/utils/workday'
import { isWeekend, formatDate } from '@/utils/workday'

export default {
  name: 'Workday',
  components: { InfoFilled },
  data() {
    return {
      // 查询与展示
      loading: false,
      year: String(new Date().getFullYear()),
      status: null,
      recordMap: {},
      months: [],
      // 单日设置
      dayDialogVisible: false,
      daySaving: false,
      dayForm: { date: '', dayType: 'holiday', remark: '' },
      // 批量录入
      batchDialogVisible: false,
      batchSaving: false,
      batchForm: { range: [], dayType: 'holiday', remark: '', overwrite: false },
      batchRules: {
        range: [{ required: true, message: '请选择日期区间', trigger: 'change' }],
        dayType: [{ required: true, message: '请选择日类型', trigger: 'change' }]
      },
      // 批量清除
      clearDialogVisible: false,
      clearSaving: false,
      clearForm: { range: [], dayType: '' },
      clearRules: {
        range: [{ required: true, message: '请选择日期区间', trigger: 'change' }]
      }
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    /** 加载某年状态 + 全部日历记录（周末基线缺失时自动补全，无需手动点击） */
    async loadData() {
      this.loading = true
      try {
        // 1. 查询年份状态
        const statusRes = await getWorkdayStatus(this.year)
        this.status = statusRes.data
        // 2. 该年没有任何周末基线记录 → 自动生成（纯算法、幂等，不覆盖节假日/调休）
        if (this.status.weekendCount === 0) {
          try {
            await generateWorkday(this.year)
            clearCache()
          } catch (e) {
            // 无生成权限等场景静默处理，日历仍按默认规则展示
          }
          const refreshed = await getWorkdayStatus(this.year)
          this.status = refreshed.data
        }
        // 3. 加载日历记录
        const listRes = await listWorkday({ startDate: this.year + '-01-01', endDate: this.year + '-12-31' })
        this.recordMap = {}
        const rows = listRes.data || []
        rows.forEach(r => {
          this.recordMap[r.day] = r
        })
        this.buildMonths()
      } finally {
        this.loading = false
      }
    },

    /** 构建 12 个月历网格 */
    buildMonths() {
      const year = parseInt(this.year)
      const months = []
      const todayStr = formatDate(new Date())
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = new Date(year, m, 0).getDate()
        const offset = (new Date(year, m - 1, 1).getDay() + 6) % 7 // 周一开头
        const days = []
        for (let i = 0; i < offset; i++) {
          days.push({ key: m + '-empty-' + i, cls: 'day-cell empty', day: null })
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const date = year + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
          const rec = this.recordMap[date]
          let cls = 'day-cell'
          const type = rec ? rec.dayType : (isWeekend(date) ? 'weekend' : '')
          if (type === 'holiday') cls += ' holiday'
          else if (type === 'workday') cls += ' workday'
          else if (type === 'weekend') cls += ' weekend'
          else cls += ' normal'
          if (date === todayStr) cls += ' today'
          days.push({
            key: date,
            day: d,
            date,
            cls,
            // 周末单元格不显示备注（避免撑宽单元格导致错位）；仅节假日/调休显示
            remark: rec && rec.remark && type !== 'weekend' ? rec.remark : ''
          })
        }
        months.push({ month: m, days })
      }
      this.months = months
    },

    /** 新增记录（默认今天） */
    openAdd() {
      const date = formatDate(new Date())
      const rec = this.recordMap[date]
      this.dayForm = {
        date,
        dayType: rec ? rec.dayType : 'holiday',
        remark: rec ? rec.remark : ''
      }
      this.dayDialogVisible = true
    },

    /** 点击某天 */
    openDay(d) {
      if (!d.date) return
      const rec = this.recordMap[d.date]
      this.dayForm = {
        date: d.date,
        dayType: rec ? rec.dayType : (isWeekend(d.date) ? 'weekend' : 'holiday'),
        remark: rec ? rec.remark : ''
      }
      this.dayDialogVisible = true
    },

    /** 保存单日设置 */
    saveDay() {
      const { date, dayType, remark } = this.dayForm
      if (!date) return
      this.daySaving = true
      const done = () => {
        this.daySaving = false
        this.dayDialogVisible = false
        this.$modal.msgSuccess('保存成功')
        clearCache()
        this.loadData()
      }
      if (dayType === '__clear__') {
        this.$modal
          .confirm('确定删除 ' + date + ' 的日历记录？删除后该日按默认规则（工作日上班 / 周末休息）计算。')
          .then(() => delWorkday(date))
          .then(done)
          .catch(() => {})
          .finally(() => {
            this.daySaving = false
          })
      } else {
        addWorkday({ day: date, dayType, remark })
          .then(done)
          .catch(() => {})
          .finally(() => {
            this.daySaving = false
          })
      }
    },

    /** 打开批量录入弹窗 */
    openBatch() {
      this.batchForm = { range: [], dayType: 'holiday', remark: '', overwrite: false }
      this.batchDialogVisible = true
    },

    /** 提交批量录入 */
    submitBatch() {
      this.$refs.batchFormRef.validate(valid => {
        if (!valid) return
        const [startDate, endDate] = this.batchForm.range
        this.batchSaving = true
        batchWorkday({
          startDate,
          endDate,
          dayType: this.batchForm.dayType,
          remark: this.batchForm.remark,
          overwrite: this.batchForm.overwrite
        })
          .then(() => {
            this.$modal.msgSuccess('批量录入成功')
            this.batchDialogVisible = false
            clearCache()
            this.loadData()
          })
          .catch(() => {})
          .finally(() => {
            this.batchSaving = false
          })
      })
    },

    /** 打开批量清除弹窗 */
    openClearBatch() {
      this.clearForm = { range: [], dayType: '' }
      this.clearDialogVisible = true
    },

    /** 提交批量清除 */
    submitClearBatch() {
      this.$refs.clearFormRef.validate(valid => {
        if (!valid) return
        const [startDate, endDate] = this.clearForm.range
        const dt = this.clearForm.dayType
        const typeLabel = dt === 'holiday' ? '法定节假日' : dt === 'workday' ? '调休上班' : dt === 'weekend' ? '周末基线' : '全部'
        this.$modal
          .confirm(
            '确定清除 ' + startDate + ' 至 ' + endDate + ' 的【' + typeLabel +
            '】记录？清除后该区间对应日期将恢复默认规则，项目总时长会自动重算。'
          )
          .then(() => {
            this.clearSaving = true
            const params = { startDate, endDate }
            if (dt) params.dayType = dt
            return clearBatchWorkday(params)
          })
          .then(res => {
            this.$modal.msgSuccess(res.msg || '批量清除成功')
            this.clearDialogVisible = false
            clearCache()
            this.loadData()
          })
          .catch(() => {})
          .finally(() => {
            this.clearSaving = false
          })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.header-card {
  margin-bottom: 16px;

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;

      .stats-text {
        color: #606266;
        font-size: 13px;
      }
    }
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px dashed #ebeef5;

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: #606266;

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
      }
    }

    .hint {
      margin-left: auto;
      font-size: 12px;
      color: #a8abb2;
    }
  }
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
  gap: 14px;

  .month-card {
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 10px 10px 12px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

    .month-title {
      text-align: center;
      font-weight: 600;
      font-size: 14px;
      color: #303133;
      padding: 4px 0 8px;
    }

    .week-head {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 12px;
      color: #909399;
      padding-bottom: 4px;

      span:nth-child(6),
      span:nth-child(7) {
        color: #c0c4cc;
      }
    }

    .day-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;

      .day-cell {
        height: 38px;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 13px;
        color: #303133;
        overflow: hidden; /* 防备注溢出影响相邻列 */
        transition: transform 0.12s, box-shadow 0.12s;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
        }

        .day-num {
          line-height: 1.2;
        }

        .day-mark {
          max-width: 90%;
          font-size: 9px;
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          opacity: 0.85;
        }

        &.empty {
          cursor: default;
          box-shadow: none;
          background: transparent;
        }

        &.holiday {
          background: #fde8e8;
          color: #c0392b;

          .day-num {
            font-weight: 700;
          }
        }

        &.workday {
          background: #e3f5ec;
          color: #1e8449;

          .day-num {
            font-weight: 600;
          }
        }

        &.weekend {
          background: #f2f3f5;
          color: #909399;
        }

        &.normal {
          background: #fff;
          color: #303133;
          border: 1px solid #f0f0f0;
        }

        &.today {
          box-shadow: inset 0 0 0 2px #409eff;
        }
      }
    }
  }
}

.tip-card {
  margin-top: 16px;

  .tip-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 6px;
  }

  p {
    margin: 4px 0;
    font-size: 13px;
    color: #606266;
    line-height: 1.7;
  }
}

.form-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #a8abb2;
}

.dot-holiday {
  background: #fde8e8;
  border: 1px solid #c0392b;
}
.dot-workday {
  background: #e3f5ec;
  border: 1px solid #1e8449;
}
.dot-weekend {
  background: #f2f3f5;
  border: 1px solid #c0c4cc;
}
.dot-normal {
  background: #fff;
  border: 1px solid #dcdfe6;
}
.dot-today {
  background: #fff;
  box-shadow: inset 0 0 0 2px #409eff;
}
</style>
