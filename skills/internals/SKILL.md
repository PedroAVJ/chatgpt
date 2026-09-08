---
name: internals
description: Read the internals of the merged macOS ChatGPT desktop app without modifying it — extract and search the shared ChatGPT and Codex Electron bundle for feature flags, unreleased or gated behavior, config keys, IPC surfaces, and version details. Use to find out what the installed desktop host can actually do before assuming a capability does or does not exist.
---

# ChatGPT Desktop Internals

Read-only forensics on the installed ChatGPT desktop app, which now hosts both
the ChatGPT and Codex product surfaces. Extract, search, report — never write
back. Patching is a separate skill (`patching`) with its own integrity and
signing requirements, and it is deliberately not reachable from here.

This is the cheap way to answer "does the app already do this?" — much better
than guessing from release notes, and much better than patching to find out.

## Resolve The Bundle First

**Never hardcode the app name.** OpenAI merged the former Codex desktop app into
`ChatGPT.app` while keeping the bundle identifier `com.openai.codex`. Resolve
the shared host by identifier every time:

```bash
APP=$(mdfind "kMDItemCFBundleIdentifier == 'com.openai.codex'" | head -1)
[ -n "$APP" ] || { echo "ChatGPT desktop app not installed"; exit 1; }
echo "$APP"
```

Every path below is written relative to `$APP`. If `mdfind` returns nothing,
Spotlight may be indexing — fall back to checking `/Applications/ChatGPT.app`
and the historical `/Applications/Codex.app` directly before reporting the
shared app as absent.

## Why Read Instead of Guess

The merged desktop host ships ChatGPT and Codex behavior before it ships every
corresponding UI. Feature flags, gated panes, and config keys land in the
bundle first, sometimes weeks ahead of any announcement. Reading the bundle
tells you what the installed version can do today, including whether a named
ChatGPT feature such as Pro mode or a Codex surface is present and gated.

It also settles capability questions honestly. If a flag exists but is off,
say that. If it does not exist in this version, say that too, with the
version you inspected.

## Version First

Every finding is version-scoped. Record it before anything else, and quote it
in the answer — bundle names and minified identifiers change every release.

```bash
defaults read "$APP/Contents/Info.plist" CFBundleShortVersionString
defaults read "$APP/Contents/Info.plist" CFBundleVersion
```

Report the display name you found alongside the version — `ChatGPT 26.803.41515`
is a more honest citation than a version number with no bundle attached.

## Extract

Extraction copies out; it does not touch the bundle.

```bash
rm -rf /tmp/chatgpt-read && mkdir -p /tmp/chatgpt-read
npx -y asar extract "$APP/Contents/Resources/app.asar" /tmp/chatgpt-read/app
```

The layers worth knowing:

| Path | Holds |
| --- | --- |
| `$APP/Contents/Resources/app.asar` | packed JavaScript |
| `$APP/Contents/Resources/app.asar.unpacked` | native modules and files that must stay on disk |
| `$APP/Contents/Info.plist` | version, ASAR integrity hashes |
| `~/.codex/config.toml` | local config, including `[features]` |
| `~/.codex/` | local persisted state |

Inside the extracted shared ASAR, the interesting code concentrates in
`.vite/build/main-*.js` (main process), `webview/assets/index-*.js`
(renderer), and `webview/assets/app-server-manager-signals-*.js`.

## Search

Feature flags and gated behavior:

```bash
rg -n "featureFlag|isEnabled|experiment|gate|rollout" /tmp/chatgpt-read/app --no-heading | head -50
rg -no '"[a-z][a-z0-9_]{3,}(_enabled|_flag)"' /tmp/chatgpt-read/app | sort -u | head -40
```

Config keys the app reads — cross-reference against what is actually set:

```bash
rg -n "config\.(get|read)|\[features\]|features\." /tmp/chatgpt-read/app | head -40
grep -n -A20 "^\[features\]" ~/.codex/config.toml
```

A named capability:

```bash
rg -n "pro.?mode|browser|chronicle|computer.?use|codex|plugin|marketplace" /tmp/chatgpt-read/app -l
```

Minification makes function names useless, so anchor searches on **string
literals** — user-visible copy, config keys, event names, URLs. Those survive
minification; identifiers do not.

## Reporting

State the ChatGPT app version, which product surface was investigated, the
paths searched, and the literal evidence — a matched string with its file, not
a paraphrase. Distinguish:

- **present and on** — the flag exists and evaluates true in this install
- **present and gated** — the code path exists but is off, and say what gates it
- **absent in this version** — searched and not found, with the search terms used

Never infer that a feature is missing from a single failed grep. Minified
bundles split and rename aggressively; a negative result is weak evidence.
Say "not found with these anchors" rather than "does not exist".

## Boundary

If a question can only be answered by changing the app, stop and say so. Do
not patch under cover of an investigation — hand off to `patching`, which
requires backups, ASAR header hash repair, and re-signing, and which the user
should opt into explicitly because it breaks official updates.
