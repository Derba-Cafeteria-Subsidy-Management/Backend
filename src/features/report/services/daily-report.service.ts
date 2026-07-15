

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
        include: {
            items: true,
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

        for (const item of t.items) {


            sessions[session].totalAmount += item.menu_price;
            sessions[session].employeeTotal += item.employee_share;
            sessions[session].companyTotal += item.company_share;

            grandAmount += item.menu_price;
            grandEmp += item.employee_share;
            grandComp += item.company_share;

        }
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