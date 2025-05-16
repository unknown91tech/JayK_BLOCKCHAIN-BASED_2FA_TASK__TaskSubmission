// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TOTP.sol";

/**
 * @title TwoFactorAuth
 * @dev A blockchain-based two-factor authentication system
 * that implements time-based one-time passwords (TOTP).
 */
contract TwoFactorAuth is TOTP {
    // Structure to store user information
    struct User {
        string username;
        bytes32 publicKey;
        bytes32 otpSeed;
        uint256 lastUsedTimestamp; // To prevent replay attacks
        uint256 nonce; // Additional protection against replay attacks
        bool exists;
    }
    
    // Mapping from username to User struct
    mapping(string => User) private users;
    
    // Mapping from public key to username for quick lookup
    mapping(bytes32 => string) private publicKeyToUsername;
    
    // Events
    event UserRegistered(string username, bytes32 publicKey);
    event AuthenticationSuccessful(string username, uint256 timestamp);
    event AuthenticationFailed(string username, uint256 timestamp, string reason);
    event OtpSeedUpdated(string username);
    
    /**
     * @dev Register a new user with a unique username and public key
     * @param username The unique username for the user
     * @param publicKey The public key for the user
     * @param initialSeed The initial seed for OTP generation
     * @return bool True if registration was successful
     */
    function registerUser(
        string memory username,
        bytes32 publicKey,
        bytes32 initialSeed
    ) public returns (bool) {
        // Ensure username is not empty
        require(bytes(username).length > 0, "Username cannot be empty");
        
        // Ensure username is unique
        require(!users[username].exists, "Username already exists");
        
        // Ensure public key is unique
        require(bytes(publicKeyToUsername[publicKey]).length == 0, "Public key already registered");
        
        // Create and store the user
        users[username] = User({
            username: username,
            publicKey: publicKey,
            otpSeed: initialSeed,
            lastUsedTimestamp: 0,
            nonce: 0,
            exists: true
        });
        
        // Map public key to username for quick lookup
        publicKeyToUsername[publicKey] = username;
        
        emit UserRegistered(username, publicKey);
        return true;
    }
    
    /**
     * @dev Authenticate a user with their public key and OTP
     * @param publicKey The user's public key
     * @param otp The one-time password
     * @return bool True if authentication was successful
     */
    function authenticate(
        bytes32 publicKey,
        uint256 otp
    ) public returns (bool) {
        // Get current timestamp
        uint256 currentTimestamp = block.timestamp;
        
        // Lookup username by public key
        string memory username = publicKeyToUsername[publicKey];
        
        // Ensure user exists
        require(bytes(username).length > 0, "User not found");
        
        // Get user information
        User storage user = users[username];
        
        // Validate OTP - this checks the current and previous time window
        bool isValid = validateOTP(user.otpSeed, otp, currentTimestamp);
        
        if (!isValid) {
            emit AuthenticationFailed(username, currentTimestamp, "Invalid OTP");
            revert("Invalid OTP");
        }
        
        // Check for replay attacks - ensure the timestamp window is newer than the last used
        uint256 currentWindow = currentTimestamp / TIME_WINDOW;
        uint256 lastUsedWindow = user.lastUsedTimestamp / TIME_WINDOW;
        
        if (currentWindow <= lastUsedWindow) {
            emit AuthenticationFailed(username, currentTimestamp, "OTP already used or expired");
            revert("OTP already used or expired");
        }
        
        // Update the last used timestamp
        user.lastUsedTimestamp = currentTimestamp;
        
        // Increment nonce for additional replay protection
        user.nonce++;
        
        emit AuthenticationSuccessful(username, currentTimestamp);
        return true;
    }
    
    /**
     * @dev Update a user's OTP seed (requires authentication)
     * @param publicKey The user's public key
     * @param newSeed The new seed for OTP generation
     * @param currentOtp The current OTP for authentication
     * @return bool True if the seed was updated successfully
     */
    function updateOtpSeed(
        bytes32 publicKey,
        bytes32 newSeed,
        uint256 currentOtp
    ) public returns (bool) {
        // First authenticate with current seed/OTP
        require(authenticate(publicKey, currentOtp), "Authentication failed");
        
        // Get username from public key
        string memory username = publicKeyToUsername[publicKey];
        
        // Update seed
        users[username].otpSeed = newSeed;
        
        emit OtpSeedUpdated(username);
        return true;
    }
    
    /**
     * @dev Check if a username is already taken
     * @param username The username to check
     * @return bool True if the username is already taken
     */
    function isUsernameTaken(string memory username) public view returns (bool) {
        return users[username].exists;
    }
    
    /**
     * @dev Get user's public key
     * @param username The username of the user
     * @return bytes32 The user's public key
     */
    function getUserPublicKey(string memory username) public view returns (bytes32) {
        require(users[username].exists, "User not found");
        return users[username].publicKey;
    }
    
    /**
     * @dev Generate OTP for a given user
     * Note: In a real-world scenario, this function would NOT be part of the contract
     * but is included here for testing purposes
     * @param username The username of the user
     * @return uint256 The generated OTP
     */
    function getOTP(string memory username) public view returns (uint256) {
        require(users[username].exists, "User not found");
        return generateOTP(users[username].otpSeed, block.timestamp);
    }
    
    /**
     * @dev Get current timestamp (helper function for testing)
     * @return uint256 The current block timestamp
     */
    function getCurrentTimestamp() public view returns (uint256) {
        return block.timestamp;
    }
    
    /**
     * @dev Get user's nonce (for verification and testing)
     * @param username The username of the user
     * @return uint256 The user's nonce
     */
    function getUserNonce(string memory username) public view returns (uint256) {
        require(users[username].exists, "User not found");
        return users[username].nonce;
    }
    
    /**
     * @dev Check if a public key is already registered
     * @param publicKey The public key to check
     * @return bool True if the public key is already registered
     */
    function isPublicKeyRegistered(bytes32 publicKey) public view returns (bool) {
        return bytes(publicKeyToUsername[publicKey]).length > 0;
    }
    
    /**
     * @dev Get the username associated with a public key
     * @param publicKey The public key to look up
     * @return string The associated username
     */
    function getUsernameByPublicKey(bytes32 publicKey) public view returns (string memory) {
        string memory username = publicKeyToUsername[publicKey];
        require(bytes(username).length > 0, "Public key not registered");
        return username;
    }
}