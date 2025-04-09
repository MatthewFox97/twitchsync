// background.js
// No specific background tasks needed for this version.
// This file is required by the manifest (MV3).

// Optional: Log when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Twitch Multi-Stream Sync extension installed.');
});
