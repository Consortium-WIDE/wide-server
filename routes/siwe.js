const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();
const { SiweMessage } = require('siwe');
const { kv } = require('@vercel/kv');

const ALLOWED_TIME_WINDOW = process.env.SIWE_MESSAGE_EXPIRY_SECONDS * 1000

/**
 * @swagger
 * /siwe/generate_signin:
 *   get:
 *     tags:
 *       - SIWE
 *     summary: Generate a SIWE authentication message for the user to sign in
 *     description: Generates a Sign-In with Ethereum (SIWE) message for the given Ethereum address. 
 *                  The user must have already accepted the Terms of Service via the /siwe/signup endpoint.
 *                  This is only required if the HTTPS cookie to indicate sign-in has not been found or has expired.
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
router.get('/generate_signin', async (req, res) => {
    const ethereumAddress = req.query.ethereumAddress;

    //Check if TOS have been signed
    const tosSigned = await kv.get(`termsofservice:${ethereumAddress}`);

    if (!tosSigned || tosSigned > new Date()) {
        res.send({ success: false, requiresSignup: true, message: 'Terms of Service have not yet been signed.' });
        return;
    }


    const message = generateSiweMessage(ethereumAddress, process.env.SIWE_SIGNIN_MESSAGE);

    await kv.set(`nonce:${ethereumAddress}`, { nonce: message.nonce, timestamp: new Date() }, { expirationTtl: process.env.SIWE_MESSAGE_EXPIRY_SECONDS });
    res.send({ success: true, requiresSignup: false, message: message });
});

/**
 * @swagger
 * /siwe/generate_signup:
 *   get:
 *     tags:
 *       - SIWE
 *     summary: Generate a SIWE authentication message for the user to sign up to WIDE.
 *     description: Generates a Sign-In with Ethereum (SIWE) message for the given Ethereum address.
 *                  The message includes the Terms of Service. This only needs to be done one-time.
 *                  This also Sings In the user provided they sign the message.
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
router.get('/generate_signup', async (req, res) => {
    const ethereumAddress = req.query.ethereumAddress;
    const message = generateSiweMessage(ethereumAddress, process.env.SIWE_SIGNUP_MESSAGE);

    await kv.set(`nonce:${ethereumAddress}`, { nonce: message.nonce, timestamp: new Date() }, { expirationTtl: process.env.SIWE_MESSAGE_EXPIRY_SECONDS });
    await kv.set(`termsofservice:${ethereumAddress}`, new Date(), { expirationTtl: process.env.SIWE_MESSAGE_EXPIRY_SECONDS });
    res.send({ message: message });
});

/**
 * @swagger
 * /siwe/verify_signin:
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
router.post('/verify_signin', async (req, res) => {
    try {
        const { message, signature, isOnboarding } = req.body;
        const siweMessage = new SiweMessage(message);

        //Verify message signature, before checking nonce matches too.
        const verifiedMsg = await siweMessage.verify({ signature });
        const recoveredAddress = verifiedMsg.data.address;

        //TODO: Verify Terms of Service have been signed
        const tosSignedKey = `termsofservice:${recoveredAddress}`;
        const tosSigned = await kv.get(tosSignedKey);

        if (!tosSigned || tosSigned > new Date()) {
            res.send({ success: false, requiresSignup: true, message: 'Terms of Service have not yet been signed.' });
        } else {
            let messageIsValid = false;

            //Verify Message Integrity
            if (isOnboarding) {
                messageIsValid = checkMessageIntegrity(siweMessage, {
                    domain: process.env.WEB_DOMAIN,
                    address: recoveredAddress,
                    statement: process.env.SIWE_SIGNUP_MESSAGE,
                    uri: process.env.WEB_DOMAIN,
                    version: '1',
                    chainId: 0
                });
            } else {
                messageIsValid = checkMessageIntegrity(siweMessage, {
                    domain: process.env.WEB_DOMAIN,
                    address: recoveredAddress,
                    statement: process.env.SIWE_SIGNIN_MESSAGE,
                    uri: process.env.WEB_DOMAIN,
                    version: '1',
                    chainId: 0
                });
            }

            // Retrieve the nonce from the KV store
            const nonceKey = `nonce:${recoveredAddress}`;
            const nonceInfo = await kv.get(nonceKey);

            if (messageIsValid && nonceInfo && nonceInfo.nonce === siweMessage.nonce && !isNonceExpired(nonceInfo.timestamp)) {
                await kv.del(nonceKey);

                req.session.user = recoveredAddress;

                res.send({ success: true, message: 'Authentication successful.' });
            } else {
                res.send({ success: false, message: 'Invalid or expired nonce.' });
            }
        }
    } catch (error) {
        console.error('Error verifying message:', error);
        res.status(400).send({ success: false, message: 'Verification failed.' });
    }
});

/**
 * @swagger
 * /siwe/tos:
 *   delete:
 *     tags:
 *       - SIWE
 *     summary: Delete Terms of Service (TOS) acknowledgment for a user
 *     description: Deletes the acknowledgment record of the Terms of Service for a specific Ethereum address.
 *     parameters:
 *       - in: query
 *         name: ethereumAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: The Ethereum address of the user whose TOS acknowledgment record is to be deleted.
 *     responses:
 *       200:
 *         description: TOS acknowledgment record successfully deleted.
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
 *         description: Bad request, if the Ethereum address is not provided or invalid.
 */
router.delete('/tos', async (req, res) => {
    const ethereumAddress = req.query.ethereumAddress;
    await kv.del(`termsofservice:${ethereumAddress}`);

    res.send({ success: true, message: `Delete TOS timestamp for ${ethereumAddress}` });
});

//Generate SIWE message for WIDE
function generateSiweMessage(ethereumAddress, statement) {
    const nonce = generateNonce();
    const message = new SiweMessage({
        domain: process.env.WEB_DOMAIN,
        address: ethereumAddress,
        statement: statement,
        uri: process.env.WEB_DOMAIN,
        version: '1',
        nonce: nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(new Date().getTime() + ALLOWED_TIME_WINDOW).toISOString(),
        chainId: 0
    });

    return message;
}

// Generate a unique nonce
function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Check if nonce is expired
function isNonceExpired(timestamp) {
    const nonceLifetime = ALLOWED_TIME_WINDOW;
    return new Date() - timestamp > nonceLifetime;
}

function checkMessageIntegrity(siweMessage, expectedValues) {
    // expectedValues should be an object containing the expected domain, statement, uri, etc.
    return siweMessage.domain === expectedValues.domain &&
        siweMessage.address === expectedValues.address &&
        siweMessage.statement === expectedValues.statement &&
        siweMessage.uri === expectedValues.uri &&
        siweMessage.version === expectedValues.version &&
        siweMessage.chainId === expectedValues.chainId
    // Issued At and Expiry are informational only, since that is defined by the nonce expiry
}

module.exports = router;