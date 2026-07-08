import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Deploys the underlying Mock USD + its confidential wrapper (cUSD).
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const usd = await deploy("MockUSD", { from: deployer, args: [], log: true });
  const cusd = await deploy("VellumcUSD", { from: deployer, args: [usd.address], log: true });

  console.log("MockUSD (underlying):", usd.address);
  console.log("VellumcUSD (cUSD)   :", cusd.address);
};
export default func;
func.tags = ["cUSD"];
func.id = "deploy_cusd";