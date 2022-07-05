"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    disabled: /yes|true/i.test(process.env.TMS_REDIS_DISABLED),
    prefix: process.env.TMS_REDIS_PREFIX || 'tms-mongodb-web',
    host: process.env.TMS_REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.TMS_REDIS_PORT) || 6379,
    password: process.env.TMS_REDIS_PWD || '',
    expiresIn: parseInt(process.env.TMS_REDIS_EXPIRESIN) || 7200,
};
