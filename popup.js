document.addEventListener('DOMContentLoaded', () => {
  const streamList = document.getElementById('stream-list');
  const syncAllButton = document.getElementById('sync-all-button');
  let twitchTabs = []; // To store details of tabs with Twitch streams

  // Function to send message to content script to apply delay
  function applyDelay(tabId, delaySeconds) {
    if (delaySeconds > 0) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (delay) => {
          const video = document.querySelector('video');
          if (video && !video.paused) {
            console.log(`Applying ${delay}s delay to video in tab ${tabId}`);
            video.pause();
            setTimeout(() => {
              video.play();
              console.log(`Resumed video in tab ${tabId} after delay.`);
            }, delay * 1000);
          } else {
            console.log(`No active video found or video already paused in tab ${tabId}.`);
          }
        },
        args: [delaySeconds]
      }).catch(err => console.error(`Error executing script in tab ${tabId}:`, err));
    }
  }

  // Function to update the popup list
  function updatePopupList() {
    streamList.innerHTML = ''; // Clear current list

    if (twitchTabs.length === 0) {
      streamList.innerHTML = '<li>No active Twitch streams found.</li>';
      syncAllButton.disabled = true;
      return;
    }

    syncAllButton.disabled = false;
    twitchTabs.forEach(tab => {
      const listItem = document.createElement('li');
      listItem.dataset.tabId = tab.id;

      const tabInfo = document.createElement('div');
      tabInfo.className = 'tab-info';
      tabInfo.textContent = tab.title.replace(' - Twitch', ''); // Simplify title
      tabInfo.title = tab.title; // Show full title on hover

      const delayControls = document.createElement('div');
      delayControls.className = 'delay-controls';

      const delayInput = document.createElement('input');
      delayInput.type = 'number';
      delayInput.min = '0';
      delayInput.value = '0';
      delayInput.title = 'Delay in seconds';

      const delayButton = document.createElement('button');
      delayButton.textContent = 'Delay';
      delayButton.onclick = () => {
        const delayValue = parseInt(delayInput.value, 10);
        if (!isNaN(delayValue) && delayValue >= 0) {
          applyDelay(tab.id, delayValue);
        } else {
          console.error("Invalid delay value");
        }
      };

      delayControls.appendChild(delayInput);
      delayControls.appendChild(document.createTextNode('s ')); // Add 's' unit
      delayControls.appendChild(delayButton);

      listItem.appendChild(tabInfo);
      listItem.appendChild(delayControls);
      streamList.appendChild(listItem);
    });
  }

  // --- Initialization ---
  streamList.innerHTML = '<li>Scanning tabs...</li>'; // Initial message

  // Query for Twitch tabs
  chrome.tabs.query({ url: "*://*.twitch.tv/*" }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.error("Error querying tabs:", chrome.runtime.lastError);
      streamList.innerHTML = '<li>Error loading tabs.</li>';
      return;
    }

    if (tabs.length === 0) {
        streamList.innerHTML = '<li>No Twitch tabs found.</li>';
        syncAllButton.disabled = true;
        return;
    }

    let checkedTabs = 0;
    twitchTabs = []; // Reset

    tabs.forEach(tab => {
      // Check if content script can access a video element
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => !!document.querySelector('video') // Check if video element exists
      })
      .then(results => {
        if (results && results[0] && results[0].result === true) {
          // Only add tabs where a video element was found
          twitchTabs.push(tab);
        }
      })
      .catch(err => {
        // Ignore errors for tabs where the script couldn't be injected (e.g., chrome:// pages, protected pages)
        // console.warn(`Could not check tab ${tab.id} (${tab.url}): ${err.message}`);
      })
      .finally(() => {
        checkedTabs++;
        // Update the list once all tabs have been checked
        if (checkedTabs === tabs.length) {
          updatePopupList();
        }
      });
    });
  });

  // Sync All Button Logic (Placeholder/Experimental)
  // A simple approach: find the "most live" stream (hard to determine accurately)
  // and delay all others relative to it. This is very basic.
  // A better approach might involve asking the user to pick a reference stream.
  syncAllButton.onclick = () => {
    alert("Sync All functionality is highly experimental and may not work reliably. It attempts to pause all streams and resume them together after a short delay.");
    const baseDelay = 2; // Pause all for 2 seconds before resuming

    twitchTabs.forEach(tab => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const video = document.querySelector('video');
                if (video && !video.paused) video.pause();
                return !!video; // Return if video exists
            }
        }).then(results => {
            // If a video was found and paused, schedule its resumption
            if (results && results[0] && results[0].result === true) {
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            const video = document.querySelector('video');
                            if (video) video.play();
                        }
                    }).catch(err => console.error(`Error resuming video in tab ${tab.id}:`, err));
                }, baseDelay * 1000);
            }
        }).catch(err => console.error(`Error pausing video in tab ${tab.id}:`, err));
    });
  };

});
