const fs = require('fs');
const path = require('path');

let targetFile;
let packageJsonPath;
try {
  packageJsonPath = require.resolve('expo-modules-jsi/package.json');
  targetFile = path.join(path.dirname(packageJsonPath), 'apple/scripts/build-xcframework.sh');
  console.log(`[Patch] Found expo-modules-jsi build script at: ${targetFile}`);
} catch (e) {
  console.error('[Patch] Error: expo-modules-jsi not found via require.resolve:', e.message);
  process.exit(1);
}

if (!fs.existsSync(targetFile)) {
  console.error(`[Patch] Error: File not found: ${targetFile}`);
  process.exit(1);
}

// 1. Patch build-xcframework.sh
let content = fs.readFileSync(targetFile, 'utf8');
let modified = false;

// Remove -quiet if present
if (content.includes('    -quiet \\\n')) {
  content = content.replace('    -quiet \\\n', '');
  modified = true;
}

// Add SYMROOT, OBJROOT, and CODE_SIGNING options to xcodebuild if not already present
if (content.includes('    -parallelizeTargets \\') && !content.includes('CODE_SIGNING_ALLOWED=NO')) {
  const targetText = '    -parallelizeTargets \\';
  const replacementText = '    -parallelizeTargets \\\n    SYMROOT="${BUILD_PRODUCTS_PATH}" \\\n    OBJROOT="${DERIVED_DATA_PATH}/Build/Intermediates.noindex" \\\n    CODE_SIGNING_ALLOWED=NO \\\n    CODE_SIGNING_REQUIRED=NO \\';
  content = content.replace(targetText, replacementText);
  modified = true;
}

if (modified) {
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[Patch] Successfully patched build-xcframework.sh for Xcode 16/26 compatibility, code signing bypass, and verbose logs.');
} else {
  console.log('[Patch] build-xcframework.sh is already patched or no changes needed.');
}

// 2. Patch Package.swift to downgrade swift-tools-version if it is set to 6.2 (workaround for runner Swift 6.1.0 limit)
const packageSwiftPath = path.join(path.dirname(packageJsonPath), 'apple/Package.swift');
if (fs.existsSync(packageSwiftPath)) {
  let swiftContent = fs.readFileSync(packageSwiftPath, 'utf8');
  if (swiftContent.includes('// swift-tools-version: 6.2')) {
    swiftContent = swiftContent.replace('// swift-tools-version: 6.2', '// swift-tools-version: 6.0');
    fs.writeFileSync(packageSwiftPath, swiftContent, 'utf8');
    console.log('[Patch] Successfully patched Package.swift to use swift-tools-version: 6.0 (downgraded from 6.2 to support Xcode 16.1/Swift 6.1.0 on CI runner).');
  } else {
    console.log('[Patch] Package.swift does not require toolchain version downgrade.');
  }
} else {
  console.warn('[Patch] Package.swift not found in apple/ directory.');
}
