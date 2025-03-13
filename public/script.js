// Contract ABI - abbreviated version for core functions
const contractABI = [
    "function createDare(string description) external payable",
    "function contributeToMegaDare() external payable",
    "function megaDareDescription() external view returns (string)",
    "function megaDareAmount() external view returns (uint256)",
    "function megaDareThreshold() external view returns (uint256)",
    "function endTime() external view returns (uint256)",
    "function dareCount() external view returns (uint256)",
    "function hasParticipated(address) external view returns (bool)",
    "function contributedToMegaDare(address) external view returns (bool)",
    "function getDareById(uint256 dareId) external view returns (string, uint256, address)",
    "function userDareId(address) external view returns (uint256)",
    "event DareCreated(address indexed creator, uint256 indexed dareId, string description, uint256 amount)",
    "event MegaDareContribution(address indexed contributor, uint256 amount, uint256 totalAmount)"
  ];
      
  // You would replace this with your actual contract address
  const contractAddress = "YOUR_CONTRACT_ADDRESS";
      
  // App State
  let provider = null;
  let signer = null;
  let contract = null;
  let currentAccount = null;
  let endTimeTimestamp = 0;
  let countdownInterval = null;
  let dares = [];
  
  // Initialize the application when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('connectWalletStatus').addEventListener('click', connectWallet);
    document.getElementById('createDareButton').addEventListener('click', handleCreateDare);
    document.getElementById('contributeMegaDareButton').addEventListener('click', handleContributeToMegaDare);
    
    //startTestMode();
    
    //CHECK IF BROWSER HAS ETH PROVIDER
    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Set up contract interface
      contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // Check if user is already connected
      checkIfConnected();
      
      // Initialize UI elements that don't require wallet connection
      initializeDareInfo();
    } else {
      showStatus("Please install MetaMask to use this dApp", "error");
    }
  });
  
  // ############################################################
  // ############################################################

  //          Wallet Connection and User Status Functions

  // ############################################################
  // ############################################################


  async function connectWallet() {
    try {
      // Request account access
      const accounts = await provider.send("eth_requestAccounts", []);
      handleAccountsChanged(accounts);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      showStatus("Failed to connect wallet", "error");
    }
  }
  
  async function checkIfConnected() {
    try {
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        handleAccountsChanged(accounts);
      }
    } catch (error) {
      console.error("Error checking wallet connection:", error);
    }
  }
  
  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      currentAccount = null;
      updateUIOnDisconnect();
    } else if (accounts[0] !== currentAccount) {
      currentAccount = accounts[0];
      
      // Get signer for transactions
      signer = provider.getSigner();
      contract = contract.connect(signer);
      
      // Update UI elements
      updateUIOnConnect();
      
      // Display abbreviated account address
      const abbreviatedAccount = `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}`;
      document.getElementById('connectWallet').textContent = abbreviatedAccount;
      
      // Load user participation status
      loadUserStatus();
    }
  }
  
  async function loadUserStatus() {
    try {
      const hasParticipated = await contract.hasParticipated(currentAccount);
      const contributedToMegaDare = await contract.contributedToMegaDare(currentAccount);
      
      document.getElementById('notParticipated').style.display = hasParticipated ? 'none' : 'block';
      document.getElementById('hasParticipated').style.display = hasParticipated ? 'block' : 'none';
      
      if (hasParticipated) {
        if (contributedToMegaDare) {
          document.getElementById('yourMegaDare').style.display = 'block';
          document.getElementById('yourDare').style.display = 'none';
        } else {
          document.getElementById('yourMegaDare').style.display = 'none';
          document.getElementById('yourDare').style.display = 'block';
          
          // Get user's dare details
          const dareId = await contract.userDareId(currentAccount);
          const [description, amount, creator] = await contract.getDareById(dareId);
          
          document.getElementById('yourDareDescription').textContent = description;
          document.getElementById('yourDareAmount').textContent = `${ethers.utils.formatEther(amount)} ETH`;
        }
        
        // Disable both forms
        document.getElementById('createDareButton').disabled = true;
        document.getElementById('contributeMegaDareButton').disabled = true;
        document.getElementById('dareDescription').disabled = true;
        document.getElementById('dareEthAmount').disabled = true;
        document.getElementById('megaDareEthAmount').disabled = true;
      } else {
        // Enable both forms
        document.getElementById('createDareButton').disabled = false;
        document.getElementById('contributeMegaDareButton').disabled = false;
        document.getElementById('dareDescription').disabled = false;
        document.getElementById('dareEthAmount').disabled = false;
        document.getElementById('megaDareEthAmount').disabled = false;
      }
    } catch (error) {
      console.error("Error loading user status:", error);
      showStatus("Error loading your participation status", "error");
    }
  }
  
  async function initializeDareInfo() {
    try {
      // Get Mega Dare info
      const megaDareDescription = await contract.megaDareDescription();
      const megaDareAmount = await contract.megaDareAmount();
      const megaDareThreshold = await contract.megaDareThreshold();
      const endTime = await contract.endTime();
      const dareCount = await contract.dareCount();
      
      // Update UI with Mega Dare info
      document.getElementById('megaDareDescription').textContent = megaDareDescription;
      document.getElementById('megaDareAmount').textContent = ethers.utils.formatEther(megaDareAmount);
      document.getElementById('megaDareThreshold').textContent = ethers.utils.formatEther(megaDareThreshold);
      
      // Calculate progress percentage
      const progressPercentage = megaDareAmount.mul(100).div(megaDareThreshold).toNumber();
      document.getElementById('megaDareProgressBar').style.width = `${progressPercentage}%`;
      
      // Initialize countdown
      endTimeTimestamp = endTime.toNumber();
      startCountdown();
      
      // Load dares
      await loadDares(dareCount);
    } catch (error) {
      console.error("Error initializing dare info:", error);
      showStatus("Error loading challenge information", "error");
    }
  }
  
  async function loadDares(dareCount) {
    const daresContainer = document.getElementById('daresContainer');
    const nodaresMessage = document.getElementById('nodaresMessage');
    
    // Clear previous dares
    daresContainer.innerHTML = '';
    dares = [];
    
    if (dareCount.toNumber() === 0) {
      nodaresMessage.classList.remove('hidden');
      return;
    }
    
    nodaresMessage.classList.add('hidden');
    
    // Load all dares
    for (let i = 0; i < dareCount.toNumber(); i++) {
      try {
        const [description, amount, creator] = await contract.getDareById(i);
        dares.push({
          id: i,
          description,
          amount,
          creator,
          formattedAmount: ethers.utils.formatEther(amount)
        });
      } catch (error) {
        console.error(`Error loading dare ${i}:`, error);
      }
    }
    
    // Sort dares by amount (highest first)
    dares.sort((a, b) => (b.amount.gt(a.amount) ? 1 : -1));
    
    // Render dares
    dares.forEach((dare, index) => {
      const dareCard = document.createElement('div');
      dareCard.className = 'dare-card bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700';
      
      // Add highlight for top dare
      if (index === 0) {
        dareCard.className += ' border-2 border-yellow-500';
      }
      
      dareCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <span class="bg-gray-700 text-xs font-medium px-2.5 py-0.5 rounded">Dare #${dare.id}</span>
          ${index === 0 ? '<span class="bg-yellow-500 text-black text-xs font-medium px-2.5 py-0.5 rounded">Leading</span>' : ''}
        </div>
        <p class="text-lg mb-4">${dare.description}</p>
        <div class="flex justify-between text-sm">
          <span class="text-gray-400">Creator</span>
          <span>${dare.creator.slice(0, 6)}...${dare.creator.slice(-4)}</span>
        </div>
        <div class="flex justify-between mt-2">
          <span class="text-gray-400">Amount</span>
          <span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500">${dare.formattedAmount} ETH</span>
        </div>
      `;
      
      daresContainer.appendChild(dareCard);
    });
  }
  
  async function handleCreateDare() {
    const description = document.getElementById('dareDescription').value.trim();
    const ethAmount = document.getElementById('dareEthAmount').value;
    
    if (!description) {
      showStatus("Please enter a dare description", "error");
      return;
    }
    
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      showStatus("Please enter a valid ETH amount", "error");
      return;
    }
    
    try {
      // Disable button to prevent multiple clicks
      document.getElementById('createDareButton').disabled = true;
      showStatus("Creating dare, please confirm the transaction...", "info");
      
      // Create the dare transaction
      const tx = await contract.createDare(description, {
        value: ethers.utils.parseEther(ethAmount)
      });
      
      showStatus("Transaction submitted, waiting for confirmation...", "info");
      
      // Wait for transaction to be mined
      await tx.wait();
      
      showStatus("Dare created successfully!", "success");
      
      // Refresh data
      await initializeDareInfo();
      await loadUserStatus();
    } catch (error) {
      console.error("Error creating dare:", error);
      showStatus("Error creating dare", "error");
      
      // Re-enable button
      document.getElementById('createDareButton').disabled = false;
    }
  }
  
  async function handleContributeToMegaDare() {
    const ethAmount = document.getElementById('megaDareEthAmount').value;
    
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      showStatus("Please enter a valid ETH amount", "error");
      return;
    }
    
    try {
      // Disable button to prevent multiple clicks
      document.getElementById('contributeMegaDareButton').disabled = true;
      showStatus("Contributing to Mega Dare, please confirm the transaction...", "info");
      
      // Contribute to Mega Dare transaction
      const tx = await contract.contributeToMegaDare({
        value: ethers.utils.parseEther(ethAmount)
      });
      
      showStatus("Transaction submitted, waiting for confirmation...", "info");
      
      // Wait for transaction to be mined
      await tx.wait();
      
      showStatus("Contributed to Mega Dare successfully!", "success");
      
      // Refresh data
      await initializeDareInfo();
      await loadUserStatus();
    } catch (error) {
      console.error("Error contributing to Mega Dare:", error);
      showStatus("Error contributing to Mega Dare", "error");
      
      // Re-enable button
      document.getElementById('contributeMegaDareButton').disabled = false;
    }
  }
  
  function startCountdown() {
    // Show countdown element
    document.getElementById('countdown').classList.remove('hidden');
    
    // Update countdown every second
    countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial update
  }
  
  function updateCountdown() {
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = endTimeTimestamp - now;
    
    if (timeRemaining <= 0) {
      // Challenge period has ended
      clearInterval(countdownInterval);
      document.getElementById('days').textContent = '00';
      document.getElementById('hours').textContent = '00';
      document.getElementById('minutes').textContent = '00';
      document.getElementById('seconds').textContent = '00';
      
      // Disable forms
      document.getElementById('createDareButton').disabled = true;
      document.getElementById('contributeMegaDareButton').disabled = true;
      document.getElementById('dareDescription').disabled = true;
      document.getElementById('dareEthAmount').disabled = true;
      document.getElementById('megaDareEthAmount').disabled = true;
      
      showStatus("Challenge period has ended", "info");
      return;
    }
    
    // Calculate time components
    const days = Math.floor(timeRemaining / 86400);
    const hours = Math.floor((timeRemaining % 86400) / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    // Update the countdown display
    document.getElementById('days').textContent = days.toString().padStart(2, '0');
    document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
  }
  
  function showStatus(message, type = "info") {
    const statusAlert = document.getElementById('statusAlert');
    const statusMessage = document.getElementById('statusMessage');
    
    statusMessage.textContent = message;
    statusAlert.classList.remove('hidden', 'bg-green-800', 'bg-red-800', 'bg-blue-800', 'bg-yellow-800');
    
    switch (type) {
      case "success":
        statusAlert.classList.add('bg-green-800', 'border-green-700');
        break;
      case "error":
        statusAlert.classList.add('bg-red-800', 'border-red-700');
        break;
      case "warning":
        statusAlert.classList.add('bg-yellow-800', 'border-yellow-700');
        break;
      default:
        statusAlert.classList.add('bg-blue-800', 'border-blue-700');
    }
    
    statusAlert.classList.remove('hidden');
    
    // Hide status after 5 seconds for success/info messages
    if (type === "success" || type === "info") {
      setTimeout(() => {
        statusAlert.classList.add('hidden');
      }, 5000);
    }
  }
  
  function updateUIOnConnect() {
    document.getElementById('notConnected').style.display = 'none';
    document.getElementById('connectedStatus').style.display = 'block';
  }
  
  function updateUIOnDisconnect() {
    document.getElementById('connectWallet').textContent = 'Connect Wallet';
    document.getElementById('notConnected').style.display = 'block';
    document.getElementById('connectedStatus').style.display = 'none';
  }
  
  // ############################################################


              //TESTING CODE BELOW

  
  // ############################################################



  function startTestMode() {
    // Set test values
    document.getElementById('megaDareDescription').textContent = "Test Mega Dare Description";
    document.getElementById('megaDareAmount').textContent = "0";
    document.getElementById('megaDareThreshold').textContent = "10";
    document.getElementById('megaDareProgressBar').style.width = "0%";
    
    // Start the countdown with 2 minutes

    //inside the parenthesis is days
    endTimeTimestamp = Math.floor(Date.now() / 1000) + (5) * 86400;
    startCountdown();
    
    // Add some test dares
    const daresContainer = document.getElementById('daresContainer');
    const nodaresMessage = document.getElementById('nodaresMessage');
    nodaresMessage.classList.add('hidden');
    
    // Clear and add test dares
    daresContainer.innerHTML = '';
    addTestDare("Do a backflip in the middle of class", "0.5", 0);
    addTestDare("Sing the national anthem backwards", "0.3", 1);
    addTestDare("Do a backflip in the middle of class", "0.5", 2);
    addTestDare("gigile fart", "56", 3);
    addTestDare("sigma", "99", 4);
    addTestDare("Sing the national anthem backwards", "0.1", 5);
  }
  
  function addTestDare(description, amount, id) {
    const daresContainer = document.getElementById('daresContainer');
    const dareCard = document.createElement('div');
    dareCard.className = 'dare-card bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700';
    if (id === 4) {
      dareCard.className += ' border-2 border-yellow-500';
    }
    
    dareCard.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <span class="bg-gray-700 text-xs font-medium px-2.5 py-0.5 rounded">Dare #${id}</span>
        ${id === 4 ? '<span class="bg-yellow-500 text-black text-xs font-medium px-2.5 py-0.5 rounded">Leading</span>' : ''}
      </div>
      <p class="text-lg mb-4">${description}</p>
      <div class="flex justify-between text-sm">
        <span class="text-gray-400">Creator</span>
        <span>0x1234...5678</span>
      </div>
      <div class="flex justify-between mt-2">
        <span class="text-gray-400">Amount</span>
        <span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500">${amount} ETH</span>
      </div>
    `;
    
    daresContainer.appendChild(dareCard);
  }


  // Listen for account changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
  }