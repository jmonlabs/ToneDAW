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

class UIComponentsTests extends TestModule {
    async run() {
        console.log('\nUI components test...');
        
        try {
            const toneDAWCode = this.master.readFile('ToneDAW.js');
            const cssCode = this.master.fileExists('style.css') ? this.master.readFile('style.css') : '';
            
            // Check essential UI elements in code
            const uiElements = [
                'play-button', 'timeline', 'track-header', 'track-lane',
                'mute-solo-button', 'note-block', 'track-controls'
            ];
            
            uiElements.forEach(element => {
                const hasElement = toneDAWCode.includes(element) || cssCode.includes(element);
                this.addResult(`UI ${element}`, hasElement,
                    hasElement ? 'Element present' : 'Element missing');
            });
            
            // Check playback controls
            const hasPlayControl = toneDAWCode.includes('togglePlay');
            this.addResult('Play Control', hasPlayControl, 'Play control present');
            
            const hasStopControl = toneDAWCode.includes('stop') && toneDAWCode.includes('Transport');
            this.addResult('Stop Control', hasStopControl, 'Stop control present');
            
            // Check mute/solo controls
            const hasMuteControl = toneDAWCode.includes('updateTrackStates');
            this.addResult('Mute Control', hasMuteControl, 'Mute control present');
            
            const hasSoloControl = toneDAWCode.includes('solo') && toneDAWCode.includes('mute');
            this.addResult('Solo Control', hasSoloControl, 'Solo control present');
            
            // Check zoom controls
            const hasZoomControl = toneDAWCode.includes('pixelsPerSecond');
            this.addResult('Zoom Control', hasZoomControl, 'Zoom control present');
            
            // Check mute/solo independence
            const hasManualMute = toneDAWCode.includes('manualMuteStates');
            this.addResult('Independent Mute/Solo', hasManualMute, 
                'Independent Mute/Solo implemented');
            
            // Check interactive timeline (more flexible)
            const hasTimelineInteraction = toneDAWCode.includes('timelineSlider') || toneDAWCode.includes('timelineCanvas') || 
                                          (toneDAWCode.includes('timeline') && toneDAWCode.includes('oninput')) ||
                                          toneDAWCode.includes('Transport.seconds');
            this.addResult('Interactive Timeline', hasTimelineInteraction, 
                'Interactive timeline implemented');
            
            // Check CSS styles
            if (cssCode) {
                // Check overflow fix
                const hasOverflowFix = cssCode.includes('95vw') || cssCode.includes('overflow-x');
                this.addResult('Overflow Fix CSS', hasOverflowFix, 
                    'Overflow fix CSS implemented');
                
                // Check note styles
                const hasNoteStyles = cssCode.includes('note-block') && cssCode.includes('background');
                this.addResult('Note Styles', hasNoteStyles, 'Note styles present');
                
                // Check responsiveness
                const hasResponsive = cssCode.includes('@media') || cssCode.includes('vw') || cssCode.includes('vh');
                this.addResult('Responsive Design', hasResponsive, 
                    hasResponsive ? 'Responsive design present' : 'Basic design');
                
                // Check animations
                const hasAnimations = cssCode.includes('transition') || cssCode.includes('animation');
                this.addResult('CSS Animations', hasAnimations, 
                    hasAnimations ? 'CSS animations present' : 'No CSS animations');
            }
            
            // Check event handling
            const hasEventHandling = toneDAWCode.includes('addEventListener') && toneDAWCode.includes('onclick');
            this.addResult('Event Handling', hasEventHandling, 'Event handling present');
            
            // Check loading interface
            const hasLoadingUI = toneDAWCode.includes('loading') || toneDAWCode.includes('wait') || 
                                toneDAWCode.includes('waitForSamplersToLoad');
            this.addResult('Loading Interface', hasLoadingUI, 
                hasLoadingUI ? 'Loading interface present' : 'Basic loading interface');
            
            // Check accessibility (more permissive)
            const hasAccessibility = toneDAWCode.includes('aria-') || toneDAWCode.includes('role=') || 
                                    toneDAWCode.includes('title=') || toneDAWCode.includes('.title');
            this.addResult('Accessibility', hasAccessibility, 
                hasAccessibility ? 'Accessibility attributes present' : 'Basic accessibility');
            
            // Check export UI
            const hasExportUI = toneDAWCode.includes('export') && (toneDAWCode.includes('button') || toneDAWCode.includes('onclick'));
            this.addResult('Export UI', hasExportUI, 'Export interface present');
            
        } catch (error) {
            this.addResult('UI Components', false, `Error: ${error.message}`);
        }
    }
}

module.exports = UIComponentsTests;
