import { FoodType, mealType, Prisma } from "@prisma/client";
import { ConflictError } from "../../../errors/errors/apperror.js";

export const calculateConsumption = (
  items: {
    menu_item: {
      foodType: FoodType;
    };
    quantity: number;
  }[]
) => {

  let meal = 0;
  let drink = 0;


  for (const item of items) {

    if (item.menu_item.foodType === 'DRINK') {
      drink += item.quantity;
    }
    else {
      meal += item.quantity;
    }

  }


  return {
    meal,
    drink
  };
};


export const validateSessionAvailability = async (
  tx: Prisma.TransactionClient,
  employeeId: string,
  session: mealType,
  meal: number,
  drink: number,
  date: Date
) => {


  const status =
    await tx.employee_session_status.findUnique({
      where: {
        employeeId_date_session: {
          employeeId,
          date,
          session
        }
      }
    });


  if (!status) {
    return;
  }


  if (
    status.mealConsumed + meal > 1
  ) {
    throw new ConflictError(
      "Employee already consumed meal for this session"
    );
  }


  if (
    status.drinkConsumed + drink > 1
  ) {
    throw new ConflictError(
      "Employee already consumed drink for this session"
    );
  }

};

export const updateEmployeeSessionStatus = async (
  tx: Prisma.TransactionClient,
  employeeId: string,
  session: mealType,
  date: Date,
  meal: number,
  drink: number
) => {


  await tx.employee_session_status.upsert({

    where: {
      employeeId_date_session: {
        employeeId,
        date,
        session
      }
    },


    create: {
      employeeId,
      date,
      session,

      mealConsumed: meal,
      drinkConsumed: drink
    },


    update: {
      mealConsumed: {
        increment: meal
      },

      drinkConsumed: {
        increment: drink
      }
    }

  });


};
