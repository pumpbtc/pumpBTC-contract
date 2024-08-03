import { deployContract } from "./utils-zksync";

export default async function main() {
  const contractArtifactName = "PumpToken";
  const constructorArguments = [];
  await deployContract(contractArtifactName, constructorArguments);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




