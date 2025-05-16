import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  ArrowRight, 
  ShieldCheck, 
  UserPlus, 
  Clock, 
  Key, 
  Shield, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Wallet
} from 'lucide-react';

// ABI and contract address would be imported from config in a real app
const CONTRACT_ADDRESS = "0x14c252626fB54E5303D5Ddc5B237E9c6C25fa93e"; // Replace with your deployed contract address
const CONTRACT_ABI = [
  "function registerUser(string memory username, bytes32 publicKey, bytes32 initialSeed) public returns (bool)",
  "function authenticate(bytes32 publicKey, uint256 otp) public returns (bool)",
  "function isUsernameTaken(string memory username) public view returns (bool)",
  "function getUserPublicKey(string memory username) public view returns (bytes32)",
  "function getOTP(string memory username) public view returns (uint256)",
  "function updateOtpSeed(bytes32 publicKey, bytes32 newSeed, uint256 currentOtp) public returns (bool)"
];

export default function BlockchainTwoFactorAuth() {
  // Web3 state
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connect your wallet to start');
  
  // App state
  const [activeTab, setActiveTab] = useState('register');
  const [username, setUsername] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [seed, setSeed] = useState('');
  const [otp, setOtp] = useState('');
  const [newSeed, setNewSeed] = useState('');
  const [remainingTime, setRemainingTime] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState(null);
  const [notification, setNotification] = useState({
    visible: false,
    type: 'success', // success, error, warning
    message: ''
  });
  
  // Show notification function
  const showNotification = (type, message, duration = 5000) => {
    setNotification({
      visible: true,
      type,
      message
    });
    
    // Auto hide notification after duration
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, duration);
  };
  
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create ethers provider
        const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
        const ethSigner = ethProvider.getSigner();
        const userAccount = accounts[0];
        
        // Get network info
        const network = await ethProvider.getNetwork();
        
        // Create contract instance
        const twoFactorAuth = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          ethSigner
        );
        
        setProvider(ethProvider);
        setSigner(ethSigner);
        setContract(twoFactorAuth);
        setAccount(userAccount);
        setNetworkName(network.name);
        setIsConnected(true);
        setStatusMessage(`Connected to ${network.name}`);
        showNotification('success', 'Wallet connected successfully');
      } catch (error) {
        console.error('Error connecting to MetaMask', error);
        setStatusMessage('Error connecting to wallet: ' + error.message);
        showNotification('error', 'Failed to connect wallet: ' + error.message);
      }
    } else {
      setStatusMessage('Please install MetaMask to use this application');
      showNotification('warning', 'MetaMask not detected. Please install MetaMask to use this app.');
    }
  };
  
  const disconnectWallet = () => {
    setIsConnected(false);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount('');
    setNetworkName('');
    setStatusMessage('Wallet disconnected. Connect your wallet to start');
    showNotification('info', 'Wallet disconnected');
  };
  
  useEffect(() => {
    // Check if wallet is already connected
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            connectWallet();
          }
        } catch (error) {
          console.error('Error checking wallet connection', error);
        }
      }
    };
    
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          showNotification('info', 'Account changed: ' + accounts[0].substring(0, 6) + '...' + accounts[0].substring(accounts[0].length - 4));
        } else {
          disconnectWallet();
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);
  
  // OTP countdown timer
  useEffect(() => {
    if (otp) {
      setRemainingTime(30);
      const timer = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            setOtp(''); // Clear OTP when expired
            showNotification('warning', 'OTP expired. Please generate a new one.', 3000);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [otp]);
  
  // Generate a random string for seed or public key
  const generateRandomString = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };
  
  // Format string to bytes32
  const formatBytes32 = (str) => {
    // Ensure string is not too long for bytes32
    const truncatedStr = str.length > 31 ? str.substring(0, 31) : str;
    return ethers.utils.formatBytes32String(truncatedStr);
  };

  // Handle user registration
  const handleRegister = async () => {
    if (!contract || !isConnected) {
      showNotification('warning', 'Please connect your wallet first');
      return;
    }
    
    if (!username) {
      showNotification('warning', 'Username is required');
      return;
    }
    
    try {
      setIsLoading(true);
      setStatusMessage('Registering user...');
      
      // Use provided values or generate random ones
      const userPublicKey = publicKey ? formatBytes32(publicKey) : formatBytes32(generateRandomString());
      const userSeed = seed ? formatBytes32(seed) : formatBytes32(generateRandomString());
      
      // Check if username is taken
      const isTaken = await contract.isUsernameTaken(username);
      if (isTaken) {
        setStatusMessage(`Username "${username}" is already taken`);
        showNotification('error', `Username "${username}" is already taken`);
        setIsLoading(false);
        return;
      }
      
      // Register the user
      const tx = await contract.registerUser(username, userPublicKey, userSeed);
      await tx.wait();
      
      // Save the values used
      setPublicKey(ethers.utils.parseBytes32String(userPublicKey));
      setSeed(ethers.utils.parseBytes32String(userSeed));
      
      setStatusMessage(`User ${username} registered successfully!`);
      showNotification('success', `User ${username} registered successfully!`);
      setActiveTab('authenticate');
    } catch (error) {
      console.error('Registration error', error);
      setStatusMessage('Registration failed: ' + error.message);
      showNotification('error', 'Registration failed: ' + (error.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate OTP
  const handleGenerateOTP = async () => {
    if (!contract || !isConnected) {
      showNotification('warning', 'Please connect your wallet first');
      return;
    }
    
    if (!username) {
      showNotification('warning', 'Username is required');
      return;
    }
    
    try {
      setIsLoading(true);
      setStatusMessage('Generating OTP...');
      setErrorType(null); // Reset any previous errors
      
      // Get OTP from contract
      const generatedOTP = await contract.getOTP(username);
      
      setOtp(generatedOTP.toString());
      setStatusMessage('OTP generated successfully');
      showNotification('success', 'OTP generated successfully');
    } catch (error) {
      console.error('OTP generation error', error);
      setStatusMessage('OTP generation failed: ' + error.message);
      showNotification('error', 'OTP generation failed: ' + (error.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Authenticate with improved error handling
  const handleAuthenticate = async () => {
    if (!contract || !isConnected) {
      showNotification('warning', 'Please connect your wallet first');
      return;
    }
    
    if (!publicKey || !otp) {
      showNotification('warning', 'Both public key and OTP are required');
      return;
    }
    
    try {
      setIsLoading(true);
      setStatusMessage('Authenticating...');
      setErrorType(null); // Reset error type
      
      // Format public key as bytes32 (with truncation)
      const truncatedKey = publicKey.length > 31 ? publicKey.substring(0, 31) : publicKey;
      const userPublicKey = ethers.utils.formatBytes32String(truncatedKey);
      
      // Authenticate
      const tx = await contract.authenticate(userPublicKey, parseInt(otp));
      await tx.wait();
      
      setStatusMessage('Authentication successful!');
      showNotification('success', 'Authentication successful!');
    } catch (error) {
      console.error('Authentication error', error);
      
      // Parse error message to determine error type
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('invalid otp')) {
        setErrorType('invalid');
        setStatusMessage('Authentication failed: Invalid OTP');
        showNotification('error', 'Authentication failed: Invalid OTP');
      } 
      else if (errorMessage.includes('already used') || errorMessage.includes('expired')) {
        setErrorType('expired');
        setStatusMessage('Authentication failed: OTP already used or expired');
        showNotification('error', 'Authentication failed: OTP already used or expired');
      }
      else {
        setStatusMessage('Authentication failed: ' + error.message);
        showNotification('error', 'Authentication failed: ' + (error.data?.message || error.message));
      }
    } finally {
      setIsLoading(false);
    }
  };
    
  // Update OTP seed
  const handleUpdateSeed = async () => {
    if (!contract || !isConnected) {
      showNotification('warning', 'Please connect your wallet first');
      return;
    }
    
    if (!publicKey || !otp || !newSeed) {
      showNotification('warning', 'Public key, OTP, and new seed are required');
      return;
    }
    
    try {
      setIsLoading(true);
      setStatusMessage('Updating OTP seed...');
      
      // Format keys as bytes32
      const userPublicKey = formatBytes32(publicKey);
      const userNewSeed = formatBytes32(newSeed);
      
      // Update seed
      const tx = await contract.updateOtpSeed(userPublicKey, userNewSeed, parseInt(otp));
      await tx.wait();
      
      setSeed(newSeed);
      setNewSeed('');
      setStatusMessage('OTP seed updated successfully!');
      showNotification('success', 'OTP seed updated successfully!');
    } catch (error) {
      console.error('Seed update error', error);
      setStatusMessage('Seed update failed: ' + error.message);
      showNotification('error', 'Seed update failed: ' + (error.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Notification */}
      {notification.visible && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 
                         ${notification.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 
                           notification.type === 'error' ? 'bg-red-100 border-l-4 border-red-500' : 
                           'bg-yellow-100 border-l-4 border-yellow-500'}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : notification.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-800">
                {notification.type === 'success' ? 'Success' : 
                 notification.type === 'error' ? 'Error' : 'Warning'}
              </h3>
              <p className="text-sm text-gray-600">{notification.message}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Blockchain 2FA System</h1>
        
        {/* Wallet Connection Section */}
        <div className="flex flex-col items-center gap-3 mb-4">
          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Wallet size={18} />
              <span>Connect Wallet</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={disconnectWallet}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Wallet size={18} />
                <span>Disconnect Wallet</span>
              </button>
              
              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>Connected to: {networkName}</span>
                </div>
                <div className="mt-1">
                  <span className="font-medium">Account:</span> 
                  <span className="ml-1">
                    {account.substring(0, 6)}...{account.substring(account.length - 4)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="font-medium">Contract:</span> 
                  <span className="ml-1">
                    {CONTRACT_ADDRESS.substring(0, 6)}...{CONTRACT_ADDRESS.substring(CONTRACT_ADDRESS.length - 4)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600">{statusMessage}</div>
      </div>
      
      {/* Rest of your component remains the same */}
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'register' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('register')}
        >
          <div className="flex items-center gap-2">
            <UserPlus size={16} />
            <span>Register</span>
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'authenticate' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('authenticate')}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>Authenticate</span>
          </div>
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'update' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('update')}
        >
          <div className="flex items-center gap-2">
            <RefreshCw size={16} />
            <span>Update Seed</span>
          </div>
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="bg-gray-50 p-6 rounded-lg">
        {/* Register Tab */}
        {activeTab === 'register' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserPlus size={20} />
              <span>Register New User</span>
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter a unique username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Public Key (optional)
                <span className="text-xs text-gray-500 ml-2">Random value will be generated if empty</span>
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter public key or leave empty for random value"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OTP Seed (optional)
                <span className="text-xs text-gray-500 ml-2">Random value will be generated if empty</span>
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter OTP seed or leave empty for random value"
              />
            </div>
            <button
              onClick={handleRegister}
              disabled={isLoading || !isConnected}
              className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Register User</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Authenticate Tab */}
        {activeTab === 'authenticate' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShieldCheck size={20} />
              <span>Authenticate</span>
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your public key"
              />
            </div>
            
            <div className="border rounded-md p-4 bg-white">
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700">One-Time Password (OTP)</label>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <span className={`text-sm ${remainingTime < 10 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    Expires in: {remainingTime}s
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="flex-1 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-center text-xl"
                  placeholder="------"
                  maxLength={6}
                />
                <button
                  onClick={handleGenerateOTP}
                  disabled={isLoading || !isConnected || !username}
                  className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 
                            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                            disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              </div>
            </div>
            
            {/* Error display for OTP validation */}
            {errorType && (
              <div className={`p-3 rounded-md ${
                errorType === 'invalid' ? 'bg-red-100 text-red-800' : 
                errorType === 'expired' ? 'bg-orange-100 text-orange-800' : 
                'bg-red-100 text-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {errorType === 'invalid' && (
                    <>
                      <div className="w-5 h-5 mt-0.5 text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Invalid OTP</p>
                        <p className="text-sm">The OTP you entered is incorrect. Please check and try again.</p>
                      </div>
                    </>
                  )}
                  
                  {errorType === 'expired' && (
                    <>
                      <div className="w-5 h-5 mt-0.5 text-orange-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Expired OTP</p>
                        <p className="text-sm">This OTP has expired or has already been used. Please generate a new OTP.</p>
                      </div>
                    </>
                  )}
                </div>
                
                <button 
                  onClick={handleGenerateOTP}
                  className="mt-2 w-full p-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700"
                >
                  Generate New OTP
                </button>
              </div>
            )}
            
            <button
              onClick={handleAuthenticate}
              disabled={isLoading || !isConnected || !publicKey || !otp}
              className="w-full p-2 bg-green-600 text-white rounded-md hover:bg-green-700 
                        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                        disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Update Seed Tab */}
        {activeTab === 'update' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <RefreshCw size={20} />
              <span>Update OTP Seed</span>
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your username"
                disabled={!isConnected}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your public key"
                disabled={!isConnected}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current OTP</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="flex-1 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter current OTP"
                  disabled={!isConnected}
                />
                <button
                  onClick={handleGenerateOTP}
                  disabled={isLoading || !isConnected || !username}
                  className="p-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 
                            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                            disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New OTP Seed</label>
              <input
                type="text"
                value={newSeed}
                onChange={(e) => setNewSeed(e.target.value)}
                className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new OTP seed"
                disabled={!isConnected}
              />
            </div>
            <button
              onClick={handleUpdateSeed}
              disabled={isLoading || !isConnected || !publicKey || !otp || !newSeed}
              className="w-full p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                        disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  <span>Update Seed</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* User Info Display */}
      {(username || publicKey || seed) && (
        <div className="mt-6 p-4 border rounded-lg bg-blue-50">
          <h3 className="text-lg font-medium mb-3">Current User Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {username && (
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-500 mb-1">Username</div>
                <div className="font-medium">{username}</div>
              </div>
            )}
            {publicKey && (
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-500 mb-1">Public Key</div>
                <div className="font-medium text-sm truncate" title={publicKey}>
                  {publicKey.length > 25 ? publicKey.substring(0, 10) + '...' + publicKey.substring(publicKey.length - 10) : publicKey}
                </div>
              </div>
            )}
            {seed && (
              <div className="bg-white p-3 rounded border">
                <div className="text-xs text-gray-500 mb-1">OTP Seed</div>
                <div className="font-medium text-sm truncate" title={seed}>
                  {seed.length > 25 ? seed.substring(0, 10) + '...' + seed.substring(seed.length - 10) : seed}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Instructions Section */}
      <div className="mt-6 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium mb-3">How It Works</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">1</div>
            <div>
              <h4 className="font-medium">Registration</h4>
              <p className="text-sm text-gray-600">Create a unique username with a public key and OTP seed. The seed is used to generate time-based one-time passwords.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">2</div>
            <div>
              <h4 className="font-medium">Authentication</h4>
              <p className="text-sm text-gray-600">Generate a 6-digit OTP that's valid for 30 seconds. Submit it with your public key to authenticate.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">3</div>
            <div>
              <h4 className="font-medium">Seed Management</h4>
              <p className="text-sm text-gray-600">Update your OTP seed for enhanced security. Requires authentication with your current OTP.</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Security Notes</h4>
              <ul className="text-sm text-yellow-700 list-disc pl-4 mt-1 space-y-1">
                <li>OTPs expire after 30 seconds for security</li>
                <li>Each OTP can only be used once (replay protection)</li>
                <li>Store your public key and seed securely</li>
                <li>This is a demo application; for production use, implement additional security measures</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}