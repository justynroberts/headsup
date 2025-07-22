// Background service worker for Heads Up Chrome Extension

let persistentState = {
  isRecording: false,
  sessionStartTime: null,
  sessionData: null,
  keepAliveTimer: null
};

chrome.runtime.onInstalled.addListener(() => {
  console.log('🚀 Heads Up extension installed - background service ready');
  
  // Enable side panel for all sites
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  
  // Restore persistent state from storage
  restorePersistentState();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 Extension startup - restoring persistent state');
  restorePersistentState();
});

async function restorePersistentState() {
  try {
    const result = await chrome.storage.local.get(['persistentRecordingState']);
    if (result.persistentRecordingState) {
      persistentState = { ...persistentState, ...result.persistentRecordingState };
      console.log('📄 Restored persistent state:', persistentState);
      
      if (persistentState.isRecording) {
        console.log('🎙️ Background: Recording session restored');
        updateBadge(true);
        startKeepAlive();
      }
    }
  } catch (error) {
    console.error('❌ Failed to restore persistent state:', error);
  }
}

async function savePersistentState() {
  try {
    await chrome.storage.local.set({
      persistentRecordingState: {
        isRecording: persistentState.isRecording,
        sessionStartTime: persistentState.sessionStartTime,
        timestamp: Date.now()
      }
    });
    console.log('💾 Background: Persistent state saved');
  } catch (error) {
    console.error('❌ Failed to save persistent state:', error);
  }
}

function startKeepAlive() {
  if (persistentState.keepAliveTimer) {
    clearInterval(persistentState.keepAliveTimer);
  }
  
  // Keep service worker alive while recording
  persistentState.keepAliveTimer = setInterval(() => {
    if (persistentState.isRecording) {
      console.log('⚡ Background: Keep-alive ping');
      // Send heartbeat to side panel if it's open
      chrome.runtime.sendMessage({ 
        action: 'background-heartbeat',
        sessionStartTime: persistentState.sessionStartTime 
      }).catch(() => {
        // Side panel might be closed, that's okay
      });
    } else {
      clearInterval(persistentState.keepAliveTimer);
      persistentState.keepAliveTimer = null;
    }
  }, 30000); // Every 30 seconds
}

function stopKeepAlive() {
  if (persistentState.keepAliveTimer) {
    clearInterval(persistentState.keepAliveTimer);
    persistentState.keepAliveTimer = null;
  }
}

function updateBadge(recording) {
  if (recording) {
    chrome.action.setBadgeText({ text: '●' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    chrome.action.setTitle({ title: 'Heads Up - Recording Active' });
  } else {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Heads Up' });
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('🎯 Extension icon clicked');
  // Side panel will open automatically due to setPanelBehavior
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('⌨️ Keyboard command:', command);
  switch (command) {
    case 'toggle-recording':
      // Send message to side panel to toggle recording
      chrome.runtime.sendMessage({ action: 'toggle-recording' }).catch(() => {
        console.log('Side panel not open, command ignored');
      });
      break;
    case 'toggle-live-view':
      // Send message to side panel to toggle live view
      chrome.runtime.sendMessage({ action: 'toggle-live-view' }).catch(() => {
        console.log('Side panel not open, command ignored');
      });
      break;
  }
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Background received message:', request.action);
  
  if (request.action === 'recording-started') {
    persistentState.isRecording = true;
    persistentState.sessionStartTime = request.sessionStartTime;
    updateBadge(true);
    startKeepAlive();
    savePersistentState();
    
    // Notify user that recording continues in background
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Heads Up Recording Started',
      message: 'Recording will continue even if you close the sidebar'
    });
    
    sendResponse({ success: true });
  }
  
  else if (request.action === 'recording-stopped') {
    persistentState.isRecording = false;
    persistentState.sessionStartTime = null;
    updateBadge(false);
    stopKeepAlive();
    savePersistentState();
    
    sendResponse({ success: true });
  }
  
  else if (request.action === 'get-persistent-state') {
    sendResponse({ 
      state: persistentState,
      timestamp: Date.now()
    });
  }
  
  else if (request.action === 'update-session-data') {
    persistentState.sessionData = request.data;
    savePersistentState();
    sendResponse({ success: true });
  }
  
  else if (request.action === 'show-notification') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: request.title || 'Heads Up',
      message: request.message || ''
    });
    sendResponse({ success: true });
  }
  
  else if (request.action === 'analyze-with-llm') {
    handleLLMAnalysis(request, sendResponse);
    return true; // Keep channel open for async response
  }
  
  return true; // Keep message channel open for async response
});

// LLM Analysis Handler
async function handleLLMAnalysis(request, sendResponse) {
  console.log('🤖 Background: Starting LLM analysis');
  
  try {
    const { config, prompt } = request;
    let response;
    
    console.log(`🔧 Background: Using provider: ${config.provider}`);
    console.log(`📝 Background: Prompt length: ${prompt.length} characters`);
    
    switch(config.provider) {
      case 'openai':
        console.log('🔵 Background: Calling OpenAI API...');
        response = await callOpenAI(config, prompt);
        break;
      case 'claude':
        console.log('🟠 Background: Calling Claude API...');
        response = await callClaude(config, prompt);
        break;
      case 'ollama':
        console.log('🟢 Background: Calling Ollama API...');
        response = await callOllama(config, prompt);
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
    
    console.log(`✅ Background: LLM Response received: ${response?.length || 0} characters`);
    console.log(`📊 Background: Response preview: "${response?.substring(0, 100)}..."`);
    
    sendResponse({ success: true, response: response });
    
  } catch (error) {
    console.error('❌ Background: LLM Analysis Error:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Unknown error occurred',
      details: error.toString()
    });
  }
}

// OpenAI API Call
async function callOpenAI(config, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Claude API Call
async function callClaude(config, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  return data.content[0].text;
}

// Ollama API Call
async function callOllama(config, prompt) {
  const response = await fetch(`${config.baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.model || 'llama2',
      prompt: prompt,
      stream: false
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  return data.response;
}