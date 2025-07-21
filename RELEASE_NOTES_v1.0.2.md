# Release v1.0.2 - Import/Export Fixes

## 🔧 What's Changed

### Fixed
- ✅ **Fixed sample configuration format** - Now properly imports with correct JSON structure
- ✅ **Corrected import compatibility** - Changed `llmSettings` to `llmConfig` to match extension expectations
- ✅ **Fixed content mapping structure** - Changed `response` to `content` property
- ✅ **Updated documentation** - USERGUIDE.md now shows correct JSON format

### Confirmed Working Features
- ✅ **Delete content mappings** - Click red "Delete" button next to any mapping
- ✅ **Import with replace/merge options** - Choose to replace existing or add new items only
- ✅ **Export all data** - Download complete configuration as JSON
- ✅ **Sample config import** - Works seamlessly with provided sample-config.json

## 📦 What's Included

- **Extension files** - Clean package with only essential Chrome extension files
- **sample-config.json** - Ready-to-import configuration with 5 sales coaching scenarios
  - Pricing objections
  - Competitor mentions
  - Decision timeline questions
  - Technical concerns
  - Authority checks

## 🚀 Installation

1. Download `headsup-extension-v1.0.2.zip`
2. Extract to a folder
3. Open Chrome → Extensions → Enable Developer Mode  
4. Click "Load unpacked" and select the extracted folder

## 🆕 Quick Start with Sample Config

1. Install the extension
2. Open Heads Up settings
3. Click "Import Data"
4. Select the included `sample-config.json`
5. Choose "Replace" to use the sample configuration
6. Add your OpenAI/Claude API key
7. Start coaching!

---

This release ensures the sample configuration works properly and all import/export features function as expected.