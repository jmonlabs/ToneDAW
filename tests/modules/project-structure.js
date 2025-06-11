const path = require('path');
const fs = require('fs');

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

class ProjectStructureTests extends TestModule {
    async run() {
        console.log('\nProject structure test...');
        
        try {
            // Test essential files existence
            const essentialFiles = [
                'ToneDAW.js',
                'style.css', 
                'porcelain.json',
                'package.json',
                'index.html'
            ];
            
            essentialFiles.forEach(file => {
                const exists = this.master.fileExists(file);
                this.addResult(`File ${file}`, exists, 
                    exists ? 'File found' : 'File missing');
            });
            
            // Test project JSON structure
            if (this.master.fileExists('porcelain.json')) {
                const projectData = JSON.parse(this.master.readFile('porcelain.json'));
                
                const hasSequences = Array.isArray(projectData.sequences);
                this.addResult('Project Structure', hasSequences, 'Valid sequence structure');
                
                const hasBPM = typeof projectData.bpm === 'number';
                this.addResult('BPM Config', hasBPM, `BPM: ${projectData.bpm || 'undefined'}`);
                
                const hasMetadata = projectData.metadata && typeof projectData.metadata === 'object';
                this.addResult('Metadata', hasMetadata, 
                    hasMetadata ? 'Metadata present' : 'Metadata missing');
                
                // Test each sequence
                if (projectData.sequences) {
                    projectData.sequences.forEach((seq, index) => {
                        const hasNotes = Array.isArray(seq.notes);
                        const hasSynth = seq.synth && typeof seq.synth === 'object';
                        const hasLoop = seq.loop !== undefined;
                        
                        const label = seq.label || `Sequence ${index + 1}`;
                        this.addResult(`Sequence ${index + 1}`, hasNotes && hasSynth,
                            `${label}: notes=${hasNotes}, synth=${hasSynth}, loop=${hasLoop}`);
                            
                        // Test note structure
                        if (hasNotes && seq.notes.length > 0) {
                            const firstNote = seq.notes[0];
                            const hasRequiredProps = firstNote.hasOwnProperty('note') && 
                                                   firstNote.hasOwnProperty('time') && 
                                                   firstNote.hasOwnProperty('duration');
                            this.addResult(`Sequence ${index + 1} Notes`, hasRequiredProps,
                                'Valid note structure');
                        }
                    });
                }
                
                // Test total project duration
                if (projectData.sequences && projectData.sequences.length > 0) {
                    const hasDuration = projectData.sequences.some(seq => 
                        seq.notes && seq.notes.length > 0);
                    this.addResult('Project Duration', hasDuration, 
                        'Project contains notes with duration');
                }
            }
            
            // Test documentation files
            const docFiles = ['README.md', 'LICENSE'];
            docFiles.forEach(file => {
                const exists = this.master.fileExists(file);
                this.addResult(`Documentation ${file}`, exists,
                    exists ? 'Documentation present' : 'Documentation missing');
            });
            
            // Test samples folder
            const samplesPath = path.join(this.master.getBasePath(), 'samples');
            const hasSamples = fs.existsSync(samplesPath);
            this.addResult('Samples Directory', hasSamples,
                hasSamples ? 'Samples folder present' : 'Samples folder missing');
                
        } catch (error) {
            this.addResult('Project Structure', false, `Error: ${error.message}`);
        }
    }
}

module.exports = ProjectStructureTests;
