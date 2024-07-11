import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-verify";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    eth: {
      url: process.env.RPC_ETH_MAIN,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    sepolia: {
      url: process.env.RPC_ETH_SEPOLIA,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    bsc: {
      url: process.env.RPC_BSC,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    mantle: {
      url: process.env.RPC_MANTLE,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.API_ETHERSCAN_ETH!,
      sepolia: process.env.API_ETHERSCAN_ETH!,
      bsc: process.env.API_ETHERSCAN_BSC!,
      mantle: "mantle", // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan",
          browserURL: "https://mantlescan.info"
        }
      }
    ]    
  }
};

export default config;


const { ProxyAgent, setGlobalDispatcher } = require("undici");
const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
setGlobalDispatcher(proxyAgent);