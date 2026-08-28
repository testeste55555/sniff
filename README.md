# Sniff

Mobile-first, unofficial fan-made narrative roguelite set at a layered riverside camp. One local calendar day is one short run.

## RUN ENGINE v1

- A deterministic daily world is generated from the local date and a device seed.
- Returning on the same day resumes the saved node; an ended run stays ended until the next day.
- Six standard beats lead from arrival to a natural departure in at most eight major choices.
- Ten small incidents, four fictional weather states, five character poses, and the campfire state are connected to run nodes.
- Relationship changes are limited to `-1 / 0 / +1` per completed run and are never shown as scores.
- Free input is an optional one-time helper in the quiet beat, not a general chatbot.

Implementation:

- `run-content.js`: nodes, incidents, choices, dialogue, short-topic responses
- `run-storage.js`: allowlisted `sniff_state_v1` persistence and clearing
- `run-engine.js`: daily generation, transitions, relationship and memory rules
- `run-ui.js`: choice UI, optional short input, ending and local-state controls
- `scene-static.js`: real-time time band, fictional weather, animated fire
- `character-motion.js`: explicit `setPose()` scene API

## Approved asset sources

- `assets/characters/`: five Human Gate-approved character poses
- `assets/fire/`: flame, glow, shadow, embers, and smoke layers
- `assets/scene/`: riverside background, camp ground, props, foreground, and character shadow

The scene is assembled in `index.html` and `scene-static.css`. The same background is reused across time and weather through lightweight CSS layers.

Legacy prototype artwork is not a canonical source for the scene.

Legacy WebLLM and superseded dialogue prototypes have been removed from the published working tree. The app has no external AI, analytics, tracking, login, or cloud sync.

## Validation

Run `npm test` to execute the RUN ENGINE structure, daily persistence, relationship, Scene, and privacy RED TEAM checks.
