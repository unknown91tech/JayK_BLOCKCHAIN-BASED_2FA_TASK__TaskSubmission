// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TOTP
 * @dev Time-based One-Time Password implementation for Ethereum
 * This contract provides the core functionality for generating and validating
 * time-based one-time passwords (TOTP) similar to Google Authenticator.
 */
contract TOTP {
    // Time window for OTP validity in seconds (default 30 seconds)
    uint256 public constant TIME_WINDOW = 30;
    
    /**
     * @dev Generate an OTP based on a seed and current timestamp
     * @param seed The secret seed used to generate the OTP
     * @param timestamp The current timestamp
     * @return A 6-digit OTP
     */
    function generateOTP(bytes32 seed, uint256 timestamp) internal pure returns (uint256) {
        // Calculate the current time window
        uint256 timeWindow = timestamp / TIME_WINDOW;
        
        // Combine seed and time window to create a time-based OTP
        bytes32 combined = keccak256(abi.encodePacked(seed, timeWindow));
        
        // Convert the hash to a 6-digit OTP (modulo 1000000)
        return uint256(combined) % 1000000;
    }
    
    /**
     * @dev Validate an OTP against a seed and timestamp
     * Checks both the current time window and previous time window
     * to account for slight timing differences
     * @param seed The secret seed used to generate the OTP
     * @param providedOTP The OTP provided by the user
     * @param timestamp The current timestamp
     * @return bool True if the OTP is valid, false otherwise
     */
    function validateOTP(bytes32 seed, uint256 providedOTP, uint256 timestamp) internal pure returns (bool) {
        // Current time window
        uint256 currentWindow = timestamp / TIME_WINDOW;
        
        // Get the current window's OTP
        uint256 currentOTP = generateOTP(seed, timestamp);
        
        // Check if the provided OTP matches the current window
        if (providedOTP == currentOTP) {
            return true;
        }
        
        // Check the previous window's OTP (for slight timing differences)
        // But do NOT check future windows for security reasons
        uint256 previousOTP = generateOTP(seed, timestamp - TIME_WINDOW);
        if (providedOTP == previousOTP) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @dev Convert a timestamp to its corresponding time window
     * @param timestamp The timestamp to convert
     * @return The time window number
     */
    function getTimeWindow(uint256 timestamp) internal pure returns (uint256) {
        return timestamp / TIME_WINDOW;
    }
    
    /**
     * @dev Calculate how many seconds remain in the current time window
     * @param timestamp The current timestamp
     * @return The number of seconds remaining in the current time window
     */
    function getRemainingWindowTime(uint256 timestamp) internal pure returns (uint256) {
        return TIME_WINDOW - (timestamp % TIME_WINDOW);
    }
}