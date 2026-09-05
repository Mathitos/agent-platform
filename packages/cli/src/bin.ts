#!/usr/bin/env node

import { I18n, ConfigManager } from '@loom/core';
import { CLI } from './cli';

function main(): void {
  const userConfig = ConfigManager.getDefaultUserConfig();
  I18n.setLocale(userConfig.locale);

  const args = process.argv.slice(2);
  CLI.run(args);
}

main();
