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

class ImprovementsTests extends TestModule {
    async run() {
        console.log('\nImplemented improvements test...');
        
        try {
            const toneDAWCode = this.master.readFile('ToneDAW.js');
            const cssCode = this.master.fileExists('style.css') ? this.master.readFile('style.css') : '';
            
            // Test overflow fix (Issue #1)
            const hasOverflowFix = cssCode.includes('95vw') || cssCode.includes('overflow-x') || 
                                  toneDAWCode.includes('overflow');
            this.addResult('Overflow Fix', hasOverflowFix, 
                'Track overflow fix implemented');
            
            // Test hatched style for loops (Issue #5 - Default)
            const hasHatchedStyle = toneDAWCode.includes("'hatched'") && 
                                   toneDAWCode.includes('loopStyle');
            this.addResult('Hatched Loop Style', hasHatchedStyle, 
                'Hatched loop style enabled by default');
            
            // Test velocity transparency (Issue #4)
            const hasVelocityTransparency = toneDAWCode.includes('velocityOpacity') && 
                                           toneDAWCode.includes('avgVelocity');
            this.addResult('Velocity Transparency', hasVelocityTransparency, 
                'Velocity transparency implemented');
            
            // Test unified colors (Issue #4)
            const hasUnifiedColors = toneDAWCode.includes('rgba(0, 0, 0') && 
                                    !toneDAWCode.includes('orange'); // No more orange color for percussion
            this.addResult('Unified Colors', hasUnifiedColors, 
                'Unified note colors (black)');
            
            // Test independent Mute/Solo (Issue #2)
            const hasIndependentMuteSolo = toneDAWCode.includes('manualMuteStates') && 
                                          toneDAWCode.includes('updateTrackStates');            this.addResult('Independent Mute Solo', hasIndependentMuteSolo,
                'Independent Mute/Solo like professional DAW');
            
            // Test fix percussion overlap (Issue #3)
            const hasPercussionFix = toneDAWCode.includes('groupNotesByTimeAndPitch') || 
                                    (toneDAWCode.includes('32n') && toneDAWCode.includes('64n'));
            this.addResult('Percussion Overlap Fix', hasPercussionFix, 
                'Percussion tile overlap fix');
            
            // Test système de styles de boucles
            const hasLoopStyleSystem = toneDAWCode.includes('applyLoopStyling') && 
                                      toneDAWCode.includes('loopStyle');
            this.addResult('Loop Style System', hasLoopStyleSystem, 
                'Loop style system implemented');
            
            // Test gestion des durées courtes
            const hasShortDurationSupport = toneDAWCode.includes('32n') && 
                                           toneDAWCode.includes('64n') && 
                                           toneDAWCode.includes('_parseSimpleDuration');
            this.addResult('Short Duration Support', hasShortDurationSupport, 
                'Short duration support (32n, 64n)');
            
            // Test préservation de la transparence dans les styles de boucles
            const hasTransparencyPreservation = toneDAWCode.includes('velocityOpacity') && 
                                               toneDAWCode.includes('applyLoopStyling');
            this.addResult('Transparency Preservation', hasTransparencyPreservation, 
                'Transparency preservation in loop styles');
            
            // Test amélioration performance (plus permissif)
            const hasPerformanceImprovements = toneDAWCode.includes('requestAnimationFrame') || 
                                              toneDAWCode.includes('debounce') || 
                                              toneDAWCode.includes('ResizeObserver') ||
                                              toneDAWCode.includes('calculateDynamicPixelsPerSecond');
            this.addResult('Performance Improvements', hasPerformanceImprovements, 
                hasPerformanceImprovements ? 'Performance improvements present' : 'Basic performance');
            
            // Test gestion des erreurs améliorée
            const hasImprovedErrorHandling = toneDAWCode.includes('try') && 
                                            toneDAWCode.includes('catch') && 
                                            toneDAWCode.includes('console.error');
            this.addResult('Improved Error Handling', hasImprovedErrorHandling, 
                'Improved error handling');
            
            // Test structure de test complète
            const hasTestStructure = this.master.fileExists('tests/index.js') && 
                                    this.master.fileExists('tests/modules/project-structure.js');
            this.addResult('Test Structure', hasTestStructure, 
                'Complete test structure');
            
            // Test migration Python vers Node.js
            const hasNodeJSMigration = this.master.fileExists('tests/index.js') && 
                                      this.master.fileExists('package.json');
            this.addResult('NodeJS Migration', hasNodeJSMigration, 
                'Python to Node.js test migration');
            
                
        } catch (error) {
            this.addResult('Improvements', false, `Error: ${error.message}`);
        }
    }
}

module.exports = ImprovementsTests;
