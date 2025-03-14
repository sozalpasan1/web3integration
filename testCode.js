// paste this into script.js
// ############################################################
//                 ENHANCED TESTING CODE
// ############################################################

// Mock state for testing
let testState = {
    dares: [],
    megaDareAmount: 0,
    megaDareThreshold: 10,
    megaDareDescription: "Eat a hot pepper on livestream",
    dareCount: 0,
    userHasCreatedDare: false,
    userDareId: null,
    userContributedToMegaDare: false,
    testAccount: "0x1234567890123456789012345678901234567890",
    endTime: 0,
    showDaresSection: false
  };
  
  // Initialize the test mode
  function startTestMode() {
    console.log("🧪 Test mode activated");
    
    // Replace real contract calls with mock ones
    mockContractMethods();
    
    // Set up initial test state
    testState.megaDareAmount = 2.5; // Start with some ETH in the mega dare
    testState.dareCount = 0;
    testState.endTime = Math.floor(Date.now() / 1000) + (5 * 86400); // 5 days from now
    testState.userHasCreatedDare = false;
    testState.userContributedToMegaDare = false;
    testState.dares = []; // Clear any existing test dares
    
    // Set current account for testing
    currentAccount = testState.testAccount;
    
    // Update UI with test values
    document.getElementById('megaDareDescription').textContent = testState.megaDareDescription;
    document.getElementById('megaDareAmount').textContent = testState.megaDareAmount.toString();
    document.getElementById('megaDareThreshold').textContent = testState.megaDareThreshold.toString();
    
    // Calculate progress percentage
    const progressPercentage = (testState.megaDareAmount / testState.megaDareThreshold) * 100;
    document.getElementById('megaDareProgressBar').style.width = `${progressPercentage}%`;
    
    // Initialize the countdown
    endTimeTimestamp = testState.endTime;
    startCountdown();
    
    // Add some test dares
    addTestDare("Do a backflip in the middle of class", 0.5, "0xabc1");
    addTestDare("Sing the national anthem backwards", 0.3, "0xabc2");
    addTestDare("Wear a banana costume to work for a day", 0.7, "0xabc3");
    addTestDare("Speak only in rhymes for 24 hours", 1.2, "0xabc4");
    addTestDare("Dye your hair neon green", 2.1, "0xabc5");
    
    // Update the total dares count
    document.getElementById('totalDaresCount').textContent = testState.dareCount.toString();
    
    // Display dares section immediately for testing
    const allDaresSection = document.getElementById('allDaresSection');
    allDaresSection.classList.remove('hidden');
    document.getElementById('showAllDaresButton').textContent = 'Hide All Dares';
    testState.showDaresSection = true;
    
    // Display all dares in the UI
    testDisplayAllDares();
    
    // Initialize the connected UI status
    updateUIOnConnect();
    
    // Show a status message
    showStatus("Test mode activated! You can now test all functionality without blockchain interactions.", "info");
    
    // Enable buttons that would normally be disabled when not connected
    document.getElementById('createDareButton').disabled = false;
    document.getElementById('contributeMegaDareButton').disabled = false;
    
    // Add test mode indicator to the page
    addTestModeIndicator();
  }
  
  // Function to display all dares in test mode
  function testDisplayAllDares() {
    const daresContainer = document.getElementById('daresContainer');
    
    if (!daresContainer) {
      console.error("Dares container not found!");
      return;
    }
    
    // Clear previous content
    daresContainer.innerHTML = '';
    
    // If no dares, show message
    if (testState.dares.length === 0) {
      const nodaresMessage = document.createElement('p');
      nodaresMessage.className = 'text-center py-4 text-gray-400';
      nodaresMessage.textContent = 'No dares have been created yet. Be the first!';
      daresContainer.appendChild(nodaresMessage);
      return;
    }
    
    // Sort dares by amount (highest first)
    const sortedDares = [...testState.dares].sort((a, b) => b.amount - a.amount);
    
    // Find the highest amount dare
    const highestAmount = sortedDares[0].amount;
    
    // Create and add dare cards
    sortedDares.forEach(dare => {
      const dareCard = document.createElement('div');
      dareCard.className = 'dare-card bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700';
      
      // Highlight the dare with highest amount
      if (dare.amount === highestAmount) {
        dareCard.className += ' border-2 border-yellow-500';
      }
      
      // Format creator address
      const abbreviatedCreator = dare.creator.slice(0, 6) + '...' + dare.creator.slice(-4);
      
      // Check if this is the user's own dare
      const isUserDare = currentAccount && dare.creator.toLowerCase() === currentAccount.toLowerCase();
      const disableContribution = isUserDare || timeEnded;
      
      // Create card content
      dareCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <span class="bg-gray-700 text-xs font-medium px-2.5 py-0.5 rounded">Dare #${dare.id}</span>
          ${dare.amount === highestAmount ? '<span class="bg-yellow-500 text-black text-xs font-medium px-2.5 py-0.5 rounded">Leading</span>' : ''}
          ${isUserDare ? '<span class="bg-pink-700 text-white text-xs font-medium px-2.5 py-0.5 rounded">Your Dare</span>' : ''}
        </div>
        <p class="text-lg mb-4">${dare.description}</p>
        <div class="flex justify-between text-sm">
          <span class="text-gray-400">Creator</span>
          <span>${abbreviatedCreator}</span>
        </div>
        <div class="flex justify-between mt-2">
          <span class="text-gray-400">Amount</span>
          <span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500">${dare.amount} ETH</span>
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
                onclick="testHandleContributeToExistingDare(${dare.id})"
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
  
  // Mock all the contract method calls
  function mockContractMethods() {
    // Create a mock contract object
    contract = {
      // Basic getter methods
      megaDareDescription: async () => testState.megaDareDescription,
      megaDareAmount: async () => ({ 
        toString: () => (testState.megaDareAmount * 1e18).toString(),
        mul: (num) => ({ div: (denom) => ({ toNumber: () => Math.floor((testState.megaDareAmount / testState.megaDareThreshold) * 100) }) })
      }),
      megaDareThreshold: async () => ({ toString: () => (testState.megaDareThreshold * 1e18).toString() }),
      endTime: async () => ({ toNumber: () => testState.endTime }),
      dareCount: async () => ({ toNumber: () => testState.dareCount }),
      hasCreatedDare: async () => testState.userHasCreatedDare,
      contributedToMegaDare: async () => testState.userContributedToMegaDare,
      userDareId: async () => testState.userDareId,
      
      // Mock getDareById to return the dare data
      getDareById: async (dareId) => {
        const dare = testState.dares.find(d => d.id === parseInt(dareId));
        if (!dare) throw new Error("Invalid dare ID");
        return [
          dare.description, 
          { 
            toString: () => (dare.amount * 1e18).toString(),
            mul: () => ({ div: () => ({ toNumber: () => Math.floor((dare.amount / testState.megaDareThreshold) * 100) }) })
          },
          dare.creator
        ];
      },
      
      // Mock getUserDareInfo to return the user's dare info
      getUserDareInfo: async () => {
        if (!testState.userHasCreatedDare) return [false, 0, ""];
        const dare = testState.dares.find(d => d.id === testState.userDareId);
        return [true, testState.userDareId, dare.description];
      },
      
      // Mock create dare transaction
      createDare: async (description, options) => {
        console.log("🧪 Mock createDare called:", description, options);
        if (testState.userHasCreatedDare) throw new Error("You have already created a dare");
        
        // Parse ETH amount from options
        const ethAmountStr = options.value.toString();
        const ethAmount = parseFloat(ethAmountStr) / 1e18;
        
        // Create a new dare
        const dareId = testState.dareCount;
        const newDare = {
          id: dareId,
          description,
          amount: ethAmount,
          creator: currentAccount,
          formattedAmount: ethAmount.toString()
        };
        
        // Add to state
        testState.dares.push(newDare);
        testState.dareCount++;
        testState.userHasCreatedDare = true;
        testState.userDareId = dareId;
        
        // Return a mock transaction object
        return {
          wait: async () => {
            console.log("🧪 Mock transaction confirmed");
            return true;
          }
        };
      },
      
      // Mock contribute to mega dare transaction
      contributeToMegaDare: async (options) => {
        console.log("🧪 Mock contributeToMegaDare called:", options);
        
        // Parse ETH amount from options
        const ethAmountStr = options.value.toString();
        const ethAmount = parseFloat(ethAmountStr) / 1e18;
        
        // Update state
        testState.megaDareAmount += ethAmount;
        testState.userContributedToMegaDare = true;
        
        // Return a mock transaction object
        return {
          wait: async () => {
            console.log("🧪 Mock transaction confirmed");
            return true;
          }
        };
      },
      
      // Mock contribute to existing dare transaction
      contributeToExistingDare: async (dareId, options) => {
        console.log("🧪 Mock contributeToExistingDare called:", dareId, options);
        
        // Find the dare
        const dare = testState.dares.find(d => d.id === parseInt(dareId));
        if (!dare) throw new Error("Invalid dare ID");
        
        // Check if it's the user's own dare
        if (dare.creator === currentAccount) {
          throw new Error("Cannot contribute to your own dare");
        }
        
        // Parse ETH amount from options
        const ethAmountStr = options.value.toString();
        const ethAmount = parseFloat(ethAmountStr) / 1e18;
        
        // Update the dare amount
        dare.amount += ethAmount;
        dare.formattedAmount = dare.amount.toString();
        
        // Return a mock transaction object
        return {
          wait: async () => {
            console.log("🧪 Mock transaction confirmed");
            return true;
          }
        };
      }
    };
    
    // Mock the ethers utility functions
    if (!window.ethers) {
      window.ethers = {};
    }
    window.ethers.utils = {
      parseEther: (amount) => (parseFloat(amount) * 1e18).toString(),
      formatEther: (wei) => {
        // If wei is an object with toString method, call it
        if (wei && typeof wei.toString === 'function') {
          wei = wei.toString();
        }
        
        // Convert wei string to ETH
        return (parseFloat(wei) / 1e18).toString();
      }
    };
  }
  
  // Add test dares to the state and update UI
  function addTestDare(description, amount, creator) {
    // Create a new dare object
    const dareId = testState.dareCount;
    const newDare = {
      id: dareId,
      description,
      amount,
      creator,
      formattedAmount: amount.toString()
    };
    
    // Add to test state
    testState.dares.push(newDare);
    testState.dareCount++;
  }
  
  // Test version of contribute to existing dare
  function testHandleContributeToExistingDare(dareId) {
    const inputId = `contributeAmount-${dareId}`;
    const ethAmountInput = document.getElementById(inputId);
    
    if (!ethAmountInput) {
      console.error(`Input element with ID ${inputId} not found`);
      return;
    }
    
    const ethAmount = ethAmountInput.value;
    
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      showStatus("Please enter a valid ETH amount", "error");
      return;
    }
    
    // Find the dare
    const dare = testState.dares.find(d => d.id === parseInt(dareId));
    if (!dare) {
      showStatus("Invalid dare ID", "error");
      return;
    }
    
    // Check if it's the user's own dare
    if (dare.creator === currentAccount) {
      showStatus("You cannot contribute to your own dare", "error");
      return;
    }
    
    // Disable button
    const contributeButton = document.getElementById(`contributeButton-${dareId}`);
    if (contributeButton) {
      contributeButton.disabled = true;
    }
    
    // Show processing message
    showStatus(`Contributing to Dare #${dareId}, please confirm the transaction...`, "info");
    
    // Simulate transaction delay
    setTimeout(() => {
      // Update the dare amount
      dare.amount += parseFloat(ethAmount);
      dare.formattedAmount = dare.amount.toString();
      
      // Show success message
      showStatus("Contributed to dare successfully!", "success");
      
      // Update the UI
      testDisplayAllDares();
      
      // Clear the input
      ethAmountInput.value = "";
      
      // Re-enable button
      if (contributeButton) {
        contributeButton.disabled = false;
      }
    }, 1000);
  }
  
  // Test version of create dare
  function testHandleCreateDare() {
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
    
    // Check if user already created a dare
    if (testState.userHasCreatedDare) {
      showStatus("You have already created a dare", "error");
      return;
    }
    
    // Disable button
    document.getElementById('createDareButton').disabled = true;
    
    // Show processing message
    showStatus("Creating dare, please confirm the transaction...", "info");
    
    // Simulate transaction delay
    setTimeout(() => {
      // Create a new dare
      const dareId = testState.dareCount;
      const newDare = {
        id: dareId,
        description,
        amount: parseFloat(ethAmount),
        creator: currentAccount,
        formattedAmount: ethAmount
      };
      
      // Add to state
      testState.dares.push(newDare);
      testState.dareCount++;
      testState.userHasCreatedDare = true;
      testState.userDareId = dareId;
      
      // Show success message
      showStatus("Dare created successfully!", "success");
      
      // Update the UI
      document.getElementById('totalDaresCount').textContent = testState.dareCount.toString();
      testDisplayAllDares();
      
      // Update user status
      document.getElementById('notParticipated').style.display = 'none';
      document.getElementById('hasParticipated').style.display = 'block';
      document.getElementById('yourMegaDare').style.display = 'none';
      document.getElementById('yourDare').style.display = 'block';
      document.getElementById('yourDareDescription').textContent = description;
      document.getElementById('yourDareAmount').textContent = `${ethAmount} ETH`;
      
      // Disable dare creation form
      document.getElementById('dareDescription').disabled = true;
      document.getElementById('dareEthAmount').disabled = true;
      document.getElementById('createDareButton').disabled = true;
      
      // Clear the input fields
      document.getElementById('dareDescription').value = "";
      document.getElementById('dareEthAmount').value = "";
    }, 1000);
  }
  
  // Test version of contribute to mega dare
  function testHandleContributeToMegaDare() {
    const ethAmount = document.getElementById('megaDareEthAmount').value;
    
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      showStatus("Please enter a valid ETH amount", "error");
      return;
    }
    
    // Disable button
    document.getElementById('contributeMegaDareButton').disabled = true;
    
    // Show processing message
    showStatus("Contributing to Mega Dare, please confirm the transaction...", "info");
    
    // Simulate transaction delay
    setTimeout(() => {
      // Update state
      testState.megaDareAmount += parseFloat(ethAmount);
      testState.userContributedToMegaDare = true;
      
      // Show success message
      showStatus("Contributed to Mega Dare successfully!", "success");
      
      // Update the UI
      document.getElementById('megaDareAmount').textContent = testState.megaDareAmount.toString();
      const progressPercentage = (testState.megaDareAmount / testState.megaDareThreshold) * 100;
      document.getElementById('megaDareProgressBar').style.width = `${progressPercentage}%`;
      
      // Show mega dare status message
      document.getElementById('megaDareStatusMessage').textContent = "You've contributed to the Mega Dare!";
      document.getElementById('megaDareStatusMessage').classList.remove('hidden');
      
      // Clear the input
      document.getElementById('megaDareEthAmount').value = "";
      
      // Re-enable button
      document.getElementById('contributeMegaDareButton').disabled = false;
    }, 1000);
  }
  
  // Add a visual indicator that test mode is active
  function addTestModeIndicator() {
    // Remove existing indicator if any
    const existingIndicator = document.getElementById('testModeIndicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'testModeIndicator';
    indicator.className = 'fixed bottom-4 right-4 bg-indigo-900 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    indicator.innerHTML = `
      <div class="flex items-center">
        <span class="text-xl mr-2">🧪</span>
        <div>
          <p class="font-bold">Test Mode Active</p>
          <p class="text-xs">No blockchain interactions</p>
        </div>
      </div>
    `;
    document.body.appendChild(indicator);
  }
  
  // Override the existing event listeners for test mode
  function setupTestEventListeners() {
    // Replace the event listeners with test versions
    document.getElementById('createDareButton').removeEventListener('click', handleCreateDare);
    document.getElementById('createDareButton').addEventListener('click', testHandleCreateDare);
    
    document.getElementById('contributeMegaDareButton').removeEventListener('click', handleContributeToMegaDare);
    document.getElementById('contributeMegaDareButton').addEventListener('click', testHandleContributeToMegaDare);
  }
  
  // Call this when the page loads
  document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test')) {
      setTimeout(() => {
        startTestMode();
        setupTestEventListeners();
      }, 500); // Small delay to ensure DOM is ready
    }
  });
  
  // Make test functions available globally
  window.startTestMode = startTestMode;
  window.testHandleContributeToExistingDare = testHandleContributeToExistingDare;
  window.testDisplayAllDares = testDisplayAllDares;