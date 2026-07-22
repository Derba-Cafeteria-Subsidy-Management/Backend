import { RequestContext } from "../../auth/types/auth.types";
import { EmployeeType, SubsidyType } from "@prisma/client";

export interface CreateEmployeeContext extends RequestContext {
  AdminId: string;
}

export interface ImportEmployeeRow {
    row: number;
    EmployeeNumber: string;
    fullName: string;
    fingerprintId?: string | null;
    photo?: string | null;
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

export interface CreateEmployeeInput {
  employeeNumber: string;
  fullName: string;
  fingerprintId?: string;
  photo?: string;
  subsidyType?: SubsidyType;
  employeeType?: EmployeeType;
  groupId?: string; // Optional group ID if employeeType == SHIFT
}

export interface UpdateEmployeeInput {
  fullName?: string;
  photo?: string | null;
  status?: string;
  fingerprintId?: string | null;
  subsidyType?: SubsidyType;
  employeeType?: EmployeeType;
  groupId?: string; // Optional group ID if transitioning to SHIFT, or can be null to remove
}