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

export const parseDateOnly = (value: string): Date => {

  const [year, month, day] = value.split('-').map(Number);
  if (year == undefined || month == undefined || day == undefined) {
    throw new Error('Invalid date');

  }
  return new Date(year, month - 1, day);

};
