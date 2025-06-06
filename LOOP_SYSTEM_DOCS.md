# ToneDAW - Advanced Loop System Documentation

## 🔄 New Loop System Overview

The ToneDAW now features an advanced loop system that provides precise control over note repetition and visual representation. Instead of relying solely on Tone.js's built-in looping, the system expands loops at the data level, creating actual note repetitions that are visible in the DAW interface.

## 🎯 Key Features

### 1. **Precise Loop End Times**
- Set exact loop end points using Tone.js time notation
- Examples: `"0:4"` (4 beats), `"1:0"` (1 measure), `"2:0"` (2 measures)
- Empty field = no looping

### 2. **Visual Loop Indicators**
- Looped notes appear with dashed borders
- Reduced opacity (0.8) for looped notes
- Loop icon (↻) in the top-right corner
- Tooltip indicates "(Looped)" status

### 3. **Data-Driven Loop Expansion**
- Loops are calculated and expanded in the data layer
- All systems (playback, MIDI export, WAV export) use the same expanded note data
- Consistent timing across all features

### 4. **Per-Track Loop Control**
- Each track can have different loop lengths
- Independent loop settings per sequence
- Real-time loop editing with immediate visual feedback

## 📝 Loop Configuration Format

### String Format (Recommended)
```javascript
{
    label: "Track Name",
    loop: "1:0", // Loop every 1 measure
    synth: { type: 'Synth' },
    notes: [
        { note: 'C4', time: 0, duration: '4n' },
        { note: 'E4', time: '0:2', duration: '4n' }
    ]
}
```

### Boolean Format (Legacy Support)
```javascript
{
    label: "Track Name", 
    loop: true, // Loop at end of sequence
    // ... rest of configuration
}
```

### No Loop
```javascript
{
    label: "Track Name",
    loop: false, // or omit the loop property
    // ... rest of configuration
}
```

## ⏱️ Time Notation Examples

| Loop Value | Description | Duration (120 BPM) |
|------------|-------------|-------------------|
| `"0:1"`    | 1 beat      | 0.5 seconds       |
| `"0:2"`    | 2 beats     | 1.0 second        |
| `"0:4"`    | 4 beats     | 2.0 seconds       |
| `"1:0"`    | 1 measure   | 2.0 seconds       |
| `"2:0"`    | 2 measures  | 4.0 seconds       |

## 🎵 Musical Examples

### Short Percussion Loop
```javascript
{
    label: "Hi-Hat Pattern",
    loop: "0:2", // Loop every 2 beats
    notes: [
        { note: 'C#2', time: 0, duration: '16n' },
        { note: 'C#2', time: '0:1', duration: '16n' }
    ]
}
```

### Bass Line Loop
```javascript
{
    label: "Bass Pattern",
    loop: "1:0", // Loop every measure
    notes: [
        { note: 'C2', time: 0, duration: '4n' },
        { note: 'G2', time: '0:2', duration: '4n' }
    ]
}
```

### Chord Progression
```javascript
{
    label: "Chord Changes",
    loop: "4:0", // Loop every 4 measures
    notes: [
        { note: ['C4','E4','G4'], time: 0, duration: '1n' },
        { note: ['F4','A4','C5'], time: '1:0', duration: '1n' },
        { note: ['G4','B4','D5'], time: '2:0', duration: '1n' },
        { note: ['C4','E4','G4'], time: '3:0', duration: '1n' }
    ]
}
```

## 🔧 Technical Implementation

### Loop Expansion Algorithm
1. **Parse Loop End Time**: Convert loop string to seconds using `Tone.Time()`
2. **Calculate Total Duration**: Determine project length from all sequences
3. **Compute Loop Count**: `Math.ceil(totalDuration / loopDuration)`
4. **Generate Looped Notes**: Create offset copies of original notes
5. **Apply Visual Styling**: Mark looped notes for visual differentiation

### Data Structure
```javascript
// Original note
{ note: 'C4', time: 0, duration: '4n' }

// Looped note (generated)
{ 
    note: 'C4', 
    time: 2.0, // offset by loop duration
    duration: '4n',
    isLooped: true // visual marker
}
```

## 🎨 User Interface

### Loop End Input Field
- Text input field in track controls
- Placeholder: "e.g. 0:4, 1:0"
- Real-time validation and update
- Empty = no loop

### Visual Feedback
- **Original Notes**: Solid borders, full opacity
- **Looped Notes**: Dashed borders, 80% opacity, loop icon
- **Tooltips**: Show timing + "(Looped)" indicator

## 🚀 Benefits

### For Composers
- **Visual Clarity**: See exactly where loops repeat
- **Precise Control**: Set exact loop lengths
- **Flexible Arrangements**: Different loop lengths per track

### For Developers
- **Consistent Data**: Same expanded notes for all systems
- **Predictable Timing**: No reliance on Tone.js loop timing quirks
- **Export Accuracy**: MIDI/WAV include all loop repetitions

### For Performance
- **Efficient Rendering**: Pre-calculated loop expansions
- **Clean Animation**: Progress line matches visible notes exactly
- **Memory Efficient**: Only generate what's needed

## 📊 Comparison: Old vs New System

| Feature | Old System | New System |
|---------|------------|------------|
| Loop Control | Boolean only | Precise time strings |
| Visual Feedback | None | Dashed borders + icons |
| MIDI Export | Basic loops | Full expanded sequences |
| WAV Export | Basic loops | Full expanded sequences |
| Timing Sync | Approximate | Pixel-perfect |
| Flexibility | Limited | Highly customizable |

## 🧪 Testing Scenarios

### Test 1: Short Loop Visualization
1. Set loop to "0:2" 
2. Verify notes repeat every 2 beats
3. Check dashed border styling

### Test 2: Mixed Loop Lengths
1. Track 1: "0:2", Track 2: "1:0", Track 3: no loop
2. Verify different repetition patterns
3. Test audio playback synchronization

### Test 3: Export Consistency
1. Create project with various loop settings
2. Export MIDI and WAV
3. Verify exported audio matches visual representation

## 💡 Best Practices

### Loop Length Selection
- **Percussion**: Short loops (0:2, 0:4) for rhythmic patterns
- **Bass**: Medium loops (1:0, 2:0) for harmonic support  
- **Chords**: Long loops (4:0, 8:0) for progressions
- **Melody**: Variable based on musical phrase length

### Visual Organization
- Use consistent loop lengths within instrument groups
- Shorter loops create denser visual patterns
- Longer loops provide structural clarity

### Performance Considerations
- Very short loops with long project durations create many notes
- Monitor total note count for large projects
- Consider project length when setting loop durations

This advanced loop system provides professional-level control while maintaining visual clarity and technical consistency across all DAW features.
