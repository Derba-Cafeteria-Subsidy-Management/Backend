import { RequestContext } from "../../auth/types/auth.types";

export interface CreateEmployeeContext extends RequestContext {
  AdminId: string;
}

export interface ImportEmployeeRow {
    row: number;
    EmployeeNumber: string;
    fullName: string;
    department?: string;
    fingerprintId: string;
    photo?: string;
}

export interface ImportEmployeeError {
    row: number;
    field: string;
    message: string;
}

export interface EmployeeImportPreviewResponse {
    validRows: ImportEmployeeRow[];
    errors: ImportEmployeeError[];
    totalRows: number;
}

export interface ConfirmImportInput {
    rows: ImportEmployeeRow[];
}