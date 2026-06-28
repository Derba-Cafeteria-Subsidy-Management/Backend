import { prisma } from "../../../libs/lib/prisma.js";
import { createAuditLog } from "../../auth/service/audit.service.js";
import { getMealsToday } from "../Helper/getmeal.helper.js";
import { CreateEmployeeContext } from "../types/employee.types.js";

export const getEmployees = async (
    employeeNumber?: string,
    name?: string,
    department?: string,
    status?: string,
    page = 1,
    limit = 20


) => {
    const where: any = {
        ...(employeeNumber && {
            Employee_number: {
                contains: employeeNumber,
                mode: 'insensitive',
            },
        }),

        ...(name && {
            full_name: {
                contains: name,
                mode: 'insensitive',
            },
        }),

        ...(department && {
            department,
        }),

        ...(status && {
            status: status as any,
        }),
    };

    const employees =
        await prisma.employees.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                created_at: 'desc',
            },
        });

    const total =
        await prisma.employees.count({
            where,
        });

    const employeeData =
        await Promise.all(
            employees.map(async (employee) => ({
                id: employee.id,
                employeeNumber:
                    employee.Employee_number,
                fullName:
                    employee.full_name,
                department:
                    employee.department,
                status:
                    employee.status,
                photo:
                    employee.photo,
                mealsToday:
                    await getMealsToday(
                        employee.id
                    ),
            }))
        );

    return {
        employees: employeeData,
        pagination: {
            page,
            limit,
            total,
        },
    };
};

export const createEmployee = async (
    body: {
        employeeNumber: string;
        fullName: string;
        department: string;
        fingerprintId: string;
        photo?: string;

    },
    context: CreateEmployeeContext
) => {

    const exists =
        await prisma.employees.findFirst({
            where: {
                OR: [
                    {
                        Employee_number:
                            body.employeeNumber,
                    },
                    {
                        fingerprint_id:
                            body.fingerprintId,
                    },
                ],
            },
        });

    if (exists) {
        throw new Error(
            'Employee already exists'
        );
    }

    const employee =
        await prisma.employees.create({
            data: {
                Employee_number:
                    body.employeeNumber,
                full_name:
                    body.fullName,
                department:
                    body.department,
                fingerprint_id:
                    body.fingerprintId,
                photo:
                    body.photo ?? '',
            },
        });

    await createAuditLog({
        userId: context.AdminId,
        action: 'create_employee',
        entityType: 'Employees',
        entityId: employee.id,
        metadata: {
            Employee_number:
                body.employeeNumber,
            full_name:
                body.fullName,
            department:
                body.department,
            fingerprint_id:
                body.fingerprintId,
            photo:
                body.photo ?? ''
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
    });

    return {
        id: employee.id,
        employeeNumber:
            employee.Employee_number,
        status: employee.status,
    };
};

export const getEmployeeById =
    async (id: string) => {

        const employee =
            await prisma.employees.findUnique({
                where: { id },
            });

        if (!employee) {
            throw new Error(
                'Employee not found'
            );
        }

        return {
            id: employee.id,
            employeeNumber:
                employee.Employee_number,
            fullName:
                employee.full_name,
            department:
                employee.department,
            status:
                employee.status,
            photo:
                employee.photo,
            mealsToday:
                await getMealsToday(
                    employee.id
                ),
            createdAt:
                employee.created_at,
        };
    };

export const updateEmployee = async (
    id: string,
    body: {
        fullName?: string;
        department?: string;
        photo?: string;
        status?: string;
    },
    context: CreateEmployeeContext
) => {

    const employee =
        await prisma.employees.findUnique({
            where: { id },
        });

    if (!employee) {
        throw new Error(
            'Employee not found'
        );
    }

    const updated =
        await prisma.employees.update({
            where: { id },
            data: {
                ...(body.fullName && {
                    full_name:
                        body.fullName,
                }),

                ...(body.department && {
                    department:
                        body.department,
                }),

                ...(body.photo && {
                    photo:
                        body.photo,
                }),

                ...(body.status && {
                    status:
                        body.status as any,
                }),
            },
        });


    await createAuditLog({
        userId: context.AdminId,
        action: 'update_employee',
        entityType: 'Employees',
        entityId: employee.id,
        metadata: {
            id: updated.id,
            updatedAt:
                updated.updated_at,

        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
    });

    return {
        id: updated.id,
        updatedAt:
            updated.updated_at,
    };
};

export const deactivateEmployee =
    async (id: string, context: CreateEmployeeContext) => {

        const employee =
            await prisma.employees.findUnique({
                where: { id },
            });

        if (!employee) {
            throw new Error(
                'Employee not found'
            );
        }

        if (employee.status == 'ACTIVE') {

            await prisma.employees.update({
                where: { id },
                data: {
                    status: 'INACTIVE',
                },
            });

            await createAuditLog({
                userId: context.AdminId,
                action: 'deactivate_employee',
                entityType: 'Employees',
                entityId: employee.id,
                metadata: {
                    id: employee.id
                },
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            });

        } else {

            await prisma.employees.update({
                where: { id },
                data: {
                    status: 'ACTIVE',
                },
            });

            await createAuditLog({
                userId: context.AdminId,
                action: 'activate_employee',
                entityType: 'Employees',
                entityId: employee.id,
                metadata: {
                    id: employee.id
                },
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            });

        }


    };


export const fingerprintScan =
    async (
        fingerprintId: string
    ) => {

        const employee =
            await prisma.employees.findFirst({
                where: {
                    fingerprint_id:
                        fingerprintId,
                    status: 'ACTIVE',
                },
            });

        if (!employee) {
            throw new Error(
                'Fingerprint not recognized'
            );
        }

        return {
            id: employee.id,
            employeeNumber:
                employee.Employee_number,
            fullName:
                employee.full_name,
            department:
                employee.department,
            status:
                employee.status,
            photo:
                employee.photo,
            mealsToday:
                await getMealsToday(
                    employee.id
                ),
            createdAt:
                employee.created_at,
        };
    };

