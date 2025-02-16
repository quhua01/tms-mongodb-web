<template>
  <tms-frame class="tmw-collection" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <el-table id="tables" class="table-fixed" highlight-current-row style="width: 100%" :max-height="tableHeight" :data="documents" @current-change="selectedRow">
        <el-table-column type="index" width="55"></el-table-column>
        <el-table-column v-for="(s, k) in properties" :key="k" :prop="k">
          <template slot="header">
            <i v-if="s.description" class="el-icon-info" :title="s.description"></i>
            <i v-if="s.required" style="color:red">*</i>
            <span>{{ s.title }}</span>
            <img src="../assets/icon_filter.png" class="icon_filter" @click="handleSelect(s, k)" />
          </template>
          <template slot-scope="scope">
            <span v-if="s.type === 'boolean'">{{scope.row[k] ? '是' : '否'}}</span>
            <span v-else-if="s.type === 'array' && s.items && s.items.format === 'file'">
              <span v-for="(i, v) in scope.row[k]" :key="v">
                <a href="#" @click="handleDownload(i)">{{ i.name }}</a>
                <br />
              </span>
            </span>
            <span v-else-if="s.type === 'array' && s.enum && s.enum.length">
              <span v-if="s.enumGroups && s.enumGroups.length">
                <span v-for="(g, i) in s.enumGroups" :key="i">
                  <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value">
                    <span v-for="(e, v) in s.enum" :key="v">
                      <span v-if="
                          e.group === g.id &&
                            scope.row[k] &&
                            scope.row[k].length &&
                            scope.row[k].includes(e.value)
                        ">{{ e.label }}&nbsp;</span>
                    </span>
                  </span>
                </span>
              </span>
              <span v-else>
                <span v-for="(i, v) in s.enum" :key="v">
                  <span v-if="scope.row[k] && scope.row[k].includes(i.value)">{{ i.label }}&nbsp;</span>
                </span>
              </span>
            </span>
            <span v-else-if="s.type === 'string' && s.enum && s.enum.length">
              <span v-if="s.enumGroups && s.enumGroups.length">
                <span v-for="(g, i) in s.enumGroups" :key="i">
                  <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value">
                    <span v-for="(e, v) in s.enum" :key="v">
                      <span v-if="e.group === g.id && scope.row[k] === e.value">{{ e.label }}</span>
                    </span>
                  </span>
                </span>
              </span>
              <span v-else>
                <span v-for="(i, v) in s.enum" :key="v">
                  <span v-if="scope.row[k] === i.value">{{ i.label }}</span>
                </span>
              </span>
            </span>
            <span v-else>{{ scope.row[k] }}</span>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template slot-scope="scope">
            <el-button size="mini" @click="editDocument(scope.row)">修改</el-button>
            <el-button size="mini" @click="handleDocument(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="float: right" background @size-change="handleSize" @current-change="handleCurrentPage" :current-page.sync="page.at" :page-sizes="[10, 25, 50, 100]" :page-size="page.size" layout="total, sizes, prev, pager, next" :total="page.total"></el-pagination>
    </template>
    <template v-slot:right>
      <tms-flex direction="column" align-items="flex-start">
        <div>
          <el-button @click="createDocument">添加文档</el-button>
        </div>
        <div v-if="jsonItems.length">
          <el-button v-if="jsonItems.length===1" plain @click="configJson(jsonItems[0])">配置{{jsonItems[0].title}}</el-button>
          <el-dropdown v-else>
            <el-button>配置json类型<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item v-for="(value, key) in jsonItems" :key="key">
                <el-button type="text" @click="configJson(value)">{{value.title}}</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </tms-flex>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations } from 'vuex'
import { Frame } from 'tms-vue-ui'
Vue.use(Frame)

import { Message } from 'element-ui'
import DocEditor from '../components/DocEditor.vue'
import SelectCondition from '../components/SelectCondition.vue'
import ConfigJSON from '../components/ConfigJSON.vue'
import {
  collection as apiCol,
  doc as apiDoc,
  schema as apiSchema,
} from '../apis'

const collection = {}

export default {
  name: 'Collection',
  props: ['bucketName', 'dbName', 'clName'],
  data() {
    return {
      tableHeight: 0,
      properties: {},
      page: {
        at: 1,
        size: 100,
        total: 0,
      },
      dialogPage: {
        at: 1,
        size: 100,
      },
      jsonItems: [],
      currentRow: {},
    }
  },
  computed: {
    ...mapState(['documents', 'conditions']),
  },
  created() {
    this.tableHeight = window.innerHeight * 0.8
  },
  methods: {
    ...mapMutations(['updateDocument', 'conditionReset']),
    selectedRow(row) {
      this.currentRow = row
    },
    handleJsonItems() {
      for (let property in this.properties) {
        let value = this.properties[property]
        if (value.type === 'json') {
          value.field = property
          this.jsonItems.push(value)
        }
      }
    },
    configJson(config) {
      if (this.currentRow && Object.keys(this.currentRow).length) {
        let value = this.currentRow[config.field]
        const configModel = new Vue(ConfigJSON)
        configModel.open(value).then((result) => {
          this.currentRow[config.field] = result
          apiDoc
            .update(
              this.bucketName,
              this.dbName,
              this.clName,
              this.currentRow._id,
              this.currentRow
            )
            .then(() => {
              this.listDocument()
            })
        })
      } else {
        Message.info({ message: '请选择要配置的数据' })
      }
    },
    handleCondition() {
      let _obj = JSON.parse(JSON.stringify(this.conditions))
      if (!_obj.length) {
        return { filter: {}, orderBy: {} }
      }
      if (_obj.length === 1) {
        return {
          filter: _obj[0].rule.filter,
          orderBy: _obj[0].rule.orderBy,
        }
      }
      return _obj
        .map((ele) => ele.rule)
        .reduce((prev, curr) => {
          return {
            filter: Object.assign(prev.filter, curr.filter),
            orderBy: Object.assign(prev.orderBy, curr.orderBy),
          }
        })
    },
    listByColumn(
      columnName,
      filter,
      orderBy,
      at,
      size,
      bucketName = this.bucketName,
      dbName = this.dbName,
      clName = this.clName
    ) {
      return apiDoc.byColumnVal(
        bucketName,
        dbName,
        clName,
        columnName,
        filter,
        orderBy,
        at,
        size
      )
    },
    handleSelect(obj, columnName) {
      this.dialogPage.at = 1
      const select = new Vue(SelectCondition)
      let filter, orderBy
      if (this.conditions.length) {
        const columnobj = this.conditions.find(
          (ele) => ele.columnName === columnName
        )
        const rule = this.handleCondition()
        if (columnobj) {
          select.condition.isCheckBtn = columnobj.isCheckBtn
          select.condition.keyword = columnobj.keyword
          select.condition.selectValue = columnobj.selectValue
          select.condition.rule = columnobj.rule
        }
        filter = rule.filter
        orderBy = rule.orderBy
      }
      this.listByColumn(
        columnName,
        this.conditions.length ? filter : undefined,
        this.conditions.length ? orderBy : undefined,
        this.dialogPage.at,
        this.dialogPage.size
      ).then((columnResult) => {
        select.condition.selectResult = columnResult
        select.condition.multipleSelection = columnResult
        // 暂时先用延迟解决，该方法还需改进
        setTimeout(() => {
          select.toggleSelection(columnResult)
        }, 0)
      })
      select
        .open(
          columnName,
          this.dialogPage,
          this.handleCondition(),
          this.listByColumn,
          this.properties[columnName]
        )
        .then((rsl) => {
          const { condition, isClear, isCheckBtn } = rsl
          this.$store.commit('conditionAddColumn', { condition })
          if (isClear) this.$store.commit('conditionDelColumn', { condition })
          let objPro = this.properties
          if (isCheckBtn) this.$store.commit('conditionDelBtn', { columnName })
          Object.keys(objPro).map((ele, index) => {
            const attrs = document.querySelectorAll(
              '#tables thead.has-gutter img'
            )[index]
            if (ele === columnName) {
              if (isClear) {
                attrs.src = require('../assets/icon_filter.png')
              } else if (isCheckBtn) {
                attrs.src = require('../assets/icon_' +
                  condition.rule.orderBy[columnName] +
                  '_active.png')
              } else {
                attrs.src = require('../assets/icon_filter_active.png')
              }
            } else if (isCheckBtn) {
              // 如果选择升降序规则，则需重置其他图标
              this.conditions.map((conEle) => {
                if (ele === conEle.columnName) {
                  if (
                    conEle.rule &&
                    conEle.rule.filter &&
                    conEle.rule.filter[ele] &&
                    conEle.rule.filter[ele].keyword
                  ) {
                    attrs.src = require('../assets/icon_filter_active.png')
                  } else if (conEle.isCheckBtn.includes(false)) {
                    attrs.src = require('../assets/icon_' +
                      conEle.rule.orderBy[ele] +
                      '_active.png')
                  } else {
                    attrs.src = require('../assets/icon_filter.png')
                  }
                }
              })
            }
            return ele
          })
          this.listDocument()
        })
    },
    createDocument() {
      let editor = new Vue(DocEditor)
      editor.open(this.bucketName, this.dbName, collection).then(() => {
        this.listDocument()
      })
    },
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor.open(this.bucketName, this.dbName, collection, doc).then(() => {
        this.listDocument()
      })
    },
    handleDocument(document) {
      this.$customeConfirm('数据', () => {
        return apiDoc
          .remove(this.bucketName, this.dbName, this.clName, document._id)
          .then(() => {
            this.listDocument()
          })
      })
    },
    listDocument() {
      const rule = this.handleCondition()
      const { orderBy, filter } = rule
      this.$store
        .dispatch({
          type: 'listDocument',
          bucket: this.bucketName,
          db: this.dbName,
          cl: this.clName,
          page: this.page,
          orderBy,
          filter,
        })
        .then((result) => {
          this.page.total = result.total
        })
    },
    handleDownload(file) {
      const access_token = this.$getToken()
      window.open(`${file.url}?access_token=${access_token}`)
    },
    handleSize(val) {
      this.page.size = val
      this.dialogPage.size = val
      this.listDocument()
    },
    handleCurrentPage(val) {
      this.page.at = val
      this.listDocument()
    },
    getTaglist(data) {
      let temp = {}
      const arrPromise = data.map((item, index) =>
        apiSchema.listByTag(this.bucketName, data[index])
      )
      return Promise.all(arrPromise)
        .then((res) => {
          res.forEach((schemas) => {
            schemas.forEach((schema) => {
              temp = { ...temp, ...schema.body.properties }
            })
          })
          return temp
        })
        .catch((err) => {
          throw new Error(err)
        })
    },
    async handleProperty() {
      let {
        schema_tags,
        schema_default_tags,
        schema: {
          body: { properties },
        },
      } = collection
      let temp = {}

      if (schema_default_tags && schema_default_tags.length) {
        await this.getTaglist(schema_default_tags).then((res) => {
          temp = res
        })
      } else if (schema_tags && schema_tags.length) {
        await this.getTaglist(schema_tags).then((res) => {
          temp = res
        })
      } else if (
        properties &&
        Object.prototype.toString.call(properties).toLowerCase() ==
          '[object object]'
      ) {
        Object.assign(temp, collection.schema.body.properties)
      }

      this.properties = Object.freeze(temp)
    },
  },
  mounted() {
    apiCol
      .byName(this.bucketName, this.dbName, this.clName)
      .then(async (res) => {
        Object.assign(collection, res)
        await this.handleProperty()
        this.handleJsonItems()
        this.conditionReset()
        this.listDocument()
      })
  },
  beforeDestroy() {
    this.conditionReset()
  },
}
</script>
<style lang="less" scoped>
.tmw-collection {
  .icon-style {
    margin-left: 10px;
    cursor: pointer;
  }
  .icon-heightlight {
    color: #409eff;
  }
  .icon_filter {
    width: 15px;
    height: 15px;
    vertical-align: middle;
    cursor: pointer;
  }
}
</style>
