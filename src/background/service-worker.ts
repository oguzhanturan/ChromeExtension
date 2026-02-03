chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Tab Group Share installed.');
  } else if (details.reason === 'update') {
    console.log(`Tab Group Share updated to v${chrome.runtime.getManifest().version}.`);
  }
});
