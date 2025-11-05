let currentTime = 0;
let offsetTime = -1;
// the next index that should be used
let nextIndex = 0;
const sourceCode = 0; // TODO make this dynamic

// uses only 52 bits of the number to maintain percision with floating point
// 36 bits for time in milliseconds (little over 2 years)
// 8 bits for 256 possible sources (usually players)
// 8 bits for 256 events per source per millisecond

export function takeSnowportId(): number {
  if (offsetTime < 0) {
    offsetTime = performance.now();
  }
  // if (sourceCode < 0) {
  // throw new Error('Source code not set')
  // }
  const now = performance.now() - offsetTime;
  if (now > currentTime) {
    currentTime = now;
    nextIndex = 0;
  }
  if (nextIndex >= 256) {
    currentTime += 1;
    nextIndex = 0;
  }
  const time = (currentTime * 2^16) + (sourceCode * 2**8) + nextIndex;
  if (time < 0) {
    throw new Error(
      `time was negative: currentTime ${currentTime}, sourceCode ${sourceCode}, nextIndex ${nextIndex}`,
    );
  }
  nextIndex += 1;
  return time;
}

export function ingestSnowportId(snowportId: number) {
  const indexPart = snowportId % 256;
  const timePart = Math.floor(snowportId / 2**16);
  if (timePart > currentTime) {
    currentTime = timePart;
    offsetTime = performance.now() - currentTime;
    nextIndex = 0;
  } else if (snowportId === currentTime) {
    nextIndex = Math.max(nextIndex, indexPart + 1);
  }
}
