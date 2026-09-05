#!/usr/bin/env node

/**
 * Prepare package.json for packing by removing workspace dependencies
 * since everything is bundled into bundle.js
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const backupPath = path.join(__dirname, '..', 'package.json.backup');

// Read package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// Backup original
fs.writeFileSync(backupPath, JSON.stringify(pkg, null, 2));

// Remove dependencies since everything is bundled
delete pkg.dependencies;

// Write modified package.json
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✅ Prepared package.json for packing (dependencies removed)');
