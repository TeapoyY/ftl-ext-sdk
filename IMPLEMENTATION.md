# Implementation for: ₣1,000 Token Reward - Tampermonkey / Greasemonkey Userscript Support

## Issue
https://github.com/BarryThePirate/ftl-ext-sdk/issues/1

## Solution
# Bounty: Tampermonkey / Greasemonkey Userscript Support

## Reward - ₣1,000 site tokens

Create a pull request that meets the criteria and leave a comment with your fishtank.live username.

## Goal

Produce a self-contained bundle that userscripts can load via `@require`, exposing the full SDK as `window.FTL`.

## What Needs to Be Done

1. **Bundle socket dependencies** — `socket.io-client` and `socket.io-msgpack-parser` must be included in the UMD bundle so userscripts don't need separate `@re
