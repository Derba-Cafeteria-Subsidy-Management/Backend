import { prisma } from '../../../libs/lib/prisma.js';
import { ValidationError } from '../../../errors/errors/apperror.js';
import { createAuditLog } from '../../auth/service/audit.service.js';
import { getActiveSubsidyConfig } from '../../shared/helpers/pricing.helper.js';
import { parseDateOnly, startOfDay, toDateOnlyString } from '../../shared/helpers/date.helper.js';
import type {
  ActiveSubsidyResponse,
  CreateSubsidyInput,
  SubsidyContext,
} from '../types/subsidy.types.js';
import { setSubsidyCache } from '../../shared/cache/system.cache.js';

const mapSubsidyResponse = (config: {
  id: string;
  employee_share: number;
  company_share: number;
  effective_from: Date;
  effective_to: Date | null;
}): ActiveSubsidyResponse => ({
  id: config.id,
  employeePercent: config.employee_share,
  companyPercent: config.company_share,
  effectiveFrom: toDateOnlyString(config.effective_from),
  effectiveTo: config.effective_to ? toDateOnlyString(config.effective_to) : null,
});

export const getCurrentSubsidy = async (): Promise<ActiveSubsidyResponse> => {
  const config = await getActiveSubsidyConfig();
  return mapSubsidyResponse(config);
};

export const createSubsidyConfig = async (
  input: CreateSubsidyInput,
  context: SubsidyContext
) => {
  const effectiveFrom = parseDateOnly(input.effectiveFrom);
  const today = startOfDay(new Date());

  if (effectiveFrom < today) {
    throw new ValidationError('effectiveFrom must be today or in the future');
  }

  const config = await prisma.$transaction(async (tx) => {
    const currentConfig = await tx.subsidy_config.findFirst({
      where: {
        effective_to: null,
      },
      orderBy: { effective_from: 'desc' },
    });

    if (currentConfig) {
      const previousDay = new Date(effectiveFrom);
      previousDay.setDate(previousDay.getDate() - 1);

      await tx.subsidy_config.update({
        where: { id: currentConfig.id },
        data: { effective_to: previousDay },
      });
    }

    return tx.subsidy_config.create({
      data: {
        employee_share: input.employeePercent,
        company_share: input.companyPercent,
        effective_from: effectiveFrom,
        effective_to: null,
      },
    });
  });

  setSubsidyCache(config);

  await createAuditLog({
    userId: context.userId,
    action: 'create_subsidy_config',
    entityType: 'Subsidy_config',
    entityId: config.id,
    metadata: {
      employeePercent: input.employeePercent,
      companyPercent: input.companyPercent,
      effectiveFrom: input.effectiveFrom,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    id: config.id,
    employeePercent: config.employee_share,
    companyPercent: config.company_share,
    effectiveFrom: toDateOnlyString(config.effective_from),
  };
};
