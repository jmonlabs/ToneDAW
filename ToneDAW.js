class ToneDAW {
    constructor(containerId, projectData, options = {}) {
        this.container = document.getElementById(containerId);
        this.projectData = projectData;
        this.options = options;
        this.pixelsPerSecond = 60;
        this.tracks = [];
        this.synths = [];
        this.parts = [];
        this.transport = Tone.Transport;
        this.playing = false;
        this.animationId = null; // Track animation frame ID
        this.init();
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
                this.transport.bpm.value = bpm;
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

        // Timeline controls
        this.currentTimeDisplay = document.createElement('span');
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
        };

        this.totalTimeDisplay = document.createElement('span');
        this.totalTimeDisplay.textContent = this.formatTime(this.getTotalDuration());

        topRow.append(this.playButton, this.currentTimeDisplay, this.timelineSlider, this.totalTimeDisplay, tempoWrapper, globalLoopWrapper);
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
                // Toggle active class
                if (muteCheckbox.checked) {
                    muteLabel.classList.add('active');
                } else {
                    muteLabel.classList.remove('active');
                }
                this.updateTrackStates();
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
                // Toggle active class
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
                // Update the sequence loop setting
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
                option.selected = seq.synth.type === type;
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
                synth: null
            });
        });

        this.drawNotes();
        setTimeout(() => this.drawNotes(), 100);
        if (typeof window !== 'undefined') {
            window.addEventListener('load', () => {
                setTimeout(() => this.drawNotes(), 500);
            });
            // Use ResizeObserver for robust redraw
            if (window.ResizeObserver) {
                const ro = new ResizeObserver(() => this.drawNotes());
                if (this.trackArea) ro.observe(this.trackArea);
            }
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
    }

    drawNotes() {
        const totalDuration = this.getTotalDuration();
        
        // Remove any existing progress line from track area
        const existingProgressLine = this.trackArea.querySelector('.daw-progress-line');
        if (existingProgressLine) {
            existingProgressLine.remove();
        }

        this.tracks.forEach(track => {
            track.lane.innerHTML = '';
            // Use the actual rendered width of the track lane only (not including header)
            const laneWidth = track.lane.getBoundingClientRect().width;

            const expandedNotes = this.expandNotesWithLoop(track.seq);
            expandedNotes.forEach(note => {
                const noteElement = document.createElement('div');
                noteElement.className = 'daw-note-block';
                const startTime = typeof note.time === 'number' ? note.time : Tone.Time(note.time).toSeconds();
                const duration = Tone.Time(note.duration).toSeconds();
                noteElement.style.left = ((startTime / totalDuration) * laneWidth) + 'px';
                noteElement.style.width = Math.max(2, (duration / totalDuration) * laneWidth) + 'px';

                // Afficher la note dans le bloc
                const noteText = Array.isArray(note.note) ? note.note.join(',') : note.note;
                noteElement.textContent = noteText;
                noteElement.title = `${noteText} at ${note.time} for ${note.duration}`;

                // Add visual indicator for looped notes
                if (note.isLooped) {
                    noteElement.style.opacity = '0.8';
                    noteElement.style.borderStyle = 'dashed';
                    noteElement.classList.add('looped-note');
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
            const firstTrackHeader = this.tracks[0]?.container.querySelector('.daw-track-header');
            if (firstTrackHeader) {
                const headerWidth = firstTrackHeader.getBoundingClientRect().width;
                progressLine.style.left = headerWidth + 'px';
            }
        }
        
        this.trackArea.appendChild(progressLine);
        this.progressLine = progressLine;
    }

    expandNotesWithLoop(seq) {
        const expandedNotes = [...seq.notes]; // Start with original notes

        // If loop is defined and not false/undefined
        if (seq.loop && seq.loop !== false) {
            let loopEndTime;

            if (typeof seq.loop === 'string') {
                // Parse loop end time (e.g., '0:4', '1:0', '2:0')
                loopEndTime = Tone.Time(seq.loop).toSeconds();
            } else if (seq.loop === true) {
                // If loop is just true, use the end of the original sequence
                const lastNoteTime = Math.max(...seq.notes.map(n =>
                    Tone.Time(n.time).toSeconds() + Tone.Time(n.duration).toSeconds()
                ));
                loopEndTime = lastNoteTime;
            }

            // Calculate the original sequence duration
            const originalDuration = loopEndTime;

            // Get the total project duration to know how many loops to create
            const totalDuration = this.getTotalDuration();
            const numberOfLoops = Math.ceil(totalDuration / originalDuration);

            console.log(`Expanding loops for ${seq.label || 'track'}: loop=${seq.loop}, originalDuration=${originalDuration}s, totalDuration=${totalDuration}s, numberOfLoops=${numberOfLoops}`);

            // Add looped notes
            for (let loopIndex = 1; loopIndex < numberOfLoops; loopIndex++) {
                const loopOffset = loopIndex * originalDuration;

                seq.notes.forEach(originalNote => {
                    const loopedNote = {
                        ...originalNote,
                        time: Tone.Time(originalNote.time).toSeconds() + loopOffset,
                        isLooped: true // Mark as looped for visual styling
                    };

                    // Only add if the looped note starts before the total duration
                    // Note: loopedNote.time is already in seconds, no need to convert again
                    if (loopedNote.time < totalDuration) {
                        expandedNotes.push(loopedNote);
                        console.log(`  Added looped note: ${Array.isArray(loopedNote.note) ? loopedNote.note.join(',') : loopedNote.note} at ${loopedNote.time}s`);
                    }
                });
            }
        }

        return expandedNotes;
    }

    setupAudio() {
        // Nettoyer les anciens synths et parts
        this.synths.forEach(s => s.dispose());
        this.parts.forEach(p => p.dispose());
        this.synths = [];
        this.parts = [];

        const totalDuration = this.getTotalDuration();

        this.tracks.forEach((track, index) => {
            const seq = track.seq;
            const selectedType = track.synthSelect.value;

            // Detect if any note is a chord (array) - check original notes
            const hasChord = seq.notes.some(n => Array.isArray(n.note));
            let synth;
            if (selectedType === 'Sampler') {
                synth = new Tone.Sampler(seq.synth).toDestination();
            } else if (selectedType === 'Custom') {
                if (hasChord) {
                    synth = new Tone.PolySynth(Tone.MonoSynth).toDestination();
                } else {
                    synth = this.createCustomSynth(seq.synth);
                    synth.toDestination();
                }
            } else if (hasChord) {
                synth = new Tone.PolySynth(Tone[selectedType]).toDestination();
            } else {
                synth = new Tone[selectedType]().toDestination();
            }

            track.synth = synth;
            this.synths.push(synth);

            // Use original notes for the Tone.Part (let Tone.js handle looping)
            const part = new Tone.Part((time, note) => {
                if (!track.muteCheckbox.checked) {
                    synth.triggerAttackRelease(note.note, note.duration, time, note.velocity || 0.8);
                }
            }, seq.notes).start(0);

            // Configure Tone.js native looping
            if (seq.loop && seq.loop !== false) {
                part.loop = true;
                part.loopStart = 0;

                if (typeof seq.loop === 'string') {
                    // Use precise loop end time (e.g., '0:4', '1:0', '2:0')
                    part.loopEnd = seq.loop;
                } else if (seq.loop === true) {
                    // If loop is just true, calculate end of original sequence
                    const lastNoteTime = Math.max(...seq.notes.map(n =>
                        Tone.Time(n.time).toSeconds() + Tone.Time(n.duration).toSeconds()
                    ));
                    part.loopEnd = Tone.Time(lastNoteTime).toBarsBeatsSixteenths();
                }

                console.log(`Track "${seq.label || `Track ${index + 1}`}" loop: ${part.loopStart} to ${part.loopEnd}`);
            } else {
                part.loop = false;
            }

            track.part = part;
            this.parts.push(part);
        });

        this.transport.bpm.value = this.projectData.bpm || 120;
        this.transport.loop = this.globalLoop.checked;
        this.transport.loopEnd = totalDuration;

        this.updateTrackStates();
    }

    updateTrackStates() {
        const soloedTracks = this.tracks.filter(track => track.soloCheckbox.checked);
        const hasSolo = soloedTracks.length > 0;

        this.tracks.forEach(track => {
            if (track.part) {
                if (hasSolo) {
                    // Si des tracks sont en solo, muter toutes les autres
                    track.part.mute = !soloedTracks.includes(track) || track.muteCheckbox.checked;
                } else {
                    // Sinon, utiliser seulement l'état mute
                    track.part.mute = track.muteCheckbox.checked;
                }

                // Note: Loop is now handled in data expansion, not at the Part level
            }
        });
    }

    togglePlay(playSVG, pauseSVG) {
        if (this.transport.state === 'started') {
            this.transport.pause();
            this.playButton.innerHTML = '';
            this.playButton.appendChild(playSVG.cloneNode(true));
            this.playing = false;
            // Cancel animation when stopping
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
        } else {
            this.transport.start();
            this.playButton.innerHTML = '';
            this.playButton.appendChild(pauseSVG.cloneNode(true));
            this.playing = true;
            // Start the animation loop when playing
            this.animate();
        }
    }

    animate() {
        // Cancel any existing animation loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const loop = () => {
            if (!this.playing) {
                this.animationId = null;
                return;
            }

            const totalDuration = this.getTotalDuration();
            // Get current transport time in seconds (Tone.js v14+)
            let transportSeconds = 0;
            try {
                transportSeconds = Tone.Transport.seconds;
                if (!transportSeconds || isNaN(transportSeconds)) {
                    // Fallback: use Tone.Transport.now() if available
                    if (typeof Tone.Transport.now === 'function') {
                        transportSeconds = Tone.Transport.now();
                    } else if (Tone.Transport.position) {
                        transportSeconds = Tone.Time(Tone.Transport.position).toSeconds();
                    }
                }
            } catch (e) {
                transportSeconds = 0;
            }
            // DEBUG: Log transportSeconds to verify animation
            if (window && window.console) {
                console.log('ProgressBar transportSeconds:', transportSeconds, 'Transport state:', Tone.Transport.state, 'Position:', Tone.Transport.position);
            }

            // Update the single continuous progress line position
            if (this.progressLine && this.trackArea && this.tracks.length > 0) {
                // Get the first track header to calculate header width
                const firstTrackHeader = this.tracks[0]?.container.querySelector('.daw-track-header');
                const firstTrackLane = this.tracks[0]?.lane;
                
                if (firstTrackHeader && firstTrackLane) {
                    const headerWidth = firstTrackHeader.getBoundingClientRect().width;
                    const laneWidth = firstTrackLane.getBoundingClientRect().width;
                    
                    let progressLeft = headerWidth; // Start after the headers
                    if (totalDuration > 0 && laneWidth > 0) {
                        progressLeft += (transportSeconds / totalDuration) * laneWidth;
                    }
                    this.progressLine.style.left = progressLeft + 'px';
                }
            }

            // Update timeline slider and time displays
            const currentProgress = (transportSeconds / totalDuration) * 100;
            this.timelineSlider.value = currentProgress;
            this.currentTimeDisplay.textContent = this.formatTime(transportSeconds);

            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    getTotalDuration() {
        const allTimes = this.projectData.sequences.flatMap(seq =>
            seq.notes.map(n => Tone.Time(n.time).toSeconds() + Tone.Time(n.duration).toSeconds())
        );
        return Math.max(...allTimes, 4); // Minimum 4 secondes
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${min}:${sec}`;
    }

    exportMIDI() {
        const midi = new Midi();
        const bpm = this.transport.bpm.value;

        this.projectData.sequences.forEach((seq, index) => {
            const track = midi.addTrack();
            // Use expanded notes for MIDI export to include loop repetitions
            const expandedNotes = this.expandNotesWithLoop(seq);
            expandedNotes.forEach(note => {
                const notes = Array.isArray(note.note) ? note.note : [note.note];
                notes.forEach(n => {
                    track.addNote({
                        name: n,
                        time: typeof note.time === 'number' ? note.time : Tone.Time(note.time).toSeconds(),
                        duration: Tone.Time(note.duration).toSeconds(),
                        velocity: note.velocity || 0.8
                    });
                });
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

    async exportWAV() {
        const duration = this.getTotalDuration();

        const buffer = await Tone.Offline(({ transport }) => {
            this.projectData.sequences.forEach((seq, index) => {
                const selectedType = this.tracks[index].synthSelect.value;

                // Detect if any note is a chord (array)
                const hasChord = seq.notes.some(n => Array.isArray(n.note));
                let synth;

                if (selectedType === 'Sampler') {
                    synth = new Tone.Sampler(seq.synth).toDestination();
                } else if (selectedType === 'Custom') {
                    if (hasChord) {
                        synth = new Tone.PolySynth(Tone.MonoSynth).toDestination();
                    } else {
                        synth = this.createCustomSynth(seq.synth);
                        synth.toDestination();
                    }
                } else if (hasChord) {
                    synth = new Tone.PolySynth(Tone[selectedType]).toDestination();
                } else {
                    synth = new Tone[selectedType]().toDestination();
                }

                // Create Part with native Tone.js looping for WAV export
                const part = new Tone.Part((time, note) => {
                    synth.triggerAttackRelease(note.note, note.duration, time, note.velocity || 0.8);
                }, seq.notes).start(0);

                // Configure looping for offline rendering
                if (seq.loop && seq.loop !== false) {
                    part.loop = true;
                    part.loopStart = 0;

                    if (typeof seq.loop === 'string') {
                        part.loopEnd = seq.loop;
                    } else if (seq.loop === true) {
                        const lastNoteTime = Math.max(...seq.notes.map(n =>
                            Tone.Time(n.time).toSeconds() + Tone.Time(n.duration).toSeconds()
                        ));
                        part.loopEnd = Tone.Time(lastNoteTime).toBarsBeatsSixteenths();
                    }
                }
            });

            transport.start();
        }, duration);

        const wavBlob = this.bufferToWav(buffer.get());
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (this.projectData.metadata?.title || 'export') + '.wav';
        a.click();
        URL.revokeObjectURL(url);
    }

    bufferToWav(buffer) {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const out = new ArrayBuffer(length);
        const view = new DataView(out);
        let pos = 0;

        const write = (s) => { for (let i = 0; i < s.length; i++) view.setUint8(pos++, s.charCodeAt(i)); };
        const writeUint16 = (d) => { view.setUint16(pos, d, true); pos += 2; };
        const writeUint32 = (d) => { view.setUint32(pos, d, true); pos += 4; };

        write('RIFF'); writeUint32(length - 8); write('WAVE');
        write('fmt '); writeUint32(16); writeUint16(1); writeUint16(numOfChan);
        writeUint32(buffer.sampleRate); writeUint32(buffer.sampleRate * 2 * numOfChan);
        writeUint16(numOfChan * 2); writeUint16(16);
        write('data'); writeUint32(length - pos - 4);

        const channels = Array.from({ length: numOfChan }, (_, i) => buffer.getChannelData(i));
        for (let i = 0; i < buffer.length; i++) {
            for (let c = 0; c < numOfChan; c++) {
                const sample = Math.max(-1, Math.min(1, channels[c][i]));
                view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
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
        });
        return synth;
    }
}

window.ToneDAW = ToneDAW;