const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { redisClient } = require('../redisClient');
const isAuthenticated = require('../middleware/authenticate');
const { logPresentation, getPresentationHistory } = require('../web3/web3Connector');
const web3 = require('web3');

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
    return `I, holder of ${ethAddress}, am signing this message for WIDE to store my credential presentation history and understand that I will not share the message signature from this message with anyone other than WIDE.`;
}

module.exports = router;