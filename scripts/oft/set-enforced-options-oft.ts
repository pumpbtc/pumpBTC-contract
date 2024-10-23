import { ethers } from "hardhat";

// https://docs.layerzero.network/v2/developers/evm/gas-settings/options#options-sdk
import { Options } from "@layerzerolabs/lz-v2-utilities";

const OFT_CONTRACT_NAME = "PumpTokenOFT"

async function setEnforcedOptions(
  oftContractAddress: string,
  executorLzReceiveOptionMaxGas: number,
  lzEndpointIdOnRemoteChain: string,
) {
  console.log(
    `setEnforcedOptions - oftContractAddress:${oftContractAddress}, executorLzReceiveOptionMaxGas:${executorLzReceiveOptionMaxGas}, lzEndpointIdOnRemoteChain:${lzEndpointIdOnRemoteChain}`,
  );

  const myOFTContract = await ethers.getContractAt(OFT_CONTRACT_NAME, oftContractAddress);
  const myContract = myOFTContract;

  // https://docs.layerzero.network/v2/developers/evm/gas-settings/options#lzreceive-option
  const options = Options.newOptions().addExecutorLzReceiveOption(executorLzReceiveOptionMaxGas, 0);

  // https://docs.layerzero.network/v2/developers/evm/oft/quickstart#setting-enforced-options
  let enforcedOptions = [
    {
      eid: lzEndpointIdOnRemoteChain, // destination Endpoint ID
      msgType: 1,
      options: options.toBytes(),
    },
  ];

  const tx = await myContract.setEnforcedOptions(enforcedOptions);
  const txReceipt = await tx.wait();
  console.log("setEnforcedOptions tx:", txReceipt?.hash);
}

async function main() {
  // Base PumpBTC
  // const oftContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const lzEndpointIdOnDestChain = "30279"; // Bob
  // const lzEndpointIdOnDestChain = "30303"; // Zircuit

  // Zircuit PumpBTC
  // const oftContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const lzEndpointIdOnDestChain = "30279"; // Bob
  // const lzEndpointIdOnDestChain = "30184"; // Base
  // const lzEndpointIdOnDestChain = "30303"; // Zircuit

  // Bob PumpBTC
  const oftContractAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E";
  // const lzEndpointIdOnDestChain = "30279"; // Bob
  // const lzEndpointIdOnDestChain = "30184"; // Base
  const lzEndpointIdOnDestChain = "30303"; // Zircuit

  const executorLzReceiveOptionMaxGas = "200000";

  await setEnforcedOptions(
    oftContractAddress,
    Number(executorLzReceiveOptionMaxGas),
    lzEndpointIdOnDestChain,
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
