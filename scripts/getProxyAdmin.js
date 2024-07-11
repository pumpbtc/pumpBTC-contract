const { ethers, upgrades } = require("hardhat");

async function main() {
  const address = "0x3dc45239E19D8635BbDFdc4B6e07399F1089CCD2"

  console.log(await upgrades.erc1967.getAdminAddress(address))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

