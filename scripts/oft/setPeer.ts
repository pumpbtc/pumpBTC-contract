import { ethers } from "hardhat";
import { EndpointId } from '@layerzerolabs/lz-definitions'

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  // // Base - Zircuit
  // const oftAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"; // OFT contract address
  // const eid = 30303;
  // const peerAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";

  // // Zircuit - Base
  // const oftAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"; // OFT contract address
  // const eid = 30184;
  // const peerAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";


  //  // Zircuit - Bob
  // const oftAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"; // OFT contract address
  // const eid = 30279;
  // const peerAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E";


  // Bob - Zircuit
  // const oftAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E"; // OFT contract address
  // const eid = 30303;
  // const peerAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";

  // Bob - Base
  // const oftAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E"; // OFT contract address
  // const eid = 30184;
  // const peerAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";

  // Base-Bob
  const oftAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"; // OFT contract address
  const eid = 30279;
  const peerAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E";

  const PumpTokenOFT = await ethers.getContractFactory("PumpTokenOFT");
  const oft = PumpTokenOFT.attach(oftAddress);

  const peerInBytes32 = ethers.zeroPadValue(peerAddress, 32);

  const txResponse = await oft.setPeer(eid, peerInBytes32);
  const receipt = await txResponse.wait();

  console.log("setPeer transaction receipt:", receipt);

  const isPeer = await oft.isPeer(eid, peerInBytes32);
  console.log("isPeer:", isPeer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
