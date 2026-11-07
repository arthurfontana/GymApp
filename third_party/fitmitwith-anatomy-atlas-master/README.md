# Fit Mit With — anatomy atlas (CC BY-SA 4.0)

Two mobile-budget full-body muscle models (218 selectable muscle regions each) adapted
from the open **Z-Anatomy** atlas, which is itself derived from **BodyParts3D**.
This repository is the public ShareAlike copy of the adapted files used in the
Fit Mit With fitness app. Everything here is licensed **CC BY-SA 4.0** (see `LICENSE`).

| File | What it is |
|---|---|
| `models/full-body-male-mobile.glb` | 221 meshes: 218 muscle regions + skeleton + head/hand/foot muscles + connective tissue, ~129k triangles |
| `models/full-body-female-mobile.glb` | Illustrative female variant (artist-authored deformation of the male geometry, unverified proportions) + two breast-context meshes |
| `maps/full-body-map.json`, `maps/female-muscle-map.json` | Stable muscle IDs, labels, sides, layers, training groups, source names, SHA-256 of the GLB |
| `scripts/` | The Blender 5.1 build scripts that produced the models from the Z-Anatomy source (paths inside point at the original workspace; adjust `ROOT` to rebuild) |
| `upstream/Z-Anatomy-LICENSE.txt` | The upstream license and attribution file, verbatim |
| `ATTRIBUTION.txt` | Credits in the licensors' requested wording, the source archive hash, and the full list of changes |

## Credits

- "Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0" — https://github.com/Z-Anatomy/Models-of-human-anatomy
- "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan"
- "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International" — https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

## Using the models

Every muscle node carries glTF `extras` (`muscleId`, `key`, `label`, `side`, `layer`,
`group`, `sourceName`, `assetLicense`); three.js exposes them as `object.userData`.
Coordinates are metres, glTF Y-up, anterior +Z, anatomical left +X. The geometry has not
been reviewed by an anatomy specialist; the female variant is illustrative only.

If you redistribute or adapt these files, keep the credits above, link to
https://creativecommons.org/licenses/by-sa/4.0/, state your changes, and license your
adaptation under CC BY-SA 4.0 (or a compatible license).
