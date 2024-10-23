import { Options } from "@layerzerolabs/lz-v2-utilities";
import { waitForMessageReceived } from "@layerzerolabs/scan-client";
import { zeroPad } from "@ethersproject/bytes";
import { ethers } from "hardhat";

const OFT_CONTRACT_NAME = "PumpTokenOFT";

// Via the OFTAdapter contract, send erc20 tokens on the source chain (e.g. Sepolia) to the destination chain (e.g. BNB testnet)
async function sendOFT(
  oftSrcContractAddress: string,
  oftDestContractAddress: string,
  lzEndpointIdOnSrcChain: string,
  lzEndpointIdOnDestChain: string,
  gasDropInWeiOnDestChain: string,
  executorLzReceiveOptionMaxGas: string,
  sendingAccountPrivKey: string,
  receivingAccountAddress: string,
  amount: string
) {
  const sender = new ethers.Wallet(sendingAccountPrivKey, ethers.provider);

  console.log(
    `sendOFT - oftSrcContractAddress:${oftSrcContractAddress}, oftDestContractAddress:${oftDestContractAddress}, lzEndpointIdOnSrcChain:${lzEndpointIdOnSrcChain}, lzEndpointIdOnDestChain:${lzEndpointIdOnDestChain}, gasDropInWeiOnDestChain:${gasDropInWeiOnDestChain}, executorLzReceiveOptionMaxGas:${executorLzReceiveOptionMaxGas}, receivingAccountAddress:${receivingAccountAddress}, sender: ${sender.address}, amount:${amount}`,
  );

  // It is the OFTAdapter contract whose send() func is to be called to transfer tokens cross-chain
  const OFTContract = await ethers.getContractAt(
    OFT_CONTRACT_NAME,
    oftSrcContractAddress,
    sender,
  );


  const amountInWei = ethers.parseUnits(amount, 8);
  const receiverAddressInBytes32 = zeroPad(receivingAccountAddress, 32);


  // Set the required options for cross-chain send
  const options = Options.newOptions()
    // addExecutorNativeDropOption is optional
    .addExecutorNativeDropOption(BigInt(gasDropInWeiOnDestChain), receivingAccountAddress as any)
    // Without addExecutorLzReceiveOption, will get execution reverted. Why???
    .addExecutorLzReceiveOption(BigInt(executorLzReceiveOptionMaxGas), 0)
    .toHex()
    .toString();

  // Set the send param
  // https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/oapp/contracts/oft/interfaces/IOFT.sol#L10
  const sendParam = [
    lzEndpointIdOnDestChain,
    receiverAddressInBytes32,
    amountInWei,
    amountInWei,
    options, // additional options
    "0x", // composed message for the send() operation
    "0x", // OFT command to be executed, unused in default OFT implementations
  ];

  // Step 2: call the func quoteSend() to estimate cross-chain fee to be paid in native on the source chain
  // https://github.com/LayerZero-Labs/LayerZero-v2/blob/main/oapp/contracts/oft/interfaces/IOFT.sol#L127C60-L127C73
  // false is set for _payInLzToken Flag indicating whether the caller is paying in the LZ token
  const [nativeFee] = await OFTContract.quoteSend(sendParam as any, false);
  console.log("sendOFT - estimated nativeFee:", ethers.formatEther(nativeFee));

  // Step 3: call the func send() to transfer tokens on source chain to destination chain
  const sendTx = await OFTContract.send(
    sendParam as any,
    [nativeFee, 0] as any, // set 0 for lzTokenFee
    sender.address, // refund address
    {
      value: nativeFee,
    },
  );
  const sendTxReceipt = await sendTx.wait();
  console.log("sendOFT - send tx on source chain:", sendTxReceipt?.hash);

  // Wait for cross-chain tx finalization by LayerZero
  console.log("Wait for cross-chain tx finalization by LayerZero ...");
  const deliveredMsg = await waitForMessageReceived(
    Number(lzEndpointIdOnDestChain),
    sendTxReceipt?.hash as string,
  );
  console.log("sendOFT - received tx on destination chain:", deliveredMsg?.dstTxHash);
}

async function main() {
  // //  Zircuit - Base
  // const oftSrcContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const oftDestContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const lzEndpointIdOnSrcChain = "30303";
  // const lzEndpointIdOnDestChain = "30184";
  // const executorLzReceiveOptionMaxGas = "200000";

  // //  Base - Bob
  // const oftSrcContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const oftDestContractAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E";
  // const lzEndpointIdOnSrcChain = "30184";
  // const lzEndpointIdOnDestChain = "30279";
  // const executorLzReceiveOptionMaxGas = "200000";


  // //  Bob - Zircuit
  // const oftSrcContractAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E";
  // const oftDestContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const lzEndpointIdOnSrcChain = "30279";
  // const lzEndpointIdOnDestChain = "30303";
  // const executorLzReceiveOptionMaxGas = "200000";  

  // // //  Zircuit - Bob
  // const oftSrcContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const oftDestContractAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E";
  // const lzEndpointIdOnSrcChain = "30303";
  // const lzEndpointIdOnDestChain = "30279";
  // const executorLzReceiveOptionMaxGas = "200000";

  // //  Bob - Base
  // const oftSrcContractAddress = "0x1fCca65fb6Ae3b2758b9b2B394CB227eAE404e1E";
  // const oftDestContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  // const lzEndpointIdOnSrcChain = "30279";
  // const lzEndpointIdOnDestChain = "30184";
  // const executorLzReceiveOptionMaxGas = "200000";


  //  Base - Zircuit
  const oftSrcContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  const oftDestContractAddress = "0xF469fBD2abcd6B9de8E169d128226C0Fc90a012e";
  const lzEndpointIdOnSrcChain = "30184";
  const lzEndpointIdOnDestChain = "30303";
  const executorLzReceiveOptionMaxGas = "200000";    


  const SENDER_ACCOUNT_PRIV_KEY = process.env.PRIVATE_KEY_ADMIN
  const RECEIVER_ACCOUNT_ADDRESS = process.env.ADDRESS_ADMIN
  const AMOUNT = "0.00000001"
  const gasDropInWeiOnDestChain="0"

  // Check input params
  if (!oftSrcContractAddress) {
    throw new Error("Missing oftSrcContractAddress");
  } else if (!oftDestContractAddress) {
    throw new Error("Missing oftDestContractAddress");
  } else if (!lzEndpointIdOnSrcChain) {
    throw new Error("Missing lzEndpointIdOnSrcChain");
  } else if (!lzEndpointIdOnDestChain) {
    throw new Error("Missing lzEndpointIdOnDestChain");
  } else if (!gasDropInWeiOnDestChain) {
    throw new Error("Missing gasDropInWeiOnDestChain");
  } else if (!executorLzReceiveOptionMaxGas) {
    throw new Error("Missing executorLzReceiveOptionMaxGas");
  } else if (!SENDER_ACCOUNT_PRIV_KEY) {
    throw new Error("Missing SENDER_ACCOUNT_PRIV_KEY");
  } else if (!RECEIVER_ACCOUNT_ADDRESS) {
    throw new Error("Missing RECEIVER_ACCOUNT_ADDRESS");
  } else if (!AMOUNT) {
    throw new Error("Missing AMOUNT");
  }

  await sendOFT(
    oftSrcContractAddress,
    oftDestContractAddress,
    lzEndpointIdOnSrcChain,
    lzEndpointIdOnDestChain,
    gasDropInWeiOnDestChain,
    executorLzReceiveOptionMaxGas,
    SENDER_ACCOUNT_PRIV_KEY,
    RECEIVER_ACCOUNT_ADDRESS,
    AMOUNT
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
