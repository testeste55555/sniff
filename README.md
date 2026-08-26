# Sniff

Mobile-first, unofficial fan-made conversation experience set at a layered riverside camp.

## Approved asset sources

- `assets/characters/`: five Human Gate-approved character poses
- `assets/fire/`: flame, glow, shadow, embers, and smoke layers
- `assets/scene/`: riverside background, camp ground, props, foreground, and character shadow

The static scene is assembled in `index.html` and `scene-static.css`. The same background is reused for day, dusk, and night through a CSS tone layer. Conversation text remains in the current tab and is not sent to an external AI service.

Legacy prototype artwork is not a canonical source for the scene.

Legacy WebLLM and superseded dialogue prototypes have been removed from the published working tree. The active implementation is `dialogue.js` plus the static scene files above.
