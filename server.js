require('dotenv').config();
const cors = require('cors');
const express = require('express');
const { kv } = require('@vercel/kv');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:4200' }));

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

// Get user data
app.get('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
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

// Set user data
app.post('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
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

//Update user data
app.put('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
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

// Delete user data
app.delete('/user/:accountAddress/:type?/:id?/:secondaryType?/:secondaryId?', async (req, res) => {
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
