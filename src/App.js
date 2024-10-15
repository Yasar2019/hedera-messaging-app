import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { Client, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { generateKey, readKey, readPrivateKey, encrypt, decrypt, createMessage, readMessage } from 'openpgp';

function App() {
  const [account, setAccount] = useState(null);
  const [message, setMessage] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [publicKeyArmored, setPublicKeyArmored] = useState('');
  const [privateKeyArmored, setPrivateKeyArmored] = useState('');
  
  // Your topic ID from Hedera
  const topicId = '0.0.4992822';  // Replace with your actual topic ID

  // Connect MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
      } catch (error) {
        console.error('User denied account access');
      }
    } else {
      alert('MetaMask is not installed');
    }
  };

  // Generate public and private keys for encryption
  const generateKeys = async () => {
    const { privateKey, publicKey } = await generateKey({
      type: 'ecc',
      curve: 'curve25519',
      userIDs: [{ name: 'User', email: 'user@example.com' }],
    });
    setPublicKeyArmored(publicKey.toString());
    setPrivateKeyArmored(privateKey.toString());
  };

  // Encrypt a message with the recipient's public key
  const encryptMessage = async (message) => {
    const publicKey = await readKey({ armoredKey: publicKeyArmored });
    const encrypted = await encrypt({
      message: await createMessage({ text: message }),
      encryptionKeys: publicKey,
    });
    setEncryptedMessage(encrypted);
  };

  // Decrypt the message with the recipient's private key
  const decryptMessage = async (encryptedMessage) => {
    const privateKey = await readPrivateKey({ armoredKey: privateKeyArmored });
    const message = await readMessage({ armoredMessage: encryptedMessage });
    const { data: decrypted } = await decrypt({
      message,
      decryptionKeys: privateKey,
    });
    setDecryptedMessage(decrypted);
  };

  // Send the encrypted message to Hedera Consensus Service
  const sendMessageToHedera = async () => {
    const client = Client.forTestnet();
    client.setOperator(process.env.REACT_APP_HEDERA_ACCOUNT_ID, process.env.REACT_APP_HEDERA_PRIVATE_KEY);

    const submitTransaction = new TopicMessageSubmitTransaction({
      topicId: topicId,  // Use the topicId you just created
      message: encryptedMessage
    });

    // Freeze the transaction before executing it
    await submitTransaction.freezeWith(client);

    // Execute the frozen transaction
    const submitReceipt = await submitTransaction.execute(client);
    console.log(`Message submitted to Hedera: ${encryptedMessage}`);
  };

  useEffect(() => {
    generateKeys();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Hedera Messaging App</h1>
        {account ? (
          <div>
            <p>Connected with {account}</p>

            <div>
              <textarea 
                placeholder="Type a message" 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
              />
              <button onClick={() => encryptMessage(message)}>Encrypt Message</button>
              <button onClick={sendMessageToHedera}>Send Encrypted Message to Hedera</button>
            </div>

            {encryptedMessage && (
              <div>
                <h3>Encrypted Message:</h3>
                <p>{encryptedMessage}</p>
                <button onClick={() => decryptMessage(encryptedMessage)}>Decrypt Message</button>
              </div>
            )}

            {decryptedMessage && (
              <div>
                <h3>Decrypted Message:</h3>
                <p>{decryptedMessage}</p>
              </div>
            )}

          </div>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </header>
    </div>
  );
}

export default App;
