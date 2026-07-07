export function formatNaira(n: number): string {
  return `₦${Math.trunc(n).toLocaleString("en-US")}`;
}
