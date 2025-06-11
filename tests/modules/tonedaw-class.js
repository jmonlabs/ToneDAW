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

class ToneDAWClassTests extends TestModule {
    async run() {
        console.log('\nToneDAW class test...');
        
        try {
            if (!this.master.fileExists('ToneDAW.js')) {
                this.addResult('ToneDAW File', false, 'ToneDAW.js file missing');
                return;
            }
            
            const code = this.master.readFile('ToneDAW.js');
            
            // Check class structure
            const hasClass = /class\s+ToneDAW/.test(code);
            this.addResult('Class Definition', hasClass, 'ToneDAW class defined');
            
            const hasConstructor = /constructor\s*\(/m.test(code);
            this.addResult('Constructor', hasConstructor, 'Constructor present');
            
            // Check essential methods
            const essentialMethods = [
                'buildUI', 'setupAudio', 'drawNotes', 'togglePlay',
                'exportMIDI', 'expandNotesWithLoop', 'updateTrackStates',
                'animate', 'getTotalDuration', 'applyLoopStyling'
            ];
            
            essentialMethods.forEach(method => {
                const hasMethod = new RegExp(`${method}\\s*\\(`).test(code);
                this.addResult(`Method ${method}`, hasMethod,
                    hasMethod ? 'Method present' : 'Method missing');
            });
            
            // Check utility methods
            const utilityMethods = [
                '_parseSimpleTime', '_parseSimpleDuration', 'noteNameToMidiNote',
                'midiNoteToNoteName', 'waitForSamplersToLoad'
            ];
            
            utilityMethods.forEach(method => {
                const hasMethod = code.includes(method);
                this.addResult(`Utility ${method}`, hasMethod,
                    hasMethod ? 'Utility method present' : 'Utility method missing');
            });
            
            // Check loop management
            const hasLoopHandling = code.includes('expandNotesWithLoop') && 
                                   code.includes('loopStyle');
            this.addResult('Loop Handling', hasLoopHandling, 'Loop management implemented');
            
            // Check velocity management
            const hasVelocity = code.includes('velocity') && code.includes('velocityOpacity');
            this.addResult('Velocity Handling', hasVelocity, 'Velocity management implemented');
            
            // Check default hatched style
            const hasHatchedDefault = code.includes("'hatched'");
            this.addResult('Hatched Style Default', hasHatchedDefault, 
                'Hatched style configured by default');
            
            // Check Mute/Solo states management
            const hasMuteSoloStates = code.includes('manualMuteStates') && 
                                     code.includes('updateTrackStates');
            this.addResult('Mute Solo States', hasMuteSoloStates, 
                'Independent Mute/Solo states implemented');
            
            // Check note grouping management
            const hasNoteGrouping = code.includes('groupNotesByTimeAndPitch') ||
                                   code.includes('group.notes') ||
                                   code.includes('group.velocities');
            this.addResult('Note Grouping', hasNoteGrouping, 'Note grouping implemented');
            
            // Check short duration support
            const hasShortDurations = code.includes('32n') && code.includes('64n');
            this.addResult('Short Durations', hasShortDurations, 
                'Short duration support (32n, 64n) implemented');
            
            // Check timeline management (search for timelineSlider, currentTimeDisplay, etc.)
            const hasTimeline = code.includes('timelineSlider') || code.includes('currentTimeDisplay') || 
                               code.includes('formatTime') || code.includes('daw-progress-line');
            this.addResult('Timeline Support', hasTimeline, 'Graphical timeline implemented');
            
            // Check zoom management (search for pixelsPerSecond, zoom buttons, etc.)
            const hasZoom = code.includes('pixelsPerSecond') || code.includes('zoomInBtn') || 
                           code.includes('zoomOutBtn') || code.includes('calculateDynamicPixelsPerSecond');
            this.addResult('Zoom Controls', hasZoom, 'Zoom controls implemented');
            
        } catch (error) {
            this.addResult('ToneDAW Class', false, `Error: ${error.message}`);
        }
    }
}

module.exports = ToneDAWClassTests;
