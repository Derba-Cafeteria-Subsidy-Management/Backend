

import { prisma } from '../../../libs/lib/prisma.js';
import { endOfDay, startOfDay } from '../../shared/helpers/date.helper.js';
import { DailySummaryResponse } from '../types/report.types.js';
import { mealType } from '@prisma/client';

export const getDailySummary = async (
    date: string
): Promise<DailySummaryResponse> => {

    const targetDate = new Date(date);
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    // Fetch employee transactions
    const transactions = await prisma.transaction.findMany({
        where: {
            transactionDate: {
                gte: start,
                lte: end,
            }
        },
        include: {
            items: true,
            employee: {
                include: {
                    groupMembers: {
                        where: { active: true },
                        include: {
                            group: true
                        }
                    }
                }
            }
        },
    });

    // Fetch guest transactions
    const guestTransactions = await prisma.guestMealTransaction.findMany({
        where: {
            transactionDate: {
                gte: start,
                lte: end,
            }
        },
        include: {
            items: true,
        },
    });

    const sessions: Record<mealType, any> = {
        BREAKFAST: { count: 0, totalAmount: 0, employeeTotal: 0, companyTotal: 0, invitationExpense: 0 },
        LUNCH: { count: 0, totalAmount: 0, employeeTotal: 0, companyTotal: 0, invitationExpense: 0 },
        DINNER: { count: 0, totalAmount: 0, employeeTotal: 0, companyTotal: 0, invitationExpense: 0 },
    };

    let grandAmount = 0;
    let grandEmp = 0;
    let grandComp = 0;
    let grandInvitationExpense = 0;

    const byEmployeeType = {
        NORMAL: { count: 0, companyShare: 0 },
        SHIFT: { count: 0, companyShare: 0 }
    };

    const byGroup: Record<string, { groupId: string; groupName: string; count: number; companyShare: number }> = {};

    // Aggregate employee transactions
    for (const t of transactions) {
        const session = t.menu_session;
        sessions[session].count += 1;

        const empType = t.employee.employeeType;
        byEmployeeType[empType].count += 1;

        let transactionCompShare = 0;

        for (const item of t.items) {
            const qty = item.quantity ?? 1;
            const menuPriceTotal = item.menu_price * qty;
            const empShareTotal = item.employee_share * qty;
            const compShareTotal = item.company_share * qty;

            sessions[session].totalAmount += menuPriceTotal;
            sessions[session].employeeTotal += empShareTotal;
            sessions[session].companyTotal += compShareTotal;

            grandAmount += menuPriceTotal;
            grandEmp += empShareTotal;
            grandComp += compShareTotal;

            byEmployeeType[empType].companyShare += compShareTotal;
            transactionCompShare += compShareTotal;
        }

        if (empType === 'SHIFT') {
            const activeMember = t.employee.groupMembers?.[0];
            if (activeMember) {
                const grpId = activeMember.groupId;
                const grpName = activeMember.group.name;
                if (!byGroup[grpId]) {
                    byGroup[grpId] = {
                        groupId: grpId,
                        groupName: grpName,
                        count: 0,
                        companyShare: 0
                    };
                }
                byGroup[grpId].count += 1;
                byGroup[grpId].companyShare += transactionCompShare;
            }
        }
    }

    // Aggregate guest transactions
    for (const t of guestTransactions) {
        const session = t.menu_session;
        sessions[session].count += 1;

        for (const item of t.items) {
            const qty = item.quantity ?? 1;
            const menuPriceTotal = item.price * qty;
            const compShareTotal = item.company_share * qty;

            sessions[session].totalAmount += menuPriceTotal;
            sessions[session].companyTotal += compShareTotal;
            sessions[session].invitationExpense += compShareTotal;

            grandAmount += menuPriceTotal;
            grandComp += compShareTotal;
            grandInvitationExpense += compShareTotal;
        }
    }

    return {
        date,
        totalTransactions: transactions.length + guestTransactions.length,
        bySession: sessions,
        grandTotal: {
            amount: grandAmount,
            employeeTotal: grandEmp,
            companyTotal: grandComp,
            companySubsidy: grandComp - grandInvitationExpense,
            invitationExpense: grandInvitationExpense,
        },
        byEmployeeType,
        byGroup
    };
};