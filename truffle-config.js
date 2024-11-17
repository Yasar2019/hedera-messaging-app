const { Client, PrivateKey } = require('@hashgraph/sdk');
require('dotenv').config({ path: './.env' });

module.exports = {
  networks: {
    hedera: {
      provider: () => {
        const client = Client.forTestnet();
        client.setOperator(process.env.REACT_APP_HEDERA_ACCOUNT_ID, process.env.REACT_APP_HEDERA_PRIVATE_KEY);
        return client;
      },
      network_id: '*',
    },
  },
  compilers: {
    solc: {
      version: "0.8.0",
    },
  },
};
