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

        const data =
            await createEmployee(req.body);

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

        const data =
            await updateEmployee(
                req.params.id,
                req.body
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

        await deactivateEmployee(
            req.params.id
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


