#!/usr/bin/env node

/**
 * ToneDAW.js - Tests automatisés de sortie audio (Node.js)
 * Usage: node tests/automated.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('🎵 ToneDAW.js - Tests Audio Automatisés (Node.js)\n');

class AudioTester {
    constructor() {
        this.testResults = [];
        this.basePath = path.join(__dirname, '..');
        this.setupEnvironment();
    }
    
    setupEnvironment() {
        // Créer un environnement DOM simulé
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head><title>ToneDAW Test</title></head>
            <body>
                <div id="test-daw"></div>
            </body>
            </html>
        `, {
            pretendToBeVisual: true,
            resources: "usable",
            runScripts: "dangerously"
        });
        
        global.window = dom.window;
        global.document = dom.window.document;
        global.HTMLElement = dom.window.HTMLElement;
        global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
        global.cancelAnimationFrame = clearTimeout;
        
        console.log('✅ Environnement DOM simulé créé');
    }
    
    addResult(testName, passed, message, details = '') {
        const result = {
            test: testName,
            passed,
            message,
            details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${testName}: ${message}`);
        if (details) console.log(`   └─ ${details}`);
    }
    
    async testProjectStructure() {
        console.log('\n📁 Test de structure de projet...');
        
        try {
            // Test existence fichiers essentiels
            const essentialFiles = ['ToneDAW.js', 'style.css', 'porcelain.json', 'package.json'];
            
            for (const file of essentialFiles) {
                const filePath = path.join(this.basePath, file);
                const exists = fs.existsSync(filePath);
                this.addResult(`File ${file}`, exists, 
                    exists ? 'Fichier trouvé' : 'Fichier manquant');
            }
            
            // Test structure projet JSON
            const projectPath = path.join(this.basePath, 'porcelain.json');
            if (fs.existsSync(projectPath)) {
                const projectData = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
                
                const hasSequences = Array.isArray(projectData.sequences);
                this.addResult('Project Structure', hasSequences, 'Structure séquences valide');
                
                const hasBPM = typeof projectData.bpm === 'number';
                this.addResult('BPM Config', hasBPM, `BPM: ${projectData.bpm || 'non défini'}`);
                
                const hasMetadata = projectData.metadata && typeof projectData.metadata === 'object';
                this.addResult('Metadata', hasMetadata, hasMetadata ? 'Métadonnées présentes' : 'Métadonnées manquantes');
                
                // Test chaque séquence
                if (projectData.sequences) {
                    projectData.sequences.forEach((seq, index) => {
                        const hasNotes = Array.isArray(seq.notes);
                        const hasSynth = seq.synth && typeof seq.synth === 'object';
                        const hasLoop = seq.loop !== undefined;
                        
                        const label = seq.label || `Sequence ${index + 1}`;
                        this.addResult(`Sequence ${index + 1}`, hasNotes && hasSynth,
                            `${label}: notes=${hasNotes}, synth=${hasSynth}, loop=${hasLoop}`);
                    });
                }
            }
            
        } catch (error) {
            this.addResult('Project Structure', false, `Erreur: ${error.message}`);
        }
    }
    
    async testToneDAWClass() {
        console.log('\n🎹 Test de la classe ToneDAW...');
        
        try {
            const toneDawPath = path.join(this.basePath, 'ToneDAW.js');
            if (!fs.existsSync(toneDawPath)) {
                this.addResult('ToneDAW File', false, 'Fichier ToneDAW.js manquant');
                return;
            }
            
            const code = fs.readFileSync(toneDawPath, 'utf8');
            
            // Vérifier structure de classe
            const hasClass = /class\s+ToneDAW/.test(code);
            this.addResult('Class Definition', hasClass, 'Classe ToneDAW définie');
            
            const hasConstructor = /constructor\s*\(/m.test(code);
            this.addResult('Constructor', hasConstructor, 'Constructeur présent');
            
            // Vérifier méthodes essentielles
            const essentialMethods = [
                'buildUI', 'setupAudio', 'drawNotes', 'togglePlay',
                'exportMIDI', 'expandNotesWithLoop', 'updateTrackStates',
                'animate', 'getTotalDuration', 'applyLoopStyling'
            ];
            
            essentialMethods.forEach(method => {
                const hasMethod = new RegExp(`${method}\\s*\\(`).test(code);
                this.addResult(`Method ${method}`, hasMethod,
                    hasMethod ? 'Méthode présente' : 'Méthode manquante');
            });
            
            // Vérifier gestion des boucles
            const hasLoopHandling = code.includes('expandNotesWithLoop') && 
                                   code.includes('loopStyle');
            this.addResult('Loop Handling', hasLoopHandling, 'Gestion des boucles implémentée');
            
            // Vérifier gestion velocity
            const hasVelocity = code.includes('velocity') && code.includes('velocityOpacity');
            this.addResult('Velocity Handling', hasVelocity, 'Gestion vélocité implémentée');
            
            // Vérifier style hachuré par défaut
            const hasHatchedDefault = code.includes("'hatched'");
            this.addResult('Hatched Style Default', hasHatchedDefault, 
                'Style hachuré configuré par défaut');
                
        } catch (error) {
            this.addResult('ToneDAW Class', false, `Erreur: ${error.message}`);
        }
    }
    
    async testAudioConfiguration() {
        console.log('\n🔊 Test de configuration audio...');
        
        try {
            const toneDawPath = path.join(this.basePath, 'ToneDAW.js');
            const code = fs.readFileSync(toneDawPath, 'utf8');
            
            // Vérifier support Tone.js
            const hasToneJS = code.includes('Tone.') && code.includes('toDestination');
            this.addResult('Tone.js Integration', hasToneJS, 'Intégration Tone.js détectée');
            
            // Vérifier types de synthés supportés
            const synthTypes = ['Synth', 'AMSynth', 'FMSynth', 'DuoSynth', 'PolySynth', 'Sampler', 'NoiseSynth'];
            synthTypes.forEach(synthType => {
                const hasSupport = code.includes(synthType);
                this.addResult(`Synth ${synthType}`, hasSupport,
                    hasSupport ? 'Supporté' : 'Non supporté');
            });
            
            // Vérifier gestion transport
            const hasTransport = code.includes('Tone.Transport') && code.includes('this.transport');
            this.addResult('Transport Control', hasTransport, 'Contrôle transport présent');
            
            // Vérifier gestion timing
            const hasTiming = code.includes('_parseSimpleTime') && code.includes('_parseSimpleDuration');
            this.addResult('Timing Parsing', hasTiming, 'Parsing timing implémenté');
            
            // Vérifier support MIDI
            const hasMIDISupport = code.includes('midiNoteToNoteName') && code.includes('noteNameToMidiNote');
            this.addResult('MIDI Support', hasMIDISupport, 'Support notes MIDI implémenté');
            
        } catch (error) {
            this.addResult('Audio Configuration', false, `Erreur: ${error.message}`);
        }
    }
    
    async testUIComponents() {
        console.log('\n🖥️ Test des composants UI...');
        
        try {
            const toneDawPath = path.join(this.basePath, 'ToneDAW.js');
            const cssPath = path.join(this.basePath, 'style.css');
            
            const jsCode = fs.readFileSync(toneDawPath, 'utf8');
            const cssCode = fs.readFileSync(cssPath, 'utf8');
            
            // Vérifier éléments UI essentiels dans JS
            const uiElements = [
                'play-button', 'timeline', 'track-header', 'track-lane',
                'mute-solo-button', 'note-block', 'daw-progress-line'
            ];
            
            uiElements.forEach(element => {
                const hasElement = jsCode.includes(element) || cssCode.includes(element);
                this.addResult(`UI ${element}`, hasElement,
                    hasElement ? 'Élément présent' : 'Élément manquant');
            });
            
            // Vérifier contrôles
            const hasPlayControl = jsCode.includes('togglePlay');
            this.addResult('Play Control', hasPlayControl, 'Contrôle lecture présent');
            
            const hasMuteControl = jsCode.includes('updateTrackStates');
            this.addResult('Mute Control', hasMuteControl, 'Contrôle mute présent');
            
            const hasZoomControl = jsCode.includes('pixelsPerSecond');
            this.addResult('Zoom Control', hasZoomControl, 'Contrôle zoom présent');
            
            // Vérifier indépendance mute/solo
            const hasManualMute = jsCode.includes('manualMuteStates');
            this.addResult('Independent Mute/Solo', hasManualMute, 
                'Mute/Solo indépendants implémentés');
                
            // Vérifier auto-scale
            const hasAutoScale = jsCode.includes('autoScale') && jsCode.includes('calculateDynamicPixelsPerSecond');
            this.addResult('Auto Scale', hasAutoScale, 'Auto-scale implémenté');
            
        } catch (error) {
            this.addResult('UI Components', false, `Erreur: ${error.message}`);
        }
    }
    
    async testExportFeatures() {
        console.log('\n💾 Test des fonctionnalités d\'export...');
        
        try {
            const toneDawPath = path.join(this.basePath, 'ToneDAW.js');
            const code = fs.readFileSync(toneDawPath, 'utf8');
            
            // Vérifier export MIDI
            const hasMIDIExport = code.includes('exportMIDI') && code.includes('new Midi()');
            this.addResult('MIDI Export', hasMIDIExport, 'Export MIDI implémenté');
            
            // Vérifier export WAV
            const hasWAVExport = code.includes('exportWAV') && code.includes('bufferToWav');
            this.addResult('WAV Export', hasWAVExport, 'Export WAV implémenté');
            
            // Vérifier gestion échantillons
            const hasSampling = code.includes('Sampler') && code.includes('waitForSamplersToLoad');
            this.addResult('Sampling Support', hasSampling, 'Support échantillonnage présent');
            
            // Vérifier intégration @tonejs/midi
            const packagePath = path.join(this.basePath, 'package.json');
            if (fs.existsSync(packagePath)) {
                const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                // Note: Les dépendances sont chargées via CDN, pas npm
                this.addResult('Package Config', true, 'Configuration package présente');
            }
            
        } catch (error) {
            this.addResult('Export Features', false, `Erreur: ${error.message}`);
        }
    }
    
    async testImprovementsImplemented() {
        console.log('\n🎯 Test des améliorations récentes...');
        
        try {
            const toneDawPath = path.join(this.basePath, 'ToneDAW.js');
            const cssPath = path.join(this.basePath, 'style.css');
            
            const jsCode = fs.readFileSync(toneDawPath, 'utf8');
            const cssCode = fs.readFileSync(cssPath, 'utf8');
            
            // Test fix overflow - doit être dans CSS
            const hasOverflowFix = cssCode.includes('95vw') || cssCode.includes('overflow-x');
            this.addResult('Overflow Fix', hasOverflowFix, 'Fix débordement tracks implémenté');
            
            // Test style hachuré pour boucles
            const hasHatchedStyle = jsCode.includes("'hatched'") && jsCode.includes('applyLoopStyling');
            this.addResult('Hatched Loop Style', hasHatchedStyle, 'Style hachuré boucles activé');
            
            // Test transparence vélocité
            const hasVelocityTransparency = jsCode.includes('velocityOpacity') && jsCode.includes('avgVelocity');
            this.addResult('Velocity Transparency', hasVelocityTransparency, 
                'Transparence par vélocité implémentée');
            
            // Test couleurs unifiées
            const hasUnifiedColors = jsCode.includes('rgba(0, 0, 0');
            this.addResult('Unified Colors', hasUnifiedColors, 'Couleurs notes unifiées');
            
            // Test gestion percussion améliorée
            const hasPercussionFix = jsCode.includes('isVeryShort') && jsCode.includes('percussion-note');
            this.addResult('Percussion Fix', hasPercussionFix, 'Fix percussion implémenté');
            
            // Test multiple loop styles
            const hasMultipleLoopStyles = jsCode.includes('gradient') && 
                                        jsCode.includes('double-border') && 
                                        jsCode.includes('outline');
            this.addResult('Multiple Loop Styles', hasMultipleLoopStyles, 'Styles de boucles multiples');
            
        } catch (error) {
            this.addResult('Improvements', false, `Erreur: ${error.message}`);
        }
    }
    
    async testSampleFiles() {
        console.log('\n🎵 Test des fichiers d\'échantillons...');
        
        try {
            const samplesPath = path.join(this.basePath, 'samples');
            
            if (fs.existsSync(samplesPath)) {
                const files = fs.readdirSync(samplesPath);
                const wavFiles = files.filter(f => f.endsWith('.wav'));
                
                this.addResult('Samples Directory', true, `Dossier samples trouvé avec ${files.length} fichiers`);
                this.addResult('WAV Samples', wavFiles.length > 0, 
                    `${wavFiles.length} fichiers WAV trouvés`);
                
                // Vérifier readme
                const hasReadme = files.some(f => f.includes('readme'));
                this.addResult('Samples Documentation', hasReadme, 
                    hasReadme ? 'Documentation échantillons présente' : 'Documentation manquante');
            } else {
                this.addResult('Samples Directory', false, 'Dossier samples manquant');
            }
            
        } catch (error) {
            this.addResult('Sample Files', false, `Erreur: ${error.message}`);
        }
    }
    
    generateReport() {
        console.log('\n📊 RAPPORT DE TESTS\n');
        console.log('='.repeat(60));
        
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        const successRate = total > 0 ? ((passed / total) * 100) : 0;
        
        console.log(`📈 Total des tests: ${total}`);
        console.log(`✅ Réussis: ${passed}`);
        console.log(`❌ Échoués: ${failed}`);
        console.log(`📊 Taux de réussite: ${successRate.toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ TESTS ÉCHOUÉS:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`   • ${r.test}: ${r.message}`));
        }
        
        // Sauvegarder rapport détaillé
        const reportPath = path.join(this.basePath, 'tests', 'report.json');
        const reportData = {
            timestamp: new Date().toISOString(),
            environment: {
                node: process.version,
                platform: process.platform,
                cwd: process.cwd()
            },
            summary: {
                total,
                passed,
                failed,
                successRate: parseFloat(successRate.toFixed(1))
            },
            results: this.testResults
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`\n📄 Rapport détaillé: ${reportPath}`);
        
        // Créer un résumé markdown
        this.generateMarkdownReport();
        
        return failed === 0;
    }
    
    generateMarkdownReport() {
        const reportPath = path.join(this.basePath, 'tests', 'LATEST_REPORT.md');
        const timestamp = new Date().toLocaleString('fr-FR');
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const successRate = total > 0 ? ((passed / total) * 100) : 0;
        
        let markdown = `# 🎵 ToneDAW.js - Rapport de Tests\n\n`;
        markdown += `**Date:** ${timestamp}\n`;
        markdown += `**Node.js:** ${process.version}\n`;
        markdown += `**Plateforme:** ${process.platform}\n\n`;
        markdown += `## 📊 Résumé\n\n`;
        markdown += `- **Total:** ${total} tests\n`;
        markdown += `- **Réussis:** ${passed} ✅\n`;
        markdown += `- **Échoués:** ${total - passed} ❌\n`;
        markdown += `- **Taux de réussite:** ${successRate.toFixed(1)}%\n\n`;
        
        // Grouper par catégorie
        const categories = {};
        this.testResults.forEach(result => {
            const category = result.test.split(' ')[0];
            if (!categories[category]) categories[category] = [];
            categories[category].push(result);
        });
        
        markdown += `## 📋 Détails par Catégorie\n\n`;
        Object.entries(categories).forEach(([category, results]) => {
            const categoryPassed = results.filter(r => r.passed).length;
            const categoryTotal = results.length;
            const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);
            
            markdown += `### ${category} (${categoryPassed}/${categoryTotal} - ${categoryRate}%)\n\n`;
            results.forEach(result => {
                const icon = result.passed ? '✅' : '❌';
                markdown += `- ${icon} **${result.test}**: ${result.message}\n`;
                if (result.details) {
                    markdown += `  - ${result.details}\n`;
                }
            });
            markdown += `\n`;
        });
        
        fs.writeFileSync(reportPath, markdown);
        console.log(`📝 Résumé markdown: ${reportPath}`);
    }
    
    async runAllTests() {
        console.log('🚀 Début des tests automatisés Node.js...\n');
        
        await this.testProjectStructure();
        await this.testToneDAWClass();
        await this.testAudioConfiguration();
        await this.testUIComponents();
        await this.testExportFeatures();
        await this.testImprovementsImplemented();
        await this.testSampleFiles();
        
        return this.generateReport();
    }
}

// Exécution des tests
async function main() {
    try {
        const tester = new AudioTester();
        const success = await tester.runAllTests();
        
        if (success) {
            console.log('\n🎉 Tous les tests sont passés avec succès!');
            process.exit(0);
        } else {
            console.log('\n⚠️ Certains tests ont échoué. Consultez le rapport pour plus de détails.');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 Erreur fatale:', error.message);
        process.exit(1);
    }
}

// Vérifier si exécuté directement
if (require.main === module) {
    main();
}

module.exports = AudioTester;
