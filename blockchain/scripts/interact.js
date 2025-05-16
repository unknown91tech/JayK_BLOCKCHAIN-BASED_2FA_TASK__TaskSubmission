const hre = require("hardhat");
const ethers = hre.ethers;

// Contract address from deployment
const CONTRACT_ADDRESS = "0x14c252626fB54E5303D5Ddc5B237E9c6C25fa93e";

// Helper function to wait for a specified number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Connect to the deployed contract
  const TwoFactorAuth = await ethers.getContractFactory("TwoFactorAuth");
  const twoFactorAuth = TwoFactorAuth.attach(CONTRACT_ADDRESS);
  
  console.log("Connected to contract at:", CONTRACT_ADDRESS);
  
  // Get signer (account)
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);
  
  try {
    // First test - register user and test authentication
    const timestamp = Date.now();
    const username = "user" + timestamp.toString();// Shorter username
    const publicKey = ethers.utils.formatBytes32String("pk-" + timestamp);
    const otpSeed = ethers.utils.formatBytes32String("seed-" + timestamp);
    
    console.log(`\nRegistering user: ${username}`);
    const registerTx = await twoFactorAuth.registerUser(username, publicKey, otpSeed);
    await registerTx.wait();
    console.log("User registered successfully!");
    
    const exists = await twoFactorAuth.isUsernameTaken(username);
    console.log(`Username "${username}" exists: ${exists}`);
    
    const otp = await twoFactorAuth.getOTP(username);
    console.log(`Generated OTP for ${username}: ${otp.toString()}`);
    
    console.log("\nAttempting authentication with valid OTP...");
    const authTx = await twoFactorAuth.authenticate(publicKey, otp);
    await authTx.wait();
    console.log("Authentication successful!");
    
    console.log("\nAttempting replay attack with same OTP...");
    try {
      await twoFactorAuth.authenticate(publicKey, otp);
      console.log("Warning: Replay attack succeeded! This should not happen.");
    } catch (error) {
      console.log("Replay attack correctly prevented:", error.message.split('\n')[0]);
    }
    
    console.log("\nAttempting authentication with invalid OTP...");
    try {
      const invalidOtp = 123456;
      await twoFactorAuth.authenticate(publicKey, invalidOtp);
      console.log("Warning: Invalid OTP was accepted! This should not happen.");
    } catch (error) {
      console.log("Invalid OTP correctly rejected:", error.message.split('\n')[0]);
    }
    
    // Second test - test OTP expiration
    console.log("\n==== EXPIRATION TEST ====");
    
    // Use a very short username for the expiration test
    const expTimestamp = Date.now();
    const expUsername = "exp" + expTimestamp.toString().substring(8, 13);
    const expPublicKey = ethers.utils.formatBytes32String("exp-" + expTimestamp);
    const expOtpSeed = ethers.utils.formatBytes32String("exp-seed-" + expTimestamp);
    
    console.log(`Registering user for expiration test: ${expUsername}`);
    const expRegTx = await twoFactorAuth.registerUser(expUsername, expPublicKey, expOtpSeed);
    await expRegTx.wait();
    console.log("Expiration test user registered successfully!");
    
    // Verify the user exists
    const expExists = await twoFactorAuth.isUsernameTaken(expUsername);
    console.log(`Expiration test user "${expUsername}" exists: ${expExists}`);
    
    // Get OTP
    const expOtp = await twoFactorAuth.getOTP(expUsername);
    console.log(`Generated OTP for expiration test: ${expOtp.toString()}`);
    
    // Wait for 45 seconds
    console.log("\nWaiting for 45 seconds to let OTP expire...");
    await sleep(45000);
    console.log("45 seconds elapsed");
    
    // Try to authenticate with the expired OTP
    console.log("Attempting authentication with expired OTP...");
    try {
      await twoFactorAuth.authenticate(expPublicKey, expOtp);
      console.log("WARNING: Expired OTP was accepted! This should not happen.");
    } catch (error) {
      console.log("Expired OTP correctly rejected:", error.message.split('\n')[0]);
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });