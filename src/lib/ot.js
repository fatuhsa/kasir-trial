/**
 * Pure overtime calculation function.
 * Extracted from CalculateRentalModal for unit testing.
 *
 * Rules:
 *  - Free until 10m59s past limit (Math.floor(actualOver) < 11)
 *  - First 1–10 min of each hour-block: free
 *  - 11–40 min past a full hour: half-hour rate (priceOT30)
 *  - 41–60 min past a full hour: full-hour rate (priceOT60)
 *
 * @param {number} elapsedMin - total elapsed minutes
 * @param {number} limitMin   - free limit in minutes (60 for standard, packageHours*60 for packages)
 * @returns {{ otFull: number, otHalf: number }}
 */
export function calcOT(elapsedMin, limitMin) {
  const actualOver = elapsedMin - limitMin;
  if (Math.floor(actualOver) < 11) return { otFull: 0, otHalf: 0 };

  const cycles = Math.floor(actualOver / 60);
  const remainder = actualOver % 60;

  let otFull = cycles;
  let otHalf = 0;

  if (remainder > 10 && remainder <= 40) otHalf = 1;
  else if (remainder > 40) otFull += 1;

  return { otFull, otHalf };
}

/**
 * Calculate total OT cost for one item.
 * @param {number} elapsedMin
 * @param {number} limitMin
 * @param {{ priceOT30: number, priceOT60: number }} def - item definition
 * @param {number} qty
 * @returns {number} total OT cost in IDR
 */
export function calcOTCost(elapsedMin, limitMin, def, qty = 1) {
  const { otFull, otHalf } = calcOT(elapsedMin, limitMin);
  return (otFull * def.priceOT60 + otHalf * def.priceOT30) * qty;
}

/**
 * Get local date string YYYY-MM-DD from a timestamp (ms).
 * Always uses local timezone — prevents midnight rollover issues.
 * @param {number} [ts] - timestamp in ms, defaults to Date.now()
 * @returns {string}
 */
export function localDateStr(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
