import "dotenv/config"
import { deployContract, deployUpgradeableContract } from "./utils"

async function main() {
  const pumpBTC = await deployContract("PumpToken")
  const wbtc = await deployContract("MockWBTC")
  await deployUpgradeableContract(
    "PumpStaking", [await pumpBTC.getAddress(), await wbtc.getAddress()]
  )

  // After run deploy script, need manual setup:
  //   1 - transfer PumpToken ownership to PumpStaking
  //   2 - PumpStaking setStakeAssetCap
  //   3 - PumpStaking setOperator
}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

