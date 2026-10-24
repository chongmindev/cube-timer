// Cube logo in a 32x32 box, drawn only with ribbons (no outlines). Each primary ribbon runs
// along the outer row of two faces, parallel to the cube's edges, and folds around one corner.
// Where two ribbons meet, the one going "over" keeps the corner, cyclically (red over yellow,
// yellow over blue, blue over red), so they look woven. The middle of the cube is empty.
// Shared by the header logo, favicon and share card.
export const CUBE_RED = 'M16 2.5L3.88 9.5L3.88 17.62L8.97 20.56L8.97 12.44L21.09 5.44Z'
export const CUBE_YELLOW = 'M28.12 23.5L28.12 9.5L21.09 5.44L16 8.38L23.03 12.44L23.03 26.44Z'
export const CUBE_BLUE = 'M3.88 23.5L16 30.5L23.03 26.44L23.03 20.56L16 24.62L3.88 17.62Z'
