// kvStore.js
const { createKV } = require('@vercel/storage');

async function initializeKV() {
    const kv = await createKV({
        projectId: process.env.VERCEL_PROJECT_ID,
        token: process.env.VERCEL_TOKEN
    });

    return kv;
}

module.exports = initializeKV;