# ASAR Patch Workflow

Use this reference when inspecting or patching the merged macOS ChatGPT
desktop app that hosts both ChatGPT and Codex.

## Resolve The Bundle First

The former `Codex.app` became the merged `ChatGPT.app`, but the bundle
identifier `com.openai.codex` did not change. Resolve it before every session
and use `$APP` throughout:

```bash
APP=$(mdfind "kMDItemCFBundleIdentifier == 'com.openai.codex'" | head -1)
[ -n "$APP" ] || { echo "ChatGPT desktop app not installed"; exit 1; }
```

A hardcoded path is a silent failure after the next rename: `cp` into a
nonexistent bundle errors, but a `defaults read` against one just reports the
app as absent and you conclude the wrong thing.

## Mental Model

The shared ChatGPT/Codex host is an Electron app. The practical layers are:

- app bundle: `$APP`
- packed JavaScript: `"$APP"/Contents/Resources/app.asar`
- unpacked companion files:
  `"$APP"/Contents/Resources/app.asar.unpacked`
- metadata and ASAR integrity:
  `"$APP"/Contents/Info.plist`
- local persisted state: `~/.codex`
- macOS Keychain safe-storage item: `Codex Safe Storage`

Inside an extracted ASAR, interesting code is usually in:

- `.vite/build/main-*.js`
- `webview/assets/index-*.js`
- `webview/assets/app-server-manager-signals-*.js`

## Safe Patch Sequence

1. Record the version:

   ```bash
   defaults read "$APP"/Contents/Info.plist CFBundleShortVersionString
   defaults read "$APP"/Contents/Info.plist CFBundleVersion
   ```

2. Back up before touching the bundle:

   ```bash
   mkdir -p /tmp/chatgpt-app-backup
   cp -fp "$APP"/Contents/Resources/app.asar /tmp/chatgpt-app-backup/app.asar.original
   cp -Rp "$APP"/Contents/Resources/app.asar.unpacked /tmp/chatgpt-app-backup/app.asar.unpacked.original
   cp -fp "$APP"/Contents/Info.plist /tmp/chatgpt-app-backup/Info.plist.original
   ```

3. Extract the ASAR:

   ```bash
   rm -rf /tmp/chatgpt-hack
   mkdir -p /tmp/chatgpt-hack
   npx -y asar extract "$APP"/Contents/Resources/app.asar /tmp/chatgpt-hack/app
   ```

4. Locate candidate code with string anchors:

   ```bash
   rg -n "pro.?mode|browser-use|browserPane|Codex Safe Storage|onboarding|feature" /tmp/chatgpt-hack/app
   ```

5. Patch the extracted code narrowly, then repack:

   ```bash
   npx -y asar pack /tmp/chatgpt-hack/app /tmp/chatgpt-hack/app.asar
   ```

6. Compute the ASAR header hash:

   ```bash
   npx -y -p asar node - <<'NODE'
   const { createHash } = require('node:crypto');
   const asar = require('asar/lib/asar.js');
   const raw = asar.getRawHeader('/tmp/chatgpt-hack/app.asar');
   console.log(createHash('sha256').update(raw.headerString).digest('hex'));
   NODE
   ```

7. Install the rebuilt ASAR and update only the integrity hash:

   ```bash
   cp -fp /tmp/chatgpt-hack/app.asar "$APP"/Contents/Resources/app.asar
   /usr/libexec/PlistBuddy -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash NEW_HASH_HERE" \
     "$APP"/Contents/Info.plist
   ```

8. Re-sign and verify:

   ```bash
   codesign --force --deep --sign - "$APP"
   codesign --verify --deep --strict --verbose=2 "$APP"
   codesign -dv --verbose=4 "$APP" 2>&1 | sed -n '1,40p'
   ```

9. Launch and smoke-test only the target behavior first.

## Restore Stock From Backup

Use a backup created for the same app version:

```bash
cp -fp /tmp/chatgpt-app-backup/app.asar.original "$APP"/Contents/Resources/app.asar
rm -rf "$APP"/Contents/Resources/app.asar.unpacked
cp -Rp /tmp/chatgpt-app-backup/app.asar.unpacked.original "$APP"/Contents/Resources/app.asar.unpacked
cp -fp /tmp/chatgpt-app-backup/Info.plist.original "$APP"/Contents/Info.plist
codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"
```

## Historical Browser-Pane Lesson

The old Browser-pane patch showed three useful lessons:

- UI exposure and model tool capability are separate layers.
- Browser comments can still be useful because they attach screenshots as model
  context.
- Electron ASAR integrity and signing must be repaired after bundle edits.

Do not preserve old `app.asar` backup binaries merely for that patch if the
official app has shipped equivalent behavior. Keep the workflow, not the stale
artifact.
