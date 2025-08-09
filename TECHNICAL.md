# Technical Documentation - Heads Up Extension

## 🏗️ Architecture Overview

### Chrome Extension Structure
- **Manifest V3**: Modern Chrome extension using service workers
- **Side Panel API**: Native sidebar integration for persistent UI
- **Content Script**: None required - fully contained in sidebar
- **Background Service**: Maintains state and handles cross-tab communication

### Core Components

#### 1. Speech Recognition Engine
```javascript
// Enhanced Web Speech API with error recovery
class HeadsUp {
  constructor() {
    this.recognition = new webkitSpeechRecognition();
    this.isRestarting = false;
    this.restartDelay = 100; // Adaptive delays
    this.isTogglingRecording = false; // Debouncing
  }
}
```

**Key Features:**
- Continuous recognition with automatic restarts
- Network error recovery with progressive delays
- Interim result preservation to prevent word loss
- Duplicate detection and word overlap prevention

#### 2. State Management
```javascript
// Centralized state tracking
this.currentTab = 'dashboard'; // dashboard | liveview | content | settings
this.isRecording = false;
this.currentSessionTranscript = '';
this.sessionTriggeredTips = new Set();
```

#### 3. UI Navigation System
- **Toggle-based Live View**: Switches between dashboard (hints) and live transcription
- **Debounced Controls**: 1000ms debounce on critical actions
- **Element Validation**: Comprehensive DOM element checking
- **Responsive Layout**: 360px optimized for Chrome sidebar

## 🎛️ Key Technical Improvements

### Speech Recognition Reliability
```javascript
// Prevent rapid state switching
async toggleRecording() {
  const now = Date.now();
  const debounceDelay = 1000;
  
  if (this.isTogglingRecording) return;
  if (now - this.lastToggleTime < debounceDelay) return;
  
  this.isTogglingRecording = true;
  // ... recording logic
}
```

### Live View Toggle Implementation
```javascript
toggleLiveView() {
  if (this.currentTab === 'liveview') {
    this.switchTab('dashboard'); // Back to hints
  } else {
    this.switchTab('liveview'); // To transcription
  }
}
```

### Event Listener Management
```javascript
// Prevent duplicate listeners
const newGetStartedBtn = getStartedBtn.cloneNode(true);
getStartedBtn.parentNode.replaceChild(newGetStartedBtn, getStartedBtn);
newGetStartedBtn.addEventListener('click', () => this.toggleRecording());
```

## 📐 UI Layout Specifications

### Dimensions
- **Total Width**: 360px (optimized for Chrome sidebar)
- **Content Areas**: max-width 300px
- **Live View**: max-width 320px  
- **Navigation Buttons**: 58px-66px width range
- **Button Padding**: 6px vertical, 10px horizontal

### CSS Architecture
```css
/* Responsive container */
.app-container {
  width: 360px;
  min-width: 360px;
  max-width: 360px;
}

/* Navigation optimization */
.nav-btn {
  min-width: 58px;
  max-width: 66px;
  padding: 6px 10px;
  flex: 1;
}
```

## 🔄 Navigation Flow

### Tab Structure
```
├── Dashboard (default)
│   ├── Welcome/Get Started
│   ├── Coaching Tips Display  
│   └── Session Controls
├── Live View (toggle target)
│   └── Real-time Transcription
├── Content Management
│   ├── Add Mappings
│   └── Existing Mappings List
└── Settings
    ├── LLM Configuration
    └── Data Management
```

### State Transitions
```
Dashboard ←→ Live View (toggle)
Dashboard → Content (direct)
Dashboard → Settings (direct)
Any Tab → Dashboard (record button always returns here)
```

## 🎙️ Speech Processing Pipeline

### 1. Recognition Setup
```javascript
recognition.continuous = true;
recognition.interimResults = true;
recognition.maxAlternatives = 1;
recognition.lang = 'en-US';
```

### 2. Result Processing
```javascript
recognition.onresult = async (event) => {
  this.lastSpeechTime = Date.now();
  await this.processResults(event);
  
  // Reset timeout on new speech
  if (this.recognitionTimeout) {
    clearTimeout(this.recognitionTimeout);
  }
  
  // 45-second no-speech timeout
  this.recognitionTimeout = setTimeout(() => {
    this.preserveInterimResults();
    this.recognition.stop();
  }, 45000);
};
```

### 3. Error Recovery
```javascript
recognition.onerror = (event) => {
  if (event.error === 'network') {
    this.networkErrorCount++;
    this.preserveInterimResults();
    // Auto-restart handled by onend
  } else if (event.error === 'not-allowed') {
    this.showPermissionHelp();
    this.stopRecording();
  }
};
```

### 4. Restart Logic
```javascript
recognition.onend = () => {
  if (this.isRecording && !this.isRestarting) {
    this.isRestarting = true;
    this.preserveInterimResults();
    
    // Adaptive delay: 100ms → 2000ms max
    const delay = Math.min(this.restartDelay * (1 + this.recoveryCount * 0.5), 2000);
    
    setTimeout(() => {
      if (this.isRecording && this.isRestarting) {
        this.recognition.start();
        this.recoveryCount++;
        this.isRestarting = false;
      }
    }, delay);
  }
};
```

## 🎯 Content Mapping System

### Data Structure
```javascript
{
  id: "unique-identifier",
  type: "objection|closing|competitive|hint|keyword",
  keywords: ["price", "cost", "expensive", "budget"],
  content: "Focus on value and ROI. Ask about cost of inaction."
}
```

### Matching Algorithm
```javascript
checkForCoachingTips(transcript) {
  const words = transcript.toLowerCase().split(/\s+/);
  
  this.contentMappings.forEach(mapping => {
    const matchedKeywords = mapping.keywords.filter(keyword =>
      words.some(word => word.includes(keyword.toLowerCase()))
    );
    
    if (matchedKeywords.length > 0 && !this.sessionTriggeredTips.has(mapping.id)) {
      this.showCoachingTip(mapping, matchedKeywords);
      this.sessionTriggeredTips.add(mapping.id);
    }
  });
}
```

## 🔐 Security & Privacy

### Data Storage
- **Local Only**: All data stored in Chrome's local storage
- **No External Transmission**: Transcripts never leave device (except user-configured LLM calls)
- **Encrypted Keys**: API keys encrypted in Chrome's secure storage
- **No Analytics**: Zero tracking or data collection

### Permission Model
```json
{
  "permissions": [
    "activeTab",
    "sidePanel", 
    "storage"
  ],
  "host_permissions": [
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ]
}
```

## 🚀 Performance Optimizations

### Memory Management
- **Circular Buffer**: Prevents memory leaks during long sessions
- **Lazy Loading**: UI components loaded on-demand
- **Debounced Updates**: Prevents excessive DOM manipulation

### Network Efficiency
- **Batched Requests**: Multiple interim results combined
- **Connection Pooling**: Reuse HTTP connections for LLM calls
- **Timeout Management**: Aggressive timeouts prevent hanging requests

### UI Responsiveness
- **RAF-based Animations**: Smooth 60fps animations using requestAnimationFrame
- **Virtual Scrolling**: Efficient handling of large transcript lists
- **CSS Containment**: Isolated rendering contexts for performance

## 🧪 Testing & Debugging

### Console Logging
```javascript
console.log('🚀 HEADS UP EXTENSION LOADED - sidepanel.js v2.1');
console.log('🎯 TOGGLE RECORDING clicked, current state:', this.isRecording);
console.log('🔄 Switching to tab: ${tabName}');
```

### Element Validation
```javascript
validateElements() {
  const requiredElements = [
    'recordBtn', 'clearBtn', 'saveBtn', 'getStartedBtn', 
    'statusIndicator', 'coachingContent', 'transcriptionArea'
  ];
  
  let missingRequired = [];
  requiredElements.forEach(id => {
    if (!document.getElementById(id)) {
      missingRequired.push(id);
    }
  });
  
  if (missingRequired.length > 0) {
    console.error('❌ Missing required elements:', missingRequired);
  }
}
```

### Debug Commands
```javascript
// Available in console during development
window.headsup = {
  getState: () => app.isRecording,
  getCurrentTab: () => app.currentTab,
  validateUI: () => app.validateElements(),
  exportData: () => app.exportAllData()
};
```

## 🔄 Build & Release Process

### Version Management
- Semantic versioning (v1.0.5)
- Automated changelog generation
- Git tags for release tracking

### Extension Packaging
```bash
# Create release package
cd extension/
zip -r ../headsup-extension-v1.0.5.zip . -x ".*" "*.log"
```

### Quality Assurance
- Manual testing on Chrome stable/beta/dev
- Cross-platform testing (Windows/Mac/Linux)  
- Performance profiling with Chrome DevTools
- Accessibility testing with screen readers

---

*This technical documentation is maintained alongside the codebase. For user documentation, see [README.md](README.md).*