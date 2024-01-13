const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { kv } = require('@vercel/kv');

function hashData(data) {
    const stringifiedData = JSON.stringify(data);
    return crypto.createHash('sha256').update(stringifiedData).digest('hex');
}

router.get('/user/:accountAddress/issued-credentials', async (req, res) => {
    try {
        const { accountAddress } = req.params;
        const key = `account:${accountAddress}:issued-credentials`;

        const keyExists = await kv.exists(key);

        if (!keyExists) {
            res.status(204).json([]);
            return;
        }

        const data = await kv.lrange(key, 0, -1);
        if (data) {
            res.status(200).json(data);
        } else {
            res.status(204).json(data);
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json('Error retrieving data');
    }
});

router.get('/user/:accountAddress/credentials/:key', async (req, res) => {
    try {
        const { accountAddress, key } = req.params;
        const credentialKey = `account:${accountAddress}:credential:${key}`;

        const credentialData = await kv.hgetall(credentialKey);

        if (credentialData) {
            res.status(200).json(credentialData);
        } else {
            res.status(204).json(credentialData);
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json('Error retrieving data');
    }
});

router.post('/user/:accountAddress/credential', async (req, res) => {
    try {
        const { accountAddress } = req.params;
        const { issuer, payload, credentials } = req.body;

        const issuerHash = hashData(issuer.issuer);

        const issuersIndexKey = `account:${accountAddress}:issued-credentials`;
        const credentialKey = `account:${accountAddress}:credential:${issuerHash}`

        //add hash (unique identifier) to the issuer.
        //this will allow us to conveniently be able to retrieve the associated data at a later stage.
        const issuerInternalIdProp = { wideInternalId: issuerHash }
        let issuerWithId = { ...issuerInternalIdProp, ...issuer }

        await kv.rpush(issuersIndexKey, issuerWithId);
        await kv.hset(credentialKey, { payload: payload, credentials: credentials });

        res.status(200).json(`Data for ${credentialKey} set successfully`);
    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

module.exports = router;