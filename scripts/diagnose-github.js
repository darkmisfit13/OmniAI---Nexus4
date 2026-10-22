#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('\n============================================================');
console.log('🔍 GITHUB COMMIT & PUSH PRE-FLIGHT DIAGNOSTIC SUITE');
console.log('============================================================\n');

const rootDir = process.cwd();
const GITHUB_API_BLOB_LIMIT = 25 * 1024 * 1024; // 25 MB
const GITHUB_HARD_LIMIT = 100 * 1024 * 1024;    // 100 MB
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.aistudio']);

let totalFiles = 0;
let totalBytes = 0;
const oversizedFiles = [];
const warnedFiles = [];
const problematicNames = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      totalFiles++;
      const stats = fs.statSync(fullPath);
      totalBytes += stats.size;

      // Check file size against GitHub API and Git limits
      if (stats.size > GITHUB_API_BLOB_LIMIT) {
        oversizedFiles.push({ path: relPath, sizeMB: (stats.size / (1024 * 1024)).toFixed(2) });
      } else if (stats.size > 5 * 1024 * 1024) {
        warnedFiles.push({ path: relPath, sizeMB: (stats.size / (1024 * 1024)).toFixed(2) });
      }

      // Check for problematic filename characters
      if (/[:*?"<>|\r\n\t]/.test(entry.name)) {
        problematicNames.push(relPath);
      }
    }
  }
}

scanDirectory(rootDir);

console.log(`📁 Scanned Files: ${totalFiles} tracked files`);
console.log(`💾 Total Tracked Size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

// 1. FILE SIZE CHECK
console.log('\n--- [Check 1: File Size Compliance] ---');
if (oversizedFiles.length > 0) {
  console.error('❌ FAIL: The following files exceed GitHub API 25MB limit:');
  oversizedFiles.forEach(f => console.error(`   - ${f.path} (${f.sizeMB} MB) -> Will trigger "Request contains an invalid argument"`));
} else {
  console.log('✅ PASS: All files are under the 25MB GitHub API blob threshold.');
}

if (warnedFiles.length > 0) {
  console.log('ℹ️  INFO: Larger media files detected (under 25MB):');
  warnedFiles.forEach(f => console.log(`   • ${f.path} (${f.sizeMB} MB)`));
}

// 2. FILENAME CHECK
console.log('\n--- [Check 2: Filename & Path Integrity] ---');
if (problematicNames.length > 0) {
  console.error('❌ FAIL: The following filenames contain illegal special characters:');
  problematicNames.forEach(p => console.error(`   - ${p}`));
} else {
  console.log('✅ PASS: All filenames contain valid cross-platform characters.');
}

// 3. GITIGNORE COMPLIANCE CHECK
console.log('\n--- [Check 3: .gitignore Protection] ---');
const gitignorePath = path.join(rootDir, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  const criticalPatterns = ['.aistudio', 'node_modules', 'dist', '*.zip', '.env*'];
  let missing = [];
  criticalPatterns.forEach(pattern => {
    if (!gitignoreContent.includes(pattern)) {
      missing.push(pattern);
    }
  });

  if (missing.length > 0) {
    console.warn(`⚠️  WARNING: Missing recommended patterns in .gitignore: ${missing.join(', ')}`);
  } else {
    console.log('✅ PASS: .gitignore correctly protects node_modules, build caches, internal .aistudio, and zip archives.');
  }
} else {
  console.error('❌ FAIL: No .gitignore file found in workspace root.');
}

// 4. COMMON "INVALID ARGUMENT" USER INPUT VALIDATION
console.log('\n--- [Check 4: GitHub Export UI Argument Rules] ---');
console.log('When submitting to GitHub via the AI Studio modal, enforce the following:');
console.log('1. Repository Name:');
console.log('   - ❌ WRONG: "Omni Keyboard AI" (contains spaces -> triggers "Invalid argument")');
console.log('   - ❌ WRONG: "https://github.com/user/omni-keyboard" (contains URL scheme -> triggers "Invalid argument")');
console.log('   - ❌ WRONG: "user/repo" (owner prefix in single-name field -> triggers "Invalid argument")');
console.log('   - ✅ CORRECT: "omni-keyboard-ai" or "omni-companion-studio" (letters, numbers, hyphens only)');
console.log('2. Target Branch:');
console.log('   - ✅ Use "main" (lowercase, no slashes or spaces)');
console.log('3. Commit Message:');
console.log('   - ✅ Keep concise and plain text without unescaped quotes or backslashes');

console.log('\n============================================================');
if (oversizedFiles.length === 0 && problematicNames.length === 0) {
  console.log('🎉 STATUS: READY FOR GITHUB PUSH (All workspace checks passed)');
} else {
  console.log('⚠️  STATUS: ACTION REQUIRED (Resolve flagged items above before pushing)');
}
console.log('============================================================\n');
