"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCOP, formatDateTimeShort, getPromotionMeta } from "@/lib/utils";

type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  is_active: boolean;
};

type Design = {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  short_description: string;
  image_url: string;
  base_price: number;
  discount_price: number | null;
  promotion_label: string;
  promotion_active: boolean;
  promotion_starts_at: string | null;
  promotion_ends_at: string | null;
  is_active: boolean;
};

type ProductRow = { id: string; sku: string; is_active: boolean; stock: number; designs?: { name?: string } | null };
type Activity = { id: string; action: string; entity: string; created_at: string };
type Feature = { name: string; enabled: boolean };

type AdminImage = {
  id: string;
  storage_path: string;
  alt_text: string;
  is_weekly_highlight: boolean;
  brand_id: string | null;
  design_id: string | null;
  brands?: { name?: string } | { name?: string }[] | null;
  designs?: { name?: string } | { name?: string }[] | null;
  created_at: string;
};

type DesignForm = {
  id?: string;
  brand_id: string;
  name: string;
  slug: string;
  short_description: string;
  image_url: string;
  base_price: number;
  discount_price: number | null;
  promotion_label: string;
  promotion_active: boolean;
  promotion_starts_at: string | null;
  promotion_ends_at: string | null;
  is_active: boolean;
};

type BrandForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  is_active: boolean;
};

const emptyBrandForm: BrandForm = {
  name: "",
  slug: "",
  description: "",
  logo_url: "",
  is_active: true
};

const emptyDesignForm: DesignForm = {
  brand_id: "",
  name: "",
  slug: "",
  short_description: "",
  image_url: "",
  base_price: 0,
  discount_price: null,
  promotion_label: "",
  promotion_active: false,
  promotion_starts_at: null,
  promotion_ends_at: null,
  is_active: true
};

function isoToLocalDateTimeInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function localDateTimeInputToIso(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function extractLinkedName(value: AdminImage["brands"] | AdminImage["designs"]) {
  if (!value) return "Sin asignar";
  if (Array.isArray(value)) return value[0]?.name || "Sin asignar";
  return value.name || "Sin asignar";
}

export function AdminDashboard() {
  const [message, setMessage] = useState("");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [images, setImages] = useState<AdminImage[]>([]);

  const [brandForm, setBrandForm] = useState<BrandForm>(emptyBrandForm);
  const [designForm, setDesignForm] = useState<DesignForm>(emptyDesignForm);

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedDesignId, setSelectedDesignId] = useState("");

  const [settingKey, setSettingKey] = useState("homepage_copy");
  const [settingValue, setSettingValue] = useState('{"title":"MotoSmart"}');

  const [dragActive, setDragActive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageBrandId, setImageBrandId] = useState("");
  const [imageDesignId, setImageDesignId] = useState("");
  const [imageInCarousel, setImageInCarousel] = useState(true);

  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingImageAlt, setEditingImageAlt] = useState("");

  const sortedBrands = useMemo(() => [...brands].sort((a, b) => a.name.localeCompare(b.name)), [brands]);

  const designsByBrand = useMemo(() => {
    const map = new Map<string, Design[]>();
    for (const design of designs) {
      if (!map.has(design.brand_id)) map.set(design.brand_id, []);
      map.get(design.brand_id)?.push(design);
    }
    return map;
  }, [designs]);

  const carouselImages = useMemo(
    () => images.filter((img) => img.is_weekly_highlight),
    [images]
  );
  const allSiteImages = useMemo(() => images, [images]);
  const promotionPreview = useMemo(
    () =>
      getPromotionMeta(
        Number(designForm.base_price || 0),
        typeof designForm.discount_price === "number" ? designForm.discount_price : null,
        designForm.promotion_active,
        localDateTimeInputToIso(designForm.promotion_starts_at),
        localDateTimeInputToIso(designForm.promotion_ends_at)
      ),
    [
      designForm.base_price,
      designForm.discount_price,
      designForm.promotion_active,
      designForm.promotion_starts_at,
      designForm.promotion_ends_at
    ]
  );

  function getCsrfToken() {
    return document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrf-token="))
      ?.split("=")[1];
  }

  useEffect(() => {
    void reloadAll();
  }, []);

  async function reloadAll() {
    await Promise.all([
      loadBrands(),
      loadDesigns(),
      loadProducts(),
      loadActivity(),
      loadFeatures(),
      loadImages()
    ]);
  }

  async function loadBrands() {
    const res = await fetch("/api/admin/brands", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as { data: Brand[] };
    setBrands(payload.data ?? []);
  }

  async function loadDesigns() {
    const res = await fetch("/api/admin/designs", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as { data: Design[] };
    setDesigns(payload.data ?? []);
  }

  async function loadProducts() {
    const res = await fetch("/api/admin/products", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as { data: ProductRow[] };
    setProducts(payload.data ?? []);
  }

  async function loadActivity() {
    const res = await fetch("/api/admin/activity", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as { data: Activity[] };
    setActivity(payload.data ?? []);
  }

  async function loadFeatures() {
    const res = await fetch("/api/admin/features", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as { data: Feature[] };
    setFeatures(payload.data ?? []);
  }

  async function loadImages() {
    const res = await fetch("/api/admin/images", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as { data: AdminImage[] };
    setImages(payload.data ?? []);
  }

  function applyBrandSelection(brandId: string) {
    setSelectedBrandId(brandId);
    if (!brandId) {
      setBrandForm(emptyBrandForm);
      return;
    }
    const selected = brands.find((item) => item.id === brandId);
    if (!selected) return;

    setBrandForm({
      id: selected.id,
      name: selected.name,
      slug: selected.slug,
      description: selected.description,
      logo_url: selected.logo_url ?? "",
      is_active: selected.is_active
    });
  }

  function applyDesignSelection(designId: string) {
    setSelectedDesignId(designId);
    if (!designId) {
      setDesignForm(emptyDesignForm);
      return;
    }
    const selected = designs.find((item) => item.id === designId);
    if (!selected) return;

    setDesignForm({
      id: selected.id,
      brand_id: selected.brand_id,
      name: selected.name,
      slug: selected.slug,
      short_description: selected.short_description,
      image_url: selected.image_url,
      base_price: Number(selected.base_price),
      discount_price: selected.discount_price ? Number(selected.discount_price) : null,
      promotion_label: selected.promotion_label ?? "",
      promotion_active: Boolean(selected.promotion_active),
      promotion_starts_at: isoToLocalDateTimeInput(selected.promotion_starts_at),
      promotion_ends_at: isoToLocalDateTimeInput(selected.promotion_ends_at),
      is_active: selected.is_active
    });
  }

  async function saveBrand() {
    const hasId = Boolean(brandForm.id);
    const payload = {
      ...brandForm,
      logo_url: brandForm.logo_url || null
    };

    const res = await fetch("/api/admin/brands", {
      method: hasId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify(payload)
    });

    setMessage(res.ok ? (hasId ? "Marca actualizada" : "Marca creada") : "Error guardando marca");
    if (!res.ok) return;

    await Promise.all([loadBrands(), loadActivity()]);
    if (!hasId) {
      setSelectedBrandId("");
      setBrandForm(emptyBrandForm);
    }
  }

  async function saveDesign() {
    const hasId = Boolean(designForm.id);
    const payload = {
      ...designForm,
      discount_price:
        designForm.promotion_active && typeof designForm.discount_price === "number"
          ? designForm.discount_price
          : null,
      promotion_label: designForm.promotion_active ? designForm.promotion_label : "",
      promotion_starts_at: designForm.promotion_active ? localDateTimeInputToIso(designForm.promotion_starts_at) : null,
      promotion_ends_at: designForm.promotion_active ? localDateTimeInputToIso(designForm.promotion_ends_at) : null
    };

    const res = await fetch("/api/admin/designs", {
      method: hasId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify(payload)
    });

    setMessage(res.ok ? (hasId ? "Diseño actualizado" : "Diseño creado") : "Error guardando diseño");
    if (!res.ok) return;

    await Promise.all([loadDesigns(), loadActivity()]);
    if (!hasId) {
      setSelectedDesignId("");
      setDesignForm(emptyDesignForm);
    }
  }

  function applyDiscountPercent(percent: number) {
    const base = Number(designForm.base_price || 0);
    if (base <= 0) {
      setMessage("Define primero el precio base para calcular descuentos");
      return;
    }

    const nextDiscount = Math.max(1, Math.round(base * (1 - percent / 100)));
    setDesignForm((prev) => ({
      ...prev,
      promotion_active: true,
      discount_price: nextDiscount,
      promotion_label: prev.promotion_label || `${percent}% OFF`
    }));
    setMessage(`Descuento aplicado: ${percent}%`);
  }

  function applyPromotionWindow(days: number) {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days);

    setDesignForm((prev) => ({
      ...prev,
      promotion_active: true,
      promotion_starts_at: isoToLocalDateTimeInput(start.toISOString()),
      promotion_ends_at: isoToLocalDateTimeInput(end.toISOString())
    }));
    setMessage(`Campana programada por ${days} dia(s)`);
  }

  async function submitSetting() {
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(settingValue);
    } catch {
      setMessage("JSON de setting inválido");
      return;
    }

    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({ key: settingKey, value: parsed })
    });

    setMessage(res.ok ? "Setting actualizado" : "Error guardando setting");
    if (res.ok) await loadActivity();
  }

  async function toggleProduct(productId: string, isActive: boolean) {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({ id: productId, is_active: !isActive })
    });

    setMessage(res.ok ? "Visibilidad de producto actualizada" : "Error actualizando producto");
    if (res.ok) {
      await Promise.all([loadProducts(), loadActivity()]);
    }
  }

  async function toggleFeature(name: string, enabled: boolean) {
    const res = await fetch("/api/admin/features", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({ name, enabled: !enabled })
    });

    setMessage(res.ok ? "Feature actualizada" : "Error actualizando feature");
    if (res.ok) {
      await Promise.all([loadFeatures(), loadActivity()]);
    }
  }

  function handleDrop(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function uploadCarouselImage() {
    if (!imageFile) {
      setMessage("Selecciona una imagen para el carrusel");
      return;
    }

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("alt_text", imageAlt);
    formData.append("is_weekly_highlight", imageInCarousel ? "true" : "false");
    if (imageBrandId) formData.append("brand_id", imageBrandId);
    if (imageDesignId) formData.append("design_id", imageDesignId);

    const res = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
      body: formData
    });

    setMessage(res.ok ? "Imagen del carrusel publicada" : "Error subiendo imagen");
    if (!res.ok) return;

    setImageFile(null);
    setImagePreviewUrl("");
    setImageAlt("");
    setImageInCarousel(true);
    await Promise.all([loadImages(), loadActivity()]);
  }

  async function applyImageToSelectedDesign(imageUrl: string) {
    if (!designForm.id) {
      setDesignForm((prev) => ({ ...prev, image_url: imageUrl }));
      setMessage("Imagen puesta en el formulario de diseño. Guarda el diseño para publicarla.");
      return;
    }

    const res = await fetch("/api/admin/designs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({ ...designForm, image_url: imageUrl })
    });

    setMessage(res.ok ? "Imagen aplicada al diseño" : "Error aplicando imagen al diseño");
    if (res.ok) {
      setDesignForm((prev) => ({ ...prev, image_url: imageUrl }));
      await Promise.all([loadDesigns(), loadActivity()]);
    }
  }

  async function applyImageToSelectedBrand(imageUrl: string) {
    if (!brandForm.id) {
      setBrandForm((prev) => ({ ...prev, logo_url: imageUrl }));
      setMessage("Imagen puesta en el formulario de marca. Guarda la marca para publicarla.");
      return;
    }

    const res = await fetch("/api/admin/brands", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({ ...brandForm, logo_url: imageUrl })
    });

    setMessage(res.ok ? "Imagen aplicada a la marca" : "Error aplicando imagen a la marca");
    if (res.ok) {
      setBrandForm((prev) => ({ ...prev, logo_url: imageUrl }));
      await Promise.all([loadBrands(), loadActivity()]);
    }
  }

  async function linkImageToDesign(image: AdminImage) {
    if (!designForm.id) {
      setMessage("Selecciona un diseño para vincular esta imagen");
      return;
    }

    const res = await fetch("/api/admin/images", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({
        id: image.id,
        design_id: designForm.id,
        brand_id: designForm.brand_id || null
      })
    });

    setMessage(res.ok ? "Imagen vinculada al diseño" : "Error vinculando imagen");
    if (res.ok) {
      await Promise.all([loadImages(), loadActivity()]);
    }
  }

  async function linkImageToBrand(image: AdminImage) {
    if (!brandForm.id) {
      setMessage("Selecciona una marca para vincular esta imagen");
      return;
    }

    const res = await fetch("/api/admin/images", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({
        id: image.id,
        brand_id: brandForm.id
      })
    });

    setMessage(res.ok ? "Imagen vinculada a la marca" : "Error vinculando imagen");
    if (res.ok) {
      await Promise.all([loadImages(), loadActivity()]);
    }
  }

  async function saveImageEdits(imageId: string) {
    const res = await fetch("/api/admin/images", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({
        id: imageId,
        alt_text: editingImageAlt
      })
    });

    setMessage(res.ok ? "Imagen actualizada" : "Error actualizando imagen");
    if (!res.ok) return;

    setEditingImageId(null);
    setEditingImageAlt("");
    await Promise.all([loadImages(), loadActivity()]);
  }

  async function toggleCarouselImage(image: AdminImage) {
    const res = await fetch("/api/admin/images", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({
        id: image.id,
        is_weekly_highlight: !image.is_weekly_highlight
      })
    });

    setMessage(res.ok ? "Estado de carrusel actualizado" : "Error actualizando estado");
    if (res.ok) {
      await Promise.all([loadImages(), loadActivity()]);
    }
  }

  async function deleteImage(image: AdminImage) {
    const res = await fetch("/api/admin/images", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify({
        id: image.id,
        storage_path: image.storage_path
      })
    });

    setMessage(res.ok ? "Imagen eliminada" : "Error eliminando imagen");
    if (res.ok) {
      await Promise.all([loadImages(), loadActivity()]);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card id="overview" className="space-y-3 lg:col-span-2">
        <h3 className="font-display text-lg text-white">Centro de administracion MotoSmart</h3>
        <p className="text-sm text-neutral-300">
          Gestiona catalogo, precios, fotos, visibilidad y configuraciones en un solo lugar.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10" href="#brands">Ir a Marcas</a>
          <a className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10" href="#designs">Ir a Diseños y Precios</a>
          <a className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10" href="#media">Ir a Fotos</a>
          <a className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10" href="#features">Ir a Modulos</a>
          <a className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-neutral-200 hover:bg-white/10" href="#history">Ir a Historial</a>
        </div>
      </Card>

      <Card id="brands" className="space-y-3 scroll-mt-28">
        <h3 className="font-display text-lg text-white">Marcas (crear / editar)</h3>
        <select
          className="h-11 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
          value={selectedBrandId}
          onChange={(e) => applyBrandSelection(e.target.value)}
        >
          <option value="">Nueva marca</option>
          {sortedBrands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <Input placeholder="Nombre" value={brandForm.name} onChange={(e) => setBrandForm((prev) => ({ ...prev, name: e.target.value }))} />
        <Input placeholder="Slug" value={brandForm.slug} onChange={(e) => setBrandForm((prev) => ({ ...prev, slug: e.target.value }))} />
        <Textarea
          placeholder="Descripción"
          value={brandForm.description}
          onChange={(e) => setBrandForm((prev) => ({ ...prev, description: e.target.value }))}
        />
        <Input
          placeholder="Logo / foto URL (opcional)"
          value={brandForm.logo_url}
          onChange={(e) => setBrandForm((prev) => ({ ...prev, logo_url: e.target.value }))}
        />
        <Button onClick={saveBrand}>{brandForm.id ? "Actualizar marca" : "Crear marca"}</Button>
      </Card>

      <Card id="designs" className="space-y-3 scroll-mt-28">
        <h3 className="font-display text-lg text-white">Diseños y precios (crear / editar)</h3>
        <select
          className="h-11 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
          value={selectedDesignId}
          onChange={(e) => applyDesignSelection(e.target.value)}
        >
          <option value="">Nuevo diseño</option>
          {designs.map((design) => (
            <option key={design.id} value={design.id}>
              {design.name}
            </option>
          ))}
        </select>

        <select
          className="h-11 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
          value={designForm.brand_id}
          onChange={(e) => setDesignForm((prev) => ({ ...prev, brand_id: e.target.value }))}
        >
          <option value="">Selecciona marca</option>
          {sortedBrands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <Input placeholder="Nombre" value={designForm.name} onChange={(e) => setDesignForm((prev) => ({ ...prev, name: e.target.value }))} />
        <Input placeholder="Slug" value={designForm.slug} onChange={(e) => setDesignForm((prev) => ({ ...prev, slug: e.target.value }))} />
        <Input
          placeholder="Imagen URL"
          value={designForm.image_url}
          onChange={(e) => setDesignForm((prev) => ({ ...prev, image_url: e.target.value }))}
        />
        <Input
          placeholder="Precio base"
          type="number"
          value={designForm.base_price}
          onChange={(e) => setDesignForm((prev) => ({ ...prev, base_price: Number(e.target.value || 0) }))}
        />
        <Input
          placeholder="Precio con descuento (opcional)"
          type="number"
          value={designForm.discount_price ?? ""}
          onChange={(e) =>
            setDesignForm((prev) => ({
              ...prev,
              discount_price: e.target.value === "" ? null : Number(e.target.value)
            }))
          }
        />
        <div className="flex flex-wrap gap-2">
          {[10, 15, 20, 25, 30].map((percent) => (
            <Button key={percent} type="button" size="sm" variant="secondary" onClick={() => applyDiscountPercent(percent)}>
              {percent}% OFF
            </Button>
          ))}
        </div>
        <Input
          placeholder="Etiqueta promocion (ej: Oferta del mes)"
          value={designForm.promotion_label}
          onChange={(e) => setDesignForm((prev) => ({ ...prev, promotion_label: e.target.value }))}
        />
        <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={designForm.promotion_active}
            onChange={(e) => setDesignForm((prev) => ({ ...prev, promotion_active: e.target.checked }))}
          />
          Promocion activa en tienda
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Inicio promocion</label>
            <Input
              type="datetime-local"
              value={designForm.promotion_starts_at ?? ""}
              onChange={(e) => setDesignForm((prev) => ({ ...prev, promotion_starts_at: e.target.value || null }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Fin promocion</label>
            <Input
              type="datetime-local"
              value={designForm.promotion_ends_at ?? ""}
              onChange={(e) => setDesignForm((prev) => ({ ...prev, promotion_ends_at: e.target.value || null }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPromotionWindow(2)}>
            Flash 48h
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPromotionWindow(7)}>
            Semana promo
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPromotionWindow(30)}>
            Campana mensual
          </Button>
        </div>
        {designForm.promotion_active ? (
          <div className="rounded-xl border border-emerald-300/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {promotionPreview.hasPromotion ? (
              <p>
                Precio final {formatCOP(designForm.discount_price as number)} | Antes {formatCOP(designForm.base_price)} | Ahorro {formatCOP(promotionPreview.savings)} ({promotionPreview.percentOff}% OFF)
              </p>
            ) : (
              <p>Configura un precio de descuento valido (menor al base) para activar la promocion.</p>
            )}
            <p className="mt-1 text-xs text-emerald-100/90">
              Ventana: {formatDateTimeShort(localDateTimeInputToIso(designForm.promotion_starts_at))} - {formatDateTimeShort(localDateTimeInputToIso(designForm.promotion_ends_at))}
            </p>
          </div>
        ) : null}
        <Textarea
          placeholder="Descripción corta"
          value={designForm.short_description}
          onChange={(e) => setDesignForm((prev) => ({ ...prev, short_description: e.target.value }))}
        />
        <Button onClick={saveDesign}>{designForm.id ? "Actualizar diseño" : "Crear diseño"}</Button>
      </Card>

      <Card id="media" className="space-y-3 lg:col-span-2 scroll-mt-28">
        <h3 className="font-display text-lg text-white">Centro de fotos del sitio</h3>
        <p className="text-sm text-neutral-300">
          Desde aqui puedes subir fotos nuevas y usarlas en carrusel, marcas o diseños.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleDrop(e.dataTransfer.files);
          }}
          className={`rounded-2xl border border-dashed p-6 text-center ${dragActive ? "border-primary bg-red-600/10" : "border-white/20 bg-black/30"}`}
        >
          <p className="text-sm text-neutral-300">Suelta una imagen o selecciónala para agregarla al sitio</p>
          <Input type="file" accept="image/*" onChange={(e) => handleDrop(e.target.files)} className="mt-4 cursor-pointer" />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Texto ALT" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
          <select
            className="h-11 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
            value={imageBrandId}
            onChange={(e) => {
              setImageBrandId(e.target.value);
              setImageDesignId("");
            }}
          >
            <option value="">Marca opcional</option>
            {sortedBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-white"
            value={imageDesignId}
            onChange={(e) => setImageDesignId(e.target.value)}
          >
            <option value="">Diseño opcional</option>
            {(designsByBrand.get(imageBrandId) ?? designs).map((design) => (
              <option key={design.id} value={design.id}>
                {design.name}
              </option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={imageInCarousel}
            onChange={(e) => setImageInCarousel(e.target.checked)}
          />
          Mostrar tambien en carrusel principal
        </label>

        {imagePreviewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagePreviewUrl} alt="Preview" className="h-48 w-full rounded-xl object-cover" />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={uploadCarouselImage}>Subir foto</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setImageFile(null);
              setImagePreviewUrl("");
              setImageAlt("");
              setImageBrandId("");
              setImageDesignId("");
              setImageInCarousel(true);
            }}
          >
            Limpiar
          </Button>
        </div>

        <div className="space-y-3 pt-3">
          <h4 className="font-display text-base text-white">Fotos activas en carrusel</h4>
          {carouselImages.map((image) => (
            <div key={image.id} className="grid gap-3 rounded-xl border border-white/10 bg-black/30 p-3 md:grid-cols-[180px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.storage_path} alt={image.alt_text || "Imagen"} className="h-28 w-full rounded-lg object-cover" />

              <div className="space-y-2">
                <p className="text-xs text-neutral-400">
                  Marca: {extractLinkedName(image.brands)} | Diseño: {extractLinkedName(image.designs)}
                </p>

                {editingImageId === image.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Input value={editingImageAlt} onChange={(e) => setEditingImageAlt(e.target.value)} placeholder="Texto ALT" />
                    <Button onClick={() => saveImageEdits(image.id)}>Guardar ALT</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingImageId(null);
                        setEditingImageAlt("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-200">ALT: {image.alt_text || "(sin texto)"}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingImageId(image.id);
                      setEditingImageAlt(image.alt_text ?? "");
                    }}
                  >
                    Editar ALT
                  </Button>
                  <Button variant="secondary" onClick={() => toggleCarouselImage(image)}>
                    Quitar del carrusel
                  </Button>
                  <Button onClick={() => deleteImage(image)}>Eliminar</Button>
                </div>
              </div>
            </div>
          ))}
          {!carouselImages.length ? (
            <p className="text-sm text-neutral-400">No hay imágenes activas en carrusel todavía.</p>
          ) : null}
        </div>

        <div className="space-y-3 pt-5">
          <h4 className="font-display text-base text-white">Biblioteca global de fotos</h4>
          {allSiteImages.map((image) => (
            <div key={`library-${image.id}`} className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-[150px_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.storage_path} alt={image.alt_text || "Imagen"} className="h-24 w-full rounded-lg object-cover" />

              <div className="space-y-2">
                <p className="text-xs text-neutral-400">
                  Marca: {extractLinkedName(image.brands)} | Diseño: {extractLinkedName(image.designs)} | Carrusel: {image.is_weekly_highlight ? "Si" : "No"}
                </p>
                <p className="text-sm text-neutral-200">ALT: {image.alt_text || "(sin texto)"}</p>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => applyImageToSelectedDesign(image.storage_path)}>
                    Usar en diseño actual
                  </Button>
                  <Button variant="secondary" onClick={() => applyImageToSelectedBrand(image.storage_path)}>
                    Usar en marca actual
                  </Button>
                  <Button variant="secondary" onClick={() => linkImageToDesign(image)}>
                    Vincular al diseño
                  </Button>
                  <Button variant="secondary" onClick={() => linkImageToBrand(image)}>
                    Vincular a marca
                  </Button>
                  <Button variant="secondary" onClick={() => toggleCarouselImage(image)}>
                    {image.is_weekly_highlight ? "Quitar carrusel" : "Agregar carrusel"}
                  </Button>
                  <Button onClick={() => deleteImage(image)}>Eliminar</Button>
                </div>
              </div>
            </div>
          ))}
          {!allSiteImages.length ? (
            <p className="text-sm text-neutral-400">No hay fotos en la biblioteca todavía.</p>
          ) : null}
        </div>
      </Card>

      <Card id="settings" className="space-y-3 lg:col-span-2 scroll-mt-28">
        <h3 className="font-display text-lg text-white">Editar textos / settings</h3>
        <Input placeholder="Clave" value={settingKey} onChange={(e) => setSettingKey(e.target.value)} />
        <Textarea value={settingValue} onChange={(e) => setSettingValue(e.target.value)} />
        <Button onClick={submitSetting}>Guardar setting</Button>
      </Card>

      <Card id="products" className="space-y-3 lg:col-span-2 scroll-mt-28">
        <h3 className="font-display text-lg text-white">Visibilidad de productos</h3>
        <div className="space-y-2">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <div>
                <p className="text-sm text-white">{product.sku}</p>
                <p className="text-xs text-neutral-400">
                  {product.designs?.name ?? "Sin diseño"} | Stock: {product.stock}
                </p>
              </div>
              <Button variant={product.is_active ? "default" : "secondary"} onClick={() => toggleProduct(product.id, product.is_active)}>
                {product.is_active ? "Activo" : "Inactivo"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card id="features" className="space-y-3 lg:col-span-2 scroll-mt-28">
        <h3 className="font-display text-lg text-white">Feature flags</h3>
        <div className="space-y-2">
          {features.map((feature) => (
            <div key={feature.name} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <p className="text-sm text-white">{feature.name}</p>
              <Button variant={feature.enabled ? "default" : "secondary"} onClick={() => toggleFeature(feature.name, feature.enabled)}>
                {feature.enabled ? "ON" : "OFF"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card id="history" className="space-y-3 lg:col-span-2 scroll-mt-28">
        <h3 className="font-display text-lg text-white">Historial de cambios</h3>
        <div className="space-y-2">
          {activity.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-sm text-white">
                {item.action} | {item.entity}
              </p>
              <p className="text-xs text-neutral-400">{new Date(item.created_at).toLocaleString("es-CO")}</p>
            </div>
          ))}
        </div>
      </Card>

      {message ? <p className="text-sm text-neutral-300 lg:col-span-2">{message}</p> : null}
    </div>
  );
}
