export const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const toDateOnlyString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const parseDateOnly = (value?: string): Date => {
  if (!value || typeof value !== "string") {
    throw new Error("Invalid date: expected YYYY-MM-DD");
  }

  const parts = value.split("-").map(Number);

  if (parts.length !== 3) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD");
  }

  const [year, month, day] = parts;

  if (!year || !month || !day) {
    throw new Error("Invalid date values");
  }

  return new Date(year, month - 1, day);
};