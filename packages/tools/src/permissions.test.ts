import { describe, it, expect } from 'vitest';
import { PathPermissionChecker } from './permissions';
import * as path from 'path';

describe('PathPermissionChecker', () => {
  const workspaceRoot = '/home/user/project';
  const trustedPaths = ['/home/user/trusted'];

  describe('isPathAllowed', () => {
    it('should allow paths within workspace root', () => {
      const result = PathPermissionChecker.isPathAllowed(
        'src/file.ts',
        workspaceRoot,
        []
      );
      expect(result.allowed).toBe(true);
    });

    it('should allow absolute paths within workspace root', () => {
      const result = PathPermissionChecker.isPathAllowed(
        '/home/user/project/src/file.ts',
        workspaceRoot,
        []
      );
      expect(result.allowed).toBe(true);
    });

    it('should allow paths in trusted directories', () => {
      const result = PathPermissionChecker.isPathAllowed(
        '/home/user/trusted/file.ts',
        workspaceRoot,
        trustedPaths
      );
      expect(result.allowed).toBe(true);
    });

    it('should deny paths outside workspace and trusted dirs', () => {
      const result = PathPermissionChecker.isPathAllowed(
        '/etc/passwd',
        workspaceRoot,
        trustedPaths
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('outside trusted directories');
    });

    it('should block path traversal with ..', () => {
      const result = PathPermissionChecker.isPathAllowed(
        '../../../etc/passwd',
        workspaceRoot,
        []
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
    });

    it('should block path traversal in middle of path', () => {
      const result = PathPermissionChecker.isPathAllowed(
        'src/../../etc/passwd',
        workspaceRoot,
        []
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
    });

    it('should allow workspace root itself', () => {
      const result = PathPermissionChecker.isPathAllowed(
        workspaceRoot,
        workspaceRoot,
        []
      );
      expect(result.allowed).toBe(true);
    });

    it('should block paths with .. even if they normalize to allowed location', () => {
      const result = PathPermissionChecker.isPathAllowed(
        './src/../src/file.ts',
        workspaceRoot,
        []
      );
      // This path contains .. so should be blocked even though it would normalize to src/file.ts
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
    });
  });

  describe('validatePath', () => {
    it('should return normalized absolute path for allowed paths', () => {
      const result = PathPermissionChecker.validatePath(
        'src/file.ts',
        workspaceRoot,
        []
      );
      expect(result).toBe(path.normalize('/home/user/project/src/file.ts'));
    });

    it('should throw error for disallowed paths', () => {
      expect(() => {
        PathPermissionChecker.validatePath(
          '/etc/passwd',
          workspaceRoot,
          trustedPaths
        );
      }).toThrow('outside trusted directories');
    });

    it('should throw error for path traversal attempts', () => {
      expect(() => {
        PathPermissionChecker.validatePath(
          '../../etc/passwd',
          workspaceRoot,
          []
        );
      }).toThrow('Path traversal detected');
    });
  });
});
