"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbHelper = void 0;
const Helper = require('./helper');
const ModelDb = require('../models/mgdb/db');
const { nanoid } = require('nanoid');
class DbHelper extends Helper {
    async dbBySysname(sysname) {
        const query = { sysname, type: 'database' };
        const db = await this.clMongoObj.findOne(query);
        return db;
    }
    async dbByName(name) {
        const query = { name, type: 'database' };
        if (this.ctrl.bucket)
            query.bucket = this.ctrl.bucket.name;
        const db = await this.clMongoObj.findOne(query);
        return db;
    }
    async dbCreate(info) {
        info.type = 'database';
        let modelDb = new ModelDb(info.bucket);
        let newName = modelDb.checkDbName(info.name);
        if (newName[0] === false)
            return [false, newName[1]];
        info.name = newName[1];
        let existTmwDb = await this.dbByName(info.name);
        if (existTmwDb)
            return [false, `已存在同名数据库[name=${info.name}]`];
        let existSysDb, sysname;
        for (let tries = 0; tries <= 2; tries++) {
            sysname = nanoid(10);
            existSysDb = await this.dbBySysname(sysname);
            if (!existSysDb)
                break;
        }
        if (existSysDb)
            return [false, '无法生成有效数据库名称'];
        info.sysname = sysname;
        modelDb.beforeProcessByInAndUp(info, 'insert');
        return this.clMongoObj
            .insertOne(info)
            .then((result) => {
            info._id = result.insertedId;
            return [true, info];
        })
            .catch((err) => [false, err.message]);
    }
}
exports.DbHelper = DbHelper;
exports.default = DbHelper;
