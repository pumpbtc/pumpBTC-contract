import { ethers } from "hardhat";

import {Options} from '@layerzerolabs/lz-v2-utilities';
import { EndpointId } from '@layerzerolabs/lz-definitions'


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  const contractA = "0xD57aAA5C8116cf0F83F7DA5FDCDF90fdde58ea35"; 
  const contractB = "0x8E26CCC5d3DD2ccc348c53b732312a3AC7e0A1EF"; 
  const eidB = EndpointId.ZKLINK_V2_MAINNET;

  const PumpTokenOFTAdapter = await ethers.getContractFactory("PumpTokenOFTAdapter");
  const oftA = PumpTokenOFTAdapter.attach(contractA);

  const PumpTokenOFT = await ethers.getContractFactory("PumpTokenOFT");
  const oftB = PumpTokenOFT.attach(contractB);

  const peerAddress = contractB;
  const peerInBytes32 = ethers.zeroPadValue(peerAddress, 32);

  const isPeer = await oftA.isPeer(eidB, peerInBytes32);
  console.log("Is Peer:", isPeer);

  if (!isPeer) {
    console.log("Peers are not set correctly, exiting...");
    return;
  }

  const sharedDecimals = await oftA.sharedDecimals();
  console.log('Contract Shared Decimals:', sharedDecimals);

  const tokensToSend = ethers.parseUnits('0.000001', 8);
  console.log('Tokens to Send:', tokensToSend);

  const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString();
  console.log('Options:', options);

  const sendParam = [
    eidB,
    ethers.zeroPadValue(deployer.address, 32),
    tokensToSend,
    tokensToSend,
    options,
    '0x',
    '0x',
  ];
  console.log('Send Param:', sendParam);

  // Fetching the native fee for the token send operation
  const [nativeFee] = await oftA.quoteSend(sendParam, false);
  console.log('Native Fee:', nativeFee);

//   const txResponse = await oftA.send(sendParam, [nativeFee, 0], deployer.address, {
//     value: nativeFee,
//     gasLimit: 500000, 
//   });
//   const receipt = await txResponse.wait();

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
