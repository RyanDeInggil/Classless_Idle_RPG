/**
 * Architecture guard tests — enforces project rules.
 * 
 * Hard rule: src/core must not import data values (only types).
 * Core functions receive config as an explicit parameter.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const coreDir = path.join(projectRoot, 'src', 'core');

/**
 * Recursively collects all .ts files under a directory.
 */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  
  return results;
}

/**
 * Checks if a file contains an import from the data folder that is NOT `import type`.
 */
function hasValueImportFromData(filePath: string): { hasValueImport: boolean; line?: string; lineNumber?: number } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match import statements that reference ../data or ../../data but are NOT type-only imports
    const importMatch = line.match(/^import\s+(?!type\b)(.*?)\s+from\s+['"]\.\.\/+data/);
    if (importMatch) {
      return { hasValueImport: true, line, lineNumber: i + 1 };
    }
  }
  
  return { hasValueImport: false };
}

describe('Architecture: core must not import data values', () => {
  it('src/core files only use `import type` from data folder', () => {
    const coreFiles = collectTsFiles(coreDir);
    expect(coreFiles.length).toBeGreaterThan(0); // Sanity check
    
    const violations: Array<{ file: string; line: string; lineNumber: number }> = [];
    
    for (const file of coreFiles) {
      const result = hasValueImportFromData(file);
      if (result.hasValueImport) {
        violations.push({
          file: path.relative(projectRoot, file),
          line: result.line!,
          lineNumber: result.lineNumber!,
        });
      }
    }
    
    if (violations.length > 0) {
      const message = [
        'Core files must not import data values (only types).',
        'Violations found:',
        ...violations.map(v => `  ${v.file}:${v.lineNumber}: ${v.line.trim()}`),
      ].join('\n');
      
      expect.fail(message);
    }
    
    expect(violations).toHaveLength(0);
  });
  
  it('detects value imports when they exist (validation)', () => {
    // Create a temporary test case to prove the guard works
    const testContent = `
import { defaultConfig } from '../data/index.js';
import type { Content } from '../data/schemas.js';
    `.trim();
    
    // Simulate the check
    const lines = testContent.split(/\r?\n/);
    let found = false;
    for (const line of lines) {
      const importMatch = line.match(/^import\s+(?!type\b)(.*?)\s+from\s+['"]\.\.\/+data/);
      if (importMatch) {
        found = true;
        break;
      }
    }
    
    expect(found).toBe(true); // Should detect the value import
  });
});
