class ToneDAW {
  constructor(containerId, projectData) {
    this.container = document.getElementById(containerId);
    this.projectData = projectData;
    this.pixelsPerSecond = 60; // scaling factor for the timeline
    this.tracks = [];
    this.synths = [];
    this.parts = [];
    this.transport = Tone.Transport;
    this.init();
  }

  async init() {
    await Tone.start();
    this.buildUI();
    this.setupAudio();
  }

  buildUI() {
    this.container.innerHTML = '';
    this.container.className = 'daw-container';

    // Controls
    const controls = document.createElement('div');
    controls.className = 'daw-controls';
    const playBtn = document.createElement('button');
    playBtn.textContent = 'Play';
    playBtn.onclick = () => this.togglePlay(playBtn);
    controls.appendChild(playBtn);
    this.container.appendChild(controls);

    // Ruler
    this.ruler = document.createElement('div');
    this.ruler.className = 'daw-ruler';
    this.container.appendChild(this.ruler);

    // Track area
    this.trackArea = document.createElement('div');
    this.trackArea.className = 'daw-track-area';
    this.container.appendChild(this.trackArea);

    // Create tracks
    this.projectData.sequences.forEach((seq, index) => {
      const track = document.createElement('div');
      track.className = 'daw-track';

      const label = document.createElement('div');
      label.className = 'daw-track-label';
      label.textContent = seq.label || `Track ${index + 1}`;
      track.appendChild(label);

      const lane = document.createElement('div');
      lane.className = 'daw-lane';
      track.appendChild(lane);

      this.trackArea.appendChild(track);
      this.tracks.push({ lane, seq });
    });

    this.drawRuler();
    this.drawNotes();
  }

  drawRuler() {
    const total = this.getTotalDuration();
    const beatSeconds = 60 / (this.projectData.bpm || 120);
    const beats = Math.ceil(total / beatSeconds);
    this.ruler.style.width = beats * beatSeconds * this.pixelsPerSecond + 'px';
    for (let i = 0; i <= beats; i++) {
      const mark = document.createElement('div');
      mark.className = 'daw-mark';
      mark.style.left = i * beatSeconds * this.pixelsPerSecond + 'px';
      mark.textContent = i + 1;
      this.ruler.appendChild(mark);
    }
  }

  drawNotes() {
    this.tracks.forEach(({ lane, seq }) => {
      seq.notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'daw-note';
        const start = Tone.Time(note.time).toSeconds();
        const duration = Tone.Time(note.duration).toSeconds();
        div.style.left = start * this.pixelsPerSecond + 'px';
        div.style.width = duration * this.pixelsPerSecond + 'px';
        lane.appendChild(div);
      });
    });
  }

  getTotalDuration() {
    const all = this.projectData.sequences.flatMap(seq => seq.notes.map(n => Tone.Time(n.time).toSeconds() + Tone.Time(n.duration).toSeconds()));
    return Math.max(...all);
  }

  setupAudio() {
    // simple synth setup for each sequence
    this.projectData.sequences.forEach(seq => {
      const synth = new Tone[seq.synth.type || 'Synth']().toDestination();
      const part = new Tone.Part((time, note) => {
        synth.triggerAttackRelease(note.note, note.duration, time);
      }, seq.notes).start(0);
      this.synths.push(synth);
      this.parts.push(part);
    });
    this.transport.bpm.value = this.projectData.bpm || 120;
    this.transport.loop = true;
    this.transport.loopEnd = this.getTotalDuration();
  }

  togglePlay(btn) {
    if (this.transport.state === 'started') {
      this.transport.pause();
      btn.textContent = 'Play';
    } else {
      this.transport.start();
      btn.textContent = 'Pause';
    }
  }
}