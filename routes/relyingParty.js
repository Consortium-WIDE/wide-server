const express = require('express');
const router = express.Router();
const { kv } = require('@vercel/kv');
const cors = require('cors');

router.get('/config/:domain', async (req, res) => {
    try {
        //TODO: Consider adding additional protection here. e.g. only allow WEB Domain or owner of domain to call this endpoint.

        const { domain } = req.params;
        const key = `rp:${domain}:config`;

        const keyExists = await kv.exists(key);

        if (!keyExists) {
            res.status(204).json([]);
            return;
        }

        const data = await kv.get(key);
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

router.post('/config/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const key = `rp:${domain}:config`;
        const data = req.body;

        await kv.set(key, data);

        res.status(200).json(`Config for ${domain} registered successfully`);
    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

router.delete('/config/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const key = `rp:${domain}:config`;

        await kv.del(key);

        res.status(200).json(`Config for ${domain} deleted successfully`);
    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

module.exports = router;