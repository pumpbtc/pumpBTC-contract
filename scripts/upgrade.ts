import "dotenv/config"
import { upgradeContract } from "./deploy/utils"

async function main() {
  await upgradeContract(process.env.ADDRESS_PUMPSTAKING!, "PumpStaking")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

