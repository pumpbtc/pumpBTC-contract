import { ethers } from "hardhat";
import { EndpointId } from '@layerzerolabs/lz-definitions'

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Using deployer account:", deployer.address);

  const oftAdapterAddress = "0xD57aAA5C8116cf0F83F7DA5FDCDF90fdde58ea35"; // OFT Adapter contract address
  const eid = EndpointId.ZKLINK_V2_MAINNET;
  const peerAddress = "0x8E26CCC5d3DD2ccc348c53b732312a3AC7e0A1EF";

  const PumpTokenOFTAdapter = await ethers.getContractFactory("PumpTokenOFTAdapter");
  const oftAdapter = PumpTokenOFTAdapter.attach(oftAdapterAddress);

  const peerInBytes32 = ethers.zeroPadValue(peerAddress, 32);

  const txResponse = await oftAdapter.setPeer(eid, peerInBytes32);
  const receipt = await txResponse.wait();

  console.log("setPeer transaction receipt:", receipt);

  const isPeer = await oftAdapter.isPeer(eid, peerInBytes32);
  console.log("isPeer:", isPeer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
