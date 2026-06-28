
import { prisma } from '../../../libs/lib/prisma.js';
import { endOfDay, startOfDay } from '../../shared/helpers/date.helper.js';
import { DailySummaryResponse } from '../types/report.types.js';
import { mealType } from '@prisma/client';

export const getDailySummary = async (
    date: string
): Promise<DailySummaryResponse> => {

    const targetDate = new Date(date);
    const transactions = await prisma.transaction.findMany({
        where: {
            transactionDate: {
                gte: startOfDay(targetDate),
                lte: endOfDay(targetDate),
            }
        },
    });

    const sessions: Record<mealType, any> = {
        BREAKFAST: { count: 0, totalAmount: 0, employeeTotal: 0, companyTotal: 0 },
        LUNCH: { count: 0, totalAmount: 0, employeeTotal: 0, companyTotal: 0 },
        DINNER: { count: 0, totalAmount: 0, employeeTotal: 0, companyTotal: 0 },
    };

    let grandAmount = 0;
    let grandEmp = 0;
    let grandComp = 0;

    for (const t of transactions) {
        const session = t.menu_session;

        sessions[session].count += 1;
        sessions[session].totalAmount += t.menu_price;
        sessions[session].employeeTotal += t.employee_share;
        sessions[session].companyTotal += t.company_share;

        grandAmount += t.menu_price;
        grandEmp += t.employee_share;
        grandComp += t.company_share;
    }

    return {
        date,
        totalTransactions: transactions.length,
        bySession: sessions,
        grandTotal: {
            amount: grandAmount,
            employeeTotal: grandEmp,
            companyTotal: grandComp,
        },
    };
};