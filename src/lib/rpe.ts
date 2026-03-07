const RPE_CHART: Record<number, Record<string, number>> = {
  1: { "10.0": 100, "9.5": 97.8, "9.0": 95.5, "8.5": 93.9, "8.0": 92.2, "7.5": 90.7, "7.0": 89.2, "6.5": 87.8, "6.0": 86.3 },
  2: { "10.0": 95.5, "9.5": 93.9, "9.0": 92.2, "8.5": 90.7, "8.0": 89.2, "7.5": 87.8, "7.0": 86.3, "6.5": 85.0, "6.0": 83.7 },
  3: { "10.0": 92.2, "9.5": 90.7, "9.0": 89.2, "8.5": 87.8, "8.0": 86.3, "7.5": 85.0, "7.0": 83.7, "6.5": 82.4, "6.0": 81.1 },
  4: { "10.0": 89.2, "9.5": 87.8, "9.0": 86.3, "8.5": 85.0, "8.0": 83.7, "7.5": 82.4, "7.0": 81.1, "6.5": 79.9, "6.0": 78.6 },
  5: { "10.0": 86.3, "9.5": 85.0, "9.0": 83.7, "8.5": 82.4, "8.0": 81.1, "7.5": 79.9, "7.0": 78.6, "6.5": 77.4, "6.0": 76.2 },
  6: { "10.0": 83.7, "9.5": 82.4, "9.0": 81.1, "8.5": 79.9, "8.0": 78.6, "7.5": 77.4, "7.0": 76.2, "6.5": 75.0, "6.0": 73.8 },
  7: { "10.0": 81.1, "9.5": 79.9, "9.0": 78.6, "8.5": 77.4, "8.0": 76.2, "7.5": 75.0, "7.0": 73.8, "6.5": 72.7, "6.0": 71.5 },
  8: { "10.0": 78.6, "9.5": 77.4, "9.0": 76.2, "8.5": 75.0, "8.0": 73.8, "7.5": 72.7, "7.0": 71.5, "6.5": 70.4, "6.0": 69.3 },
  9: { "10.0": 76.2, "9.5": 75.0, "9.0": 73.8, "8.5": 72.7, "8.0": 71.5, "7.5": 70.4, "7.0": 69.3, "6.5": 68.2, "6.0": 67.1 },
  10: { "10.0": 73.9, "9.5": 72.8, "9.0": 71.7, "8.5": 70.6, "8.0": 69.5, "7.5": 68.4, "7.0": 67.3, "6.5": 66.2, "6.0": 65.1 },
  11: { "10.0": 70.7, "9.5": 69.6, "9.0": 68.5, "8.5": 67.4, "8.0": 66.3, "7.5": 65.2, "7.0": 64.1, "6.5": 63.0, "6.0": 61.9 },
  12: { "10.0": 68.0, "9.5": 66.9, "9.0": 65.8, "8.5": 64.7, "8.0": 63.6, "7.5": 62.5, "7.0": 61.4, "6.5": 60.3, "6.0": 59.2 },
};

function clampReps(reps: number) {
  if (reps < 1) {
    return 1;
  }

  if (reps > 12) {
    return 12;
  }

  return Math.round(reps);
}

function clampRpe(rpe: number) {
  const rounded = Math.round(rpe * 2) / 2;

  if (rounded < 6) {
    return 6;
  }

  if (rounded > 10) {
    return 10;
  }

  return rounded;
}

export function lookupIntensityPercent(reps: number, rpe: number) {
  const repsKey = clampReps(reps);
  const rpeKey = clampRpe(rpe).toFixed(1);
  return RPE_CHART[repsKey]?.[rpeKey] ?? null;
}

export function roundToIncrement(load: number, increment: number) {
  if (increment <= 0) {
    return load;
  }

  return Math.round(load / increment) * increment;
}

export function calculateVolume(load: number, reps: number) {
  return Math.round(load * reps);
}

export function estimateE1rm(load: number, intensityPercent: number) {
  if (intensityPercent <= 0) {
    return null;
  }

  return load / (intensityPercent / 100);
}
