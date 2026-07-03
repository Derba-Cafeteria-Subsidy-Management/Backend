import { prisma } from "../../../libs/lib/prisma.js";
import { cacheGet, cacheSet } from "../../../libs/lib/cache.js";
import { createAuditLog } from "../../auth/service/audit.service.js";
import { saveImportPreview } from "../../menu/helpers/import-cache.js";
import { getMealsToday } from "../Helper/getmeal.helper.js";
import { buildEmployeeKey, buildEmployeeListKey } from "../helpers/employee-cache.helper.js";
import { invalidateEmployeeCache } from "../helpers/cache-invalidation.helper.js";
import { CreateEmployeeContext, ImportEmployeeError, ImportEmployeeRow } from "../types/employee.types.js";
import XLSX from "xlsx";
import { NotFoundError } from "../../../errors/errors/apperror.js";

const EMPLOYEE_DETAIL_CACHE_TTL = 600;

export const getEmployees = async (
    employeeNumber?: string,
    name?: string,
    status?: string,
    page = 1,
    limit = 20


) => {
    const cacheKey = await buildEmployeeListKey(
        employeeNumber,
        name,
        status,
        page,
        limit
    );

    const cached = await cacheGet<any>(cacheKey);

    if (cached) {
        return cached;
    }

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
                status:
                    employee.status,
                photo:
                    employee.photo ? employee.photo : null
            }))
        );

    const response = {
        employees: employeeData,
        pagination: {
            page,
            limit,
            total,
        },
    };

    await cacheSet(cacheKey, response, 600);

    return response;
};

export const SearchEmployeeBy = async (
    employeeNumber: string
) => {

    const cacheKey =
        buildEmployeeKey(employeeNumber);

    const cached =
        await cacheGet<{
            id: string;
            employeeNumber: string;
            fullName: string;
            status: string;
            photo: string | null;
            createdAt: Date;
        }>(cacheKey);

    let employee;

    if (cached) {

        employee = cached;

    } else {

        const dbEmployee =
            await prisma.employees.findUnique({
                where: {
                    Employee_number: employeeNumber,
                },
                select: {
                    id: true,
                    Employee_number: true,
                    full_name: true,
                    status: true,
                    photo: true,
                    created_at: true,
                },
            });

        if (!dbEmployee) {
            throw new NotFoundError(
                "Employee not found"
            );
        }

        employee = {
            id: dbEmployee.id,
            employeeNumber:
                dbEmployee.Employee_number,
            fullName:
                dbEmployee.full_name,
            status:
                dbEmployee.status,
            photo:
                dbEmployee.photo,
            createdAt:
                dbEmployee.created_at,
        };

        await cacheSet(
            cacheKey,
            employee,
            EMPLOYEE_DETAIL_CACHE_TTL
        );
    }

    // Always read latest meal status
    const mealsToday =
        await getMealsToday(employee.id);

    return {
        ...employee,
        mealsToday,
    };
};



export const createEmployee = async (
    body: {
        employeeNumber: string;
        fullName: string;
        fingerprintId?: string;
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
                    }
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
                fingerprint_id:
                    body.fingerprintId ?? null,
                photo:
                    body.photo ?? null,
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
            fingerprint_id:
                body.fingerprintId ?? null,
            photo:
                body.photo ?? null
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
    });

    await invalidateEmployeeCache(employee.Employee_number);

    return {
        id: employee.id,
        employeeNumber:
            employee.Employee_number,
        status: employee.status,
    };
};

// export const getEmployeeById =
//     async (id: string) => {

//         const employee =
//             await prisma.employees.findUnique({
//                 where: { id },
//             });

//         if (!employee) {
//             throw new Error(
//                 'Employee not found'
//             );
//         }

//         const cacheKey = buildEmployeeKey(id);
//         const cached = await cacheGet<any>(cacheKey);

//         if (cached) {
//             return cached;
//         }

//         const response = {
//             id: employee.id,
//             employeeNumber: employee.Employee_number,
//             fullName: employee.full_name,
//             status: employee.status,
//             photo: employee.photo ?? null,
//             mealsToday: await getMealsToday(employee.id),
//             createdAt: employee.created_at,
//         };

//         await cacheSet(cacheKey, response, EMPLOYEE_DETAIL_CACHE_TTL);

//         return response;
//     };

export const updateEmployee = async (
    id: string,
    body: {
        fullName?: string;
        photo?: string | null;
        status?: string;
        fingerprintId?: string | null;
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

                ...(body.fingerprintId !== undefined && {
                    fingerprint_id:
                        body.fingerprintId ?? null,
                }),

                ...(body.photo && {
                    photo:
                        body.photo ?? null,
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

    await invalidateEmployeeCache(employee.Employee_number);

    return {
        id: updated.id,
        updatedAt:
            updated.updated_at,
    };
};

export const deleteEmployee = async (
    id: string,
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

    await prisma.employees.delete({
        where: { id },
    });

    await createAuditLog({
        userId: context.AdminId,
        action: 'EMPLOYEE_DELETED',
        entityType: 'Employees',
        entityId: employee.id,
        metadata: {
            id: employee.id,
            employeeNumber: employee.Employee_number,
            fullName: employee.full_name,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
    });

    await invalidateEmployeeCache(employee.Employee_number);

    return {
        id: employee.id,
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

            await invalidateEmployeeCache(employee.Employee_number);

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

            await invalidateEmployeeCache(employee.Employee_number);

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

        const cacheKey = buildEmployeeKey(employee.id);
        const cached = await cacheGet<any>(cacheKey);

        if (cached) {
            return cached;
        }

        const response = {
            id: employee.id,
            employeeNumber: employee.Employee_number,
            fullName: employee.full_name,
            status: employee.status,
            photo: employee.photo,
            mealsToday: await getMealsToday(employee.id),
            createdAt: employee.created_at,
        };

        await cacheSet(cacheKey, response, EMPLOYEE_DETAIL_CACHE_TTL);

        return response;
    };

export const previewEmployeeImport =
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

        const validRows: ImportEmployeeRow[] = [];

        const errors: ImportEmployeeError[] = [];

        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            const row =
                data[i];

            const excelRow =
                i + 2;

            if (!row.fullName || !row.EmployeeNumber) {

                errors.push({
                    row: excelRow,
                    field: `${!row.fullName ? 'fullName' : 'EmployeeNumber'}`,
                    message: "Required"
                });

                continue;
            }


            const exists =
                await prisma.employees.findFirst({

                    where: {

                        Employee_number:
                            row.EmployeeNumber,

                    }

                });

            if (exists) {

                errors.push({

                    row: excelRow,

                    field: "EmployeeNumber",

                    message:
                        "Employee already exists"

                });

                continue;
            }

            validRows.push({

                row: excelRow,

                EmployeeNumber: row.EmployeeNumber,

                fullName: row.fullName,

                fingerprintId: row.fingerprintId ?? null,

                photo: row.photo ?? null


            });

        }

        const previewToken =
            saveImportPreview(
                validRows,
                "EMPLOYEE"
            );

        return {

            previewToken,

            totalRows:
                data.length,

            validRows,

            errors

        };

    };