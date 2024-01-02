const express = require('express');
const router = express.Router();
const { kv } = require('@vercel/kv');

// Helper function to build a user-specific key
const allowedTypes = new Set(['publicKey', 'vc', 'claim', 'secondaryAddresses', 'primaryAddress', 'vcIds']);

const buildKey = (accountAddress, type, id, secondaryType, secondaryId) => {
    if (type && !allowedTypes.has(type)) {
        throw new Error(`Invalid type: ${type}`);
    }
    if (secondaryType && !allowedTypes.has(secondaryType)) {
        throw new Error(`Invalid secondary type: ${secondaryType}`);
    }

    let key = `user:${accountAddress}`;
    if (type) key += `:${type}`;
    if (id) key += `:${id}`;
    if (secondaryType) key += `:${secondaryType}`;
    if (secondaryId) key += `:${secondaryId}`;
    return key;
};

/**
 * @swagger
 * /user/{accountAddress}/{type}/{id}/{secondaryType}/{secondaryId}:
 *   get:
 *     tags:
 *       - Storage
 *     summary: Retrieve user data
 *     description: Fetches data for a given user based on specified parameters.
 *     parameters:
 *       - in: path
 *         name: accountAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum account address of the user
 *       - in: path
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: Type of data to retrieve
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID associated with the data
 *       - in: path
 *         name: secondaryType
 *         required: false
 *         schema:
 *           type: string
 *         description: Secondary type of data
 *       - in: path
 *         name: secondaryId
 *         required: false
 *         schema:
 *           type: string
 *         description: Secondary ID associated with the data
 *     responses:
 *       200:
 *         description: Data retrieved successfully
 *       404:
 *         description: Data not found
 *       500:
 *         description: Error retrieving data
 */
router.get('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
    try {
        const { accountAddress, type, id, secondaryType, secondaryId } = req.params;
        const key = buildKey(accountAddress, type, id, secondaryType, secondaryId);
        const data = await kv.get(key);
        if (data) {
            res.status(200).json(data);
        } else {
            res.status(404).json('Data not found');
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json('Error retrieving data');
    }
});

/**
 * @swagger
 * /user/{accountAddress}/{type}/{id}/{secondaryType}/{secondaryId}:
 *   post:
 *     tags:
 *       - Storage
 *     summary: Set user data
 *     description: Stores data for a given user based on specified parameters.
 *     parameters:
 *       - in: path
 *         name: accountAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum account address of the user
 *       - in: path
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: Type of data to store
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID for the data
 *       - in: path
 *         name: secondaryType
 *         required: false
 *         schema:
 *           type: string
 *         description: Secondary type of data
 *       - in: path
 *         name: secondaryId
 *         required: false
 *         schema:
 *           type: string
 *         description: Secondary ID for the data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Data to be stored
 *     responses:
 *       200:
 *         description: Data set successfully
 *       500:
 *         description: Error setting data
 */
router.post('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
    try {
        //TODO: Check to make sure buildkey params are known and thus valid.

        const { accountAddress, type, id, secondaryType, secondaryId } = req.params;
        const key = buildKey(accountAddress, type, id, secondaryType, secondaryId);
        const value = req.body;

        await kv.set(key, value);
        res.status(200).json(`Data for ${key} set successfully`);
    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

/**
 * @swagger
 * /user/{accountAddress}/{type}/{id}/{secondaryType}/{secondaryId}:
 *   put:
 *     tags:
 *       - Storage
 *     summary: Update user data
 *     description: Updates existing data for a given user based on specified parameters.
 *     parameters:
 *       - in: path
 *         name: accountAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum account address of the user
 *       - in: path
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *         description: Type of data to update
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: ID for the data
 *       - in: path
 *         name: secondaryType
 *         required: false
 *         schema:
 *           type: string
 *         description: Secondary type of data
 *       - in: path
 *         name: secondaryId
 *         required: false
 *         schema:
 *           type: string
 *         description: Secondary ID for the data
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Updated data
 *     responses:
 *       200:
 *         description: Data updated successfully
 *       404:
 *         description: Key does not exist
 *       500:
 *         description: Error updating data
 */
router.put('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
    try {
        const { accountAddress, type, id, secondaryType, secondaryId } = req.params;
        const key = buildKey(accountAddress, type, id, secondaryType, secondaryId);
        const value = req.body;

        // Check if the key exists
        const exists = await kv.get(key);
        if (!exists) {
            return res.status(404).json(`Key ${key} does not exist`);
        }

        // Update the key with the new value
        await kv.set(key, value);
        res.status(200).json(`Data for ${key} updated successfully`);
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).json('Error updating data');
    }
});

/**
 * @swagger
 * /storage/user/{accountAddress}/{type}/{id}/{secondaryType}/{secondaryId}:
 *   delete:
 *     tags:
 *       - Storage
 *     summary: Delete user data
 *     description: Deletes data for a given user and key parameters.
 *     parameters:
 *       - in: path
 *         name: accountAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum account address of the user.
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *         description: Data type.
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         description: Identifier for the data type.
 *       - in: path
 *         name: secondaryType
 *         schema:
 *           type: string
 *         description: Secondary data type.
 *       - in: path
 *         name: secondaryId
 *         schema:
 *           type: string
 *         description: Identifier for the secondary data type.
 *     responses:
 *       200:
 *         description: Successfully deleted data.
 *       500:
 *         description: Error deleting data.
 */
router.delete('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
    try {
        const { accountAddress, type, id, secondaryType, secondaryId } = req.params;
        const key = buildKey(accountAddress, type, id, secondaryType, secondaryId);

        await kv.del(key);
        res.status(200).json(`Data for ${key} deleted successfully`);
    } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).json('Error deleting data');
    }
});

module.exports = router;