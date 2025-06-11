class ToneDAW {
    constructor(containerId, projectData, options = {}) {
        this.container = document.getElementById(containerId);
        this.rawProjectData = projectData; // Store original data
        this.options = options;
        this.pixelsPerSecond = 50; // Dynamic value - will be calculated (more conservative default)
        this.minPixelsPerSecond = 20; // Reduced minimum scale for long compositions
        this.maxPixelsPerSecond = 200; // Maximum scale to prevent excessive width
        this.autoScale = true; // Enable dynamic scaling by default
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
     */
    processNoteInput(note) {
        // Use jmon-tone.js if available
        if (typeof jmonTone !== 'undefined') {
            return jmonTone.processNoteInput(note);
        }
        
        // Fallback to local implementation
        if (Array.isArray(note)) {
            // Handle chord arrays - process each note
            return note.map(n => this.processNoteInput(n));
        } else if (typeof note === 'number') {
            return this.midiNoteToNoteName(note);
        } else {
            return note; // Already a note name
        }
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
        topRow.className = 'top-row';

        this.playButton = document.createElement('button');
        this.playButton.className = 'play-button large';
        this.playButton.appendChild(playSVG.cloneNode(true));
        this.playButton.onclick = () => this.togglePlay(playSVG, pauseSVG);

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
        zoomOutBtn.title = 'Zoom out (decrease note width)';
        zoomOutBtn.onclick = () => {
            this.pixelsPerSecond = Math.max(this.minPixelsPerSecond, this.pixelsPerSecond * 0.8);
            this.drawNotes();
        };
        
        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'zoom-button';
        zoomInBtn.textContent = '+';
        zoomInBtn.title = 'Zoom in (increase note width)';
        zoomInBtn.onclick = () => {
            this.pixelsPerSecond = Math.min(this.maxPixelsPerSecond, this.pixelsPerSecond * 1.25);
            this.drawNotes();
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
        zoomWrapper.appendChild(refreshBtn);

        // Update auto-scale checkbox behavior to show/hide zoom controls
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
        };

        // Timeline controls
        this.currentTimeDisplay = document.createElement('span');
        this.currentTimeDisplay.className = 'current-time-display';
        this.currentTimeDisplay.textContent = '0:00';

        this.timelineSlider = document.createElement('input');
        this.timelineSlider.type = 'range';
        this.timelineSlider.min = 0;
        this.timelineSlider.max = 100;
        this.timelineSlider.value = 0;
        this.timelineSlider.step = 0.1;
        this.timelineSlider.oninput = () => {
            const time = (this.timelineSlider.value / 100) * this.getTotalDuration();
            this.transport.seconds = time;
            // Immediately update current time display while scrubbing
            this.currentTimeDisplay.textContent = this.formatTime(time);
        };

        this.totalTimeDisplay = document.createElement('span');
        this.totalTimeDisplay.className = 'total-time-display';
        const duration = this.getTotalDuration();
        this.totalTimeDisplay.textContent = this.formatTimeWithBars(duration);
        this.totalTimeDisplay.title = `Total composition duration: ${duration.toFixed(1)}s`;

        topRow.append(this.playButton, this.currentTimeDisplay, this.timelineSlider, this.totalTimeDisplay, tempoWrapper, globalLoopWrapper, autoScaleWrapper, zoomWrapper);
        this.container.appendChild(topRow);

        // Zone des tracks
        this.trackArea = document.createElement('div');
        this.trackArea.className = 'daw-track-area';
        this.container.appendChild(this.trackArea);

        // Types de synthétiseurs disponibles
        const synthTypes = ['Synth', 'AMSynth', 'FMSynth', 'DuoSynth', 'Sampler'];
        if (this.projectData.sequences.some(seq => seq.synth.type === 'Custom')) {
            synthTypes.push('Custom');
        }

        // Créer les tracks
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
                    this.autoScaleCheckbox.onchange();
                } else if (e.code === 'Equal' && e.ctrlKey) {
                    // Ctrl+= : Zoom in (manual mode)
                    e.preventDefault();
                    if (!this.autoScale) {
                        this.pixelsPerSecond = Math.min(this.maxPixelsPerSecond, this.pixelsPerSecond * 1.25);
                        this.drawNotes();
                    }
                } else if (e.code === 'Minus' && e.ctrlKey) {
                    // Ctrl+- : Zoom out (manual mode)
                    e.preventDefault();
                    if (!this.autoScale) {
                        this.pixelsPerSecond = Math.max(this.minPixelsPerSecond, this.pixelsPerSecond * 0.8);
                        this.drawNotes();
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
        `;
        this.container.appendChild(helpInfo);

        this.drawNotes();
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
        
        // For compositions longer than 30s, be more aggressive with scaling down
        let effectiveMinPixels = this.minPixelsPerSecond;
        if (totalDuration > 30) {
            effectiveMinPixels = Math.max(5, this.minPixelsPerSecond * 0.3); // Much more aggressive
        } else if (totalDuration > 60) {
            effectiveMinPixels = Math.max(3, this.minPixelsPerSecond * 0.2); // Very aggressive
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
        }
        
        this.trackArea.appendChild(progressLine);
        this.progressLine = progressLine;
        } finally {
            this._drawingNotes = false;
        }
    }

    expandNotesWithLoop(seq) {
        const expandedNotes = [...seq.notes]; // Start with original notes

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
                    }
                });
            }
        }

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
            let synth;

            // Create synth from jmon-tone instrument definition
            const instrument = seq.instrument || this.convertSynthToInstrument(seq.synth);
            
            // Create the appropriate synth based on instrument type
            if (instrument.type === 'sampler' || selectedType === 'Sampler') {
                synth = new Tone.Sampler({
                    urls: instrument.samples || seq.synth?.urls || {},
                    baseUrl: instrument.baseUrl || seq.synth?.baseUrl || '',
                    onload: () => {
                        console.log(`✅ Sampler loaded for track: ${seq.label}`);
                    }
                }).toDestination();
                track.sampler = synth;
            } else if (selectedType === 'Custom' || instrument.engine === 'custom') {
                synth = this.createCustomSynth(instrument.parameters || seq.synth);
                track.sampler = null;
            } else {
                // Convert jmon-tone instrument to Tone.js synth
                const ToneSynthType = this.mapInstrumentToToneType(instrument, selectedType);
                const hasChord = seq.notes.some(n => Array.isArray(n.note));
                
                if (hasChord) {
                    synth = new Tone.PolySynth(ToneSynthType).toDestination();
                } else {
                    synth = new ToneSynthType().toDestination();
                }
                
                // Apply instrument parameters
                if (instrument.parameters) {
                    this.applySynthParameters(synth, instrument.parameters);
                }
                
                track.sampler = null;
            }

            track.synth = synth;
            this.synths.push(synth);

            // Create Tone.Part for sequence
            const notes = seq.notes.map(note => ({
                time: note.start !== undefined ? note.start : note.time || 0,
                note: self.processNoteInput(note.note),
                duration: note.duration || '8n',
                velocity: note.velocity || 0.8
            }));

            const part = new Tone.Part((time, note) => {
                if (!track.muteCheckbox.checked) {
                    if (selectedType === 'Sampler' && synth.loaded) {
                        synth.triggerAttackRelease(note.note, note.duration, time, note.velocity);
                    } else if (selectedType !== 'Sampler') {
                        synth.triggerAttackRelease(note.note, note.duration, time, note.velocity);
                    }
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
            } else {
                const hasChord = seq.notes.some(n => Array.isArray(n.note));
                if (hasChord) {
                    synth = new Tone.PolySynth(Tone[selectedType]);
                } else {
                    synth = new Tone[selectedType]();
                }
                synthsForOffline.push({ synth, track, seq, type: selectedType });
            }
        }

        try {
            // Wait for all samplers to load
            const samplers = synthsForOffline.filter(s => s.type === 'Sampler').map(s => s.synth);
            if (samplers.length > 0) {
                console.log('⏳ Waiting for samplers to load...');
                await this.waitForSamplersToLoad(samplers);
                console.log('✅ All samplers loaded');
            }

            // Create offline context
            console.log('🎵 Creating offline render context...');
            const offlineContext = new Tone.OfflineContext(2, duration, 44100);
            
            // Create instruments in offline context
            synthsForOffline.forEach(({ synth, track, seq }) => {
                synth.connect(offlineContext.destination);
                
                const expandedNotes = this.expandNotesWithLoop(seq);
                
                expandedNotes.forEach(note => {
                    const processedNote = this.processNoteInput(note.note);
                    const noteTime = typeof note.start === 'number' ? note.start : 
                                   typeof note.time === 'number' ? note.time : 0;
                    const noteDuration = typeof note.duration === 'number' ? note.duration : 0.5;
                    
                    synth.triggerAttackRelease(
                        processedNote,
                        noteDuration,
                        noteTime,
                        note.velocity || 0.8
                    );
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
            return Tone[selectedType];
        }
        
        // Map jmon-tone engine names to Tone.js types
        const engineMap = {
            'synth': Tone.Synth,
            'amsynth': Tone.AMSynth,
            'fmsynth': Tone.FMSynth,
            'duosynth': Tone.DuoSynth,
            'polysynth': Tone.PolySynth,
            'monosynth': Tone.MonoSynth,
            'noisesynth': Tone.NoiseSynth,
            'plucksynth': Tone.PluckSynth
        };
        
        const engine = instrument.engine?.toLowerCase() || 'synth';
        return engineMap[engine] || Tone.Synth;
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
                        synth.oscillator[key].value = parameters.oscillator[key];
                    }
                });
            }
            
            // Apply envelope parameters
            if (parameters.envelope && synth.envelope) {
                Object.keys(parameters.envelope).forEach(key => {
                    if (synth.envelope[key] !== undefined) {
                        synth.envelope[key].value = parameters.envelope[key];
                    }
                });
            }
            
            // Apply filter parameters
            if (parameters.filter && synth.filter) {
                Object.keys(parameters.filter).forEach(key => {
                    if (synth.filter[key] !== undefined) {
                        synth.filter[key].value = parameters.filter[key];
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

    // ...existing code...
    
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
        
        // Force scaling recalculation
        this.forceScaleUpdate();
        
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
        }
    }
}

window.ToneDAW = ToneDAW;
