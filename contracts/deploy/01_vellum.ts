import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Deploys the bundled confidential token + the multi-campaign distributor.
const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const token = await deploy("VellumToken", { from: deployer, args: [], log: true });
  const dist = await deploy("VellumDistributor", { from: deployer, args: [], log: true });

  console.log("VellumToken:      ", token.address);
  console.log("VellumDistributor:", dist.address);
};
export default func;
func.tags = ["Vellum"];
func.id = "deploy_vellum";
