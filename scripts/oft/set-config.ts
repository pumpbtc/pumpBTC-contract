import setConfig from "./set-config-function";
import PATHWAY_CONFIG from "./set-config-data";

async function main() {
  const PATHWAY = "ETHEREUM->ARBITRUM"
  const OAppContractAddressOnCurrentChain = "0xD57aAA5C8116cf0F83F7DA5FDCDF90fdde58ea35"

//   const PATHWAY = "ARBITRUM->ETHEREUM"
//   const OAppContractAddressOnCurrentChain = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e"

  if (!PATHWAY) {
    throw new Error("Missing PATHWAY");
  } else if (!OAppContractAddressOnCurrentChain) {
    throw new Error("Missing OAppContractAddressOnCurrentChain");
  }

  const [srcChain, destChain] = PATHWAY.split("->");

  const {
    lzEndpointIdOnRemoteChain,
    confirmationsOnCurrentChain,
    lzEndpointOnCurrentChain,
    requiredDVNsOnCurrentChain,
    optionalDVNsOnCurrentChain,
    sendLibAddressOnCurrentChain,
    receiveLibAddressOnCurrentChain,
  } = PATHWAY_CONFIG(srcChain, destChain);

  await setConfig(
    lzEndpointIdOnRemoteChain,
    confirmationsOnCurrentChain,
    lzEndpointOnCurrentChain,
    OAppContractAddressOnCurrentChain,
    requiredDVNsOnCurrentChain,
    optionalDVNsOnCurrentChain,
    sendLibAddressOnCurrentChain,
    receiveLibAddressOnCurrentChain,
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
