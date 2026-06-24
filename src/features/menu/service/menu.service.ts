import { prisma } from '../../../libs/lib/prisma.js';
import {
  CreateMenuInput,
  UpdateMenuInput,
  CreatePriceVersionInput
} from '../types/menu.types';

export const getMenus = async (
  activeOnly = true,
  page = 1,
  pageSize = 10,
  query?: string
) => {

const menus = await prisma.menu_items.findMany({
  where: {
    ...(activeOnly && { status: 'ACTIVE' }),
    ...(query && {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ]
    })
  },
  skip : (page - 1) * pageSize,
  take : pageSize,
  //search with query if provided
  include: {
    PriceHistory: {
      orderBy: {
        effctive_from: 'desc', // ⚠️ check spelling, should be `effective_from`
      },
      select: {
        price: true,
      },
      take: 1,
    },
  },
  
});

var totalCount = await prisma.menu_items.count({
  where: {
    ...(activeOnly && { status: 'ACTIVE' }),
  },
});

return {
  data: menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    description: menu.description,
    currentPrice: menu.PriceHistory[0]?.price ?? 0,
    active: menu.status === 'ACTIVE',
  })),
  pagination: {
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  },
};
}


export const createMenu = async (
  input: CreateMenuInput,
  createdBy: string
) => {

  const effectiveFrom =
    input.effectiveFrom ??
    new Date();

  return prisma.$transaction(
    async (tx: any) => {

      const menu =
        await tx.menu_items.create({
          data: {
            name: input.name,
            description:
              input.description
          }
        });

      await tx.price_history.create({
        data: {
          menuItemId: menu.id,
          price: input.price,
          effectiveFrom,
          effectiveTo: null,
          createdBy
        }
      });

      return menu;
    }
  );
};

export const updateMenu = async (
  id: string,
  input: UpdateMenuInput
) => {

  return prisma.menu_items.update({
    where: {
      id
    },

    data: {
      ...(input.name && {
        name: input.name
      }),

      ...(input.description && {
        description:
          input.description
      }),

      ...(input.active !== undefined && {
        status:
          input.active
            ? 'ACTIVE'
            : 'INACTIVE'
      })
    }
  });
};

export const addPriceVersion =
  async (
    menuId: string,
    input: CreatePriceVersionInput,
    userId: string
  ) => {

    return prisma.$transaction(
      async (tx: any) => {

        const currentPrice =
          await tx.price_history.findFirst({
            where: {
              menuItemId: menuId,
              effectiveTo: null
            }
          });

        if (!currentPrice) {
          throw new Error(
            'Current price not found'
          );
        }

        const previousDay =
          new Date(input.effectiveFrom);

        previousDay.setDate(
          previousDay.getDate() - 1
        );

        await tx.price_history.update({
          where: {
            id: currentPrice.id
          },

          data: {
            effectiveTo:
              previousDay
          }
        });

        return tx.price_history.create({
          data: {
            menuItemId: menuId,
            price: input.price,
            effectiveFrom:
              input.effectiveFrom,
            effectiveTo: null,
            createdBy: userId
          }
        });
      }
    );
  };

  export const getPriceHistory =
  async (menuId: string) => {

    return prisma.price_history.findMany({
      where: {
        menuItemId: menuId
      },

      orderBy: {
        effctive_from: 'desc'
      }
    });
  };