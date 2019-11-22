const _ = require('lodash')
const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const { Context } = require('../../context')

class Collection extends Ctrl {
  /**
   *
   */
  async list() {
    let { db: dbName } = this.request.query
    const client = await Context.mongoClient()
    const p1 = client
      .db(dbName)
      .listCollections({}, { nameOnly: true })
      .toArray()
      .then(collections => collections.map(c => c.name))
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')
    const p2 = clMongoObj
      .find({ type: 'collection', database: dbName })
      .toArray()
    return Promise.all([p1, p2]).then(values => {
      const [rawClNames, tmsCls] = values
      const tmsClNames = tmsCls.map(c => c.name)
      const diff = _.difference(rawClNames, tmsClNames)
      diff.forEach(name => tmsCls.push({ name }))
      return new ResultData(tmsCls)
    })
  }
  /**
   * 新建集合
   */
  async create() {
    let { db: dbName } = this.request.query
    const info = this.request.body
    info.type = 'collection'
    info.database = dbName
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .createCollection(info.name)
      .then(() => client.db('tms_admin').collection('mongodb_object'))
      .then(cl => cl.insertOne(info))
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   * 更新集合对象信息
   */
  async update() {
    let { db: dbName, cl: clName } = this.request.query
    let info = this.request.body
    info = _.omit(info, ['_id', 'name', 'database'])
    const client = await Context.mongoClient()
    const cl = client.db('tms_admin').collection('mongodb_object')
    return cl
      .updateOne(
        { database: dbName, name: clName, type: 'collection' },
        { $set: info },
        { upsert: true }
      )
      .then(() => new ResultData(info))
  }
  /**
   * 删除集合
   */
  async remove() {
    let { db: dbName, cl: clName } = this.request.query
    const client = await Context.mongoClient()
    const db = client.db('tms_admin')
    return db
      .collection('mongodb_object')
      .deleteOne({ name: clName, type: 'collection' })
      .then(() => client.db(dbName).dropCollection(clName))
      .then(() => new ResultData('ok'))
      .catch(err => Promise.reject(new ResultFault(err.message)))
  }
  /**
   * 修改集合名称
   */
  async rename() {
    let { db: dbName, cl: clName, newName } = this.request.query
    const client = await Context.mongoClient()
    const db = client.db(dbName)
    return db
      .renameCollection(clName, newName)
      .then(() => new ResultData('ok'))
      .catch(err => Promise.reject(new ResultFault(err.message)))
  }
}
module.exports = Collection
