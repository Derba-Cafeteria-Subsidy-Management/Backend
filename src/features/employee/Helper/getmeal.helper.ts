import { prisma } from "../../../libs/lib/prisma.js";
import { startOfDay } from "../../shared/helpers/date.helper.js";

/* xport const getMealsToday = async (employeeId: string) => {
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
}; */

export const getMealsToday = async (
  employeeId: string
) => {


  const today =
    startOfDay(new Date());



  const statuses =
    await prisma.employee_session_status.findMany({

      where: {
        employeeId,
        date: today,
      },

      select: {
        session: true,
        mealConsumed: true,
        drinkConsumed: true,
      }

    });



  const sessions = [
    "BREAKFAST",
    "LUNCH",
    "DINNER"
  ] as const;



  return sessions.map((session) => {


    const status =
      statuses.find(
        item => item.session === session
      );



    return {

      session,

      mealConsumed:
        status?.mealConsumed ?? 0,

      drinkConsumed:
        status?.drinkConsumed ?? 0,


      mealAvailable:
        (status?.mealConsumed ?? 0) < 1,


      drinkAvailable:
        (status?.drinkConsumed ?? 0) < 1,


      completed:
        (status?.mealConsumed ?? 0) >= 1 &&
        (status?.drinkConsumed ?? 0) >= 1,

    };

  });

};