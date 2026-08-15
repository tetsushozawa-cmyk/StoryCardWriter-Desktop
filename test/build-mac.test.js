const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { outputSettings } = require('../scripts/build-mac.js');

test('Apple Silicon版の出力先とFinder表示名を設定する', () => {
  assert.deepEqual(outputSettings('arm64'), {
    builderDirectory: 'mac-arm64',
    outputDirectory: 'mac-arm64',
    appName: 'StoryCardWriter Desktop - Apple Silicon.app',
  });
});

test('Intel版の出力先とFinder表示名を設定する', () => {
  assert.deepEqual(outputSettings('x64'), {
    builderDirectory: 'mac',
    outputDirectory: 'mac-x64',
    appName: 'StoryCardWriter Desktop - Intel.app',
  });
});

test('Macビルドにプロジェクト管理のSCWアイコンを設定する', () => {
  const projectDirectory = path.resolve(__dirname, '..');
  const packageJson = require('../package.json');
  const iconPath = path.join(projectDirectory, packageJson.build.mac.icon);

  assert.equal(packageJson.build.mac.icon, 'build/SCWicon.icns');
  assert.equal(fs.readFileSync(iconPath).subarray(0, 4).toString('ascii'), 'icns');
});
