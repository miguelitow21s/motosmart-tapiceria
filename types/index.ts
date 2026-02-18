export type Role = "admin" | "editor" | "customer";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface Design {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  short_description: string;
  image_url: string;
  is_active: boolean;
  base_price: number;
}

export interface CustomOrderPayload {
  brand: string;
  design: string;
  baseColor: string;
  material: string;
  seamColor: string;
  embroideryText: string;
  foam: "original" | "modificada";
}
