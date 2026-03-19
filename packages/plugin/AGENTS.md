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
