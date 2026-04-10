"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Clock3,
  Copy,
  Flag,
  ImagePlus,
  Images,
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Store,
  Tags,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { cn, formatCOP, formatDateTimeShort, getPromotionMeta } from "@/lib/utils";

type Design = {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  image_url: string | null;
  base_price: number;
  discount_price: number | null;
  promotion_label: string | null;
  promotion_active: boolean;
  promotion_starts_at: string | null;
  promotion_ends_at: string | null;
  is_active: boolean;
  created_at?: string;
};

type Brand = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  description?: string;
  is_active?: boolean;
};

type AdminImage = {
  id: string;
  url: string;
  alt: string | null;
  brand_id: string | null;
  design_id: string | null;
  is_carousel: boolean;
  carousel_order: number;
  created_at: string;
};

type Feature = {
  id: string;
  key: string;
  enabled: boolean;
};

type Setting = {
  id: string;
  key: string;
  value: string;
};

type ActivityLog = {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
};

type Product = {
  id: string;
  sku: string;
  stock: number;
  is_active: boolean;
  design_name: string;
};

type TabKey =
  | "overview"
  | "carousel"
  | "catalog"
  | "brands"
  | "gallery"
  | "settings"
  | "features"
  | "activity";

type LoadingMap = Record<TabKey, boolean>;

type InlineField =
  | "name"
  | "brand_id"
  | "short_description"
  | "base_price"
  | "discount_price"
  | "promotion_label"
  | "is_active"
  | "promotion_active";

type UploadDraft = {
  id: string;
  file: File;
  preview: string;
  alt: string;
  brand_id: string;
  design_id: string;
  is_carousel: boolean;
  folder: "carousel" | "designs" | "brands";
};

type ConfirmState = {
  open: boolean;
  title: string;
  description: string;
  action: (() => Promise<void>) | null;
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

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "overview", label: "Inicio", icon: LayoutDashboard },
  { key: "carousel", label: "Carrusel Semanal", icon: Images },
  { key: "catalog", label: "Catalogo de Diseños", icon: Tags },
  { key: "brands", label: "Marcas", icon: Store },
  { key: "gallery", label: "Galeria de Fotos", icon: ImagePlus },
  { key: "settings", label: "Textos y Config", icon: Settings2 },
  { key: "features", label: "Feature Flags", icon: Flag },
  { key: "activity", label: "Actividad", icon: Activity }
];

const SETTINGS_KEYS = [
  { key: "business_name", label: "Nombre del negocio" },
  { key: "hero_tagline", label: "Eslogan / tagline" },
  { key: "hero_description", label: "Descripcion hero" },
  { key: "hero_cta_text", label: "Texto boton principal" },
  { key: "about_description", label: "Texto Sobre Nosotros" },
  { key: "whatsapp_number", label: "Numero WhatsApp" },
  { key: "whatsapp_default_message", label: "Mensaje predeterminado WhatsApp" },
  { key: "meta_title", label: "Meta title" },
  { key: "meta_description", label: "Meta description" }
];

const settingsFormSchema = z.object({
  business_name: z.string().min(2).max(120),
  hero_tagline: z.string().min(2).max(180),
  hero_description: z.string().min(10).max(500),
  hero_cta_text: z.string().min(2).max(80),
  about_description: z.string().min(10).max(700),
  whatsapp_number: z.string().min(7).max(30),
  whatsapp_default_message: z.string().min(4).max(300),
  meta_title: z.string().min(5).max(120),
  meta_description: z.string().min(10).max(220)
});

const EMPTY_DESIGN_FORM: DesignForm = {
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

function toSlug(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function fromDatetimeLocal(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getCsrfToken() {
  const cookie = document.cookie;
  const tokenA = cookie.match(/csrf-token=([^;]+)/)?.[1];
  const tokenB = cookie.match(/csrf_token=([^;]+)/)?.[1];
  return tokenA ?? tokenB ?? "";
}

function parseSettingValue(raw: unknown) {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const maybeText = (raw as { text?: unknown }).text;
    if (typeof maybeText === "string") return maybeText;
    return JSON.stringify(raw);
  }
  return "";
}

function mapDesignFromApi(raw: unknown): Design {
  const item = raw as Partial<Design>;
  return {
    id: String(item.id ?? ""),
    brand_id: String(item.brand_id ?? ""),
    name: String(item.name ?? ""),
    slug: String(item.slug ?? ""),
    short_description: item.short_description ?? "",
    image_url: item.image_url ?? null,
    base_price: Number(item.base_price ?? 0),
    discount_price: item.discount_price == null ? null : Number(item.discount_price),
    promotion_label: item.promotion_label ?? "",
    promotion_active: Boolean(item.promotion_active),
    promotion_starts_at: item.promotion_starts_at ?? null,
    promotion_ends_at: item.promotion_ends_at ?? null,
    is_active: Boolean(item.is_active),
    created_at: item.created_at
  };
}

function mapImageFromApi(raw: unknown): AdminImage {
  const item = raw as {
    id?: string;
    storage_path?: string;
    url?: string;
    alt_text?: string;
    alt?: string;
    brand_id?: string | null;
    design_id?: string | null;
    is_weekly_highlight?: boolean;
    is_carousel?: boolean;
    carousel_order?: number;
    created_at?: string;
  };

  return {
    id: String(item.id ?? ""),
    url: String(item.storage_path ?? item.url ?? ""),
    alt: item.alt_text ?? item.alt ?? null,
    brand_id: item.brand_id ?? null,
    design_id: item.design_id ?? null,
    is_carousel: Boolean(item.is_weekly_highlight ?? item.is_carousel),
    carousel_order: Number(item.carousel_order ?? 0),
    created_at: String(item.created_at ?? new Date().toISOString())
  };
}

export function AdminDashboardImpl() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [designs, setDesigns] = useState<Design[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<AdminImage[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState<LoadingMap>({
    overview: false,
    carousel: false,
    catalog: false,
    brands: false,
    gallery: false,
    settings: false,
    features: false,
    activity: false
  });

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    description: "",
    action: null
  });

  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<DesignForm>(EMPTY_DESIGN_FORM);

  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand>({ id: "", name: "", slug: "", image_url: null, description: "", is_active: true });
  const [brandSearch, setBrandSearch] = useState("");

  const [editingField, setEditingField] = useState<{ id: string; field: InlineField } | null>(null);
  const [inlineValue, setInlineValue] = useState("");

  const [catalogView, setCatalogView] = useState<"table" | "grid">("table");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogBrandFilter, setCatalogBrandFilter] = useState("all");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [catalogPromoFilter, setCatalogPromoFilter] = useState<"all" | "promo">("all");
  const [catalogSortBy, setCatalogSortBy] = useState<"name" | "price" | "created">("name");

  const [galleryFilter, setGalleryFilter] = useState<"all" | "carousel" | "unlinked">("all");
  const [galleryBrandFilter, setGalleryBrandFilter] = useState("all");
  const [galleryDesignFilter, setGalleryDesignFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState<AdminImage | null>(null);

  const [uploadQueue, setUploadQueue] = useState<UploadDraft[]>([]);
  const [carouselUpload, setCarouselUpload] = useState<UploadDraft | null>(null);
  const [carouselDropActive, setCarouselDropActive] = useState(false);

  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);

  const [carouselOrder, setCarouselOrder] = useState<string[]>([]);

  const designsById = useMemo(() => new Map(designs.map((d) => [d.id, d])), [designs]);

  const brandCounts = useMemo(() => {
    const count = new Map<string, number>();
    designs.forEach((d) => count.set(d.brand_id, (count.get(d.brand_id) ?? 0) + 1));
    return count;
  }, [designs]);

  const carouselImages = useMemo(() => {
    const onlyCarousel = images.filter((img) => img.is_carousel);
    const orderMap = new Map(carouselOrder.map((id, index) => [id, index]));
    return [...onlyCarousel]
      .sort((a, b) => {
        const idxA = orderMap.get(a.id);
        const idxB = orderMap.get(b.id);
        if (idxA != null && idxB != null) return idxA - idxB;
        if (idxA != null) return -1;
        if (idxB != null) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .map((item, index) => ({ ...item, carousel_order: index + 1 }));
  }, [images, carouselOrder]);

  const filteredDesigns = useMemo(() => {
    let list = [...designs];
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (catalogBrandFilter !== "all") {
      list = list.filter((d) => d.brand_id === catalogBrandFilter);
    }
    if (catalogStatusFilter !== "all") {
      list = list.filter((d) => d.is_active === (catalogStatusFilter === "active"));
    }
    if (catalogPromoFilter === "promo") {
      list = list.filter((d) => d.promotion_active);
    }

    if (catalogSortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    if (catalogSortBy === "price") list.sort((a, b) => a.base_price - b.base_price);
    if (catalogSortBy === "created") {
      list.sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() -
          new Date(a.created_at ?? 0).getTime()
      );
    }
    return list;
  }, [designs, catalogSearch, catalogBrandFilter, catalogStatusFilter, catalogPromoFilter, catalogSortBy]);

  const filteredGallery = useMemo(() => {
    let list = [...images];
    if (galleryFilter === "carousel") list = list.filter((img) => img.is_carousel);
    if (galleryFilter === "unlinked") list = list.filter((img) => !img.brand_id && !img.design_id);
    if (galleryBrandFilter !== "all") list = list.filter((img) => img.brand_id === galleryBrandFilter);
    if (galleryDesignFilter !== "all") list = list.filter((img) => img.design_id === galleryDesignFilter);
    return list;
  }, [images, galleryFilter, galleryBrandFilter, galleryDesignFilter]);

  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();
    if (!query) return brands;
    return brands.filter((brand) => {
      const name = brand.name.toLowerCase();
      const slug = brand.slug.toLowerCase();
      return name.includes(query) || slug.includes(query);
    });
  }, [brands, brandSearch]);

  const metrics = useMemo(() => {
    const promoLive = designs.filter((d) => {
      const meta = getPromotionMeta(
        d.base_price,
        d.discount_price,
        d.promotion_active,
        d.promotion_starts_at,
        d.promotion_ends_at
      );
      return meta.hasPromotion;
    }).length;
    return {
      designsActive: designs.filter((d) => d.is_active).length,
      totalBrands: brands.length,
      totalImages: images.length,
      carousel: carouselImages.length,
      promotionsLive: promoLive
    };
  }, [designs, brands, images, carouselImages.length]);

  const alerts = useMemo(() => {
    const withoutImage = designs.filter((d) => !d.image_url).length;
    const expired = designs.filter(
      (d) => d.promotion_active && d.promotion_ends_at && new Date(d.promotion_ends_at) < new Date()
    ).length;
    return {
      withoutImage,
      expired,
      emptyCarousel: carouselImages.length === 0
    };
  }, [designs, carouselImages.length]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === "all") return activity;
    return activity.filter((a) => a.action === activityFilter);
  }, [activity, activityFilter]);

  const pagedActivity = useMemo(() => {
    const start = (activityPage - 1) * 10;
    return filteredActivity.slice(start, start + 10);
  }, [filteredActivity, activityPage]);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    void loadByTab(activeTab);
  }, [activeTab]);

  async function bootstrap() {
    await Promise.all([
      loadDesigns(),
      loadBrands(),
      loadImages(),
      loadSettings(),
      loadFeatures(),
      loadActivity(),
      loadProducts()
    ]);
  }

  async function loadByTab(tab: TabKey) {
    if (tab === "overview") {
      await Promise.all([loadDesigns(), loadBrands(), loadImages(), loadActivity()]);
      return;
    }
    if (tab === "carousel") {
      await loadImages();
      return;
    }
    if (tab === "catalog") {
      await Promise.all([loadDesigns(), loadBrands()]);
      return;
    }
    if (tab === "brands") {
      await Promise.all([loadBrands(), loadDesigns()]);
      return;
    }
    if (tab === "gallery") {
      await Promise.all([loadImages(), loadBrands(), loadDesigns()]);
      return;
    }
    if (tab === "settings") {
      await loadSettings();
      return;
    }
    if (tab === "features") {
      await loadFeatures();
      return;
    }
    if (tab === "activity") {
      await loadActivity();
    }
  }

  function markLoading(tab: TabKey, value: boolean) {
    setLoading((prev) => ({ ...prev, [tab]: value }));
  }

  function notify(type: "success" | "error", text: string) {
    setToast({ type, text });
  }

  async function loadDesigns() {
    markLoading("catalog", true);
    markLoading("overview", true);
    try {
      const res = await fetch("/api/admin/designs", { cache: "no-store" });
      const body = (await res.json()) as { data?: unknown[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar diseños");
      setDesigns((body.data ?? []).map(mapDesignFromApi));
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      markLoading("catalog", false);
      markLoading("overview", false);
    }
  }

  async function loadBrands() {
    markLoading("brands", true);
    markLoading("overview", true);
    try {
      const res = await fetch("/api/admin/brands", { cache: "no-store" });
      const body = (await res.json()) as { data?: Array<Brand & { logo_url?: string | null }>; error?: string };
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar marcas");
      setBrands((body.data ?? []).map((b) => ({ ...b, image_url: b.logo_url ?? b.image_url ?? null })));
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      markLoading("brands", false);
      markLoading("overview", false);
    }
  }

  async function loadImages() {
    markLoading("gallery", true);
    markLoading("carousel", true);
    markLoading("overview", true);
    try {
      const res = await fetch("/api/admin/images", { cache: "no-store" });
      const body = (await res.json()) as { data?: unknown[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar imagenes");
      setImages((body.data ?? []).map(mapImageFromApi));
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      markLoading("gallery", false);
      markLoading("carousel", false);
      markLoading("overview", false);
    }
  }

  async function loadSettings() {
    markLoading("settings", true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const body = (await res.json()) as { data?: Array<{ id?: string; key?: string; value?: unknown }>; error?: string };
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar settings");
      const mapped = (body.data ?? []).map((item) => ({
        id: String(item.id ?? ""),
        key: String(item.key ?? ""),
        value: parseSettingValue(item.value)
      }));
      setSettings(mapped);

      const next: Record<string, string> = {};
      SETTINGS_KEYS.forEach(({ key }) => {
        next[key] = mapped.find((s) => s.key === key)?.value ?? "";
      });
      setSettingsForm(next);

      const carouselOrderRaw = body.data?.find((s) => s.key === "carousel_order")?.value;
      if (carouselOrderRaw && typeof carouselOrderRaw === "object") {
        const ids = (carouselOrderRaw as { ids?: unknown }).ids;
        if (Array.isArray(ids)) setCarouselOrder(ids.map((x) => String(x)));
      }
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      markLoading("settings", false);
    }
  }

  async function loadFeatures() {
    markLoading("features", true);
    try {
      const res = await fetch("/api/admin/features", { cache: "no-store" });
      const body = (await res.json()) as { data?: Array<{ id?: string; name?: string; key?: string; enabled?: boolean }>; error?: string };
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar features");
      setFeatures(
        (body.data ?? []).map((item) => ({
          id: String(item.id ?? item.name ?? item.key ?? ""),
          key: String(item.key ?? item.name ?? ""),
          enabled: Boolean(item.enabled)
        }))
      );
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      markLoading("features", false);
    }
  }

  async function loadActivity() {
    markLoading("activity", true);
    markLoading("overview", true);
    try {
      const res = await fetch("/api/admin/activity", { cache: "no-store" });
      const body = (await res.json()) as { data?: Array<{ id?: string; action?: string; entity?: string; detail?: unknown; created_at?: string }>; error?: string };
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar actividad");
      setActivity(
        (body.data ?? []).map((item) => ({
          id: String(item.id ?? ""),
          action: String(item.action ?? ""),
          details: item.detail == null ? null : JSON.stringify(item.detail),
          created_at: String(item.created_at ?? new Date().toISOString())
        }))
      );
    } catch (error) {
      notify("error", (error as Error).message);
    } finally {
      markLoading("activity", false);
      markLoading("overview", false);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      const body = (await res.json()) as {
        data?: Array<{ id: string; sku: string; stock: number; is_active: boolean; designs?: { name?: string } | null }>;
      };
      if (!res.ok) return;
      setProducts(
        (body.data ?? []).map((p) => ({
          id: p.id,
          sku: p.sku,
          stock: p.stock,
          is_active: p.is_active,
          design_name: p.designs?.name ?? "Sin diseño"
        }))
      );
    } catch {
      // no-op
    }
  }

  function openConfirm(title: string, description: string, action: () => Promise<void>) {
    setConfirmState({ open: true, title, description, action });
  }

  async function runConfirmAction() {
    if (!confirmState.action) return;
    await confirmState.action();
    setConfirmState({ open: false, title: "", description: "", action: null });
  }

  function designToPayload(design: Design) {
    return {
      id: design.id,
      brand_id: design.brand_id,
      name: design.name,
      slug: design.slug,
      short_description: design.short_description ?? "",
      image_url: design.image_url ?? "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      base_price: Number(design.base_price),
      discount_price: design.discount_price,
      promotion_label: design.promotion_label ?? "",
      promotion_active: design.promotion_active,
      promotion_starts_at: design.promotion_starts_at,
      promotion_ends_at: design.promotion_ends_at,
      is_active: design.is_active
    };
  }

  async function patchDesignOptimistic(id: string, changes: Partial<Design>) {
    const current = designsById.get(id);
    if (!current) return;
    const previous = [...designs];
    const next = designs.map((d) => (d.id === id ? { ...d, ...changes } : d));
    setDesigns(next);

    const toPersist = next.find((d) => d.id === id);
    if (!toPersist) return;

    const res = await fetch("/api/admin/designs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify(designToPayload(toPersist))
    });

    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setDesigns(previous);
      notify("error", body.error ?? "No se pudo guardar diseño");
      return;
    }
    notify("success", "Diseño actualizado");
  }

  function startInlineEdit(design: Design, field: InlineField) {
    setEditingField({ id: design.id, field });
    setInlineValue(String((design as unknown as Record<string, unknown>)[field] ?? ""));
  }

  function cancelInline() {
    setEditingField(null);
    setInlineValue("");
  }

  async function commitInline() {
    if (!editingField) return;
    const design = designsById.get(editingField.id);
    if (!design) return;

    const field = editingField.field;
    const value = inlineValue.trim();
    let changes: Partial<Design> = {};

    if (field === "name") changes = { name: value, slug: toSlug(value) };
    if (field === "short_description") changes = { short_description: value };
    if (field === "base_price") changes = { base_price: Number(value || 0) };
    if (field === "discount_price") changes = { discount_price: value ? Number(value) : null };
    if (field === "promotion_label") changes = { promotion_label: value };

    if (Object.keys(changes).length > 0) {
      await patchDesignOptimistic(design.id, changes);
    }

    cancelInline();
  }

  function openNewDesignModal() {
    setEditingDesign(EMPTY_DESIGN_FORM);
    setDesignModalOpen(true);
  }

  function openEditDesignModal(design: Design) {
    setEditingDesign({
      id: design.id,
      brand_id: design.brand_id,
      name: design.name,
      slug: design.slug,
      short_description: design.short_description ?? "",
      image_url: design.image_url ?? "",
      base_price: design.base_price,
      discount_price: design.discount_price,
      promotion_label: design.promotion_label ?? "",
      promotion_active: design.promotion_active,
      promotion_starts_at: toDatetimeLocal(design.promotion_starts_at),
      promotion_ends_at: toDatetimeLocal(design.promotion_ends_at),
      is_active: design.is_active
    });
    setDesignModalOpen(true);
  }

  async function saveDesignModal() {
    const isEdit = Boolean(editingDesign.id);
    const payload = {
      ...(editingDesign.id ? { id: editingDesign.id } : {}),
      brand_id: editingDesign.brand_id,
      name: editingDesign.name,
      slug: editingDesign.slug || toSlug(editingDesign.name),
      short_description: editingDesign.short_description,
      image_url: editingDesign.image_url,
      base_price: Number(editingDesign.base_price),
      discount_price: editingDesign.discount_price,
      promotion_label: editingDesign.promotion_label,
      promotion_active: editingDesign.promotion_active,
      promotion_starts_at: fromDatetimeLocal(editingDesign.promotion_starts_at),
      promotion_ends_at: fromDatetimeLocal(editingDesign.promotion_ends_at),
      is_active: editingDesign.is_active
    };

    const res = await fetch("/api/admin/designs", {
      method: isEdit ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify(payload)
    });

    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      notify("error", body.error ?? "No se pudo guardar diseño");
      return;
    }

    notify("success", isEdit ? "Diseño actualizado" : "Diseño creado");
    setDesignModalOpen(false);
    await Promise.all([loadDesigns(), loadActivity()]);
  }

  async function uploadImageForDesign(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "designs");
    formData.append("alt", editingDesign.name || "Diseño");
    formData.append("alt_text", editingDesign.name || "Diseño");
    formData.append("is_carousel", "false");
    formData.append("is_weekly_highlight", "false");
    if (editingDesign.id) formData.append("design_id", editingDesign.id);
    if (editingDesign.brand_id) formData.append("brand_id", editingDesign.brand_id);

    const res = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() },
      body: formData
    });
    const body = (await res.json()) as { error?: string; url?: string };
    if (!res.ok || !body.url) {
      notify("error", body.error ?? "No se pudo subir imagen");
      return;
    }
    setEditingDesign((prev) => ({ ...prev, image_url: body.url ?? prev.image_url }));
    notify("success", "Imagen principal cargada");
  }

  function applyPromotionPreset(hours: number) {
    const now = new Date();
    const end = new Date(now.getTime() + hours * 60 * 60 * 1000);
    setEditingDesign((prev) => ({
      ...prev,
      promotion_active: true,
      promotion_starts_at: toDatetimeLocal(now.toISOString()),
      promotion_ends_at: toDatetimeLocal(end.toISOString())
    }));
  }

  async function toggleFeature(feature: Feature) {
    const previous = [...features];
    setFeatures((prev) => prev.map((f) => (f.id === feature.id ? { ...f, enabled: !f.enabled } : f)));

    const res = await fetch("/api/admin/features", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify({ name: feature.key, enabled: !feature.enabled })
    });

    if (!res.ok) {
      setFeatures(previous);
      notify("error", "No se pudo actualizar feature");
      return;
    }
    notify("success", "Feature actualizada");
  }

  async function saveSettingsForm() {
    const parsed = settingsFormSchema.safeParse(settingsForm);
    if (!parsed.success) {
      notify("error", parsed.error.issues[0]?.message ?? "Settings invalidos");
      return;
    }

    for (const entry of SETTINGS_KEYS) {
      const value = settingsForm[entry.key] ?? "";
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken()
        },
        body: JSON.stringify({ key: entry.key, value: { text: value } })
      });
      if (!res.ok) {
        notify("error", `No se pudo guardar ${entry.label}`);
        return;
      }
    }

    notify("success", "Configuracion guardada");
    await loadSettings();
  }

  async function toggleProduct(product: Product) {
    const prev = [...products];
    setProducts((p) => p.map((item) => (item.id === product.id ? { ...item, is_active: !item.is_active } : item)));
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify({ id: product.id, is_active: !product.is_active })
    });
    if (!res.ok) {
      setProducts(prev);
      notify("error", "No se pudo actualizar el producto");
      return;
    }
    notify("success", "Visibilidad de producto actualizada");
  }

  async function saveBrand() {
    const isEdit = Boolean(editingBrand.id);
    const payload = {
      ...(isEdit ? { id: editingBrand.id } : {}),
      name: editingBrand.name,
      slug: editingBrand.slug || toSlug(editingBrand.name),
      description: editingBrand.description ?? "",
      logo_url: editingBrand.image_url ?? null,
      is_active: editingBrand.is_active ?? true
    };
    const res = await fetch("/api/admin/brands", {
      method: isEdit ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      notify("error", "No se pudo guardar marca");
      return;
    }
    notify("success", isEdit ? "Marca actualizada" : "Marca creada");
    setBrandModalOpen(false);
    await Promise.all([loadBrands(), loadActivity()]);
  }

  async function uploadBrandImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "brands");
    formData.append("alt", editingBrand.name || "Marca");
    formData.append("alt_text", editingBrand.name || "Marca");
    formData.append("is_carousel", "false");
    formData.append("is_weekly_highlight", "false");
    if (editingBrand.id) formData.append("brand_id", editingBrand.id);

    const res = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() },
      body: formData
    });
    const body = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !body.url) {
      notify("error", body.error ?? "No se pudo subir imagen de marca");
      return;
    }
    setEditingBrand((prev) => ({ ...prev, image_url: body.url }));
    notify("success", "Imagen de marca actualizada");
  }

  async function pushCarouselOrder(next: AdminImage[]) {
    const ids = next.map((img) => img.id);
    setCarouselOrder(ids);
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify({ key: "carousel_order", value: { ids } })
    });
  }

  async function moveCarouselImage(id: string, direction: "up" | "down") {
    const list = [...carouselImages];
    const index = list.findIndex((img) => img.id === id);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    await pushCarouselOrder(copy);
    notify("success", "Orden del carrusel actualizado");
  }

  async function patchImage(imageId: string, changes: Partial<AdminImage>) {
    const prev = [...images];
    setImages((list) => list.map((img) => (img.id === imageId ? { ...img, ...changes } : img)));

    const body = {
      id: imageId,
      alt_text: changes.alt,
      brand_id: changes.brand_id,
      design_id: changes.design_id,
      is_weekly_highlight: changes.is_carousel
    };

    const res = await fetch("/api/admin/images", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      setImages(prev);
      notify("error", "No se pudo actualizar imagen");
      return;
    }
    notify("success", "Imagen actualizada");
  }

  async function deleteImage(image: AdminImage) {
    const prev = [...images];
    setImages((list) => list.filter((img) => img.id !== image.id));
    const res = await fetch("/api/admin/images", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify({ id: image.id, storage_path: image.url })
    });
    if (!res.ok) {
      setImages(prev);
      notify("error", "No se pudo eliminar imagen");
      return;
    }
    notify("success", "Imagen eliminada");
  }

  async function uploadCarouselImage() {
    if (!carouselUpload) return;
    if (carouselImages.length >= 8) {
      notify("error", "Maximo 8 fotos en carrusel");
      return;
    }
    const data = new FormData();
    data.append("file", carouselUpload.file);
    data.append("folder", "carousel");
    data.append("alt", carouselUpload.alt);
    data.append("alt_text", carouselUpload.alt);
    data.append("is_carousel", "true");
    data.append("is_weekly_highlight", "true");

    const res = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() },
      body: data
    });

    if (!res.ok) {
      notify("error", "No se pudo subir imagen al carrusel");
      return;
    }

    setCarouselUpload(null);
    await loadImages();
    notify("success", "Imagen agregada al carrusel");
  }

  async function clearCarousel() {
    const jobs = carouselImages.map((image) =>
      fetch("/api/admin/images", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken()
        },
        body: JSON.stringify({ id: image.id, is_weekly_highlight: false })
      })
    );
    await Promise.all(jobs);
    setCarouselOrder([]);
    notify("success", "Carrusel limpiado");
    await loadImages();
  }

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const next: UploadDraft[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      alt: file.name.replace(/\.[^/.]+$/, ""),
      brand_id: "",
      design_id: "",
      is_carousel: false,
      folder: "designs"
    }));
    setUploadQueue((prev) => [...prev, ...next]);
  }

  async function uploadQueueAll() {
    if (!uploadQueue.length) return;
    for (const item of uploadQueue) {
      const data = new FormData();
      data.append("file", item.file);
      data.append("folder", item.folder);
      data.append("alt", item.alt);
      data.append("alt_text", item.alt);
      data.append("is_carousel", String(item.is_carousel));
      data.append("is_weekly_highlight", String(item.is_carousel));
      if (item.brand_id) data.append("brand_id", item.brand_id);
      if (item.design_id) data.append("design_id", item.design_id);

      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() },
        body: data
      });

      if (!res.ok) {
        notify("error", `Error subiendo ${item.file.name}`);
        return;
      }
    }

    setUploadQueue([]);
    await loadImages();
    notify("success", "Carga multiple completada");
  }

  function getBrandName(brandId: string | null) {
    if (!brandId) return "Sin vincular";
    return brands.find((b) => b.id === brandId)?.name ?? "Sin vincular";
  }

  function getDesignName(designId: string | null) {
    if (!designId) return "Sin vincular";
    return designs.find((d) => d.id === designId)?.name ?? "Sin vincular";
  }

  function renderSkeleton(rows = 6) {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-14 animate-pulse rounded-xl border border-neutral-700 bg-neutral-900" />
        ))}
      </div>
    );
  }

  function formatRelativeTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "fecha inválida";

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "hace unos segundos";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days} d`;

    const months = Math.floor(days / 30);
    if (months < 12) return `hace ${months} mes${months > 1 ? "es" : ""}`;

    const years = Math.floor(months / 12);
    return `hace ${years} año${years > 1 ? "s" : ""}`;
  }

  function getActivityIcon(action: string) {
    const normalized = action.toLowerCase();
    if (normalized.includes("create") || normalized.includes("insert")) return Plus;
    if (normalized.includes("update") || normalized.includes("edit") || normalized.includes("toggle")) return Pencil;
    if (normalized.includes("delete") || normalized.includes("remove")) return Trash2;
    if (normalized.includes("upload")) return Upload;
    return Activity;
  }

  function handleCarouselDrop(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setCarouselUpload({
      id: `${file.name}-${Date.now()}`,
      file,
      preview: URL.createObjectURL(file),
      alt: file.name.replace(/\.[^/.]+$/, ""),
      brand_id: "",
      design_id: "",
      is_carousel: true,
      folder: "carousel"
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-neutral-700 bg-neutral-900">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "secondary"}
                size="sm"
                className={cn(activeTab === tab.key ? "bg-orange-500 hover:bg-orange-400" : "")}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="mr-1.5 h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </Card>

      {toast ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            toast.type === "success"
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-400/40 bg-red-500/10 text-red-200"
          )}
        >
          {toast.text}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          {loading.overview ? renderSkeleton(4) : null}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Diseños activos</p><p className="font-display text-2xl text-white">{metrics.designsActive}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Marcas</p><p className="font-display text-2xl text-white">{metrics.totalBrands}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Fotos catálogo</p><p className="font-display text-2xl text-white">{metrics.totalImages}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Fotos carrusel</p><p className="font-display text-2xl text-white">{metrics.carousel}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Promociones live</p><p className="font-display text-2xl text-white">{metrics.promotionsLive}</p></Card>
          </div>

          <Card className="border-neutral-700 bg-neutral-900 p-4">
            <h3 className="mb-3 font-display text-lg text-white">Accesos rápidos</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setActiveTab("carousel")}>Carrusel</Button>
              <Button size="sm" variant="secondary" onClick={() => setActiveTab("catalog")}>Diseños</Button>
              <Button size="sm" variant="secondary" onClick={() => setActiveTab("brands")}>Marcas</Button>
              <Button size="sm" variant="secondary" onClick={() => setActiveTab("gallery")}>Galería</Button>
              <Button size="sm" variant="secondary" onClick={() => setActiveTab("settings")}>Textos</Button>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-neutral-700 bg-neutral-900 p-4">
              <h3 className="mb-3 font-display text-lg text-white">Alertas</h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-neutral-200"><AlertTriangle className="h-4 w-4 text-amber-300" /> Diseños sin imagen: {alerts.withoutImage}</p>
                <p className="flex items-center gap-2 text-neutral-200"><AlertTriangle className="h-4 w-4 text-amber-300" /> Promociones vencidas: {alerts.expired}</p>
                <p className="flex items-center gap-2 text-neutral-200"><AlertTriangle className="h-4 w-4 text-amber-300" /> Carrusel vacío: {alerts.emptyCarousel ? "Sí" : "No"}</p>
              </div>
            </Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4">
              <h3 className="mb-3 font-display text-lg text-white">Última actividad</h3>
              <div className="space-y-2 text-sm">
                {activity.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-lg border border-neutral-700 p-2">
                        <p className="text-white">{item.action}</p>
                        <p className="text-xs text-neutral-400">{formatRelativeTime(item.created_at)} · {new Date(item.created_at).toLocaleString("es-CO")}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {activeTab === "carousel" ? (
        <Card className="space-y-4 border-neutral-700 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-white">Carrusel semanal</h3>
            <p className="text-sm text-neutral-400">{carouselImages.length}/8 fotos</p>
          </div>

          {loading.carousel ? renderSkeleton(4) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {carouselImages.map((img, index) => (
              <div key={img.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3">
                <img src={img.url} alt={img.alt ?? "carousel"} className="h-40 w-full rounded-lg object-cover" />
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>Orden #{index + 1}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => void moveCarouselImage(img.id, "up")}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="sm" variant="secondary" onClick={() => void moveCarouselImage(img.id, "down")}><ArrowDown className="h-4 w-4" /></Button>
                  </div>
                </div>
                <Input
                  className="mt-2"
                  value={img.alt ?? ""}
                  onChange={(e) => setImages((prev) => prev.map((x) => (x.id === img.id ? { ...x, alt: e.target.value } : x)))}
                  onBlur={() => void patchImage(img.id, { alt: images.find((x) => x.id === img.id)?.alt ?? "" })}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      openConfirm("Eliminar foto", "Esta acción eliminará la foto del carrusel.", async () => {
                        await deleteImage(img);
                      })
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Card className="border-neutral-700 bg-neutral-950 p-4">
            <h4 className="mb-2 text-sm text-white">Subir nueva foto</h4>
            <div
              className={cn(
                "mb-3 rounded-xl border-2 border-dashed p-6 text-center text-sm transition",
                carouselDropActive
                  ? "border-orange-400 bg-orange-500/10 text-orange-200"
                  : "border-neutral-700 text-neutral-400"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setCarouselDropActive(true);
              }}
              onDragLeave={() => setCarouselDropActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setCarouselDropActive(false);
                handleCarouselDrop(event.dataTransfer.files);
              }}
            >
              Arrastra una imagen aquí o usa el selector de archivo
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleCarouselDrop(e.target.files);
              }}
            />
            {carouselUpload ? (
              <div className="mt-3 space-y-2">
                <img src={carouselUpload.preview} alt="preview" className="h-40 w-full rounded-lg object-cover" />
                <Input value={carouselUpload.alt} onChange={(e) => setCarouselUpload((prev) => (prev ? { ...prev, alt: e.target.value } : prev))} />
                <div className="flex gap-2">
                  <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => void uploadCarouselImage()}>Confirmar subida</Button>
                  <Button variant="secondary" onClick={() => setCarouselUpload(null)}><X className="mr-1 h-4 w-4" />Cancelar</Button>
                </div>
              </div>
            ) : null}
          </Card>

          <div>
            <Button
              variant="secondary"
              onClick={() =>
                openConfirm("Limpiar carrusel", "Quitarás todas las fotos del carrusel.", async () => {
                  await clearCarousel();
                })
              }
            >
              Limpiar carrusel
            </Button>
          </div>
        </Card>
      ) : null}

      {activeTab === "catalog" ? (
        <Card className="space-y-4 border-neutral-700 bg-neutral-900 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button className="bg-orange-500 hover:bg-orange-400" onClick={openNewDesignModal}><Plus className="mr-1 h-4 w-4" />Nuevo diseño</Button>
            <Button variant="secondary" onClick={() => setCatalogView((v) => (v === "table" ? "grid" : "table"))}>{catalogView === "table" ? "Modo Grid" : "Modo Tabla"}</Button>
            <Button variant="secondary" onClick={() => void loadDesigns()}><RefreshCw className="mr-1 h-4 w-4" />Recargar</Button>
          </div>

          <div className="grid gap-2 md:grid-cols-5">
            <Input placeholder="Buscar diseño" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={catalogBrandFilter} onChange={(e) => setCatalogBrandFilter(e.target.value)}>
              <option value="all">Todas las marcas</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={catalogStatusFilter} onChange={(e) => setCatalogStatusFilter(e.target.value as "all" | "active" | "inactive")}> 
              <option value="all">Todos estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={catalogPromoFilter} onChange={(e) => setCatalogPromoFilter(e.target.value as "all" | "promo")}> 
              <option value="all">Todas promos</option>
              <option value="promo">Solo promo activa</option>
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={catalogSortBy} onChange={(e) => setCatalogSortBy(e.target.value as "name" | "price" | "created")}> 
              <option value="name">Ordenar: nombre</option>
              <option value="price">Ordenar: precio</option>
              <option value="created">Ordenar: creación</option>
            </select>
          </div>

          {loading.catalog ? renderSkeleton(6) : null}

          {catalogView === "table" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-400">
                    <th className="px-2 py-2">Imagen</th>
                    <th className="px-2 py-2">Nombre</th>
                    <th className="px-2 py-2">Marca</th>
                    <th className="px-2 py-2">Descripcion</th>
                    <th className="px-2 py-2">Base</th>
                    <th className="px-2 py-2">Rebaja</th>
                    <th className="px-2 py-2">Etiqueta</th>
                    <th className="px-2 py-2">Estado</th>
                    <th className="px-2 py-2">Promo</th>
                    <th className="px-2 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesigns.map((design) => {
                    const promo = getPromotionMeta(design.base_price, design.discount_price, design.promotion_active, design.promotion_starts_at, design.promotion_ends_at);
                    return (
                      <tr key={design.id} className="border-t border-neutral-800">
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => openEditDesignModal(design)}>
                            <img src={design.image_url ?? "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80"} alt={design.name} className="h-12 w-16 rounded object-cover" />
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          {editingField?.id === design.id && editingField.field === "name" ? (
                            <Input value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => void commitInline()} onKeyDown={(e) => { if (e.key === "Enter") void commitInline(); if (e.key === "Escape") cancelInline(); }} />
                          ) : (
                            <button type="button" className="text-white hover:text-orange-300" onClick={() => startInlineEdit(design, "name")}>{design.name}</button>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className="h-10 rounded-lg border border-neutral-700 bg-neutral-800 px-2 text-white"
                            value={design.brand_id}
                            onChange={(e) => void patchDesignOptimistic(design.id, { brand_id: e.target.value })}
                          >
                            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          {editingField?.id === design.id && editingField.field === "short_description" ? (
                            <Input value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => void commitInline()} onKeyDown={(e) => { if (e.key === "Enter") void commitInline(); if (e.key === "Escape") cancelInline(); }} />
                          ) : (
                            <button type="button" className="text-neutral-200 hover:text-white" onClick={() => startInlineEdit(design, "short_description")}>{design.short_description ?? "-"}</button>
                          )}
                        </td>
                        <td className="px-2 py-2 font-mono">
                          {editingField?.id === design.id && editingField.field === "base_price" ? (
                            <Input type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => void commitInline()} onKeyDown={(e) => { if (e.key === "Enter") void commitInline(); if (e.key === "Escape") cancelInline(); }} />
                          ) : (
                            <button type="button" className="text-white" onClick={() => startInlineEdit(design, "base_price")}>{formatCOP(design.base_price)}</button>
                          )}
                        </td>
                        <td className="px-2 py-2 font-mono">
                          {editingField?.id === design.id && editingField.field === "discount_price" ? (
                            <Input type="number" value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => void commitInline()} onKeyDown={(e) => { if (e.key === "Enter") void commitInline(); if (e.key === "Escape") cancelInline(); }} />
                          ) : (
                            <button type="button" className="text-white" onClick={() => startInlineEdit(design, "discount_price")}>{design.discount_price ? formatCOP(design.discount_price) : "-"}</button>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {editingField?.id === design.id && editingField.field === "promotion_label" ? (
                            <Input value={inlineValue} onChange={(e) => setInlineValue(e.target.value)} onBlur={() => void commitInline()} onKeyDown={(e) => { if (e.key === "Enter") void commitInline(); if (e.key === "Escape") cancelInline(); }} />
                          ) : (
                            <button type="button" className="text-orange-300" onClick={() => startInlineEdit(design, "promotion_label")}>{design.promotion_label || "-"}</button>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Button size="sm" variant={design.is_active ? "default" : "secondary"} onClick={() => void patchDesignOptimistic(design.id, { is_active: !design.is_active })}>
                            {design.is_active ? "Activo" : "Inactivo"}
                          </Button>
                        </td>
                        <td className="px-2 py-2">
                          <Button size="sm" variant={promo.hasPromotion ? "default" : "secondary"} onClick={() => void patchDesignOptimistic(design.id, { promotion_active: !design.promotion_active })}>
                            {promo.hasPromotion ? "Promo ON" : "Promo OFF"}
                          </Button>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onClick={() => openEditDesignModal(design)}><Pencil className="h-4 w-4" /></Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                openConfirm("Eliminar diseño", "Se intentará eliminar este diseño.", async () => {
                                  const res = await fetch("/api/admin/designs", {
                                    method: "DELETE",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "x-csrf-token": getCsrfToken()
                                    },
                                    body: JSON.stringify({ id: design.id })
                                  });
                                  if (!res.ok) {
                                    notify("error", "Este endpoint no está habilitado en backend");
                                    return;
                                  }
                                  await loadDesigns();
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredDesigns.map((design) => {
                const promo = getPromotionMeta(design.base_price, design.discount_price, design.promotion_active, design.promotion_starts_at, design.promotion_ends_at);
                return (
                  <div key={design.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3">
                    <img src={design.image_url ?? "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=400&q=80"} alt={design.name} className="h-40 w-full rounded-lg object-cover" />
                    <p className="mt-2 font-display text-lg text-white">{design.name}</p>
                    <p className="text-xs text-neutral-400">{getBrandName(design.brand_id)}</p>
                    <p className="text-sm text-neutral-300">{design.short_description}</p>
                    <p className="mt-2 font-mono text-orange-300">{promo.hasPromotion && design.discount_price ? formatCOP(design.discount_price) : formatCOP(design.base_price)}</p>
                    {promo.hasPromotion ? <p className="text-xs text-emerald-300">{promo.percentOff}% OFF | ahorro {formatCOP(promo.savings)}</p> : null}
                    <Button className="mt-2" variant="secondary" onClick={() => openEditDesignModal(design)}>Editar</Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}

      {activeTab === "brands" ? (
        <Card className="space-y-4 border-neutral-700 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-white">Marcas</h3>
            <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => { setEditingBrand({ id: "", name: "", slug: "", image_url: null, description: "", is_active: true }); setBrandModalOpen(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Nueva marca
            </Button>
          </div>
          <div className="max-w-md">
            <Input
              placeholder="Buscar marca por nombre o slug"
              value={brandSearch}
              onChange={(event) => setBrandSearch(event.target.value)}
            />
          </div>
          {loading.brands ? renderSkeleton(5) : null}
          <div className="space-y-2">
            {filteredBrands.map((brand) => (
              <div key={brand.id} className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-950 p-3">
                <div className="min-w-0">
                  <p className="text-white">{brand.name}</p>
                  <p className="text-xs text-neutral-400">/{brand.slug} | {brandCounts.get(brand.id) ?? 0} diseños</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingBrand(brand); setBrandModalOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      openConfirm("Eliminar marca", "Si tiene diseños asociados, la operación puede fallar.", async () => {
                        if ((brandCounts.get(brand.id) ?? 0) > 0) {
                          notify("error", "No puedes eliminar una marca con diseños asociados");
                          return;
                        }
                        const res = await fetch("/api/admin/brands", {
                          method: "DELETE",
                          headers: {
                            "Content-Type": "application/json",
                            "x-csrf-token": getCsrfToken()
                          },
                          body: JSON.stringify({ id: brand.id })
                        });
                        if (!res.ok) {
                          notify("error", "Este endpoint no está habilitado en backend");
                          return;
                        }
                        await loadBrands();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Card className="border-neutral-700 bg-neutral-950 p-4">
            <h4 className="mb-2 font-display text-base text-white">Productos (visibilidad rápida)</h4>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between rounded-xl border border-neutral-700 p-2">
                  <div>
                    <p className="text-sm text-white">{product.sku}</p>
                    <p className="text-xs text-neutral-400">{product.design_name} | Stock: {product.stock}</p>
                  </div>
                  <Button size="sm" variant={product.is_active ? "default" : "secondary"} onClick={() => void toggleProduct(product)}>
                    {product.is_active ? "Activo" : "Inactivo"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </Card>
      ) : null}

      {activeTab === "gallery" ? (
        <Card className="space-y-4 border-neutral-700 bg-neutral-900 p-4">
          <div className="grid gap-2 md:grid-cols-4">
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={galleryFilter} onChange={(e) => setGalleryFilter(e.target.value as "all" | "carousel" | "unlinked")}> 
              <option value="all">Todas</option>
              <option value="carousel">Solo carrusel</option>
              <option value="unlinked">Sin vincular</option>
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={galleryBrandFilter} onChange={(e) => setGalleryBrandFilter(e.target.value)}>
              <option value="all">Todas marcas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={galleryDesignFilter} onChange={(e) => setGalleryDesignFilter(e.target.value)}>
              <option value="all">Todos diseños</option>
              {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Input type="file" multiple accept="image/*" onChange={(e) => onFilesSelected(e.target.files)} />
          </div>

          {uploadQueue.length ? (
            <Card className="border-neutral-700 bg-neutral-950 p-3">
              <h4 className="mb-2 text-sm text-white">Carga múltiple ({uploadQueue.length})</h4>
              <div className="space-y-3">
                {uploadQueue.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-xl border border-neutral-700 p-2 md:grid-cols-[100px_1fr]">
                    <img src={item.preview} alt="preview" className="h-24 w-full rounded object-cover" />
                    <div className="space-y-2">
                      <Input value={item.alt} onChange={(e) => setUploadQueue((prev) => prev.map((u) => (u.id === item.id ? { ...u, alt: e.target.value } : u)))} />
                      <div className="grid gap-2 md:grid-cols-3">
                        <select className="h-10 rounded-xl border border-neutral-700 bg-neutral-800 px-2 text-white" value={item.brand_id} onChange={(e) => setUploadQueue((prev) => prev.map((u) => (u.id === item.id ? { ...u, brand_id: e.target.value } : u)))}>
                          <option value="">Marca</option>
                          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <select className="h-10 rounded-xl border border-neutral-700 bg-neutral-800 px-2 text-white" value={item.design_id} onChange={(e) => setUploadQueue((prev) => prev.map((u) => (u.id === item.id ? { ...u, design_id: e.target.value } : u)))}>
                          <option value="">Diseño</option>
                          {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select className="h-10 rounded-xl border border-neutral-700 bg-neutral-800 px-2 text-white" value={item.folder} onChange={(e) => setUploadQueue((prev) => prev.map((u) => (u.id === item.id ? { ...u, folder: e.target.value as "carousel" | "designs" | "brands" } : u)))}>
                          <option value="designs">designs/</option>
                          <option value="brands">brands/</option>
                          <option value="carousel">carousel/</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => void uploadQueueAll()}><Upload className="mr-1 h-4 w-4" />Subir todo</Button>
                <Button variant="secondary" onClick={() => setUploadQueue([])}>Limpiar cola</Button>
              </div>
            </Card>
          ) : null}

          {loading.gallery ? renderSkeleton(8) : null}
          <div className="columns-2 gap-3 space-y-3 md:columns-3 xl:columns-4">
            {filteredGallery.map((img) => (
              <button type="button" key={img.id} className="w-full overflow-hidden rounded-xl border border-neutral-700 bg-neutral-950 p-2 text-left" onClick={() => setSelectedImage(img)}>
                <img src={img.url} alt={img.alt ?? "imagen"} className="mb-2 h-auto w-full rounded" />
                <p className="truncate text-xs text-neutral-300">{img.alt || "Sin alt"}</p>
                <p className="text-[11px] text-neutral-500">{img.is_carousel ? "Carrusel" : "Catalogo"}</p>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {activeTab === "settings" ? (
        <Card className="space-y-3 border-neutral-700 bg-neutral-900 p-4">
          {loading.settings ? renderSkeleton(6) : null}
          {SETTINGS_KEYS.map((item) => (
            <div key={item.key} className="space-y-1">
              <label className="text-xs text-neutral-400">{item.label}</label>
              {item.key.includes("description") || item.key.includes("message") ? (
                <Textarea value={settingsForm[item.key] ?? ""} onChange={(e) => setSettingsForm((prev) => ({ ...prev, [item.key]: e.target.value }))} />
              ) : (
                <Input value={settingsForm[item.key] ?? ""} onChange={(e) => setSettingsForm((prev) => ({ ...prev, [item.key]: e.target.value }))} />
              )}
            </div>
          ))}
          <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => void saveSettingsForm()}><Save className="mr-1 h-4 w-4" />Guardar cambios</Button>
        </Card>
      ) : null}

      {activeTab === "features" ? (
        <Card className="space-y-3 border-neutral-700 bg-neutral-900 p-4">
          {loading.features ? renderSkeleton(6) : null}
          {features.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-950 p-3">
              <div>
                <p className="text-white">{feature.key}</p>
                <p className={cn("text-xs", feature.enabled ? "text-emerald-300" : "text-neutral-500")}>{feature.enabled ? "ACTIVO" : "INACTIVO"}</p>
              </div>
              <Button variant={feature.enabled ? "default" : "secondary"} onClick={() => void toggleFeature(feature)}>
                {feature.enabled ? <Check className="mr-1 h-4 w-4" /> : null}
                {feature.enabled ? "ON" : "OFF"}
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      {activeTab === "activity" ? (
        <Card className="space-y-3 border-neutral-700 bg-neutral-900 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={activityFilter} onChange={(e) => { setActivityFilter(e.target.value); setActivityPage(1); }}>
              <option value="all">Todas las acciones</option>
              {Array.from(new Set(activity.map((a) => a.action))).map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
            <Button variant="secondary" onClick={() => void loadActivity()}><RefreshCw className="mr-1 h-4 w-4" />Recargar</Button>
            <Button
              variant="secondary"
              onClick={() =>
                openConfirm("Limpiar log", "Se eliminará todo el historial de actividad.", async () => {
                  const res = await fetch("/api/admin/activity", {
                    method: "DELETE",
                    headers: { "x-csrf-token": getCsrfToken() }
                  });
                  if (!res.ok) {
                    notify("error", "Este endpoint no está habilitado en backend");
                    return;
                  }
                  await loadActivity();
                  notify("success", "Historial limpiado");
                })
              }
            >
              <Trash2 className="mr-1 h-4 w-4" /> Limpiar log
            </Button>
          </div>

          {loading.activity ? renderSkeleton(8) : null}

          <div className="space-y-2">
            {pagedActivity.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2">
                    {(() => {
                      const Icon = getActivityIcon(entry.action);
                      return <Icon className="mt-0.5 h-4 w-4 text-neutral-400" />;
                    })()}
                    <div>
                      <p className="text-sm text-white">{entry.action}</p>
                      <p className="mt-1 text-xs text-neutral-400">{entry.details ?? "Sin detalles"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-neutral-400 flex items-center justify-end gap-1"><Clock3 className="h-3.5 w-3.5" />{formatRelativeTime(entry.created_at)}</p>
                    <p className="text-xs text-neutral-500">{new Date(entry.created_at).toLocaleString("es-CO")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-neutral-400">
            <span>Página {activityPage}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={activityPage === 1} onClick={() => setActivityPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="secondary" disabled={activityPage * 10 >= filteredActivity.length} onClick={() => setActivityPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        </Card>
      ) : null}

      <Modal open={designModalOpen} onClose={() => setDesignModalOpen(false)} title={editingDesign.id ? "Editar diseño" : "Nuevo diseño"} className="max-w-3xl">
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Nombre" value={editingDesign.name} onChange={(e) => setEditingDesign((p) => ({ ...p, name: e.target.value, slug: toSlug(e.target.value) }))} />
          <Input placeholder="Slug" value={editingDesign.slug} onChange={(e) => setEditingDesign((p) => ({ ...p, slug: e.target.value }))} />
          <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={editingDesign.brand_id} onChange={(e) => setEditingDesign((p) => ({ ...p, brand_id: e.target.value }))}>
            <option value="">Marca</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Input type="number" className="font-mono" placeholder="Precio base" value={editingDesign.base_price} onChange={(e) => setEditingDesign((p) => ({ ...p, base_price: Number(e.target.value || 0) }))} />
          <Input type="number" className="font-mono" placeholder="Precio rebaja" value={editingDesign.discount_price ?? ""} onChange={(e) => setEditingDesign((p) => ({ ...p, discount_price: e.target.value ? Number(e.target.value) : null }))} />
          <Input placeholder="Etiqueta promo" value={editingDesign.promotion_label} onChange={(e) => setEditingDesign((p) => ({ ...p, promotion_label: e.target.value }))} />
          <Input type="datetime-local" value={editingDesign.promotion_starts_at ?? ""} onChange={(e) => setEditingDesign((p) => ({ ...p, promotion_starts_at: e.target.value || null }))} />
          <Input type="datetime-local" value={editingDesign.promotion_ends_at ?? ""} onChange={(e) => setEditingDesign((p) => ({ ...p, promotion_ends_at: e.target.value || null }))} />
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => applyPromotionPreset(48)}>Flash 48h</Button>
            <Button size="sm" variant="secondary" onClick={() => applyPromotionPreset(24 * 7)}>Semana</Button>
            <Button size="sm" variant="secondary" onClick={() => applyPromotionPreset(24 * 30)}>Mensual</Button>
            {[10, 15, 20, 25, 30].map((pct) => (
              <Button key={pct} size="sm" variant="secondary" onClick={() => setEditingDesign((p) => ({ ...p, promotion_active: true, discount_price: Math.max(1, Math.round(p.base_price * (1 - pct / 100))), promotion_label: p.promotion_label || `${pct}% OFF` }))}>
                {pct}% OFF
              </Button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={editingDesign.is_active} onChange={(e) => setEditingDesign((p) => ({ ...p, is_active: e.target.checked }))} />Activo</label>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={editingDesign.promotion_active} onChange={(e) => setEditingDesign((p) => ({ ...p, promotion_active: e.target.checked }))} />Promoción activa</label>
          <div className="md:col-span-2 rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-300">
            {(() => {
              const promo = getPromotionMeta(editingDesign.base_price, editingDesign.discount_price, editingDesign.promotion_active, fromDatetimeLocal(editingDesign.promotion_starts_at), fromDatetimeLocal(editingDesign.promotion_ends_at));
              if (!promo.hasPromotion) return <p>Promo inactiva o fuera de ventana.</p>;
              return <p>Precio final {formatCOP(editingDesign.discount_price ?? 0)} | Antes {formatCOP(editingDesign.base_price)} | Ahorro {formatCOP(promo.savings)} ({promo.percentOff}% OFF)</p>;
            })()}
          </div>
          <Textarea className="md:col-span-2" placeholder="Descripción corta" value={editingDesign.short_description} onChange={(e) => setEditingDesign((p) => ({ ...p, short_description: e.target.value }))} />
          <Input className="md:col-span-2" placeholder="Imagen principal URL" value={editingDesign.image_url} onChange={(e) => setEditingDesign((p) => ({ ...p, image_url: e.target.value }))} />
          <Input className="md:col-span-2" type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImageForDesign(f); }} />
          <div className="md:col-span-2 flex gap-2">
            <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => void saveDesignModal()}><Save className="mr-1 h-4 w-4" />Guardar</Button>
            <Button variant="secondary" onClick={() => setDesignModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={brandModalOpen} onClose={() => setBrandModalOpen(false)} title={editingBrand.id ? "Editar marca" : "Nueva marca"}>
        <div className="space-y-3">
          <Input placeholder="Nombre" value={editingBrand.name} onChange={(e) => setEditingBrand((p) => ({ ...p, name: e.target.value, slug: toSlug(e.target.value) }))} />
          <Input placeholder="Slug" value={editingBrand.slug} onChange={(e) => setEditingBrand((p) => ({ ...p, slug: e.target.value }))} />
          <Input placeholder="Imagen / logo URL" value={editingBrand.image_url ?? ""} onChange={(e) => setEditingBrand((p) => ({ ...p, image_url: e.target.value }))} />
          <Textarea placeholder="Descripción" value={editingBrand.description ?? ""} onChange={(e) => setEditingBrand((p) => ({ ...p, description: e.target.value }))} />
          <Input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadBrandImage(f); }} />
          <label className="inline-flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={editingBrand.is_active ?? true} onChange={(e) => setEditingBrand((p) => ({ ...p, is_active: e.target.checked }))} />Activa</label>
          <div className="flex gap-2">
            <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => void saveBrand()}><Save className="mr-1 h-4 w-4" />Guardar</Button>
            <Button variant="secondary" onClick={() => setBrandModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(selectedImage)} onClose={() => setSelectedImage(null)} title="Detalle de imagen">
        {selectedImage ? (
          <div className="space-y-3">
            <img src={selectedImage.url} alt={selectedImage.alt ?? "imagen"} className="h-56 w-full rounded-xl object-cover" />
            <Input value={selectedImage.alt ?? ""} onChange={(e) => setSelectedImage((prev) => (prev ? { ...prev, alt: e.target.value } : prev))} />
            <div className="grid grid-cols-2 gap-2">
              <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={selectedImage.brand_id ?? ""} onChange={(e) => setSelectedImage((prev) => (prev ? { ...prev, brand_id: e.target.value || null } : prev))}>
                <option value="">Sin marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white" value={selectedImage.design_id ?? ""} onChange={(e) => setSelectedImage((prev) => (prev ? { ...prev, design_id: e.target.value || null } : prev))}>
                <option value="">Sin diseño</option>
                {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={selectedImage.is_carousel} onChange={(e) => setSelectedImage((prev) => (prev ? { ...prev, is_carousel: e.target.checked } : prev))} />Mostrar en carrusel</label>
            <Input value={selectedImage.url} readOnly />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(selectedImage.url); notify("success", "URL copiada"); }}><Copy className="mr-1 h-4 w-4" />Copiar URL</Button>
              <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => void patchImage(selectedImage.id, selectedImage)}><Save className="mr-1 h-4 w-4" />Guardar cambios</Button>
              <Button
                variant="secondary"
                onClick={() =>
                  openConfirm("Eliminar imagen", "Esta acción es irreversible.", async () => {
                    await deleteImage(selectedImage);
                    setSelectedImage(null);
                  })
                }
              >
                <Trash2 className="mr-1 h-4 w-4" />Eliminar
              </Button>
            </div>
            <p className="text-xs text-neutral-500">Marca: {getBrandName(selectedImage.brand_id)} | Diseño: {getDesignName(selectedImage.design_id)}</p>
          </div>
        ) : null}
      </Modal>

      <Modal open={confirmState.open} onClose={() => setConfirmState({ open: false, title: "", description: "", action: null })} title={confirmState.title}>
        <p className="text-sm text-neutral-300">{confirmState.description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmState({ open: false, title: "", description: "", action: null })}>Cancelar</Button>
          <Button className="bg-orange-500 hover:bg-orange-400" onClick={() => void runConfirmAction()}>Confirmar</Button>
        </div>
      </Modal>
    </div>
  );
}

export { AdminDashboardImpl as AdminDashboard };
