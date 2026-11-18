#!/usr/bin/env bash
# Runs once after the Codespace container is created. Failures are non-fatal.

claude plugin marketplace add anthropics/claude-plugins-official \
  && claude plugin install postman@claude-plugins-official \
  || echo "Postman plugin install failed; run: claude plugin install postman@claude-plugins-official"

# Claude Code: if ANTHROPIC_API_KEY is set, pre-approve it and skip onboarding
# so users can open `claude` and start prompting without logging in.
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  node -e '
    const fs = require("fs");
    const p = process.env.HOME + "/.claude.json";
    let c = {};
    try { c = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
    c.hasCompletedOnboarding = true;
    c.customApiKeyResponses = c.customApiKeyResponses || {};
    const approved = new Set(c.customApiKeyResponses.approved || []);
    approved.add(process.env.ANTHROPIC_API_KEY.slice(-20));
    c.customApiKeyResponses.approved = [...approved];
    c.customApiKeyResponses.rejected = c.customApiKeyResponses.rejected || [];
    fs.writeFileSync(p, JSON.stringify(c, null, 2));
  ' && echo "Claude Code configured to use ANTHROPIC_API_KEY" \
    || echo "Claude Code key setup failed; run claude and log in manually"
else
  echo "ANTHROPIC_API_KEY not set; add it as a Codespaces secret, or run: claude and log in"
fi
