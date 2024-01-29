const express = require('express');
const router = express.Router();
const { redisClient } = require('../redisClient');
const cors = require('cors');

router.get('/config/:domain', async (req, res) => {
    try {
        //TODO: Consider adding additional protection here. e.g. only allow WEB Domain or owner of domain to call this endpoint.

        const { domain } = req.params;
        const key = `rp:${domain}:config`;

        const data = await redisClient.get(key);

        if (data) {
            // Deserialize the JSON string back into an object
            res.status(200).json(JSON.parse(data));
        } else {
            res.status(204).json({});
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

        await redisClient.set(key, JSON.stringify(data));

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

        await redisClient.del(key);

        res.status(200).json(`Config for ${domain} deleted successfully`);
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).json('Error deleting data');
    }
});

module.exports = router;