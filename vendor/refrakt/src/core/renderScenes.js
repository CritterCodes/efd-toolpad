/**
 * REFRAKT — render scene vocabulary.
 *
 * The named "settings" a generated render can be placed in. Pure data (no secrets),
 * shared by BOTH the client (the viewer's scene picker) and the server helper
 * (prompt assembly in generateRender). Add a scene = add one entry here.
 */

export const RENDER_SCENES = [
  { id: 'studio-white', label: 'Studio white', prompt: 'on a seamless pure-white studio sweep with soft, even diffused lighting and a subtle contact shadow' },
  { id: 'dark-studio', label: 'Dark studio', prompt: 'on a deep charcoal-black background with dramatic low-key spot lighting and bright specular glints' },
  { id: 'soft-gradient', label: 'Soft gradient', prompt: 'on a soft neutral grey-to-white gradient backdrop with gentle studio lighting' },
  { id: 'on-marble', label: 'On marble', prompt: 'resting on a polished white marble surface with soft natural window light' },
  { id: 'nature', label: 'Nature', prompt: 'in a soft natural outdoor setting with warm daylight and a gently blurred greenery background' },
  { id: 'on-hand', label: 'On the hand', prompt: 'worn on an elegant hand model with a softly blurred neutral background, lifestyle jewelry photography' },
  { id: 'macro-black', label: 'Macro black', prompt: 'extreme macro on a matte-black background with a single soft key light, showing the fire and brilliance in the stones' },
];

export const DEFAULT_SCENE = 'studio-white';

/** Prompt fragment for a scene id (empty string if unknown). */
export const sceneFragment = (id) => (RENDER_SCENES.find((s) => s.id === id) || {}).prompt || '';
