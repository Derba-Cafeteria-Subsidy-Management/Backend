export interface MenuResponse {
  id: string;
  name: string;
  description?: string | null;
  currentPrice: number;
  active: boolean;
}

export interface CreateMenuInput {
  name: string;
  description?: string;
  price: number;
  effectiveFrom?: Date;
}

export interface UpdateMenuInput {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface CreatePriceVersionInput {
  price: number;
  effectiveFrom: Date;
}