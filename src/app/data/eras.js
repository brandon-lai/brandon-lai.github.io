/**
 * The modernity scale for /beta, oldest → newest.
 * Each id maps to a renderer in app/beta/eras/.
 */
export const ERAS = [
  { id: "stone",      label: "Stone",      year: "3000 BCE", medium: "Carved" },
  { id: "manuscript", label: "Manuscript", year: "1450",     medium: "Written" },
  { id: "typewriter", label: "Typewriter", year: "1955",     medium: "Typed" },
  { id: "terminal",   label: "Terminal",   year: "1978",     medium: "Printed to stdout" },
  { id: "macintosh",  label: "Macintosh",  year: "1984",     medium: "Rendered" },
  { id: "laptop",     label: "Laptop",     year: "2012",     medium: "Browsed" },
  { id: "phone",      label: "Phone",      year: "2024",     medium: "Scrolled" },
  { id: "future",     label: "Future",     year: "20——",     medium: "Ambient" },
];

const ROMAN = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function toRoman(n) {
  let out = "";
  for (const [value, numeral] of ROMAN) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

/** "Sep 2022" → 2022 */
export const yearOf = (s = "") => Number(s.match(/\d{4}/)?.[0]) || null;
