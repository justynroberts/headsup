<p align="center">
  <img src="extension/hint.jpeg" alt="Heads Up" width="300">
</p>

# Heads Up - Developer Guide

## 🛠️ Development Setup

### Prerequisites
- Chrome browser with Developer mode enabled
- Basic understanding of Chrome Extensions Manifest V3
- Node.js (optional, for any future build tools)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/justynroberts/headsup.git
   cd headsup
   ```

2. **Load extension in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/` folder

3. **Make changes:**
   - Edit files in the `extension/` directory
   - Click "Reload" on the extension to see changes

## 📁 Project Structure

```
headsup/
├── extension/              # Chrome extension source
│   ├── manifest.json       # Extension configuration
│   ├── background.js       # Service worker for API calls
│   ├── sidepanel.js        # Main application logic
│   ├── sidepanel.html      # Side panel UI
│   ├── styles.css          # Application styling
│   ├── icons/              # Extension icons (16, 32, 48, 128px)
│   └── hint.jpeg           # Welcome screen image
├── sample-config.json      # Example configuration
├── images/                 # Documentation images
├── README.md               # User documentation
└── DEVELOPERS.md           # This file
```

## 🔧 Key Components

### Core Architecture

**Manifest V3 Extension:**
- **Service Worker** (`background.js`) - Handles API calls, bypasses CORS
- **Side Panel** (`sidepanel.html/js`) - Main UI and logic
- **Storage API** - Chrome local storage for persistence
- **Speech Recognition** - Web Speech API for real-time transcription

### Main Classes & Functions

**HeadsUp Class** (`sidepanel.js`)
```javascript
class HeadsUp {
    // Core transcription
    async startRecording()
    async stopRecording()
    async processResults(event)
    
    // Coaching logic
    analyzeForCoaching(text)
    addCoachingTip(title, content, keyword, type)
    
    // Content management
    addContentMapping()
    renderContentMappings()
    
    // Storage & persistence
    async saveToStorage()
    async loadFromStorage()
    async restoreFromBackup()
}
```

## 🎯 Key Features Implementation

### Real-Time Speech Recognition
- Uses Web Speech API with continuous recognition
- Handles interim and final results differently
- Auto-restarts on network errors or timeouts
- Preserves interim results to prevent data loss

### Coaching System
- Keyword matching with case-insensitive regex
- Custom content mappings stored in Chrome storage
- Real-time analysis on both interim and final speech results
- Session-based tip triggering (prevents duplicates)

### LLM Integration
- Background service worker handles API calls to bypass CORS
- Support for OpenAI, Claude (Anthropic), and Ollama
- Configurable prompts and models
- Secure API key storage

### Data Persistence
- Chrome storage API for settings and transcripts
- Automatic backup system with timestamp rotation
- Recovery mechanism for lost data during updates
- Export/import functionality for configuration sharing

## 🚀 Build & Release Process

### Version Management
Update version in these files:
- `extension/manifest.json` - Extension version
- `extension/sidepanel.html` - UI display (2 locations)
- `extension/sidepanel.js` - Storage version tracking
- `sample-config.json` - Config version

### Creating a Release
```bash
# 1. Update version numbers in files above
# 2. Create extension package
cd extension
zip -r ../headsup-extension-v1.0.X.zip .
cd ..
zip headsup-extension-v1.0.X.zip sample-config.json

# 3. Create GitHub release
git tag v1.0.X
git push origin v1.0.X
gh release create v1.0.X headsup-extension-v1.0.X.zip --title "Version 1.0.X" --notes "Release notes..."
```

## 🔍 Debugging

### Chrome DevTools
- **Side Panel**: Right-click → Inspect → Console/Sources
- **Service Worker**: Extensions page → "service worker" link → Console
- **Storage**: Application tab → Storage → Extension storage

### Debug Logging
The extension includes extensive console logging:
- `🎙️` - Recording events
- `📝` - Transcription processing  
- `🔍` - Coaching analysis
- `💾` - Storage operations
- `📡` - Background service communication

### Common Issues
- **Speech recognition**: Check microphone permissions
- **API calls**: Verify background service worker is active
- **Storage**: Check Chrome extension storage limits
- **CORS**: All API calls must go through background.js

## 🧪 Testing

### Manual Testing Checklist
- [ ] Install from zip works
- [ ] Microphone permission granted
- [ ] Speech recognition starts/stops
- [ ] Coaching hints appear for test keywords
- [ ] Import/export configuration works
- [ ] LLM API calls work (if configured)
- [ ] Data persists through extension reload

### Test Keywords
Use these for quick testing:
- "expensive" → Price objection coaching
- "competitor" → Competitive response
- "timeline" → Closing opportunity

## 🔐 Security Considerations

### Permissions
- `activeTab` - Required for side panel
- `sidePanel` - Chrome side panel API
- `storage` - Local data persistence
- `scripting` - Future content script capability

### Host Permissions
- `fonts.googleapis.com` - Web fonts
- `api.openai.com` - OpenAI API calls
- `api.anthropic.com` - Claude API calls

### Data Handling
- All user data stored locally in Chrome
- API keys encrypted in Chrome storage
- No telemetry or external data collection
- Transcripts never sent to servers (except for LLM analysis if configured)

## 🤝 Contributing

### Code Style
- Use async/await for promises
- Extensive console logging for debugging
- Comment complex logic blocks
- Follow Chrome extension best practices

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Test thoroughly in Chrome
4. Update documentation if needed
5. Submit pull request with clear description

### Issue Reporting
Include in bug reports:
- Chrome version
- Extension version  
- Console error messages
- Steps to reproduce

---

## 📚 Additional Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/sidePanel/)