import { prisma } from "../../../libs/lib/prisma.js";
import { startOfDay } from "../../shared/helpers/date.helper.js";

export const getMealsToday = async (employeeId: string) => {
    const today = startOfDay(new Date());

    const transactions = await prisma.transaction.findMany({
        where: {
            employeeId,
            transactionDate: today,
        },
        select: {
            id: true,
            menu_session: true,
            createdAt: true,
        },
    });

    const mealsToday = {
        BREAKFAST: false,
        LUNCH: false,
        DINNER: false,
    };

    transactions.forEach((transaction) => {
        mealsToday[
            transaction.menu_session as keyof typeof mealsToday
        ] = true;
    });

    return mealsToday;
};