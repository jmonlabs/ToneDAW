# ToneDAW.js

A generic web-based music sequencer tool built with Tone.js, featuring a complete user interface for creating and playing musical compositions. ToneDAW.js natively supports **Tone.js objects and formats**, with additional support for **jmon-tone format** import for enhanced interoperability.

## Core Components

### ToneDAW.js - Digital Audio Workstation
The main DAW class provides a complete browser-based music production environment:

- **Audio Engine**: Multiple synthesizers (Synth, AMSynth, FMSynth, DuoSynth, PolySynth, Sampler)
- **User Interface**: Graphical timeline with zoom, independent Mute/Solo controls, velocity-based transparency
- **Export System**: High-quality MIDI and WAV export with loop expansion
- **Transport Control**: Precise timing via Tone.js with loop management
- **Generic Tone.js Tool**: Works with any Tone.js project or object structure
- **jmon-tone Import**: Optional support for jmon-tone format files

## Supported Formats

ToneDAW.js is designed as a **generic Tone.js visualization and control tool**:

### 1. Native Tone.js Format (Primary)
Direct Tone.js objects and structures - the primary supported format:
- Works with any Tone.js project
- No external dependencies required  
- Direct integration with Tone.js audio engine
- Optimal performance and compatibility

### 2. jmon-tone Format Import (Secondary)
Enhanced format support when `jmon-tone.js` is available:
- Requires the external [jmon-tone.js library](https://github.com/essicolo/jmon)
- Supports the full jmon-tone specification with validation
- Automatic format detection and conversion
- Import capability for jmon-tone projects

## Project Format Specification

ToneDAW.js primarily works with **Tone.js native objects and formats**:

### Native Tone.js Format Example
```json
{
  "bpm": 120,
  "keySignature": "C major",
  "metadata": {
    "title": "My Composition",
    "composer": "Artist Name"
  },
  "sequences": [
    {
      "label": "Simple Piano",
      "synth": {
        "type": "PolySynth",
        "voice": "Synth",
        "oscillator": { "type": "sine" },
        "envelope": { "attack": 0.1, "release": 1.0 }
      },
      "notes": [...]
    }
  ]
}
```

### jmon-tone Import Format Example
```json
{
  "format": "jmonTone",
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

### jmon-tone Sequence Definition
```json
{
  "label": "Lead Melody",
  "loop": "2:0",
  "instrument": {
    "type": "synthesizer",
    "engine": "fmsynth",
    "parameters": {
      "oscillator": { "type": "sine" },
      "envelope": { "attack": 0.1, "release": 1.0 }
    }
  },
  "notes": [...]
}
```
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

### Basic jmon-tone Project
```json
{
  "format": "jmonTone",
  "version": "1.0",
  "bpm": 85,
  "metadata": { "title": "Porcelain Dreams" },
  "sequences": [
    {
      "label": "Ambient Piano",
      "loop": "4:0",
      "instrument": {
        "type": "synthesizer",
        "engine": "polysynth",
        "parameters": {
          "voice": "FMSynth",
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

### Supported Instruments

ToneDAW.js supports jmon-tone instrument specifications:

#### Synthesizer Instruments
- **synth**: Basic subtractive synthesis
- **amsynth**: Amplitude modulation synthesis
- **fmsynth**: Frequency modulation synthesis  
- **duosynth**: Dual-oscillator synthesis
- **polysynth**: Polyphonic synthesis engine
- **monosynth**: Monophonic synthesis
- **noisesynth**: Noise-based synthesis
- **plucksynth**: Plucked string synthesis

#### Sample Instruments
- **sampler**: Multi-sample instruments with automatic pitch mapping

## API Usage

### Basic Integration (jmon-tone Native)
```javascript
// Load jmon-tone project data
const response = await fetch('./project.json');
const jmonToneData = await response.json();

// ToneDAW natively supports jmon-tone format
const daw = new ToneDAW('container-id', jmonToneData);
```

### Legacy Format Support
```javascript
// Legacy formats are automatically converted to jmon-tone
const daw = new ToneDAW('container-id', legacyData);
```

## License

MIT License - See [LICENSE](LICENSE) for details.