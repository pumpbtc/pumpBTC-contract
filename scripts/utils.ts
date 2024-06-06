import { ethers, upgrades } from "hardhat"

export async function deployContract(contractName: string, args: any[] = []) {
  const contractFactory = await ethers.getContractFactory(contractName)
  const contract = await contractFactory.deploy(...args)
  console.log(`\x1b[0m${contractName} deployed to: \x1b[32m${await contract.getAddress()}`)
  return contract
}

export async function deployUpgradeableContract(contractName: string, args: any[] = []) {
  const contractFactory = await ethers.getContractFactory(contractName)
  const contract = await upgrades.deployProxy(contractFactory, args)
  console.log(`\x1b[0m${contractName}(upgradeable) deployed to: \x1b[32m${await contract.getAddress()}`)
  return contract
}

export async function upgradeContract(proxyContractAddress: string, newContractName: string) {
  const newContractFactory = await ethers.getContractFactory(newContractName)
  const newContract = await upgrades.upgradeProxy(proxyContractAddress, newContractFactory)
  console.log(`\x1b[0m${newContractName}(upgradeable) upgraded to: \x1b[32m${await newContract.getAddress()}`)
  return newContract
}
