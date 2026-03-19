# webext-bridge Usage and Caveats

## What it is used for in this plugin

This plugin uses `webext-bridge` as a typed request/response layer between extension contexts. In this codebase, it connects the popup, the background service worker, and the content script so the UI can read page data, authenticate against the backend, and start page-saving tasks without coupling those layers directly.

This repository uses `webext-bridge` only for local extension messaging. It does not use it as a general event bus, a streaming channel, a window messaging layer, or a custom namespace system.

## Context-specific imports

Use the import path that matches the runtime context:

- Popup code must import from `webext-bridge/popup`.
- Background code must import from `webext-bridge/background`.
- Content script code must import from `webext-bridge/content-script`.

Use `sendMessage` on the caller side and `onMessage` on the receiver side. Do not mix these context-specific entry points.

## Typed message contract

Message types are declared in `shim.d.ts` through `ProtocolMap` and `ProtocolWithReturn`. That file is the source of truth for message names, payload shapes, and return values.

When adding or changing a message:

- Update the `ProtocolMap` entry.
- Update the matching `onMessage` handler implementation.
- Update every `sendMessage` call site that depends on that message shape.

Do not add a type declaration without a matching runtime handler. Do not change a handler without keeping the type contract in sync.

## Message flow used in this codebase

Keep the bridge usage narrow and explicit:

- Popup to background for auth, settings, folder and tag data, task history, and save-task creation.
- Popup to content script for `get-basic-page-data`.
- Background to content script for `scrape-page-data`.

Two rules matter here:

- Always target content-script messages with an explicit endpoint such as `content-script@${tabId}`.
- Check `tab.id` before sending a message to a tab, and keep the scrape flow in order: prepare the background runtime, inject the page scripts, then call the content script through `webext-bridge`.

## Required implementation rules

Follow these rules when working in this plugin:

- Use the correct import path for the current context.
- Always specify the content-script endpoint when targeting a tab.
- Check `tab.id` before sending a message to a tab.
- Keep `ProtocolMap` and runtime handlers synchronized.
- Keep message payloads small and explicit.
- Treat `sendMessage` as a request/response call, not as a long-lived task channel.
- Remember that the background runs as an MV3 service worker and can restart.
- Preserve the existing keep-alive behavior for long-running save operations.
- Preserve the task-state fallback that marks unfinished tasks as failed after a service worker restart.
- Keep content-script messaging behind the existing availability checks when applicable.

## Common pitfalls

Avoid these mistakes:

- Importing from the wrong `webext-bridge` entry point for the current context.
- Sending a content-script message without an endpoint such as `content-script@${tabId}`.
- Assuming `tab.id` is always available.
- Assuming every page can accept injected content scripts, even though the content script matches `<all_urls>`.
- Updating `ProtocolMap` without updating the matching `onMessage` or `sendMessage` logic.
- Treating `webext-bridge` as the place for business error handling.
- Assuming a message call survives a service worker restart.
- Expecting features not used in this repository, such as streaming, custom namespace routing, or window messaging.

# playwright-cli Verification Rules

## What it is used for in this plugin

Use `playwright-cli` in this package for local plugin verification and debugging. In this repository, that means starting a browser with the built extension loaded, navigating through the local app, and validating popup, settings, auth, and page-save flows against the local service.

This is a local verification workflow. It is not the repository's main automated test runner, and it should not be documented or treated as `pnpm test`.

## Local development endpoints

Use these local addresses during plugin verification:

- Frontend app URL: `http://localhost:7749`
- Backend service URL: `http://localhost:9981`
- The frontend proxies `/api` requests to `http://localhost:9981`

For local plugin testing, prefer `http://localhost:7749` as the plugin `serverUrl`.

That rule matters because this plugin uses the saved `serverUrl` for both behaviors:

- It opens app pages such as `serverUrl` and `serverUrl/#/showcase/folder`.
- It sends API requests to `${serverUrl}/api/...`.

Do not point local plugin verification at `http://localhost:9981` unless you are intentionally testing a backend-only case and do not need the app routes.

## Required startup flow

Use the repository-managed flow in this order:

1. Start the local backend with `pnpm dev:server`.
2. Start the local frontend with `pnpm dev:web`.
3. Build the extension with `pnpm --filter plugin build`.
4. On first use, install the repository-managed browser with `pnpm --filter plugin run pw:plugin:install-browser`.
5. Start the verification browser with `pnpm --filter plugin run pw:plugin`.

Do not skip the build step. The Playwright browser config loads the built extension from `dist/extension`, so the extension must exist before the browser is started.

## Browser initialization and interaction rules

Follow this workflow when verifying the plugin:

- Start the browser through `pnpm --filter plugin run pw:plugin`, not through a hand-built `playwright-cli open` command.
- Open the target local page after the browser session is ready.
- Take a `snapshot` before interacting with the page.
- Use the snapshot references before calling `click`, `fill`, `press`, or other interaction commands.
- After each important action, take another `snapshot` and verify the new UI state, URL, or page title.
- Use `console`, `network`, or `screenshot` only when the snapshot is not enough to explain a failure.
- Close the session with `close` when finished.

Do not blindly click elements without checking the current snapshot first.

## Config ownership

Treat the repository files below as the source of truth for this workflow:

- `playwright-plugin.json` is the single source of truth for `playwright-cli` browser settings in this package.
- `scripts/open-playwright-plugin.ts` is the required entrypoint for launching the verification browser.
- `scripts/install-playwright-plugin-browser.ts` installs the repository-managed Chrome for Testing used by this workflow.

Do not document or encourage an alternate launch flow that manually recreates these settings on the command line.

If you need to inspect supported forwarded arguments, use:

- `pnpm --filter plugin run pw:plugin -- --help`

## Local auth rule

For local testing, prefer trying `12345678` first.

That value is a recommended local test password, not a built-in system default.

In a fresh local database, the first accepted bearer token becomes the admin token. That means `12345678` can be used as the initial local admin password during local setup and verification.

## Cleanup and safety rules

Follow these rules after verification:

- Use `close` for normal cleanup.
- If sessions are left behind, use `close-all` or `kill-all`.
- Do not commit profile directories, storage state files, or captured credentials.
- Do not hardcode real secrets into commands, persistent profiles, or saved test artifacts.
