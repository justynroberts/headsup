# Heads Up - AI-Powered Sales Coach

Heads Up is a real-time AI sales coaching application that provides instant feedback and guidance during sales conversations. Built with Electron for cross-platform desktop deployment.

## Features

- 🎙️ **Real-Time Speech Transcription**: Live transcription with flowing word display
- 🤖 **AI Coaching Insights**: Instant coaching suggestions based on conversation context
- 🎯 **Content Mapping System**: Create custom coaching responses for specific keywords
- 🔍 **Fuzzy Matching**: Intelligent keyword detection that handles variations
- 🌙 **Professional Dark UI**: Modern interface optimized for sales professionals
- 💾 **Persistent Storage**: All content mappings and sessions saved locally
- 🤖 **LLM Integration**: Support for OpenAI, Claude, and Ollama for advanced analysis
- ⚡ **Auto-Updates**: Seamless updates through GitHub releases

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Or use the dev script
node scripts/dev.js
```

### Building

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux

# Or use the build script
node scripts/build.js [platform]
```

### Installation

1. **Download**: Get the latest release from [GitHub Releases](https://github.com/your-username/heads-up/releases)
2. **Install**: 
   - **macOS**: Open the `.dmg` file and drag to Applications
   - **Windows**: Run the `.exe` installer
   - **Linux**: Use the `.AppImage`, `.deb`, or `.rpm` package

## Usage

### Getting Started

1. **Launch Heads Up** from your applications
2. **Grant microphone access** when prompted
3. **Click "Start Recording"** to begin live transcription
4. **Configure content mappings** for custom coaching responses

### Content Mapping

1. Click the **Settings** icon in the sidebar
2. Select **"Content Map"** to configure coaching responses
3. Choose mapping type (Hint, Competitive Intel, Objection Handler, etc.)
4. Enter keywords that should trigger the coaching
5. Write your coaching content (HTML and emojis supported)
6. Enable fuzzy matching for flexible keyword detection

### LLM Integration

1. Go to **Settings** → **LLM Settings**
2. Choose your provider (OpenAI, Claude, or Ollama)
3. Enter your API key and configure the model
4. Set auto-summarize preference:
   - **Never**: No LLM analysis
   - **Ask each time**: Manual button appears
   - **Always**: Automatic analysis after each session

### Keyboard Shortcuts

- **⌘/Ctrl + R**: Start/Stop recording
- **⌘/Ctrl + L**: Toggle live view
- **⌘/Ctrl + M**: Toggle content mapping
- **⌘/Ctrl + S**: Save session
- **⌘/Ctrl + Shift + H**: Hide/Show window

## Development

### Project Structure

```
heads-up/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Preload script for security
│   └── index.html       # Main application UI
├── assets/              # Icons and resources
├── build/              # Build configuration
├── scripts/            # Build and dev scripts
├── .github/workflows/  # CI/CD configuration
└── dist/              # Built applications
```

### Tech Stack

- **Electron**: Cross-platform desktop framework
- **Vanilla JavaScript**: No frameworks, pure ES6+
- **Web Speech API**: Real-time speech recognition
- **Feather Icons**: Clean, consistent iconography
- **Electron Builder**: Packaging and distribution
- **GitHub Actions**: Automated builds and releases

### Building for Production

The build process creates native installers for all platforms:

```bash
# Build all platforms (requires appropriate OS)
npm run build

# Build specific platform
npm run build:mac    # macOS .dmg and .zip
npm run build:win    # Windows .exe installer
npm run build:linux  # Linux .AppImage, .deb, .rpm
```

### Release Process

1. **Update version** in `package.json`
2. **Create git tag**: `git tag v1.0.0`
3. **Push tag**: `git push origin v1.0.0`
4. **GitHub Actions** will automatically build and create a release

## Configuration

### Environment Variables

- `NODE_ENV`: Set to 'development' for dev mode
- `GH_TOKEN`: GitHub token for releases (CI only)

### Storage

- **Settings**: Stored in Electron's app data directory
- **Sessions**: Saved to localStorage with optional file export
- **Content Mappings**: Persistent across app restarts

## Privacy & Security

- **Local Processing**: All speech recognition happens locally
- **No External Servers**: Audio never leaves your device
- **Secure Storage**: Settings encrypted using Electron Store
- **Code Signing**: Apps are signed for security (production builds)

## Troubleshooting

### Common Issues

**Microphone not working:**
- Check system permissions in Security & Privacy
- Restart the app after granting permissions
- Ensure no other apps are using the microphone

**App won't start:**
- Check if you have the latest version
- Try deleting app data and restarting
- Run from terminal to see error messages

**Build issues:**
- Ensure Node.js 18+ is installed
- Clear `node_modules` and reinstall
- Check platform-specific requirements

### Logs

- **macOS**: `~/Library/Logs/Heads Up/`
- **Windows**: `%USERPROFILE%\\AppData\\Roaming\\Heads Up\\logs\\`
- **Linux**: `~/.config/Heads Up/logs/`

## Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/heads-up/issues)
- **Documentation**: This README and in-app tutorial
- **Updates**: Automatic through the app or manual download

---

**Heads Up** - Empowering sales professionals with real-time AI coaching