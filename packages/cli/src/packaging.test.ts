import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Packaging Configuration', () => {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  describe('package.json', () => {
    it('should have bin entry pointing to bundle.js', () => {
      expect(packageJson.bin).toBeDefined();
      expect(packageJson.bin.loom).toBe('./dist/bundle.js');
    });

    it('should have files field including only bundle files', () => {
      expect(packageJson.files).toBeDefined();
      expect(packageJson.files).toContain('dist/bundle.js');
      expect(packageJson.files).toContain('dist/bundle.js.map');
    });

    it('should have prepack and postpack scripts', () => {
      expect(packageJson.scripts.prepack).toBe('node scripts/prepare-pack.js');
      expect(packageJson.scripts.postpack).toBe('node scripts/restore-pack.js');
    });

    it('should have dependencies for development', () => {
      // During development, workspace dependencies should exist
      expect(packageJson.dependencies).toBeDefined();
      expect(Object.keys(packageJson.dependencies).length).toBeGreaterThan(0);
    });
  });

  describe('Bundle file', () => {
    const bundlePath = path.join(__dirname, '..', 'dist', 'bundle.js');

    it('should exist after build', () => {
      expect(fs.existsSync(bundlePath)).toBe(true);
    });

    it('should have shebang on first line', () => {
      const content = fs.readFileSync(bundlePath, 'utf8');
      const firstLine = content.split('\n')[0];
      expect(firstLine).toBe('#!/usr/bin/env node');
    });

    it('should be executable', () => {
      const stats = fs.statSync(bundlePath);
      // Check if file has execute permission (mode & 0o111 checks x bits)
      expect(stats.mode & 0o111).toBeGreaterThan(0);
    });

    it('should have corresponding source map', () => {
      const sourceMapPath = bundlePath + '.map';
      expect(fs.existsSync(sourceMapPath)).toBe(true);
    });
  });

  describe('Pack scripts', () => {
    const preparePackPath = path.join(__dirname, '..', 'scripts', 'prepare-pack.js');
    const restorePackPath = path.join(__dirname, '..', 'scripts', 'restore-pack.js');

    it('should have prepare-pack.js script', () => {
      expect(fs.existsSync(preparePackPath)).toBe(true);
    });

    it('should have restore-pack.js script', () => {
      expect(fs.existsSync(restorePackPath)).toBe(true);
    });
  });

  describe('Esbuild configuration', () => {
    const esbuildConfigPath = path.join(__dirname, '..', 'esbuild.config.js');

    it('should have esbuild.config.js', () => {
      expect(fs.existsSync(esbuildConfigPath)).toBe(true);
    });

    it('should configure bundle for node platform', () => {
      const config = fs.readFileSync(esbuildConfigPath, 'utf8');
      expect(config).toContain('platform: \'node\'');
      expect(config).toContain('target: \'node18\'');
      expect(config).toContain('bundle: true');
    });
  });
});
