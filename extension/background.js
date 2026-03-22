chrome.runtime.onInstalled.addListener(() => {
  console.log('VisualSpider Extension installed')
})

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'toggle-panel' })
})

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-visual-spider') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-panel' })
    })
  }
})
