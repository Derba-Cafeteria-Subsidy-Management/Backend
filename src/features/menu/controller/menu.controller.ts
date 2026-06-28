
import type { Request, Response, NextFunction } from 'express';

import {
    getMenus,
    createMenu,
    updateMenu,
    addPriceVersion,
    getPriceHistory,
    previewMenuImport
} from '../service/menu.service';
import { getImportPreview, removeImportPreview } from '../helpers/import-cache';
import { prisma } from '../../../libs/lib/prisma';
import { getRequestContextFromRequest } from '../../auth/service/auth.service';


export const getMenu =
    async (req: Request, res: Response) => {

        const activeOnly = req.query.activeOnly !== 'false';
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
        const query = req.query.query ? String(req.query.query) : undefined;

        const data =
            await getMenus(
                activeOnly,
                page,
                pageSize,
                query
            );

        res.status(200).json({
            success: true,
            data
        });
    };

export const getActiveMenu =
    async (req: Request, res: Response) => {

        const activeOnly = true;
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
        const query = req.query.query ? String(req.query.query) : undefined;

        const data =
            await getMenus(
                activeOnly,
                page,
                pageSize,
                query
            );

        res.status(200).json({
            success: true,
            data
        });
    };

export const createMenus =
    async (req: Request, res: Response) => {
        const context = getRequestContextFromRequest(req);
        const menu =
            await createMenu(
                req.body,
                {
                    ...context,
                    AdminId:req.user!.userId
                }
            );

        res.status(201).json({
            success: true,
            data: menu
        });
    };

export const updateMenus =
    async (req: Request, res: Response) => {

        // Argument of type 'string | string[]' is not assignable to parameter of type 'string'.Type 'string[]' is not assignable to type 'string'.
        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Menu ID is required'
            });
        }

        const context = getRequestContextFromRequest(req);

        const menu =
            await updateMenu(
                req.params.id,
                req.body,
                {
                    ...context,
                    AdminId: req.user!.userId
                }
            );

        res.status(200).json({
            success: true,
            data: {
                id: menu.id,
                updatedAt:
                    menu.updatedAt
            }
        });
    };

export const addPriceVersions =
    async (req: Request, res: Response) => {

        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Menu ID is required'
            });
        }

        const context = getRequestContextFromRequest(req);

        const result =
            await addPriceVersion(
                req.params.id,
                req.body,
                {
                    ...context,
                    AdminId:req.user!.userId

                }
                
            );

        res.status(201).json({
            success: true,
            data: result
        });
    };

export const getPriceHistorys =
    async (req: Request, res: Response) => {

        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Menu ID is required'
            });
        }

        const data =
            await getPriceHistory(
                req.params.id
            );

        res.status(200).json({
            success: true,
            data
        });
    };

export const importMenuPreviewController = async (
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

        const result = await previewMenuImport(req.file);

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

export const confirmMenuImportController = async (
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

        const rows = getImportPreview(previewToken);

        if (!rows) {
            return res.status(400).json({
                success: false,
                message: "Preview expired or not found",
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const createdMenus = await Promise.all(
                rows.map((r) =>
                    tx.menu_items.create({
                        data: {
                            name: r.name,
                            description: r.description ?? '',
                            PriceHistory: {
                                create: {
                                    price: r.price,
                                    effctive_from: r.effectiveFrom ?? new Date(),
                                    effective_to: null,
                                    createdBy: req.user!.userId,
                                },
                            },
                        },
                        include: { PriceHistory: true },
                    })
                )
            );

            return createdMenus;
        });



        removeImportPreview(previewToken);

        return res.status(201).json({
            success: true,
            message: "Menu import completed",
            inserted: result.length,
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Import failed",
        });
    }
};