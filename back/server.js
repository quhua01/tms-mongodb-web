const log4jsConfig = require('./config/log4js')
const log4js = require('log4js')
log4js.configure(log4jsConfig)

const { Context } = require('./context')
Context.init()

const { TmsKoa } = require('tms-koa')

const tmsKoa = new TmsKoa()

tmsKoa.startup()
