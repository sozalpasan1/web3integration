// Contract ABI - abbreviated version for core functions
const contractABI = [
  "function createDare(string description) external payable",
  "function contributeToMegaDare() external payable",
  "function contributeToExistingDare(uint256 dareId) external payable",
  "function megaDareDescription() external view returns (string)",
  "function megaDareAmount() external view returns (uint256)",
  "function megaDareThreshold() external view returns (uint256)",
  "function endTime() external view returns (uint256)",
  "function dareCount() external view returns (uint256)",
  "function hasCreatedDare(address) external view returns (bool)",
  "function contributedToMegaDare(address) external view returns (bool)",
  "function getDareById(uint256 dareId) external view returns (string, uint256, address)",
  "function userDareId(address) external view returns (uint256)",
  "function getUserDareInfo(address) external view returns (bool, uint256, string)",
  "event DareCreated(address indexed creator, uint256 indexed dareId, string description, uint256 amount)",
  "event MegaDareContribution(address indexed contributor, uint256 amount, uint256 totalAmount)",
  "event DareContribution(address indexed contributor, uint256 indexed dareId, uint256 amount, uint256 totalAmount)"
];
    
// You would replace this with your actual contract address
const contractAddress = "0x18a0334f5bf307ffcc9805369113b898e9377353";
//https://sepolia.etherscan.io/tx/0x83bfce8afefa55f5577bf36c07153a2d69d56d1dbcaa3913892ce494a3391b72
    
// App State
let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;
let endTimeTimestamp = 0;
let countdownInterval = null;
let dares = [];
let hasCreatedDare = false;

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Set up event listeners
  document.getElementById('connectWallet').addEventListener('click', connectWallet);
  document.getElementById('connectWalletStatus').addEventListener('click', connectWallet);
  document.getElementById('createDareButton').addEventListener('click', handleCreateDare);
  document.getElementById('contributeMegaDareButton').addEventListener('click', handleContributeToMegaDare);
  document.getElementById('showAllDaresButton').addEventListener('click', toggleDaresSection);
  
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
    
    // Poll for updates every 60 seconds
    setInterval(async () => {
      if (contract) {
        await initializeDareInfo();
        if (currentAccount) {
          await loadUserStatus();
        }
      }
    }, 60000);
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
    
    // Display all dares
    displayAllDares();
  }
}

async function loadUserStatus() {
  try {
    // Check if user has created a dare
    hasCreatedDare = await contract.hasCreatedDare(currentAccount);
    const contributedToMegaDare = await contract.contributedToMegaDare(currentAccount);
    
    document.getElementById('notParticipated').style.display = hasCreatedDare ? 'none' : 'block';
    document.getElementById('hasParticipated').style.display = hasCreatedDare ? 'block' : 'none';
    
    if (hasCreatedDare) {
      // Get user's dare details
      const [hasCreated, dareId, description] = await contract.getUserDareInfo(currentAccount);
      if (hasCreated) {
        document.getElementById('yourMegaDare').style.display = 'none';
        document.getElementById('yourDare').style.display = 'block';
        
        // Get full dare details to show amount
        const [_, amount, __] = await contract.getDareById(dareId);
        
        document.getElementById('yourDareDescription').textContent = description;
        document.getElementById('yourDareAmount').textContent = `${ethers.utils.formatEther(amount)} ETH`;
      }
      
      // Disable dare creation form
      document.getElementById('createDareButton').disabled = true;
      document.getElementById('dareDescription').disabled = true;
      document.getElementById('dareEthAmount').disabled = true;
    } else {
      // Enable dare creation form
      document.getElementById('createDareButton').disabled = false;
      document.getElementById('dareDescription').disabled = false;
      document.getElementById('dareEthAmount').disabled = false;
    }
    
    // Mega Dare status message
    if (contributedToMegaDare) {
      document.getElementById('megaDareStatusMessage').textContent = "You've contributed to the Mega Dare!";
      document.getElementById('megaDareStatusMessage').classList.remove('hidden');
    } else {
      document.getElementById('megaDareStatusMessage').classList.add('hidden');
    }
    
    // Always enable contribution to Mega Dare
    document.getElementById('contributeMegaDareButton').disabled = false;
    document.getElementById('megaDareEthAmount').disabled = false;
    
    // Update the UI of all dares
    updateDaresUI();
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
    
    // Update total dares counter
    document.getElementById('totalDaresCount').textContent = dareCount.toString();
    
    // Calculate progress percentage
    const progressPercentage = megaDareAmount.mul(100).div(megaDareThreshold).toNumber();
    document.getElementById('megaDareProgressBar').style.width = `${progressPercentage}%`;
    
    // Initialize countdown
    endTimeTimestamp = endTime.toNumber();
    startCountdown();
    
    // Store the dares data and display them
    await loadDaresData(dareCount);
    
    // If user is connected, display all dares
    if (currentAccount) {
      displayAllDares();
    }
  } catch (error) {
    console.error("Error initializing dare info:", error);
    showStatus("Error loading challenge information", "error");
  }
}

async function loadDaresData(dareCount) {
  // Clear previous dares
  dares = [];
  
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
    // Disable button to prevent multiple clicks during transaction
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
    
    // Reset the input field
    document.getElementById('megaDareEthAmount').value = '';
    
    // Re-enable button
    document.getElementById('contributeMegaDareButton').disabled = false;
  } catch (error) {
    console.error("Error contributing to Mega Dare:", error);
    showStatus("Error contributing to Mega Dare", "error");
    
    // Re-enable button
    document.getElementById('contributeMegaDareButton').disabled = false;
  }
}

// Function to handle contributing to an existing dare
async function handleContributeToExistingDare(dareId) {
  const inputId = `contributeAmount-${dareId}`;
  const ethAmount = document.getElementById(inputId).value;
  
  if (!ethAmount || parseFloat(ethAmount) <= 0) {
    showStatus("Please enter a valid ETH amount", "error");
    return;
  }
  
  try {
    // Get the dare info to check if it's the user's own dare
    const [_, __, creator] = await contract.getDareById(dareId);
    if (creator.toLowerCase() === currentAccount.toLowerCase()) {
      showStatus("You cannot contribute to your own dare", "error");
      return;
    }
    
    // Disable button to prevent multiple clicks during transaction
    document.getElementById(`contributeButton-${dareId}`).disabled = true;
    showStatus(`Contributing to Dare #${dareId}, please confirm the transaction...`, "info");
    
    // Contribute to existing dare transaction
    const tx = await contract.contributeToExistingDare(dareId, {
      value: ethers.utils.parseEther(ethAmount)
    });
    
    showStatus("Transaction submitted, waiting for confirmation...", "info");
    
    // Wait for transaction to be mined
    await tx.wait();
    
    showStatus("Contributed to dare successfully!", "success");
    
    // Refresh data
    await initializeDareInfo();
    await loadUserStatus();
    
    // Reset the input field
    document.getElementById(inputId).value = '';
    
    // Re-enable button
    document.getElementById(`contributeButton-${dareId}`).disabled = false;
  } catch (error) {
    console.error(`Error contributing to dare #${dareId}:`, error);
    showStatus("Error contributing to dare", "error");
    
    // Re-enable button
    document.getElementById(`contributeButton-${dareId}`).disabled = false;
  }
}

function updateDaresUI() {
  // Disable contribution to user's own dare
  if (hasCreatedDare && currentAccount) {
    dares.forEach(dare => {
      if (dare.creator.toLowerCase() === currentAccount.toLowerCase()) {
        const button = document.getElementById(`contributeButton-${dare.id}`);
        const input = document.getElementById(`contributeAmount-${dare.id}`);
        if (button) button.disabled = true;
        if (input) input.disabled = true;
        if (button) button.title = "Cannot contribute to your own dare";
      }
    });
  }
}

function displayAllDares() {
  const allDaresSection = document.getElementById('allDaresSection');
  const daresContainer = document.getElementById('daresContainer');
  
  if (!daresContainer || !allDaresSection) return;
  
  // Clear previous content
  daresContainer.innerHTML = '';
  
  // If no dares, show message
  if (dares.length === 0) {
    const nodaresMessage = document.createElement('p');
    nodaresMessage.className = 'text-center py-4 text-gray-400';
    nodaresMessage.textContent = 'No dares have been created yet. Be the first!';
    daresContainer.appendChild(nodaresMessage);
    return;
  }
  
  // Sort dares by amount (highest first)
  const sortedDares = [...dares].sort((a, b) => b.amount.sub(a.amount));
  
  // Find the highest amount dare
  const highestAmount = sortedDares[0].amount;
  
  // Create and add dare cards
  sortedDares.forEach(dare => {
    const dareCard = document.createElement('div');
    dareCard.className = 'dare-card bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700';
    
    // Highlight the dare with highest amount
    if (dare.amount.eq(highestAmount)) {
      dareCard.className += ' border-2 border-yellow-500';
    }
    
    // Format creator address
    const abbreviatedCreator = `${dare.creator.slice(0, 6)}...${dare.creator.slice(-4)}`;
    
    // Check if this is the user's own dare
    const isUserDare = currentAccount && dare.creator.toLowerCase() === currentAccount.toLowerCase();
    const disableContribution = isUserDare || timeEnded;
    
    // Create card content
    dareCard.innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <span class="bg-gray-700 text-xs font-medium px-2.5 py-0.5 rounded">Dare #${dare.id}</span>
        ${dare.amount.eq(highestAmount) ? '<span class="bg-yellow-500 text-black text-xs font-medium px-2.5 py-0.5 rounded">Leading</span>' : ''}
        ${isUserDare ? '<span class="bg-pink-700 text-white text-xs font-medium px-2.5 py-0.5 rounded">Your Dare</span>' : ''}
      </div>
      <p class="text-lg mb-4">${dare.description}</p>
      <div class="flex justify-between text-sm">
        <span class="text-gray-400">Creator</span>
        <span>${abbreviatedCreator}</span>
      </div>
      <div class="flex justify-between mt-2">
        <span class="text-gray-400">Amount</span>
        <span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500">${dare.formattedAmount} ETH</span>
      </div>
      
      <div class="mt-4 pt-4 border-t border-gray-700">
        <div class="mb-2">
          <label class="block text-gray-400 text-sm mb-1">Contribute (ETH)</label>
          <div class="flex space-x-2">
            <input 
              type="number"
              id="contributeAmount-${dare.id}"
              placeholder="0.05"
              min="0.001"
              step="0.05"
              class="contribute-dare-amount w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-sm"
              ${disableContribution ? 'disabled' : ''}
              ${isUserDare ? 'title="Cannot contribute to your own dare"' : ''}
            >
            <button 
              id="contributeButton-${dare.id}"
              class="contribute-dare-button btn-gradient px-4 py-2 rounded-lg font-medium text-white shadow-lg text-sm disabled:opacity-50"
              onclick="handleContributeToExistingDare(${dare.id})"
              ${disableContribution ? 'disabled' : ''}
              ${isUserDare ? 'title="Cannot contribute to your own dare"' : ''}
            >
              Contribute
            </button>
          </div>
        </div>
      </div>
    `;
    
    daresContainer.appendChild(dareCard);
  });
}

function toggleDaresSection() {
  const allDaresSection = document.getElementById('allDaresSection');
  const showAllDaresButton = document.getElementById('showAllDaresButton');
  
  if (allDaresSection.classList.contains('hidden')) {
    allDaresSection.classList.remove('hidden');
    showAllDaresButton.textContent = 'Hide All Dares';
    displayAllDares();
  } else {
    allDaresSection.classList.add('hidden');
    showAllDaresButton.textContent = 'Show All Dares';
  }
}

let timeEnded = false;

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
    timeEnded = true;
    clearInterval(countdownInterval);
    document.getElementById('days').textContent = '00';
    document.getElementById('hours').textContent = '00';
    document.getElementById('minutes').textContent = '00';
    document.getElementById('seconds').textContent = '00';
    
    // Disable all forms
    document.getElementById('createDareButton').disabled = true;
    document.getElementById('contributeMegaDareButton').disabled = true;
    document.getElementById('dareDescription').disabled = true;
    document.getElementById('dareEthAmount').disabled = true;
    document.getElementById('megaDareEthAmount').disabled = true;
    
    // Disable all contribution buttons
    const contributeButtons = document.querySelectorAll('.contribute-dare-button');
    contributeButtons.forEach(button => {
      button.disabled = true;
    });
    
    const contributeInputs = document.querySelectorAll('.contribute-dare-amount');
    contributeInputs.forEach(input => {
      input.disabled = true;
    });
    
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

// Make the function globally available for the HTML onclick
window.handleContributeToExistingDare = handleContributeToExistingDare;