type Checkpoint = [number, number];

function checkpointLerp(depth: number, points: Checkpoint[]): number {
  const d = Math.max(0, Math.min(1, depth));
  for (let i = 1; i < points.length; i += 1) {
    const [d0, v0] = points[i - 1];
    const [d1, v1] = points[i];
    if (d <= d1) {
      const t = (d - d0) / (d1 - d0);
      return v0 + (v1 - v0) * t;
    }
  }
  return points[points.length - 1][1];
}

/** Camera Y — preserves hero/crossing checkpoints; pushes deeper after 0.7 */
const CAMERA_Y: Checkpoint[] = [
  [0, 2.4],
  [0.45, -0.21],
  [0.7, -1.66],
  [1, -7.2],
];

/** Water plane Y — surface recedes far above viewpoint after 0.7 */
const WATER_PLANE_Y: Checkpoint[] = [
  [0, 0.2],
  [0.45, 2.27],
  [0.7, 3.42],
  [1, 15.5],
];

const LOOK_AT_Y: Checkpoint[] = [
  [0, -0.2],
  [0.45, -0.85],
  [0.7, -1.8],
  [1, -3.2],
];

const CAMERA_Z: Checkpoint[] = [
  [0, 10.5],
  [0.45, 9.8],
  [0.7, 8.5],
  [1, 7.2],
];

const CAUSTICS_Y: Checkpoint[] = [
  [0, 2.8],
  [0.7, 4.5],
  [1, 11],
];

export function sceneCameraY(depth: number): number {
  return checkpointLerp(depth, CAMERA_Y);
}

export function sceneWaterPlaneY(depth: number): number {
  return checkpointLerp(depth, WATER_PLANE_Y);
}

export function sceneLookAtY(depth: number): number {
  return checkpointLerp(depth, LOOK_AT_Y);
}

export function sceneCameraZ(depth: number): number {
  return checkpointLerp(depth, CAMERA_Z);
}

export function sceneCausticsY(depth: number): number {
  return checkpointLerp(depth, CAUSTICS_Y);
}

/** Accelerates deep fog/background blend in the 0.5–1.0 range without changing depth 0 */
export function deepEnvironmentBlend(depth: number): number {
  if (depth <= 0.5) return depth;
  const t = (depth - 0.5) / 0.5;
  const eased = 1 - (1 - t) * (1 - t);
  return 0.5 + eased * 0.5;
}
