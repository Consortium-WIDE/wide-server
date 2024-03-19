const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { redisClient } = require('../redisClient');
const isAuthenticated = require('../middleware/authenticate');
const { logPayload, hashDataKeccak256, hashTextKeccak256, recoverDataFromWide, signDataAsWide } = require('../web3/web3Connector');
const web3 = require('web3');
const { generateNonce } = require('siwe');

router.get('/user/:accountAddress/issued-credentials', isAuthenticated, async (req, res) => {
    try {
        //TODO: verify accountAddress matches cookie.
        const { accountAddress } = req.params;
        const key = `account:${accountAddress}:issued-credentials`;

        const keyExists = await redisClient.exists(key);

        if (!keyExists) {
            res.status(204).json([]);
            return;
        }

        const data = await redisClient.lrange(key, 0, -1);
        if (data && data.length > 0) {
            // Assuming the data in the list is stored as JSON strings
            const credentials = data.map(item => JSON.parse(item));
            res.status(200).json(credentials);
        } else {
            res.status(204).json([]);
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json('Error retrieving data');
    }
});

router.get('/user/:accountAddress/issued-credential/:wideInternalId', isAuthenticated, async (req, res) => {
    try {
        //TODO: verify accountAddress matches cookie.
        const { accountAddress, wideInternalId } = req.params;
        const key = `account:${accountAddress}:issued-credentials`;

        const keyExists = await redisClient.exists(key);

        if (!keyExists) {
            res.status(204).json([]);
            return;
        }

        const data = await redisClient.lrange(key, 0, -1);
        if (data && data.length > 0) {
            // Assuming the data in the list is stored as JSON strings
            const credential = data.map(item => JSON.parse(item)).filter(c => c.wideInternalId.toLocaleLowerCase() == wideInternalId.toLocaleLowerCase())[0];

            res.status(200).json(credential);
        } else {
            res.status(404).json();
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json('Error retrieving data');
    }
});

router.get('/user/:accountAddress/credentials/:key', isAuthenticated, async (req, res) => {
    try {
        //TODO: verify accountAddress matches cookie.
        const { accountAddress, key } = req.params;
        const credentialKey = `account:${accountAddress}:credential:${key}`;

        const credentialData = await redisClient.hgetall(credentialKey);

        if (credentialData && Object.keys(credentialData).length !== 0) {
            for (const prop in credentialData) {
                credentialData[prop] = JSON.parse(credentialData[prop]);
            }
            res.status(200).json(credentialData);
        } else {
            res.status(204).json({});
        }
    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).json('Error retrieving data');
    }
});

router.delete('/user/:accountAddress/credentials/:key', isAuthenticated, async (req, res) => {
    try {
        //TODO: verify accountAddress matches cookie.
        const { accountAddress, key } = req.params;
        const issuersIndexKey = `account:${accountAddress}:issued-credentials`;
        const credentialKey = `account:${accountAddress}:credential:${key}`;

        const userCredentials = await redisClient.lrange(issuersIndexKey, 0, -1);

        const credentialToRemove = userCredentials.find(credentialString => {
            const credential = JSON.parse(credentialString);
            return credential.wideInternalId === key;
        });

        if (credentialToRemove) {
            await redisClient.lrem(issuersIndexKey, 1, credentialToRemove);
            await redisClient.del(credentialKey);

            res.status(200).json(`Credential deleted successfully`);
        } else {
            res.status(200).json(`Failed to retrieve credential for deletion`);
        }
    } catch (error) {
        console.error('Error deleting credential:', error);
        res.status(500).json('Error deleting credential');
    }
});

router.post('/user/:accountAddress/credential', isAuthenticated, async (req, res) => {
    //TODO: Consider separating into two separate try catch blocks to separate redisClient storage from web3 errors.
    try {
        //TODO: verify accountAddress matches cookie.
        const { accountAddress } = req.params;
        const { issuer, payload, credentials } = req.body;
        const rawPayloadHash = req.body.rawPayloadHash; //possible issue with binding the body?

        //Notes:
        //issuer: The dataset representing the Issuer and info on the issuance of the credentials
        //payload: The entire set of credentials ('payload') in encrypted format
        //credentials: The credentials encrypted separately

        const internalIdPayload = {
            issuer: issuer,
            nonce: generateNonce()
        }
        const wideIdentifier = hashDataKeccak256(internalIdPayload);
        //We do not need the entire payload. Ephemeral Key and nonce may remain private for increased security
        //The `hashTextKeccak256(payload.ciphertext)` must be sent with all presentations to allow the RP to verify credential presentation to WIDE
        const encPayloadHash = hashTextKeccak256(payload);

        const issuersIndexKey = `account:${accountAddress}:issued-credentials`;
        const credentialKey = `account:${accountAddress}:credential:${wideIdentifier}`;

        const issuerWithId = JSON.stringify({ wideInternalId: wideIdentifier, ...issuer });

        await redisClient.rpush(issuersIndexKey, issuerWithId);
        await redisClient.hset(credentialKey, 'payload', JSON.stringify(payload), 'credentials', JSON.stringify(credentials));

        //We must canonicalize this payload since its hash is used for RP verification
        const payloadSignatureMessage = {
            publicKey: accountAddress,
            encPayloadHash: encPayloadHash,
            payloadHash: rawPayloadHash
        };

        // Call your smart contract here
        const payloadKey = hashDataKeccak256(payloadSignatureMessage); //This may be generated by the RP without knowledge of the payload decrypted contents
        const payloadSignature = await signDataAsWide(payloadSignatureMessage); //This allows the RP to verify that the Wide server has seen it.

        //This is for development and debugging purposes - to ensure that the signed message is accurately recoverable
        //const recoveredSignatureFromWide = await recoverDataFromWide(payloadSignatureMessage, payloadSignature);

        // Using the logPayload function from blockchain.js
        await logPayload(payloadKey, payloadSignature);

        //This is for development and debugging purposes.
        // console.log('payloadSignatureMessage', payloadSignatureMessage);
        // console.log('logged payload', payloadKey);

        res.status(200).json({ data: { wideInternalId: wideIdentifier, ...issuer }, message: `Data for ${credentialKey} set successfully` });
    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

router.put('/user/:accountAddress/credential', isAuthenticated, async (req, res) => {
    //TODO: Consider separating into two separate try catch blocks to separate redisClient storage from web3 errors.
    try {
        //TODO: verify accountAddress matches cookie.
        const { accountAddress } = req.params;
        const { issuer, payload, credentials } = req.body;
        const rawPayloadHash = req.body.rawPayloadHash; //possible issue with binding the body?

        //Notes:
        //issuer: The dataset representing the Issuer and info on the issuance of the credentials
        //payload: The entire set of credentials ('payload') in encrypted format
        //credentials: The credentials encrypted separately

        if (!issuer.wideInternalId) {
            res.status(500).json('Invalid Issuer. wideInternalId must be present for updates');
            return;
        }

        const wideIdentifier = issuer.wideInternalId;
        //We do not need the entire payload. Ephemeral Key and nonce may remain private for increased security
        //The `hashTextKeccak256(payload.ciphertext)` must be sent with all presentations to allow the RP to verify credential presentation to WIDE
        const encPayloadHash = hashTextKeccak256(payload);

        const credentialKey = `account:${accountAddress}:credential:${wideIdentifier}`;

        //TODO: Redis Database requires a redesign since issuer is not being updated. issuerIndexKey should not store a complex object, but only the wideIdentifier
        await redisClient.hset(credentialKey, 'payload', JSON.stringify(payload), 'credentials', JSON.stringify(credentials));

        //We must canonicalize this payload since its hash is used for RP verification
        const payloadSignatureMessage = {
            publicKey: accountAddress,
            encPayloadHash: encPayloadHash,
            payloadHash: rawPayloadHash
        };

        // Call your smart contract here
        const payloadKey = hashDataKeccak256(payloadSignatureMessage); //This may be generated by the RP without knowledge of the payload decrypted contents
        const payloadSignature = await signDataAsWide(payloadSignatureMessage); //This allows the RP to verify that the Wide server has seen it.

        //This is for development and debugging purposes - to ensure that the signed message is accurately recoverable
        //const recoveredSignatureFromWide = await recoverDataFromWide(payloadSignatureMessage, payloadSignature);

        // Using the logPayload function from blockchain.js
        await logPayload(payloadKey, payloadSignature);

        //This is for development and debugging purposes.
        // console.log('payloadSignatureMessage', payloadSignatureMessage);
        // console.log('logged payload', payloadKey);

        res.status(200).json({ data: { wideInternalId: wideIdentifier, ...issuer }, message: `Data for ${credentialKey} set successfully` });
    } catch (error) {
        console.error('Error setting data:', error);
        res.status(500).json('Error setting data');
    }
});

module.exports = router;