import "dotenv/config"
import { deployUpgradeableContract, deployContract } from "./utils"

async function main() {
  const btcb = await deployContract("MockBTCB")
  const pumpBTC = await deployContract("PumpToken")
  await deployUpgradeableContract(
    "PumpStakingTest", [await pumpBTC.getAddress(), await btcb.getAddress()]
  )

  // After run deploy script, need manual setup:
  //   1 - Set PumpStakingTest as minter of PumpToken
  //   2 - PumpStakingTest setStakeAssetCap
  //   3 - PumpStakingTest setOperator
}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

