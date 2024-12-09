import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";
import "@matterlabs/hardhat-zksync";

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
      url: process.env.RPC_ETH_MAIN,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    base: {
      url: process.env.RPC_BASE,
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
    arbitrum: {
      url: process.env.PRC_ARB,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    zklink: {
      url: process.env.RPC_ZKLINK,
      ethNetwork: 'eth',
      zksync: true,
      verifyURL: 'https://explorer.zklink.io/contract_verification',
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    bera_testnet: {
      url: process.env.RPC_BERA,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    move_test: {
      url: process.env.RPC_MOVE_TEST,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    zircuit: {
      url: process.env.RPC_ZIRCUIT,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    bob: {
      url: process.env.RPC_BOB,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    zeta: {
      url: process.env.RPC_ZETA,
      accounts: [ 
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },    
    core: {
      url: process.env.RPC_CORE,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ],
      chainId: 1116
    },
    avalance:{
      url: process.env.RPC_AVALANCE,
      accounts: [
        process.env.PRIVATE_KEY_ADMIN!,
      ]
    },
    bera_cartio: {
      url: process.env.RPC_BERA_CARTIO,
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
      arbitrum: process.env.API_ETHERSCAN_ARB!,
      arbitrumOne: process.env.API_ETHERSCAN_ARB!,
      base: process.env.API_ETHERSCAN_BASE!,
      bob: "bob",
      mantle: "mantle", // apiKey is not required, just set a placeholder
      bera_testnet: "bera_testnet", // apiKey is not required, just set a placeholder
      zircuit: process.env.API_ETHERSCAN_ZIRCUIT!,
      core: process.env.API_ETHERSCAN_CORE!,
      avalance: "avalance",
      bera_cartio: "bera_cartio", // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: "mantle",
        chainId: 5000,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/5000/etherscan",
          browserURL: "https://mantlescan.info"
        }
      },
      {
        network: "bera_testnet",
        chainId: 80084,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/80084/etherscan",
          browserURL: "https://bartio.beratrail.io"
        }
      },
      {
        network: 'zircuit',
        chainId: 48900,
        urls: {
          apiURL: 'https://explorer.zircuit.com/api/contractVerifyHardhat',
          browserURL: 'https://explorer.zircuit.com',
        },
      }, 
      {
        network: 'bob',
        chainId: 60808,
        urls: {
          apiURL: 'https://explorer.gobob.xyz/api',
          browserURL: 'https://explorer.gobob.xyz/',
        },
      },      
      {
        network: "core",
        chainId: 1116,
        urls: {
          apiURL: "https://openapi.coredao.org/api",
          browserURL: "https://scan.coredao.org/"
        }
      },
      {
        network: 'avalance',
        chainId: 43114,
        urls: {
          apiURL: 'https://api.snowtrace.io/api',
          browserURL: 'https://snowtrace.io/',
        },
      },
      {
        network: "bera_cartio",
        chainId: 80000,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/80000/etherscan",
          browserURL: "https://80000.testnet.localhost:8080"
        }
      }
    ]    
  }
};

export default config;


// const { ProxyAgent, setGlobalDispatcher } = require("undici");
// const proxyAgent = new ProxyAgent("http://127.0.0.1:7890");
// setGlobalDispatcher(proxyAgent);