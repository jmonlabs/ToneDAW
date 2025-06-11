# ToneDAW.js

A modular web-based music sequencer built with Tone.js, featuring a complete user interface for creating and playing musical compositions.

## Core Components

### ToneDAW.js - Digital Audio Workstation
The main DAW class provides a complete browser-based music production environment:

- **Audio Engine**: Multiple synthesizers (Synth, AMSynth, FMSynth, DuoSynth, PolySynth, Sampler)
- **User Interface**: Graphical timeline with zoom, independent Mute/Solo controls, velocity-based transparency
- **Export System**: High-quality MIDI and WAV export with loop expansion
- **Transport Control**: Precise timing via Tone.js with loop management

## Project Format Specification

ToneDAW.js uses a JSON-based project format designed for web audio applications:

### Project Structure
```json
{
  "bpm": 120,
  "keySignature": "C major",
  "metadata": {
    "title": "My Composition",
    "composer": "Artist Name"
  },
  "sequences": [...]
}
```

### Sequence Definition
```json
{
  "label": "Lead Melody",
  "loop": "2:0",
  "synth": {
    "type": "Synth",
    "oscillator": { "type": "sine" },
    "envelope": { "attack": 0.1, "release": 1.0 }
  },
  "notes": [...]
}
```

### Advanced Features
- **Time-based Loops**: Precise loop points using `"bars:beats"` notation
- **Chord Support**: Multi-note arrays for harmonic content
- **Velocity Control**: Per-note dynamics with transparency mapping
- **Effect Chains**: Per-track and global audio processing
- **Sample Integration**: WAV file support with automatic pitch mapping

## Installation

```bash
git clone https://github.com/tonedaw/ToneDAW.js.git
cd ToneDAW.js
npm install
npm start
# Open http://localhost:8080
```

## Testing

```bash
npm test    # Run complete Node.js test suite
```

## Project Structure

```
ToneDAW.js/
├── ToneDAW.js              # Main DAW class & UI
├── style.css               # Responsive styles
├── porcelain.json          # Demo project
├── index.html              # Browser interface
├── samples/                # Audio samples (violin library)
└── tests/                  # Node.js test suite
    ├── index.js                # Test runner
    └── modules/                # Modular test files
```

## Configuration Examples

### Basic ToneDAW Project
```json
{
  "bpm": 85,
  "metadata": { "title": "Porcelain Dreams" },
  "sequences": [
    {
      "label": "Ambient Piano",
      "loop": "4:0",
      "synth": {
        "type": "PolySynth",
        "voice": "FMSynth",
        "oscillator": { "type": "square" },
        "envelope": { "attack": 0.01, "release": 1.0 }
      },
      "notes": [
        { "note": "C4", "time": 0, "duration": "2n", "velocity": 0.8 },
        { "note": ["E4", "G4"], "time": "1:0", "duration": "2n", "velocity": 0.7 }
      ]
    }
  ]
}
```

### Supported Synthesizers

ToneDAW.js supports various Tone.js synthesizer types:
- **Synth**: Basic subtractive synthesis
- **AMSynth**: Amplitude modulation synthesis
- **FMSynth**: Frequency modulation synthesis  
- **DuoSynth**: Dual-oscillator synthesis
- **PolySynth**: Polyphonic synthesis engine
- **Sampler**: Audio sample playback with pitch mapping

## API Usage

### Basic Integration
```javascript
// Load project data
const response = await fetch('./project.json');
const projectData = await response.json();

// Initialize DAW
const daw = new ToneDAW('container-id', projectData);
```

## License

MIT License - See [LICENSE](LICENSE) for details.