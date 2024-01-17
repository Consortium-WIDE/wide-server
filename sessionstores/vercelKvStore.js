const session = require('express-session');
const { kv } = require('@vercel/kv');

module.exports = class VercelKVStore extends session.Store {
    constructor() {
        super();
    }

    async get(sid, callback) {
        try {
            const data = await kv.get(`widesession:${sid}`);
            if (!data) {
                return callback(null, null); // Session not found
            }

            callback(null, data);
        } catch (err) {
            callback(err);
        }
    }

    async set(sid, sess, callback) {
        try {
            const ttl = sess.cookie.maxAge / 1000;
            await kv.set(`widesession:${sid}`, JSON.stringify(sess), { expirationTtl: ttl });
            callback(null);
        } catch (err) {
            callback(err);
        }
    }

    async destroy(sid, callback) {
        try {
            await kv.del(`widesession:${sid}`);
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
};
