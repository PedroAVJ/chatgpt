# ChatGPT App

The macOS ChatGPT desktop host: Pro Oracle reviews, automations, bundle
forensics, and the guarded patch or restore workflow.

ChatGPT and Codex now ship inside one application bundle. This plugin owns the
physical desktop host and the behavior shared at that boundary. The separate
`codex` plugin owns the coding agent, CLI, app-server, review hooks, and Claude
handoff machinery.

## Skills

| Skill | Does |
| --- | --- |
| `oracle` | Sends a grounded question to a visibly verified ChatGPT Pro mode and fails closed instead of silently using another model. |
| `automations` | Explains the authoritative SQLite automation store, the generated TOML export, and the refresh boundary. |
| `internals` | Extracts and searches the merged app bundle read-only for ChatGPT, Pro mode, Codex, feature gates, config, and IPC surfaces. |
| `patching` | Modifies or restores the shared bundle only after explicit opt-in, with integrity repair and re-signing. |

The shared bundle still uses `com.openai.codex`, stores runtime state under
`~/.codex`, and may expose `Codex Safe Storage` in Keychain. Those historical
technical names do not make the bundle-level workflows part of the Codex
product plugin.

## Install

```bash
claude plugin install chatgpt@package-manager
```

```bash
codex plugin add chatgpt@package-manager
```

## Public source

First-party code is MIT licensed. Product names are used for identification;
this project is unofficial and does not imply endorsement. Plugin artwork is
original; see `ICON-SOURCES.md`. Configure credentials in your own client and
OS credential stores, never in tracked source.
