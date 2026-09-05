import * as path from 'path';
import * as fs from 'fs';
import { I18n } from '@loom/core';

export class PathPermissionChecker {
  /**
   * Check if a path is within trusted directories (YOLO mode).
   * Outside trusted paths: deny/ask stub (will ask in future, denies for now).
   */
  static isPathAllowed(
    targetPath: string,
    workspaceRoot: string,
    trustedPaths: string[]
  ): { allowed: boolean; reason?: string } {
    const t = I18n.t.bind(I18n);
    // Check for path traversal attempts BEFORE resolving
    if (targetPath.includes('..')) {
      return {
        allowed: false,
        reason: t('errors.pathTraversal'),
      };
    }

    // Resolve to absolute path
    const absolutePath = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(workspaceRoot, targetPath);

    // Normalize path
    const normalizedPath = path.normalize(absolutePath);

    // Check if path is within workspace root (primary trusted zone)
    const normalizedWorkspace = path.normalize(path.resolve(workspaceRoot));
    if (normalizedPath.startsWith(normalizedWorkspace + path.sep) || normalizedPath === normalizedWorkspace) {
      return { allowed: true };
    }

    // Check additional trusted paths
    for (const trustedPath of trustedPaths) {
      const normalizedTrusted = path.normalize(path.resolve(trustedPath));
      if (normalizedPath.startsWith(normalizedTrusted + path.sep) || normalizedPath === normalizedTrusted) {
        return { allowed: true };
      }
    }

    // Outside trusted folders - deny for now (future: ask user)
    return {
      allowed: false,
      reason: t('errors.pathOutsideTrusted')(normalizedPath),
    };
  }

  /**
   * Validate and resolve a path, checking permissions.
   */
  static validatePath(
    targetPath: string,
    workspaceRoot: string,
    trustedPaths: string[]
  ): string {
    const t = I18n.t.bind(I18n);
    const check = this.isPathAllowed(targetPath, workspaceRoot, trustedPaths);
    if (!check.allowed) {
      throw new Error(check.reason || t('errors.pathNotAllowed'));
    }

    // Return absolute normalized path
    const absolutePath = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(workspaceRoot, targetPath);
    
    return path.normalize(absolutePath);
  }

  /**
   * Check if path exists and is accessible.
   */
  static pathExists(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure parent directory exists.
   */
  static ensureParentDir(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!this.pathExists(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
