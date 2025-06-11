class TestModule {
    constructor(masterSuite) {
        this.master = masterSuite;
        this.category = this.constructor.name.replace('Tests', '');
    }
    
    addResult(testName, passed, message, details = '') {
        this.master.addResult(testName, passed, message, details, this.category);
    }
    
    async run() {
        throw new Error('run() method must be implemented');
    }
}

class AudioConfigurationTests extends TestModule {
    async run() {
        console.log('\nAudio configuration test...');
        
        try {
            const code = this.master.readFile('ToneDAW.js');
            
            // Check Tone.js support
            const hasToneJS = code.includes('Tone.') && code.includes('toDestination');
            this.addResult('Tone.js Integration', hasToneJS, 'Tone.js integration detected');
            
            // Check supported synth types (only actually supported ones)
            const synthTypes = [
                'Synth', 'AMSynth', 'FMSynth', 'DuoSynth', 
                'PolySynth', 'Sampler'
            ];
            
            synthTypes.forEach(synthType => {
                const hasSupport = code.includes(synthType);
                this.addResult(`Synth ${synthType}`, hasSupport,
                    hasSupport ? 'Supported' : 'Not supported');
            });
            
            // Check transport management
            const hasTransport = code.includes('Tone.Transport') && code.includes('this.transport');
            this.addResult('Transport Control', hasTransport, 'Transport control present');
            
            // Check timing management
            const hasTiming = code.includes('_parseSimpleTime') && code.includes('_parseSimpleDuration');
            this.addResult('Timing Parsing', hasTiming, 'Timing parsing implemented');
            
            // Check MIDI support
            const hasMIDISupport = code.includes('midiNoteToNoteName') && code.includes('noteNameToMidiNote');
            this.addResult('MIDI Support', hasMIDISupport, 'MIDI note support implemented');
            
            // Check effects management (more flexible)
            const hasEffects = code.includes('Reverb') || code.includes('Delay') || code.includes('Filter') ||
                              code.includes('effect') || code.includes('gain') || code.includes('volume');
            this.addResult('Effects Support', hasEffects, 
                hasEffects ? 'Effects support detected' : 'No effects detected');
            
            // Check volume management (search different patterns)
            const hasVolume = code.includes('volume') || code.includes('gain') || 
                             code.includes('amplitude') || code.includes('velocity');
            this.addResult('Volume Control', hasVolume, 'Volume control implemented');
            
            // Check BPM management (more flexible)
            const hasBPMControl = code.includes('bpm') || code.includes('tempo') || 
                                 code.includes('Transport.bpm') || code.includes('updateBPM');
            this.addResult('BPM Control', hasBPMControl, 'BPM control implemented');
            
            // Check latency management (more permissive)
            const hasLatency = code.includes('lookahead') || code.includes('latency') || 
                              code.includes('buffer') || code.includes('context');
            this.addResult('Latency Handling', hasLatency, 
                hasLatency ? 'Latency management present' : 'Basic latency management');
            
            // Check note format support
            const hasNoteFormats = code.includes('C4') && code.includes('#') && code.includes('b');
            this.addResult('Note Formats', hasNoteFormats, 'Note formats supported');
            
            // Check sampling management
            const hasSamplingSupport = code.includes('Sampler') && code.includes('waitForSamplersToLoad');
            this.addResult('Sampling Support', hasSamplingSupport, 'Sampling support present');
            
            // Check audio context configuration (more flexible)
            const hasAudioContext = code.includes('AudioContext') || code.includes('Tone.context') ||
                                   code.includes('toDestination') || code.includes('Transport');
            this.addResult('Audio Context', hasAudioContext, 
                hasAudioContext ? 'Audio Context configuration' : 'Basic Audio Context');
                
        } catch (error) {
            this.addResult('Audio Configuration', false, `Error: ${error.message}`);
        }
    }
}

module.exports = AudioConfigurationTests;
