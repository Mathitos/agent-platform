#!/usr/bin/env node

/**
 * Restore package.json after packing
 */

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const backupPath = path.join(__dirname, '..', 'package.json.backup');

if (fs.existsSync(backupPath)) {
  // Restore original
  fs.copyFileSync(backupPath, pkgPath);
  fs.unlinkSync(backupPath);
  console.log('✅ Restored package.json after packing');
} else {
  console.log('⚠️  No backup found, package.json not restored');
}
