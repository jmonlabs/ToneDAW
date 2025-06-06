# Music Interchange Format for Tone.js

This format is designed to structure musical projects in a way that is compatible with Tone.js and TonePlayer.js. The format supports multiple instruments, looped sequences, MIDI export, synthesis options, and metadata.

## Root Object

```json
{
  "bpm": 120,
  "keySignature": "C major",
  "metadata": {
    "title": "My Composition",
    "composer": "Jane Doe"
  },
  "sequences": [ ... ]
}
````

### Fields

* `bpm`: *(int)* Beats per minute (between \~60 and 240).
* `keySignature`: *(string)* Optional. E.g., `"C major"`, `"D minor"`.
* `metadata`: *(object)* Optional descriptive data.

---

## Sequences

Each sequence represents one instrument track. All sequences play in sync.

```json
{
  "label": "Melody",
  "group": "strings",
  "loop": "1:0",
  "synth": { "type": "Synth" },
  "notes": [ ... ]
}
```

### Fields

* `label`: *(string)* Name for display in the UI.
* `group`: *(string)* Optional logical grouping (e.g., "bass", "lead").
* `loop`: *(string|boolean|false)* Loop configuration using Tone.js time notation or legacy boolean:
  - **String format**: `"0:2"`, `"1:0"`, `"2:0"`, `"4:0"` (recommended)
  - **Legacy format**: `true` (loop at sequence end) or `false` (no loop)
* `synth`: *(object)* Description of the instrument (see below).
* `notes`: *(array)* List of note events.

### Loop Field Options

The loop system supports both precise time-based loops and legacy boolean values:

#### **Time-Based Loops (Recommended)**
* `"0:1"`: Loop every 1 beat (0.5 seconds at 120 BPM)
* `"0:2"`: Loop every 2 beats (1.0 second at 120 BPM) - good for percussion
* `"0:4"`: Loop every 4 beats (2.0 seconds at 120 BPM) - standard measure
* `"1:0"`: Loop every 1 measure (2.0 seconds at 120 BPM) - bass/melody lines
* `"2:0"`: Loop every 2 measures (4.0 seconds at 120 BPM) - chord progressions
* `"4:0"`: Loop every 4 measures (8.0 seconds at 120 BPM) - song sections

#### **Legacy Support**
* `true`: Loop at the end of the note sequence (legacy behavior)
* `false` or omitted: No looping

#### **Visual Feedback**
- **Original notes**: Solid borders, full opacity
- **Looped notes**: Dashed borders, reduced opacity (0.8), loop icon (↻)
- **Tooltips**: Show "(Looped)" status for repeated notes

---

## Synth Definition

Basic format:

```json
"synth": {
  "type": "FMSynth"
}
```

Advanced format with envelope (when applicable):

```json
"synth": {
  "type": "Synth",
  "envelope": {
    "attack": 0.1,
    "decay": 0.2,
    "sustain": 0.8,
    "release": 1.2
  },
  "oscillator": {
    "type": "square"
  }
}
```

### Custom Synth

```json
"synth": {
  "type": "Custom",
  "oscillator": { "type": "sawtooth" },
  "envelope": { "attack": 0.05, "decay": 0.2, "sustain": 0.7, "release": 1.5 }
}
```

The `Custom` type assumes custom handling by the Tone.js player implementation.

---

## Sampler Synth

To use a sampler:

```json
"synth": {
  "type": "Sampler",
  "urls": {
    "C4": "samples/piano_C4.mp3",
    "D#4": "samples/piano_Ds4.mp3",
    "F#4": "samples/piano_Fs4.mp3"
  },
  "baseUrl": "/audio/",
  "onload": "optionalCallback"
}
```

### Sampler Fields

* `urls`: *(object)* Mapping from pitch name to file path.
* `baseUrl`: *(string)* Prefix path for samples (e.g. `/audio/`).
* `onload`: *(string)* Optional string name of callback to invoke after loading.

Tone.js will use the closest available sample and pitch-shift it when needed.

---

## Notes Format

```json
{
  "time": 0,
  "note": ["C4", "E4", "G4"],
  "duration": "1n",
  "velocity": 0.9,
  "repeat": 2
}
```

### Fields

* `time`: *(number or string)* Offset from start, e.g., `0`, `"2n"`.
* `note`: *(string or array)* A note or a chord (array of notes).
* `duration`: *(string)* Tone.js format like `"8n"` or `"1:2"`.
* `velocity`: *(float)* Between 0.0 and 1.0.
* `repeat`: *(int)* Number of times to repeat this note in place.

---

## Example Project

```json
{
  "bpm": 100,
  "keySignature": "A minor",
  "metadata": {
    "title": "Advanced Loop Demo",
    "composer": "Jane Smith"
  },
  "sequences": [
    {
      "label": "Lead Melody",
      "synth": { "type": "Synth" },
      "loop": "1:0",
      "notes": [
        { "time": 0, "note": "C4", "duration": "4n" },
        { "time": "0:2", "note": ["E4", "G4"], "duration": "2n", "velocity": 0.8 }
      ]
    },
    {
      "label": "Bass Line",
      "synth": { "type": "FMSynth" },
      "loop": "2:0",
      "notes": [
        { "time": 0, "note": "C3", "duration": "2n", "velocity": 0.9 },
        { "time": "0:2", "note": "F3", "duration": "2n", "velocity": 0.8 },
        { "time": "1:0", "note": "G3", "duration": "2n", "velocity": 0.9 },
        { "time": "1:2", "note": "C3", "duration": "2n", "velocity": 0.7 }
      ]
    },
    {
      "label": "Percussion",
      "synth": { "type": "AMSynth" },
      "loop": "0:4",
      "notes": [
        { "time": 0, "note": "C2", "duration": "16n", "velocity": 1.0 },
        { "time": "0:1", "note": "C2", "duration": "16n", "velocity": 0.6 },
        { "time": "0:2", "note": "C2", "duration": "16n", "velocity": 1.0 },
        { "time": "0:3", "note": "C2", "duration": "16n", "velocity": 0.6 }
      ]
    },
    {
      "label": "SamplerPad",
      "synth": {
        "type": "Sampler",
        "urls": {
          "C3": "pad_C3.mp3",
          "G3": "pad_G3.mp3"
        },
        "baseUrl": "/samples/"
      },
      "loop": false,
      "notes": [
        { "time": 0, "note": "C3", "duration": "1n" },
        { "time": 1, "note": "G3", "duration": "1n" }
      ]
    }
  ]
}
```

---

## Loop System Implementation

The ToneDAW uses a **hybrid loop system** that combines Tone.js native loops for audio playback with custom loop expansion for visual display and exports.

### **Playback Behavior**
- Uses `Tone.Part.loop = true` with `loopStart` and `loopEnd` properties
- Leverages Tone.js's built-in timing precision for smooth audio loops
- Follows standard DAW conventions that musicians expect

### **Visual Display**
- Shows all loop repetitions as visual note blocks
- Looped notes appear with dashed borders and reduced opacity
- Loop icon (↻) indicates repeated sections
- Provides clear visual feedback of loop behavior

### **Export Behavior**
- **MIDI Export**: Includes all expanded loop repetitions
- **WAV Export**: Uses Tone.js native loops for efficiency
- Both formats produce identical audio results

### **Loop Configuration Examples**

#### Quick Loops (Percussion)
```json
{
  "label": "Hi-Hat Pattern",
  "loop": "0:2",
  "notes": [
    { "note": "C#2", "time": 0, "duration": "16n" },
    { "note": "C#2", "time": "0:1", "duration": "16n" }
  ]
}
```

#### Standard Loops (Bass/Melody)
```json
{
  "label": "Bass Line",
  "loop": "1:0",
  "notes": [
    { "note": "C3", "time": 0, "duration": "4n" },
    { "note": "F3", "time": "0:2", "duration": "4n" }
  ]
}
```

#### Long Form Loops (Chord Progressions)
```json
{
  "label": "Chord Changes",
  "loop": "4:0",
  "notes": [
    { "note": ["C4","E4","G4"], "time": 0, "duration": "1n" },
    { "note": ["F4","A4","C5"], "time": "1:0", "duration": "1n" },
    { "note": ["G4","B4","D5"], "time": "2:0", "duration": "1n" },
    { "note": ["C4","E4","G4"], "time": "3:0", "duration": "1n" }
  ]
}
```

---

## Remarks

* All times and durations should follow [Tone.js Time notation](https://tonejs.github.io/docs/20.0.25/type/Time).
* The format is meant to be easy to generate from Python, JavaScript, or any other language and passed to a Tone.js player.