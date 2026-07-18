export function checkShiftExpiration(shiftDate, todayString) {
  return !!shiftDate && shiftDate !== todayString;
}
