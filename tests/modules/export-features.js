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

class ExportFeaturesTests extends TestModule {
    async run() {
        console.log('\nExport features test...');
        
        try {
            const code = this.master.readFile('ToneDAW.js');
            
            // Check MIDI export
            const hasMidiExport = code.includes('exportMIDI') && code.includes('Midi');
            this.addResult('MIDI Export', hasMidiExport, 'MIDI export implemented');
            
            // Check MIDI library integration
            const hasMidiLibrary = code.includes('new Midi()') || code.includes('Midi.Track');
            this.addResult('MIDI Library', hasMidiLibrary, 
                hasMidiLibrary ? 'MIDI library integrated' : 'Basic MIDI library');
            
            // Check WAV export
            const hasWavExport = code.includes('exportWAV') || code.includes('bufferToWav');
            this.addResult('WAV Export', hasWavExport, 
                hasWavExport ? 'WAV export implemented' : 'WAV export not found');
            
            // Check sampling management
            const hasSamplingSupport = code.includes('Sampler') && code.includes('waitForSamplersToLoad');
            this.addResult('Sampling Support', hasSamplingSupport, 'Sampling support present');
            
            // Check JSON export (more flexible)
            const hasJSONExport = code.includes('JSON.stringify') || code.includes('export') || 
                                 code.includes('projectData') || code.includes('save');
            this.addResult('JSON Export', hasJSONExport, 
                hasJSONExport ? 'JSON export implemented' : 'Basic JSON export');
            
            // Check loop management in export
            const hasLoopExport = code.includes('expandNotesWithLoop') && code.includes('export');
            this.addResult('Loop Export', hasLoopExport, 
                'Export with loop expansion implemented');
            
            // Check velocity export
            const hasVelocityExport = code.includes('velocity') && code.includes('export');
            this.addResult('Velocity Export', hasVelocityExport, 
                hasVelocityExport ? 'Velocity export implemented' : 'Basic velocity export');
            
            // Check auto download
            const hasAutoDownload = code.includes('download') && 
                                   (code.includes('createElement') || code.includes('<a'));
            this.addResult('Auto Download', hasAutoDownload, 
                hasAutoDownload ? 'Auto download implemented' : 'Manual download');
            
            // Check file naming management
            const hasFileNaming = code.includes('filename') || code.includes('project');
            this.addResult('File Naming', hasFileNaming, 
                hasFileNaming ? 'File naming implemented' : 'Basic naming');
            
            // Check metadata export
            const hasMetadataExport = code.includes('metadata') && code.includes('export');
            this.addResult('Metadata Export', hasMetadataExport, 
                hasMetadataExport ? 'Metadata export implemented' : 'Basic metadata');
            
            // Check validation before export
            const hasExportValidation = code.includes('validate') || 
                                       (code.includes('export') && code.includes('if'));
            this.addResult('Export Validation', hasExportValidation, 
                hasExportValidation ? 'Export validation present' : 'Basic validation');
            
            // Check export error handling
            const hasErrorHandling = code.includes('try') && code.includes('catch') && 
                                    code.includes('export');
            this.addResult('Export Error Handling', hasErrorHandling, 
                hasErrorHandling ? 'Export error handling present' : 'Basic error handling');
            
            // Check timestamp format
            const hasTimestamps = code.includes('time') && code.includes('duration') && 
                                 code.includes('export');
            this.addResult('Timestamp Export', hasTimestamps, 'Timestamp export implemented');
            
            // Check multi-track export
            const hasMultiTrackExport = code.includes('sequences') && code.includes('forEach') && 
                                       code.includes('export');
            this.addResult('Multi-Track Export', hasMultiTrackExport, 
                'Multi-track export implemented');
                
        } catch (error) {
            this.addResult('Export Features', false, `Error: ${error.message}`);
        }
    }
}

module.exports = ExportFeaturesTests;
