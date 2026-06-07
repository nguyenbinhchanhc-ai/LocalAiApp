const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh');

if (!fs.existsSync(targetFile)) {
  console.log(`[Patch] File not found: ${targetFile}. Skipping patch.`);
  process.exit(0);
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
