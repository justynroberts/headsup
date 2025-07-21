# Heads Up - AI Sales Coach Chrome Extension

Real-time AI-powered sales coaching with speech transcription directly in your browser.

## Features

🎤 **Real-time Speech Recognition** - Live transcription of your conversations  
🧠 **AI Coaching** - Intelligent suggestions based on conversation context  
📝 **Session Management** - Save and export conversation transcripts  
⚡ **Quick Access** - Side panel for easy access while browsing  
⌨️ **Keyboard Shortcuts** - Quick controls for recording and views  

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Heads Up AI Sales Coach"
3. Click "Add to Chrome"

### Developer Installation
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar

## Usage

### Getting Started
1. Click the Heads Up icon in your toolbar
2. Click "Open Panel" to access the main interface
3. Allow microphone permissions when prompted
4. Click the microphone button to start recording

### Keyboard Shortcuts
- **Ctrl+Shift+H** (Cmd+Shift+H on Mac): Toggle extension panel
- **Ctrl+Shift+R** (Cmd+Shift+R on Mac): Start/stop recording
- **Ctrl+Shift+L** (Cmd+Shift+L on Mac): Toggle live transcription view

### Features

#### Live Transcription
- Real-time speech-to-text conversion
- High accuracy with confidence scoring
- Automatic sentence detection and formatting

#### AI Coaching
- Detects conversation patterns and provides suggestions
- Handles price objections, competitive situations, and closing opportunities
- Custom content mappings for personalized coaching

#### Session Management
- Save conversation transcripts with metadata
- Export sessions as JSON files
- Search and review past conversations

## Privacy & Security

- **Local Processing**: Speech recognition uses your browser's built-in APIs
- **No Cloud Storage**: All data stays on your device
- **Microphone Access**: Only used during active recording sessions
- **Data Control**: You control what gets saved and exported

## Browser Compatibility

- **Chrome 114+**: Full support with side panel
- **Edge 114+**: Full support with side panel
- **Other Browsers**: Limited support (no side panel)

## Permissions Explained

- **Microphone**: Required for speech recognition
- **Storage**: Save your sessions and settings locally
- **Active Tab**: Access current tab for context
- **Notifications**: Show recording status updates

## Troubleshooting

### Microphone Not Working
1. Check browser permissions in `chrome://settings/content/microphone`
2. Ensure your microphone is working in other applications
3. Try refreshing the page and restarting the extension

### Speech Recognition Issues
1. Check your internet connection (required for Google's speech API)
2. Speak clearly and at normal volume
3. Reduce background noise

### Extension Not Loading
1. Check if you're using Chrome 114+ or Edge 114+
2. Ensure Developer mode is enabled if using unpacked extension
3. Try disabling and re-enabling the extension

## Development

### Project Structure
```
extension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── sidepanel.html      # Main UI
├── sidepanel.js        # Main functionality
├── popup.html          # Toolbar popup
├── popup.js            # Popup functionality
├── styles.css          # UI styling
└── icons/              # Extension icons
```

### Building
The extension is pure JavaScript/HTML/CSS with no build process required.

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues, feature requests, or questions:
- GitHub Issues: [Create an issue](https://github.com/your-repo/heads-up-extension/issues)
- Email: support@headsup.app

## License

MIT License - See LICENSE file for details

## Version History

### v1.0.0 (Current)
- Initial release
- Real-time speech transcription
- Basic AI coaching suggestions
- Session management
- Side panel interface
- Keyboard shortcuts