<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="集合名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="集合显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="集合文档内容定义（默认）">
        <el-select v-model="collection.schema_id" placeholder="请选择定义名称" clearable filterable>
          <el-option v-for="item in schemas" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合文档内容定义（定制）">
        <el-select v-model="collection.schema_tags" clearable multiple placeholder="请选择定义标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="默认展示（定制）">
        <el-select v-model="collection.schema_default_tags" clearable multiple placeholder="请选择定义标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合标签">
        <el-select v-model="collection.tags" clearable multiple placeholder="请选择集合标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合用途">
        <el-select v-model="collection.usage" clearable placeholder="请选择集合用途">
          <el-option label="普通集合" :value="0"></el-option>
          <el-option label="从集合" :value="1" disabled></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合公共属性定义">
        <el-select placeholder="请选择定义名称" v-model="collection.extensionInfo.schemaId" clearable filterable @change="handleExtendId(collection.extensionInfo.schemaId, false)">
          <el-option v-for="item in extensions" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合公共属性详情" v-if="JSON.stringify(extendSchema)!=='{}'">
        <tms-el-json-doc class="tmw-attr-form" ref="attrForm" :schema="extendSchema" :doc="collection.extensionInfo.info"></tms-el-json-doc>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="collection.description"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Flex } from 'tms-vue-ui'
import {
  Dialog,
  Form,
  FormItem,
  Input,
  Select,
  Option,
  Button,
  Message
} from 'element-ui'
Vue.use(Flex)
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Select)
  .use(Option)
  .use(Button)

import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import createCollectionApi from '../apis/collection'
import createSchemaApi from '../apis/schema'
import createTagApi from '../apis/tag'
import createDbApi from '../apis/database'

let oldClName = ''

export default {
  name: 'CollectionEditor',
  props: {
    tmsAxiosName: String,
    dialogVisible: { default: true },
    bucketName: { type: String },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return {
          name: '',
          title: '',
          description: '',
          schema_id: '',
          schema_tags: [],
          schema_default_tags: [],
          tags: [],
          usage: 0,
          extensionInfo: { schemaId: '', info: {} },
          custom: {
            docOperations: {
              create: true,
              edit: true,
              remove: true,
              editMany: true,
              removeMany: true,
              transferMany: true,
              import: true,
              export: true,
              copyMany: true
            }
          }
        }
      }
    }
  },
  components: { TmsElJsonDoc },
  data() {
    return {
      activeTab: 'first',
      mode: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      schemas: [],
      tags: [],
      extensions: [],
      extendSchema: {}
    }
  },
  mounted() {
    createSchemaApi(this.TmsAxios(this.tmsAxiosName))
      .list(this.bucketName, 'document')
      .then(schemas => {
        this.schemas = schemas
      })
    createSchemaApi(this.TmsAxios(this.tmsAxiosName))
      .list(this.bucketName, 'collection')
      .then(extensions => {
        this.extensions = extensions
        this.handleExtendId(this.collection.extensionInfo.schemaId, true)
      })
    createTagApi(this.TmsAxios(this.tmsAxiosName))
      .list(this.bucketName)
      .then(tags => {
        this.tags = tags
      })
  },
  methods: {
    handleExtendId(id, init) {
      if (!id) this.collection.extensionInfo.info = {}
      this.extendSchema = {}
      this.extensions.find(item => {
        if (item._id == id) {
          this.$nextTick(() => {
            this.extendSchema = item.body
            if (!init) {
              this.collection.extensionInfo.info = {}
            }
          })
        }
      })
    },
    fnSubmit() {
      if (this.mode === 'create')
        createCollectionApi(this.TmsAxios(this.tmsAxiosName))
          .create(this.bucketName, this.dbName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
      else if (this.mode === 'update')
        createCollectionApi(this.TmsAxios(this.tmsAxiosName))
          .update(this.bucketName, this.dbName, oldClName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
    },
    onSubmit() {
      if (this.$refs.attrForm) {
        const tmsAttrForm = this.$refs.attrForm.$refs.TmsJsonDoc
        tmsAttrForm.form().validate(valid => {
          valid ? this.fnSubmit() : Message.error({ message: '请填写必填字段' })
        })
        return false
      }
      this.fnSubmit()
    },
    open(mode, tmsAxiosName, bucketName, dbName, collection) {
      this.mode = mode
      this.tmsAxiosName = tmsAxiosName
      this.bucketName = bucketName
      this.dbName = dbName
      if (mode === 'update') {
        oldClName = collection.name
        this.collection = JSON.parse(
          JSON.stringify(Object.assign(this.collection, collection))
        )
      }
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newCollection => {
          this.dialogVisible = false
          resolve(newCollection)
        })
      })
    }
  }
}
</script>
