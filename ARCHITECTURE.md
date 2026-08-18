# DrawForge architecture

The application is being migrated from the legacy `app.js` monolith to small browser modules without a bundler.

## Modules

- `geometry-validation.js`: pure geometry and projection diagnostics.
- `projection-links.js`: synchronization of projection dimensions.
- `modules/history.js`: bounded undo/redo history independent from the UI.
- `modules/project-state.js`: versioned project serialization with legacy JSON compatibility.
- `modules/storage.js`: project persistence, migration and safe loading.
- `modules/export.js`: pure SVG, DXF and JSON export.
- `modules/geometry-3d.js`: pure bodies, holes, bosses and face generation.
- `modules/stl.js`: pure STL serialization and normals.
- `modules/canvas-renderer.js`: Canvas 2D shape and dimension drawing.
- `*-ui.js`: thin adapters between pure modules and the existing browser interface.

Pure modules support both browser globals and CommonJS so they can run directly in Node CI. UI adapters are intentionally small and may access the current application state.

## Migration rule

New geometry, state, export and storage logic must be implemented as a pure module first. `app.js` should only retain drawing event handlers during the migration. Each extracted module requires Node tests before its adapter is enabled.

## Current boundary

The 2D Canvas renderer is now a replaceable module. Legacy event handlers still call the same `paintShape` contract, so user-facing behavior stays stable while renderer code can evolve independently.
