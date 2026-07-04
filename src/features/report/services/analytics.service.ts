import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";


export const getAnalytics = async (query: any) => {
  const { mode, date, from, to, year } = query;

  //--------------------------------------------------
  // DAILY MODE (FULL WEEK OUTPUT)
  //--------------------------------------------------

  if (mode === "daily") {
    if (!date) throw new Error("date is required");

    const targetDate = parseDateOnly(date);

    const transactions = await prisma.transaction.findMany({
      where: { transactionDate: targetDate },
    });

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const map: Record<string, any> = {};

    for (const d of days) {
      map[d] = {
        count: 0,
        revenue: 0,
        company: 0,
      };
    }

    for (const t of transactions) {
      const day = days[t.transactionDate.getDay()];

      if (day === undefined){
        throw new Error(`Invalid day index: ${t.transactionDate.getDay()}`);
      }

      map[day].count++;
      map[day].revenue += t.menu_price;
      map[day].company += t.company_share;
    }

    return {
      labels: days,
      transactions: days.map((d) => map[d].count),
      companyRevenue: days.map((d) => map[d].company),
      employeeCost: days.map((d) => map[d].revenue),
    };
  }

  //--------------------------------------------------
  // WEEKLY MODE (FULL RANGE W1–W5)
  //--------------------------------------------------

  if (mode === "weekly") {
    if (!from || !to) {
      throw new Error("from and to are required");
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: parseDateOnly(from),
          lte: parseDateOnly(to),
        },
      },
    });

    const weeks: Record<string, any> = {
      W1: { count: 0, revenue: 0, company: 0 },
      W2: { count: 0, revenue: 0, company: 0 },
      W3: { count: 0, revenue: 0, company: 0 },
      W4: { count: 0, revenue: 0, company: 0 },
      W5: { count: 0, revenue: 0, company: 0 },
    };

    for (const t of transactions) {
      const week = getWeekLabel(t.transactionDate);

      if (!weeks[week]) continue;

      weeks[week].count++;
      weeks[week].revenue += t.menu_price;
      weeks[week].company += t.company_share;
    }

    const labels = Object.keys(weeks);

    return {
      labels,
      transactions: labels.map((w) => weeks[w].count),
      companyRevenue: labels.map((w) => weeks[w].company),
      employeeCost: labels.map((w) => weeks[w].revenue),
    };
  }

  //--------------------------------------------------
  // MONTHLY MODE (FULL 12 MONTHS)
  //--------------------------------------------------

  if (mode === "monthly") {
    if (!year) throw new Error("year is required");

    const start = new Date(`${year}-01-01`);
    const end = new Date(`${year}-12-31`);

    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
    });

    const months: Record<string, any> = {};

    for (let i = 1; i <= 12; i++) {
      months[`M${i}`] = {
        count: 0,
        revenue: 0,
        company: 0,
      };
    }

    for (const t of transactions) {
      const key = `M${t.transactionDate.getMonth() + 1}`;

      months[key].count++;
      months[key].revenue += t.menu_price;
      months[key].company += t.company_share;
    }

    const labels = Object.keys(months);

    return {
      labels,
      transactions: labels.map((m) => months[m].count),
      companyRevenue: labels.map((m) => months[m].company),
      employeeCost: labels.map((m) => months[m].revenue),
    };
  }

  //--------------------------------------------------
  // DEFAULT SAFE RESPONSE
  //--------------------------------------------------

  return {
    labels: [],
    transactions: [],
    companyRevenue: [],
    employeeCost: [],
  };
};

// -----------------------------
// Helper: WEEK CALCULATOR
// -----------------------------
const getWeekLabel = (date: Date) => {
  const d = new Date(date);
  const firstDay = new Date(d.getFullYear(), 0, 1);
  const diff = Math.floor(
    (d.getTime() - firstDay.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );

  return `W${diff + 1}`;
};