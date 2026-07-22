import { Request, Response, NextFunction } from 'express';
import { getRequestContextFromRequest } from '../../auth/service/auth.service';
import {
  createGroup,
  updateGroup,
  activateGroup,
  deactivateGroup,
  getGroups,
  getGroupById,
  assignEmployeeToGroup,
  removeEmployeeFromGroup,
  moveEmployeeBetweenGroups,
  overrideSlot,
  getSchedule,
} from '../service/employee-group.service';
import {
  createGroupSchema,
  updateGroupSchema,
  assignMemberSchema,
  moveMemberSchema,
  overrideSlotSchema,
  listGroupsSchema,
} from '../validation/employee-group.validation';
import { ValidationError } from '../../../errors/errors/apperror';

export const createGroupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const parsed = createGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    }

    const group = await createGroup(
      {
        name: parsed.data.name,
        rotationOrder: parsed.data.rotationOrder,
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.effectiveDate !== undefined ? { effectiveFrom: parsed.data.effectiveDate } : {}),
      },
      {
        ...context,
        AdminId: req.user!.userId,
      }
    );

    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGroupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const parsed = updateGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    }

    const id = req.params.id as string;
    if (!id) {
      throw new ValidationError('Group ID is required');
    }

    const updateData: import('../types/employee-group.types').UpdateGroupInput = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.rotationOrder !== undefined) updateData.rotationOrder = parsed.data.rotationOrder;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.effectiveDate !== undefined) updateData.effectiveDate = parsed.data.effectiveDate;

    const group = await updateGroup(id, updateData, {
      ...context,
      AdminId: req.user!.userId,
    });

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const activateGroupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const id = req.params.id as string;
    if (!id) {
      throw new ValidationError('Group ID is required');
    }

    const { effectiveDate } = req.body || {};

    const group = await activateGroup(
      id,
      {
        ...context,
        AdminId: req.user!.userId,
      },
      effectiveDate
    );

    res.status(200).json({
      success: true,
      message: 'Employee group activated successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateGroupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const id = req.params.id as string;
    if (!id) {
      throw new ValidationError('Group ID is required');
    }

    const { effectiveDate } = req.body || {};

    const group = await deactivateGroup(
      id,
      {
        ...context,
        AdminId: req.user!.userId,
      },
      effectiveDate
    );

    res.status(200).json({
      success: true,
      message: 'Employee group deactivated successfully',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroupsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listGroupsSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    }

    const result = await getGroups({
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getGroupByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      throw new ValidationError('Group ID is required');
    }

    const group = await getGroupById(id);

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

export const assignEmployeeToGroupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const parsed = assignMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    }

    const result = await assignEmployeeToGroup(parsed.data.employeeId, parsed.data.groupId, {
      ...context,
      AdminId: req.user!.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Employee assigned to group successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const removeEmployeeFromGroupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const parsed = assignMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    }

    const result = await removeEmployeeFromGroup(parsed.data.employeeId, parsed.data.groupId, {
      ...context,
      AdminId: req.user!.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Employee removed from group successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const moveEmployeeBetweenGroupsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const parsed = moveMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    }

    const result = await moveEmployeeBetweenGroups(
      parsed.data.employeeId,
      parsed.data.fromGroupId,
      parsed.data.toGroupId,
      {
        ...context,
        AdminId: req.user!.userId,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Employee moved between groups successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getScheduleController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      throw new ValidationError('from and to dates are required');
    }

    const schedule = await getSchedule(from as string, to as string);

    res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    next(error);
  }
};

export const overrideSlotController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = getRequestContextFromRequest(req);
    const parsed = overrideSlotSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message || 'Validation failed');
    }

    const result = await overrideSlot(parsed.data.date, parsed.data.half, parsed.data.groupId, {
      ...context,
      AdminId: req.user!.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Shift slot overridden successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
