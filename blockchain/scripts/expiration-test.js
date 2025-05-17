const hre = require("hardhat");
const ethers = hre.ethers;
const { expect } = require("chai");

// Using the most recent contract address from error logs
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Helper function to wait for a specified number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Improved bytes32 formatting function for consistency
function formatBytes32(str) {
  // Ensure string is not too long for bytes32
  const truncatedStr = str.length > 31 ? str.substring(0, 31) : str;
  // Use ethers library for consistent formatting
  return ethers.utils.formatBytes32String(truncatedStr);
}

// Debug function to inspect user data
async function debugUserByPublicKey(twoFactorAuth, publicKey) {
  console.log(`\n=== DEBUG: User lookup by public key ===`);
  try {
    // Try to get username from public key
    const username = await twoFactorAuth.callStatic.getUsernameByPublicKey(publicKey)
      .catch(e => "ERROR: " + e.message);
    
    console.log(`Public Key: ${publicKey}`);
    console.log(`Username found: ${username}`);
    
    if (!username.startsWith("ERROR")) {
      const userExists = await twoFactorAuth.isUsernameTaken(username);
      console.log(`User exists check: ${userExists}`);
      
      const retrievedPublicKey = await twoFactorAuth.getUserPublicKey(username);
      console.log(`Retrieved public key: ${retrievedPublicKey}`);
      console.log(`Keys match: ${retrievedPublicKey === publicKey}`);
    }
  } catch (error) {
    console.log(`Debug error: ${error.message}`);
  }
  console.log(`=== END DEBUG ===\n`);
}

async function debugUserByUsername(twoFactorAuth, username) {
  console.log(`\n=== DEBUG: User lookup by username ===`);
  try {
    const exists = await twoFactorAuth.isUsernameTaken(username);
    console.log(`Username: ${username}`);
    console.log(`User exists: ${exists}`);
    
    if (exists) {
      const publicKey = await twoFactorAuth.getUserPublicKey(username);
      console.log(`Public key: ${publicKey}`);
      
      try {
        const otp = await twoFactorAuth.getOTP(username);
        console.log(`Current OTP: ${otp.toString()}`);
      } catch (error) {
        console.log(`Error getting OTP: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`Debug error: ${error.message}`);
  }
  console.log(`=== END DEBUG ===\n`);
}

async function runTest(testName, testFn) {
  console.log(`\n========== RUNNING TEST: ${testName} ==========`);
  try {
    await testFn();
    console.log(`✅ TEST PASSED: ${testName}`);
  } catch (error) {
    console.error(`❌ TEST FAILED: ${testName}`);
    console.error(`Error: ${error.message}`);
  }
}

async function main() {
  // Connect to the deployed contract
  const TwoFactorAuth = await ethers.getContractFactory("TwoFactorAuth");
  const twoFactorAuth = TwoFactorAuth.attach(CONTRACT_ADDRESS);
  
  console.log("Connected to contract at:", CONTRACT_ADDRESS);
  
  // Get signer (account)
  const [signer] = await ethers.getSigners();
  console.log("Using account:", signer.address);
  
  // Test 1: Basic User Registration and Lookup
  await runTest("Basic User Registration", async () => {
    // Create a simple, reproducible username and keys
    const username = "basix1";
    const publicKey = formatBytes32("fixed-pk-basix1");
    const otpSeed = formatBytes32("fixed-seed-basix1");
    
    // Check if user already exists (to avoid errors on re-runs)
    const exists = await twoFactorAuth.isUsernameTaken(username);
    
    if (!exists) {
      console.log(`Registering new user: ${username}`);
      const tx = await twoFactorAuth.registerUser(username, publicKey, otpSeed);
      await tx.wait();
      console.log("Registration transaction completed");
    } else {
      console.log(`User ${username} already exists, skipping registration`);
    }
    
    // Verify the user exists
    const existsNow = await twoFactorAuth.isUsernameTaken(username);
    console.log(`Username "${username}" exists: ${existsNow}`);
    expect(existsNow).to.equal(true);
    
    // Debug lookup by username
    await debugUserByUsername(twoFactorAuth, username);
    
    // Debug lookup by public key
    await debugUserByPublicKey(twoFactorAuth, publicKey);
    
    // Try to get OTP
    try {
      const otp = await twoFactorAuth.getOTP(username);
      console.log(`OTP generated: ${otp.toString()}`);
    } catch (error) {
      console.error(`Failed to get OTP: ${error.message}`);
      throw error; // Re-throw to fail the test
    }
  });
  
  // Test 2: Authentication Test
  await runTest("Authentication Flow", async () => {
    // Use a very simple username with no timestamp
    const username = "basix2";
    const publicKey = formatBytes32("auth-pk-fixed-basix2");
    const otpSeed = formatBytes32("auth-seed-fixed-basix2");
    
    // Check if user already exists
    const exists = await twoFactorAuth.isUsernameTaken(username);
    
    if (!exists) {
      console.log(`Registering authentication test user: ${username}`);
      const tx = await twoFactorAuth.registerUser(username, publicKey, otpSeed);
      await tx.wait();
    } else {
      console.log(`Authentication test user ${username} already exists`);
    }
    
    // Debug the user to confirm registration
    await debugUserByUsername(twoFactorAuth, username);
    
    // Generate OTP
    const otp = await twoFactorAuth.getOTP(username);
    console.log(`Generated OTP: ${otp.toString()}`);
    
    // Debug lookup by public key before authentication
    await debugUserByPublicKey(twoFactorAuth, publicKey);
    
    // Authenticate
    console.log("Attempting authentication with valid OTP...");
    const authTx = await twoFactorAuth.authenticate(publicKey, otp);
    await authTx.wait();
    console.log("Authentication transaction completed");
    
    // Verify authentication was successful by checking if nonce increased
    const nonce = await twoFactorAuth.getUserNonce(username);
    console.log(`User nonce after authentication: ${nonce}`);
    expect(nonce.toNumber()).to.be.greaterThan(0);
  });

  // Test 3: Replay Attack Prevention
  await runTest("Replay Attack Prevention", async () => {
    // Create user for replay attack test
    const username = "basix3";
    const publicKey = formatBytes32("replay-pk-fixed-basix3");
    const otpSeed = formatBytes32("replay-seed-fixed-basix3");
    
    // Check if user already exists
    const exists = await twoFactorAuth.isUsernameTaken(username);
    
    if (!exists) {
      console.log(`Registering replay test user: ${username}`);
      const tx = await twoFactorAuth.registerUser(username, publicKey, otpSeed);
      await tx.wait();
    } else {
      console.log(`Replay test user ${username} already exists`);
    }
    
    // Generate OTP
    const otp = await twoFactorAuth.getOTP(username);
    console.log(`Generated OTP for replay test: ${otp.toString()}`);
    
    // First authentication (should succeed)
    console.log("First authentication attempt...");
    const authTx = await twoFactorAuth.authenticate(publicKey, otp);
    await authTx.wait();
    console.log("First authentication successful");
    
    // Second authentication with the same OTP (should fail - replay attack)
    console.log("Attempting replay attack with the same OTP...");
    try {
      await twoFactorAuth.authenticate(publicKey, otp);
      throw new Error("Replay attack succeeded! This should not happen.");
    } catch (error) {
      // This error is expected
      if (error.message.includes("OTP already used") || error.message.includes("expired")) {
        console.log("Replay attack correctly prevented:", error.message);
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
  });

  // Test 4: Invalid OTP
  await runTest("Invalid OTP", async () => {
    // Create user for invalid OTP test
    const username = "basix4";
    const publicKey = formatBytes32("invalid-pk-fixed-basix4");
    const otpSeed = formatBytes32("invalid-seed-fixed-basix4");
    
    // Check if user already exists
    const exists = await twoFactorAuth.isUsernameTaken(username);
    
    if (!exists) {
      console.log(`Registering invalid OTP test user: ${username}`);
      const tx = await twoFactorAuth.registerUser(username, publicKey, otpSeed);
      await tx.wait();
    } else {
      console.log(`Invalid OTP test user ${username} already exists`);
    }
    
    // Use an invalid OTP
    const invalidOtp = 123456; // Random number that's not the generated OTP
    console.log("Attempting authentication with invalid OTP...");
    
    try {
      await twoFactorAuth.authenticate(publicKey, invalidOtp);
      throw new Error("Invalid OTP was accepted! This should not happen.");
    } catch (error) {
      if (error.message.includes("Invalid OTP")) {
        console.log("Invalid OTP correctly rejected:", error.message);
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
  });

  console.log("\n========== ALL TESTS COMPLETED ==========");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test suite failed:", error);
    process.exit(1);
  });