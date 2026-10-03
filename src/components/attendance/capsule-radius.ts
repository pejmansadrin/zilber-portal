type Range = { start: number; end: number };

// Keep rounded ends only at the outer edges of a continuous work interval.
export function capsuleRadius(start: number, end: number, ranges: Range[]) {
  const epsilon = 0.00001;
  const left = ranges.some(range => range.start < start - epsilon && range.end >= start - epsilon) ? "0" : "999px";
  const right = ranges.some(range => range.end > end + epsilon && range.start <= end + epsilon) ? "0" : "999px";
  return `${left} ${right} ${right} ${left}`;
}
