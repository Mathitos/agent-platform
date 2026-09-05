#!/usr/bin/env node

/**
 * Smoke test for the packed @loom/cli tarball
 * 
 * This script:
 * 1. Creates a clean temp directory
 * 2. Installs the packed tarball
 * 3. Runs `loom --version` and `loom --help`
 * 4. Verifies the commands succeed
 * 5. Cleans up
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(command, cwd) {
  console.log(`\n$ ${command}`);
  try {
    const output = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Command failed with exit code ${error.status}`);
    console.error(error.stdout);
    console.error(error.stderr);
    throw error;
  }
}

function main() {
  console.log('=== Testing packed @loom/cli tarball ===\n');

  // Find the tarball
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('ERROR: dist/ directory not found. Run `pnpm pack:cli` first.');
    process.exit(1);
  }

  const tarballs = fs.readdirSync(distDir).filter(f => f.startsWith('loom-cli-') && f.endsWith('.tgz'));
  if (tarballs.length === 0) {
    console.error('ERROR: No tarball found in dist/. Run `pnpm pack:cli` first.');
    process.exit(1);
  }

  const tarball = path.join(distDir, tarballs[0]);
  console.log(`Found tarball: ${tarball}`);

  // Create temp directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loom-pack-test-'));
  console.log(`Created temp directory: ${tempDir}`);

  try {
    // Install the tarball globally in the temp directory
    console.log('\n--- Installing tarball ---');
    const npmPrefix = path.join(tempDir, 'npm-global');
    fs.mkdirSync(npmPrefix, { recursive: true });
    run(`npm install --global --prefix ${npmPrefix} ${tarball}`, tempDir);

    // Test the installed binary
    const binPath = path.join(npmPrefix, 'bin', 'loom');
    if (!fs.existsSync(binPath)) {
      // Windows might use .cmd
      const binPathCmd = binPath + '.cmd';
      if (!fs.existsSync(binPathCmd)) {
        throw new Error(`Binary not found at ${binPath} or ${binPathCmd}`);
      }
    }

    console.log('\n--- Testing loom --version ---');
    const versionOutput = run(`${binPath} --version`, tempDir);
    if (!versionOutput.includes('0.1.0')) {
      throw new Error('Version output does not include expected version 0.1.0');
    }

    console.log('\n--- Testing loom --help ---');
    const helpOutput = run(`${binPath} --help`, tempDir);
    if (!helpOutput.includes('Loom')) {
      throw new Error('Help output does not include expected content');
    }

    console.log('\n✅ All smoke tests passed!');
    console.log(`\nTo manually test the packed CLI:`);
    console.log(`  npm install -g ${tarball}`);

  } finally {
    // Clean up
    console.log(`\nCleaning up temp directory: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main();
