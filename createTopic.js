const { Client, TopicCreateTransaction } = require('@hashgraph/sdk');
require('dotenv').config(); // To load environment variables from .env file

async function createTopic() {
  // Create a Hedera client for Testnet
  const client = Client.forTestnet();
  client.setOperator(process.env.REACT_APP_HEDERA_ACCOUNT_ID, process.env.REACT_APP_HEDERA_PRIVATE_KEY);

  try {
    // Create a new topic
    const transaction = new TopicCreateTransaction();
    const txResponse = await transaction.execute(client);

    // Get the receipt to confirm the transaction
    const receipt = await txResponse.getReceipt(client);

    // Retrieve the topic ID from the receipt
    const topicId = receipt.topicId;
    console.log("Your topic ID is: " + topicId.toString());

    return topicId;
  } catch (error) {
    console.error("Error creating topic: ", error);
  }
}

// Run the createTopic function
createTopic();
