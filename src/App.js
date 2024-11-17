import React, { useState, useEffect } from 'react';
import './App.css';  // Add this line at the top of App.js
import Web3 from 'web3';
import { Client, TopicMessageSubmitTransaction, TopicMessageQuery } from '@hashgraph/sdk';
import { generateKey, readKey, readPrivateKey, encrypt, decrypt, createMessage, readMessage } from 'openpgp';
import { BrowserProvider, Contract, keccak256, toUtf8Bytes } from 'ethers';


//import contractABI from '../build/contracts/MessageLogger.json'; // Import the ABI of your deployed contract
import MessageLoggerABI from './MessageLogger.json';

function App() {
  const [account, setAccount] = useState(null);
  const [message, setMessage] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [publicKeyArmored, setPublicKeyArmored] = useState('');
  const [privateKeyArmored, setPrivateKeyArmored] = useState('');
  const [messages, setMessages] = useState([]); // State to store received messages
  
  // Your topic ID from Hedera
  const topicId = '0.0.4992822';  // Replace with your actual topic ID
  const contractAddress = '0x00000000000000000000000000000000004c5748';

  // Connect MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (error) {
        console.error('User denied account access');
      }
    } else {
      alert('MetaMask is not installed');
    }
  };

  // Subscribe to the Hedera topic
  const pollTopicMessages = async () => {
    const client = Client.forTestnet();
    client.setOperator(process.env.REACT_APP_HEDERA_ACCOUNT_ID, process.env.REACT_APP_HEDERA_PRIVATE_KEY);

    try {
      console.log("Polling Hedera topic for messages...");
      new TopicMessageQuery()
            .setTopicId(topicId)
            .subscribe(client, (message) => {
                const messageContent = Buffer.from(message.contents, "utf8").toString();
                setMessages(prevMessages => [...prevMessages, messageContent]);
            });

      console.log("Messages received: ", messages);
    } catch (error) {
      console.error("Error polling Hedera topic:", error);
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

  // Log message hash to the smart contract
  const logMessageOnBlockchain = async () => {
    if (!contractAddress || !account) return;
    const provider = new BrowserProvider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new Contract(contractAddress, MessageLoggerABI.abi, signer);

    try {
      const messageHash = keccak256(toUtf8Bytes(encryptedMessage));
      const tx = await contract.logMessage(messageHash);
      await tx.wait();
      console.log('Message hash logged on blockchain:', messageHash);
    } catch (error) {
      console.error('Error logging message on blockchain:', error);
    }
  };

  // Use polling in useEffect to fetch messages every few seconds
  useEffect(() => {
    if (account) {
      const interval = setInterval(() => {
        pollTopicMessages(); // Poll every 5 seconds
      }, 5000);
      return () => clearInterval(interval); // Clear interval on component unmount
    }
  }, [account]);


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
              <button onClick={logMessageOnBlockchain}>Log Message Hash on Blockchain</button>
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

            <div>
              <h3>Received Messages:</h3>
              <p>{JSON.stringify(messages)}</p> {/* Display the raw data to check state */}
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div key={index}>
                    <p>{msg}</p>
                  </div>
                ))
              ) : (
                <p>No messages yet</p> /* Display this if no messages are available */
              )}
            </div>
          </div>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
      </header>
    </div>
  );
}

export default App;
