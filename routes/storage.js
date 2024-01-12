const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { kv } = require('@vercel/kv');

function hashData(data) {
    const stringifiedData = JSON.stringify(data);
    return crypto.createHash('sha256').update(stringifiedData).digest('hex');
}

/**
 * @swagger
 * /storage/user/{accountAddress}/issued-credentials:
 *   get:
 *     summary: Retrieve the type of credentials the user has been issued
 *     description: Retrieve the type of credentials the user has been issued.
 *     parameters:
 *       - in: path
 *         name: accountAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The account address of the user.
 *     responses:
 *       '200':
 *         description: Successfully retrieved data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # Define the properties of your data object here
 *       '204':
 *         description: Data exists but is empty.
 *       '404':
 *         description: Data not found for the specified account address.
 *       '500':
 *         description: Internal server error.
 *     tags:
 *       - User
 */
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

/**
 * @swagger
 * /user/{accountAddress}/credential:
 *   get:
 *     summary: Retrieve a specific user credential
 *     description: Fetches a specific credential for a user based on their account address and issuer hash. Returns the credential data if found, else returns a 204 status code indicating no content.
 *     parameters:
 *       - in: path
 *         name: accountAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The account address of the user.
 *       - in: header
 *         name: issuerHash
 *         required: true
 *         schema:
 *           type: string
 *         description: The hash of the issuer associated with the credential.
 *     responses:
 *       '200':
 *         description: Successfully retrieved the credential data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               # Define the schema of your credential data here
 *       '204':
 *         description: No content, credential data not found.
 *       '500':
 *         description: Internal server error.
 *     tags:
 *       - User Credential
 */
router.get('/user/:accountAddress/credential', async (req, res) => {
    try {
        const credentialKey = `account:${accountAddress}:credential:${issuerHash}`;

        const credentialData = await kv.hget(credentialKey, 'credential');

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

/**
 * @swagger
 * /user/{accountAddress}/credential:
 *   post:
 *     summary: Set user credential
 *     description: Stores credential data for a given user account address. The endpoint expects issuer details, payload, and credentials array in the request body.
 *     parameters:
 *       - in: path
 *         name: accountAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The account address of the user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               issuer:
 *                 type: object
 *                 description: Details about the issuer.
 *                 properties:
 *                   issuer:
 *                     type: string
 *                     description: Issuer identifier.
 *               payload:
 *                 type: object
 *                 description: Payload containing the credential data.
 *               credentials:
 *                 type: array
 *                 description: Array of credentials.
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     val:
 *                       type: string
 *     responses:
 *       '200':
 *         description: Data set successfully.
 *       '500':
 *         description: Internal server error.
 *     tags:
 *       - User Credential
 */
router.post('/user/:accountAddress/credential', async (req, res) => {
    try {
        const { accountAddress } = req.params;
        const { issuer, payload, credentials } = req.body;

        const issuerHash = hashData(issuer.issuer);

        const issuersIndexKey = `account:${accountAddress}:issued-credentials`;
        const credentialKey = `account:${accountAddress}:credential:${issuerHash}`

        await kv.rpush(issuersIndexKey, issuer);
        await kv.hset(credentialKey, 'credential', JSON.stringify(payload));

        await credentials.forEach(async (credential) => {
            await kv.hset(credentialKey, credential.name, JSON.stringify(credential.val));
        });

        res.status(200).json(`Data for ${credentialKey} set successfully`);
    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

module.exports = router;