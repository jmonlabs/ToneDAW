# TonePlayer.js

TonePlayer.js is an interactive audio player built with [Tone.js](https://tonejs.dev/), supporting multiple instruments, custom synthesizers, tempo control, real-time oscilloscope, and MIDI/WAV export.

## Quick Demo

```html
<script src="https://unpkg.com/tone"></script>
<script src="https://unpkg.com/@tonejs/midi"></script>
<script type="module" src="TonePlayer.js"></script>

<div id="player"></div>

<script>
  const projectData = {
    bpm: 120,
    sequences: [
      {
        synth: { type: 'AMSynth' },
        notes: [
          { time: 0, note: 'C4', duration: '4n' },
          { time: '0:1', note: 'E4', duration: '4n' }
        ]
      },
      {
        synth: { type: 'Synth' },
        notes: [
          { time: 0, note: 'G3', duration: '2n' }
        ]
      }
    ]
  };

  new TonePlayer('player', projectData);
</script>
````

## Files

* `TonePlayer.js`: main audio player logic
* `style.css`: optional styling file
* `index.html`: minimal usage example

## 📘 Expected Data Format

```json
{
  "bpm": 120,
  "sequences": [
    {
      "synth": { "type": "Synth" },  // or "AMSynth", "Sampler", "Custom"
      "notes": [
        { "time": 0, "note": "C4", "duration": "4n" }
      ]
    }
  ]
}
```

## Features

- Per-instrument synth selection
- Tempo control with icon
- Looping playback
- Real-time waveform display
- Export as MIDI or WAV