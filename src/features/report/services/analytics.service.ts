import { ifError } from "node:assert";
import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly } from "../../shared/helpers/date.helper";
import { createBucket, endOfMonth, endOfYear, getWeekOfMonth, MEAL_LABELS, MONTH_LABELS, startOfMonth, startOfYear, WEEKDAY_LABELS } from "../Helper/analytics.helper";
import { NotFoundError } from "../../../errors/errors/apperror";


export const getAnalytics = async (query: any) => {
  const { mode, date, from, to, year, month } = query;

  //--------------------------------------------------
  // DAILY MODE (FULL WEEK OUTPUT)
  //--------------------------------------------------

  if (mode === "daily") {
    if (!date) {
      throw new NotFoundError("date is required");
    }
    return getDailyAnalytics(date);
  }

  //--------------------------------------------------
  // WEEKLY MODE (FULL RANGE W1–W5)
  //--------------------------------------------------

  if (mode === "weekly") {
    if (!from || !to) {
      throw new NotFoundError("from and to are required");
    }
    return getWeeklyAnalytics(from, to);
  }

  //--------------------------------------------------
  // MONTHLY MODE (FULL 12 MONTHS)
  //--------------------------------------------------

  if (mode === "monthly") {

    if (!year || !month) {
      throw new NotFoundError("year and month are required");
    }

    return getMonthlyAnalytics(year, month);
  }

  if (mode === "yearly") {
    if (!year) {
      throw new NotFoundError("year is required");
    }
    return getYearlyAnalytics(year);
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
const getDailyAnalytics = async (date: string) => {

  const targetDate = parseDateOnly(date);


  const transactions = await prisma.transaction.findMany({

    where: {
      transactionDate: targetDate,
    },


   
 include: {
      items: true,
    },
  });



  const buckets: Record<
    string,
    ReturnType<typeof createBucket>
  > = {};



  // initialize every meal
  for (const meal of MEAL_LABELS) {

    buckets[meal] = createBucket();

  }




  for (const transaction of transactions) {


    const meal = transaction.menu_session;



    if (!buckets[meal]) {

      buckets[meal] = createBucket();

    }



    /**
     * Count transaction as one meal event
     * Example:
     * 
     * Employee:
     *   Chicken
     *   Juice
     * 
     * Still = 1 transaction
     */
    buckets[meal].transactions++;



    /**
     * Calculate totals from TransactionItems
     */
    for (const item of transaction.items) {


      const quantity =
        item.quantity ?? 1;



      buckets[meal].companyRevenue +=
        Number(item.company_share) * quantity;



      buckets[meal].employeeCost +=
        Number(item.menu_price) * quantity;


    }


  }




  return {


    labels: MEAL_LABELS,


    transactions: MEAL_LABELS.map(
      (meal) =>
        buckets[meal]?.transactions ?? 0
    ),



    companyRevenue: MEAL_LABELS.map(
      (meal) =>
        buckets[meal]?.companyRevenue ?? 0
    ),



    employeeCost: MEAL_LABELS.map(
      (meal) =>
        buckets[meal]?.employeeCost ?? 0
    ),


  };

};





// ======================================================
// WEEKLY
// ======================================================

const getWeeklyAnalytics = async (
  from: string,
  to: string
) => {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },

     include: {
      items: true,
    },
  });

  const labels: string[] = [];
  const buckets: Record<
    string,
    ReturnType<typeof createBucket>
  > = {};

  const current = new Date(start);

  while (current <= end) {
    const label = WEEKDAY_LABELS[current.getDay()] ?? 'Unknown';

    labels.push(label);

    buckets[label] = createBucket();

    current.setDate(current.getDate() + 1);
  }

  for (const transaction of transactions) {
    const label = WEEKDAY_LABELS[transaction.transactionDate.getDay()] ?? 'Unknown';

    if (!buckets[label]) {
      buckets[label] = createBucket();
    }

    buckets[label].transactions++;

    for (const item of transaction.items) {
    const quantity =
        item.quantity ?? 1;

    buckets[label].companyRevenue += Number(item.company_share) * quantity;

    buckets[label].employeeCost += Number(
      item.menu_price
    ) * quantity;

  }
  }

  return {
    labels,

    transactions: labels.map(
      (label) => buckets[label]?.transactions ?? 0
    ),

    companyRevenue: labels.map(
      (label) => buckets[label]?.companyRevenue ?? 0
    ),

    employeeCost: labels.map(
      (label) => buckets[label]?.employeeCost ?? 0
    ),
  };
};


// ======================================================
// MONTHLY
// ======================================================

const getMonthlyAnalytics = async (
  year: number,
  month: number
) => {
  const start = startOfMonth(year, month);
  const end = endOfMonth(year, month);

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },

    include : {
      items: true
    }
  });

  const totalWeeks = getWeekOfMonth(end);

  const labels = Array.from(
    { length: totalWeeks },
    (_, i) => `W${i + 1}`
  );

  const buckets: Record<
    string,
    ReturnType<typeof createBucket>
  > = {};

  labels.forEach((label) => {
    buckets[label] = createBucket();
  });

  for (const transaction of transactions) {
    const week = `W${getWeekOfMonth(
      transaction.transactionDate
    )}`;

    if (!buckets[week]) {
      buckets[week] = createBucket();
    }

    buckets[week].transactions++;

    for (const item of transaction.items) {
      const quantity = item.quantity ?? 1;
      buckets[week].companyRevenue += Number(item.company_share) * quantity;
      buckets[week].employeeCost += Number(item.menu_price) * quantity;
    }
  }



  return {
    labels,

    transactions: labels.map(
      (label) => buckets[label]?.transactions ?? 0
    ),

    companyRevenue: labels.map(
      (label) => buckets[label]?.companyRevenue ?? 0
    ),

    employeeCost: labels.map(
      (label) => buckets[label]?.employeeCost ?? 0
    ),
  };
};




// ======================================================
// YEARLY
// ======================================================

const getYearlyAnalytics = async (year: number) => {
  const start = startOfYear(year);
  const end = endOfYear(year);

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      items: true
    }
  });

  const buckets: Record<
    string,
    ReturnType<typeof createBucket>
  > = {};

  MONTH_LABELS.forEach((label) => {
    buckets[label] = createBucket();
  });

  for (const transaction of transactions) {
    const month = `M${transaction.transactionDate.getMonth() + 1}`;

    if (!buckets[month]) {
      buckets[month] = createBucket();
    }

    buckets[month].transactions++;

    for (const item of transaction.items) {
      const quantity = item.quantity ?? 1;
      buckets[month].companyRevenue += Number(item.company_share) * quantity;
      buckets[month].employeeCost += Number(item.menu_price) * quantity;
    }
  }

  return {
    labels: MONTH_LABELS,

    transactions: MONTH_LABELS.map(
      (label) => buckets[label]?.transactions ?? 0
    ),

    companyRevenue: MONTH_LABELS.map(
      (label) => buckets[label]?.companyRevenue ?? 0
    ),

    employeeCost: MONTH_LABELS.map(
      (label) => buckets[label]?.employeeCost ?? 0
    ),
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


