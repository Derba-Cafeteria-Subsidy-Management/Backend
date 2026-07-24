import { prisma } from "../../../libs/lib/prisma.js";
import { cacheGet, cacheSet } from "../../../libs/lib/cache.js";
import { createAuditLog } from "../../auth/service/audit.service.js";
import { saveImportPreview } from "../../menu/helpers/import-cache.js";
import { getMealsToday } from "../Helper/getmeal.helper.js";
import { buildEmployeeKey, buildEmployeeListKey } from "../helpers/employee-cache.helper.js";
import { invalidateEmployeeCache } from "../helpers/cache-invalidation.helper.js";
import { CreateEmployeeContext, ImportEmployeeError, ImportEmployeeRow, CreateEmployeeInput, UpdateEmployeeInput } from "../types/employee.types.js";
import XLSX from "xlsx";
import { ConflictError, NotFoundError, ValidationError } from "../../../errors/errors/apperror.js";
import { getAuthenticationSettings } from "../../system-settings/service/system-settings.service.js";
import { Prisma, SubsidyType, EmployeeType } from "@prisma/client";

const EMPLOYEE_DETAIL_CACHE_TTL = 600;

export const getEmployees = async (
    subsidytype?: SubsidyType,
    employeeNumber?: string,
    name?: string,
    status?: string,
    employeeType?: EmployeeType,
    groupId?: string,
    page = 1,
    limit = 20
) => {
    const cacheKey = await buildEmployeeListKey(
        subsidytype,
        employeeNumber,
        name,
        status,
        employeeType,
        groupId,
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

        ...(subsidytype && {
            subsidyType: subsidytype as any
        }),

        ...(employeeType && {
            employeeType
        }),

        ...(groupId && {
            groupMembers: {
                some: {
                    groupId,
                    active: true
                }
            }
        })
    };

    const employees =
        await prisma.employees.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                created_at: 'desc',
            },
            include: {
                groupMembers: {
                    where: { active: true },
                    include: {
                        group: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

    const total =
        await prisma.employees.count({
            where,
        });

    const employeeData = employees.map((employee) => ({
        id: employee.id,
        employeeNumber: employee.Employee_number,
        fullName: employee.full_name,
        status: employee.status,
        photo: employee.photo ? employee.photo : null,
        subsidytype: employee.subsidyType,
        employeeType: employee.employeeType,
        currentGroup: employee.groupMembers?.[0]?.group ? {
            id: employee.groupMembers[0].group.id,
            name: employee.groupMembers[0].group.name,
        } : null
    }));

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




export const SearchSpecialEmployeeBy = async (
    employeeNumber?: string,
    name?: string
) => {
    if (!employeeNumber && !name) {
        throw new ValidationError(
            "Employee number or employee name is required."
        );
    }

    const cacheKey = `special-employee:${employeeNumber ?? ""}:${name ?? ""}`;

    const cached = await cacheGet<{
        id: string;
        employeeNumber: string;
        fullName: string;
        status: string;
        subsidyType: SubsidyType;
        photo: string | null;
        createdAt: Date;
    }>(cacheKey);

    let employee;

    if (cached) {
        employee = cached;
    } else {
        const dbEmployee = await prisma.employees.findFirst({
            where: {
                subsidyType: SubsidyType.SPECIAL,
                employeeType: EmployeeType.NORMAL,



                ...(employeeNumber && {
                    Employee_number: employeeNumber,
                }),

                ...(name && {
                    full_name: {
                        contains: name,
                        mode: "insensitive",
                    },
                }),
            },

            select: {
                id: true,
                Employee_number: true,
                full_name: true,
                status: true,
                subsidyType: true,
                employeeType: true,
                photo: true,
                created_at: true,
                groupMembers: {
                    where: { active: true },
                    select: {
                        group: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
        });

        if (!dbEmployee) {
            throw new NotFoundError(
                "Special employee not found."
            );
        }

        employee = {
            id: dbEmployee.id,
            employeeNumber: dbEmployee.Employee_number,
            fullName: dbEmployee.full_name,
            status: dbEmployee.status,
            subsidyType: dbEmployee.subsidyType,
            employeeType: dbEmployee.employeeType,
            photo: dbEmployee.photo,
            createdAt: dbEmployee.created_at,
            currentGroup: dbEmployee.groupMembers?.[0]?.group ? {
                id: dbEmployee.groupMembers[0].group.id,
                name: dbEmployee.groupMembers[0].group.name,
            } : null
        };

        await cacheSet(
            cacheKey,
            employee,
            EMPLOYEE_DETAIL_CACHE_TTL
        );
    }

    const mealsToday = await getMealsToday(employee.id);

    return {
        ...employee,
        mealsToday,
    };
};



export const SearchEmployeeBy = async (
    employeeNumber: string
) => {

    // check on getAuthenticationSettings employeeSearchEnabled






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
                    employeeType: true,
                    created_at: true,
                    groupMembers: {
                        where: { active: true },
                        select: {
                            group: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
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
            employeeType:
                dbEmployee.employeeType,
            createdAt:
                dbEmployee.created_at,
            currentGroup: dbEmployee.groupMembers?.[0]?.group ? {
                id: dbEmployee.groupMembers[0].group.id,
                name: dbEmployee.groupMembers[0].group.name,
            } : null
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
    body: CreateEmployeeInput,
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
        throw new ConflictError(
            'Employee already exists'
        );
    }

    if (body.employeeType === EmployeeType.SHIFT) {
        if (!body.groupId) {
            throw new ValidationError('Group assignment is required for SHIFT employees');
        }
        const group = await prisma.employeeGroup.findUnique({
            where: { id: body.groupId }
        });
        if (!group || group.status !== 'ACTIVE') {
            throw new ValidationError('Assigned group not found or is inactive');
        }
    }

    const employee = await prisma.$transaction(async (tx) => {
        const emp = await tx.employees.create({
            data: {
                Employee_number: body.employeeNumber,
                full_name: body.fullName,
                fingerprint_id: body.fingerprintId ?? null,
                photo: body.photo ?? null,
                subsidyType: body.subsidyType ?? SubsidyType.NORMAL,
                employeeType: body.employeeType ?? EmployeeType.NORMAL
            },
        });

        if (body.employeeType === EmployeeType.SHIFT && body.groupId) {
            await tx.employeeGroupMember.create({
                data: {
                    employeeId: emp.id,
                    groupId: body.groupId,
                    active: true
                }
            });
        }

        return emp;
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
                body.photo ?? null,
            employeeType:
                employee.employeeType
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
    });

    if (body.employeeType === EmployeeType.SHIFT && body.groupId) {
        await createAuditLog({
            userId: context.AdminId,
            action: 'GROUP_MEMBER_ASSIGNED',
            entityType: 'EmployeeGroupMember',
            entityId: employee.id, // Reference Employee or search member later
            metadata: {
                employeeId: employee.id,
                employeeNumber: employee.Employee_number,
                groupId: body.groupId,
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
        });
    }

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
    body: UpdateEmployeeInput,
    context: CreateEmployeeContext
) => {
    const current = await prisma.employees.findUnique({
        where: { id },
    });

    if (!current) {
        throw new NotFoundError(
            'Employee not found'
        );
    }

    const nextType = body.employeeType ?? current.employeeType;

    const updated = await prisma.$transaction(async (tx) => {
        if (current.employeeType === EmployeeType.NORMAL && nextType === EmployeeType.SHIFT) {
            if (!body.groupId) {
                throw new ValidationError('Group assignment is required when changing to SHIFT type');
            }
            const group = await tx.employeeGroup.findUnique({ where: { id: body.groupId } });
            if (!group || group.status !== 'ACTIVE') {
                throw new ValidationError('Assigned group not found or is inactive');
            }
            await tx.employeeGroupMember.create({
                data: {
                    employeeId: id,
                    groupId: body.groupId,
                    active: true
                }
            });
        } else if (current.employeeType === EmployeeType.SHIFT && nextType === EmployeeType.NORMAL) {
            // Close active group membership
            await tx.employeeGroupMember.updateMany({
                where: { employeeId: id, active: true },
                data: { active: false, leftAt: new Date() }
            });
        } else if (current.employeeType === EmployeeType.SHIFT && nextType === EmployeeType.SHIFT && body.groupId) {
            const activeMem = await tx.employeeGroupMember.findFirst({
                where: { employeeId: id, active: true }
            });
            if (!activeMem || activeMem.groupId !== body.groupId) {
                const group = await tx.employeeGroup.findUnique({ where: { id: body.groupId } });
                if (!group || group.status !== 'ACTIVE') {
                    throw new ValidationError('Assigned group not found or is inactive');
                }
                if (activeMem) {
                    await tx.employeeGroupMember.update({
                        where: { id: activeMem.id },
                        data: { active: false, leftAt: new Date() }
                    });
                }
                await tx.employeeGroupMember.create({
                    data: {
                        employeeId: id,
                        groupId: body.groupId,
                        active: true
                    }
                });
            }
        }

        return tx.employees.update({
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

                ...(body.photo !== undefined && {
                    photo:
                        body.photo ?? null,
                }),

                ...(body.status && {
                    status:
                        body.status as any,
                }),

                ...(body.subsidyType && {
                    subsidyType: body.subsidyType,
                }),

                ...(body.employeeType && {
                    employeeType: body.employeeType,
                }),
            },
        });
    });

    await createAuditLog({
        userId: context.AdminId,
        action: 'update_employee',
        entityType: 'Employees',
        entityId: current.id,
        metadata: {
            id: updated.id,
            updatedAt:
                updated.updated_at,
            employeeType: updated.employeeType,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
    });

    if (current.employeeType !== updated.employeeType) {
        await createAuditLog({
            userId: context.AdminId,
            action: 'EMPLOYEE_TYPE_CHANGED',
            entityType: 'Employees',
            entityId: current.id,
            metadata: {
                from: current.employeeType,
                to: updated.employeeType,
            },
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
        });
    }

    await invalidateEmployeeCache(current.Employee_number);

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

    try {
        await prisma.employees.delete({
            where: { id },
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2003'
        ) {
            throw new ConflictError(
                'Cannot delete employee with transaction history. Deactivate them instead.'
            );
        }
        throw error;
    }

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



export const previewEmployeeImport = async (
    file: Express.Multer.File
) => {
    //--------------------------------------------------
    // Read workbook
    //--------------------------------------------------

    const workbook = XLSX.read(file.buffer, {
        type: "buffer",
    });

    if (workbook.SheetNames.length === 0) {
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

    //--------------------------------------------------
    // Read rows
    //--------------------------------------------------

    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
        defval: "",
        raw: false,
    });

    if (rows.length === 0) {
        throw new Error("Excel file contains no data.");
    }

    //--------------------------------------------------
    // Collect employee numbers
    //--------------------------------------------------

    const employeeNumbers = rows
        .map((row) => String(row.EmployeeNumber ?? "").trim())
        .filter(Boolean);

    //--------------------------------------------------
    // Get existing employees (ONE query)
    //--------------------------------------------------

    const existingEmployees = await prisma.employees.findMany({
        where: {
            Employee_number: {
                in: employeeNumbers,
            },
        },
        select: {
            Employee_number: true,
        },
    });

    const existingEmployeeNumbers = new Set(
        existingEmployees.map((e) => e.Employee_number.toLowerCase())
    );

    //--------------------------------------------------
    // Validation containers
    //--------------------------------------------------

    const validRows: ImportEmployeeRow[] = [];

    const errors: ImportEmployeeError[] = [];

    const seenEmployeeNumbers = new Set<string>();

    //--------------------------------------------------
    // Validate rows
    //--------------------------------------------------

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const excelRow = i + 2;

        const employeeNumber = String(
            row.EmployeeNumber ?? ""
        ).trim();

        const fullName = String(
            row.fullName ?? ""
        ).trim();

        const fingerprintId = String(
            row.fingerprintId ?? ""
        ).trim();

        const photo = String(
            row.photo ?? ""
        ).trim();

        //--------------------------------------------------
        // Required fields
        //--------------------------------------------------

        if (!employeeNumber) {
            errors.push({
                row: excelRow,
                field: "EmployeeNumber",
                message: "Required",
            });

            continue;
        }

        if (!fullName) {
            errors.push({
                row: excelRow,
                field: "fullName",
                message: "Required",
            });

            continue;
        }

        //--------------------------------------------------
        // Duplicate inside Excel
        //--------------------------------------------------

        const normalizedEmployeeNumber =
            employeeNumber.toLowerCase();

        if (
            seenEmployeeNumbers.has(
                normalizedEmployeeNumber
            )
        ) {
            errors.push({
                row: excelRow,
                field: "EmployeeNumber",
                message: "Duplicate employee in Excel",
            });

            continue;
        }

        seenEmployeeNumbers.add(
            normalizedEmployeeNumber
        );

        //--------------------------------------------------
        // Already exists in database
        //--------------------------------------------------

        if (
            existingEmployeeNumbers.has(
                normalizedEmployeeNumber
            )
        ) {
            errors.push({
                row: excelRow,
                field: "EmployeeNumber",
                message: "Employee already exists",
            });

            continue;
        }

        //--------------------------------------------------
        // Valid row
        //--------------------------------------------------

        validRows.push({
            row: excelRow,
            EmployeeNumber: employeeNumber,
            fullName,
            fingerprintId: fingerprintId || null,
            photo: photo || null,
        });
    }

    //--------------------------------------------------
    // Return validation errors
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

    //--------------------------------------------------
    // Save preview
    //--------------------------------------------------

    const previewToken = saveImportPreview(
        validRows,
        "EMPLOYEE"
    );

    return {
        previewToken,
        totalRows: rows.length,
        validRows,
        validCount: validRows.length,
        errorCount: 0,
        errors: [],
    };
};