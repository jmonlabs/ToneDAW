class ToneDAW {
    /**
     * Convert a synth object to an instrument definition for the DAW UI.
     * Mirrors logic from jmonTone._convertSynthToInstrument.
     * @param {Object} synth
     * @returns {Object}
     */
    convertSynthToInstrument(synth) {
        if (!synth || typeof synth !== 'object') return { type: 'synthesizer', engine: 'synth', parameters: {} };
        if (synth.type === 'Sampler') {
            return {
                type: 'sampler',
                samples: synth.urls || {},
                baseUrl: synth.baseUrl || '',
                sampleProcessing: synth.sampleManipulation || {}
            };        } else if (synth.type === 'Custom') {
            return {
                type: 'synthesizer',
                engine: 'custom',
                parameters: {
                    oscillator: synth.oscillator || {},
                    envelope: synth.envelope || {}
                }
            };
        } else if (synth.type === 'PolySynth' && synth.voice) {
            // Handle PolySynth by using the voice type instead
            return {
                type: 'synthesizer',
                engine: synth.voice.toLowerCase(),
                parameters: synth
            };
        } else {
            return {
                type: 'synthesizer',
                engine: synth.type?.toLowerCase() || 'synth',
                parameters: synth
            };
        }
    }
    /**
     * Parse a simple duration string (e.g., '4n', '8t', 0.5) into seconds.
     * Supports:
     *   - Numeric seconds (number or numeric string)
     *   - Standard musical durations (e.g., '4n', '8t', '1m') using Tone.js if available
     * Falls back to 0.5s if unrecognized.
     * @param {string|number} duration
     * @returns {number} Duration in seconds
     */
    _parseSimpleDuration(duration) {
        if (typeof duration === 'number') return duration;
        if (!duration) return 0.5;
        // Numeric string
        if (!isNaN(duration)) return parseFloat(duration);
        // Musical duration string (e.g., '4n', '8t', '1m')
        if (typeof Tone !== 'undefined' && Tone.Time) {
            try {
                return Tone.Time(duration).toSeconds();
            } catch (e) {
                // Fallback below
            }
        }
        return 0.5;
    }
    /**
     * Debug scaling calculations (safe no-op if not needed)
     * @param {...any} args
     */
    debugScaling(...args) {
        // You can add more detailed logging here if needed
        if (this.options && this.options.debugScaling) {
            console.log('[ToneDAW scaling debug]', ...args);
        }
        // Otherwise, do nothing
    }
    /**
     * Parse a simple time string (e.g., '4n', '2:2', 1.5) into seconds.
     * Supports:
     *   - Numeric seconds (number or numeric string)
     *   - Bar:beat notation (e.g., '2:2')
     *   - Standard musical time (e.g., '4n', '8t', '1m') using Tone.js if available
     * Falls back to 0 if unrecognized.
     * @param {string|number} time
     * @returns {number} Time in seconds
     */
    _parseSimpleTime(time) {
        if (typeof time === 'number') return time;
        if (!time) return 0;
        // Numeric string
        if (!isNaN(time)) return parseFloat(time);
        // Bar:beat (optionally :sixteenth)
        if (typeof time === 'string' && time.includes(':')) {
            const parts = time.split(':').map(Number);
            // Assume 4/4 time signature
            const bars = parts[0] || 0;
            const beats = parts[1] || 0;
            const sixteenths = parts[2] || 0;
            // 1 bar = 4 beats, 1 beat = 1 quarter note, 1 sixteenth = 1/4 beat
            const totalBeats = bars * 4 + beats + sixteenths / 4;
            const bpm = this.transport?.bpm?.value || 120;
            return (60 / bpm) * totalBeats;
        }
        // Musical time string (e.g., '4n', '8t', '1m')
        if (typeof Tone !== 'undefined' && Tone.Time) {
            try {
                return Tone.Time(time).toSeconds();
            } catch (e) {
                // Fallback below
            }
        }
        return 0;
    }
    constructor(containerId, projectData, options = {}) {
        this.container = document.getElementById(containerId);
        this.rawProjectData = projectData; // Store original data
        this.options = options;        this.pixelsPerSecond = 40; // Dynamic value - will be calculated (more conservative default)
        this.minPixelsPerSecond = 5; // Very reduced minimum scale for very long compositions
        this.maxPixelsPerSecond = 200; // Maximum scale to prevent excessive width        this.autoScale = true; // Enable dynamic scaling by default
        this.showDebugButton = options.showDebugButton === true; // Hide debug button by default (can be enabled)
        this.loopStyle = options.loopStyle || 'hatched'; // 'dashed-icon', 'hatched', 'gradient', 'double-border'
        this.tracks = [];
        this.synths = [];
        this.parts = [];
        this.transport = Tone.Transport;
        this.playing = false;
        this.animationId = null; // Track animation frame ID
        this.manualMuteStates = new Map(); // Store manual mute states independently from solo
        
        // Process project data based on format
        this.projectData = this.processProjectData(projectData);
        this.init();
    }    /**
     * Process project data - Tone.js native format is primary, jmon-tone is secondary
     * @param {Object} data - Raw project data (Tone.js objects or jmon-tone format)
     * @returns {Object} Tone.js-compatible project data
     */
    processProjectData(data) {
        // Check if data is in jmon-tone format (secondary support)
        if (data.format === "jmonTone" || data.format === "jmon-tone") {
            console.log('🎵 ToneDAW: jmon-tone format detected, converting to Tone.js format...');
            
            // Check if jmon-tone.js is available
            if (typeof jmonTone === 'undefined') {
                console.error('❌ jmon-tone.js not found! Please include the jmon-tone.js library for jmon-tone format support.');
                throw new Error('jmon-tone.js library is required for jmon-tone format conversion');
            }
            
            // Validate the jmon-tone data
            const validation = jmonTone.validate(data);
            if (!validation.success) {
                console.warn('⚠️ jmon-tone validation warnings:', validation.warnings);
                console.error('❌ jmon-tone validation errors:', validation.errors);
                if (validation.errors.length > 0) {
                    throw new Error('Invalid jmon-tone format: ' + validation.errors.join(', '));
                }
            }
            
            // Convert to Tone.js format
            const convertedData = jmonTone.convertToToneFormat(data);
            console.log('✅ ToneDAW: jmon-tone converted to Tone.js format');
            return convertedData;
        } else {
            console.log('🎹 ToneDAW: Using native Tone.js format');
            return data;
        }    }

    /**
     * Convert legacy synth format to jmon-tone instrument format
     * @param {Object} synth - Legacy synth configuration    /**
     * Convert MIDI note number to note name (e.g., 60 -> "C4")
     * Uses jmon-tone.js if available, otherwise fallback to local implementation
     * @param {number} midiNote - MIDI note number (0-127)
     * @returns {string} Note name (e.g., "C4", "A#3")
     */
    midiNoteToNoteName(midiNote) {
        // Use jmon-tone.js if available
        if (typeof jmonTone !== 'undefined') {
            return jmonTone.midiNoteToNoteName(midiNote);
        }
        
        // Fallback to local implementation
        if (typeof midiNote !== 'number' || midiNote < 0 || midiNote > 127) {
            console.warn(`Invalid MIDI note number: ${midiNote}. Must be 0-127.`);
            return 'C4';
        }
        
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteIndex = midiNote % 12;
        
        return noteNames[noteIndex] + octave;
    }    /**
     * Convert note name to MIDI note number (e.g., "C4" -> 60)
     * Uses jmon-tone.js if available, otherwise fallback to local implementation
     * @param {string} noteName - Note name (e.g., "C4", "A#3")
     * @returns {number} MIDI note number (0-127)
     */
    noteNameToMidiNote(noteName) {
        // Use jmon-tone.js if available
        if (typeof jmonTone !== 'undefined') {
            return jmonTone.noteNameToMidiNote(noteName);
        }
        
        // Fallback to local implementation
        try {
            // Use Tone.js built-in conversion if available
            if (Tone.Frequency) {
                return Tone.Frequency(noteName).toMidi();
            }
            
            // Fallback manual conversion
            const noteRegex = /^([A-G])(#|b)?(-?\d+)$/;
            const match = noteName.match(noteRegex);
            
            if (!match) {
                console.warn(`Invalid note name format: ${noteName}`);
                return 60;
            }
            
            const [, note, accidental, octave] = match;
            const noteValues = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
            
            let midiNote = noteValues[note] + (parseInt(octave) + 1) * 12;
            
            if (accidental === '#') midiNote += 1;
            else if (accidental === 'b') midiNote -= 1;
            
            return Math.max(0, Math.min(127, midiNote));
        } catch (error) {
            console.warn(`Error converting note name ${noteName}:`, error);
            return 60;
        }
    }    /**
     * Process note input to handle both MIDI numbers and note names
     * Uses jmon-tone.js if available, otherwise fallback to local implementation
     * @param {string|number|array} note - Note input (can be MIDI number, note name, or array of either)
     * @returns {string|array} Processed note(s) as note name(s)
     */    processNoteInput(note) {
        console.log(`📝 Processing note input: ${JSON.stringify(note)}`);
        
        // Use jmon-tone.js if available - it properly handles arrays
        if (typeof jmonTone !== 'undefined') {
            const result = jmonTone.processNoteInput(note);
            console.log(`📝 Processed with jmonTone: ${JSON.stringify(result)}`);
            return result;
        }
        
        // Fallback to local implementation
        let result;
        if (Array.isArray(note)) {
            // Handle chord arrays - process each note
            result = note.map(n => this.processNoteInput(n));
            console.log(`📝 Processed chord: ${JSON.stringify(result)}`);
        } else if (typeof note === 'number') {
            result = this.midiNoteToNoteName(note);
            console.log(`📝 Converted MIDI note ${note} to: ${result}`);
        } else {
            result = note; // Already a note name
            console.log(`📝 Note already in correct format: ${result}`);
        }
        
        return result;
    }

    async init() {
        await Tone.start();
        this.buildUI();
        this.setupAudio();
        this.animate();
    }

    buildUI() {
        this.container.innerHTML = '';
        this.container.className = 'tonedaw';

        const createSVG = (svgString) => {
            const div = document.createElement('div');
            div.innerHTML = svgString.trim();
            return div.firstChild;
        };

        const playSVG = createSVG(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
        `);

        const pauseSVG = createSVG(`
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/></svg>
        `);

        const midiSVG = createSVG(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h4"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M2 12h20"/><path d="M6 12v4"/><path d="M10 12v4"/><path d="M14 12v4"/><path d="M18 12v4"/></svg>        
        `);

        const wavSVG = createSVG(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>     
        `);

        const tempoSVG = createSVG(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3 L15 20 H9 L12 3 Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
            <line x1="12" y1="17" x2="18.5" y2="6" />
            </svg>
        `);

        // Titre du projet
        if (this.projectData.metadata && this.projectData.metadata.title) {
            const titleHeader = document.createElement('div');
            titleHeader.className = 'daw-title-header';
            const title = document.createElement('h2');
            title.className = 'daw-title';
            title.textContent = this.projectData.metadata.title;
            titleHeader.appendChild(title);
            this.container.appendChild(titleHeader);
        }

        // Contrôles principaux
        const topRow = document.createElement('div');
        topRow.className = 'top-row';        this.playButton = document.createElement('button');
        this.playButton.className = 'play-button large';
        this.playButton.appendChild(playSVG.cloneNode(true));
        this.playButton.onclick = () => this.togglePlay(playSVG, pauseSVG);
          // Add debug button for chord playback diagnostics (if enabled)
        let debugButton = null;
        if (this.showDebugButton) {
            debugButton = document.createElement('button');
            debugButton.className = 'debug-button';
            debugButton.innerHTML = '🔍 Debug';
            debugButton.onclick = () => this.debugChordPlayback();
        }

        // BPM Control
        const tempoWrapper = document.createElement('div');
        tempoWrapper.className = 'tempo-wrapper';

        this.bpmInput = document.createElement('input');
        this.bpmInput.type = 'number';
        this.bpmInput.value = this.projectData.bpm || 120;
        this.bpmInput.onchange = () => {
            const bpm = parseInt(this.bpmInput.value);
            if (bpm >= 60 && bpm <= 240) {
                this.updateBPM(bpm);
            } else {
                this.bpmInput.value = this.projectData.bpm || 120;
            }
        };
        this.bpmInput.style.width = '50px';
        const tempoIcon = tempoSVG.cloneNode(true);
        tempoWrapper.appendChild(tempoIcon);
        tempoWrapper.appendChild(this.bpmInput);

        // Loop global (styled like M/S buttons)
        const globalLoopWrapper = document.createElement('div');
        globalLoopWrapper.className = 'global-loop-wrapper';
        const globalLoopLabel = document.createElement('label');
        globalLoopLabel.className = 'mute-solo-button active'; // Start as active
        this.globalLoop = document.createElement('input');
        this.globalLoop.type = 'checkbox';
        this.globalLoop.checked = true;
        this.globalLoop.onchange = () => {
            // Toggle active class
            if (this.globalLoop.checked) {
                globalLoopLabel.classList.add('active');
            } else {
                globalLoopLabel.classList.remove('active');
            }
            this.transport.loop = this.globalLoop.checked;
            if (this.globalLoop.checked) {
                this.transport.loopEnd = this.getTotalDuration();
            }
        };
        const globalLoopSpan = document.createElement('span');
        globalLoopSpan.textContent = 'L';
        globalLoopLabel.appendChild(this.globalLoop);
        globalLoopLabel.appendChild(globalLoopSpan);
        globalLoopWrapper.appendChild(globalLoopLabel);

        // Auto-scale control (styled like M/S buttons)
        const autoScaleWrapper = document.createElement('div');
        autoScaleWrapper.className = 'auto-scale-wrapper';
        const autoScaleLabel = document.createElement('label');
        autoScaleLabel.className = 'mute-solo-button active'; // Start as active
        autoScaleLabel.title = 'Auto-scale note tiles to fit track width';
        this.autoScaleCheckbox = document.createElement('input');
        this.autoScaleCheckbox.type = 'checkbox';
        this.autoScaleCheckbox.checked = this.autoScale;
        this.autoScaleCheckbox.onchange = () => {
            this.autoScale = this.autoScaleCheckbox.checked;
            // Toggle active class
            if (this.autoScale) {
                autoScaleLabel.classList.add('active');
            } else {
                autoScaleLabel.classList.remove('active');
            }
            // Immediately redraw with new scaling mode
            this.drawNotes();
        };
        const autoScaleSpan = document.createElement('span');
        autoScaleSpan.textContent = 'A';
        autoScaleLabel.appendChild(this.autoScaleCheckbox);
        autoScaleLabel.appendChild(autoScaleSpan);
        autoScaleWrapper.appendChild(autoScaleLabel);

        // Manual zoom controls (only visible when auto-scale is off)
        const zoomWrapper = document.createElement('div');
        zoomWrapper.className = 'zoom-wrapper';
        zoomWrapper.style.display = this.autoScale ? 'none' : 'flex';
        
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.className = 'zoom-button';
        zoomOutBtn.textContent = '−';
        zoomOutBtn.title = 'Zoom out (decrease note width)';        zoomOutBtn.onclick = () => {
            this.pixelsPerSecond = Math.max(this.minPixelsPerSecond, this.pixelsPerSecond * 0.8);
            this.drawNotes();
            // Update timeline ruler if it exists
            if (this.trackArea) {
                this.createTimelineRuler();
            }
            // Update enhanced zoom controls if they exist
            const zoomSlider = this.container.querySelector('.zoom-slider');
            const zoomLevel = this.container.querySelector('.zoom-level-indicator');
            if (zoomSlider && zoomLevel) {
                zoomSlider.value = this.pixelsPerSecond;
                zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
            }
        };
        
        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'zoom-button';
        zoomInBtn.textContent = '+';
        zoomInBtn.title = 'Zoom in (increase note width)';        zoomInBtn.onclick = () => {
            this.pixelsPerSecond = Math.min(this.maxPixelsPerSecond, this.pixelsPerSecond * 1.25);
            this.drawNotes();
            // Update timeline ruler if it exists
            if (this.trackArea) {
                this.createTimelineRuler();
            }
            // Update enhanced zoom controls if they exist
            const zoomSlider = this.container.querySelector('.zoom-slider');
            const zoomLevel = this.container.querySelector('.zoom-level-indicator');
            if (zoomSlider && zoomLevel) {
                zoomSlider.value = this.pixelsPerSecond;
                zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
            }
        };
        
        // Add refresh button
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'zoom-button';
        refreshBtn.textContent = '↻';
        refreshBtn.title = 'Force refresh display';
        refreshBtn.onclick = () => {
            this.forceRefresh();
        };
        
        zoomWrapper.appendChild(zoomOutBtn);
        zoomWrapper.appendChild(zoomInBtn);
        zoomWrapper.appendChild(refreshBtn);        // Update auto-scale checkbox behavior to show/hide zoom controls
        this.autoScaleCheckbox.onchange = () => {
            this.autoScale = this.autoScaleCheckbox.checked;
            // Toggle active class
            if (this.autoScale) {
                autoScaleLabel.classList.add('active');
                zoomWrapper.style.display = 'none';
            } else {
                autoScaleLabel.classList.remove('active');
                zoomWrapper.style.display = 'flex';
            }
            // Immediately redraw with new scaling mode
            this.drawNotes();
            // Update timeline ruler if it exists
            if (this.trackArea) {
                this.createTimelineRuler();
            }
            // Update enhanced zoom controls
            const zoomSlider = this.container.querySelector('.zoom-slider');
            const zoomLevel = this.container.querySelector('.zoom-level-indicator');
            if (zoomSlider && zoomLevel) {
                zoomSlider.value = this.pixelsPerSecond;
                zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
            }
        };

        // Timeline controls
        this.currentTimeDisplay = document.createElement('span');
        this.currentTimeDisplay.className = 'current-time-display';
        this.currentTimeDisplay.textContent = '0:00';        this.timelineSlider = document.createElement('input');
        this.timelineSlider.type = 'range';
        this.timelineSlider.min = 0;
        this.timelineSlider.max = 100;
        this.timelineSlider.value = 0;
        this.timelineSlider.step = 0.1;
        this.timelineSlider.className = 'timeline-slider';
        
        // Enhanced dragging/seeking functionality
        let wasPlaying = false;
        
        // When starting to drag, remember if we were playing and pause
        this.timelineSlider.onmousedown = () => {
            wasPlaying = this.playing;
            if (this.playing) {
                this.transport.pause();
            }
        };        // While dragging, update position in real-time
        this.timelineSlider.oninput = () => {
            const time = (this.timelineSlider.value / 100) * this.getTotalDuration();
            this.transport.seconds = time;
            // Immediately update current time display while scrubbing
            this.currentTimeDisplay.textContent = this.formatTime(time);
              // Immediately update progress line position to match slider
            if (this.progressLine) {
                const headerWidth = 260; // Match daw-track-header width  
                const linePosition = headerWidth + (time * this.pixelsPerSecond);
                this.progressLine.style.left = `${linePosition}px`;
                this.progressLine.style.display = 'block';
                
                // Also update ruler progress line if it exists
                const rulerProgressLine = this.trackArea.querySelector('.ruler-progress-line');
                if (rulerProgressLine) {
                    rulerProgressLine.style.left = `${time * this.pixelsPerSecond}px`;
                }
            }
        };
        
        // When releasing drag, resume playback if we were playing before
        this.timelineSlider.onmouseup = () => {
            if (wasPlaying) {
                this.transport.start();
            }
        };
        
        // Also handle touch events for mobile devices
        this.timelineSlider.ontouchstart = () => {
            wasPlaying = this.playing;
            if (this.playing) {
                this.transport.pause();
            }
        };
        
        this.timelineSlider.ontouchend = () => {
            if (wasPlaying) {
                this.transport.start();
            }
        };

        this.totalTimeDisplay = document.createElement('span');
        this.totalTimeDisplay.className = 'total-time-display';
        const duration = this.getTotalDuration();
        this.totalTimeDisplay.textContent = this.formatTimeWithBars(duration);
        this.totalTimeDisplay.title = `Total composition duration: ${duration.toFixed(1)}s`;

        // Build topRow elements array
        const topRowElements = [this.playButton];
        if (debugButton) topRowElements.push(debugButton);
        topRowElements.push(this.currentTimeDisplay, this.timelineSlider, this.totalTimeDisplay, tempoWrapper, globalLoopWrapper, autoScaleWrapper, zoomWrapper);
        
        topRow.append(...topRowElements);
        this.container.appendChild(topRow);        // Zone des tracks
        console.log('About to create trackArea...');
        this.trackArea = document.createElement('div');
        console.log('trackArea created:', this.trackArea);
        this.trackArea.className = 'daw-track-area';
        this.container.appendChild(this.trackArea);
        console.log('trackArea added to container');        // Types de synthétiseurs disponibles
        const synthTypes = ['Synth', 'AMSynth', 'FMSynth', 'DuoSynth', 'Sampler'];
        console.log('Checking projectData.sequences:', this.projectData.sequences);
        if (this.projectData.sequences && this.projectData.sequences.some(seq => seq.synth && seq.synth.type === 'Custom')) {
            synthTypes.push('Custom');
        }        // Créer les tracks
        console.log('About to create tracks, sequences:', this.projectData.sequences);
        if (!this.projectData.sequences || !Array.isArray(this.projectData.sequences)) {
            console.error('No sequences found in project data');
            return;
        }
        
        this.projectData.sequences.forEach((seq, index) => {
            const trackContainer = document.createElement('div');
            trackContainer.className = 'daw-track-container';

            // En-tête de track
            const trackHeader = document.createElement('div');
            trackHeader.className = 'daw-track-header';

            // Three-column row inside header
            const headerRow = document.createElement('div');
            headerRow.className = 'daw-track-header-row';

            // Track name section (with M/S buttons underneath)
            const trackNameSection = document.createElement('div');
            trackNameSection.className = 'track-name-section';
            
            const trackTitle = document.createElement('div');
            trackTitle.className = 'track-title';
            trackTitle.textContent = seq.label || `Track ${index + 1}`;
            
            // Mute and Solo buttons (horizontal layout)
            const muteSoloButtons = document.createElement('div');
            muteSoloButtons.className = 'mute-solo-buttons';

            // Mute
            const muteLabel = document.createElement('label');
            muteLabel.className = 'mute-solo-button';
            const muteCheckbox = document.createElement('input');
            muteCheckbox.type = 'checkbox';
            muteCheckbox.onchange = () => {
                // Store manual mute state
                this.manualMuteStates.set(index, muteCheckbox.checked);
                
                if (muteCheckbox.checked) {
                    muteLabel.classList.add('active');
                } else {
                    muteLabel.classList.remove('active');
                }
            };
            const muteSpan = document.createElement('span');
            muteSpan.textContent = 'M';
            muteLabel.appendChild(muteCheckbox);
            muteLabel.appendChild(muteSpan);

            // Solo
            const soloLabel = document.createElement('label');
            soloLabel.className = 'mute-solo-button';
            const soloCheckbox = document.createElement('input');
            soloCheckbox.type = 'checkbox';
            soloCheckbox.onchange = () => {
                if (soloCheckbox.checked) {
                    soloLabel.classList.add('active');
                } else {
                    soloLabel.classList.remove('active');
                }
                this.updateTrackStates();
            };
            const soloSpan = document.createElement('span');
            soloSpan.textContent = 'S';
            soloLabel.appendChild(soloCheckbox);
            soloLabel.appendChild(soloSpan);

            muteSoloButtons.appendChild(muteLabel);
            muteSoloButtons.appendChild(soloLabel);
            
            trackNameSection.appendChild(trackTitle);
            trackNameSection.appendChild(muteSoloButtons);

            // Track controls section (loop + synth stacked vertically)
            const trackControlsSection = document.createElement('div');
            trackControlsSection.className = 'track-controls-section';

            // Loop controls section
            const loopSection = document.createElement('div');
            loopSection.className = 'loop-section';
            const loopInput = document.createElement('input');
            loopInput.type = 'text';
            loopInput.placeholder = 'loops at: 0:4, 1:0...';
            loopInput.style.color = '#666';
            loopInput.value = seq.loop && seq.loop !== true ? seq.loop : '';
            loopInput.onchange = () => {
                if (loopInput.value.trim() === '') {
                    seq.loop = false;
                } else {
                    seq.loop = loopInput.value.trim();
                }
                this.setupAudio();
                this.drawNotes();
            };
            loopSection.appendChild(loopInput);

            // Sélecteur de synthétiseur
            const synthWrapper = document.createElement('div');
            synthWrapper.className = 'synth-wrapper';
            const synthSelect = document.createElement('select');
            synthTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                const synthType = typeof seq.synth === 'object' ? seq.synth.type : seq.synth;
                option.selected = synthType === type;
                synthSelect.appendChild(option);
            });
            synthSelect.onchange = () => this.setupAudio();
            synthWrapper.appendChild(synthSelect);

            // Add loop and synth to controls section
            trackControlsSection.appendChild(loopSection);
            trackControlsSection.appendChild(synthWrapper);

            // Add columns to header row
            headerRow.append(trackNameSection, trackControlsSection);
            trackHeader.appendChild(headerRow);

            // Lane de la track (bande sonore)
            const trackLane = document.createElement('div');
            trackLane.className = 'daw-track-lane';

            // Place header and lane side by side (not stacked)
            trackContainer.innerHTML = '';
            trackContainer.appendChild(trackHeader);
            trackContainer.appendChild(trackLane);
            this.trackArea.appendChild(trackContainer);

            // Enregistrer les références
            this.tracks.push({
                seq: seq,
                synthSelect: synthSelect,
                muteCheckbox: muteCheckbox,
                soloCheckbox: soloCheckbox,
                loopInput: loopInput,
                lane: trackLane,
                container: trackContainer,
                part: null,
                synth: null,
                sampler: null
            });
            
            // Initialize manual mute state
            this.manualMuteStates.set(index, false);
        });

        this.drawNotes();
        setTimeout(() => this.drawNotes(), 100);
        if (typeof window !== 'undefined') {
            window.addEventListener('load', () => {
                setTimeout(() => this.drawNotes(), 500);
            });
            // Use ResizeObserver for robust redraw
            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => {
                    this.drawNotes();
                    setTimeout(() => this.recalculateProgressLine(), 50);
                });
                if (this.trackArea) ro.observe(this.trackArea);
            }
            
            // Add window resize listener as backup
            window.addEventListener('resize', () => {
                setTimeout(() => this.recalculateProgressLine(), 100);
            });
        }

        // Boutons d'export en bas
        const bottomRow = document.createElement('div');
        bottomRow.className = 'bottom-row';

        const exportMIDI = document.createElement('button');
        exportMIDI.appendChild(midiSVG.cloneNode(true));
        exportMIDI.insertAdjacentText('beforeend', ' MIDI');
        exportMIDI.onclick = () => this.exportMIDI();

        const exportWAV = document.createElement('button');
        exportWAV.appendChild(wavSVG.cloneNode(true));
        exportWAV.insertAdjacentText('beforeend', ' WAV');
        exportWAV.onclick = async () => this.exportWAV();

        bottomRow.append(exportMIDI, exportWAV);
        this.container.appendChild(bottomRow);

        // Add keyboard shortcuts for quick testing
        document.addEventListener('keydown', (e) => {
            // Only trigger shortcuts when not typing in inputs
            if (e.target.tagName !== 'INPUT') {
                if (e.code === 'Space') {
                    e.preventDefault();
                    this.togglePlay(playSVG, pauseSVG);
                } else if (e.code === 'KeyA' && e.ctrlKey) {
                    // Ctrl+A: Toggle auto-scale
                    e.preventDefault();
                    this.autoScaleCheckbox.checked = !this.autoScaleCheckbox.checked;
                    this.autoScaleCheckbox.onchange();                } else if (e.code === 'Equal' && e.ctrlKey) {
                    // Ctrl+= : Zoom in (manual mode)
                    e.preventDefault();
                    if (!this.autoScale) {
                        this.pixelsPerSecond = Math.min(this.maxPixelsPerSecond, this.pixelsPerSecond * 1.25);
                        this.drawNotes();
                        // Update timeline ruler if it exists
                        if (this.trackArea) {
                            this.createTimelineRuler();
                        }
                        // Update enhanced zoom controls
                        const zoomSlider = this.container.querySelector('.zoom-slider');
                        const zoomLevel = this.container.querySelector('.zoom-level-indicator');
                        if (zoomSlider && zoomLevel) {
                            zoomSlider.value = this.pixelsPerSecond;
                            zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
                        }
                    }
                } else if (e.code === 'Minus' && e.ctrlKey) {
                    // Ctrl+- : Zoom out (manual mode)
                    e.preventDefault();
                    if (!this.autoScale) {
                        this.pixelsPerSecond = Math.max(this.minPixelsPerSecond, this.pixelsPerSecond * 0.8);
                        this.drawNotes();
                        // Update timeline ruler if it exists
                        if (this.trackArea) {
                            this.createTimelineRuler();
                        }
                        // Update enhanced zoom controls
                        const zoomSlider = this.container.querySelector('.zoom-slider');
                        const zoomLevel = this.container.querySelector('.zoom-level-indicator');
                        if (zoomSlider && zoomLevel) {
                            zoomSlider.value = this.pixelsPerSecond;
                            zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
                        }
                    }
                } else if (e.code === 'KeyD' && e.ctrlKey) {
                    // Ctrl+D: Debug scaling info
                    e.preventDefault();
                    this.debugScaling();
                } else if (e.code === 'KeyR' && e.ctrlKey) {
                    // Ctrl+R: Force refresh
                    e.preventDefault();
                    this.forceRefresh();
                }
            }
        });

        // Add help info for keyboard shortcuts
        const helpInfo = document.createElement('div');
        helpInfo.className = 'help-info';
        helpInfo.innerHTML = `
            <small><strong>Shortcuts:</strong> 
            Spacebar=Play/Pause | Ctrl+A=Auto-Scale | Ctrl+±=Zoom | Ctrl+R=Refresh | Ctrl+D=Debug
            </small>
        `;        this.container.appendChild(helpInfo);        // Create enhanced zoom controls after all UI is built
        try {
            this.createEnhancedZoomControls();
        } catch (error) {
            console.warn('Enhanced zoom controls creation failed:', error);
        }

        this.drawNotes();
        
        // Create timeline ruler after everything is set up
        try {
            this.createTimelineRuler();
        } catch (error) {
            console.warn('Timeline ruler creation failed:', error);
        }
    }

    calculateDynamicPixelsPerSecond() {
        // Return current value if auto-scaling is disabled
        if (!this.autoScale) {
            return this.pixelsPerSecond;
        }

        // Calculate pixels per second based on available track lane width
        if (this.tracks.length === 0) {
            return this.pixelsPerSecond; // Return current value if no tracks
        }

        const firstLane = this.tracks[0].lane;
        if (!firstLane) {
            return this.pixelsPerSecond; // Return current value if no lane
        }

        // Get the actual usable width of the track lane
        // Try multiple methods to get the most accurate width
        const containerWidth = this.trackArea ? (this.trackArea.clientWidth || this.trackArea.offsetWidth) : 0;
        const laneWidth = firstLane.clientWidth || firstLane.offsetWidth || containerWidth - 260; // Subtract header width
        const totalDuration = this.getTotalDuration();
        
        if (totalDuration <= 0) {
            return this.pixelsPerSecond; // Return current value if no duration
        }

        // Calculate ideal pixels per second to fit content in available width
        // Be more conservative with padding to ensure content fits
        const headerWidth = 260; // Fixed header width
        const padding = 20; // Conservative padding
        const actualAvailableWidth = Math.max(300, laneWidth - padding);
        const idealPixelsPerSecond = actualAvailableWidth / totalDuration;
          // For compositions longer than 20s, be more aggressive with scaling down
        let effectiveMinPixels = this.minPixelsPerSecond;
        if (totalDuration > 20) {
            effectiveMinPixels = Math.max(3, this.minPixelsPerSecond * 0.5); // More aggressive for 20s+
        } else if (totalDuration > 40) {
            effectiveMinPixels = Math.max(2, this.minPixelsPerSecond * 0.3); // Very aggressive for 40s+
        } else if (totalDuration > 60) {
            effectiveMinPixels = Math.max(1, this.minPixelsPerSecond * 0.2); // Extremely aggressive for 60s+
        }
        
        // Constrain to min/max values for readability
        const constrainedPixelsPerSecond = Math.max(
            effectiveMinPixels,
            Math.min(this.maxPixelsPerSecond, idealPixelsPerSecond)
        );

        console.log(`🎯 Dynamic scaling calculation:
   - Container width: ${containerWidth}px
   - Lane width: ${laneWidth}px
   - Available width: ${actualAvailableWidth}px  
   - Total duration: ${totalDuration.toFixed(2)}s
   - Ideal pixels/sec: ${idealPixelsPerSecond.toFixed(1)}
   - Effective min pixels/sec: ${effectiveMinPixels.toFixed(1)}
   - Constrained pixels/sec: ${constrainedPixelsPerSecond.toFixed(1)}
   - Previous pixels/sec: ${this.pixelsPerSecond.toFixed(1)}`);

        return constrainedPixelsPerSecond;
    }

    drawNotes() {
        // Prevent recursive calls
        if (this._drawingNotes) {
            console.log('⚠️ Preventing recursive drawNotes call');
            return;
        }
        this._drawingNotes = true;
        
        try {
            const totalDuration = this.getTotalDuration();
            
            // Calculate dynamic pixels per second based on available width
            this.pixelsPerSecond = this.calculateDynamicPixelsPerSecond();
            
            // Debug scaling info (remove in production)
            this.debugScaling();
            
            // Remove any existing progress line from track area
            const existingProgressLine = this.trackArea.querySelector('.daw-progress-line');
            if (existingProgressLine) {
                existingProgressLine.remove();
            }

            this.tracks.forEach(track => {
                track.lane.innerHTML = '';
                
                // Get expanded notes with loops
                const expandedNotes = this.expandNotesWithLoop(track.seq);
                
                // Group overlapping notes to prevent visual overlap
                const noteGroups = new Map();
                
                expandedNotes.forEach((note, noteIndex) => {
                    // Parse note time and duration
                    let noteTime = note.start !== undefined ? note.start : note.time || 0;
                    
                    if (typeof noteTime === 'string') {
                        noteTime = this._parseSimpleTime(noteTime);
                    }
                    
                    let noteDuration = note.duration || 0.5;
                    if (typeof noteDuration === 'string') {
                        noteDuration = this._parseSimpleDuration(noteDuration);
                    }
                    
                    // Create a unique key for grouping - only group notes that truly overlap
                    // For percussion (short notes), be more conservative about grouping
                    const isPercussion = noteDuration < 0.25; // Notes shorter than quarter note
                    
                    let timeKey;
                    if (isPercussion) {
                        // For percussion: use exact time + unique index to prevent grouping
                        timeKey = `perc_${noteTime.toFixed(3)}_${noteIndex}`;
                    } else {
                        // For longer notes: group by rounded time and duration
                        timeKey = `${Math.floor(noteTime * 20)}_${Math.floor(noteDuration * 20)}`;
                    }
                    
                    if (!noteGroups.has(timeKey)) {
                        noteGroups.set(timeKey, {
                            time: noteTime,
                            duration: noteDuration,
                            notes: [],
                            velocities: [],
                            isLooped: note.isLooped || false
                        });
                    }
                    
                    noteGroups.get(timeKey).notes.push(note.note);
                    noteGroups.get(timeKey).velocities.push(note.velocity || 0.8);
                });
                
                // Create visual note blocks for each group
                noteGroups.forEach((group, timeKey) => {
                    const noteElement = document.createElement('div');
                    noteElement.className = 'daw-note-block';
                    
                    // Position and size using dynamic pixels per second
                    const left = group.time * this.pixelsPerSecond;
                    
                    // Better width calculation for percussion and short notes
                    let width = group.duration * this.pixelsPerSecond;
                    const isVeryShort = group.duration < 0.15; // Notes shorter than 150ms (like 32n)
                    
                    if (isVeryShort) {
                        // For very short notes (percussion), use smaller minimum width
                        width = Math.max(8, width); // Much smaller minimum for percussion
                        noteElement.classList.add('percussion-note'); // Add class for specific styling
                    } else {
                        // For longer notes, use normal minimum
                        width = Math.max(20, width);
                    }
                    
                    // For very long compositions with small pixels/second, ensure notes are still visible
                    if (this.pixelsPerSecond < 30 && width < 15) {
                        width = 15; // Minimum visible width
                    }
                    
                    noteElement.style.left = left + 'px';
                    noteElement.style.width = width + 'px';
                    
                    // Handle note content display
                    const allNotes = group.notes.flat();
                    let noteText = '';
                    
                    if (allNotes.length === 1) {
                        noteText = allNotes[0];
                    } else {
                        // Show chord notes properly
                        if (allNotes.length <= 3) {
                            noteText = allNotes.join(' ');
                            noteElement.style.fontSize = '9px';
                        } else {
                            noteText = `[${allNotes.length}]`; // Shorter text for very small notes
                            noteElement.style.fontSize = '8px';
                        }
                    }
                    
                    // Adjust font size based on note width
                    if (width < 25) {
                        noteElement.style.fontSize = '7px';
                        if (allNotes.length > 1) {
                            noteText = `${allNotes.length}`; // Just show count for very small notes
                        }
                    }
                    
                    noteElement.textContent = noteText;
                    noteElement.title = `${allNotes.join(', ')} at ${group.time.toFixed(2)}s for ${group.duration.toFixed(2)}s`;
                    
                    // Apply velocity-based transparency
                    const avgVelocity = group.velocities.reduce((sum, vel) => sum + vel, 0) / group.velocities.length;
                    // Map velocity (0.0-1.0) to opacity (0.3-1.0) for better visibility
                    const velocityOpacity = 0.3 + (avgVelocity * 0.7);
                    noteElement.style.background = `rgba(0, 0, 0, ${velocityOpacity})`;
                    
                    // Update tooltip to include velocity information
                    const velocityInfo = group.velocities.length === 1 ? 
                        `velocity: ${group.velocities[0].toFixed(2)}` : 
                        `avg velocity: ${avgVelocity.toFixed(2)}`;
                    noteElement.title += ` (${velocityInfo})`;
                    
                    // Add looped indicator (preserve velocity-based transparency)
                    if (group.isLooped) {
                        this.applyLoopStyling(noteElement, velocityOpacity);
                        
                        // Update tooltip to indicate loop status
                        noteElement.title += ' (Looped)';
                    }
                    
                    track.lane.appendChild(noteElement);
                });
            });
        
        // Create a single continuous progress line that spans all tracks
        const progressLine = document.createElement('div');
        progressLine.className = 'daw-progress-line';
        progressLine.style.height = '100%';
        
        // Initialize progress line position to start after headers
        if (this.tracks.length > 0) {
            progressLine.style.left = '260px'; // Match header width
        }
        
        // Only set minimum width if auto-scale is disabled
        // When auto-scale is enabled, the content should fit within available space
        if (!this.autoScale) {
            // In manual zoom mode: create inner container for horizontal scrolling
            const compositionWidth = totalDuration * this.pixelsPerSecond;
            const contentWidth = compositionWidth + 50; // Content + padding
            
            // Don't set minWidth on trackArea - that causes overflow
            // Instead, set width on individual track lanes to force content width
            this.tracks.forEach(track => {
                track.lane.style.minWidth = `${contentWidth}px`;
                track.lane.style.width = `${contentWidth}px`;
            });
            
            console.log(`📐 Manual zoom: Content width set to ${contentWidth}px (scroll enabled)`);
        } else {
            // Reset any previous manual width constraints
            this.tracks.forEach(track => {
                track.lane.style.minWidth = '';
                track.lane.style.width = '';
            });
            console.log(`📐 Auto-scale: Track area width unconstrained`);
        }        this.trackArea.appendChild(progressLine);
        this.progressLine = progressLine;
        
        // Don't create timeline ruler here - it will be created after buildUI is complete
        } finally {
            this._drawingNotes = false;
        }
    }    expandNotesWithLoop(seq) {
        console.log(`🔄 Expanding notes for: ${seq.label}`);
        console.log(`  - Original notes:`, seq.notes);
        
        // Deep clone the notes to avoid reference issues
        const expandedNotes = JSON.parse(JSON.stringify(seq.notes));

        // If loop is defined and not false/undefined
        if (seq.loop && seq.loop !== false) {
            let loopEndTime;

            if (typeof seq.loop === 'string') {
                loopEndTime = this._parseSimpleTime(seq.loop);
            } else {
                // Calculate loop end from the latest note
                let maxNoteEnd = 0;
                seq.notes.forEach(note => {
                    const noteTime = note.start !== undefined ? note.start : note.time || 0;
                    const parsedTime = typeof noteTime === 'string' ? this._parseSimpleTime(noteTime) : noteTime;
                    const noteDuration = typeof note.duration === 'string' ? 
                        this._parseSimpleDuration(note.duration) : (note.duration || 0.5);
                    maxNoteEnd = Math.max(maxNoteEnd, parsedTime + noteDuration);
                });
                loopEndTime = maxNoteEnd;
            }

            // Get the total project duration to know how many loops to create
            const totalDuration = this.getTotalDuration();
            const numberOfLoops = Math.ceil(totalDuration / loopEndTime);

            console.log(`🔄 Expanding loops for ${seq.label || 'track'}: loop=${seq.loop}, loopEnd=${loopEndTime.toFixed(2)}s, totalDuration=${totalDuration.toFixed(2)}s, numberOfLoops=${numberOfLoops}`);

            // Add looped notes
            for (let loopIndex = 1; loopIndex < numberOfLoops; loopIndex++) {
                seq.notes.forEach(note => {
                    const originalTime = note.start !== undefined ? note.start : note.time || 0;
                    const parsedOriginalTime = typeof originalTime === 'string' ? 
                        this._parseSimpleTime(originalTime) : originalTime;
                    const loopedTime = parsedOriginalTime + (loopIndex * loopEndTime);
                    
                    if (loopedTime < totalDuration) {
                        expandedNotes.push({
                            ...note,
                            time: loopedTime,
                            start: loopedTime,
                            isLooped: true
                        });
                    }                });
            }
        }
        
        // Log the expanded notes for debugging
        console.log(`  - Expanded notes for ${seq.label}:`, expandedNotes);
        
        // Double-check if there are any chord notes
        const hasChords = expandedNotes.some(note => Array.isArray(note.note) || 
            (typeof note.note === 'string' && note.note.includes(',')));
        console.log(`  - Has chords: ${hasChords}`);
        
        return expandedNotes;
    }    setupAudio() {
        // Nettoyer les anciens synths et parts
        this.synths.forEach(s => s.dispose());
        this.parts.forEach(p => p.dispose());
        this.synths = [];
        this.parts = [];

        const totalDuration = this.getTotalDuration();
        const self = this; // Store reference to this for callbacks

        this.tracks.forEach((track, index) => {
            const seq = track.seq;
            const selectedType = track.synthSelect.value;
            
            // Setup basic variables
            let synth = null;
            let synthTypeString = '';
            
            try {
                // Create synth from jmon-tone instrument definition
                const instrument = seq.instrument || this.convertSynthToInstrument(seq.synth);
    
                // Create the appropriate synth based on instrument type
                if (instrument.type === 'sampler' || selectedType === 'Sampler') {
                    synthTypeString = 'Sampler';
                    synth = new Tone.Sampler({
                        urls: instrument.samples || seq.synth?.urls || {},
                        baseUrl: instrument.baseUrl || seq.synth?.baseUrl || '',
                        onload: () => {
                            console.log(`✅ Sampler loaded for track: ${seq.label}`);
                        }
                    }).toDestination();
                    track.sampler = synth;
                    track.isSampler = true;
                } else if (selectedType === 'Custom' || instrument.engine === 'custom') {
                    synthTypeString = 'Custom';
                    synth = this.createCustomSynth(instrument.parameters || seq.synth);
                    track.sampler = null;
                    track.isSampler = false;                } else {
                    // Check if this track has chords to determine if we need polyphony
                    const expandedNotesForCheck = this.expandNotesWithLoop(seq);
                    const hasChords = expandedNotesForCheck.some(note => {
                        const processedNote = this.processNoteInput(note.note);
                        return Array.isArray(processedNote);
                    });
                    
                    synthTypeString = this.mapInstrumentToToneType(instrument, selectedType);                    if (hasChords) {
                        // For tracks with chords, we'll use manual polyphony instead of PolySynth
                        // to avoid voice constructor issues
                        console.log(`🎸 Creating monophonic ${synthTypeString} for chord track (manual polyphony): ${seq.label}`);
                        const SynthCtor = Tone[synthTypeString] || Tone.Synth;
                        synth = new SynthCtor().toDestination();
                        synthTypeString = `${synthTypeString} (Manual Polyphony)`;
                    } else {
                        // Use monophonic synth for single notes
                        console.log(`🎵 Creating monophonic ${synthTypeString} for: ${seq.label}`);
                        const SynthCtor = Tone[synthTypeString] || Tone.Synth;
                        synth = new SynthCtor().toDestination();
                    }
                    
                    // Apply instrument parameters
                    if (instrument.parameters) {
                        this.applySynthParameters(synth, instrument.parameters);
                    }
                    track.sampler = null;
                    track.isSampler = false;
                }
            } catch (error) {
                // Error creating synth - fallback to basic synth
                console.error(`Error creating synth for track ${index}:`, error);
                synth = new Tone.Synth().toDestination();
                synthTypeString = 'Synth';
                track.sampler = null;
                track.isSampler = false;
            }
            
            // Store synth and type
            track.synth = synth;
            track.synthType = synthTypeString;
            this.synths.push(synth);

            // Use expanded notes (with loops) for playback
            const expandedNotes = this.expandNotesWithLoop(seq);
            
            // Check for chords in this track
            const hasChord = expandedNotes.some(note => {
                const noteValue = note.note;
                return Array.isArray(noteValue) || 
                    (typeof noteValue === 'string' && noteValue.includes(','));
            });
              // We no longer need to show chord warnings since we're handling chords for all tracks
            track._showChordWarning = false;
              // Process notes for playback
            const notes = [];
            expandedNotes.forEach(note => {
                // Process the note input
                let processedNote = self.processNoteInput(note.note);
                
                // Keep chord data for all synth types, we'll handle it in the playback
                // No longer filtering to just the first note of chords
                
                notes.push({
                    time: note.start !== undefined ? note.start : note.time || 0,
                    note: processedNote,
                    duration: note.duration || '8n',
                    velocity: note.velocity || 0.8
                });
            });            // Debug: log scheduled notes
            console.log(`🎹 Scheduling notes for track: ${seq.label}`);
            notes.forEach(n => {
                console.log(`   - note: ${Array.isArray(n.note) ? '[' + n.note.join(',') + ']' : n.note}, time: ${n.time}, duration: ${n.duration}, velocity: ${n.velocity}`);
            });            const part = new Tone.Part((time, note) => {
                try {
                    if (!track.muteCheckbox.checked) {
                        if (track.sampler && track.sampler.loaded) {
                            // Samplers can handle chords natively
                            track.sampler.triggerAttackRelease(note.note, note.duration, time, note.velocity);                        } else if (track.synth) {
                            // Handle chords with manual polyphony for maximum compatibility
                            if (Array.isArray(note.note)) {
                                console.log(`🎸 Playing chord in ${track.seq.label}: [${note.note}] at time ${time}`);
                                // Create multiple synth instances for true polyphony
                                note.note.forEach((noteInChord, index) => {
                                    try {
                                        // Create a temporary synth for each note in the chord
                                        const tempSynth = track.synth.constructor === Function ? 
                                            new track.synth.constructor().toDestination() : 
                                            new Tone.Synth().toDestination();
                                        
                                        // Play the note
                                        tempSynth.triggerAttackRelease(noteInChord, note.duration, time, note.velocity);
                                        console.log(`  - Note ${index+1}: ${noteInChord} (separate synth instance)`);
                                        
                                        // Clean up after the note finishes
                                        setTimeout(() => {
                                            tempSynth.dispose();
                                        }, Tone.Time(note.duration).toSeconds() * 1000 + 1000);
                                    } catch (e) {
                                        console.warn(`Failed to create temp synth for ${noteInChord}, using timing offset: ${e.message}`);
                                        // Fallback to timing offset on the main synth
                                        const offsetTime = time + (index * 0.05);
                                        track.synth.triggerAttackRelease(noteInChord, note.duration, offsetTime, note.velocity);
                                    }
                                });
                            } else {
                                // Single note - play normally
                                console.log(`🎵 Playing single note in ${track.seq.label}: ${JSON.stringify(note.note)} at time ${time}`);
                                track.synth.triggerAttackRelease(note.note, note.duration, time, note.velocity);
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`Error playing note ${note.note} at time ${time}:`, e);
                }
            }, notes).start(0);

            track.part = part;
            this.parts.push(part);
        });

        this.transport.bpm.value = this.projectData.bpm || 120;
        this.transport.loop = this.globalLoop.checked;
        
        // Recalculate total duration after BPM is set correctly
        const finalDuration = this.getTotalDuration();
        this.transport.loopEnd = finalDuration;
        
        console.log(`🔄 Transport configuration:`);
        console.log(`   - BPM: ${this.transport.bpm.value}`);
        console.log(`   - Global Loop: ${this.transport.loop}`);
        console.log(`   - Loop End: ${finalDuration.toFixed(2)}s (recalculated after BPM set)`);
        console.log(`   - Current Time: ${Tone.Transport.seconds.toFixed(2)}s`);

        // Apply mute/solo states after audio setup
        this.updateTrackStates();

        // Add chord warning emoji to track controls if needed
        this.tracks.forEach(track => {
            const header = track.header;
            if (!header) return;
            let warningEl = header.querySelector('.chord-warning');
            if (track._showChordWarning) {
                if (!warningEl) {
                    warningEl = document.createElement('span');
                    warningEl.className = 'chord-warning';
                    warningEl.textContent = '⚠️';
                    warningEl.title = 'This synth does not support chords. Only the first note will be played.';
                    // Insert after mute/solo buttons
                    const ms = header.querySelector('.mute-solo-buttons');
                    if (ms) ms.parentNode.insertBefore(warningEl, ms.nextSibling);
                }
            } else if (warningEl) {
                warningEl.remove();
            }
        });
    }

    updateTrackStates() {
        const soloedTracks = this.tracks.filter(track => track.soloCheckbox.checked);
        const hasSolo = soloedTracks.length > 0;

        this.tracks.forEach((track, index) => {
            if (hasSolo) {
                // Solo mode: only soloed tracks are audible
                // Don't change the visual state of mute buttons, only their effective state
                const isEffectivelyMuted = !track.soloCheckbox.checked;
                
                // Update the part's mute state for audio, but keep visual mute button unchanged
                if (track.part) {
                    track.part.mute = isEffectivelyMuted;
                }
            } else {
                // No solo: use manual mute states
                const manualMuteState = this.manualMuteStates.get(index) || false;
                
                // Restore visual mute button to manual state
                track.muteCheckbox.checked = manualMuteState;
                if (manualMuteState) {
                    track.muteCheckbox.parentElement.classList.add('active');
                } else {
                    track.muteCheckbox.parentElement.classList.remove('active');
                }
                
                // Update the part's mute state
                if (track.part) {
                    track.part.mute = manualMuteState;
                }
            }
        });
    }

    togglePlay(playSVG, pauseSVG) {
        if (this.transport.state === 'started') {
            this.transport.pause();
            this.playing = false;
            this.playButton.innerHTML = '';
            this.playButton.appendChild(playSVG.cloneNode(true));
            console.log('⏸️ Playback paused');
        } else {
            this.transport.start();
            this.playing = true;
            this.playButton.innerHTML = '';
            this.playButton.appendChild(pauseSVG.cloneNode(true));
            console.log('▶️ Playback started');
        }
    }

    animate() {
        // Cancel any existing animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const loop = () => {
            if (this.playing) {
                const currentTime = this.transport.seconds || 0;
                const totalDuration = this.getTotalDuration();
                const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
                
                // Update timeline slider
                if (this.timelineSlider) {
                    this.timelineSlider.value = Math.min(100, progress);
                }
                
                // Update time display
                if (this.currentTimeDisplay) {
                    this.currentTimeDisplay.textContent = this.formatTime(currentTime);
                }
                  // Update progress line position with proper timing sync
                if (this.progressLine) {
                    const headerWidth = 260; // Match daw-track-header width
                    const linePosition = headerWidth + (currentTime * this.pixelsPerSecond);
                    this.progressLine.style.left = `${linePosition}px`;
                    this.progressLine.style.display = 'block';
                }
                
                // Update ruler progress line
                const rulerProgressLine = this.trackArea.querySelector('.ruler-progress-line');
                if (rulerProgressLine) {
                    rulerProgressLine.style.left = `${currentTime * this.pixelsPerSecond}px`;
                }
                
                // Stop animation if we've reached the end and not looping
                if (!this.transport.loop && currentTime >= totalDuration) {
                    this.transport.stop();
                    this.playing = false;
                    // Reset play button
                    const playButton = document.querySelector('.play-button');
                    if (playButton) {
                        playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;
                    }
                }
            }
            
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    getTotalDuration() {
        // Check if metadata specifies duration first
        if (this.projectData.metadata && this.projectData.metadata.duration) {
            const metadataDuration = this._parseSimpleTime(this.projectData.metadata.duration);
            if (metadataDuration > 0) {
                console.log(`🎼 Using metadata duration: ${metadataDuration.toFixed(2)}s`);
                return metadataDuration;
            }
        }
        
        // Calculate based on BPM and longest sequence including loop expansions
        const bpm = this.transport.bpm.value;
        let maxDuration = 0;
        
        console.log(`🕐 Calculating total duration at ${bpm} BPM...`);
        
        for (const seq of this.projectData.sequences) {
            // Find the latest note end time in this sequence
            let seqDuration = 0;
            for (const note of seq.notes) {
                const noteTime = note.start !== undefined ? note.start : note.time || 0;
                const parsedTime = typeof noteTime === 'string' ? this._parseSimpleTime(noteTime) : noteTime;
                const noteDuration = typeof note.duration === 'string' ? 
                    this._parseSimpleDuration(note.duration) : (note.duration || 0.5);
                const noteEnd = parsedTime + noteDuration;
                seqDuration = Math.max(seqDuration, noteEnd);
            }
            maxDuration = Math.max(maxDuration, seqDuration);
        }
        
        // Find the longest loop duration - this will be our composition duration
        let longestLoop = 0;
        for (const seq of this.projectData.sequences) {
            if (seq.loop && seq.loop !== false) {
                if (typeof seq.loop === 'string') {
                    const loopTime = this._parseSimpleTime(seq.loop);
                    longestLoop = Math.max(longestLoop, loopTime);
                } else {
                    // Calculate from sequence duration
                    let seqLoopDuration = 0;
                    for (const note of seq.notes) {
                        const noteTime = note.start !== undefined ? note.start : note.time || 0;
                        const parsedTime = typeof noteTime === 'string' ? this._parseSimpleTime(noteTime) : noteTime;
                        const noteDuration = typeof note.duration === 'string' ? 
                            this._parseSimpleDuration(note.duration) : (note.duration || 0.5);
                        seqLoopDuration = Math.max(seqLoopDuration, parsedTime + noteDuration);
                    }
                    longestLoop = Math.max(longestLoop, seqLoopDuration);
                }
            }
        }
        
        // The composition duration should be the longest loop duration
        // This ensures all shorter loops repeat as needed to fill the full composition
        if (longestLoop > 0) {
            maxDuration = Math.max(maxDuration, longestLoop);
        } else {
            maxDuration = maxDuration || 4; // Default minimum duration
        }
        
        const finalDuration = maxDuration || 4;
        console.log(`🏁 Final composition duration: ${finalDuration.toFixed(2)}s`);
        
        return finalDuration;
    }

    smoothBPMTransition(targetBpm, duration = 0.5) {
        // Smooth BPM transition for better user experience
        const currentBpm = this.transport.bpm.value;
        this.transport.bpm.rampTo(targetBpm, duration);
        
        // Update UI immediately but mark as transitioning
        this.bpmInput.value = targetBpm;
        this.projectData.bpm = targetBpm;
        
        // Update displays after transition completes
        setTimeout(() => {
            const newTotalDuration = this.getTotalDuration();
            this.totalTimeDisplay.textContent = this.formatTime(newTotalDuration);
            this.drawNotes();
        }, duration * 1000 + 50);
        
        console.log(`Smooth BPM transition: ${currentBpm} → ${targetBpm} over ${duration}s`);
    }

    updateBPM(newBpm) {
        // Validate BPM range
        newBpm = Math.max(60, Math.min(240, newBpm));
        
        const oldBpm = this.transport.bpm.value;
        const wasPlaying = this.playing;
        
        // Store current relative position
        const currentTime = this.transport.seconds || 0;
        const oldTotalDuration = this.getTotalDuration();
        const relativePosition = oldTotalDuration > 0 ? currentTime / oldTotalDuration : 0;
        
        // Update BPM smoothly to avoid audio glitches
        this.transport.bpm.rampTo(newBpm, 0.1);
        this.projectData.bpm = newBpm;
        
        // Wait for BPM transition then recalculate
        setTimeout(() => {
            const newTotalDuration = this.getTotalDuration();
            
            // Restore relative playback position
            this.transport.seconds = relativePosition * newTotalDuration;
            
            // Update UI
            this.totalTimeDisplay.textContent = this.formatTime(newTotalDuration);
            
            // Update transport loop end if global looping
            if (this.globalLoop.checked) {
                this.transport.loopEnd = newTotalDuration;
            }
            
            // Redraw notes with new timing
            this.drawNotes();
            
            console.log(`🎵 BPM updated: ${oldBpm} → ${newBpm}, duration: ${oldTotalDuration.toFixed(2)}s → ${newTotalDuration.toFixed(2)}s`);
        }, 150);
    }

    recalculateProgressLine() {
        // Force redraw of notes and progress line to handle layout changes
        if (this.tracks.length > 0) {
            this.drawNotes();
        }
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    formatTimeWithBars(seconds) {
        // Format time showing bars:beats as well
        const bpm = this.transport.bpm.value;
        const beatsPerSecond = bpm / 60;
        const totalBeats = seconds * beatsPerSecond;
        const bars = Math.floor(totalBeats / 4);
        const beats = Math.floor(totalBeats % 4);
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${bars}:${beats} (${min}:${sec})`;
    }

    exportMIDI() {
        const midi = new Midi();
        const bpm = this.transport.bpm.value;

        this.projectData.sequences.forEach((seq, index) => {
            const track = midi.addTrack();
            track.name = seq.label || `Track ${index + 1}`;
            
            const expandedNotes = this.expandNotesWithLoop(seq);
            
            expandedNotes.forEach(note => {
                const processedNote = this.processNoteInput(note.note);
                const noteTime = note.start !== undefined ? note.start : note.time || 0;
                const parsedTime = typeof noteTime === 'string' ? this._parseSimpleTime(noteTime) : noteTime;
                const noteDuration = typeof note.duration === 'string' ? 
                    this._parseSimpleDuration(note.duration) : (note.duration || 0.5);
                
                if (Array.isArray(processedNote)) {
                    // Chord
                    processedNote.forEach(n => {
                        track.addNote({
                            name: n,
                            time: parsedTime,
                            duration: noteDuration,
                            velocity: note.velocity || 0.8
                        });
                    });
                } else {
                    // Single note
                    track.addNote({
                        name: processedNote,
                        time: parsedTime,
                        duration: noteDuration,
                        velocity: note.velocity || 0.8
                    });
                }
            });
        });

        midi.header.setTempo(bpm);
        const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (this.projectData.metadata?.title || 'export') + '.mid';
        a.click();
        URL.revokeObjectURL(url);
    }

    async waitForSamplersToLoad(samplers, timeout = 10000) {
        // Helper method to ensure all Samplers are loaded before proceeding
        const loadPromises = samplers.map(sampler => {
            return new Promise((resolve, reject) => {
                if (sampler.loaded) {
                    resolve();
                } else {
                    const timeoutId = setTimeout(() => {
                        reject(new Error(`Sampler load timeout after ${timeout}ms`));
                    }, timeout);
                    
                    sampler.context.addEventListener('load', () => {
                        clearTimeout(timeoutId);
                        resolve();
                    });
                }
            });
        });
        
        return Promise.all(loadPromises);
    }

    async exportWAV() {
        console.log('Starting WAV export...');
        const duration = this.getTotalDuration();

        // Pre-load all Samplers before offline rendering
        const synthsForOffline = [];

        // Process each sequence and prepare instruments
        for (let index = 0; index < this.projectData.sequences.length; index++) {
            const seq = this.projectData.sequences[index];
            const track = this.tracks[index];
            
            if (!track || track.muteCheckbox.checked) continue;
            
            let synth;
            const selectedType = track.synthSelect.value;
            
            if (selectedType === 'Sampler') {
                synth = new Tone.Sampler({
                    urls: seq.synth.urls || {},
                    baseUrl: seq.synth.baseUrl || ''
                });
                synthsForOffline.push({ synth, track, seq, type: 'Sampler' });
            } else if (selectedType === 'Custom') {
                synth = this.createCustomSynth(seq.synth);
                synthsForOffline.push({ synth, track, seq, type: 'Custom' });
            } else {                const hasChord = seq.notes.some(n => Array.isArray(n.note));
                // Avoid using PolySynth to prevent "voice is not a constructor" errors
                synth = new Tone[selectedType]();
                synthsForOffline.push({ synth, track, seq, type: selectedType, hasChord });
            }
        }

        try {
            // Wait for all samplers to load
            const samplers = synthsForOffline.filter(s => s.type === 'Sampler').map(s => s.synth);
            if (samplers.length > 0) {
                console.log('⏳ Waiting for samplers to load...');
                await this.waitForSamplersToLoad(samplers);
                console.log('✅ All samplers loaded');
            }            // Create offline context
            console.log('🎵 Creating offline render context...');
            const offlineContext = new Tone.OfflineContext(2, duration, 44100);
            
            // Create instruments in offline context
            synthsForOffline.forEach(({ synth, track, seq, type }) => {
                synth.connect(offlineContext.destination);
                
                const expandedNotes = this.expandNotesWithLoop(seq);
                  expandedNotes.forEach(note => {
                    let processedNote = this.processNoteInput(note.note);
                    
                    const noteTime = typeof note.start === 'number' ? note.start : 
                                   typeof note.time === 'number' ? note.time : 0;
                    const noteDuration = typeof note.duration === 'number' ? note.duration : 0.5;
                    const velocity = note.velocity || 0.8;
                    
                    if (Array.isArray(processedNote)) {
                        if (type === 'Sampler') {
                            // Samplers can handle chords natively
                            synth.triggerAttackRelease(
                                processedNote,
                                noteDuration,
                                noteTime,
                                velocity
                            );
                        } else {
                            // For regular synths, play each note with a small offset
                            processedNote.forEach((noteInChord, index) => {
                                const offsetTime = noteTime + (index * 0.005);
                                synth.triggerAttackRelease(
                                    noteInChord,
                                    noteDuration,
                                    offsetTime,
                                    velocity
                                );
                                                       });
                        }
                    } else {
                        // Single note - play normally
                        synth.triggerAttackRelease(
                            processedNote,
                            noteDuration,
                            noteTime,
                            velocity
                        );
                    }
                });
            });
            
            // Render audio
            console.log('🎧 Rendering audio...');
            const buffer = await offlineContext.render();
            
            // Convert to WAV
            console.log('💾 Converting to WAV...');
            const wav = this.bufferToWav(buffer);
            
            // Download
            const url = URL.createObjectURL(wav);
            const a = document.createElement('a');
            a.href = url;
            a.download = (this.projectData.metadata?.title || 'export') + '.wav';
            a.click();
            URL.revokeObjectURL(url);
            
            console.log('✅ WAV export complete!');
            
            // Clean up
            synthsForOffline.forEach(({ synth }) => synth.dispose());
            
        } catch (error) {
            console.error('❌ WAV export failed:', error);
            alert('WAV export failed: ' + error.message);
            
            // Clean up on error
            synthsForOffline.forEach(({ synth }) => synth.dispose());
        }
    }

    bufferToWav(buffer) {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const out = new ArrayBuffer(length);
        const view = new DataView(out);
        let pos = 0;

        const write = (s) => {
            for (let i = 0; i < s.length; i++) {
                view.setUint8(pos + i, s.charCodeAt(i));
            }
            pos += s.length;
        };
        const writeUint16 = (d) => {
            view.setUint16(pos, d, true);
            pos += 2;
        };
        const writeUint32 = (d) => {
            view.setUint32(pos, d, true);
            pos += 4;
        };

        write('RIFF'); writeUint32(length - 8); write('WAVE');
        write('fmt '); writeUint32(16); writeUint16(1); writeUint16(numOfChan);
        writeUint32(buffer.sampleRate); writeUint32(buffer.sampleRate * 2 * numOfChan);
        writeUint16(numOfChan * 2); writeUint16(16);
        write('data'); writeUint32(length - pos - 4);

        const channels = Array.from({ length: numOfChan }, (_, i) => buffer.getChannelData(i));
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numOfChan; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                view.setInt16(pos, sample * 0x7FFF, true);
                pos += 2;
            }
        }
        return new Blob([out], { type: 'audio/wav' });
    }

    createCustomSynth(synthData) {
        const synth = new Tone.MonoSynth({
            oscillator: { type: synthData.oscillator || 'square' },
            filter: { Q: 1, type: 'lowpass', rolloff: -12 },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1 }
        }).toDestination();
        return synth;
    }

    /**
     * Map jmon-tone instrument engine to Tone.js synth type
     * @param {Object} instrument - jmon-tone instrument definition
     * @param {string} selectedType - Selected synth type from UI
     * @returns {Function} Tone.js synth constructor
     */
    mapInstrumentToToneType(instrument, selectedType) {
        // Use selected type if available
        if (selectedType && selectedType !== 'Auto' && Tone[selectedType]) {
            return selectedType;
        }        // Map jmon-tone engine names to Tone.js type strings
        const engineMap = {
            'synth': 'Synth',
            'amsynth': 'AMSynth',
            'fmsynth': 'FMSynth',
            'duosynth': 'DuoSynth',
            'polysynth': 'FMSynth', // Use FMSynth instead of PolySynth to avoid constructor errors
            'monosynth': 'MonoSynth',
            'noisesynth': 'NoiseSynth',
            'plucksynth': 'PluckSynth'
        };
        const engine = instrument.engine?.toLowerCase() || 'synth';
        return engineMap[engine] || 'Synth';
    }

    /**
     * Apply jmon-tone instrument parameters to Tone.js synth
     * @param {Object} synth - Tone.js synth instance
     * @param {Object} parameters - jmon-tone instrument parameters
     */
    applySynthParameters(synth, parameters) {
        try {
            // Apply oscillator parameters
            if (parameters.oscillator && synth.oscillator) {
                Object.keys(parameters.oscillator).forEach(key => {
                    if (synth.oscillator[key] !== undefined) {
                        if (synth.oscillator[key] && typeof synth.oscillator[key] === 'object' && 'value' in synth.oscillator[key]) {
                            synth.oscillator[key].value = parameters.oscillator[key];
                        } else {
                            synth.oscillator[key] = parameters.oscillator[key];
                        }
                    }
                });
            }
            // Apply envelope parameters
            if (parameters.envelope && synth.envelope) {
                Object.keys(parameters.envelope).forEach(key => {
                    if (synth.envelope[key] !== undefined) {
                        if (synth.envelope[key] && typeof synth.envelope[key] === 'object' && 'value' in synth.envelope[key]) {
                            synth.envelope[key].value = parameters.envelope[key];
                        } else {
                            synth.envelope[key] = parameters.envelope[key];
                        }
                    }
                });
            }
            // Apply filter parameters
            if (parameters.filter && synth.filter) {
                Object.keys(parameters.filter).forEach(key => {
                    if (synth.filter[key] !== undefined) {
                        if (synth.filter[key] && typeof synth.filter[key] === 'object' && 'value' in synth.filter[key]) {
                            synth.filter[key].value = parameters.filter[key];
                        } else {
                            synth.filter[key] = parameters.filter[key];
                        }
                    }
                });
            }
            
            // Apply other parameters (polyphony, voice, etc.)
            if (parameters.polyphony && synth.polyphony !== undefined) {
                synth.polyphony = parameters.polyphony;
            }
            
            if (parameters.voice && synth.voice !== undefined) {
                synth.voice = parameters.voice;
            }
            
        } catch (error) {
            console.warn('Error applying synth parameters:', error);
        }
    }

    /**
     * Force a complete refresh of the display - useful after metadata changes
     */
    forceRefresh() {
        console.log('🔄 Forcing complete UI refresh...');
        
        // Recalculate total duration
        const newDuration = this.getTotalDuration();
        
        // Update display elements
        if (this.totalTimeDisplay) {
            this.totalTimeDisplay.textContent = this.formatTimeWithBars(newDuration);
            this.totalTimeDisplay.title = `Total composition duration: ${newDuration.toFixed(1)}s`;
        }
        
        // Update transport settings
        if (this.globalLoop.checked) {
            this.transport.loopEnd = newDuration;
        }
        
        // Scaling recalculation is handled by drawNotes()
        
        // Redraw everything
        this.drawNotes();
        
        console.log(`✅ UI refresh complete - new duration: ${newDuration.toFixed(2)}s`);
    }

    /**
     * Apply different styling options for looped notes while preserving velocity transparency
     * @param {HTMLElement} noteElement - The note element to style
     * @param {number} velocityOpacity - The velocity-based opacity to preserve
     */
    applyLoopStyling(noteElement, velocityOpacity) {
        switch(this.loopStyle) {
            case 'dashed-icon':
                // Default: dashed border + icon
                noteElement.style.borderStyle = 'dashed';
                noteElement.style.borderWidth = '2px';
                
                const loopIcon = document.createElement('span');
                loopIcon.textContent = '↻';
                loopIcon.style.cssText = `
                    position: absolute;
                    top: 1px;
                    right: 2px;
                    font-size: 8px;
                    color: #fff;
                    font-weight: bold;
                    text-shadow: 1px 1px 1px rgba(0,0,0,0.8);
                    pointer-events: none;
                `;
                noteElement.appendChild(loopIcon);
                break;

            case 'hatched':
                // Diagonal hatching pattern
                noteElement.style.backgroundImage = `
                    linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%),
                    linear-gradient(-45deg, transparent 25%, rgba(255,255,255,0.1) 25%),
                    linear-gradient(45deg, rgba(255,255,255,0.1) 75%, transparent 75%),
                    linear-gradient(-45deg, rgba(255,255,255,0.1) 75%, transparent 75%)
                `;
                noteElement.style.backgroundSize = '6px 6px';
                noteElement.style.backgroundPosition = '0 0, 0 3px, 3px -3px, -3px 0px';
                break;

            case 'gradient':
                // Subtle gradient effect
                noteElement.style.background = `linear-gradient(135deg, 
                    rgba(0,0,0,${velocityOpacity}) 0%, 
                    rgba(80,80,80,${velocityOpacity}) 100%)`;
                break;

            case 'double-border':
                // Double border effect
                noteElement.style.border = '3px double #666';
                break;

            case 'outline':
                // Outline effect
                noteElement.style.boxShadow = `
                    0 0 0 1px #333,
                    0 0 0 3px rgba(255,255,255,0.3)`;
                break;

            default:
                // Fallback to dashed-icon
                this.loopStyle = 'dashed-icon';
                this.applyLoopStyling(noteElement, velocityOpacity);
        }    }    /**
     * Debug helper for chord playback issues
     */
    debugChordPlayback() {
        console.log('--------------- CHORD PLAYBACK DIAGNOSTICS ---------------');
        this.tracks.forEach((track, index) => {
            console.log(`Track ${index}: ${track.seq.label}`);
            console.log(`  - Synth type: ${track.synthType}`);
            
            const hasSynth = !!track.synth;
            console.log(`  - Has synth object: ${hasSynth}`);
            
            if (hasSynth) {
                console.log(`  - Synth constructor: ${track.synth.constructor.name}`);
                console.log(`  - Synth toString: ${track.synth.toString()}`);
            }
            
            // Check notes for chords
            const expandedNotes = this.expandNotesWithLoop(track.seq);
            const chordNotes = expandedNotes.filter(note => {
                const processedNote = this.processNoteInput(note.note);
                return Array.isArray(processedNote);
            });
            
            console.log(`  - Total notes: ${expandedNotes.length}`);
            console.log(`  - Notes with chords: ${chordNotes.length}`);
            
            if (chordNotes.length > 0) {
                const firstChord = this.processNoteInput(chordNotes[0].note);
                console.log(`  - Example chord: ${JSON.stringify(firstChord)}`);
                
                // Test chord playback directly
                if (hasSynth) {
                    console.log(`  - Testing direct chord playback...`);
                    try {
                        firstChord.forEach((note, noteIndex) => {
                            const offset = noteIndex * 0.01;
                            track.synth.triggerAttackRelease(note, "8n", Tone.now() + offset);
                            console.log(`    - Played note: ${note} with offset ${offset}`);
                        });
                    } catch (e) {
                        console.error(`    - Error playing chord: ${e.message}`);
                    }
                }
            }
        });
        console.log('--------------------------------------------------------');    }

    // Enhanced timeline methods
    createTimelineRuler() {
        // Safety check: return early if trackArea doesn't exist yet
        if (!this.trackArea) {
            console.warn('createTimelineRuler called before trackArea exists');
            return;
        }
        
        const existingRuler = this.trackArea.querySelector('.timeline-ruler');
        if (existingRuler) {
            existingRuler.remove();
        }

        const timelineRuler = document.createElement('div');
        timelineRuler.className = 'timeline-ruler';
        
        const totalDuration = this.getTotalDuration();
        const bpm = this.transport?.bpm?.value || this.projectData.bpm || 120;
        const beatsPerMeasure = 4; // 4/4 time signature
        const secondsPerBeat = 60 / bpm;
        const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;

        // Create ruler content container
        const rulerContent = document.createElement('div');
        rulerContent.className = 'timeline-ruler-content';
        
        // Calculate ruler width
        const rulerWidth = totalDuration * this.pixelsPerSecond;
        rulerContent.style.width = `${rulerWidth}px`;
        rulerContent.style.minWidth = `${rulerWidth}px`;
        
        // Add measure and beat markers
        let currentTime = 0;
        let measureNumber = 1;
        
        while (currentTime <= totalDuration) {
            const measurePosition = currentTime * this.pixelsPerSecond;
            
            // Measure marker
            const measureMarker = document.createElement('div');
            measureMarker.className = 'measure-marker';
            measureMarker.style.left = `${measurePosition}px`;
            
            const measureLabel = document.createElement('span');
            measureLabel.className = 'measure-label';
            measureLabel.textContent = measureNumber;
            measureMarker.appendChild(measureLabel);
            
            rulerContent.appendChild(measureMarker);
            
            // Beat subdivisions within this measure
            for (let beat = 1; beat < beatsPerMeasure; beat++) {
                const beatTime = currentTime + (beat * secondsPerBeat);
                if (beatTime > totalDuration) break;
                
                const beatPosition = beatTime * this.pixelsPerSecond;
                const beatMarker = document.createElement('div');
                beatMarker.className = 'beat-marker';
                beatMarker.style.left = `${beatPosition}px`;
                
                // Add quarter note subdivisions (16th notes)
                for (let subdivision = 1; subdivision < 4; subdivision++) {
                    const subdivisionTime = beatTime + (subdivision * secondsPerBeat / 4);
                    if (subdivisionTime > totalDuration) break;
                    
                    const subdivisionPosition = subdivisionTime * this.pixelsPerSecond;
                    const subdivisionMarker = document.createElement('div');
                    subdivisionMarker.className = 'subdivision-marker';
                    subdivisionMarker.style.left = `${subdivisionPosition}px`;
                    rulerContent.appendChild(subdivisionMarker);
                }
                
                rulerContent.appendChild(beatMarker);
            }
            
            currentTime += secondsPerMeasure;
            measureNumber++;
        }
        
        // Add tempo change indicators if they exist
        this.addTempoChangeMarkers(rulerContent);
          // Add loop region indicators
        this.addLoopRegionIndicators(rulerContent);
        
        // Add ruler progress line
        const rulerProgressLine = document.createElement('div');
        rulerProgressLine.className = 'ruler-progress-line';
        rulerProgressLine.style.left = '0px';
        rulerContent.appendChild(rulerProgressLine);
        
        timelineRuler.appendChild(rulerContent);
        
        // Insert ruler at the top of track area
        this.trackArea.insertBefore(timelineRuler, this.trackArea.firstChild);
        
        return timelineRuler;
    }

    addTempoChangeMarkers(rulerContent) {
        // Check if project has tempo changes
        if (this.projectData.tempoChanges && this.projectData.tempoChanges.length > 0) {
            this.projectData.tempoChanges.forEach(change => {
                const changeTime = this._parseSimpleTime(change.time);
                const changePosition = changeTime * this.pixelsPerSecond;
                
                const tempoMarker = document.createElement('div');
                tempoMarker.className = 'tempo-change-marker';
                tempoMarker.style.left = `${changePosition}px`;
                tempoMarker.title = `Tempo change: ${change.bpm} BPM at ${this.formatTime(changeTime)}`;
                
                const tempoLabel = document.createElement('span');
                tempoLabel.className = 'tempo-change-label';
                tempoLabel.textContent = `${change.bpm}`;
                tempoMarker.appendChild(tempoLabel);
                
                rulerContent.appendChild(tempoMarker);
            });
        }
    }

    addLoopRegionIndicators(rulerContent) {
        // Add global loop region if enabled
        if (this.globalLoop.checked) {
            const loopRegion = document.createElement('div');
            loopRegion.className = 'loop-region';
            loopRegion.style.left = '0px';
            loopRegion.style.width = `${this.getTotalDuration() * this.pixelsPerSecond}px`;
            
            // Add loop handles
            const startHandle = document.createElement('div');
            startHandle.className = 'loop-handle loop-start-handle';
            startHandle.style.left = '0px';
            
            const endHandle = document.createElement('div');
            endHandle.className = 'loop-handle loop-end-handle';
            endHandle.style.left = `${this.getTotalDuration() * this.pixelsPerSecond - 10}px`;
            
            // Make handles draggable
            this.makeLoopHandleDraggable(startHandle, 'start');
            this.makeLoopHandleDraggable(endHandle, 'end');
            
            loopRegion.appendChild(startHandle);
            loopRegion.appendChild(endHandle);
            rulerContent.appendChild(loopRegion);
        }
        
        // Add individual track loop regions
        this.tracks.forEach((track, index) => {
            const seq = track.seq;
            if (seq.loop && seq.loop !== false) {
                let loopEndTime;
                if (typeof seq.loop === 'string') {
                    loopEndTime = this._parseSimpleTime(seq.loop);
                } else {
                    // Calculate from latest note
                    let maxNoteEnd = 0;
                    seq.notes.forEach(note => {
                        const noteTime = note.start !== undefined ? note.start : note.time || 0;
                        const parsedTime = typeof noteTime === 'string' ? this._parseSimpleTime(noteTime) : noteTime;
                        const noteDuration = typeof note.duration === 'string' ? 
                            this._parseSimpleDuration(note.duration) : (note.duration || 0.5);
                        maxNoteEnd = Math.max(maxNoteEnd, parsedTime + noteDuration);
                    });
                    loopEndTime = maxNoteEnd;
                }
                
                const trackLoopIndicator = document.createElement('div');
                trackLoopIndicator.className = 'track-loop-indicator';
                trackLoopIndicator.style.left = '0px';
                trackLoopIndicator.style.width = `${loopEndTime * this.pixelsPerSecond}px`;
                trackLoopIndicator.style.top = `${(index + 1) * 48 + 30}px`; // Position relative to track
                trackLoopIndicator.title = `${track.seq.label} loops every ${this.formatTime(loopEndTime)}`;
                
                rulerContent.appendChild(trackLoopIndicator);
            }
        });
    }

    makeLoopHandleDraggable(handle, type) {
        let isDragging = false;
        let startX = 0;
        
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            document.addEventListener('mousemove', onDrag);
            document.addEventListener('mouseup', onDragEnd);
            e.preventDefault();
        });
        
        const onDrag = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const currentLeft = parseInt(handle.style.left) || 0;
            const newLeft = Math.max(0, currentLeft + deltaX);
            
            // Convert position to time
            const newTime = newLeft / this.pixelsPerSecond;
            const totalDuration = this.getTotalDuration();
            
            if (type === 'start' && newTime < totalDuration) {
                handle.style.left = `${newLeft}px`;
                // Update transport loop start if implemented
            } else if (type === 'end' && newTime <= totalDuration) {
                handle.style.left = `${newLeft}px`;
                // Update transport loop end
                this.transport.loopEnd = newTime;
            }
            
            startX = e.clientX;
        };
        
        const onDragEnd = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('mouseup', onDragEnd);
        };    }

    // Enhanced zoom controls
    createEnhancedZoomControls() {
        // Safety check: return early if container doesn't exist yet
        if (!this.container) {
            console.warn('createEnhancedZoomControls called before container exists');
            return;
        }
        
        const existingControls = this.container.querySelector('.enhanced-zoom-controls');
        if (existingControls) {
            existingControls.remove();
        }

        const zoomControls = document.createElement('div');
        zoomControls.className = 'enhanced-zoom-controls';
        
        // Zoom level indicator
        const zoomLevel = document.createElement('span');
        zoomLevel.className = 'zoom-level-indicator';
        zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
        
        /*
        // Zoom slider (commented out)
        const zoomSlider = document.createElement('input');
        zoomSlider.type = 'range';
        zoomSlider.className = 'zoom-slider';
        zoomSlider.min = this.minPixelsPerSecond;
        zoomSlider.max = this.maxPixelsPerSecond;
        zoomSlider.value = this.pixelsPerSecond;
        zoomSlider.step = 1;
        zoomSlider.oninput = () => {
            this.pixelsPerSecond = parseFloat(zoomSlider.value);
            zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
            this.autoScale = false; // Disable auto-scale when manually zooming
            this.autoScaleCheckbox.checked = false;
            this.drawNotes();
            // Update timeline ruler if it exists
            if (this.trackArea) {
                this.createTimelineRuler();
            }
        };
        */
        
        // Fit to width button
        const fitToWidthBtn = document.createElement('button');
        fitToWidthBtn.className = 'zoom-button prominent';
        fitToWidthBtn.innerHTML = '⟷';
        fitToWidthBtn.title = 'Fit to width';
        fitToWidthBtn.onclick = () => {
            this.autoScale = true;
            this.autoScaleCheckbox.checked = true;
            this.drawNotes();
            // Update timeline ruler if it exists
            if (this.trackArea) {
                this.createTimelineRuler();
            }
        };
        
        // 1:1 zoom button
        const oneToOneBtn = document.createElement('button');
        oneToOneBtn.className = 'zoom-button prominent';
        oneToOneBtn.innerHTML = '1:1';
        oneToOneBtn.title = 'Reset to 1:1 zoom';
        oneToOneBtn.onclick = () => {
            this.pixelsPerSecond = 50; // Default zoom level
            // zoomSlider.value = this.pixelsPerSecond; // (commented out)
            zoomLevel.textContent = `${Math.round(this.pixelsPerSecond)}px/s`;
            this.autoScale = false;
            this.autoScaleCheckbox.checked = false;
            this.drawNotes();
            // Update timeline ruler if it exists
            if (this.trackArea) {
                this.createTimelineRuler();
            }
        };
        
        zoomControls.appendChild(document.createTextNode('Zoom: '));
        // zoomControls.appendChild(zoomSlider); // (commented out)
        zoomControls.appendChild(zoomLevel);
        zoomControls.appendChild(fitToWidthBtn);
        zoomControls.appendChild(oneToOneBtn);
        
        // Insert after the top row
        const topRow = this.container.querySelector('.top-row');
        topRow.parentNode.insertBefore(zoomControls, topRow.nextSibling);
        
        return zoomControls;
    }
}

// Make sure ToneDAW is available in the global scope
if (typeof window !== 'undefined') {
    window.ToneDAW = ToneDAW;
}
