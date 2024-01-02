const express = require('express');
const router = express.Router();
const { SiweMessage } = require('siwe');
const { kv } = require('@vercel/kv');

/**
 * @swagger
 * /siwe/generate_message:
 *   get:
 *     tags:
 *       - SIWE
 *     summary: Generate a SIWE authentication message
 *     description: Generates a Sign-In with Ethereum (SIWE) message for the given Ethereum address.
 *     parameters:
 *       - in: query
 *         name: ethereumAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum address for which to generate the sign-in message.
 *     responses:
 *       200:
 *         description: SIWE message generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: The SIWE message for the user to sign.
 *       400:
 *         description: Bad request, if the Ethereum address is not provided or invalid.
 *       500:
 *         description: Internal server error.
 */
router.get('/generate_message', async (req, res) => {
    const ethereumAddress = req.query.ethereumAddress;
    const nonce = generateNonce(); // Implement this function to generate a unique nonce
    const message = new SiweMessage({
        domain: process.env.WEB_DOMAIN,
        address: ethereumAddress,
        statement: process.env.SIWE_MESSAGE,
        uri: process.env.WEB_DOMAIN,
        version: '1',
        nonce: nonce,
        issuedAt: new Date().toISOString(),
        chainId: 0
    });

    await kv.set(`nonce:${ethereumAddress}`, { nonce: nonce, timestamp: new Date() }, { expirationTtl: 300 }); // Expiration time in seconds (e.g., 300 seconds = 5 minutes)
    res.send({ message: message });
});

/**
 * @swagger
 * /siwe/verify_message:
 *   post:
 *     tags:
 *       - SIWE
 *     summary: Verify a SIWE message
 *     description: Verifies the Sign-In with Ethereum (SIWE) message signed by the user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The signed SIWE message to be verified.
 *     responses:
 *       200:
 *         description: The message was successfully verified.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Verification failed or bad request.
 *       500:
 *         description: Internal server error.
 */
router.post('/verify_message', async (req, res) => {
    try {
        const { message, signature } = req.body;
        const siweMessage = new SiweMessage(message);

        //Verify message signature, before checking nonce matches too.
        const verifiedMsg = await siweMessage.verify({ signature });
        const recoveredAddress = verifiedMsg.data.address;

        // Retrieve the nonce from the KV store
        const nonceKey = `nonce:${recoveredAddress}`;
        const nonceInfo = await kv.get(nonceKey);

        if (nonceInfo && nonceInfo.nonce === siweMessage.nonce && !isNonceExpired(nonceInfo.timestamp)) {
            await kv.del(nonceKey);
            res.send({ success: true, message: 'Authentication successful.' });
        } else {
            res.send({ success: false, message: 'Invalid or expired nonce.' });
        }
    } catch (error) {
        debugger;

        console.error('Error verifying message:', error);
        res.status(400).send({ success: false, message: 'Verification failed.' });
    }
});

router.get('/test', async(req, res) => {
    try {
        const ethereumAddress = "0x4f3C6Fa6b415AA1EF9fF9db3a86B8DB5F4F186a2";

        const nonce = generateNonce(); // Implement this function to generate a unique nonce
        const message = new SiweMessage({
            domain: process.env.WEB_DOMAIN,
            address: ethereumAddress,
            statement: 'Sign in with Ethereum to the app.',
            uri: 'https://yourdomain.com',
            version: '1',
            nonce: nonce,
            chainId: 1
        });

        res.send({ message: message});

    } catch (error) {
        console.error('Error testing message:', error);
        res.status(400).send({ success: false, message: 'Verification failed.' });
    }
})


// Generate a unique nonce
function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Check if nonce is expired
function isNonceExpired(timestamp) {
    const nonceLifetime = 5 * 60 * 1000; // 5 minutes in milliseconds
    return new Date() - timestamp > nonceLifetime;
}

module.exports = router;