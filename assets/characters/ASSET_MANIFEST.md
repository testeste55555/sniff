# Character assets

These five files are the Human Gate-approved character asset set.

| State | File | Canvas | Shared baseline |
| --- | --- | ---: | ---: |
| idle | `character_idle.webp` | 768×1024 | y=960 |
| thinking | `character_thinking.webp` | 768×1024 | y=960 |
| smile | `character_smile.webp` | 768×1024 | y=960 |
| sit | `character_sit.webp` | 768×1024 | y=960 |
| harmonica | `character_harmonica.webp` | 768×1024 | y=960 |

## Invariants

- Transparent background with alpha channel
- One shared 3DCG character model and scale
- Complete body kept inside the canvas
- Horizontally centered with a shared ground-contact position
- No background, ground, prop, or baked contact shadow
- Public metadata stripped

Older single-character prototypes elsewhere in the repository are not the source of truth for this set.
