const DIACRITICS = /[\u0300-\u036f]/g

/** Normalize Vietnamese search text while keeping the original display labels intact. */
export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").trim()
}
