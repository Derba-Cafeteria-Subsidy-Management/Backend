import { prisma } from "../../../libs/lib/prisma";
import { getRequestContextFromRequest } from "../../auth/service/auth.service";
import { getSystemSettings } from "../../system-settings/helpers/system-settings.helper.ts/system-settings.helper";
import { createEmployee, deactivateEmployee, fingerprintScan, getEmployeeById, getEmployees, updateEmployee } from "../service/employee.service";

import type { Request, Response, NextFunction } from 'express';

export const getEmployeesController =
    async (req: Request, res: Response) => {

        const employeeNumber =
            req.query.employeeNumber as string;

        const name =
            req.query.name as string;

        const department =
            req.query.department as string;

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
        const isSearching = employeeNumber || name || department || status;

        if (isCashier && !settings.employeeSearchEnabled && isSearching) {
            return res.status(403).json({
                success: false,
                message: "Employee search is disabled for cashiers",
            });
        }

        const data = await getEmployees(
            employeeNumber,
            name,
            department,
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

export const getEmployeeByIdController =
    async (req: Request, res: Response) => {


        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required'
            });
        }

        const data =
            await getEmployeeById(
                req.params.id
            );

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


