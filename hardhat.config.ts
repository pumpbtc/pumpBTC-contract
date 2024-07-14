import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";
import "@matterlabs/hardhat-zksync";
import { EndpointId } from '@layerzerolabs/lz-definitions'

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
      },
    ],
  },  
  zksolc: {
    version: '1.3.22',
    settings: {},
  },
  networks: {
    eth: {
      eid: EndpointId.ETHEREUM_V2_MAINNET,
      url: process.env.RPC_ETH_MAIN,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    sepolia: {
      eid: EndpointId.SEPOLIA_V2_TESTNET,
      url: process.env.RPC_ETH_SEPOLIA,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    bsc: {
      eid: EndpointId.BSC_V2_MAINNET,
      url: process.env.RPC_BSC,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    mantle: {
      eid: EndpointId.MANTLE_V2_MAINNET,
      url: process.env.RPC_MANTLE,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    zklink: {
      eid: EndpointId.ZKLINK_V2_MAINNET,
      url: process.env.RPC_ZKLINK,
      ethNetwork: 'eth',
      zksync: true,
      verifyURL: 'https://explorer.zklink.io/contract_verification',
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