import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const expected = {
  "name": "chatgpt",
  "version": "0.2.5",
  "url": "https://github.com/PedroAVJ/chatgpt",
  "dependencies": []
};

async function json(...parts) {
  return JSON.parse(await readFile(join(root, ...parts), "utf8"));
}

test("standalone plugin metadata is synchronized", async () => {
  const codex = await json(".codex-plugin", "plugin.json");
  assert.equal(codex.name, expected.name);
  assert.equal(codex.version, expected.version);
  assert.equal(codex.homepage, expected.url);
  assert.equal(codex.repository, expected.url);
  await access(join(root, "README.md"));
  await access(join(root, "AGENTS.md"));

  if (expected.codexOnly) {
    await assert.rejects(access(join(root, ".claude-plugin", "plugin.json")));
  } else {
    const claude = await json(".claude-plugin", "plugin.json");
    assert.equal(claude.name, codex.name);
    assert.equal(claude.version, codex.version);
    assert.equal(claude.homepage, expected.url);
    assert.equal(claude.repository, expected.url);
    for (const dependency of expected.dependencies) {
      assert.ok((claude.dependencies ?? []).includes(dependency));
    }
  }

  const pkg = await json("package.json");
  assert.equal(pkg.version, expected.version);
  assert.equal(pkg.homepage, expected.url + "#readme");
  assert.equal(pkg.repository.url, "git+" + expected.url + ".git");
});

test("oracle fails closed around the visible Pro mode", async () => {
  const oracle = await readFile(join(root, "skills", "oracle", "SKILL.md"), "utf8");
  assert.match(oracle, /label includes `Pro`/);
  assert.match(oracle, /Never substitute Standard, Thinking, Instant/);
  assert.match(oracle, /visible UI label verifies the selected/);
  assert.match(oracle, /agent\.browsers\.get\("iab"\)/);
  assert.match(oracle, /must not try to control itself/);
  assert.match(oracle, /Do not fall back to Chrome, Edge/);
});

test("oracle preserves active or unverified Pro generation indefinitely", async () => {
  const oracle = await readFile(join(root, "skills", "oracle", "SKILL.md"), "utf8");
  const finishContract = oracle.match(
    /### Let Pro finish(?<contract>[\s\S]*?)(?=\n1\. Reuse an authenticated)/
  )?.groups?.contract;

  assert.ok(finishContract, "the Pro completion contract must be present");
  assert.match(finishContract, /may take arbitrarily long/);
  assert.match(finishContract, /There is no agent-side timeout/);
  assert.match(finishContract, /Elapsed time is never evidence/);
  assert.match(finishContract, /polling the same tab indefinitely/);
  assert.match(finishContract, /status update at least once per minute/);
  assert.match(finishContract, /tab\.markHandoff\(\)/);
  assert.match(finishContract, /turn-scoped/);

  for (const control of [
    "Answer now",
    "Stop answering",
    "Regenerate",
    "Retry"
  ]) {
    assert.match(finishContract, new RegExp(`Never click[^\\n]+${control}`));
  }

  for (const destructiveTabAction of [
    "navigate",
    "reload",
    "close",
    "replace",
    "abandon"
  ]) {
    assert.match(
      finishContract,
      new RegExp(`Never[^\\n]+${destructiveTabAction}`)
    );
  }

  assert.match(finishContract, /Only an explicit terminal error/);
  assert.match(finishContract, /preserve that exact live tab/);
});
