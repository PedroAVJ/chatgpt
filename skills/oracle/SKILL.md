---
name: oracle
description: Ask ChatGPT Pro for a focused independent second opinion through ChatGPT's authenticated in-app browser. Use when the user says ask ChatGPT Pro, ask the GPT-5 Pro Oracle, use both Oracles, or wants the strongest ChatGPT Pro-mode review. Verify the visible Pro selection and fail closed rather than silently using another mode or browser.
---

# ChatGPT Pro Oracle

Ask ChatGPT Pro through ChatGPT's authenticated in-app browser. Keep this lane
independent from Codex's answer and from any Claude Oracle response.

## Ground the question

Gather the decision-critical facts locally before opening ChatGPT. Distinguish
verified observations, implementation details, constraints, and current
inferences. Do not send credentials, private messages, medical or financial
details, precise location, or other sensitive data unless the user explicitly
authorizes that specific transmission to ChatGPT.

Use one concise prompt:

```text
I need a blunt independent opinion from a senior <domain> expert.

Verified context:
- <fact>
- <observed result>
- <current implementation>

Constraints:
- <constraint that changes the decision>

Questions:
1. <core decision>
2. <likely failure mode>
3. <smallest worthwhile next test>

Separate verified behavior from inference. Flag APIs or current product facts
that need documentation checks. Prefer a concrete recommendation over generic
advice.
```

## Use the web Pro lane

Use the installed Browser skill through `node_repl` and its bundled
`browser-client`. The desktop host must not try to control itself through
Computer Use; that surface is intentionally blocked. Select the in-app browser
explicitly with `agent.browsers.get("iab")` and read its complete documentation
before interacting. If `iab` is unavailable, stop and report that ChatGPT Pro
Oracle was not consulted. Do not fall back to Chrome, Edge, another external
browser, Computer Use, an API model, or web search.

### Let Pro finish

Pro is an intentionally slow, last-resort Oracle and may take arbitrarily long.
There is no agent-side timeout. Treat generation as active whenever the page
shows `Stop answering`, a thinking, searching, or streaming state, or completion
cannot yet be verified from fresh page state. Elapsed time is never evidence
that the response is stuck, failed, or complete.

While generation is active or completion is unverified:

- Keep polling the same tab indefinitely with bounded waits of no more than 60
  seconds, and give the user a status update at least once per minute.
- Call `tab.markHandoff()` while waiting and before any turn can end. The mark is
  turn-scoped, so re-mark that same tab during every later turn until the answer
  is complete.
- Never click `Answer now`, `Stop answering`, `Regenerate`, or `Retry`, and do
  not send a follow-up intended to hurry the response.
- Never navigate, reload, close, replace, or abandon the tab. Do not start a
  substitute conversation to avoid waiting.

Only an explicit terminal error displayed by ChatGPT after generation has ended
may be reported as a Pro failure. Slow or unchanged page state, a transient
browser-observation error, or an automation-tool error is not a terminal Pro
error; reconnect to the exact tab and continue polling. If authentication,
recovery, or user handoff is pending, preserve that exact live tab without
disturbing it.

1. Reuse an authenticated ChatGPT tab in `iab` when appropriate or open
   `https://chatgpt.com/`. If authentication is required, ask the user to sign
   in inside the in-app browser; do not switch browser surfaces.
2. Open a fresh ChatGPT conversation so prior messages cannot influence the
   opinion.
3. Inspect the model or mode picker. Select the exact visible option whose
   label includes `Pro`. Read the state again and record the selected label.
4. If no Pro option is visible, selection fails, or the selection cannot be
   verified before sending, stop. Report that ChatGPT Pro Oracle was not
   consulted. Never substitute Standard, Thinking, Instant, another model, a
   browser session, or an API model.
5. Enter the grounded prompt and send it. The user's explicit Oracle request
   authorizes this ordinary nonsensitive prompt transmission.
6. Poll fresh state in that same tab until completion is positively verified,
   following the indefinite-wait contract above.
7. Read back the response and the still-visible Pro selection. If the mode is
   no longer verifiable, label the answer as unverified rather than calling it
   a Pro answer.

Do not upload repository archives or personal files unless the user explicitly
asks. Send the smallest text dossier that can answer the question.

## Return the opinion

Return:

1. **Verdict** — the host agent's conclusion after checking the response
   against local evidence.
2. **ChatGPT Pro's analysis** — only reasoning that changes the decision.
3. **Evidence check** — verified, challenged, and unverified claims.
4. **Next verification** — the smallest local test that settles what remains.

Name the exact visible Pro label. A visible UI label verifies the selected
product mode, not an undisclosed backend model identifier.
