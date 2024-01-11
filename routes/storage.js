const express = require('express');
const router = express.Router();
const { kv } = require('@vercel/kv');

/**
 * @swagger
 * /storage/user/{accountAddress}/credentials:
 *   get:
 *     summary: Retrieve user credentials
 *     description: Returns the credentials for the specified user account.
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
router.get('/user/:accountAddress/credentials', async (req, res) => {
    try {
        const { accountAddress } = req.params;
        const key = `$account:{accountAddress}:credentials`;

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

module.exports = router;