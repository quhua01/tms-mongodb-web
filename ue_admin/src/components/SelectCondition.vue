<template>
  <el-dialog :title="'筛选-'+currentPro.title" :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form :model="condition" label-width="60px">
      <el-form-item label="按条件">
        <el-select v-model="condition.selectValue" clearable placeholder="请选择筛选规则" @change="handleSelectChange">
          <el-option v-for="item in condition.selectRules" :key="item.value" :label="item.label" :value="item.value"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input placeholder="请输入内容,多个关键字以英文逗号间隔" v-model="condition.keyword" @input="handleInputChange" :maxlength="30000" show-word-limit></el-input>
      </el-form-item>
    </el-form>
    <div v-if="currentPro.groupable !== false">
      <el-table id="tables" ref="multipleTable" :data="condition.selectResult" tooltip-effect="dark" border max-height="270" v-loadmore="loadMore" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55">
        </el-table-column>
        <el-table-column :label="'全选('+selectedLen+')'">
          <template slot-scope="scope">
            <div v-if="currentPro.type === 'array' && currentPro.enum">
              <span v-for="(i, v) in currentPro.enum" :key="v">
                <span v-if="scope.row.title && scope.row.title.includes(i.value)">{{i.label}}&nbsp;</span>
              </span>
              <span>{{'(' + scope.row.sum + ')' }}</span>
            </div>
            <div v-else-if="currentPro.type === 'string' && currentPro.enum">
              <span v-for="(i, v) in currentPro.enum" :key="v">
                <span v-if="scope.row.title === i.value">{{i.label}}</span>
              </span>
              <span>{{'(' + scope.row.sum + ')' }}</span>
            </div>
            <div v-else>
              {{ scope.row.title + '(' + scope.row.sum + ')' }}
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button style="float:left" type="primary" :plain="condition.isCheckBtn[0]" @click="handleSort('asc')">升序</el-button>
      <el-button style="float:left" type="primary" :plain="condition.isCheckBtn[1]" @click="handleSort('desc')">降序</el-button>
      <el-button type="default" @click="dialogVisible = false">取消</el-button>
      <el-button type="warning" @click="onClear">清除筛选</el-button>
      <el-button type="primary" @click="onSubmit">提交</el-button>
    </div>
  </el-dialog>
</template>
<script>
import { Message } from 'element-ui'
export default {
  name: 'SchemaEditor',
  props: {
    dialogVisible: { default: true },
    condition: {
      type: Object,
      default: function() {
        return {
          selectValue: '',
          keyword: '',
          selectRules: [
            {
              value: 'start',
              label: '开头是'
            },
            {
              value: 'notStart',
              label: '开头不是'
            },
            {
              value: 'end',
              label: '结尾是'
            },
            {
              value: 'notEnd',
              label: '结尾不是'
            }
          ],
          selectResult: [],
          multipleSelection: [],
          isCheckBtn: [true, true],
          rule: {
            filter: {},
            orderBy: {}
          }
        }
      }
    }
  },
  data() {
    return {
      destroyOnClose: false,
      closeOnClickModal: false,
      columnName: '',
      timer: null,
      listByColumn: null,
      page: {},
      conditions: [],
      currentPro: ''
    }
  },
  computed: {
    isAllElection() {
      const { multipleSelection, selectResult } = this.condition
      return multipleSelection.length === selectResult.length
    },
    selectedLen() {
      if (this.condition.multipleSelection.length) {
        return this.condition.multipleSelection
          .map(ele => ele.sum)
          .reduce((prev, curr) => prev + curr)
      } else {
        return 0
      }
    }
  },
  methods: {
    loadMore() {
      this.page.at++
      this.updateByColumn(true)
    },
    toggleSelection(rows) {
      if (rows) {
        rows.forEach(row => {
          this.$refs.multipleTable.toggleRowSelection(row)
        })
      }
    },
    onClear() {
      this.condition.selectValue = ''
      this.condition.keyword = ''
      this.condition.isCheckBtn = [true, true]
      this.condition.rule = { filter: {}, orderBy: {} }
      this.$emit('submit', { rule: this.condition.rule, isClear: true })
    },
    handleMultipleTable() {
      this.$refs.multipleTable.toggleAllSelection()
      this.condition.multipleSelection = this.condition.selectResult
    },
    handleInputChange(val) {
      this.condition.rule.filter = {
        ...this.conditions.filter,
        ...this.condition.rule.filter
      }
      this.condition.rule.orderBy = this.conditions.orderBy
      if (!this.condition.rule.filter[this.columnName]) {
        this.condition.rule.filter[this.columnName] = {}
      }
      this.setKeyword(val)
      clearTimeout(this.timer)
      if (!this.currentPro.groupable !== false) return
      this.timer = setTimeout(() => {
        this.updateByColumn()
      }, 500)
    },
    // 设置关键字
    setKeyword(keyword) {
      if (
        ['array', 'string'].includes(this.currentPro.type) &&
        this.currentPro.enum
      ) {
        keyword = keyword
          .split(',')
          .map(item =>
            this.currentPro.enum
              .filter(enumItem => enumItem.label === item)
              .map(filterItem => filterItem.value)
          )
          .join()
          .split(',')
        this.condition.rule.filter[this.columnName].feature = 'in'
      }
      this.condition.rule.filter[this.columnName].keyword = keyword
    },
    updateByColumn(isLoadMore) {
      this.listByColumn(
        this.columnName,
        { ...this.conditions.filter, ...this.condition.rule.filter },
        JSON.stringify(this.condition.rule.orderBy) === '{}'
          ? this.conditions.orderBy
          : this.condition.rule.orderBy,
        this.page.at,
        this.page.size
      ).then(matchRes => {
        if (isLoadMore) {
          this.condition.selectResult.push(...matchRes)
          const message =
            matchRes.length > 0
              ? `成功加载${matchRes.length}条数据`
              : '全部数据加载完毕'
          Message({ message, type: 'success', customClass: 'mzindex' })
          if (matchRes.length) {
            matchRes.forEach(ele => {
              this.$refs.multipleTable.toggleRowSelection(ele, true)
            })
            this.condition.multipleSelection = this.condition.selectResult
          }
        } else {
          this.condition.selectResult = matchRes
          this.handleMultipleTable()
        }
      })
    },
    handleSelectChange(val) {
      this.condition.rule.filter[this.columnName].feature = val
    },
    handleSort(type) {
      if (type === 'asc') {
        this.condition.isCheckBtn = [false, true]
      } else if (type === 'desc') {
        this.condition.isCheckBtn = [true, false]
      }

      this.condition.rule.orderBy[this.columnName] = type
      this.$emit('submit', { rule: this.condition.rule, isCheckBtn: true })
    },
    handleSelectionChange(val) {
      this.condition.multipleSelection = val
    },
    onSubmit() {
      if (
        !this.isAllElection ||
        (this.isAllElection && !this.condition.keyword)
      ) {
        this.condition.rule.filter[
          this.columnName
        ].keyword = this.condition.multipleSelection.map(ele => ele.title)
        this.condition.rule.filter[this.columnName].feature = 'in'
      }
      this.$emit('submit', { rule: this.condition.rule })
    },
    open(columnName, page, conditions, listByColumn, currentPro) {
      this.columnName = columnName
      this.page = page
      this.conditions = conditions
      this.listByColumn = listByColumn
      this.currentPro = currentPro
      if (!this.condition.rule.filter[this.columnName]) {
        this.condition.rule.filter[this.columnName] = {}
      }
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', selectCondition => {
          const { rule, isClear, isCheckBtn } = selectCondition
          this.dialogVisible = false
          document.body.removeChild(this.$el)
          resolve({
            rule,
            condition: { ...this.condition, columnName: columnName },
            isClear,
            isCheckBtn
          })
        })
      })
    }
  }
}
</script>
