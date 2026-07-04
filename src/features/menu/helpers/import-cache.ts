// import { v4 as uuid } from "uuid";
// import { ImportMenuRow } from "../types/menu.types";
// import { ImportEmployeeRow } from "../../employee/types/employee.types";

// const cache = new Map<
//     string,
//     {
//         rows: ImportMenuRow[];
//         expires: number;
//     }
// >();

// const EmployeeCache = new Map<
//     string,
//     {
//         rows: ImportEmployeeRow[];
//         expires: number;
//     }
// >();

// export const saveImportPreview = (
//     rows?: ImportMenuRow[] ,
//     Employeerows?: ImportEmployeeRow[]
// ) => {

//     const token = uuid();

//     if (!rows && !Employeerows) {
//         throw new Error("No rows provided for import preview");
//     }

//     if (rows) {
//         cache.set(token, {
//             rows,
//             expires: Date.now() + 1000 * 60 * 10,
//         });
//     }

//     if (Employeerows) {
//         EmployeeCache.set(token, {
//             rows: Employeerows,
//             expires: Date.now() + 1000 * 60 * 10,
//         });
//     }

//     return token;
// }

   
// export const getImportPreview = (
//     token: string
// ) => {

//     const preview = cache.get(token);

//     if (!preview)
//         return null;

//     if (preview.expires < Date.now()) {

//         cache.delete(token);

//         return null;
//     }

//     return preview.rows;
// };

// export const removeImportPreview = (
//     token: string
// ) => {

//     cache.delete(token);

// };

import { v4 as uuid } from "uuid";
import { ImportMenuRow } from "../types/menu.types";
import { ImportEmployeeRow } from "../../employee/types/employee.types";


export type ImportPreviewType = "MENU" | "EMPLOYEE";

export interface ImportPreview<T> {
  type: ImportPreviewType;
  rows: T[];
  expires: number;
}

const cache = new Map<
  string,
  ImportPreview<ImportMenuRow | ImportEmployeeRow>
>();

const EXPIRATION = 1000 * 60 * 10; // 10 minutes

export const saveImportPreview = (
  rows: ImportMenuRow[] | ImportEmployeeRow[],
  type: ImportPreviewType
): string => {
  const token = uuid();

  cache.set(token, {
    type,
    rows,
    expires: Date.now() + EXPIRATION,
  });

  return token;
};

export const getImportPreview = (
  token: string
):
  | ImportPreview<ImportMenuRow | ImportEmployeeRow>
  | null => {
  const preview = cache.get(token);

  if (!preview) {
    return null;
  }

  if (preview.expires < Date.now()) {
    cache.delete(token);
    return null;
  }

  return preview;
};

export const removeImportPreview = (
  token: string
): void => {
  cache.delete(token);
};