const { Web3 } = require('web3');
const { canonicalize } = require('json-canonicalize');

const contractABI = require('./abi/WideSignatureLogger.json').abi;
const contractAddress = process.env.WIDE_CONTRACT;

const web3 = new Web3(process.env.WEB3_NODE_URI);
const contract = new web3.eth.Contract(contractABI, contractAddress);

async function logPayload(payloadKey, payloadSignature) {
    const senderAccount = process.env.WEB3_PUBLIC_KEY;
    const privateKey = process.env.WEB3_PRIVATE_KEY;

    // Create PayloadSignaturePair object
    const payloadPair = {
        payloadKey: payloadKey,
        signature: payloadSignature
    };

    const logPayloadData = contract.methods.logPayload(payloadPair).encodeABI();

    const gasEstimate = await web3.eth.estimateGas({
        from: senderAccount,
        to: contractAddress,
        data: logPayloadData
    });

    const gasPrice = await web3.eth.getGasPrice();

    const signedTransaction = await web3.eth.accounts.signTransaction({
        from: senderAccount,
        to: contractAddress,
        data: logPayloadData,
        gas: gasEstimate,
        gasPrice: gasPrice
    }, privateKey);

    const txReceipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
}

async function logPresentation(historyKey, data) {
    const senderAccount = process.env.WEB3_PUBLIC_KEY;
    const privateKey = process.env.WEB3_PRIVATE_KEY;

    const stringifiedData = JSON.stringify(data);
    const logPresentation = contract.methods.logPresentation(historyKey, stringifiedData).encodeABI();

    const gasEstimate = await web3.eth.estimateGas({
        from: senderAccount,
        to: contractAddress,
        data: logPresentation
    });

    const gasPrice = await web3.eth.getGasPrice();

    const signedTransaction = await web3.eth.accounts.signTransaction({
        from: senderAccount,
        to: contractAddress,
        data: logPresentation,
        gas: gasEstimate,
        gasPrice: gasPrice
    }, privateKey);

    const txReceipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
}

async function getPresentationHistory(historyKey) {
    const rawData = await contract.methods.getPresentationHistory(historyKey).call();
    return rawData;
}

function hashDataKeccak256(data) {
    return web3.utils.keccak256(JSON.stringify(canonicalize(data)));
}

function hashTextKeccak256(textData) {
    return web3.utils.keccak256(textData);
}

function signDataAsWide(data) {
    return signTextAsWide(JSON.stringify(canonicalize(data)));
}

function signTextAsWide(textData) {
    const privateKey = process.env.WEB3_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("Private key not found in environment variables.");
    }

    const signatureObject = web3.eth.accounts.sign(textData, privateKey);

    return signatureObject.signature;
}

function recoverDataFromWide(data, signature) {
    return recoverTextFromWide(JSON.stringify(canonicalize(data)), signature);
}

function recoverTextFromWide(message, signature) {
    return web3.eth.accounts.recover(message, signature);
}

module.exports = {
    logPayload,
    logPresentation,
    getPresentationHistory,
    hashDataKeccak256,
    hashTextKeccak256,
    signDataAsWide,
    signTextAsWide,
    recoverDataFromWide,
    recoverTextFromWide
};
