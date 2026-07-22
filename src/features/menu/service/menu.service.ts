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
import { buildMenuKey, buildMenuListKey, buildPriceHistoryKey } from '../helpers/menu-cache.helper.js';
import { cacheGet, cacheSet } from '../../../libs/lib/cache.js';
import { invalidateMenuCache } from '../helpers/cache-Invalidation.helper.js';
import { FoodType, mealType, Prisma, MenuAudience, MenuItemStatus } from "@prisma/client";
import { NotFoundError } from '../../../errors/errors/apperror.js';




export const getMenuById = async (
    menuId: string
) => {

    const cacheKey =
        buildMenuKey(menuId);

    const cached =
        await cacheGet<any>(cacheKey);

    if(cached){

        return cached;

    }

    const menu =
        await prisma.menu_items.findUnique({

            where:{
                id:menuId
            },

            select:{
                id:true,
                name:true,
                status:true
            }

        });

    if(!menu){

        throw new NotFoundError("Menu not found");

    }

    await cacheSet(
        cacheKey,
        menu,
        600
    );

    return menu;

}


export const getMenus = async (
  activeOnly = true,
  page = 1,
  pageSize = 10,
  query?: string,
  audience?: MenuAudience,
  status?: MenuItemStatus,
  mealtype?: FoodType
) => {

  const cacheKey = await buildMenuListKey(
    activeOnly,
    page,
    pageSize,
    query,
    audience,
    status,
    mealtype
  );

  const cached = await cacheGet<any>(cacheKey);

  if (cached) return cached;

  const where: Prisma.menu_itemsWhereInput = {};

  if (status) {
    where.status = status;
  } else if (activeOnly) {
    where.status = "ACTIVE";
  }

  if (audience) {
    where.audience = audience;
  }

  if (mealtype) {
    where.mealtype = mealtype;
  }

  if (query) {
    const mealType = query.toUpperCase();

    if (Object.values(FoodType).includes(mealType as FoodType)) {
      // Query is a valid FoodType → filter by mealtype
      where.mealtype = mealType as FoodType;
    } else {
      // Query is not a FoodType → filter by name/description
      where.OR = [
        {
          name: {
            contains: query,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      ];
    }
  }



  const [menus, totalCount] = await Promise.all([
    prisma.menu_items.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        PriceHistory: {
          orderBy: {
            effctive_from: "desc",
          },
          select: {
            price: true
          },
          take: 1,
        },
      },
    }),

    prisma.menu_items.count({
      where,
    }),
  ]);

  const response = {
    data: menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      mealtype: menu.mealtype,
      audience: menu.audience,
      currentPrice: menu.PriceHistory[0]?.price ?? 0,
      active: menu.status === "ACTIVE",
    })),

    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };

  await cacheSet(cacheKey, response, 600);

  return response;
};


export const createMenu = async (
  input: CreateMenuInput,
  context: CreateMenuContext
) => {

  const effectiveFrom = new Date();

  const menus = await prisma.$transaction(
    async (tx: any) => {

      const menu =
        await tx.menu_items.create({
          data: {
            name: input.name,
            mealtype: input.mealtype,
            audience: input.audience || 'EMPLOYEE'
          }
        });

      await tx.price_history.create({
        data: {
          menuItemId: menu.id,
          price: input.price,
          effctive_from: effectiveFrom,
          effective_to: null,
          createdBy: context.AdminId,
        },
      });

      return menu;
    }
  );

  await createAuditLog({
    userId: context.AdminId,
    action: 'MENU_ITEM_CREATED',
    entityType: 'Menu_items',
    entityId: menus.id,
    metadata: {
      menuItemId: menus.id,
      menuname: input.name,
      audience: menus.audience,
      effectiveFrom: effectiveFrom,
      price: input.price
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  await invalidateMenuCache(menus.id);

  return menus;
};

export const updateMenu = async (
  id: string,
  input: UpdateMenuInput,
  context: CreateMenuContext
) => {

  const updated = await prisma.menu_items.update({
    where: {
      id
    },

    data: {
      ...(input.name && {
        name: input.name
      }),

      ...(input.mealtype && {
        mealtype:
          input.mealtype
      }),

      ...(input.audience && {
        audience:
          input.audience
      }),

      ...(input.active !== undefined && {
        status:
          input.active
            ? 'ACTIVE'
            : 'INACTIVE'
      })
    }
  });

  await createAuditLog({
    userId: context.AdminId,
    action: 'MENU_ITEM_UPDATED',
    entityType: 'Menu_items',
    entityId: id,
    metadata: {
      menuItemId: id,
      name: input.name,
      mealtype: input.mealtype,
      audience: input.audience,
      active: input.active
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  await invalidateMenuCache(id);

  return updated;
};

export const deleteMenu = async (
  id: string,
  context: CreateMenuContext
) => {
  const menu = await prisma.menu_items.findUnique({
    where: { id },
  });

  if (!menu) {
    throw new Error('Menu item not found');
  }

  await prisma.menu_items.delete({
    where: { id },
  });

  await invalidateMenuCache(id);

  await createAuditLog({
    userId: context.AdminId,
    action: 'MENU_ITEM_DELETED',
    entityType: 'Menu_items',
    entityId: id,
    metadata: {
      menuItemId: id,
      menuName: menu.name,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    id: menu.id,
  };
};

export const addPriceVersion = async (
  menuId: string,
  input: CreatePriceVersionInput,
  context: CreateMenuContext
) => {

  const currentPrice = await prisma.price_history.findFirst({
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


  const result = await prisma.$transaction(
    async (tx: any) => {
      // Find current active price

      await tx.price_history.update({
        where: { id: currentPrice.id },
        data: { effective_to: previousDay },
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


  await invalidateMenuCache(menuId);

  await createAuditLog({
    userId: context.AdminId,
    action: 'PRICE_HISTORY_CREATED',
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


  return result;
};


export const getPriceHistory = async (menuId: string) => {

  const cacheKey =
    buildPriceHistoryKey(menuId);

  const cached =
    await cacheGet<any>(cacheKey);

  if (cached)
    return cached;

  const history =
    await prisma.price_history.findMany({

      where: {
        menuItemId: menuId,
      },

      orderBy: {
        effctive_from: "desc",
      },

      include: {
        menuItem: true,
        createdByUser: true,
      },
    });

  const response =
    history.map((ph) => ({
      id: ph.id,

      menuItemId: ph.menuItemId,

      menuItem: {
        id: ph.menuItem.id,
        name: ph.menuItem.name,
        status: ph.menuItem.status,
        createdAt: ph.menuItem.createdAt,
      },

      price: ph.price,

      effectiveFrom: ph.effctive_from,

      effectiveTo: ph.effective_to,

      createdBy: ph.createdByUser.email,

      createdAt: ph.createdAt,
    }));

  await cacheSet(
    cacheKey,
    response,
    1800
  );

  return response;
};



export const previewMenuImport = async (
  file: Express.Multer.File
) => {
  const workbook = XLSX.read(file.buffer, {
    type: "buffer",
  });

  if (!workbook.SheetNames.length) {
    throw new Error("Excel file is empty");
  }

  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    throw new Error("Excel file is empty");
  }

  const sheet = workbook.Sheets[firstSheet];

  if (!sheet) {
    throw new Error("Excel file is empty");
  }

  const rows = XLSX.utils.sheet_to_json<any>(sheet, {
    defval: "",
    raw: false
  });

  const validRows: ImportMenuRow[] = [];
  const errors: ImportMenuError[] = [];

  if (rows.length === 0) {
    throw new Error("Excel file contains no data.");
  }

  //--------------------------------------------------
  // Collect all names from excel
  //--------------------------------------------------

  const excelNames = rows
    .map((r) => String(r.Name).trim())
    .filter(Boolean);

  //--------------------------------------------------
  // Get all existing menus with ONE query
  //--------------------------------------------------

  const existingMenus = await prisma.menu_items.findMany({
    where: {
      name: {
        in: excelNames,
      },
    },
    select: {
      name: true,
    },
  });

  const existingNames = new Set(
    existingMenus.map((m) => m.name.toLowerCase())
  );

  //--------------------------------------------------
  // Detect duplicate names INSIDE Excel
  //--------------------------------------------------

  const seenNames = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 2;

    const name = String(row.Name ?? "").trim();
    const mealtype = row.MealType;
    const price = Number(row.Price);



    //--------------------------------------------------
    // Required
    //--------------------------------------------------

    if (!name) {
      errors.push({
        row: excelRow,
        field: "Name",
        message: "Required",
      });

      continue;
    }

    if (!mealtype) {
      errors.push({
        row: excelRow,
        field: "MealType",
        message: "Required",
      });

      continue;
    }


    // mealtype validation with case insensitive check
    const validMealTypes = Object.values(mealType).map((mt) => mt.toLowerCase());

    if (!validMealTypes.includes(String(mealtype).toLowerCase())) {
      errors.push({
        row: excelRow,
        field: "MealType",
        message: `Invalid meal type. Must be one of: ${Object.values(mealType).join(", ")}`,
      });

    }
      //--------------------------------------------------
      // Price validation
      //--------------------------------------------------

      if (!Number.isFinite(price) || price <= 0) {
        errors.push({
          row: excelRow,
          field: "Price",
          message: "Price must be greater than zero",
        });

        continue;
      }

      //--------------------------------------------------
      // Duplicate inside Excel
      //--------------------------------------------------

      const lowerName = name.toLowerCase();

      if (seenNames.has(lowerName)) {
        errors.push({
          row: excelRow,
          field: "Name",
          message: "Duplicate menu in Excel",
        });

        continue;
      }

      seenNames.add(lowerName);

      //--------------------------------------------------
      // Already exists in database
      //--------------------------------------------------

      if (existingNames.has(lowerName)) {
        errors.push({
          row: excelRow,
          field: "Name",
          message: "Menu already exists",
        });

        continue;
      }

      //--------------------------------------------------
      // Effective date
      //--------------------------------------------------

      let effectiveFrom = new Date();

      if (row.EffectiveFrom) {
        const parsed = new Date(row.EffectiveFrom);

        if (Number.isNaN(parsed.getTime())) {
          errors.push({
            row: excelRow,
            field: "EffectiveFrom",
            message: "Invalid date",
          });

          continue;
        }

        effectiveFrom = parsed;
      }

      //--------------------------------------------------
      // Valid row
      //--------------------------------------------------

      validRows.push({
        row: excelRow,
        name,
        mealtype,
        price,
        effectiveFrom,
      });
    }

    //--------------------------------------------------
    // Save preview
    //--------------------------------------------------



    if (errors.length > 0) {
      return {
        previewToken: null,
        totalRows: rows.length,
        validRows,
        validCount: validRows.length,
        errorCount: errors.length,
        errors,
      };
    }

    const previewToken = saveImportPreview(
      validRows,
      "MENU"
    );

    return {
      previewToken,
      totalRows: rows.length,
      validRows,
      validCount: validRows.length,
      errorCount: errors.length,
      errors,
    };
  };