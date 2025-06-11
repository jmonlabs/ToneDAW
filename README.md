# ToneDAW.js

A modular web-based music sequencer built with Tone.js, featuring a complete user interface and the Tonex music interchange format for project management.

## Core Components

### ToneDAW.js - Digital Audio Workstation
The main DAW class provides a complete browser-based music production environment:

- **Audio Engine**: Multiple synthesizers (Synth, AMSynth, FMSynth, DuoSynth, PolySynth, Sampler)
- **User Interface**: Graphical timeline with zoom, independent Mute/Solo controls, velocity-based transparency
- **Export System**: High-quality MIDI and WAV export with loop expansion
- **Transport Control**: Precise timing via Tone.js with loop management

### Tonex.js - Music Interchange Format
A powerful conversion and validation library implementing the Tonex specification:

- **Format Conversion**: JSON to Tone.js format conversion
- **Validation System**: Comprehensive project validation with error reporting
- **Note Processing**: MIDI number ↔ note name conversion with chord support
- **Loop Expansion**: Intelligent loop repetition for visualization and export
- **Time Parsing**: Flexible time notation parsing (bars:beats, Tone.js time strings)

## Tonex Format Specification

Tonex (Tone Object Notation eXtended) is a JSON-based music interchange format designed for web audio applications:

### Project Structure
```json
{
  "format": "tonex",
  "version": "1.0",
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
  "instrument": {
    "type": "synthesizer",
    "engine": "fmsynth"
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
├── Tonex.js                # Tonex format converter
├── style.css               # Responsive styles
├── porcelain.json          # Demo project (Tonex format)
├── index.html              # Browser interface
├── samples/                # Audio samples (violin library)
└── tests/                  # Node.js test suite
    ├── index.js                # Test runner
    └── modules/                # Modular test files
```

## Configuration Examples

### Basic Tonex Project
```json
{
  "format": "tonex",
  "version": "1.0",
  "bpm": 85,
  "metadata": { "title": "Porcelain Dreams" },
  "sequences": [
    {
      "label": "Ambient Piano",
      "loop": "4:0",
      "instrument": {
        "type": "synthesizer",
        "engine": "custom",
        "parameters": {
          "oscillator": { "type": "square" },
          "envelope": { "attack": 0.01, "release": 1.0 }
        }
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

#### Standard Engines
- **Synth**: Basic subtractive synthesis
- **AMSynth**: Amplitude modulation synthesis
- **FMSynth**: Frequency modulation synthesis  
- **DuoSynth**: Dual-oscillator synthesis
- **PolySynth**: Polyphonic synthesis engine
- **Sampler**: Audio sample playback with pitch mapping

#### Tonex Instrument Types
- **synthesizer**: Configurable synthesis engines
- **sampler**: Multi-sample instruments with automatic mapping
- **custom**: User-defined synthesis parameters

## API Usage

### Basic Integration
```javascript
// Load and convert Tonex project
const response = await fetch('./project.json');
const tonexData = await response.json();
const toneFormat = Tonex.convertToToneFormat(tonexData);

// Initialize DAW
const daw = new ToneDAW('container-id', toneFormat);
```

### Format Validation
```javascript
const validation = Tonex.validate(tonexProject);
if (!validation.success) {
    console.error('Validation errors:', validation.errors);
}
```

## License

MIT License - See [LICENSE](LICENSE) for details.