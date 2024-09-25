import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract, parseEther } from "ethers";

const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // You'll need to set these values appropriately for your network
  const vrfCoordinatorV2 = "0x343300b5d84d444b2adc9116fef1bed02be49cf2"; // Example for Sepolia
  const gasLane = "0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899"; // Example for Sepolia
  const subscriptionId = "5478683274065929883482628998599168422859348416206994309691431616408174057992"; // You need to create this
  const callbackGasLimit = 100000; // Example value, adjust as needed
  const minBetAmount = parseEther("0.01"); // Example: 0.01 ETH
  const maxPayoutPercentage = 5000; // Example: 50% (remember, it's based on PERCENTAGE_BASE = 10000)

  await deploy("YourContract", {
    from: deployer,
    args: [vrfCoordinatorV2, gasLane, subscriptionId, callbackGasLimit, minBetAmount, maxPayoutPercentage],
    log: true,
    autoMine: true,
  });

  const yourContract = await hre.ethers.getContract<Contract>("YourContract", deployer);

  // Log initial state
  console.log("📊 Initial min bet amount:", await yourContract.minBetAmount());
  console.log("💰 Initial treasury balance:", await yourContract.treasuryBalance());
};

export default deployYourContract;

deployYourContract.tags = ["YourContract"];
