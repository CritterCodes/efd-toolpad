#!/usr/bin/env node
/**
 * Test Runner for Pricing Validation Tests
 * 
 * Runs all pricing-related validation tests
 * Usage: node test-pricing-runner.mjs [--all|--constants|--engine]
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const testMode = args[0] || '--all';

const tests = {
  constants: join(__dirname, 'test-pricing-constants.mjs'),
  engine: join(__dirname, 'test-pricing-engine.mjs')
};

function runTest(testFile, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${testName} tests...`);
    console.log('='.repeat(50));
    
    const testProcess = spawn('node', [testFile], {
      stdio: 'inherit',
      shell: true
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${testName} tests passed!\n`);
        resolve(true);
      } else {
        console.log(`\n❌ ${testName} tests failed with code ${code}\n`);
        resolve(false);
      }
    });
    
    testProcess.on('error', (error) => {
      console.error(`\n❌ Error running ${testName} tests:`, error);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Pricing Validation Test Suite');
  console.log('=================================\n');
  
  const results = {
    constants: false,
    engine: false
  };
  
  try {
    if (testMode === '--all' || testMode === '--constants') {
      results.constants = await runTest(tests.constants, 'Constants');
    }
    
    if (testMode === '--all' || testMode === '--engine') {
      results.engine = await runTest(tests.engine, 'Pricing Engine');
    }
    
    // Summary
    console.log('\n📊 Test Suite Summary');
    console.log('====================');
    
    const allPassed = Object.values(results).every(result => result === true);
    const testsRun = Object.values(results).filter(r => r !== false).length;
    
    if (testMode === '--all') {
      console.log(`Constants Tests: ${results.constants ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`Engine Tests: ${results.engine ? '✅ PASSED' : '❌ FAILED'}`);
    } else {
      const testName = testMode === '--constants' ? 'Constants' : 'Pricing Engine';
      console.log(`${testName} Tests: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    console.log(`\nTests Run: ${testsRun}`);
    console.log(`All Passed: ${allPassed ? '✅ YES' : '❌ NO'}`);
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
    process.exit(1);
  }
}

// Show usage if help requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node test-pricing-runner.mjs [options]

Options:
  --all        Run all tests (default)
  --constants  Run only constants tests
  --engine     Run only pricing engine tests
  --help, -h   Show this help message

Examples:
  node test-pricing-runner.mjs
  node test-pricing-runner.mjs --constants
  node test-pricing-runner.mjs --engine
`);
  process.exit(0);
}

// Run tests
runAllTests();

