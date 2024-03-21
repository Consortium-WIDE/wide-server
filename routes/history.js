const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { redisClient } = require('../redisClient');
const isAuthenticated = require('../middleware/authenticate');
const { logPresentation, getPresentationHistory } = require('../web3/web3Connector');
const wideMessages = require('../helpers/wideMessages');
const web3 = require('web3');

/**
 * @swagger
 * /get:
 *   get:
 *     tags:
 *       - History
 *     summary: Retrieve presentation history
 *     description: Retrieves the presentation history for the authenticated user based on their Ethereum address.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Presentation history retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       jsonData:
 *                         type: object
 *                         description: The JSON data of the presentation.
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         description: The ISO string representation of the presentation timestamp.
 *                 hasKey:
 *                   type: boolean
 *                   description: Indicates whether the user has a registered history key.
 *       500:
 *         description: Internal Server Error
 */
router.get('/get', isAuthenticated, async (req, res) => {
    try {
        const ethereumAddress = req.session.user;

        const key = `history:${ethereumAddress}:key`
        const historyKey = await redisClient.get(key);

        if (historyKey) {
            let history = await getPresentationHistory(historyKey);

            // Map over the history to convert timestamps and exclude original BigInt timestamps
            const updatedHistory = history.map(({ jsonString, timestamp }) => {
                // Convert BigInt timestamp to Number, then multiply to get milliseconds, and convert to ISO string
                const convertedTimestamp = new Date(Number(timestamp) * 1000).toISOString();
                const jsonData = JSON.parse(jsonString);
                return {
                    jsonData,
                    timestamp: convertedTimestamp
                };
            });

            res.status(200).json({ data: updatedHistory, hasKey: true });
        } else {
            res.status(200).json({ data: [], hasKey: false });
        }
    } catch (error) {
        console.error('Error occured:', error);
        res.status(500).json('Internal Server Error');
    }
});

/**
 * @swagger
 * /key:
 *   get:
 *     tags:
 *       - History
 *     summary: Retrieve user's history key
 *     description: Retrieves the history key for the authenticated user's presentation history.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: History key retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 key:
 *                   type: string
 *                   description: The user's history key.
 *       500:
 *         description: Internal Server Error
 */
router.get('/key', isAuthenticated, async (req, res) => {
    try {
        const ethereumAddress = req.session.user;

        const key = `history:${ethereumAddress}:key`

        const historyKey = await redisClient.get(key);

        res.status(200).json({ key: historyKey });
    } catch (error) {
        console.error('Error occured:', error);
        res.status(500).json('Internal Server Error');
    }
});

/**
 * @swagger
 * /hasKey:
 *   get:
 *     tags:
 *       - History
 *     summary: Check if user has a history key
 *     description: Checks if the authenticated user has a registered history key for their presentation history.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: History key existence check result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasKey:
 *                   type: boolean
 *                   description: Indicates whether the user has a registered history key.
 *       500:
 *         description: Internal Server Error
 */
router.get('/hasKey', isAuthenticated, async (req, res) => {
    try {
        const ethereumAddress = req.session.user;

        const key = `history:${ethereumAddress}:key`

        const historyKey = await redisClient.get(key);

        if (historyKey) {
            res.status(200).json({ hasKey: true });
        } else {
            res.status(200).json({ hasKey: false });
        }
    } catch (error) {
        console.error('Error occured:', error);
        res.status(500).json('Internal Server Error');
    }
});

/**
 * @swagger
 * /generate_message:
 *   get:
 *     tags:
 *       - History
 *     summary: Generate a message for key registration
 *     description: Generates a message that needs to be signed by the user to register a history key for their presentation history.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Message generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The message to be signed by the user.
 *       500:
 *         description: Internal Server Error
 */
router.get('/generate_message', isAuthenticated, async (req, res) => {
    try {
        const ethereumAddress = req.session.user;

        const message = getMessage(ethereumAddress);
        res.status(200).json({ message: message });
    } catch (error) {
        console.error('Error occured:', error);
        res.status(500).json('Internal Server Error');
    }
});

/**
 * @swagger
 * /register_key:
 *   post:
 *     tags:
 *       - History
 *     summary: Register a history key
 *     description: Registers a history key for the authenticated user by verifying a signed message.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signature:
 *                 type: string
 *                 description: The signature of the message generated by /generate_message endpoint.
 *     responses:
 *       200:
 *         description: History key registered successfully.
 *       409:
 *         description: Key has already been registered.
 *       500:
 *         description: Unable to recover correct address or Internal Server Error.
 */
router.post('/register_key', isAuthenticated, async (req, res) => {
    try {
        const { signature } = req.body;
        const ethereumAddress = req.session.user;

        const message = getMessage(ethereumAddress);

        const recoveredAddress = web3.eth.accounts.recover(message, signature);

        if (recoveredAddress.toLocaleLowerCase() === ethereumAddress.toLocaleLowerCase()) {
            let historyKey = web3.utils.keccak256(`${ethereumAddress.toLocaleLowerCase()}:${signature}`);
            const key = `history:${ethereumAddress}:key`;

            const existingHistoryKey = await redisClient.get(key);

            if (existingHistoryKey) {
                res.status(409).json({ message: 'Key has already been registered' });
                return;
            } else {
                await redisClient.set(key, historyKey);
            }

            res.status(200).json({ success: true, message: 'History key set successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Unable to recover correct address' });
        }
    } catch (error) {
        console.error('Error occured:', error);
        res.status(500).json('Internal Server Error');
    }
});

/**
 * @swagger
 * /logPresentation:
 *   post:
 *     tags:
 *       - History
 *     summary: Log a presentation
 *     description: Logs a presentation for the authenticated user's history.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 description: The data of the presentation to log.
 *     responses:
 *       200:
 *         description: Presentation logged successfully.
 *       500:
 *         description: Internal Server Error
 */
router.post('/logPresentation', isAuthenticated, async (req, res) => {
    try {
        const ethereumAddress = req.session.user;
        const data = req.body;

        const key = `history:${ethereumAddress}:key`;

        const historyKey = await redisClient.get(key);

        await logPresentation(historyKey, data);

        res.status(200).json({ message: 'Presentation logged successfully' });
    } catch (error) {
        console.error('Error occured:', error);
        res.status(500).json('Internal Server Error');
    }
});

function getMessage(ethAddress) {
    return wideMessages.historyKeyMessage.replace('{{ethAddress}}', ethAddress);
}

module.exports = router;