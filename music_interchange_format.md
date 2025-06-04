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
  "loop": true,
  "synth": { "type": "Synth" },
  "notes": [ ... ]
}
```

### Fields

* `label`: *(string)* Name for display in the UI.
* `group`: *(string)* Optional logical grouping (e.g., "bass", "lead").
* `loop`: *(bool)* Whether the part should loop.
* `synth`: *(object)* Description of the instrument (see below).
* `notes`: *(array)* List of note events.

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
    "title": "Bass and Lead",
    "composer": "Jane Smith"
  },
  "sequences": [
    {
      "label": "Lead",
      "synth": { "type": "Synth" },
      "loop": true,
      "notes": [
        { "time": 0, "note": "C4", "duration": "4n" },
        { "time": "0:2", "note": ["E4", "G4"], "duration": "2n", "velocity": 0.8 }
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
      "notes": [
        { "time": 0, "note": "C3", "duration": "1n" },
        { "time": 1, "note": "G3", "duration": "1n" }
      ]
    }
  ]
}
```

---

## Remarks

* All times and durations should follow [Tone.js Time notation](https://tonejs.github.io/docs/20.0.25/type/Time).
* The format is meant to be easy to generate from Python, JavaScript, or any other language and passed to a Tone.js player.