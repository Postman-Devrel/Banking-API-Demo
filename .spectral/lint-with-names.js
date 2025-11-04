#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all collection files
const collectionFiles = glob.sync('postman/collections/*.postman_collection.json');

if (collectionFiles.length === 0) {
  console.log('\n⚠️  No collection files found in postman/collections/\n');
  process.exit(0);
}

// Workaround: Spectral has issues with files in postman/ directory
// Copy files to temp location, lint them, then map results back
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const fileMapping = {};
const tmpFiles = [];

collectionFiles.forEach((originalPath, index) => {
  const tmpPath = path.join(tmpDir, `collection-${index}.json`);
  fs.copyFileSync(originalPath, tmpPath);
  fileMapping[path.resolve(tmpPath)] = originalPath;
  tmpFiles.push(tmpPath);
});

// Quote each filename to handle spaces and special characters
const quotedFiles = tmpFiles.map(f => `"${f}"`).join(' ');

// Run Spectral and capture output
let spectralOutput;
let exitCode = 0;

// Check if we're in a TTY (terminal) for color support
const isInteractive = process.stdout.isTTY;
const env = isInteractive ? { ...process.env, FORCE_COLOR: '1' } : { ...process.env, NO_COLOR: '1' };

try {
  spectralOutput = execSync(
    `npx spectral lint ${quotedFiles} --format json`,
    { 
      encoding: 'utf-8',
      env,
      shell: '/bin/bash'
    }
  );
} catch (error) {
  // Spectral returns exit code 1 when it finds errors, but still outputs JSON
  if (error.stdout) {
    spectralOutput = error.stdout;
    exitCode = error.status || 1;
  } else {
    console.error('Error running Spectral:', error.message);
    if (error.stderr) {
      console.error(error.stderr);
    }
    process.exit(1);
  }
} finally {
  // Cleanup temp files
  tmpFiles.forEach(f => {
    try {
      fs.unlinkSync(f);
    } catch (e) {
      // Ignore cleanup errors
    }
  });
}

// Parse Spectral results
let results;
try {
  // Spectral sometimes appends status messages to JSON output
  // Extract only the JSON array part
  const jsonMatch = spectralOutput.match(/^\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : spectralOutput;
  results = JSON.parse(jsonStr);
} catch (parseError) {
  console.error('Error parsing Spectral output:', parseError.message);
  console.error('Output was:', spectralOutput);
  process.exit(1);
}

// Map temp file paths back to original paths and group results
const resultsByFile = {};
results.forEach(issue => {
  let source = issue.source || 'unknown';
  // Map temp file back to original path
  if (fileMapping[source]) {
    issue.source = fileMapping[source];
    source = fileMapping[source];
  }
  if (!resultsByFile[source]) {
    resultsByFile[source] = [];
  }
  resultsByFile[source].push(issue);
});

// If no results, show success message
if (results.length === 0) {
  console.log('\n✨ No issues found in any collections!\n');
  process.exit(0);
}

// Helper to get request name from path
function getRequestName(pathArray, collection) {
  let current = collection;
  let name = 'Unknown';
  
  try {
    // Navigate through the path to find the item
    for (let i = 0; i < pathArray.length; i++) {
      const segment = pathArray[i];
      
      // Skip non-navigable segments
      if (segment === 'request' || segment === 'response' || segment === 'event' || segment === 'auth') {
        continue;
      }
      
      // Navigate to next level
      if (current && typeof current === 'object') {
        current = current[segment];
      }
    }
    
    // Try to find the name in current or parent
    if (current && current.name) {
      name = current.name;
    } else if (pathArray.length >= 2) {
      // Try parent
      let parent = collection;
      for (let i = 0; i < pathArray.length - 2; i++) {
        const segment = pathArray[i];
        if (segment !== 'request' && segment !== 'response' && segment !== 'event' && parent) {
          parent = parent[segment];
        }
      }
      if (parent && parent.name) {
        name = parent.name;
      }
    }
  } catch (e) {
    // Keep default 'Unknown'
  }
  
  return name;
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function colorize(text, color) {
  if (!isInteractive) return text;
  return `${colors[color]}${text}${colors.reset}`;
}

// Process results for each collection file
let totalErrorCount = 0;
let totalWarningCount = 0;
let totalInfoCount = 0;

Object.keys(resultsByFile).forEach(collectionPath => {
  const issues = resultsByFile[collectionPath];
  
  // Load the collection to get request names
  let collection;
  try {
    collection = JSON.parse(fs.readFileSync(collectionPath, 'utf-8'));
  } catch (error) {
    console.warn(`Warning: Could not load collection for name mapping: ${error.message}`);
    collection = null;
  }
  
  // Display results for this collection
  console.log(`\n${collectionPath}`);
  
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  
  issues.forEach(issue => {
    const severity = issue.severity === 0 ? 'error' : 
                     issue.severity === 1 ? 'warning' : 
                     'information';
    
    if (severity === 'error') errorCount++;
    else if (severity === 'warning') warningCount++;
    else infoCount++;
    
    const requestName = collection ? getRequestName(issue.path, collection) : 'Unknown';
    const location = `${issue.range.start.line + 1}:${issue.range.start.character}`;
    
    // Enhanced message with request name
    let message = issue.message;
    if (requestName !== 'Unknown' && !issue.path.includes('auth')) {
      message = message.replace(
        /Request "#[^"]*"/,
        `Request "${requestName}"`
      ).replace(
        /Request at #[^\s]*/,
        `Request "${requestName}"`
      );
    }
    
    // Color-coded severity
    let severityDisplay = severity;
    if (severity === 'error') {
      severityDisplay = colorize('error', 'red');
    } else if (severity === 'warning') {
      severityDisplay = colorize('warning', 'yellow');
    } else {
      severityDisplay = colorize('information', 'cyan');
    }
    
    // Color-coded location
    const locationDisplay = colorize(location.padEnd(10), 'gray');
    
    console.log(`  ${locationDisplay} ${severityDisplay.padEnd(severity === 'information' ? 23 : 19)} ${colorize(issue.code.padEnd(32), 'dim')} ${message}`);
  });
  
  const total = errorCount + warningCount + infoCount;
  const summary = `✖ ${total} problems (${colorize(errorCount + ' errors', 'red')}, ${colorize(warningCount + ' warnings', 'yellow')}, ${infoCount} infos, 0 hints)`;
  console.log(`\n${summary}\n`);
  
  totalErrorCount += errorCount;
  totalWarningCount += warningCount;
  totalInfoCount += infoCount;
});

// Exit with error code if any errors found
process.exit(totalErrorCount > 0 ? 1 : 0);
