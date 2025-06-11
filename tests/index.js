#!/usr/bin/env node

/**
 * ToneDAW.js - Complete Automated Tests (Node.js)
 * Usage: node tests/index.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class MasterTestSuite {
    constructor() {
        this.testResults = [];
        this.basePath = path.join(__dirname, '..');
        this.setupEnvironment();
        this.loadTestModules();
    }
    
    setupEnvironment() {
        console.log('Setting up test environment...');
        
        // Create simulated DOM environment
        const dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>ToneDAW Test Environment</title>
                <meta charset="utf-8">
            </head>
            <body>
                <div id="test-daw"></div>
                <canvas id="test-canvas"></canvas>
            </body>
            </html>
        `, {
            pretendToBeVisual: true,
            resources: "usable",
            runScripts: "dangerously",
            url: "http://localhost"
        });
        
        // Configurer les globals
        global.window = dom.window;
        global.document = dom.window.document;
        global.HTMLElement = dom.window.HTMLElement;
        global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
        global.cancelAnimationFrame = clearTimeout;
        global.Audio = function() { return { addEventListener: () => {}, load: () => {} }; };
        global.AudioContext = function() { return { createOscillator: () => {} }; };
        
        // Mock Web Audio API
        global.window.AudioContext = global.AudioContext;
        global.window.Audio = global.Audio;
        
        console.log('DOM and Audio environment created successfully');
    }
    
    loadTestModules() {
        // Load test modules dynamically
        const ProjectStructureTests = require('./modules/project-structure');
        const ToneDAWClassTests = require('./modules/tonedaw-class');
        const AudioConfigurationTests = require('./modules/audio-configuration');
        const UIComponentsTests = require('./modules/ui-components');
        const ExportFeaturesTests = require('./modules/export-features');
        const ImprovementsTests = require('./modules/improvements');
        
        // Initialize test modules
        this.testModules = [
            new ProjectStructureTests(this),
            new ToneDAWClassTests(this),
            new AudioConfigurationTests(this),
            new UIComponentsTests(this),
            new ExportFeaturesTests(this),
            new ImprovementsTests(this)
        ];
    }
    
    addResult(testName, passed, message, details = '', category = 'General') {
        const result = {
            test: testName,
            category,
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
    
    async runAllTests() {
        console.log('ToneDAW.js - Complete Test Suite (Node.js)\n');
        console.log('='.repeat(60));
        console.log('Starting automated tests...\n');
        
        // Execute all test modules
        for (const testModule of this.testModules) {
            try {
                await testModule.run();
            } catch (error) {
                this.addResult(
                    testModule.constructor.name,
                    false,
                    `Module error: ${error.message}`,
                    error.stack,
                    'Module Error'
                );
            }
        }
        
        return this.generateReport();
    }
    
    generateReport() {
        console.log('\nCOMPLETE TEST REPORT\n');
        console.log('='.repeat(60));
        
        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = total - passed;
        const successRate = total > 0 ? (passed / total * 100) : 0;
        
        console.log(`Total tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success rate: ${successRate.toFixed(1)}%`);
        
        // Report by category
        const categories = [...new Set(this.testResults.map(r => r.category))];
        console.log('\nResults by category:');
        
        categories.forEach(category => {
            const categoryTests = this.testResults.filter(r => r.category === category);
            const categoryPassed = categoryTests.filter(r => r.passed).length;
            const categoryRate = (categoryPassed / categoryTests.length * 100).toFixed(1);
            
            console.log(`   ${category}: ${categoryPassed}/${categoryTests.length} (${categoryRate}%)`);
        });
        
        // Failed tests
        if (failed > 0) {
            console.log('\nFAILED TESTS:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(result => {
                    console.log(`   - [${result.category}] ${result.test}: ${result.message}`);
                    if (result.details) {
                        console.log(`     └─ ${result.details}`);
                    }
                });
        }
        
        // Save detailed report
        this.saveReport(successRate, total, passed, failed);
        
        return failed === 0;
    }
    
    saveReport(successRate, total, passed, failed) {
        const reportPath = path.join(this.basePath, 'tests', 'report.json');
        const reportData = {
            metadata: {
                timestamp: new Date().toISOString(),
                nodeVersion: process.version,
                platform: process.platform
            },
            summary: {
                total,
                passed,
                failed,
                successRate: Math.round(successRate * 10) / 10
            },
            categories: this.getCategoryStats(),
            results: this.testResults
        };
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
            console.log(`\nDetailed report saved: ${reportPath}`);
        } catch (error) {
            console.log(`\nSave error: ${error.message}`);
        }
    }
    
    getCategoryStats() {
        const categories = [...new Set(this.testResults.map(r => r.category))];
        return categories.reduce((stats, category) => {
            const categoryTests = this.testResults.filter(r => r.category === category);
            const passed = categoryTests.filter(r => r.passed).length;
            
            stats[category] = {
                total: categoryTests.length,
                passed,
                failed: categoryTests.length - passed,
                successRate: Math.round((passed / categoryTests.length * 100) * 10) / 10
            };
            
            return stats;
        }, {});
    }
    
    // Utility methods for modules
    getBasePath() {
        return this.basePath;
    }
    
    readFile(fileName) {
        const filePath = path.join(this.basePath, fileName);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${fileName}`);
        }
        return fs.readFileSync(filePath, 'utf8');
    }
    
    fileExists(fileName) {
        return fs.existsSync(path.join(this.basePath, fileName));
    }
}

// Base class for test modules
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

// Export for use in modules
module.exports = { MasterTestSuite, TestModule };

// Execute if called directly
if (require.main === module) {
    const suite = new MasterTestSuite();
    
    suite.runAllTests()
        .then(success => {
            if (success) {
                console.log('\nAll tests passed successfully!');
                process.exit(0);
            } else {
                console.log('\nSome tests failed. Check the report for details.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\nFatal error:', error.message);
            console.error(error.stack);
            process.exit(1);
        });
}
