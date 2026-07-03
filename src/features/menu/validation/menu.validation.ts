// import XLSX from "xlsx";

import z from "zod";

// import { prisma } from "../../../libs/lib/prisma";

// import {
//     ImportMenuError,
//     ImportMenuRow
// } from "../types/menu.types";

// import {
//     saveImportPreview
// } from "../helpers/import-cache";

// export const previewMenuImport =
// async (
//     file: Express.Multer.File
// ) => {

//     const workbook =
//         XLSX.read(file.buffer, {
//             type: "buffer"
//         });

//         if (workbook.SheetNames.length === 0) {
//             throw new Error(
//                 "Excel file is empty"
//             );
//         }



//     const sheet =
//         workbook.Sheets[
//             workbook.SheetNames[0]
//         ];

//     const data =
//         XLSX.utils.sheet_to_json<any>(
//             sheet
//         );

//     const validRows: ImportMenuRow[] = [];

//     const errors: ImportMenuError[] = [];

//     for (
//         let i = 0;
//         i < data.length;
//         i++
//     ) {

//         const row =
//             data[i];

//         const excelRow =
//             i + 2;

//         if (!row.Name) {

//             errors.push({
//                 row: excelRow,
//                 field: "Name",
//                 message: "Required"
//             });

//             continue;
//         }

//         if (
//             row.Price == null ||
//             Number(row.Price) <= 0
//         ) {

//             errors.push({

//                 row: excelRow,

//                 field: "Price",

//                 message:
//                     "Must be greater than zero"

//             });

//             continue;
//         }

//         const exists =
//             await prisma.menu_items.findFirst({

//                 where: {

//                     name: row.Name

//                 }

//             });

//         if (exists) {

//             errors.push({

//                 row: excelRow,

//                 field: "Name",

//                 message:
//                     "Menu already exists"

//             });

//             continue;
//         }

//         validRows.push({

//             row: excelRow,

//             name: row.Name,

//             description:
//                 row.Description,

//             price:
//                 Number(row.Price),

//             effectiveFrom: row.EffectiveFrom



//         });

//     }tr

//     const previewToken =
//         saveImportPreview(
//             validRows
//         );

//     return {

//         previewToken,

//         totalRows:
//             data.length,

//         validRows,

//         errors

//     };

// };


export const CreatePriceVersionInput = z.object({
    price: z.number().positive('Price must be a positive number'),
    // input will be a string like the ""2026-08-01", so we need to transform it to a Date object
    effectiveFrom: z.string().transform((value, ctx) => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid date format',
            });
            return z.NEVER;
        }
        return date;
    }),


});

export const CreateMenuInput = z.object({
    name: z.string().min(1, 'Name is required'),

    price: z.number().positive('Price must be a positive number'),

    // accept mealtype as a string and transform it to the FoodType enum and validate it
    mealtype: z.string().transform((value, ctx) => {
        const upperValue = value.toUpperCase();
        if (!['BREAKFAST', 'LUNCH', 'DINNER', 'DRINK'].includes(upperValue)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid meal type. Must be one of BREAKFAST, LUNCH, DINNER, DRINK',
            });
            return z.NEVER;
        }
        return upperValue as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'DRINK';
    }
)
    // input will be a string like the ""2026-08-01", so we need to transform it to a Date object
});

export const UpdateMenuInput = z.object({
    name: z.string().min(1, 'Name is required').optional(),
    
    // accept mealtype as a string and transform it to the FoodType enum and validate it
    mealtype: z.string().transform((value, ctx) => {
        const upperValue = value.toUpperCase();
        if (!['BREAKFAST', 'LUNCH', 'DINNER', 'DRINK'].includes(upperValue)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid meal type. Must be one of BREAKFAST, LUNCH, DINNER, DRINK',
            });
            return z.NEVER;
        }
        return upperValue as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'DRINK';
    }).optional(),

    active: z.boolean().optional(),
});

