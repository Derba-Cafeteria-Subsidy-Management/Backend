import { prisma } from '../../../libs/lib/prisma.js';
import { NotFoundError, ValidationError } from '../../../errors/errors/apperror.js';
import { startOfDay } from './date.helper.js';

export interface PriceShares {
  menuPrice: number;
  employeeShare: number;
  companyShare: number;
}

export const roundMoney = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const getActiveMenuPrice = async (
  menuItemId: string,
  asOf: Date = new Date()
): Promise<number> => {
  const referenceDate = startOfDay(asOf);

  const menuItem = await prisma.menu_items.findUnique({
    where: { id: menuItemId },
  });

  if (!menuItem || menuItem.status !== 'ACTIVE') {
    throw new NotFoundError('Menu item not found or inactive');
  }

  const priceRecord = await prisma.price_history.findFirst({
    where: {
      menuItemId,
      effective_to: null,
    },
    orderBy: { effctive_from: 'desc' },
  });

  if (!priceRecord) {
    throw new ValidationError('No active price found for menu item');
  }

  return priceRecord.price;
};

export const getActiveSubsidyConfig = async (asOf: Date = new Date()) => {
  const referenceDate = startOfDay(asOf);

  const config = await prisma.subsidy_config.findFirst({
    where: {
       effective_to: null,
    }
  });

  if (!config) {
    throw new ValidationError('No active subsidy configuration found');
  }

  return config;
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
  asOf: Date = new Date()
): Promise<PriceShares> => {
  const menuPrice = await getActiveMenuPrice(menuItemId, asOf);
  const subsidy = await getActiveSubsidyConfig(asOf);

  return calculateShares(menuPrice, subsidy.employee_share, subsidy.company_share);
};

export const getCashierDisplayName = (email: string): string => {
  return email.split('@')[0] ?? email;
};
