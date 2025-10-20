#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Tracks bundle size improvements over time
 */

const fs = require('node:fs');
const path = require('node:path');

const BUNDLE_STATS_FILE = path.join(__dirname, '../.bundle-stats.json');

function extractBundleStats() {
  const buildOutputPath = path.join(__dirname, '../.next/static');

  if (!fs.existsSync(buildOutputPath)) {
    console.error('Build output not found. Run "pnpm build" first.');
    process.exit(1);
  }

  // Get all JS files in the static directory
  const getJSFiles = (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getJSFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push({
          name: item,
          size: stat.size,
          path: fullPath.replace(buildOutputPath, '')
        });
      }
    }

    return files;
  };

  const jsFiles = getJSFiles(buildOutputPath);
  const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);

  const stats = {
    timestamp: new Date().toISOString(),
    totalJSSize: totalSize,
    totalJSSizeKB: Math.round(totalSize / 1024),
    files: jsFiles.length,
    largestFiles: jsFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .map(file => ({
        name: file.name,
        sizeKB: Math.round(file.size / 1024),
        path: file.path
      }))
  };

  return stats;
}

function saveStats(stats) {
  let history = [];

  if (fs.existsSync(BUNDLE_STATS_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(BUNDLE_STATS_FILE, 'utf8'));
    } catch (error) {
      console.warn('Could not read existing stats file:', error.message);
    }
  }

  history.push(stats);

  // Keep only last 20 builds
  if (history.length > 20) {
    history = history.slice(-20);
  }

  fs.writeFileSync(BUNDLE_STATS_FILE, JSON.stringify(history, null, 2));
}

function displayStats(stats, history) {
  console.log('\n📊 Bundle Analysis Results');
  console.log('=' .repeat(50));
  console.log(`📅 Timestamp: ${stats.timestamp}`);
  console.log(`📦 Total JS Size: ${stats.totalJSSizeKB} KB`);
  console.log(`📄 Number of JS files: ${stats.files}`);

  if (history.length > 1) {
    const previous = history[history.length - 2];
    const sizeDiff = stats.totalJSSizeKB - previous.totalJSSizeKB;
    const percentChange = ((sizeDiff / previous.totalJSSizeKB) * 100).toFixed(1);

    const emoji = sizeDiff < 0 ? '📉' : sizeDiff > 0 ? '📈' : '➡️';
    const sign = sizeDiff > 0 ? '+' : '';

    console.log(`${emoji} Change from last build: ${sign}${sizeDiff} KB (${sign}${percentChange}%)`);
  }

  console.log('\n🔝 Largest Files:');
  stats.largestFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name} - ${file.sizeKB} KB`);
  });

  if (history.length > 1) {
    console.log('\n📈 Size History (last 5 builds):');
    history.slice(-5).forEach((build, index) => {
      const date = new Date(build.timestamp).toLocaleDateString();
      const time = new Date(build.timestamp).toLocaleTimeString();
      console.log(`  ${index + 1}. ${date} ${time} - ${build.totalJSSizeKB} KB`);
    });
  }

  console.log('\n💡 Optimization Tips:');
  console.log('  • Use dynamic imports for large components');
  console.log('  • Check for duplicate dependencies');
  console.log('  • Consider code splitting for routes');
  console.log('  • Use tree shaking for unused exports');
}

function main() {
  console.log('🔍 Analyzing bundle size...');

  const stats = extractBundleStats();
  let history = [];

  if (fs.existsSync(BUNDLE_STATS_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(BUNDLE_STATS_FILE, 'utf8'));
    } catch (error) {
      console.warn('Could not read existing stats file:', error.message);
    }
  }

  saveStats(stats);
  displayStats(stats, [...history, stats]);
}

if (require.main === module) {
  main();
}

module.exports = { extractBundleStats, saveStats, displayStats };
