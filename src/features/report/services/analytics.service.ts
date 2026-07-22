import { prisma } from "../../../libs/lib/prisma";
import { parseDateOnly, startOfDay } from "../../shared/helpers/date.helper";
import { createBucket, endOfMonth, endOfYear, getWeekOfMonth, MEAL_LABELS, MONTH_LABELS, startOfMonth, startOfYear, WEEKDAY_LABELS } from "../Helper/analytics.helper";
import { NotFoundError } from "../../../errors/errors/apperror";

export const getAnalytics = async (query: any) => {
  const { mode, date, from, to, year, month } = query;

  let start: Date;
  let end: Date;

  if (mode === "daily") {
    if (!date) {
      throw new NotFoundError("date is required");
    }
    start = parseDateOnly(date);
    end = parseDateOnly(date);
  } else if (mode === "weekly") {
    if (!from || !to) {
      throw new NotFoundError("from and to are required");
    }
    start = parseDateOnly(from);
    end = parseDateOnly(to);
  } else if (mode === "monthly") {
    if (!year || !month) {
      throw new NotFoundError("year and month are required");
    }
    start = startOfMonth(year, month);
    end = endOfMonth(year, month);
  } else if (mode === "yearly") {
    if (!year) {
      throw new NotFoundError("year is required");
    }
    start = startOfYear(year);
    end = endOfYear(year);
  } else {
    start = new Date();
    end = new Date();
  }

  // Get standard chart data
  let chartData;
  if (mode === "daily") {
    chartData = await getDailyAnalytics(date);
  } else if (mode === "weekly") {
    chartData = await getWeeklyAnalytics(from, to);
  } else if (mode === "monthly") {
    chartData = await getMonthlyAnalytics(year, month);
  } else if (mode === "yearly") {
    chartData = await getYearlyAnalytics(year);
  } else {
    chartData = {
      labels: [],
      transactions: [],
      companyRevenue: [],
      employeeCost: [],
    };
  }

  // Get guest summary metrics
  const guestSummary = await getGuestSummary(start, end);

  // Get shift summary metrics
  const shiftSummary = await getShiftSummary(start, end);

  return {
    ...chartData,
    guestSummary,
    shiftSummary,
  };
};

const getDailyAnalytics = async (date: string) => {
  const targetDate = parseDateOnly(date);

  const [transactions, guestTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        transactionDate: targetDate,
      },
      include: {
        items: true,
      },
    }),
    prisma.guestMealTransaction.findMany({
      where: {
        transactionDate: targetDate,
      },
      include: {
        items: true,
      },
    }),
  ]);

  const buckets: Record<string, ReturnType<typeof createBucket>> = {};

  for (const meal of MEAL_LABELS) {
    buckets[meal] = createBucket();
  }

  for (const transaction of transactions) {
    const meal = transaction.menu_session;
    if (!buckets[meal]) {
      buckets[meal] = createBucket();
    }
    buckets[meal].transactions++;

    for (const item of transaction.items) {
      const quantity = item.quantity ?? 1;
      buckets[meal].companyRevenue += Number(item.company_share) * quantity;
      buckets[meal].employeeCost += Number(item.menu_price) * quantity;
    }
  }

  for (const transaction of guestTransactions) {
    const meal = transaction.menu_session;
    if (!buckets[meal]) {
      buckets[meal] = createBucket();
    }
    buckets[meal].transactions++;

    for (const item of transaction.items) {
      const quantity = item.quantity ?? 1;
      buckets[meal].companyRevenue += Number(item.company_share) * quantity;
      buckets[meal].employeeCost += Number(item.price) * quantity;
    }
  }

  return {
    labels: MEAL_LABELS,
    transactions: MEAL_LABELS.map((meal) => buckets[meal]?.transactions ?? 0),
    companyRevenue: MEAL_LABELS.map((meal) => buckets[meal]?.companyRevenue ?? 0),
    employeeCost: MEAL_LABELS.map((meal) => buckets[meal]?.employeeCost ?? 0),
  };
};

const getWeeklyAnalytics = async (from: string, to: string) => {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);

  const [transactions, guestTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    }),
    prisma.guestMealTransaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    }),
  ]);

  const labels: string[] = [];
  const buckets: Record<string, ReturnType<typeof createBucket>> = {};

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
      const quantity = item.quantity ?? 1;
      buckets[label].companyRevenue += Number(item.company_share) * quantity;
      buckets[label].employeeCost += Number(item.menu_price) * quantity;
    }
  }

  for (const transaction of guestTransactions) {
    const label = WEEKDAY_LABELS[transaction.transactionDate.getDay()] ?? 'Unknown';
    if (!buckets[label]) {
      buckets[label] = createBucket();
    }
    buckets[label].transactions++;

    for (const item of transaction.items) {
      const quantity = item.quantity ?? 1;
      buckets[label].companyRevenue += Number(item.company_share) * quantity;
      buckets[label].employeeCost += Number(item.price) * quantity;
    }
  }

  return {
    labels,
    transactions: labels.map((label) => buckets[label]?.transactions ?? 0),
    companyRevenue: labels.map((label) => buckets[label]?.companyRevenue ?? 0),
    employeeCost: labels.map((label) => buckets[label]?.employeeCost ?? 0),
  };
};

const getMonthlyAnalytics = async (year: number, month: number) => {
  const start = startOfMonth(year, month);
  const end = endOfMonth(year, month);

  const [transactions, guestTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    }),
    prisma.guestMealTransaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    }),
  ]);

  const totalWeeks = getWeekOfMonth(end);
  const labels = Array.from({ length: totalWeeks }, (_, i) => `W${i + 1}`);
  const buckets: Record<string, ReturnType<typeof createBucket>> = {};

  labels.forEach((label) => {
    buckets[label] = createBucket();
  });

  for (const transaction of transactions) {
    const week = `W${getWeekOfMonth(transaction.transactionDate)}`;
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

  for (const transaction of guestTransactions) {
    const week = `W${getWeekOfMonth(transaction.transactionDate)}`;
    if (!buckets[week]) {
      buckets[week] = createBucket();
    }
    buckets[week].transactions++;

    for (const item of transaction.items) {
      const quantity = item.quantity ?? 1;
      buckets[week].companyRevenue += Number(item.company_share) * quantity;
      buckets[week].employeeCost += Number(item.price) * quantity;
    }
  }

  return {
    labels,
    transactions: labels.map((label) => buckets[label]?.transactions ?? 0),
    companyRevenue: labels.map((label) => buckets[label]?.companyRevenue ?? 0),
    employeeCost: labels.map((label) => buckets[label]?.employeeCost ?? 0),
  };
};

const getYearlyAnalytics = async (year: number) => {
  const start = startOfYear(year);
  const end = endOfYear(year);

  const [transactions, guestTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    }),
    prisma.guestMealTransaction.findMany({
      where: {
        transactionDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        items: true,
      },
    }),
  ]);

  const buckets: Record<string, ReturnType<typeof createBucket>> = {};

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

  for (const transaction of guestTransactions) {
    const month = `M${transaction.transactionDate.getMonth() + 1}`;
    if (!buckets[month]) {
      buckets[month] = createBucket();
    }
    buckets[month].transactions++;

    for (const item of transaction.items) {
      const quantity = item.quantity ?? 1;
      buckets[month].companyRevenue += Number(item.company_share) * quantity;
      buckets[month].employeeCost += Number(item.price) * quantity;
    }
  }

  return {
    labels: MONTH_LABELS,
    transactions: MONTH_LABELS.map((label) => buckets[label]?.transactions ?? 0),
    companyRevenue: MONTH_LABELS.map((label) => buckets[label]?.companyRevenue ?? 0),
    employeeCost: MONTH_LABELS.map((label) => buckets[label]?.employeeCost ?? 0),
  };
};

const getGuestSummary = async (start: Date, end: Date) => {
  const today = startOfDay(new Date());

  // Calculate today's invitation expense
  const todayItems = await prisma.guestMealItem.findMany({
    where: {
      guestTransaction: {
        transactionDate: today,
      },
    },
    select: {
      company_share: true,
      quantity: true,
    },
  });
  const todayInvitationExpense = todayItems.reduce((sum, item) => sum + item.company_share * item.quantity, 0);

  // Calculate monthly invitation expense (current month of today's date)
  const currentMonthStart = startOfMonth(today.getFullYear(), today.getMonth() + 1);
  const currentMonthEnd = endOfMonth(today.getFullYear(), today.getMonth() + 1);
  const monthlyItems = await prisma.guestMealItem.findMany({
    where: {
      guestTransaction: {
        transactionDate: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    },
    select: {
      company_share: true,
      quantity: true,
    },
  });
  const monthlyInvitationExpense = monthlyItems.reduce((sum, item) => sum + item.company_share * item.quantity, 0);

  // Calculate yearly invitation expense (current year of today's date)
  const currentYearStart = startOfYear(today.getFullYear());
  const currentYearEnd = endOfYear(today.getFullYear());
  const yearlyItems = await prisma.guestMealItem.findMany({
    where: {
      guestTransaction: {
        transactionDate: {
          gte: currentYearStart,
          lte: currentYearEnd,
        },
      },
    },
    select: {
      company_share: true,
      quantity: true,
    },
  });
  const yearlyInvitationExpense = yearlyItems.reduce((sum, item) => sum + item.company_share * item.quantity, 0);

  // Query range-specific metrics
  const rangeTransactions = await prisma.guestMealTransaction.findMany({
    where: {
      transactionDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      invitedBy: true,
      items: {
        include: {
          menu_item: true,
        },
      },
    },
  });

  const invitationCount = rangeTransactions.length;
  const totalRangeCost = rangeTransactions.reduce((sum, t) => {
    return sum + t.items.reduce((itemSum, item) => itemSum + item.company_share * item.quantity, 0);
  }, 0);
  const averageInvitationCost = invitationCount > 0 ? totalRangeCost / invitationCount : 0;

  // Top inviters
  const inviterMap = new Map<string, { employeeId: string; fullName: string; employeeNumber: string; count: number; totalExpense: number }>();
  for (const t of rangeTransactions) {
    const emp = t.invitedBy;
    if (!emp) continue;
    const cost = t.items.reduce((sum, item) => sum + item.company_share * item.quantity, 0);
    const existing = inviterMap.get(emp.id);
    if (existing) {
      existing.count += 1;
      existing.totalExpense += cost;
    } else {
      inviterMap.set(emp.id, {
        employeeId: emp.id,
        fullName: emp.full_name,
        employeeNumber: emp.Employee_number,
        count: 1,
        totalExpense: cost,
      });
    }
  }
  const topInviters = Array.from(inviterMap.values())
    .sort((a, b) => b.totalExpense - a.totalExpense)
    .slice(0, 5);

  // Top guest menu items
  const itemMap = new Map<string, { menuItemId: string; name: string; totalQuantity: number; totalExpense: number }>();
  for (const t of rangeTransactions) {
    for (const item of t.items) {
      const itemId = item.menu_item_id;
      const cost = item.price * item.quantity;
      const existing = itemMap.get(itemId);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalExpense += cost;
      } else {
        itemMap.set(itemId, {
          menuItemId: itemId,
          name: item.menu_item.name,
          totalQuantity: item.quantity,
          totalExpense: cost,
        });
      }
    }
  }
  const topGuestMenuItems = Array.from(itemMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 5);

  return {
    todayInvitationExpense,
    monthlyInvitationExpense,
    yearlyInvitationExpense,
    invitationCount,
    averageInvitationCost,
    topInviters,
    topGuestMenuItems,
  };
};

const getShiftSummary = async (start: Date, end: Date) => {
  const [activeGroups, normalEmployeeCount, shiftEmployeeCount] = await Promise.all([
    prisma.employeeGroup.count({ where: { status: 'ACTIVE' } }),
    prisma.employees.count({ where: { employeeType: 'NORMAL' } }),
    prisma.employees.count({ where: { employeeType: 'SHIFT' } }),
  ]);

  const [normalMeals, shiftMeals] = await Promise.all([
    prisma.transaction.count({
      where: {
        transactionDate: { gte: start, lte: end },
        employee: { employeeType: 'NORMAL' }
      }
    }),
    prisma.transaction.count({
      where: {
        transactionDate: { gte: start, lte: end },
        employee: { employeeType: 'SHIFT' }
      }
    }),
  ]);

  const shiftTransactions = await prisma.transaction.findMany({
    where: {
      transactionDate: { gte: start, lte: end },
      employee: { employeeType: 'SHIFT' }
    },
    include: {
      items: true,
      employee: {
        include: {
          groupMembers: {
            where: { active: true },
            include: { group: true }
          }
        }
      }
    }
  });

  const groupStats: Record<string, { groupId: string; groupName: string; mealsCount: number; companyExpense: number; uniqueParticipants: Set<string> }> = {};

  for (const t of shiftTransactions) {
    const activeMember = t.employee.groupMembers?.[0];
    if (!activeMember) continue;

    const grpId = activeMember.groupId;
    const grpName = activeMember.group.name;

    if (!groupStats[grpId]) {
      groupStats[grpId] = {
        groupId: grpId,
        groupName: grpName,
        mealsCount: 0,
        companyExpense: 0,
        uniqueParticipants: new Set<string>()
      };
    }

    let tCompanyExpense = 0;
    for (const item of t.items) {
      tCompanyExpense += item.company_share * (item.quantity ?? 1);
    }

    groupStats[grpId].mealsCount += 1;
    groupStats[grpId].companyExpense += tCompanyExpense;
    groupStats[grpId].uniqueParticipants.add(t.employeeId);
  }

  const groupsList = await prisma.employeeGroup.findMany({
    include: {
      _count: {
        select: {
          members: {
            where: { active: true }
          }
        }
      }
    }
  });

  const groupParticipation = groupsList.map((g) => {
    const stats = groupStats[g.id];
    const totalMembers = g._count.members;
    const uniqueEaters = stats ? stats.uniqueParticipants.size : 0;
    return {
      groupId: g.id,
      groupName: g.name,
      totalMembers,
      uniqueEaters,
      participationRate: totalMembers > 0 ? (uniqueEaters / totalMembers) * 100 : 0
    };
  });

  const topConsumingGroups = Object.values(groupStats)
    .map(({ uniqueParticipants, ...rest }) => rest)
    .sort((a, b) => b.mealsCount - a.mealsCount)
    .slice(0, 5);

  const companyExpenseByGroup = Object.values(groupStats).map(({ groupId, groupName, companyExpense }) => ({
    groupId,
    groupName,
    companyExpense
  }));

  const mealsPerGroup = Object.values(groupStats).map(({ groupId, groupName, mealsCount }) => ({
    groupId,
    groupName,
    mealsCount
  }));

  return {
    activeGroups,
    shiftEmployeeCount,
    normalEmployeeCount,
    mealsByEmployeeType: {
      NORMAL: normalMeals,
      SHIFT: shiftMeals
    },
    mealsPerGroup,
    topConsumingGroups,
    groupParticipation,
    companyExpenseByGroup
  };
};
