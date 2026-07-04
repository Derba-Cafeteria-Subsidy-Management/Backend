import { prisma } from "../../../libs/lib/prisma";
import { getRequestContextFromRequest } from "../../auth/service/auth.service";
import { getImportPreview, removeImportPreview } from "../../menu/helpers/import-cache";
import { getSystemSettings } from "../../system-settings/helpers/system-settings.helper.ts/system-settings.helper";
import { createEmployee, deleteEmployee, deactivateEmployee, fingerprintScan, getEmployees, previewEmployeeImport, updateEmployee, SearchEmployeeBy } from "../service/employee.service";
import { invalidateEmployeeCache } from "../helpers/cache-invalidation.helper.js";

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from "node:crypto";
import { ImportEmployeeRow } from "../types/employee.types";

export const getEmployeesController =
    async (req: Request, res: Response) => {

        const employeeNumber =
            req.query.employeeNumber as string;

        const name =
            req.query.name as string;


        const status =
            req.query.status as string;

        const page =
            req.query.page
                ? parseInt(req.query.page as string)
                : 1;

        const limit =
            req.query.limit
                ? parseInt(req.query.limit as string)
                : 20;

        const isCashier = req.user!.role === "CASHIER";
        const settings = await getSystemSettings();
        const isSearching = employeeNumber || name || status;

        if (isCashier && !settings.employeeSearchEnabled && isSearching) {
            return res.status(403).json({
                success: false,
                message: "Employee search is disabled for cashiers",
            });
        }

        const data = await getEmployees(
            employeeNumber,
            name,
            status,
            page,
            limit
        );

        res.status(200).json({
            success: true,
            data,
        });
    };

export const createEmployeeController =
    async (req: Request, res: Response) => {

        const context = getRequestContextFromRequest(req);

        const data =
            await createEmployee(req.body,
                {
                    ...context,
                    AdminId: req.user!.userId
                }

            );

        res.status(201).json({
            success: true,
            data,
        });
    };

export const getEmployeeByNUmberController =
    async (req: Request, res: Response) => {


        if (!req.params.employee_Number|| Array.isArray(req.params.employee_Number)) {
            return res.status(400).json({
                success: false,
                message: 'Employee Number is required'
            });
        }

        const data =
            await SearchEmployeeBy(req.params.employee_Number);

        res.status(200).json({
            success: true,
            data,
        });
    };

export const updateEmployeeController =
    async (req: Request, res: Response) => {

        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const context = getRequestContextFromRequest(req);

        const data =
            await updateEmployee(
                req.params.id,
                req.body,
                {
                    ...context,
                    AdminId: req.user!.userId
                }
            );

        res.status(200).json({
            success: true,
            data,
        });
    };

export const deleteEmployeeController =
    async (req: Request, res: Response) => {

        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const context = getRequestContextFromRequest(req);

        const data = await deleteEmployee(
            req.params.id,
            {
                ...context,
                AdminId: req.user!.userId
            }
        );

        res.status(200).json({
            success: true,
            message: 'Employee deleted successfully',
            data,
        });
    };

export const deactivateEmployeeController =
    async (req: Request, res: Response) => {

        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const context = getRequestContextFromRequest(req);

        await deactivateEmployee(
            req.params.id,
            {
                ...context,
                AdminId: req.user!.userId
            }
        );

        res.status(200).json({
            success: true,
            message:
                'Employee deactivated. Access revoked at all stations.',
        });
    };

export const fingerprintScanController =
    async (req: Request, res: Response) => {

        const data =
            await fingerprintScan(
                req.body.fingerprintId
            );

        res.status(200).json({
            success: true,
            data,
        });
    };

// import type { Request, Response } from "express";
// import { prisma } from "../../../config/prisma.js";
// import {
//   getImportPreview,
//   removeImportPreview,
// } from "../helpers/import-preview.cache.js";

export const confirmEmployeeImportController = async (
    req: Request,
    res: Response
) => {
    try {
        const { previewToken } = req.body;

        if (!previewToken) {
            return res.status(400).json({
                success: false,
                message: "previewToken is required",
            });
        }

        const preview = getImportPreview(previewToken);

        if (!preview) {
            return res.status(400).json({
                success: false,
                message: "Preview expired or not found",
            });
        }

        if (preview.type !== "EMPLOYEE") {
            return res.status(400).json({
                success: false,
                message: "Invalid preview token",
            });
        }

        const rows = preview.rows;

        const employeedate = []

        for (const row of rows as ImportEmployeeRow[]) {
            const id = randomUUID();
            employeedate.push({
                id,
                Employee_number: row.EmployeeNumber,
                full_name: row.fullName,
                fingerprint_id: row.fingerprintId ?? null,
                photo: row.photo ?? null,
            });
        }


        await prisma.$transaction([

            prisma.employees.createMany({
                data: employeedate
            }),



        ]);

        await invalidateEmployeeCache();

        removeImportPreview(previewToken);

        return res.status(201).json({
            success: true,
            message: "Employee import completed",
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message ?? "Import failed",
        });
    }
};

export const importEmployeePreviewController = async (
    req: Request,
    res: Response
) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Excel file is required",
            });
        }

        const result = await previewEmployeeImport(req.file);

        return res.status(200).json({
            success: true,
            data: result,
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Preview failed",
        });
    }
};

