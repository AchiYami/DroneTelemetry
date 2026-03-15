export function getRandomInt(min: number, max: number) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}


export function randomLatitude(): number {
  // Belfast bounding box: 54.54 to 54.64
  return parseFloat((54.54 + Math.random() * (54.64 - 54.54)).toFixed(6));
}

export function randomLongitude(): number {
  // Belfast bounding box: -6.08 to -5.82
  return parseFloat((-6.08 + Math.random() * (-5.82 - (-6.08))).toFixed(6));
}