const Midi = window.Midi;

class TonePlayer {
    constructor(containerId, projectData, options = {}) {
        this.container = document.getElementById(containerId);
        this.projectData = projectData;
        this.options = options;
        this.synths = [];
        this.parts = [];
        this.transport = Tone.Transport;
        this.analyser = new Tone.Analyser('waveform', 2048);
        this.playing = false;
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
        this.container.className = 'toneplayer';

        this.canvas = document.createElement('canvas');
        this.canvas.width = 600;
        this.canvas.height = 60;

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


        const topRow = document.createElement('div');
        topRow.className = 'top-row';

        const synthTypes = ['Synth', 'AMSynth', 'FMSynth', 'DuoSynth', 'Sampler'];
        if (this.projectData.sequences.some(seq => seq.synth.type === 'Custom')) {
            synthTypes.push('Custom');
        }

        const instrumentGrid = document.createElement('div');
        instrumentGrid.className = 'instrument-grid';

        this.synthSelects = [];

        this.projectData.sequences.forEach((seq, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'instrument-wrapper';

            const label = document.createElement('label');
            label.textContent = `Instrument ${index + 1}`;
            label.style.display = 'block';

            const select = document.createElement('select');
            synthTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                option.selected = seq.synth.type === type;
                select.appendChild(option);
            });
            select.onchange = () => this.setupAudio();

            wrapper.appendChild(label);
            wrapper.appendChild(select);
            instrumentGrid.appendChild(wrapper);
            this.synthSelects.push(select);
        });

        this.container.appendChild(instrumentGrid);


        // BPM (commun)
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



        this.container.appendChild(topRow);

        const middleRow = document.createElement('div');
        middleRow.className = 'middle-row';

        this.playButton = document.createElement('button');
        this.playButton.className = 'play-button large';
        this.playButton.appendChild(playSVG.cloneNode(true));
        this.playButton.onclick = () => this.togglePlay(playSVG, pauseSVG);

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

        middleRow.append(this.playButton, this.currentTimeDisplay, this.timelineSlider, this.totalTimeDisplay, tempoWrapper);
        this.container.appendChild(middleRow);

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

        this.container.appendChild(this.canvas);
        this.container.appendChild(bottomRow);
    }

    setupAudio() {
        this.synths.forEach(s => s.dispose());
        this.parts.forEach(p => p.dispose());
        this.synths = [];
        this.parts = [];

        this.projectData.sequences.forEach((seq, index) => {
            let synth;
            const selectedType = this.synthSelects[index].value;
            if (selectedType === 'Sampler') {
                synth = new Tone.Sampler(seq.synth).connect(this.analyser).toDestination();
            } else if (selectedType === 'Custom') {
                // Use the built-in factory for custom synth definitions
                synth = this.createCustomSynth(seq.synth);
                synth.connect(this.analyser).toDestination();
            } else {
                synth = new Tone[selectedType]().connect(this.analyser).toDestination();
            }

            this.synths.push(synth);

            const part = new Tone.Part((time, note) => {
                synth.triggerAttackRelease(note.note, note.duration, time);
            }, seq.notes).start(0);
            this.parts.push(part);
        });

        this.transport.bpm.value = this.projectData.bpm || 120;
        this.transport.loop = true;
        this.transport.loopEnd = this.getTotalDuration();
    }

    togglePlay(playSVG, pauseSVG) {
        if (this.transport.state === 'started') {
            this.transport.pause();
            this.playButton.innerHTML = '';
            this.playButton.appendChild(playSVG.cloneNode(true));
            this.playing = false;
        } else {
            this.transport.start();
            this.playButton.innerHTML = '';
            this.playButton.appendChild(pauseSVG.cloneNode(true));
            this.playing = true;
        }
    }

    animate() {
        const ctx = this.canvas.getContext('2d');
        const loop = () => {
            const values = this.analyser.getValue();
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.beginPath();
            values.forEach((v, i) => {
                const x = (i / values.length) * this.canvas.width;
                const y = (1 - (v + 1) / 2) * this.canvas.height;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.strokeStyle = '#555';
            ctx.stroke();

            const progress = (this.transport.seconds / this.getTotalDuration()) * 100;
            this.timelineSlider.value = progress;
            this.currentTimeDisplay.textContent = this.formatTime(this.transport.seconds);

            requestAnimationFrame(loop);
        };
        loop();
    }

    getTotalDuration() {
        const allTimes = this.projectData.sequences.flatMap(seq => seq.notes.map(n => Tone.Time(n.time).toSeconds() + Tone.Time(n.duration).toSeconds()));
        return Math.max(...allTimes);
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
            seq.notes.forEach(n => {
                track.addNote({
                    name: n.note,
                    time: Tone.Time(n.time).toSeconds(),
                    duration: Tone.Time(n.duration).toSeconds()
                });
            });
        });
        midi.header.setTempo(bpm);
        const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.mid';
        a.click();
        URL.revokeObjectURL(url);
    }

    async exportWAV() {
        const duration = this.getTotalDuration();
        const projectData = this.projectData;

        const buffer = await Tone.Offline(({ transport }) => {
            this.projectData.sequences.forEach((seq, index) => {
                let synth;
                const selectedType = this.synthSelects[index].value;
                if (selectedType === 'Sampler') {
                    synth = new Tone.Sampler(seq.synth).toDestination();
                } else if (selectedType === 'Custom') {
                    synth = this.createCustomSynth(seq.synth);
                } else {
                    synth = new Tone[selectedType]().toDestination();
                }

                const part = new Tone.Part((time, note) => {
                    synth.triggerAttackRelease(note.note, note.duration, time);
                }, seq.notes).start(0);
            });

            transport.start();
        }, duration);

        const wavBlob = this.bufferToWav(buffer.get());
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.wav';
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
        // Exemple de synth personnalisé, à adapter
        const synth = new Tone.MonoSynth({
            oscillator: { type: synthData.oscillator || 'square' },
            filter: { Q: 1, type: 'lowpass', rolloff: -12 },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1 }
        });

        synth.connect(this.analyser).toDestination();
        return synth;
    }

}



window.TonePlayer = TonePlayer;
