require('dotenv').config();
const { Client, PrivateKey, ContractCreateTransaction, FileCreateTransaction, FileAppendTransaction } = require('@hashgraph/sdk');
const fs = require('fs');

async function main() {
    const client = Client.forTestnet();
    client.setOperator(process.env.REACT_APP_HEDERA_ACCOUNT_ID, PrivateKey.fromString(process.env.REACT_APP_HEDERA_PRIVATE_KEY));

    const bytecode = JSON.parse(fs.readFileSync('build/contracts/MessageLogger.json', 'utf8')).bytecode;

    // Step 1: Create a file to store the contract bytecode.
    const fileCreateTx = new FileCreateTransaction().setKeys([client.operatorPublicKey]).freezeWith(client);
    const fileCreateSubmit = await fileCreateTx.execute(client);
    const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateReceipt.fileId;

    console.log(`File created with ID: ${bytecodeFileId}`);

    // Step 2: Upload the bytecode in chunks.
    const CHUNK_SIZE = 4096; // Upload in 4KB chunks
    for (let i = 0; i < bytecode.length; i += CHUNK_SIZE) {
        const chunk = bytecode.slice(i, i + CHUNK_SIZE);
        const fileAppendTx = new FileAppendTransaction()
        .setFileId(bytecodeFileId)
        .setContents(chunk)
        .setMaxChunks(10)
        .freezeWith(client);

        await fileAppendTx.execute(client);
    }

    console.log(`Bytecode uploaded to file: ${bytecodeFileId}`);

    // Step 3: Create the contract using the bytecode file.
    const contractCreate = new ContractCreateTransaction()
        .setBytecodeFileId(bytecodeFileId)
        .setGas(1000000);

    const contractCreateSubmit = await contractCreate.execute(client);
    const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateReceipt.contractId;

    console.log(`Contract deployed with ID: ${contractId}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(0);
});
