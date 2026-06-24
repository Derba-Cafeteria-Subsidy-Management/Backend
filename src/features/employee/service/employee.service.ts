import { prisma } from "../../../libs/lib/prisma.js";
import { getMealsToday } from "../Helper/getmeal.helper.js";

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
    }
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
    }
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

    return {
        id: updated.id,
        updatedAt:
            updated.updated_at,
    };
};

export const deactivateEmployee =
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

        await prisma.employees.update({
            where: { id },
            data: {
                status: 'INACTIVE',
            },
        });
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

