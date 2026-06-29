import { prisma } from '../../../libs/lib/prisma.js';
import {
  CreateMenuInput,
  UpdateMenuInput,
  CreatePriceVersionInput,
  CreateMenuContext
} from '../types/menu.types';

import XLSX from "xlsx";

import {
  ImportMenuError,
  ImportMenuRow
} from "../types/menu.types";

import {
  saveImportPreview
} from "../helpers/import-cache";
import { createAuditLog } from '../../auth/service/audit.service.js';

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
    skip: (page - 1) * pageSize,
    take: pageSize,
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

  context: CreateMenuContext
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
          createdby: context.AdminId

        }
      });

      await createAuditLog({
        userId: context.AdminId,
        action: 'MENU_ITEM_CREATED',
        entityType: 'Menu_items',
        entityId: menu.id,
        metadata: {
          menuItemId: menu.id,
          menuname: input.name,
          effectiveFrom: effectiveFrom,
          price: input.price
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      return menu;
    }
  );
};

export const updateMenu = async (
  id: string,
  input: UpdateMenuInput,
  context: CreateMenuContext
) => {

  await createAuditLog({
    userId: context.AdminId,
    action: 'MENU_ITEM_UPDATED',
    entityType: 'Menu_items',
    entityId: id,
    metadata: {
      menuItemId: id,
      /*     menuname:input.name,
          effectiveFrom: effectiveFrom,
          price: input.price */
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

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

export const addPriceVersion = async (
  menuId: string,
  input: CreatePriceVersionInput,
  context: CreateMenuContext
) => {
  return prisma.$transaction(async (tx) => {
    // Find current active price
    const currentPrice = await tx.price_history.findFirst({
      where: {
        menuItemId: menuId,
        effective_to: null, // match schema field
      },
    });

    if (!currentPrice) {
      throw new Error("Current price not found");
    }

    // Close out the current price one day before new effectiveFrom
    const previousDay = new Date(input.effectiveFrom);
    previousDay.setDate(previousDay.getDate() - 1);

    await tx.price_history.update({
      where: { id: currentPrice.id },
      data: { effective_to: previousDay },
    });

    await createAuditLog({
      userId: context.AdminId,
      action: 'MENU_ITEM_UPDATED',
      entityType: 'Menu_items',
      entityId: menuId,
      metadata: {
        menuItemId: menuId,
        price: input.price,
        effectiveFrom: input.effectiveFrom,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    // Insert new price version
    return tx.price_history.create({
      data: {
        menuItemId: menuId,
        price: input.price,
        effctive_from: input.effectiveFrom, // match schema field
        effective_to: null,
        createdBy: context.AdminId,
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  });
};


export const getPriceHistory = async (menuId: string) => {
  const priceHistories = await prisma.price_history.findMany({
    where: { menuItemId: menuId },
    orderBy: { effctive_from: 'desc' },
    include: {
      menuItem: true, // include relation so you can access menuItem fields
      createdByUser: true,
    },
  });

  return priceHistories.map((ph) => ({
    id: ph.id,
    menuItemId: ph.menuItemId,
    menuItem: {
      id: ph.menuItem.id,
      name: ph.menuItem.name,
      status: ph.menuItem.status,
      createdAt: ph.menuItem.createdAt,
    },
    price: ph.price,
    effectiveFrom: ph.effctive_from, // use schema field name
    effectiveTo: ph.effective_to,
    // include createdBy user details
    createdBy: ph.createdByUser.email,
    createdAt: ph.createdAt,
  }));
};


export const previewMenuImport =
  async (
    file: Express.Multer.File
  ) => {

    const workbook =
      XLSX.read(file.buffer, {
        type: "buffer"
      });

    // to make sure workbook has at least one sheet index not to be undefined
    if (workbook.SheetNames.length === 0) {
      throw new Error(
        "Excel file is empty"
      );
    }

    // Type 'undefined' cannot be used as an index type.
    if (workbook.SheetNames[0] === undefined) {
      throw new Error(
        "Excel file is empty"
      );
    }

    const sheet =
      workbook.Sheets[
      workbook.SheetNames[0]
      ];

    if (!sheet) {
      throw new Error(
        "Excel file is empty"
      );
    }

    const data =
      XLSX.utils.sheet_to_json<any>(
        sheet
      );

    const validRows: ImportMenuRow[] = [];

    const errors: ImportMenuError[] = [];

    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      const row =
        data[i];

      const excelRow =
        i + 2;

      if (!row.Name) {

        errors.push({
          row: excelRow,
          field: "Name",
          message: "Required"
        });

        continue;
      }

      if (
        row.Price == null ||
        Number(row.Price) <= 0
      ) {

        errors.push({

          row: excelRow,

          field: "Price",

          message:
            "Must be greater than zero"

        });

        continue;
      }

      const exists =
        await prisma.menu_items.findFirst({

          where: {

            name: row.Name

          }

        });

      if (exists) {

        errors.push({

          row: excelRow,

          field: "Name",

          message:
            "Menu already exists"

        });

        continue;
      }

      validRows.push({

        row: excelRow,

        name: row.Name,

        description:
          row.Description ? row.Description : '',

        price:
          Number(row.Price),

        effectiveFrom: row.EffectiveFrom ? new Date(row.EffectiveFrom) : new Date()



      });

    }

    const previewToken = saveImportPreview(
      validRows,
      "MENU"
    );

    return {
      previewToken,
      totalRows: data.length,
      validRows,
      errors,
    };
  };