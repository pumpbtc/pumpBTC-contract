import "dotenv/config"
import { deployContract, deployUpgradeableContract } from "./utils"

async function main() {
  // const wbtc = await deployContract("MockWBTC")
  const pumpBTC = await deployContract("PumpToken")
  await deployUpgradeableContract(
    "PumpStaking", [await pumpBTC.getAddress(), process.env.ADDRESS_WBTC!]
  )

  // After run deploy script, need manual setup:
  //   1 - Set PumpStaking as minter of PumpToken
  //   2 - PumpStaking setStakeAssetCap
  //   3 - PumpStaking setOperator
}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

