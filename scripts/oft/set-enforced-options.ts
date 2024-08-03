//
// 
//

import { ethers } from "hardhat";

// https://docs.layerzero.network/v2/developers/evm/gas-settings/options#options-sdk
import { Options } from "@layerzerolabs/lz-v2-utilities";

const OFTAdapter_CONTRACT_NAME = "PumpTokenOFT";
const OFT_CONTRACT_NAME = "PumpTokenOFTAdapter"

async function setEnforcedOptions(
  isForOFTAdapter: boolean,
  oftAdapterContractAddress: string,
  oftContractAddress: string,
  executorLzReceiveOptionMaxGas: number,
  lzEndpointIdOnRemoteChain: string,
) {
  console.log(
    `setEnforcedOptions - isForOFTAdapter:${isForOFTAdapter}, oftAdapterContractAddress:${oftAdapterContractAddress}, oftContractAddress:${oftContractAddress}, executorLzReceiveOptionMaxGas:${executorLzReceiveOptionMaxGas}, lzEndpointIdOnRemoteChain:${lzEndpointIdOnRemoteChain}`,
  );

  const myOFTAdapterContract = await ethers.getContractAt(
    OFTAdapter_CONTRACT_NAME,
    oftAdapterContractAddress,
  );

  const myOFTContract = await ethers.getContractAt(OFT_CONTRACT_NAME, oftContractAddress);

  const myContract = isForOFTAdapter ? myOFTAdapterContract : myOFTContract;

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
  const isForOFTAdapter = "false";
  const oftAdapterContractAddress = "0xD57aAA5C8116cf0F83F7DA5FDCDF90fdde58ea35";
  const oftContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  const executorLzReceiveOptionMaxGas = "200000";
  const lzEndpointIdOnSrcChain = "30101";
  const lzEndpointIdOnDestChain = "30110";

  if (!isForOFTAdapter) {
    throw new Error("Missing isForOFTAdapter");
  } else if (!oftAdapterContractAddress) {
    throw new Error("Missing oftAdapterContractAddress");
  } else if (!oftContractAddress) {
    throw new Error("Missing oftContractAddress");
  } else if (!executorLzReceiveOptionMaxGas) {
    throw new Error("Missing executorLzReceiveOptionMaxGas");
  } else if (!lzEndpointIdOnSrcChain) {
    throw new Error("Missing lzEndpointIdOnSrcChain");
  } else if (!lzEndpointIdOnDestChain) {
    throw new Error("Missing lzEndpointIdOnDestChain");
  }

  await setEnforcedOptions(
    isForOFTAdapter === "true" ? true : false,
    oftAdapterContractAddress,
    oftContractAddress,
    Number(executorLzReceiveOptionMaxGas),
    isForOFTAdapter === "true" ? lzEndpointIdOnDestChain : lzEndpointIdOnSrcChain,
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
