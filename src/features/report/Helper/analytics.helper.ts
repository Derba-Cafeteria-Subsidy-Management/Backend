export const MONTH_LABELS = [
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7",
  "M8",
  "M9",
  "M10",
  "M11",
  "M12",
];
export const MEAL_LABELS = [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
];

export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

export const startOfMonth = (
  year: number,
  month: number
) => {
  return new Date(year, month - 1, 1);
};

export const endOfMonth = (
  year: number,
  month: number
) => {
  return new Date(year, month, 0, 23, 59, 59, 999);
};

export const startOfYear = (year: number) => {
  return new Date(year, 0, 1);
};

export const endOfYear = (year: number) => {
  return new Date(year, 11, 31, 23, 59, 59, 999);
};

export const getWeekOfMonth = (date: Date) => {
  const firstDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );

  const offset = firstDay.getDay();

  return Math.ceil((date.getDate() + offset) / 7);
};

export const createBucket = () => ({
  transactions: 0,
  companyRevenue: 0,
  employeeCost: 0,
});