const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment process...");
  
  // Get the network
  const network = await ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name} (chainId: ${network.chainId})`);
  
  // Get the ContractFactory and Signer
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  try {
    // First deploy the TOTP contract
    console.log("\nDeploying TOTP...");
    const TOTP = await ethers.getContractFactory("TOTP");
    const totp = await TOTP.deploy();
    await totp.deployed();
    console.log("TOTP deployed to:", totp.address);
    
    // Then deploy the TwoFactorAuth contract
    console.log("\nDeploying TwoFactorAuth...");
    const TwoFactorAuth = await ethers.getContractFactory("TwoFactorAuth");
    const twoFactorAuth = await TwoFactorAuth.deploy();
    await twoFactorAuth.deployed();
    console.log("TwoFactorAuth deployed to:", twoFactorAuth.address);
    
    // Wait for a few block confirmations
    console.log("\nWaiting for block confirmations...");
    await twoFactorAuth.deployTransaction.wait(5);
    console.log("Confirmations received!");
    
    // Save deployment info to a file
    const deploymentInfo = {
      network: {
        name: network.name,
        chainId: network.chainId
      },
      totp: {
        address: totp.address,
        txHash: totp.deployTransaction.hash
      },
      twoFactorAuth: {
        address: twoFactorAuth.address,
        txHash: twoFactorAuth.deployTransaction.hash
      },
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    };
    
    const deploymentDir = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir);
    }
    
    const filePath = path.join(deploymentDir, `${network.name}-deployment.json`);
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info saved to: ${filePath}`);
    
    // Verify contracts on Etherscan (if not on a local network)
    if (network.name !== 'hardhat' && network.name !== 'localhost') {
      try {
        console.log('\nVerifying TOTP contract on Etherscan...');
        await hre.run('verify:verify', {
          address: totp.address,
          constructorArguments: []
        });
        console.log('TOTP contract verified successfully!');
        
        console.log('\nVerifying TwoFactorAuth contract on Etherscan...');
        await hre.run('verify:verify', {
          address: twoFactorAuth.address,
          constructorArguments: []
        });
        console.log('TwoFactorAuth contract verified successfully!');
      } catch (error) {
        console.error('Error during contract verification:', error);
      }
    }
    
    console.log('\n=== Deployment Summary ===');
    console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
    console.log(`TOTP Address: ${totp.address}`);
    console.log(`TwoFactorAuth Address: ${twoFactorAuth.address}`);
    console.log(`Deployer: ${deployer.address}`);
    console.log('=========================');
    
    // Instructions for next steps
    console.log('\nNext steps:');
    console.log('1. Update the CONTRACT_ADDRESS in your frontend code and test scripts');
    console.log('2. Test the contracts using: npx hardhat run scripts/comprehensive-test.js --network <network-name>');
    console.log('3. Launch the frontend interface to interact with the contract');
    
  } catch (error) {
    console.error('\nDeployment failed:', error);
    process.exit(1);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });