/**
 * Generates a unique invoice number based on the current date and time.
 * @returns A string representing the invoice number.
 */
export function generateInvoiceNumber() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `INV-${year}${month}${day}-${hours}${minutes}${seconds}-${Math.floor(
    Math.random() * 9000 + 1000
  )}`;
}

/**
 * Increments the given NCF string to the next sequential value.
 * @param ncf The current NCF string.
 * @returns The next sequential NCF string.
 */
export function incrementNCF(ncf: string): string {
  const prefix = ncf.slice(0, 3);
  const numberPart = ncf.slice(3);

  const next = (parseInt(numberPart) + 1)
    .toString()
    .padStart(numberPart.length, "0");

  return prefix + next;
}

/**
 * Increments the given CF string to the next sequential value.
 * @param cf The current CF string.
 * @returns The next sequential CF string.
 */
export function incrementCF(cf: string): string {
  const prefix = cf.slice(0, 3);
  const numberPart = cf.slice(3);

  const next = (parseInt(numberPart) + 1)
    .toString()
    .padStart(numberPart.length, "0");

  return prefix + next;
}
