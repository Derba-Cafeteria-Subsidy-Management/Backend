import { FoodType } from "@prisma/client";
import { RequestContext } from "../../auth/types/auth.types";




export interface MenuResponse {
  id: string;
  name: string;
  mealtype: FoodType;
  currentPrice: number;
  active: boolean;
}

export interface CreateMenuInput {
  name: string;
  mealtype: FoodType;
  price: number;
}

export interface UpdateMenuInput {
  name?: string;
  mealtype?: FoodType;
  active?: boolean;
}

export interface CreatePriceVersionInput {
  price: number;
  effectiveFrom: Date;
}

export interface CreateMenuContext extends RequestContext {
  AdminId: string;
}

export interface ImportMenuRow {
    row: number;
    name: string;
    mealtype: FoodType;
    price: number;
    effectiveFrom: Date;
}

export interface ImportMenuError {
    row: number;
    field: string;
    message: string;
}

export interface ImportPreviewResponse {
    validRows: ImportMenuRow[];
    errors: ImportMenuError[];
    totalRows: number;
}

export interface ConfirmImportInput {
    rows: ImportMenuRow[];
}