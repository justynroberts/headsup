console.log('🚀 HEADS UP EXTENSION LOADED - sidepanel.js v2.1 with improved network error handling');

class HeadsUp {
    constructor() {
        console.log('🏗️ HeadsUp constructor called');
        this.isRecording = false;
        this.recognition = null;
        this.audioContext = null;
        this.mediaStream = null;
        
        // Metrics
        this.wordCount = 0;
        this.sentenceCount = 0;
        this.confidenceSum = 0;
        this.confidenceCount = 0;
        this.sessionStartTime = null;
        this.sessionEndTime = null;
        this.sessionTimer = null;
        this.recordingStartTimestamp = null;
        this.recordingEndTimestamp = null;
        
        // Session data
        this.currentSessionTranscript = '';
        this.transcriptSegments = [];
        this.savedSessions = [];
        this.sessionTriggeredTips = new Set();
        this.contentMappings = [];
        this.lastLLMAnalysis = null;
        this.llmConfig = {
            provider: 'openai',
            apiKey: '',
            baseUrl: 'http://localhost:11434',
            model: 'gpt-3.5-turbo',
            prompt: 'Analyze this sales conversation transcript. Provide specific insights based ONLY on what is actually said in the transcript. Do not fill in gaps, assume context, or make up information. If key information is missing from the transcript, explicitly state that it is missing.\n\nAnalyze for:\n1. Strengths shown in the actual conversation\n2. Areas for improvement based on what was said\n3. Specific action items\n4. Missing information that would be helpful for analysis\n\nTranscript:\n{transcript}',
            autoAnalyze: 'ask'
        };
        
        // Live view toggle
        this.liveViewVisible = false;
        
        // Speech recognition management
        this.recognitionTimeout = null;
        this.lastSpeechTime = null;
        this.networkErrorCount = 0;
        this.recoveryCount = 0;
        
        // Interim result preservation
        this.currentInterimResults = new Map(); // Store interim results by index
        this.lastProcessedIndex = -1;
        
        this.setupEventListeners();
        this.initializeUI();
        this.loadFromStorage();
        this.initializeDefaults();
        
        // Set up periodic debug logging and state saving
        this.debugLogTimer = null;
        this.stateSaveTimer = null;
        
        // Set up background communication
        this.setupBackgroundCommunication();
        
        // Set up interim result preservation timer
        this.setupInterimPreservation();
    }

    setupEventListeners() {
        // Recording controls
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('liveViewToggle').addEventListener('click', () => this.toggleLiveView());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearSession());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveSession());
        document.getElementById('getStartedBtn').addEventListener('click', () => this.startRecording());
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeWithLLM());
        
        // Navigation switching
        document.querySelectorAll('.nav-button').forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });
        
        // Content management
        document.getElementById('addMappingBtn').addEventListener('click', () => this.addContentMapping());
        
        // LLM settings
        document.getElementById('llmProvider').addEventListener('change', (e) => this.updateLLMProvider(e.target.value));
        document.getElementById('saveLLMBtn').addEventListener('click', () => this.saveLLMSettings());
        
        // Data management
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importDataBtn').addEventListener('click', () => this.importData());
        document.getElementById('importFileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearData());
        
        // Content mappings toggle
        document.getElementById('mappingsToggle').addEventListener('click', () => this.toggleMappingsList());
        
        // LLM settings toggle
        document.getElementById('llmToggle').addEventListener('click', () => this.toggleLLMSettings());
        
        // Hide/Show UI controls
        document.getElementById('hideUIBtn').addEventListener('click', () => this.hideUI());
        document.getElementById('showUIBtn').addEventListener('click', () => this.showUI());
        
        // Copy/Save actions
        document.getElementById('copyTranscriptBtn').addEventListener('click', () => this.copyTranscript());
        document.getElementById('saveTranscriptBtn').addEventListener('click', () => this.saveTranscriptOnly());
        document.getElementById('copyLLMBtn').addEventListener('click', () => this.copyLLMAnalysis());
        document.getElementById('saveLLMAnalysisBtn').addEventListener('click', () => this.saveLLMAnalysis());
        document.getElementById('saveAllBtn').addEventListener('click', () => this.saveAll());
    }

    initializeUI() {
        this.updateUI();
        this.updateStatus('Ready');
    }

    async loadFromStorage() {
        try {
            const result = await chrome.storage.local.get([
                'savedSessions', 
                'contentMappings', 
                'llmConfig',
                'currentSessionState',
                'isRecording',
                'sessionStartTime',
                'currentSessionTranscript',
                'transcriptSegments',
                'sessionTriggeredTips'
            ]);
            
            this.savedSessions = result.savedSessions || [];
            this.contentMappings = result.contentMappings || [];
            this.llmConfig = { ...this.llmConfig, ...(result.llmConfig || {}) };
            
            // Restore session state if it exists
            if (result.currentSessionState) {
                console.log('🔄 Restoring previous session state...');
                this.isRecording = result.isRecording || false;
                this.sessionStartTime = result.sessionStartTime || null;
                this.currentSessionTranscript = result.currentSessionTranscript || '';
                this.transcriptSegments = result.transcriptSegments || [];
                this.sessionTriggeredTips = new Set(result.sessionTriggeredTips || []);
                
                // If we were recording, restore the recording state
                if (this.isRecording && this.sessionStartTime) {
                    console.log('🎙️ Resuming recording session...');
                    this.recordingStartTimestamp = new Date(this.sessionStartTime);
                    this.setupSpeechRecognition();
                    this.recognition.start();
                    this.startSessionTimer();
                    this.startPeriodicLogging();
                    this.updateStatus('Recording (resumed)', true);
                    this.updateUI();
                    
                    // Restore the transcript display
                    this.restoreTranscriptDisplay();
                    
                    // Show any existing coaching tips
                    this.restoreCoachingTips();
                } else if (this.currentSessionTranscript) {
                    // Restore transcript display even if not currently recording
                    console.log('🔄 Restoring transcript display for completed session...');
                    this.restoreTranscriptDisplay();
                }
            }
        } catch (error) {
            console.error('Failed to load from storage:', error);
            this.savedSessions = [];
            this.contentMappings = [];
        }
    }

    async saveToStorage() {
        try {
            const sessionData = {
                savedSessions: this.savedSessions,
                contentMappings: this.contentMappings,
                llmConfig: this.llmConfig
            };
            
            // Save current session state if recording
            if (this.isRecording) {
                sessionData.currentSessionState = true;
                sessionData.isRecording = this.isRecording;
                sessionData.sessionStartTime = this.sessionStartTime;
                sessionData.currentSessionTranscript = this.currentSessionTranscript;
                sessionData.transcriptSegments = this.transcriptSegments;
                sessionData.sessionTriggeredTips = Array.from(this.sessionTriggeredTips);
            } else {
                // Clear session state when not recording
                sessionData.currentSessionState = false;
            }
            
            await chrome.storage.local.set(sessionData);
        } catch (error) {
            console.error('Failed to save to storage:', error);
        }
    }

    async toggleRecording() {
        console.log('🎯 TOGGLE RECORDING clicked, current state:', this.isRecording);
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            console.log('🎙️ START RECORDING called');
            this.updateStatus('Requesting microphone access...');
            
            // Show helpful message about microphone permissions
            console.log('🎤 Requesting microphone access for extension side panel...');
            
            // Try direct microphone access - this should work in Chrome extensions
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.hidePermissionHelp();
            this.updateStatus('Setting up recognition...');
            this.setupSpeechRecognition();
            this.recognition.start();
            
            this.sessionStartTime = Date.now();
            this.recordingStartTimestamp = new Date();
            this.transcriptSegments = []; // Reset segments for new session
            this.startSessionTimer();
            this.startPeriodicLogging(); // Start debug logging
            this.startPeriodicStateSaving(); // Start state saving
            this.updateStatus('Recording', true);
            this.clearTranscription();
            
            // Save initial state
            await this.saveSessionState();
            
            // Log initial state
            this.logTranscriptState('RECORDING_START');
            
            // Notify background service that recording started
            try {
                await chrome.runtime.sendMessage({ 
                    action: 'recording-started',
                    sessionStartTime: this.sessionStartTime 
                });
                console.log('📡 Background service notified of recording start');
            } catch (error) {
                console.log('📡 Could not notify background service:', error);
            }
            
        } catch (error) {
            console.error('Recording error:', error);
            this.updateStatus('Microphone access denied');
            
            let errorMessage = 'Microphone access failed.\n\n';
            
            if (error.name === 'NotAllowedError') {
                this.showPermissionHelp();
                errorMessage += 'Please click the microphone icon 🎤 in your address bar and allow access.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No microphone found. Please connect a microphone and try again.';
            } else {
                errorMessage += `Error: ${error.message}`;
            }
            
            alert(errorMessage);
        }
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            alert('Speech recognition not supported. Please use Chrome or Edge.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateUI();
        };

        this.recognition.onresult = async (event) => {
            this.lastSpeechTime = Date.now();
            await this.processResults(event);
            
            // Reset timeout on new speech
            if (this.recognitionTimeout) {
                clearTimeout(this.recognitionTimeout);
            }
            
            // Set timeout to restart if no speech for 30 seconds
            this.recognitionTimeout = setTimeout(() => {
                if (this.isRecording) {
                    console.log('No speech detected for 30s, restarting...');
                    this.recognition.stop();
                }
            }, 30000);
        };

        this.recognition.onend = () => {
            console.log('🔚 Speech recognition ended');
            if (this.isRecording) {
                console.log('🔄 Still recording - preserving interim results and restarting recognition...');
                
                // Preserve any interim results before restarting
                this.preserveInterimResults();
                // Create a new recognition instance to avoid issues
                setTimeout(() => {
                    if (this.isRecording) {
                        try {
                            // Try simple restart first
                            this.recognition.start();
                            console.log('✅ Recognition restarted successfully');
                            this.updateStatus('Recording (restarted)', true);
                        } catch (error) {
                            console.error('⚠️ Simple restart failed:', error);
                            // If simple restart fails, create new instance
                            try {
                                console.log('🔧 Creating new recognition instance...');
                                this.setupSpeechRecognition();
                                this.recognition.start();
                                console.log('✅ Created new recognition instance');
                                this.updateStatus('Recording (recovered)', true);
                            } catch (error2) {
                                console.error('❌ Full restart failed:', error2);
                                this.updateStatus('Recognition failed - click to retry');
                            }
                        }
                    }
                }, 200); // Slightly longer delay for stability
            }
        };

        this.recognition.onerror = (event) => {
            // Don't log "no-speech" as an error - it's normal when user isn't speaking
            if (event.error !== 'no-speech') {
                console.error('❌ Speech recognition error:', event.error, event);
            }
            
            if (event.error === 'not-allowed') {
                this.showPermissionHelp();
                this.updateStatus('Microphone permission denied');
                // Don't await here as we're in an event handler
                this.stopRecording().catch(err => console.error('Error stopping recording:', err));
            } else if (event.error === 'network') {
                this.networkErrorCount++;
                console.log(`⚠️ Network error #${this.networkErrorCount} - skipping this segment but continuing recording`);
                // Don't restart - just skip this error and let recognition continue
                // The onend handler will restart if needed
                this.updateStatus(`Recording (${this.networkErrorCount} network errors skipped)`, true);
            } else if (event.error === 'no-speech') {
                console.log('⏸️ No speech detected - this is normal, continuing...');
                // No-speech is normal when user isn't speaking, don't stop recording
                // Just continue listening
            } else if (event.error === 'aborted') {
                console.log('🛑 Recognition aborted, preserving interim results and restarting...');
                if (this.isRecording) {
                    this.preserveInterimResults();
                    setTimeout(() => {
                        if (this.isRecording) {
                            this.recognition.stop();
                        }
                    }, 500);
                }
            } else {
                console.error('🚨 Unknown speech recognition error:', event.error);
                // For unknown errors, preserve interim results and try to restart
                if (this.isRecording) {
                    this.preserveInterimResults();
                    setTimeout(() => {
                        if (this.isRecording) {
                            console.log('🔄 Restarting after unknown error...');
                            this.recognition.stop();
                        }
                    }, 1000);
                }
            }
        };
    }

    async processResults(event) {
        try {
            const results = event.results;
            const resultIndex = event.resultIndex;
            
            console.log(`🔍 PROCESSING: ${results.length} total results, new results starting from index ${resultIndex}`);
            
            // Process ONLY the new results (starting from resultIndex)
            for (let i = resultIndex; i < results.length; i++) {
                const result = results[i];
                if (!result || !result[0]) {
                    console.log(`⚠️ SKIP: Empty result at index ${i}`);
                    continue;
                }
                
                const transcript = result[0].transcript;
                const confidence = result[0].confidence || 0.9;
                const isFinal = result.isFinal;
                
                // Skip empty transcripts
                if (!transcript || transcript.trim().length === 0) {
                    console.log(`⚠️ SKIP: Empty transcript at index ${i}`);
                    continue;
                }
                
                const wordCount = transcript.trim().split(/\s+/).filter(w => w.length > 0).length;
                console.log(`📝 [${isFinal ? 'FINAL' : 'INTERIM'}] "${transcript}" (${wordCount} words, conf: ${confidence.toFixed(2)})`);
                
                if (isFinal) {
                    // Remove this result from interim storage since it's now final
                    this.currentInterimResults.delete(i);
                    console.log(`🔒 PROCESSING FINAL SEGMENT: "${transcript}"`);
                    
                    // Track state before adding
                    const beforeWords = this.currentSessionTranscript.split(/\s+/).filter(w => w.trim()).length;
                    const beforeSegments = this.transcriptSegments.length;
                    
                    // This is a finalized segment - save it permanently
                    this.addTranscript(transcript);
                    await this.saveTranscriptSegment(transcript); // Make sure it's awaited
                    this.analyzeForCoaching(transcript);
                    
                    // Track state after adding
                    const afterWords = this.currentSessionTranscript.split(/\s+/).filter(w => w.trim()).length;
                    const afterSegments = this.transcriptSegments.length;
                    
                    // Update metrics
                    const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
                    this.wordCount += words.length;
                    this.sentenceCount += (transcript.match(/[.!?]+/g) || []).length;
                    this.confidenceSum += confidence;
                    this.confidenceCount++;
                    
                    console.log(`✅ SAVED FINAL: "${transcript}"`);
                    console.log(`📊 Words: before=${beforeWords}, after=${afterWords}, added=${words.length}, metric=${this.wordCount}`);
                    console.log(`💾 Segments: before=${beforeSegments}, after=${afterSegments}`);
                    console.log(`📝 Current transcript length: ${this.currentSessionTranscript.length} chars`);
                } else {
                    // For interim results, store them but replace any previous interim for this index
                    this.currentInterimResults.set(i, {
                        transcript: transcript,
                        confidence: confidence,
                        timestamp: Date.now(),
                        wordCount: wordCount
                    });
                    console.log(`💾 STORED INTERIM: index ${i}, "${transcript}" (${wordCount} words)`);
                    
                    // REAL-TIME COACHING: Analyze interim results for immediate hints
                    this.analyzeForCoaching(transcript);
                }
                
                // Update live display (both interim and final)
                this.updateLiveTranscription(transcript, isFinal);
            }
            
            // Auto-save old interim results that haven't become final after 5 seconds
            this.autoSaveStaleInterims();
            
        } catch (error) {
            console.error('❌ Error processing speech results:', error);
        }
    }
    
    autoSaveStaleInterims() {
        const now = Date.now();
        const maxAge = 5000; // 5 seconds
        
        for (const [index, result] of this.currentInterimResults.entries()) {
            const age = now - result.timestamp;
            if (age > maxAge) {
                console.log(`⏰ AUTO-SAVING STALE INTERIM (${age}ms old): "${result.transcript}"`);
                
                // Save this stale interim as final to prevent loss
                this.addTranscript(result.transcript);
                this.saveTranscriptSegment(result.transcript).catch(err => 
                    console.error('Error saving stale interim:', err)
                );
                this.analyzeForCoaching(result.transcript);
                
                // Update metrics
                const words = result.transcript.trim().split(/\s+/).filter(w => w.length > 0);
                this.wordCount += words.length;
                this.confidenceSum += result.confidence;
                this.confidenceCount++;
                
                // Remove from interim results
                this.currentInterimResults.delete(index);
                console.log(`✅ STALE INTERIM SAVED AND REMOVED: "${result.transcript}"`);
            }
        }
    }
    
    preserveInterimResults() {
        if (this.currentInterimResults.size === 0) {
            console.log('📭 No interim results to preserve');
            return;
        }
        
        console.log(`🚨 PRESERVING ALL ${this.currentInterimResults.size} INTERIM RESULTS BEFORE RESTART`);
        
        // Save ALL interim results, not just the best one
        // Sort by index to maintain order
        const sortedResults = Array.from(this.currentInterimResults.entries()).sort((a, b) => a[0] - b[0]);
        
        for (const [index, result] of sortedResults) {
            if (result.transcript.trim()) {
                console.log(`💾 PRESERVING INTERIM #${index}: "${result.transcript}" (conf: ${result.confidence.toFixed(2)}, ${result.wordCount} words)`);
                
                // Save this interim result as final to prevent loss
                this.addTranscript(result.transcript);
                this.saveTranscriptSegment(result.transcript).catch(err => 
                    console.error('Error saving preserved interim:', err)
                );
                this.analyzeForCoaching(result.transcript);
                
                // Update metrics
                const words = result.transcript.trim().split(/\s+/).filter(w => w.length > 0);
                this.wordCount += words.length;
                this.confidenceSum += result.confidence;
                this.confidenceCount++;
                
                console.log(`✅ PRESERVED #${index}: "${result.transcript}" (${words.length} words)`);
            }
        }
        
        // Clear interim results after preserving
        this.currentInterimResults.clear();
        this.lastProcessedIndex = -1;
    }
    
    setupInterimPreservation() {
        // Check for old interim results every 10 seconds and preserve them
        setInterval(() => {
            if (!this.isRecording || this.currentInterimResults.size === 0) {
                return;
            }
            
            const now = Date.now();
            const maxAge = 15000; // 15 seconds
            
            // Check if any interim results are getting old
            for (const [index, result] of this.currentInterimResults.entries()) {
                if (now - result.timestamp > maxAge) {
                    console.log(`⏰ TIMEOUT: Preserving old interim result (${(now - result.timestamp)/1000}s old)`);
                    this.preserveInterimResults();
                    break; // Only preserve once per cycle
                }
            }
        }, 10000);
    }

    addTranscript(transcript) {
        const trimmedTranscript = transcript.trim();
        console.log(`🔄 ADD_TRANSCRIPT called with: "${trimmedTranscript}"`);
        
        if (!trimmedTranscript) {
            console.log(`⚠️ ADD_TRANSCRIPT: Empty transcript, skipping`);
            return;
        }
        
        const beforeLength = this.currentSessionTranscript.length;
        const beforeWords = this.currentSessionTranscript.split(/\s+/).filter(w => w.trim()).length;
        
        // Add space only if we already have content and don't end with space
        if (this.currentSessionTranscript && !this.currentSessionTranscript.endsWith(' ')) {
            this.currentSessionTranscript += ' ';
            console.log(`➕ Added space separator`);
        }
        
        // Add the new transcript
        this.currentSessionTranscript += trimmedTranscript;
        
        const afterLength = this.currentSessionTranscript.length;
        const afterWords = this.currentSessionTranscript.split(/\s+/).filter(w => w.trim()).length;
        const addedWords = trimmedTranscript.split(/\s+/).filter(w => w.trim()).length;
        
        console.log(`✅ ADD_TRANSCRIPT SUCCESS:`);
        console.log(`   Input: "${trimmedTranscript}" (${addedWords} words)`);
        console.log(`   Before: ${beforeLength} chars, ${beforeWords} words`);
        console.log(`   After: ${afterLength} chars, ${afterWords} words`);
        console.log(`   Expected word increase: ${addedWords}, Actual: ${afterWords - beforeWords}`);
        
        // Log full transcript periodically for debugging
        if (this.currentSessionTranscript.length > 100) {
            console.log(`📝 Current transcript preview: "${this.currentSessionTranscript.substring(0, 50)}...${this.currentSessionTranscript.substring(this.currentSessionTranscript.length - 50)}"`);
        } else {
            console.log(`📝 Full transcript: "${this.currentSessionTranscript}"`);
        }
        
        // Verify no corruption
        if (afterWords < beforeWords) {
            console.error(`🚨 WORD COUNT DECREASED! This should never happen. Before: ${beforeWords}, After: ${afterWords}`);
        }
    }

    updateLiveTranscription(transcript, isFinal) {
        const transcriptionArea = document.getElementById('transcriptionArea');
        const placeholder = transcriptionArea.querySelector('.transcription-placeholder');
        
        if (placeholder) {
            placeholder.remove();
        }
        
        // Remove any existing interim text
        const existingInterim = transcriptionArea.querySelector('.interim-text');
        if (existingInterim) {
            existingInterim.remove();
        }
        
        if (isFinal) {
            // Add final transcript as permanent text
            const transcriptDiv = document.createElement('div');
            transcriptDiv.className = 'transcription-text final-text';
            transcriptDiv.textContent = transcript;
            transcriptionArea.appendChild(transcriptDiv);
            
            // Don't remove any text - keep full transcript!
            // Only limit display for performance if we have too many elements
            const allTexts = transcriptionArea.querySelectorAll('.final-text');
            if (allTexts.length > 100) {
                // Only remove very old text if we have over 100 segments
                allTexts[0].remove();
            }
        } else {
            // Add interim transcript as temporary text
            const interimDiv = document.createElement('div');
            interimDiv.className = 'transcription-text interim-text';
            interimDiv.textContent = transcript;
            transcriptionArea.appendChild(interimDiv);
        }
        
        // Auto-scroll to bottom with smooth animation
        this.scrollToBottom(transcriptionArea);
    }

    scrollToBottom(element) {
        // Smooth scroll to bottom
        element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
        });
        
        // Also ensure parent live-content scrolls if needed
        const liveContent = element.closest('.live-content');
        if (liveContent) {
            liveContent.scrollTo({
                top: liveContent.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    analyzeForCoaching(text) {
        const lowerText = text.toLowerCase();
        
        // Normalize common business phrases for better detection
        const normalizedText = lowerText
            .replace(/\belastic\s+search\b/g, 'elasticsearch')
            .replace(/\bservice\s+now\b/g, 'servicenow')
            .replace(/\bsplunk\s+on[\s-]?call\b/g, 'splunk oncall')
            .replace(/\breturn\s+on\s+investment\b/g, 'roi')
            .replace(/\bmean\s+time\s+to\s+(recovery|resolution)\b/g, 'mttr')
            .replace(/\bservice\s+level\s+agreement\b/g, 'sla');

        console.log(`🔍 Analyzing text: "${text}" → normalized: "${normalizedText}"`);
        console.log(`📝 Available mappings: ${this.contentMappings.length}, Triggered: [${Array.from(this.sessionTriggeredTips).join(', ')}]`);

        // Check custom content mappings first (check both original and normalized)
        for (const mapping of this.contentMappings) {
            for (const keyword of mapping.keywords) {
                const keywordLower = keyword.toLowerCase();
                if ((lowerText.includes(keywordLower) || normalizedText.includes(keywordLower)) 
                    && !this.sessionTriggeredTips.has(mapping.id)) {
                    console.log(`✅ Triggered mapping for keyword: "${keyword}" in "${text}"`);
                    this.addCoachingTip(mapping.type, mapping.content, keyword, mapping.type);
                    this.sessionTriggeredTips.add(mapping.id);
                    return; // Only trigger one tip per analysis
                }
            }
        }

        // Default coaching rules
        if ((lowerText.includes('price') || lowerText.includes('cost')) && !this.sessionTriggeredTips.has('price')) {
            this.addCoachingTip('Price Objection', 'Focus on value and ROI. Ask about the cost of not solving the problem.');
            this.sessionTriggeredTips.add('price');
        }

        if ((lowerText.includes('think about') || lowerText.includes('consider')) && !this.sessionTriggeredTips.has('closing')) {
            this.addCoachingTip('Closing Opportunity', 'Perfect timing to address concerns and move forward.');
            this.sessionTriggeredTips.add('closing');
        }

        if ((lowerText.includes('competitor') || lowerText.includes('compare')) && !this.sessionTriggeredTips.has('competitive')) {
            this.addCoachingTip('Competitive Situation', 'Highlight unique differentiators and proven results.');
            this.sessionTriggeredTips.add('competitive');
        }
    }

    addCoachingTip(title, content, keyword = null, type = 'suggestion') {
        const coachingContent = document.getElementById('coachingContent');
        const welcomeMessage = coachingContent.querySelector('.welcome-message');
        
        if (welcomeMessage) {
            coachingContent.innerHTML = '<div class="coaching-tips"></div>';
        }
        
        let tipsContainer = coachingContent.querySelector('.coaching-tips');
        if (!tipsContainer) {
            coachingContent.innerHTML = '<div class="coaching-tips"></div>';
            tipsContainer = coachingContent.querySelector('.coaching-tips');
        }
        
        // Get icon and class based on type
        const iconInfo = this.getIconForType(type);
        
        const tipId = Date.now();
        const tip = document.createElement('div');
        tip.className = 'coaching-tip';
        tip.dataset.tipId = tipId;
        tip.innerHTML = `
            <div class="tip-header">
                <div class="tip-left">
                    <div class="tip-icon ${iconInfo.class}">
                        ${iconInfo.svg}
                    </div>
                    <div class="tip-title">${title}${keyword ? ` <span class="keyword">(${keyword.charAt(0).toUpperCase() + keyword.slice(1)})</span>` : ''}</div>
                </div>
                <button class="tip-dismiss tooltip" data-tip-id="${tipId}" data-tooltip="Thanks!">
                    <svg viewBox="0 0 24 24" fill="currentColor" style="width: 14px; height: 14px; pointer-events: none;">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                    </svg>
                </button>
            </div>
            <div class="tip-content">${content}</div>
        `;
        
        // Add new tip at the TOP (prepend) so latest is always visible
        tipsContainer.insertBefore(tip, tipsContainer.firstChild);
        
        // Add event listener for the dismiss button
        const dismissBtn = tip.querySelector('.tip-dismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismissTip(tipId);
            });
        }
        
        // Keep only last 5 tips
        const tips = coachingContent.querySelectorAll('.coaching-tip');
        if (tips.length > 5) {
            tips[0].remove();
        }
    }
    
    getIconForType(type) {
        const iconMap = {
            'competitive': {
                class: 'competitive',
                svg: '<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/><path d="M19 12L17.91 8.74L21 8L17.91 7.26L19 4L20.09 7.26L23 8L20.09 8.74L19 12Z"/></svg>'
            },
            'objection': {
                class: 'objection', 
                svg: '<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 10.1 14.1 11 13 11V22H11V11C9.9 11 9 10.1 9 9V7H3V9C3 10.1 2.1 11 1 11H0V13H1C2.1 13 3 12.1 3 11V9H9V11C9 12.1 9.9 13 11 13V22H13V13C14.1 13 15 12.1 15 11V9H21Z"/></svg>'
            },
            'closing': {
                class: 'closing',
                svg: '<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M9 16.17L5.53 12.7C5.14 12.31 4.51 12.31 4.12 12.7C3.73 13.09 3.73 13.72 4.12 14.11L8.3 18.29C8.69 18.68 9.32 18.68 9.71 18.29L20.29 7.71C20.68 7.32 20.68 6.69 20.29 6.3C19.9 5.91 19.27 5.91 18.88 6.3L9 16.17Z"/></svg>'
            },
            'hint': {
                class: 'hint',
                svg: '<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM12 20C10.9 20 10 19.1 10 18C10 16.9 10.9 16 12 16C13.1 16 14 16.9 14 18C14 19.1 13.1 20 12 20ZM12 7C13.1 7 14 7.9 14 9C14 10.1 13.1 11 12 11C10.9 11 10 10.1 10 9C10 7.9 10.9 7 12 7ZM12 12C13.1 12 14 12.9 14 14C14 15.1 13.1 16 12 16C10.9 16 10 15.1 10 14C10 12.9 10.9 12 12 12Z"/></svg>'
            },
            'keyword': {
                class: 'keyword',
                svg: '<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M6.5 10C7.3 10 8 9.3 8 8.5S7.3 7 6.5 7 5 7.7 5 8.5 5.7 10 6.5 10ZM9.5 10C10.3 10 11 9.3 11 8.5S10.3 7 9.5 7 8 7.7 8 8.5 8.7 10 9.5 10ZM6.5 13C7.3 13 8 12.3 8 11.5S7.3 10 6.5 10 5 10.7 5 11.5 5.7 13 6.5 13ZM9.5 13C10.3 13 11 12.3 11 11.5S10.3 10 9.5 10 8 10.7 8 11.5 8.7 13 9.5 13ZM15 7V9H21V7H15ZM15 10V12H21V10H15ZM15 13V15H21V13H15Z"/></svg>'
            },
            'suggestion': {
                class: 'suggestion',
                svg: '<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="white" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="white" stroke-width="2"/></svg>'
            },
            'analysis': {
                class: 'analysis',
                svg: '<svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M12 2L3.09 8.26L4 9L10.91 9.74L12 16L13.09 9.74L20 9L13.09 8.26L12 2Z"/><path d="M12 8C9.79 8 8 9.79 8 12S9.79 16 12 16 16 14.21 16 12 14.21 8 12 8Z"/></svg>'
            }
        };
        
        return iconMap[type] || iconMap['suggestion'];
    }
    
    formatLLMResponse(response) {
        if (!response || typeof response !== 'string') {
            return 'No analysis available - please check your LLM configuration.';
        }
        
        // Clean up the response and format it for display
        let formatted = response.trim();
        
        // Convert markdown-style formatting to HTML
        formatted = formatted
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
            .replace(/^### (.*$)/gm, '<h4>$1</h4>')           // H3 headers
            .replace(/^## (.*$)/gm, '<h3>$1</h3>')            // H2 headers
            .replace(/^# (.*$)/gm, '<h2>$1</h2>')             // H1 headers
            .replace(/^\d+\.\s/gm, '<br>• ')                  // Numbered lists to bullets
            .replace(/^-\s/gm, '<br>• ')                      // Dash lists to bullets
            .replace(/\n/g, '<br>')                           // Line breaks
            .replace(/<br><br>/g, '<br>');                    // Clean up double breaks
        
        // Add some structure if none exists
        if (!formatted.includes('<br>') && formatted.length > 100) {
            // Try to break up long paragraphs at sentence boundaries
            formatted = formatted.replace(/\.\s+/g, '.<br><br>');
        }
        
        return formatted;
    }
    
    restoreTranscriptDisplay() {
        console.log('🔄 Restoring transcript display...');
        
        if (this.currentSessionTranscript && this.currentSessionTranscript.trim()) {
            // Show the live view if we have transcript content
            const liveView = document.getElementById('liveView');
            if (liveView && liveView.classList.contains('collapsed')) {
                liveView.classList.remove('collapsed');
                this.liveViewVisible = true;
            }
            
            // Display the restored transcript segments
            const transcriptionArea = document.getElementById('transcriptionArea');
            const placeholder = transcriptionArea.querySelector('.transcription-placeholder');
            if (placeholder) {
                placeholder.remove();
            }
            
            // Clear existing content and rebuild from segments
            transcriptionArea.innerHTML = '';
            
            // Add each segment as a final transcript item
            this.transcriptSegments.forEach((segment, index) => {
                if (segment.text && segment.text.trim()) {
                    const transcriptDiv = document.createElement('div');
                    transcriptDiv.className = 'transcription-text final-text';
                    transcriptDiv.textContent = segment.text.trim();
                    transcriptionArea.appendChild(transcriptDiv);
                }
            });
            
            // Auto-scroll to bottom
            this.scrollToBottom(transcriptionArea);
            
            // Show analyze button if transcript exists and LLM is configured
            if (this.currentSessionTranscript.trim() && this.llmConfig.apiKey) {
                document.getElementById('analyzeBtn').style.display = 'block';
            }
            
            // Show transcript actions if there's content
            if (this.currentSessionTranscript.trim()) {
                document.getElementById('transcriptActions').style.display = 'flex';
            }
            
            console.log(`✅ Restored ${this.transcriptSegments.length} transcript segments to display`);
            console.log(`📝 Full transcript: "${this.currentSessionTranscript.substring(0, 100)}..."`);
        } else {
            console.log('📭 No transcript to restore');
        }
    }
    
    restoreCoachingTips() {
        console.log('🔄 Restoring coaching tips from previous session...');
        // Clear welcome message if present
        const coachingContent = document.getElementById('coachingContent');
        const welcomeMessage = coachingContent.querySelector('.welcome-message');
        if (welcomeMessage) {
            coachingContent.innerHTML = '<div class="coaching-tips"></div>';
        }
        
        // Note: Individual tips aren't restored as they would be retriggered
        // by the transcript analysis when speech recognition resumes
        console.log('✅ Coaching area prepared for restored session');
    }
    
    async saveSessionState() {
        // Save session state periodically during recording
        if (this.isRecording) {
            await this.saveToStorage();
        }
    }

    async stopRecording() {
        this.isRecording = false;
        this.recordingEndTimestamp = new Date();
        this.sessionEndTime = Date.now();
        
        if (this.recognition) {
            this.recognition.onend = null;
            this.recognition.stop();
            this.recognition = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        this.updateStatus('Recording stopped');
        this.updateUI();
        
        // Clear recognition timeout
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
            this.recognitionTimeout = null;
        }
        
        // Stop debug logging and state saving, log final state
        this.stopPeriodicLogging();
        this.stopPeriodicStateSaving();
        this.logTranscriptState('RECORDING_STOP');
        
        // Clear session state from storage
        await this.saveToStorage();
        
        // Show analytics and analyze button
        this.showSessionAnalytics();
        
        if (this.currentSessionTranscript.trim() && this.llmConfig.apiKey) {
            document.getElementById('analyzeBtn').style.display = 'block';
        }
        
        // Show transcript actions if there's content
        if (this.currentSessionTranscript.trim()) {
            document.getElementById('transcriptActions').style.display = 'flex';
        }
        
        // Notify background service that recording stopped
        try {
            await chrome.runtime.sendMessage({ action: 'recording-stopped' });
            console.log('📡 Background service notified of recording stop');
        } catch (error) {
            console.log('📡 Could not notify background service:', error);
        }
    }

    startSessionTimer() {
        this.sessionTimer = setInterval(() => {
            if (this.sessionStartTime) {
                const elapsed = Math.floor((Date.now() - this.sessionStartTime) / 1000);
                const minutes = Math.floor(elapsed / 60);
                const seconds = elapsed % 60;
                const timeString = `Recording ${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                this.updateStatus(timeString, true);
                
                // Also update hidden UI status if it's currently shown
                const hiddenStatus = document.getElementById('hiddenStatus');
                const hiddenUI = document.getElementById('hiddenStateUI');
                if (hiddenUI && hiddenUI.style.display === 'flex') {
                    hiddenStatus.textContent = timeString;
                }
            }
        }, 1000);
    }

    toggleLiveView() {
        const liveView = document.getElementById('liveView');
        const liveViewToggle = document.getElementById('liveViewToggle');
        const coachingSection = document.querySelector('.coaching-section');
        
        this.liveViewVisible = !this.liveViewVisible;
        
        if (this.liveViewVisible) {
            liveView.classList.remove('collapsed');
            liveViewToggle.classList.add('active');
            coachingSection.style.display = 'none';
        } else {
            liveView.classList.add('collapsed');
            liveViewToggle.classList.remove('active');
            coachingSection.style.display = 'flex';
        }
    }
    
    toggleMappingsList() {
        const mappingsList = document.getElementById('mappingsList');
        const toggleIcon = document.getElementById('mappingsToggleIcon');
        
        const isCollapsed = mappingsList.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Show the list
            mappingsList.classList.remove('collapsed');
            toggleIcon.classList.remove('collapsed');
        } else {
            // Hide the list
            mappingsList.classList.add('collapsed');
            toggleIcon.classList.add('collapsed');
        }
    }

    toggleLLMSettings() {
        const llmContent = document.getElementById('llmContent');
        const toggleIcon = document.getElementById('llmToggleIcon');
        
        const isCollapsed = llmContent.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Show the settings
            llmContent.classList.remove('collapsed');
            toggleIcon.classList.remove('collapsed');
        } else {
            // Hide the settings
            llmContent.classList.add('collapsed');
            toggleIcon.classList.add('collapsed');
        }
    }
    
    hideUI() {
        const mainUI = document.getElementById('mainUIContent');
        const hiddenUI = document.getElementById('hiddenStateUI');
        const hiddenStatus = document.getElementById('hiddenStatus');
        
        // Update hidden status based on recording state
        if (this.isRecording) {
            const elapsed = this.sessionStartTime ? Math.floor((Date.now() - this.sessionStartTime) / 1000) : 0;
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            hiddenStatus.textContent = `Recording ${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            hiddenStatus.textContent = 'Ready';
        }
        
        // Hide main UI and show hidden state
        mainUI.style.display = 'none';
        hiddenUI.style.display = 'flex';
        
        console.log('📱 UI hidden - recording continues in background');
    }
    
    showUI() {
        const mainUI = document.getElementById('mainUIContent');
        const hiddenUI = document.getElementById('hiddenStateUI');
        
        // Show main UI and hide hidden state
        hiddenUI.style.display = 'none';
        mainUI.style.display = 'flex';
        
        console.log('📱 UI restored');
    }

    clearSession() {
        if (confirm('Clear current session?')) {
            this.currentSessionTranscript = '';
            this.transcriptSegments = [];
            this.wordCount = 0;
            this.sentenceCount = 0;
            this.confidenceSum = 0;
            this.confidenceCount = 0;
            this.sessionStartTime = null;
            this.sessionEndTime = null;
            this.sessionTriggeredTips.clear();
            
            // Clear stored session if exists
            if (this.sessionStartTime) {
                const storageKey = `transcript_session_${this.sessionStartTime}`;
                chrome.storage.local.remove(storageKey);
            }
            
            // Reset transcription area
            const transcriptionArea = document.getElementById('transcriptionArea');
            transcriptionArea.innerHTML = '<div class="transcription-placeholder">Start recording to see live transcription...</div>';
            
            // Reset coaching content
            this.clearTranscription();
            this.updateStatus('Session cleared');
        }
    }

    clearTranscription() {
        const coachingContent = document.getElementById('coachingContent');
        coachingContent.innerHTML = `
            <div class="welcome-message">
                <img src="hint.jpeg" alt="Heads Up" style="width: 256px; height: 256px; border-radius: 16px; object-fit: cover; margin-bottom: 1rem;">
                <h3>Welcome to Heads Up</h3>
                <div class="version-info">v1.0.4</div>
                <p>Click the record button to start recording your conversation and get real-time coaching tips.</p>
                <button class="get-started-btn" id="getStartedBtn2">
                    <svg style="margin-right: 8px; width: 14px; height: 14px;" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                    Get Started
                </button>
            </div>
        `;
        
        // Re-add event listener for the new button
        document.getElementById('getStartedBtn2').addEventListener('click', () => this.startRecording());
        document.getElementById('analyzeBtn').style.display = 'none';
    }

    async saveSession() {
        console.log(`🗂️ SAVE_SESSION: Starting session save process`);
        
        // Always build full transcript from stored segments to ensure nothing is lost
        if (this.transcriptSegments.length > 0) {
            const segmentTranscript = this.transcriptSegments
                .map(segment => segment.text)
                .join(' ');
                
            const currentWords = this.currentSessionTranscript.split(/\s+/).filter(w => w.trim()).length;
            const segmentWords = segmentTranscript.split(/\s+/).filter(w => w.trim()).length;
            const totalSegmentWords = this.transcriptSegments.reduce((sum, seg) => sum + seg.wordCount, 0);
            
            console.log(`📊 TRANSCRIPT COMPARISON:`);
            console.log(`   Current transcript: ${this.currentSessionTranscript.length} chars, ${currentWords} words`);
            console.log(`   Segments transcript: ${segmentTranscript.length} chars, ${segmentWords} words`);
            console.log(`   Segment word counts sum: ${totalSegmentWords} words`);
            console.log(`   Number of segments: ${this.transcriptSegments.length}`);
            
            // Show detailed segment breakdown
            console.log(`🔍 SEGMENT BREAKDOWN:`);
            this.transcriptSegments.forEach((seg, idx) => {
                console.log(`   ${idx + 1}. "${seg.text}" (${seg.wordCount} words)`);
            });
            
            // Use the longer transcript to ensure we don't lose anything
            if (segmentTranscript.length > this.currentSessionTranscript.length) {
                console.log(`⚠️ Using segments transcript as it has more content (${segmentWords} vs ${currentWords} words)`);
                this.currentSessionTranscript = segmentTranscript;
            } else {
                console.log(`✅ Current transcript is longer or equal, keeping it (${currentWords} vs ${segmentWords} words)`);
            }
        }
        
        if (!this.currentSessionTranscript.trim()) {
            console.log(`❌ No session data to save`);
            alert('No session data to save.');
            return;
        }
        
        const finalWords = this.currentSessionTranscript.split(/\s+/).filter(w => w.trim()).length;
        console.log(`💾 SAVING FINAL TRANSCRIPT:`);
        console.log(`   Length: ${this.currentSessionTranscript.length} chars`);
        console.log(`   Words: ${finalWords}`);
        console.log(`   Preview: "${this.currentSessionTranscript.substring(0, 100)}..."`);
        console.log(`   Metric word count: ${this.wordCount}`);

        const sessionName = prompt('Enter a name for this session:', 
            `Session ${new Date().toLocaleDateString()}`);
        
        if (!sessionName) return;

        // Calculate session metrics
        const duration = this.sessionEndTime ? Math.floor((this.sessionEndTime - this.sessionStartTime) / 1000) : 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const avgConfidence = this.confidenceCount > 0 ? (this.confidenceSum / this.confidenceCount * 100).toFixed(1) : 0;
        const wordsPerMinute = duration > 0 ? Math.round((this.wordCount / duration) * 60) : 0;
        const coachingTipsTriggered = this.sessionTriggeredTips.size;

        // Create formatted text content
        const textContent = `# ${sessionName}

` +
            `**Date:** ${new Date().toLocaleString()}\n` +
            `**Duration:** ${minutes}:${seconds.toString().padStart(2, '0')}\n` +
            `**Words:** ${this.wordCount}\n` +
            `**Sentences:** ${this.sentenceCount}\n` +
            `**Words per Minute:** ${wordsPerMinute}\n` +
            `**Average Confidence:** ${avgConfidence}%\n` +
            `**Coaching Tips Triggered:** ${coachingTipsTriggered}\n\n` +
            `---\n\n` +
            `## Transcript\n\n` +
            `${this.currentSessionTranscript}\n\n` +
            `---\n\n` +
            `*Generated by Heads Up - AI Sales Coach*`;

        // Create and download text file
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sessionName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        
        alert(`Session "${sessionName}" saved as text file!`);
        this.clearSession();
    }

    updateStatus(message, isRecording = false) {
        const statusText = document.querySelector('.status-text');
        const statusIcon = document.querySelector('.status-icon');
        const statusIndicator = document.getElementById('statusIndicator');
        
        if (statusText) statusText.textContent = message;
        
        if (isRecording) {
            statusIndicator.classList.add('recording');
        } else {
            statusIndicator.classList.remove('recording');
        }
    }

    updateUI() {
        const recordBtn = document.getElementById('recordBtn');
        const recordIcon = document.getElementById('recordIcon');
        
        if (this.isRecording) {
            recordBtn.classList.add('recording');
            recordIcon.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
            recordBtn.setAttribute('data-tooltip', 'Stop Recording');
        } else {
            recordBtn.classList.remove('recording');
            recordIcon.innerHTML = '<circle cx="12" cy="12" r="8"/>';
            recordBtn.setAttribute('data-tooltip', 'Start Recording');
        }
    }

    showPermissionHelp() {
        document.getElementById('permissionHelp').style.display = 'block';
    }

    hidePermissionHelp() {
        document.getElementById('permissionHelp').style.display = 'none';
    }

    // Navigation Management
    switchTab(tabName) {
        // Update navigation buttons
        document.querySelectorAll('.nav-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    // Content Management
    addContentMapping() {
        const type = document.getElementById('mappingType').value;
        const keywords = document.getElementById('mappingKeywords').value.trim();
        const content = document.getElementById('mappingContent').value.trim();

        if (!keywords || !content) {
            alert('Please enter both keywords and coaching response.');
            return;
        }

        const mapping = {
            id: Date.now(),
            type: type,
            keywords: keywords.split(',').map(k => k.trim()),
            content: content
        };

        this.contentMappings.push(mapping);
        this.saveToStorage();
        this.renderContentMappings();

        // Clear form
        document.getElementById('mappingKeywords').value = '';
        document.getElementById('mappingContent').value = '';

        alert('Content mapping added successfully!');
    }

    renderContentMappings() {
        const container = document.getElementById('mappingsList');
        
        if (this.contentMappings.length === 0) {
            container.innerHTML = '<div style="color: #666; font-style: italic; text-align: center; padding: 20px;">No content mappings yet. Add one above to get started.</div>';
            return;
        }

        container.innerHTML = this.contentMappings.map(mapping => `
            <div class="content-mapping">
                <div class="mapping-header">
                    <div class="mapping-type">${mapping.type}</div>
                    <button class="delete-btn" onclick="app.deleteMapping(${mapping.id})">Delete</button>
                </div>
                <div class="mapping-keywords">Keywords: ${mapping.keywords.join(', ')}</div>
                <div class="mapping-content">${mapping.content}</div>
            </div>
        `).join('');
    }

    deleteMapping(id) {
        if (confirm('Delete this content mapping?')) {
            this.contentMappings = this.contentMappings.filter(m => m.id !== id);
            this.saveToStorage();
            this.renderContentMappings();
        }
    }

    // LLM Settings
    updateLLMProvider(provider) {
        const baseUrlGroup = document.getElementById('baseUrlGroup');
        baseUrlGroup.style.display = provider === 'ollama' ? 'block' : 'none';

        // Update model placeholder
        const modelInput = document.getElementById('llmModel');
        switch(provider) {
            case 'openai':
                modelInput.placeholder = 'gpt-3.5-turbo';
                break;
            case 'claude':
                modelInput.placeholder = 'claude-3-sonnet-20240229';
                break;
            case 'ollama':
                modelInput.placeholder = 'llama2';
                break;
        }
    }

    saveLLMSettings() {
        this.llmConfig = {
            provider: document.getElementById('llmProvider').value,
            apiKey: document.getElementById('llmApiKey').value,
            baseUrl: document.getElementById('llmBaseUrl').value,
            model: document.getElementById('llmModel').value,
            prompt: document.getElementById('llmPrompt').value,
            autoAnalyze: document.getElementById('autoAnalyze').value
        };

        this.saveToStorage();
        alert('LLM settings saved successfully!');
    }

    async analyzeWithLLM() {
        console.log('🤖 LLM Analysis initiated');
        
        if (!this.llmConfig.apiKey) {
            alert('Please configure your LLM settings first in the Settings tab.');
            return;
        }

        if (!this.currentSessionTranscript.trim()) {
            alert('No transcript to analyze.');
            return;
        }
        
        console.log(`📄 Transcript length: ${this.currentSessionTranscript.length} characters`);
        console.log(`🔧 Using provider: ${this.llmConfig.provider}`);
        console.log(`🔧 Using model: ${this.llmConfig.model}`);

        try {
            const prompt = this.llmConfig.prompt.replace('{transcript}', this.currentSessionTranscript);
            console.log(`📝 Generated prompt length: ${prompt.length} characters`);

            this.updateStatus('Analyzing with LLM...');

            // Send request to background service worker
            console.log('📡 Sending LLM request to background service worker...');
            const result = await chrome.runtime.sendMessage({
                action: 'analyze-with-llm',
                config: this.llmConfig,
                prompt: prompt
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to get response from background service');
            }

            const response = result.response;
            console.log(`✅ LLM Response received: ${response?.length || 0} characters`);
            console.log(`📊 Response preview: "${response?.substring(0, 100)}..."`);

            // Store the raw response for saving
            this.lastLLMAnalysis = response;
            
            // Format the LLM response for better display
            const formattedResponse = this.formatLLMResponse(response);
            this.addCoachingTip('🤖 LLM Analysis', formattedResponse, null, 'analysis');
            this.updateStatus('Analysis complete');
            
            // Show save/copy buttons for LLM analysis
            this.showLLMActionButtons();

        } catch (error) {
            console.error('❌ LLM Analysis Error:', error);
            this.updateStatus('Analysis failed');
            
            // Show more detailed error information
            const errorMessage = error.message || 'Unknown error occurred';
            console.error('Full error details:', error);
            alert(`Failed to analyze transcript: ${errorMessage}\n\nCheck the console for more details.`);
        }
    }

    initializeDefaults() {
        // Set LLM form values
        document.getElementById('llmProvider').value = this.llmConfig.provider;
        document.getElementById('llmApiKey').value = this.llmConfig.apiKey;
        document.getElementById('llmBaseUrl').value = this.llmConfig.baseUrl;
        document.getElementById('llmModel').value = this.llmConfig.model;
        document.getElementById('llmPrompt').value = this.llmConfig.prompt;
        document.getElementById('autoAnalyze').value = this.llmConfig.autoAnalyze;

        // Trigger provider change to show/hide base URL
        this.updateLLMProvider(this.llmConfig.provider);

        // Render content mappings
        this.renderContentMappings();
    }

    exportData() {
        const data = {
            contentMappings: this.contentMappings,
            llmConfig: { ...this.llmConfig, apiKey: '' }, // Don't export API key
            exportDate: new Date().toISOString(),
            version: '1.0',
            type: 'heads-up-content-pack'
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `headsup-content-pack-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        alert('Content pack exported as JSON file!');
    }

    async clearData() {
        if (confirm('Clear all data including content mappings and LLM settings? This cannot be undone.')) {
            await chrome.storage.local.clear();
            this.contentMappings = [];
            this.llmConfig = {
                provider: 'openai',
                apiKey: '',
                baseUrl: 'http://localhost:11434',
                model: 'gpt-3.5-turbo',
                prompt: 'Analyze this sales conversation and provide insights about strengths, areas for improvement, and action items:\n\n{transcript}',
                autoAnalyze: 'ask'
            };
            this.initializeDefaults();
            alert('All data cleared.');
        }
    }

    dismissTip(tipId) {
        console.log('👍 Dismissing tip:', tipId);
        const tip = document.querySelector(`.coaching-tip[data-tip-id="${tipId}"]`);
        if (tip) {
            console.log('✅ Found tip element, removing with animation');
            tip.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                tip.remove();
                console.log('🗑️ Tip removed successfully');
            }, 300);
        } else {
            console.error('❌ Could not find tip element with ID:', tipId);
        }
    }

    importData() {
        document.getElementById('importFileInput').click();
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Only accept JSON files for content import
        if (!file.name.toLowerCase().endsWith('.json')) {
            alert('Please select a JSON file for importing content packs.');
            event.target.value = '';
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate data structure
            if (!data.contentMappings && !data.llmConfig) {
                throw new Error('Invalid content pack format. Expected content mappings or LLM configuration.');
            }

            // Additional validation for content pack format
            if (data.type && !data.type.includes('content-pack')) {
                throw new Error('This file is not a valid content pack format.');
            }

            let importCount = 0;
            let importDetails = [];

            // Import content mappings
            if (data.contentMappings && Array.isArray(data.contentMappings)) {
                // Ask user how to handle existing mappings
                const action = await this.askImportAction('content mappings', data.contentMappings.length);
                
                if (action === 'replace') {
                    this.contentMappings = data.contentMappings;
                    importCount += data.contentMappings.length;
                    importDetails.push(`Replaced ${data.contentMappings.length} content mappings`);
                } else if (action === 'merge') {
                    // Merge, avoiding duplicates based on keywords
                    const existingKeywords = new Set(
                        this.contentMappings.flatMap(m => m.keywords.map(k => k.toLowerCase()))
                    );
                    
                    let newMappings = 0;
                    data.contentMappings.forEach(mapping => {
                        const hasOverlap = mapping.keywords.some(k => 
                            existingKeywords.has(k.toLowerCase())
                        );
                        
                        if (!hasOverlap) {
                            mapping.id = Date.now() + Math.random(); // Ensure unique ID
                            this.contentMappings.push(mapping);
                            newMappings++;
                        }
                    });
                    
                    importCount += newMappings;
                    importDetails.push(`Added ${newMappings} new content mappings`);
                }
            }

            // Import LLM config (but not API key for security)
            if (data.llmConfig) {
                const action = await this.askImportAction('LLM settings', 1);
                
                if (action === 'replace' || action === 'merge') {
                    const currentApiKey = this.llmConfig.apiKey; // Preserve current API key
                    this.llmConfig = { ...data.llmConfig, apiKey: currentApiKey };
                    importDetails.push('Updated LLM configuration (API key preserved)');
                }
            }

            // Save to storage
            await this.saveToStorage();
            
            // Update UI
            this.renderContentMappings();
            this.initializeDefaults();

            // Show success message
            alert(`Import successful!\n\n${importDetails.join('\n')}\n\nData imported from: ${file.name}`);

        } catch (error) {
            console.error('Import error:', error);
            alert(`Failed to import data: ${error.message}`);
        }

        // Clear file input
        event.target.value = '';
    }

    async askImportAction(itemType, count) {
        return new Promise((resolve) => {
            const action = confirm(
                `Found ${count} ${itemType} to import.\n\n` +
                'Click OK to REPLACE existing data, or Cancel to MERGE (add new items only).'
            );
            resolve(action ? 'replace' : 'merge');
        });
    }

    async saveTranscriptSegment(segment) {
        try {
            console.log(`💾 SAVE_SEGMENT called with: "${segment}"`);
            
            const segmentWordCount = segment.split(/\s+/).filter(w => w.trim()).length;
            const beforeSegmentCount = this.transcriptSegments.length;
            
            // Add to segments array
            const segmentData = {
                text: segment,
                timestamp: new Date().toISOString(),
                wordCount: segmentWordCount
            };
            
            this.transcriptSegments.push(segmentData);
            
            // Save to chrome storage with current session ID
            const sessionId = this.sessionStartTime || Date.now();
            const storageKey = `transcript_session_${sessionId}`;
            
            const storageData = {
                segments: this.transcriptSegments,
                lastUpdated: new Date().toISOString(),
                wordCount: this.wordCount,
                startTime: this.recordingStartTimestamp
            };
            
            await chrome.storage.local.set({
                [storageKey]: storageData
            });
            
            console.log(`✅ SAVE_SEGMENT SUCCESS:`);
            console.log(`   Segment: "${segment}" (${segmentWordCount} words)`);
            console.log(`   Segments count: ${beforeSegmentCount} → ${this.transcriptSegments.length}`);
            console.log(`   Storage key: ${storageKey}`);
            
            // Verify storage by checking total words in segments
            const totalSegmentWords = this.transcriptSegments.reduce((sum, seg) => sum + seg.wordCount, 0);
            console.log(`   Total words in segments: ${totalSegmentWords}`);
            
        } catch (error) {
            console.error('❌ Failed to save transcript segment:', error);
            // Don't stop recording on save failure
        }
    }

    showSessionAnalytics() {
        if (!this.sessionStartTime || !this.sessionEndTime) return;
        
        const duration = Math.floor((this.sessionEndTime - this.sessionStartTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const avgConfidence = this.confidenceCount > 0 ? (this.confidenceSum / this.confidenceCount * 100).toFixed(1) : 0;
        const wordsPerMinute = duration > 0 ? Math.round((this.wordCount / duration) * 60) : 0;
        const coachingTipsTriggered = this.sessionTriggeredTips.size;
        
        const analyticsHtml = `
            <div class="session-analytics">
                <div class="analytics-header">
                    <svg style="width: 18px; height: 18px; margin-right: 8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4m0-6V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4"/>
                        <path d="M9 11v6"/>
                    </svg>
                    Session Analytics
                </div>
                <div class="analytics-grid">
                    <div class="analytics-item">
                        <div class="analytics-value">${minutes}:${seconds.toString().padStart(2, '0')}</div>
                        <div class="analytics-label">Duration</div>
                    </div>
                    <div class="analytics-item">
                        <div class="analytics-value">${this.wordCount}</div>
                        <div class="analytics-label">Words</div>
                    </div>
                    <div class="analytics-item">
                        <div class="analytics-value">${this.sentenceCount}</div>
                        <div class="analytics-label">Sentences</div>
                    </div>
                    <div class="analytics-item">
                        <div class="analytics-value">${wordsPerMinute}</div>
                        <div class="analytics-label">WPM</div>
                    </div>
                    <div class="analytics-item">
                        <div class="analytics-value">${avgConfidence}%</div>
                        <div class="analytics-label">Confidence</div>
                    </div>
                    <div class="analytics-item">
                        <div class="analytics-value">${coachingTipsTriggered}</div>
                        <div class="analytics-label">Tips</div>
                    </div>
                </div>
            </div>
        `;
        
        const coachingContent = document.getElementById('coachingContent');
        const existingAnalytics = coachingContent.querySelector('.session-analytics');
        if (existingAnalytics) {
            existingAnalytics.remove();
        }
        
        // Insert analytics at the top
        coachingContent.insertAdjacentHTML('afterbegin', analyticsHtml);
    }
    
    logTranscriptState(context = 'DEBUG') {
        console.log(`\n🔍 TRANSCRIPT STATE [${context}] ${new Date().toISOString()}`);
        console.log(`══════════════════════════════════════════════════════════════════════`);
        
        // Current transcript state
        const currentWords = this.currentSessionTranscript.split(/\s+/).filter(w => w.trim()).length;
        console.log(`📄 CURRENT TRANSCRIPT:`);
        console.log(`   Length: ${this.currentSessionTranscript.length} chars`);
        console.log(`   Words: ${currentWords}`);
        console.log(`   Content: "${this.currentSessionTranscript.substring(0, 100)}${this.currentSessionTranscript.length > 100 ? '...' : ''}"`);
        
        // Segments state
        console.log(`\n💾 SEGMENTS (${this.transcriptSegments.length} total):`);
        const totalSegmentWords = this.transcriptSegments.reduce((sum, seg) => sum + seg.wordCount, 0);
        const segmentTranscript = this.transcriptSegments.map(seg => seg.text).join(' ');
        const actualSegmentWords = segmentTranscript.split(/\s+/).filter(w => w.trim()).length;
        
        console.log(`   Total word count (calculated): ${totalSegmentWords}`);
        console.log(`   Total word count (actual): ${actualSegmentWords}`);
        console.log(`   Combined length: ${segmentTranscript.length} chars`);
        
        // Show recent segments
        const recentSegments = this.transcriptSegments.slice(-5);
        console.log(`   Recent segments (last 5):`);
        recentSegments.forEach((seg, idx) => {
            const actualSegIdx = this.transcriptSegments.length - 5 + idx;
            console.log(`     ${actualSegIdx + 1}. "${seg.text}" (recorded: ${seg.wordCount}, actual: ${seg.text.split(/\s+/).filter(w => w.trim()).length} words)`);
        });
        
        // Metrics state
        console.log(`\n📊 METRICS:`);
        console.log(`   Word count metric: ${this.wordCount}`);
        console.log(`   Session start: ${this.sessionStartTime}`);
        console.log(`   Recording: ${this.isRecording}`);
        
        // Discrepancy analysis
        console.log(`\n⚠️ DISCREPANCY ANALYSIS:`);
        console.log(`   Current vs Segments words: ${currentWords} vs ${actualSegmentWords} (diff: ${currentWords - actualSegmentWords})`);
        console.log(`   Current vs Metric words: ${currentWords} vs ${this.wordCount} (diff: ${currentWords - this.wordCount})`);
        console.log(`   Segments vs Metric words: ${actualSegmentWords} vs ${this.wordCount} (diff: ${actualSegmentWords - this.wordCount})`);
        
        console.log(`══════════════════════════════════════════════════════════════════════\n`);
    }
    
    startPeriodicLogging() {
        if (this.debugLogTimer) {
            clearInterval(this.debugLogTimer);
        }
        
        // Log state every 30 seconds during recording
        this.debugLogTimer = setInterval(() => {
            if (this.isRecording) {
                this.logTranscriptState('PERIODIC');
            }
        }, 30000);
    }
    
    stopPeriodicLogging() {
        if (this.debugLogTimer) {
            clearInterval(this.debugLogTimer);
            this.debugLogTimer = null;
        }
    }
    
    startPeriodicStateSaving() {
        if (this.stateSaveTimer) {
            clearInterval(this.stateSaveTimer);
        }
        
        // Save session state every 10 seconds during recording
        this.stateSaveTimer = setInterval(async () => {
            if (this.isRecording) {
                await this.saveSessionState();
                console.log('💾 Session state saved automatically');
            }
        }, 10000);
    }
    
    stopPeriodicStateSaving() {
        if (this.stateSaveTimer) {
            clearInterval(this.stateSaveTimer);
            this.stateSaveTimer = null;
        }
    }
    
    setupBackgroundCommunication() {
        // Listen for messages from background service worker
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('📨 Sidepanel received message:', request.action);
            
            if (request.action === 'toggle-recording') {
                this.toggleRecording();
                sendResponse({ success: true });
            }
            else if (request.action === 'toggle-live-view') {
                this.toggleLiveView();
                sendResponse({ success: true });
            }
            else if (request.action === 'background-heartbeat') {
                // Background service is keeping us alive
                console.log('💓 Background heartbeat received');
                sendResponse({ success: true, recording: this.isRecording });
            }
            
            return true; // Keep message channel open for async response
        });
        
        // Get initial persistent state from background
        this.checkBackgroundState();
    }
    
    async checkBackgroundState() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'get-persistent-state' });
            if (response && response.state && response.state.isRecording) {
                console.log('🔄 Background indicates recording is active, syncing state...');
                // Background says we should be recording, ensure our state matches
                if (!this.isRecording) {
                    // Restore recording state from background
                    this.isRecording = true;
                    this.sessionStartTime = response.state.sessionStartTime;
                    this.setupSpeechRecognition();
                    this.recognition.start();
                    this.startSessionTimer();
                    this.startPeriodicLogging();
                    this.updateStatus('Recording (background sync)', true);
                    this.updateUI();
                    
                    // Force reload latest transcript data and display
                    await this.loadFromStorage();
                    this.restoreTranscriptDisplay();
                }
            }
        } catch (error) {
            console.log('📡 Background communication not available (expected during first load)');
        }
    }
    
    // Copy/Save functionality
    copyTranscript() {
        if (!this.currentSessionTranscript) {
            alert('No transcript to copy');
            return;
        }
        
        navigator.clipboard.writeText(this.currentSessionTranscript).then(() => {
            this.showToast('📋 Transcript copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy transcript');
        });
    }
    
    copyLLMAnalysis() {
        if (!this.lastLLMAnalysis) {
            alert('No analysis to copy');
            return;
        }
        
        navigator.clipboard.writeText(this.lastLLMAnalysis).then(() => {
            this.showToast('📋 Analysis copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Failed to copy analysis');
        });
    }
    
    saveTranscriptOnly() {
        if (!this.currentSessionTranscript) {
            alert('No transcript to save');
            return;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `transcript_${timestamp}.txt`;
        
        const blob = new Blob([this.currentSessionTranscript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showToast('💾 Transcript saved!');
    }
    
    saveLLMAnalysis() {
        if (!this.lastLLMAnalysis) {
            alert('No analysis to save');
            return;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `llm_analysis_${timestamp}.txt`;
        
        const blob = new Blob([this.lastLLMAnalysis], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showToast('💾 Analysis saved!');
    }
    
    saveAll() {
        if (!this.currentSessionTranscript || !this.lastLLMAnalysis) {
            alert('Missing transcript or analysis');
            return;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `heads_up_session_${timestamp}.txt`;
        
        const content = `# Heads Up Session Report
Generated: ${new Date().toLocaleString()}

## Session Metrics
Words: ${this.wordCount}
Duration: ${this.sessionEndTime ? Math.floor((this.sessionEndTime - this.sessionStartTime) / 1000) : 0} seconds

## Transcript
${this.currentSessionTranscript}

## LLM Analysis
${this.lastLLMAnalysis}

---
Generated by Heads Up - AI Sales Coach`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        this.showToast('📦 Complete session saved!');
    }
    
    showLLMActionButtons() {
        document.getElementById('llmActions').style.display = 'flex';
    }
    
    showToast(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Global app instance for inline event handlers
let app;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    app = new HeadsUp();
});

// Initialize when script loads if DOM is already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!app) {
            app = new HeadsUp();
        }
    });
} else {
    app = new HeadsUp();
}