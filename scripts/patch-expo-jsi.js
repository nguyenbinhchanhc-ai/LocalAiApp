const fs = require('fs');
const path = require('path');

let targetFile;
try {
  const packageJsonPath = require.resolve('expo-modules-jsi/package.json');
  targetFile = path.join(path.dirname(packageJsonPath), 'apple/scripts/build-xcframework.sh');
  console.log(`[Patch] Found expo-modules-jsi at: ${targetFile}`);
} catch (e) {
  console.error('[Patch] Error: expo-modules-jsi not found via require.resolve:', e.message);
  process.exit(1);
}

if (!fs.existsSync(targetFile)) {
  console.error(`[Patch] Error: File not found: ${targetFile}`);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// Target content to modify
const targetText = '    -parallelizeTargets \\';
const replacementText = '    -parallelizeTargets \\\n    SYMROOT="${BUILD_PRODUCTS_PATH}" \\\n    OBJROOT="${DERIVED_DATA_PATH}/Build/Intermediates.noindex" \\';

if (content.includes('SYMROOT="${BUILD_PRODUCTS_PATH}"')) {
  console.log('[Patch] build-xcframework.sh is already patched.');
  process.exit(0);
}

if (content.includes(targetText)) {
  content = content.replace(targetText, replacementText);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[Patch] Successfully patched build-xcframework.sh for Xcode 16/26 compatibility.');
} else {
  console.error('[Patch] Error: Could not find target line to patch in build-xcframework.sh.');
  process.exit(1);
}
