import { prisma } from '../../../libs/lib/prisma.js';
import { NotFoundError, ValidationError } from '../../../errors/errors/apperror.js';
import { startOfDay } from './date.helper.js';
import { getSubsidyCache, setSubsidyCache } from '../cache/system.cache.js';
import { Prisma, PrismaClient } from '@prisma/client';
import { buildCurrentPriceKey } from '../../menu/helpers/menu-cache.helper.js';
import { cacheGet, cacheSet } from '../../../libs/lib/cache.js';

export interface PriceShares {
  menuPrice: number;
  employeeShare: number;
  companyShare: number;
}

export const roundMoney = (value: number): number => {
  return Math.round(value * 100) / 100;
};



type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export const getActiveMenuPrice = async (
  db: PrismaExecutor,
  menuItemId: string,
): Promise<number> => {


  const cacheKey = await buildCurrentPriceKey(
    menuItemId
  );

  const cached = await cacheGet<any>(cacheKey);

  if (cached) return cached;

  const menuItem = await db.menu_items.findUnique({
    where: { id: menuItemId },
  });

  if (!menuItem || menuItem.status !== 'ACTIVE') {
    throw new NotFoundError('Menu item not found or inactive');
  }

  const priceRecord = await db.price_history.findFirst({
    where: {
      menuItemId,
      effective_to: null,
    },
    orderBy: { effctive_from: 'desc' },
  });

  if (!priceRecord) {
    throw new ValidationError('No active price found for menu item');
  }

  await cacheSet(cacheKey, priceRecord.price);

  return priceRecord.price;
};



export const getActiveSubsidyConfig = async () => {

  const cached = getSubsidyCache();

  if (cached) {
    return cached;
  }

  const subsidy = await prisma.subsidy_config.findFirst({

    where: {
      effective_to: null,
    },

    orderBy: {
      effective_from: "desc",
    },

  });

  if (!subsidy) {
    throw new NotFoundError("No active subsidy configuration found.");
  }

  setSubsidyCache(subsidy);

  return subsidy;

};

export const calculateShares = (
  menuPrice: number,
  employeePercent: number,
  companyPercent: number
): PriceShares => {
  const employeeShare = roundMoney(menuPrice * (employeePercent / 100));
  const companyShare = roundMoney(menuPrice * (companyPercent / 100));

  return {
    menuPrice: roundMoney(menuPrice),
    employeeShare,
    companyShare,
  };
};

export const getPriceSharesForMenuItem = async (
  menuItemId: string,
  db: PrismaExecutor
): Promise<PriceShares> => {
  const menuPrice = await getActiveMenuPrice(db, menuItemId);
  const subsidy = await getActiveSubsidyConfig();

  return calculateShares(menuPrice, subsidy.employee_share, subsidy.company_share);
};

export const getCashierDisplayName = (email: string): string => {
  return email.split('@')[0] ?? email;
};
