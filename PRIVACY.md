# Privacy design

This project is a public, unofficial fan-made experiment.

## Core rules

- No API keys or private credentials are required by the app.
- No conversation text is committed to this repository.
- No analytics or tracking scripts are included.
- Conversation text is intended to stay in the current browser tab and be processed locally when Local AI mode is active.
- Raw conversation history is not persisted to localStorage.
- Only minimal non-sensitive state such as visit count may be stored locally on the device to support the sense of distance/continuity.
- Users can clear the local state from the UI.

## Network activity

The app is hosted on GitHub Pages. Local AI is not loaded until the user explicitly presses the load button.

When Local AI is loaded, the browser downloads the WebLLM runtime and model files from third-party distribution/model hosts. Those hosts can receive ordinary network metadata such as IP address, user agent, request time, and requested file names. Conversation text is not intentionally sent to those services; inference runs in the browser.

## Repository hygiene

`.gitignore` blocks common secret, credential, log, local conversation, and editor files. This is not a substitute for secret management: a secret must never be committed in the first place.

If a secret is ever committed accidentally, removing the file later is not sufficient. The credential must be revoked/rotated and Git history must be treated as exposed.
