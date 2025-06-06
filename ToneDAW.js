class ToneDAW {
  constructor(containerId, projectData) {
    this.container = document.getElementById(containerId);
    this.projectData = projectData;
    this.pixelsPerSecond = 60;
    this.tracks = [];
    this.synths = [];
    this.parts = [];
    this.transport = Tone.Transport;
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
    this.container.className = 'daw-container';

    if (this.projectData.metadata && this.projectData.metadata.title) {
      const title = document.createElement('h2');
      title.className = 'daw-title';
      title.textContent = this.projectData.metadata.title;
      this.container.appendChild(title);
    }

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

    const controls = document.createElement('div');
    controls.className = 'daw-controls';

    this.playButton = document.createElement('button');
    this.playButton.className = 'play-button';
    this.playButton.appendChild(playSVG.cloneNode(true));
    this.playButton.onclick = () => this.togglePlay(playSVG, pauseSVG);

    const loopLabel = document.createElement('label');
    this.globalLoop = document.createElement('input');
    this.globalLoop.type = 'checkbox';
    this.globalLoop.checked = true;
    this.globalLoop.onchange = () => {
      this.transport.loop = this.globalLoop.checked;
    };
    loopLabel.appendChild(this.globalLoop);
    loopLabel.appendChild(document.createTextNode(' Loop'));

    controls.appendChild(this.playButton);
    controls.appendChild(loopLabel);
    this.container.appendChild(controls);

    this.trackArea = document.createElement('div');
    this.trackArea.className = 'daw-track-area';
    this.container.appendChild(this.trackArea);

    this.progressLine = document.createElement('div');
    this.progressLine.className = 'daw-progress-line';
    this.trackArea.appendChild(this.progressLine);

    const synthTypes = ['Synth', 'AMSynth', 'FMSynth', 'DuoSynth', 'Sampler'];
    if (this.projectData.sequences.some(s => s.synth.type === 'Custom')) {
      synthTypes.push('Custom');
    }

    this.projectData.sequences.forEach((seq, index) => {
      const trackEl = document.createElement('div');
      trackEl.className = 'daw-track';

      const header = document.createElement('div');
      header.className = 'daw-track-header';

      const name = document.createElement('span');
      name.textContent = seq.label || `Track ${index + 1}`;
      header.appendChild(name);

      const select = document.createElement('select');
      synthTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        if (seq.synth.type === type) opt.selected = true;
        select.appendChild(opt);
      });
      select.onchange = () => this.setupAudio();
      header.appendChild(select);

      const makeCheck = (text) => {
        const label = document.createElement('label');
        const box = document.createElement('input');
        box.type = 'checkbox';
        label.appendChild(box);
        label.appendChild(document.createTextNode(' ' + text));
        header.appendChild(label);
        return box;
      };

      const muteBox = makeCheck('Mute');
      const soloBox = makeCheck('Solo');
      const loopBox = makeCheck('Loop');
      loopBox.checked = !!seq.loop;

      trackEl.appendChild(header);

      const lane = document.createElement('div');
      lane.className = 'daw-lane';
      trackEl.appendChild(lane);

      this.trackArea.appendChild(trackEl);

      this.tracks.push({ seq, select, muteBox, soloBox, loopBox, lane, part: null, synth: null });
    });

    this.drawNotes();
  }

  drawNotes() {
    const total = this.getTotalDuration();
    this.tracks.forEach(t => {
      t.lane.innerHTML = '';
      t.lane.style.width = total * this.pixelsPerSecond + 'px';
      t.seq.notes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'daw-note';
        const start = Tone.Time(note.time).toSeconds();
        const duration = Tone.Time(note.duration).toSeconds();
        div.style.left = start * this.pixelsPerSecond + 'px';
        div.style.width = duration * this.pixelsPerSecond + 'px';
        t.lane.appendChild(div);
      });
    });
  }

  getTotalDuration() {
    const all = this.projectData.sequences.flatMap(seq => seq.notes.map(n => Tone.Time(n.time).toSeconds() + Tone.Time(n.duration).toSeconds()));
    return Math.max(...all);
  }

  setupAudio() {
    this.synths.forEach(s => s.dispose());
    this.parts.forEach(p => p.dispose());
    this.synths = [];
    this.parts = [];

    const total = this.getTotalDuration();

    this.tracks.forEach((track, index) => {
      const seq = track.seq;
      const type = track.select.value;
      let synth;
      if (type === 'Sampler') {
        synth = new Tone.Sampler(seq.synth).toDestination();
      } else if (type === 'Custom') {
        synth = this.createCustomSynth(seq.synth);
        synth.toDestination();
      } else {
        synth = new Tone[type]().toDestination();
      }
      track.synth = synth;
      this.synths.push(synth);

      const part = new Tone.Part((time, note) => {
        synth.triggerAttackRelease(note.note, note.duration, time);
      }, seq.notes).start(0);
      part.loopEnd = total;
      part.loop = track.loopBox.checked;
      part.mute = track.muteBox.checked;
      track.part = part;
      this.parts.push(part);
    });

    this.transport.bpm.value = this.projectData.bpm || 120;
    this.transport.loop = this.globalLoop.checked;
    this.transport.loopEnd = total;
    this.updateSolo();
  }

  updateSolo() {
    const soloed = this.tracks.filter(t => t.soloBox.checked);
    if (soloed.length > 0) {
      this.tracks.forEach(t => {
        t.part.mute = (!soloed.includes(t)) || t.muteBox.checked;
      });
    } else {
      this.tracks.forEach(t => {
        t.part.mute = t.muteBox.checked;
      });
    }
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
    const total = this.getTotalDuration();
    const loop = () => {
      const progress = this.transport.seconds / total;
      this.progressLine.style.left = (progress * this.trackArea.clientWidth) + 'px';
      requestAnimationFrame(loop);
    };
    loop();
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
