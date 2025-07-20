# Coachly - AI-Powered Sales Coach

Coachly is a real-time AI sales coaching application that provides instant feedback and guidance during sales conversations. It uses advanced speech recognition to transcribe conversations and provides contextual coaching suggestions based on customizable content mappings.

## Features

- <™ **Real-Time Speech Transcription**: Live transcription with flowing word display
- > **AI Coaching Insights**: Instant coaching suggestions based on conversation context
- <¯ **Content Mapping System**: Create custom coaching responses for specific keywords
- = **Fuzzy Matching**: Intelligent keyword detection that handles variations
- < **Professional Dark UI**: Modern, Uber-style interface optimized for sales professionals
- =¾ **Persistent Storage**: All content mappings are saved locally

## Quick Start

1. **Open the App**: Simply open `coachly.html` in your web browser (Chrome or Safari recommended)
2. **Grant Microphone Access**: Click "Start Recording" and allow microphone permissions
3. **Start Speaking**: Your words will appear in real-time in the live view
4. **Receive Coaching**: AI coaching cards will appear based on your conversation

## Content Mapping System

### What is Content Mapping?

Content mapping allows you to define custom coaching responses that trigger when specific keywords or phrases are detected in conversation.

### Types of Content Mappings

- =¡ **Hint**: General coaching tips and reminders
- <¯ **Competitive Intelligence**: Information about competitors
- = **Keyword Response**: Specific responses to key terms
- =á **Objection Handler**: Strategies for handling customer objections
- > **Closing Technique**: Sales closing strategies

### Creating Content Mappings

1. Click the **"Content Map"** button in the header
2. Select a mapping type from the dropdown
3. Enter keywords (comma-separated) that should trigger the coaching
4. Write your coaching content (HTML and emojis supported)
5. Enable fuzzy matching for flexible keyword detection
6. Click **"Add Mapping"**

### Fuzzy Matching

When enabled, fuzzy matching will detect variations of your keywords:
- "IncidentIO" matches "Incident IO", "incident-io", "incidentio"
- Handles spaces, hyphens, underscores, and case variations
- Uses advanced algorithms to catch similar spellings

## User Interface

### Main Components

1. **Header**: 
   - Start/Stop recording controls
   - Live view toggle
   - Content mapping configuration

2. **Live View** (Collapsible):
   - Real-time word flow display
   - Session metrics (words, sentences, confidence, duration)
   - Visual speech feedback

3. **Coaching Section**:
   - AI coaching cards with contextual advice
   - Shows which keyword triggered each suggestion
   - Maximum of 6 cards displayed at once

### Keyboard Shortcuts

- **Space**: Start/Stop recording (when button is focused)
- **Escape**: Close content mapping panel

## Best Practices

1. **Speak Naturally**: The system works best with natural speech patterns
2. **Create Specific Mappings**: More specific keywords lead to better coaching
3. **Use HTML Formatting**: Make your coaching content rich with formatting and emojis
4. **Test Your Mappings**: Speak the keywords to ensure they trigger correctly
5. **Review and Refine**: Regularly update your content mappings based on real conversations

## Technical Requirements

- **Browser**: Chrome or Safari (latest versions)
- **Microphone**: Any standard microphone
- **Internet**: Required for initial load only (works offline after loading)

## Privacy & Security

- All speech processing happens locally in your browser
- No audio is sent to external servers
- Content mappings are stored in browser localStorage
- Complete privacy for sensitive sales conversations

## Troubleshooting

### Microphone Not Working
- Ensure microphone permissions are granted
- Check system audio settings
- Try refreshing the page

### No Transcription Appearing
- Speak clearly and at normal volume
- Check the audio level indicator
- Ensure no other apps are using the microphone

### Content Mappings Not Triggering
- Verify keywords are spelled correctly
- Enable fuzzy matching for more flexibility
- Check that mappings are saved (visible in the list)

## Support

For issues or feature requests, please contact your system administrator or the Coachly development team.

---

**Coachly** - Empowering sales professionals with real-time AI coaching