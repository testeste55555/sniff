# Privacy design

This project is a public, unofficial fan-made experiment.

## Core rules

- No API keys or private credentials are required by the app.
- No conversation text is committed to this repository.
- No analytics or tracking scripts are included.
- Choice labels and authored dialogue ship as static application content.
- Optional free input is processed in the current tab and its text is not persisted to localStorage.
- Only the allowlisted `sniff_state_v1` fields are stored: a device seed, visit and relationship state, recent event/memory IDs, and the active run's IDs and flags.
- Raw conversation history and free-input text are not persisted.
- Users can clear the local state from the UI.

## Network activity

The app is hosted on GitHub Pages. It does not load external AI runtimes, analytics, tracking scripts, or third-party conversation services. Optional user text is not transmitted by the app.

## Repository hygiene

`.gitignore` blocks common secret, credential, log, local conversation, and editor files. This is not a substitute for secret management: a secret must never be committed in the first place.

If a secret is ever committed accidentally, removing the file later is not sufficient. The credential must be revoked/rotated and Git history must be treated as exposed.
