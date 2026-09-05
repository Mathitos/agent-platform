import * as fs from 'fs';
import * as path from 'path';
import { TelemetryEvent, TelemetryEventType } from './types';

export interface TelemetryStoreOptions {
  userId?: string;
  storePath?: string;
}

export class TelemetryStore {
  private static readonly DEFAULT_USER_ID = 'default';
  private userId: string;
  private storePath: string;

  constructor(options: TelemetryStoreOptions = {}) {
    this.userId = options.userId || TelemetryStore.DEFAULT_USER_ID;

    if (options.storePath) {
      this.storePath = options.storePath;
    } else {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
      this.storePath = path.join(homeDir, '.loom', 'users', this.userId, 'telemetry');
    }

    this.ensureStoreDirectory();
  }

  private ensureStoreDirectory(): void {
    if (!fs.existsSync(this.storePath)) {
      fs.mkdirSync(this.storePath, { recursive: true });
    }
  }

  private getRunLogPath(runId: string): string {
    return path.join(this.storePath, `${runId}.jsonl`);
  }

  private getRunStatePath(runId: string): string {
    return path.join(this.storePath, `${runId}.state.json`);
  }

  append(event: TelemetryEvent): void {
    const logPath = this.getRunLogPath(event.runId);
    const line = JSON.stringify(event) + '\n';

    try {
      fs.appendFileSync(logPath, line, 'utf8');
    } catch (error) {
      throw new Error(`Failed to append telemetry event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  listByRun(runId: string, options: { eventType?: TelemetryEventType; limit?: number } = {}): TelemetryEvent[] {
    const logPath = this.getRunLogPath(runId);

    if (!fs.existsSync(logPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);

      let events = lines.map(line => JSON.parse(line) as TelemetryEvent);

      if (options.eventType) {
        events = events.filter(e => e.type === options.eventType);
      }

      if (options.limit && options.limit > 0) {
        events = events.slice(0, options.limit);
      }

      return events;
    } catch (error) {
      throw new Error(`Failed to read telemetry log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  saveState(runId: string, state: Record<string, unknown>): void {
    const statePath = this.getRunStatePath(runId);

    try {
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to save run state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  loadState(runId: string): Record<string, unknown> | null {
    const statePath = this.getRunStatePath(runId);

    if (!fs.existsSync(statePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(statePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load run state: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  listRuns(): string[] {
    if (!fs.existsSync(this.storePath)) {
      return [];
    }

    try {
      const files = fs.readdirSync(this.storePath);
      const runIds = new Set<string>();

      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          runIds.add(file.replace('.jsonl', ''));
        } else if (file.endsWith('.state.json')) {
          runIds.add(file.replace('.state.json', ''));
        }
      }

      return Array.from(runIds).sort().reverse();
    } catch (error) {
      throw new Error(`Failed to list runs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  deleteRun(runId: string): void {
    const logPath = this.getRunLogPath(runId);
    const statePath = this.getRunStatePath(runId);

    try {
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }
      if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete run: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
