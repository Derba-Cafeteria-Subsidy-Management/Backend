import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";


export const getAnalytics = async (query: any) => {
  const { mode, date, from, to, year } = query;

  // -----------------------------
  // DAILY MODE
  // -----------------------------
  if (mode === 'daily') {
    const targetDate = parseDateOnly(date);

    const transactions = await prisma.transaction.findMany({
      where: { transactionDate: targetDate },
    });

    const bySession: Record<string, number> = {};
    const revenue: Record<string, number> = {};
    const cost: Record<string, number> = {};
    const count: Record<string, number> = {};

    for (const t of transactions) {
      const session = t.menu_session;

      bySession[session] = (bySession[session] || 0) + 1;
      revenue[session] = (revenue[session] || 0) + t.menu_price;
      cost[session] = (cost[session] || 0) + t.company_share;
      count[session] = (count[session] || 0) + 1;
    }

    return {
      labels: Object.keys(bySession),
      transactions: Object.values(bySession),
      companyRevenue: Object.values(cost),
      employeeCost: Object.values(revenue),
    };
  }

  // -----------------------------
  // WEEKLY MODE
  // -----------------------------
  if (mode === 'weekly') {
    const transactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: parseDateOnly(from),
          lte: parseDateOnly(to),
        },
      },
    });

    const weeks: Record<string, any> = {};

    for (const t of transactions) {
      const week = getWeekLabel(t.transactionDate);

      if (!weeks[week]) {
        weeks[week] = {
          count: 0,
          revenue: 0,
          company: 0,
        };
      }

      weeks[week].count++;
      weeks[week].revenue += t.menu_price;
      weeks[week].company += t.company_share;
    }

    return {
      labels: Object.keys(weeks),
      transactions: Object.values(weeks).map((w) => w.count),
      companyRevenue: Object.values(weeks).map((w) => w.company),
      employeeCost: Object.values(weeks).map((w) => w.revenue),
    };
  }

  // -----------------------------
  // MONTHLY MODE
  // -----------------------------
  if (mode === 'monthly') {
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

    for (const t of transactions) {
      const month = t.transactionDate.getMonth() + 1;

      const key = `M${month}`;

      if (!months[key]) {
        months[key] = {
          count: 0,
          revenue: 0,
          company: 0,
        };
      }

      months[key].count++;
      months[key].revenue += t.menu_price;
      months[key].company += t.company_share;
    }

    return {
      labels: Object.keys(months),
      transactions: Object.values(months).map((m) => m.count),
      companyRevenue: Object.values(months).map((m) => m.company),
      employeeCost: Object.values(months).map((m) => m.revenue),
    };
  }

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