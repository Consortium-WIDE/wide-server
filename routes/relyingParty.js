const express = require('express');
const router = express.Router();
const { redisClient } = require('../redisClient');
const cors = require('cors');

/**
 * @swagger
 * /config/{domain}:
 *   get:
 *     tags:
 *       - Relying Party
 *     summary: Retrieves configuration for a specific domain
 *     description: This endpoint retrieves the configuration registered on WIDE for the specified domain. It returns a JSON object with the domain's configuration if found, or an empty object if not.
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: The domain to get the configuration for
 *     responses:
 *       200:
 *         description: Successfully retrieved domain configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: true
 *       204:
 *         description: No content found for the specified domain
 *       500:
 *         description: Error retrieving data
 */
router.get('/config/:domain', async (req, res) => {
    try {
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

/**
 * @swagger
 * /config/{domain}:
 *   post:
 *     tags:
 *       - Relying Party
 *     summary: Registers or updates a domain's configuration
 *     description: This endpoint allows a relying party to register or update a domain's configuration. The configuration data should be provided in the request body.
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: The domain to register or update the configuration for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Successfully registered or updated domain configuration
 *       500:
 *         description: Error setting data
 */
router.post('/config/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const key = `rp:${domain}:config`;
        const data = req.body;

        const keyExists = await redisClient.exists(key);

        if (keyExists) {
            //We do this to prevent unauthorized 3rd parties to re-use the key to replace the config.
            //This is a very dirty solution in place until we implement api keys
            res.status(208).json(`Config for ${domain} has already been registered. It cannot be updated.`);
        } else {
            await redisClient.set(key, JSON.stringify(data));
            res.status(200).json(`Config for ${domain} registered successfully`);
        }

    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

module.exports = router;