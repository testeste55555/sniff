# Privacy design

This project is a public, unofficial fan-made experiment.

## Core rules

- No API keys or private credentials are required by the app.
- No conversation text is committed to this repository.
- No analytics or tracking scripts are included.
- Conversation text stays in the current browser tab and is processed only by the bundled dialogue code.
- Raw conversation history is not persisted to localStorage.
- Only minimal non-sensitive state such as visit count may be stored locally on the device to support the sense of distance/continuity.
- Users can clear the local state from the UI.

## Network activity

The app is hosted on GitHub Pages. It does not load external AI runtimes, analytics, tracking scripts, or third-party conversation services. User messages are not transmitted by the app.

## Repository hygiene

`.gitignore` blocks common secret, credential, log, local conversation, and editor files. This is not a substitute for secret management: a secret must never be committed in the first place.

If a secret is ever committed accidentally, removing the file later is not sufficient. The credential must be revoked/rotated and Git history must be treated as exposed.
