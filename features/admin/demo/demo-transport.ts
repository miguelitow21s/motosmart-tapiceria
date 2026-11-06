"use client";

import type { DemoSeed } from "@/features/admin/demo/demo-seed";

/*
  /api/admin en memoria, para /panel-demo. Responde con las mismas formas y
  los mismos errores que las rutas reales (409 al borrar una foto en uso,
  diseño sin foto, precio con descuento mayor que el normal...), con una
  pequeña espera para que se vean los estados de carga. Nada sale del
  navegador: las fotos "subidas" son enlaces blob: locales.
*/

type Row = Record<string, unknown>;

const LATENCY_MS = 250;
const DAY = 24 * 3600 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function fail(error: string, status = 400) {
  return json({ error }, status);
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const str = (value: unknown) => (typeof value === "string" ? value : "");
const bool = (value: FormDataEntryValue | null) => value === "true";

export function createDemoTransport(seed: DemoSeed) {
  const db = {
    brands: clone(seed.brands),
    designs: clone(seed.designs),
    images: clone(seed.images),
    settings: new Map(Object.entries(seed.settings)),
    carouselOrder: [...seed.carouselOrder],
    features: clone(seed.features),
    activity: clone(seed.activity),
    products: clone(seed.products),
    riders: clone(seed.riders)
  };

  function log(action: string, entity: string, entityId: string | null, detail: Row | null) {
    db.activity.unshift({ id: newId(), action, entity, entity_id: entityId, detail, created_at: new Date().toISOString() });
  }

  function find(list: Row[], id: unknown) {
    return list.find((row) => row.id === id);
  }

  function uploadsOff() {
    return !db.features.find((feature) => feature.name === "admin_uploads_enabled")?.enabled;
  }

  function validateDesign(row: Row): string | null {
    if (!str(row.image_url)) return "Sube una foto principal";
    if (!str(row.brand_id)) return "Elige una marca";
    const name = str(row.name).trim();
    if (name.length < 2) return "El nombre debe tener al menos 2 caracteres";
    const base = Number(row.base_price ?? 0);
    const discount = row.discount_price;
    if (typeof discount === "number" && discount >= base) return "El precio de rebaja debe ser menor al precio base";
    if (row.promotion_active && typeof discount !== "number") return "Debes definir precio de descuento cuando la promocion esta activa";
    if (row.promotion_active && str(row.promotion_label).trim().length < 3) return "La etiqueta de promocion debe tener al menos 3 caracteres";
    const duplicate = db.designs.find(
      (design) => design.id !== row.id && design.brand_id === row.brand_id && design.slug === row.slug
    );
    if (duplicate) return "Ya existe un diseño con ese nombre (slug) en esta marca. Usa otro nombre.";
    return null;
  }

  function linkMainImage(designId: string, brandId: string, url: string) {
    for (const image of db.images) {
      if (image.storage_path === url && !image.design_id) {
        image.design_id = designId;
        image.brand_id = brandId;
      }
    }
  }

  async function designs(method: string, body: Row) {
    if (method === "GET") return json({ data: db.designs });
    if (method === "POST") {
      const row: Row = { ...body, id: newId(), created_at: new Date().toISOString() };
      const error = validateDesign(row);
      if (error) return fail(error, error.startsWith("Ya existe") ? 409 : 400);
      db.designs.push(row);
      linkMainImage(row.id as string, row.brand_id as string, row.image_url as string);
      log("create", "design", row.id as string, { slug: row.slug });
      return json({ ok: true, id: row.id }, 201);
    }
    if (method === "PATCH") {
      const current = find(db.designs, body.id);
      if (!current) return fail("Diseño no encontrado", 404);
      const next = { ...current, ...body };
      const error = validateDesign(next);
      if (error) return fail(error, error.startsWith("Ya existe") ? 409 : 400);
      Object.assign(current, next);
      linkMainImage(current.id as string, current.brand_id as string, current.image_url as string);
      log("update", "design", current.id as string, {
        slug: current.slug,
        is_active: current.is_active,
        promotion_active: current.promotion_active,
        discount_price: current.discount_price
      });
      return json({ ok: true });
    }
    if (method === "DELETE") {
      const current = find(db.designs, body.id);
      if (!current) return fail("Diseño no encontrado", 404);
      db.designs = db.designs.filter((design) => design !== current);
      db.images = db.images.filter((image) => image.design_id !== current.id);
      db.products = db.products.filter((product) => product.design_id !== current.id);
      log("delete", "design", current.id as string, { slug: current.slug });
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  async function brands(method: string, body: Row) {
    if (method === "GET") return json({ data: db.brands });
    if (method === "POST" || method === "PATCH") {
      const name = str(body.name).trim();
      if (name.length < 2) return fail("El nombre debe tener al menos 2 caracteres");
      const duplicate = db.brands.find((brand) => brand.id !== body.id && brand.slug === body.slug);
      if (duplicate) return fail("Ya existe una marca con ese nombre. Usa otro.", 409);
      if (method === "POST") {
        const row: Row = { ...body, id: newId() };
        db.brands.push(row);
        log("create", "brand", row.id as string, { slug: row.slug });
        return json({ ok: true, id: row.id }, 201);
      }
      const current = find(db.brands, body.id);
      if (!current) return fail("Marca no encontrada", 404);
      Object.assign(current, body);
      log("update", "brand", current.id as string, { slug: current.slug });
      return json({ ok: true });
    }
    if (method === "DELETE") {
      const current = find(db.brands, body.id);
      if (!current) return fail("Marca no encontrada", 404);
      db.brands = db.brands.filter((brand) => brand !== current);
      db.images = db.images.filter((image) => image.brand_id !== current.id || image.design_id);
      log("delete", "brand", current.id as string, { slug: current.slug });
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  async function images(method: string, body: Row | FormData) {
    if (method === "GET") return json({ data: db.images });
    if (method === "POST" && body instanceof FormData) {
      if (uploadsOff()) return fail("Feature disabled", 403);
      const file = body.get("file");
      if (!(file instanceof Blob)) return fail("File required");
      const url = URL.createObjectURL(file);
      const designId = str(body.get("design_id")) || null;
      const row: Row = {
        id: newId(),
        storage_path: url,
        alt_text: str(body.get("alt_text")),
        brand_id: str(body.get("brand_id")) || null,
        design_id: designId,
        is_weekly_highlight: bool(body.get("is_weekly_highlight")),
        created_at: new Date().toISOString()
      };
      db.images.push(row);
      const setAsDesignImage = bool(body.get("set_as_design_image"));
      if (setAsDesignImage && designId) {
        const design = find(db.designs, designId);
        if (design) design.image_url = url;
      }
      log("upload", "image", row.id as string, {
        path: url,
        designId,
        brandId: row.brand_id,
        isWeeklyHighlight: row.is_weekly_highlight,
        setAsDesignImage
      });
      return json({ ok: true, id: row.id, url }, 201);
    }
    if (body instanceof FormData) return fail("Método no permitido", 405);
    const current = find(db.images, body.id);
    if (!current) return fail("Foto no encontrada", 404);
    if (method === "PATCH") {
      if (body.alt_text !== undefined) current.alt_text = body.alt_text;
      if (body.brand_id !== undefined) current.brand_id = body.brand_id;
      if (body.design_id !== undefined) current.design_id = body.design_id;
      if (body.is_weekly_highlight !== undefined) current.is_weekly_highlight = body.is_weekly_highlight;
      if (body.set_as_design_image && current.design_id) {
        const design = find(db.designs, current.design_id);
        if (design) design.image_url = current.storage_path;
      }
      log("update", "image", current.id as string, { ...body, setAsDesignImage: Boolean(body.set_as_design_image) });
      return json({ ok: true });
    }
    if (method === "DELETE") {
      const design = db.designs.find((item) => item.image_url === current.storage_path);
      const brand = db.brands.find((item) => item.logo_url === current.storage_path);
      const usage = design ? `la foto principal de «${str(design.name)}»` : brand ? `el logo de «${str(brand.name)}»` : null;
      if (usage) return fail(`No se puede borrar: esta foto es ${usage}. Cambia esa foto primero y luego bórrala.`, 409);
      db.images = db.images.filter((image) => image !== current);
      db.carouselOrder = db.carouselOrder.filter((id) => id !== current.id);
      log("delete", "image", current.id as string, { path: current.storage_path });
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  async function settings(method: string, body: Row) {
    if (method === "GET") {
      const rows: Row[] = Array.from(db.settings.entries()).map(([key, text]) => ({ key, value: { text } }));
      rows.push({ key: "carousel_order", value: { ids: db.carouselOrder } });
      return json({ data: rows });
    }
    if (method === "POST") {
      const key = str(body.key);
      const value = (body.value ?? {}) as { text?: unknown; ids?: unknown };
      if (key === "carousel_order") db.carouselOrder = Array.isArray(value.ids) ? value.ids.map(String) : [];
      else db.settings.set(key, str(value.text));
      log("upsert", "setting", key, { key });
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  async function features(method: string, body: Row) {
    if (method === "GET") return json({ data: db.features });
    if (method === "PATCH") {
      const current = db.features.find((feature) => feature.name === body.name);
      if (!current) return fail("Módulo no encontrado", 404);
      current.enabled = Boolean(body.enabled);
      log("toggle_feature", "feature", str(body.name), { enabled: current.enabled });
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  async function activity(method: string) {
    if (method === "GET") {
      const rows = [...db.activity].sort((a, b) => str(b.created_at).localeCompare(str(a.created_at))).slice(0, 50);
      return json({ data: rows });
    }
    if (method === "DELETE") {
      const limit = Date.now() - 90 * DAY;
      db.activity = db.activity.filter((entry) => new Date(str(entry.created_at)).getTime() >= limit);
      log("purge", "admin_activity_logs", null, {});
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  async function products(method: string, body: Row) {
    if (method === "GET") return json({ data: db.products });
    const designName = (id: unknown) => str(find(db.designs, id)?.name);
    if (method === "POST") {
      const row: Row = { ...body, id: newId(), designs: { name: designName(body.design_id) } };
      db.products.unshift(row);
      log("create", "product", row.id as string, { sku: row.sku });
      return json({ ok: true, id: row.id }, 201);
    }
    const current = find(db.products, body.id);
    if (!current) return fail("Producto no encontrado", 404);
    if (method === "PATCH") {
      Object.assign(current, body, body.design_id ? { designs: { name: designName(body.design_id) } } : {});
      log("update", "product", current.id as string, { sku: current.sku });
      return json({ ok: true });
    }
    if (method === "DELETE") {
      db.products = db.products.filter((product) => product !== current);
      log("delete", "product", current.id as string, { sku: current.sku });
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  async function riders(method: string, body: Row | FormData) {
    if (method === "GET") {
      const rows = [...db.riders].sort((a, b) => Number(a.display_order) - Number(b.display_order));
      return json({ data: rows });
    }
    if (method === "POST" && body instanceof FormData) {
      if (uploadsOff()) return fail("Feature disabled", 403);
      const file = body.get("file");
      if (!(file instanceof Blob)) return fail("File required");
      const url = URL.createObjectURL(file);
      const order = db.riders.reduce((max, rider) => Math.max(max, Number(rider.display_order) + 1), 0);
      const row: Row = {
        id: newId(),
        storage_path: url,
        rider_name: str(body.get("rider_name")),
        moto_info: str(body.get("moto_info")),
        is_active: true,
        display_order: order,
        created_at: new Date().toISOString()
      };
      db.riders.push(row);
      log("upload", "rider_photo", row.id as string, { path: url, rider_name: row.rider_name });
      return json({ ok: true, url }, 201);
    }
    if (body instanceof FormData) return fail("Método no permitido", 405);
    const current = find(db.riders, body.id);
    if (!current) return fail("Foto no encontrada", 404);
    if (method === "PATCH") {
      const changes: Row = { ...body };
      delete changes.id;
      Object.assign(current, changes);
      log("update", "rider_photo", current.id as string, changes);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      db.riders = db.riders.filter((rider) => rider !== current);
      log("delete", "rider_photo", current.id as string, { rider_name: current.rider_name });
      return json({ ok: true });
    }
    return fail("Método no permitido", 405);
  }

  return async function demoTransport(path: string, init: RequestInit): Promise<Response> {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
    const { pathname } = new URL(path, "http://demo.local");
    const method = (init.method ?? "GET").toUpperCase();
    const raw = init.body;
    const body: Row | FormData =
      raw instanceof FormData ? raw : typeof raw === "string" && raw ? (JSON.parse(raw) as Row) : {};

    switch (pathname) {
      case "/api/admin/designs":
        return designs(method, body as Row);
      case "/api/admin/brands":
        return brands(method, body as Row);
      case "/api/admin/images":
        return images(method, body);
      case "/api/admin/settings":
        return settings(method, body as Row);
      case "/api/admin/features":
        return features(method, body as Row);
      case "/api/admin/activity":
        return activity(method);
      case "/api/admin/products":
        return products(method, body as Row);
      case "/api/admin/rider-photos":
        return riders(method, body);
      default:
        return fail("Ruta no encontrada", 404);
    }
  };
}
