# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Heads Up is a Chrome extension that provides real-time AI sales coaching during video calls. It uses speech recognition to transcribe conversations and provides instant coaching hints based on trigger words.

## Key Architecture

### Core Components
- **sidepanel.js**: Main application logic (~2000+ lines). Contains the HeadsUp class that manages speech recognition, coaching logic, and LLM integration
- **background.js**: Service worker that handles API calls to bypass CORS restrictions
- **manifest.json**: Chrome extension configuration (Manifest V3)

### Technology Stack
- Pure vanilla JavaScript (no build tools, no npm/node)
- Chrome Extension APIs (sidePanel, storage, scripting)
- Web Speech API for transcription
- Direct file loading (no bundlers)

## Development Commands

### Loading the Extension
```bash
# No build process - load directly in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the /extension directory
```

### Creating a Release
```bash
# Package extension (from project root)
cd extension && zip -r ../headsup-extension-v1.0.X.zip . && cd ..
zip headsup-extension-v1.0.X.zip sample-config.json

# Create GitHub release
git tag v1.0.X
gh release create v1.0.X headsup-extension-v1.0.X.zip --title "Version 1.0.X" --notes "Release notes here"
```

### Testing Changes
- Reload extension in Chrome after file changes
- Open Chrome DevTools for the side panel to see console logs
- Test keywords: "expensive", "competitor", "timeline"

## Important Development Notes

### Version Updates
When updating version, change in ALL these locations:
1. `extension/manifest.json` - "version" field
2. `extension/sidepanel.html` - footer (2 occurrences)
3. `extension/sidepanel.js` - VERSION constant
4. `sample-config.json` - version field

### No Build Process
- **No package.json or npm scripts** - this is pure vanilla JavaScript
- **No linting/testing commands** - manual testing only
- **Direct file editing** - changes take effect after extension reload

### Core Features to Maintain
1. **Speech Recognition**: Continuous recognition with auto-restart on errors
2. **Coaching Triggers**: Keyword-based system in `processTranscript()`
3. **LLM Integration**: Background worker handles API calls
4. **Data Persistence**: All data in Chrome local storage

### Debugging
- Extensive console logging with emojis: `🎙️` (speech), `📝` (transcript), `🔍` (analysis), `💾` (storage)
- Check Chrome DevTools console in side panel context
- Background worker has separate console (inspect service worker)

## Common Tasks

### Adding New Coaching Triggers
Edit the configuration in the UI or modify `sample-config.json` and re-import

### Modifying LLM Prompts
Update prompt templates in sidepanel.js `analyzeConversation()` method

### Fixing Speech Recognition Issues
Check `startListening()` and error handlers in sidepanel.js - auto-restart logic is critical

### Updating UI Styles
Edit `styles.css` - uses modern CSS with dark theme and glass morphism effects

## Critical Implementation Details

### Speech Recognition State Management
- Interim results must be preserved between recognition restarts
- Network errors trigger automatic reconnection
- Session tracking prevents duplicate coaching tips

### Chrome Storage Limits
- 10MB total for chrome.storage.local
- Automatic backup rotation at 5 backups
- Transcript chunks stored separately to avoid single-key limits

### API Integration Pattern
All external API calls go through background.js to avoid CORS:
```javascript
// In sidepanel.js
chrome.runtime.sendMessage({
    type: 'apiRequest',
    // ... request details
});

// Handled in background.js
```

## File Structure Reference
```
extension/
├── manifest.json      # Extension config
├── background.js      # Service worker
├── sidepanel.js       # Main app logic
├── sidepanel.html     # UI structure
├── styles.css         # Styling
└── icons/            # Extension icons
```