
import type { Request, Response, NextFunction } from 'express';

import {
    getMenus,
    createMenu,
    updateMenu,
    deleteMenu,
    addPriceVersion,
    getPriceHistory,
    previewMenuImport
} from '../service/menu.service';
import { getImportPreview, removeImportPreview } from '../helpers/import-cache';
import { prisma } from '../../../libs/lib/prisma';
import { getRequestContextFromRequest } from '../../auth/service/auth.service';
import { bumpMenuCacheVersion } from '../helpers/menu-cache.helper';
import { ImportMenuRow } from '../types/menu.types';

import { randomUUID } from "crypto";


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
                    AdminId: req.user!.userId
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

export const deleteMenus =
    async (req: Request, res: Response) => {

        if (!req.params.id || Array.isArray(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Menu ID is required'
            });
        }

        const context = getRequestContextFromRequest(req);

        const data = await deleteMenu(
            req.params.id,
            {
                ...context,
                AdminId: req.user!.userId
            }
        );

        res.status(200).json({
            success: true,
            message: 'Menu item deleted successfully',
            data
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
                    AdminId: req.user!.userId

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

        const preview = getImportPreview(previewToken);

        if (!preview) {
            return res.status(400).json({
                success: false,
                message: "Preview expired or not found",
            });
        }

        if (preview.type !== "MENU") {
            return res.status(400).json({
                success: false,
                message: "Invalid preview type",
            });
        }

        const rows = preview.rows;

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: "No valid rows to import",
            });
        }

        const menuData = [];
        const historyData = [];

        for (const row of rows as ImportMenuRow[]) {

            const id = randomUUID();

            menuData.push({
                id,
                name: row.name,
                mealtype: row.mealtype,
            });

            historyData.push({
                menuItemId: id,
                price: row.price,
                effctive_from: row.effectiveFrom ?? new Date(),
                effective_to: null,
                createdBy: req.user!.userId,
            });

        }


        await prisma.$transaction([

            prisma.menu_items.createMany({
                data: menuData
            }),

            prisma.price_history.createMany({
                data: historyData
            })

        ]);

        /*   await prisma.$transaction(
              async (tx) => { */

        // for (const row of rows as ImportMenuRow[]) {

        //     await prisma.menu_items.create({
        //         data: {
        //             name: row.name,
        //             description: row.description ?? "",

        //             PriceHistory: {
        //                 create: {
        //                     price: row.price,
        //                     effctive_from:
        //                         row.effectiveFrom ?? new Date(),
        //                     effective_to: null,
        //                     createdBy: req.user!.userId,
        //                 },
        //             },
        //         },
        //     });

        // }


        /*       {
                  timeout: 30000, // 30 seconds
              }
          ); */

        removeImportPreview(previewToken);

        await bumpMenuCacheVersion();

        return res.status(201).json({
            success: true,
            message: "Menu import completed successfully.",
            inserted: rows.length,
        });

    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: error.message || "Import failed",
        });

    }
};

// export const confirmMenuImportController = async (
//     req: Request,
//     res: Response
// ) => {
//     try {
//         const { previewToken } = req.body;

//         if (!previewToken) {
//             return res.status(400).json({
//                 success: false,
//                 message: "previewToken is required",
//             });
//         }

//         const preview = getImportPreview(previewToken);

//         if (!preview) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Preview expired or not found",
//             });
//         }

//         if (preview.type !== "MENU") {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid preview type",
//             });
//         }

//         const rows = preview.rows;

//         if (!rows || rows.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No valid rows to import",
//             });
//         }

//         const result = await prisma.$transaction(async (tx) => {
//             const createdMenus = await Promise.all(
//                 rows.map((r: any) =>
//                     tx.menu_items.create({
//                         data: {
//                             name: r.name,
//                             description: r.description ?? '',
//                             PriceHistory: {
//                                 create: {
//                                     price: r.price,
//                                     effctive_from: r.effectiveFrom ?? new Date(),
//                                     effective_to: null,
//                                     createdBy: req.user!.userId,
//                                 },
//                             },
//                         },
//                         include: { PriceHistory: true },
//                     })
//                 )
//             );

//             return createdMenus;
//         });



//         removeImportPreview(previewToken);

//          await bumpMenuCacheVersion();

//         return res.status(201).json({
//             success: true,
//             message: "Menu import completed",
//             inserted: result.length,
//         });

//     } catch (error: any) {
//         return res.status(500).json({
//             success: false,
//             message: error.message || "Import failed",
//         });
//     }
// };