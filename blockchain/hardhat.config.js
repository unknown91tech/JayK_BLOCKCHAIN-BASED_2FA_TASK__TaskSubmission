require("@nomiclabs/hardhat-waffle");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config(); // For safely storing private keys
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      metadata: {
        bytecodeHash: "none",
      },
    }
  },
  networks: {
    hoodi: {
      url: process.env.HOODI_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
    customChains: [
      {
        network: "hoodi",
        chainId: 560048,
        urls: {
          apiURL: process.env.HOODI_URL || "", // Replace with the actual API URL
          browserURL: "https://hoodi.etherscan.io/" // Replace with the actual explorer URL
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};