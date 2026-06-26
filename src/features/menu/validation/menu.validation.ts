// import XLSX from "xlsx";

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

//     }

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


