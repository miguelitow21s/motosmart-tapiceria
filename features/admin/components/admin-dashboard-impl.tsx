"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Users,
  X
} from "lucide-react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { BusyOverlay } from "@/components/ui/busy-overlay";
import { Label } from "@/components/ui/label";
import { cn, formatCOP, formatDateTimeShort, getPromotionMeta } from "@/lib/utils";
import { getCsrfToken } from "@/lib/csrf-client";
import { readApiError } from "@/lib/api-error-client";
import { parseCarouselOrder, sortByCarouselOrder } from "@/lib/carousel-order";
import { prepareImageForUpload } from "@/lib/prepare-image";
import { RiderPhotosTab } from "@/features/admin/components/rider-photos-tab";

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
  design_id: string;
  sku: string;
  stock: number;
  is_active: boolean;
  design_name: string;
};

type ProductForm = {
  id?: string;
  design_id: string;
  sku: string;
  stock: number;
  is_active: boolean;
};

type TabKey =
  | "overview"
  | "carousel"
  | "catalog"
  | "brands"
  | "gallery"
  | "riders"
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
  // Reemplaza la foto principal del diseño elegido (lo que se ve en el
  // catalogo). Vincular a secas solo organiza la galeria.
  set_as_design_image: boolean;
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
  { key: "catalog", label: "Catálogo de Diseños", icon: Tags },
  { key: "brands", label: "Marcas", icon: Store },
  { key: "gallery", label: "Galería de Fotos", icon: ImagePlus },
  { key: "riders", label: "Pilotos", icon: Users },
  { key: "settings", label: "Textos y Config", icon: Settings2 },
  { key: "features", label: "Feature Flags", icon: Flag },
  { key: "activity", label: "Actividad", icon: Activity }
];

const SETTINGS_KEYS = [
  { key: "business_name", label: "Nombre del negocio" },
  { key: "hero_tagline", label: "Eslogan / tagline" },
  { key: "hero_description", label: "Descripción hero" },
  { key: "hero_cta_text", label: "Texto botón principal" },
  { key: "about_description", label: "Texto Sobre Nosotros" },
  { key: "whatsapp_number", label: "Número WhatsApp" },
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

const EMPTY_PRODUCT_FORM: ProductForm = {
  design_id: "",
  sku: "",
  stock: 0,
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

// Los enlaces del navbar en modo admin usan anclas (/admin#brands, etc.)
// para saltar directo a una pestaña. El dashboard es una SPA por estado
// (activeTab), no por scroll a un id real, asi que hay que traducir el
// hash a una pestaña a mano.
const HASH_TO_TAB: Record<string, TabKey> = {
  brands: "brands",
  designs: "catalog",
  media: "gallery",
  riders: "riders",
  features: "features"
};

function tabFromHash(): TabKey {
  if (typeof window === "undefined") return "overview";
  return HASH_TO_TAB[window.location.hash.replace("#", "")] ?? "overview";
}

export function AdminDashboardImpl() {
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromHash);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // Texto de la pantalla de espera (null = no hay nada en curso). El ref evita
  // el doble clic: dos clics seguidos llegan antes de que React pinte la
  // pantalla, y con solo el estado ambos verian "libre" y guardarian dos veces.
  const [busyText, setBusyText] = useState<string | null>(null);
  const busyRef = useRef(false);

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
    riders: false,
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
  // Foto principal al abrir el modal: si cambia y se cierra sin "Guardar", la
  // web sigue mostrando la anterior. Se avisa en vez de perderla en silencio.
  const [designImageOnOpen, setDesignImageOnOpen] = useState("");

  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand>({ id: "", name: "", slug: "", image_url: null, description: "", is_active: true });
  const [brandSearch, setBrandSearch] = useState("");

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductForm>(EMPTY_PRODUCT_FORM);

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
  // Al entrar a "Textos y Config" se recargan los settings; si la respuesta
  // llegaba despues de empezar a escribir, pisaba lo escrito y "Guardar"
  // guardaba los textos viejos. Los campos editados y aun sin guardar se
  // conservan; el resto se actualiza con lo que diga el servidor.
  const editedSettingKeysRef = useRef(new Set<string>());
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityPage, setActivityPage] = useState(1);

  const [carouselOrder, setCarouselOrder] = useState<string[]>([]);

  const designsById = useMemo(() => new Map(designs.map((d) => [d.id, d])), [designs]);

  const brandCounts = useMemo(() => {
    const count = new Map<string, number>();
    designs.forEach((d) => count.set(d.brand_id, (count.get(d.brand_id) ?? 0) + 1));
    return count;
  }, [designs]);

  // Misma regla de orden que /api/carousel: lo que se ve aqui es lo que ve el publico.
  const carouselImages = useMemo(
    () =>
      sortByCarouselOrder(
        images.filter((img) => img.is_carousel),
        carouselOrder
      ).map((item, index) => ({ ...item, carousel_order: index + 1 })),
    [images, carouselOrder]
  );

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
    if (window.matchMedia("(max-width: 767px)").matches) {
      setCatalogView("grid");
    }
    void bootstrap();
  }, []);

  useEffect(() => {
    function onHashChange() {
      setActiveTab(tabFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    void loadByTab(activeTab);
  }, [activeTab]);

  // El aviso flota encima de todo (tambien de los modales) y se va solo; los
  // errores duran mas para que dé tiempo a leerlos.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.type === "success" ? 4000 : 10000);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
    if (tab === "riders") {
      // RiderPhotosTab gestiona su propia carga de datos de forma autonoma.
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

  // Todo guardado o subida pasa por aqui: muestra la pantalla de espera y, si
  // ya hay algo en curso, ignora el clic en vez de repetir la operacion.
  async function runBusy(text: string, task: () => Promise<unknown>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyText(text);
    try {
      await task();
    } finally {
      busyRef.current = false;
      setBusyText(null);
    }
  }

  function closeUnlessBusy(close: () => void) {
    return () => {
      if (!busyRef.current) close();
    };
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
      if (!res.ok) throw new Error(body.error ?? "No fue posible cargar imágenes");
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

      setSettingsForm((prev) => {
        const next: Record<string, string> = {};
        SETTINGS_KEYS.forEach(({ key }) => {
          next[key] = editedSettingKeysRef.current.has(key)
            ? prev[key] ?? ""
            : mapped.find((s) => s.key === key)?.value ?? "";
        });
        return next;
      });

      setCarouselOrder(parseCarouselOrder(body.data?.find((s) => s.key === "carousel_order")?.value));
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
        data?: Array<{ id: string; design_id: string; sku: string; stock: number; is_active: boolean; designs?: { name?: string } | null }>;
      };
      if (!res.ok) return;
      setProducts(
        (body.data ?? []).map((p) => ({
          id: p.id,
          design_id: p.design_id,
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
      setDesigns(previous);
      notify("error", await readApiError(res, "No se pudo guardar el diseño"));
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
    const field = editingField.field;
    const value = inlineValue.trim();
    // Se cierra la edicion antes de guardar: Enter y luego el blur del mismo
    // campo disparaban dos guardados iguales.
    cancelInline();
    if (!design) return;

    let changes: Partial<Design> = {};

    if (field === "name") changes = { name: value, slug: toSlug(value) };
    if (field === "short_description") changes = { short_description: value };
    if (field === "base_price" || field === "discount_price") {
      const amount = value ? Number(value) : null;
      if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
        notify("error", "Escribe el precio en pesos, solo números");
        return;
      }
      changes = field === "base_price" ? { base_price: amount ?? 0 } : { discount_price: amount };
    }
    if (field === "promotion_label") changes = { promotion_label: value };

    if (Object.keys(changes).length > 0) {
      await patchDesignOptimistic(design.id, changes);
    }
  }

  function openNewDesignModal() {
    setEditingDesign(EMPTY_DESIGN_FORM);
    setDesignImageOnOpen("");
    setDesignModalOpen(true);
  }

  function requestCloseDesignModal() {
    if (busyRef.current) return;
    const photoChanged = editingDesign.image_url !== designImageOnOpen;
    if (
      photoChanged &&
      !window.confirm(
        "Cambiaste la foto principal pero no has guardado el diseño. Si cierras ahora, la web seguirá mostrando la foto anterior. ¿Cerrar sin guardar?"
      )
    ) {
      return;
    }
    setDesignModalOpen(false);
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
    setDesignImageOnOpen(design.image_url ?? "");
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

    if (!res.ok) {
      notify("error", await readApiError(res, "No se pudo guardar el diseño"));
      return;
    }

    notify("success", isEdit ? "Diseño actualizado" : "Diseño creado");
    setDesignModalOpen(false);
    await Promise.all([loadDesigns(), loadImages(), loadActivity()]);
  }

  async function uploadImageForDesign(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", await prepareImageForUpload(file));
      formData.append("alt_text", editingDesign.name || "Diseño");
      formData.append("is_weekly_highlight", "false");
      if (editingDesign.id) formData.append("design_id", editingDesign.id);
      if (editingDesign.brand_id) formData.append("brand_id", editingDesign.brand_id);

      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() },
        body: formData
      });
      if (!res.ok) {
        notify("error", await readApiError(res, "No se pudo subir la foto"));
        return;
      }
      const body = (await res.json()) as { url?: string };
      if (!body.url) {
        notify("error", "No se pudo subir la foto");
        return;
      }
      setEditingDesign((prev) => ({ ...prev, image_url: body.url ?? prev.image_url }));
      // La foto ya esta en la galeria, pero el diseño sigue con la anterior
      // hasta que se guarde: decirlo explicitamente.
      notify("success", "Foto subida. Pulsa «Guardar» para publicarla en la web.");
    } catch {
      notify("error", "No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.");
    }
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

  function updateSettingField(key: string, value: string) {
    editedSettingKeysRef.current.add(key);
    setSettingsForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSettingsForm() {
    const parsed = settingsFormSchema.safeParse(settingsForm);
    if (!parsed.success) {
      notify("error", parsed.error.issues[0]?.message ?? "Configuración inválida");
      return;
    }

    const results = await Promise.allSettled(
      SETTINGS_KEYS.map(async (entry) => {
        const value = settingsForm[entry.key] ?? "";
        const res = await fetch("/api/admin/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken()
          },
          body: JSON.stringify({ key: entry.key, value: { text: value } })
        });
        if (!res.ok) throw new Error(entry.label);
        return entry.label;
      })
    );

    const failedLabels = results
      .map((result, index) => (result.status === "rejected" ? SETTINGS_KEYS[index].label : null))
      .filter((label): label is string => label !== null);
    const savedCount = results.length - failedLabels.length;

    if (failedLabels.length === 0) {
      editedSettingKeysRef.current.clear();
      notify("success", "Configuración guardada");
    } else if (savedCount === 0) {
      notify("error", `No se pudo guardar ninguna configuración: ${failedLabels.join(", ")}`);
    } else {
      notify(
        "error",
        `Se guardaron ${savedCount} de ${results.length} campos. Fallaron: ${failedLabels.join(", ")}`
      );
    }

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

  function openNewProductModal() {
    setEditingProduct(EMPTY_PRODUCT_FORM);
    setProductModalOpen(true);
  }

  function openEditProductModal(product: Product) {
    setEditingProduct({
      id: product.id,
      design_id: product.design_id,
      sku: product.sku,
      stock: product.stock,
      is_active: product.is_active
    });
    setProductModalOpen(true);
  }

  async function saveProduct() {
    const isEdit = Boolean(editingProduct.id);
    const payload = {
      ...(isEdit ? { id: editingProduct.id } : {}),
      design_id: editingProduct.design_id,
      sku: editingProduct.sku,
      stock: Number(editingProduct.stock),
      is_active: editingProduct.is_active
    };

    const res = await fetch("/api/admin/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify(payload)
    });

    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      notify("error", body.error ?? "No se pudo guardar producto");
      return;
    }

    notify("success", isEdit ? "Producto actualizado" : "Producto creado");
    setProductModalOpen(false);
    await Promise.all([loadProducts(), loadActivity()]);
  }

  async function deleteProduct(productId: string) {
    const previous = [...products];
    setProducts((current) => current.filter((item) => item.id !== productId));

    const res = await fetch("/api/admin/products", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify({ id: productId })
    });

    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setProducts(previous);
      notify("error", body.error ?? "No se pudo eliminar producto");
      return;
    }

    notify("success", "Producto eliminado");
  }

  async function saveBrand() {
    const isEdit = Boolean(editingBrand.id);
    const payload = {
      ...(isEdit ? { id: editingBrand.id } : {}),
      name: editingBrand.name,
      slug: editingBrand.slug || toSlug(editingBrand.name),
      description: editingBrand.description ?? "",
      logo_url: editingBrand.image_url?.trim() || null,
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
      notify("error", await readApiError(res, "No se pudo guardar la marca"));
      return;
    }
    notify("success", isEdit ? "Marca actualizada" : "Marca creada");
    setBrandModalOpen(false);
    await Promise.all([loadBrands(), loadImages(), loadActivity()]);
  }

  async function uploadBrandImage(file: File) {
    try {
      const formData = new FormData();
      formData.append("file", await prepareImageForUpload(file));
      formData.append("alt_text", editingBrand.name || "Marca");
      formData.append("is_weekly_highlight", "false");
      if (editingBrand.id) formData.append("brand_id", editingBrand.id);

      const res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() },
        body: formData
      });
      if (!res.ok) {
        notify("error", await readApiError(res, "No se pudo subir el logo"));
        return;
      }
      const body = (await res.json()) as { url?: string };
      if (!body.url) {
        notify("error", "No se pudo subir el logo");
        return;
      }
      setEditingBrand((prev) => ({ ...prev, image_url: body.url }));
      notify("success", "Logo subido. Pulsa «Guardar» para publicarlo en la web.");
    } catch {
      notify("error", "No se pudo subir el logo. Revisa tu conexión e intenta de nuevo.");
    }
  }

  async function pushCarouselOrder(next: AdminImage[]) {
    const ids = next.map((img) => img.id);
    const previous = carouselOrder;
    setCarouselOrder(ids);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify({ key: "carousel_order", value: { ids } })
    });
    if (!res.ok) {
      setCarouselOrder(previous);
      notify("error", await readApiError(res, "No se pudo guardar el orden del carrusel"));
      return false;
    }
    return true;
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
    if (await pushCarouselOrder(copy)) notify("success", "Orden del carrusel actualizado");
  }

  async function patchImage(imageId: string, changes: Partial<AdminImage>, successText = "Imagen actualizada") {
    const prev = [...images];
    setImages((list) => list.map((img) => (img.id === imageId ? { ...img, ...changes } : img)));

    const body = {
      id: imageId,
      alt_text: changes.alt ?? undefined,
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
      notify("error", await readApiError(res, "No se pudo actualizar la foto"));
      return false;
    }
    notify("success", successText);
    return true;
  }

  // Saca la foto del carrusel publico sin borrarla (puede ser, por ejemplo, la
  // foto principal de un diseño). Antes la unica opcion era "Eliminar".
  async function removeFromCarousel(image: AdminImage) {
    await patchImage(image.id, { is_carousel: false }, "Foto quitada del carrusel (sigue en la galería)");
  }

  // Pone la foto elegida como foto principal (la que se ve en el catalogo) del
  // diseño con el que queda vinculada.
  async function setImageAsDesignPhoto(image: AdminImage) {
    if (!image.design_id) {
      notify("error", "Elige primero el diseño en «Diseño vinculado»");
      return;
    }
    const res = await fetch("/api/admin/images", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken()
      },
      body: JSON.stringify({
        id: image.id,
        alt_text: image.alt ?? undefined,
        brand_id: image.brand_id,
        design_id: image.design_id,
        is_weekly_highlight: image.is_carousel,
        set_as_design_image: true
      })
    });
    if (!res.ok) {
      notify("error", await readApiError(res, "No se pudo poner como foto principal"));
      return;
    }
    notify("success", `Ahora es la foto principal de «${getDesignName(image.design_id)}»`);
    await Promise.all([loadImages(), loadDesigns()]);
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
      body: JSON.stringify({ id: image.id })
    });
    if (!res.ok) {
      setImages(prev);
      notify("error", await readApiError(res, "No se pudo eliminar la foto"));
      return false;
    }
    notify("success", "Imagen eliminada");
    return true;
  }

  async function uploadCarouselImage() {
    if (!carouselUpload) return;
    if (carouselImages.length >= 8) {
      notify("error", "Máximo 8 fotos en carrusel");
      return;
    }
    let res: Response;
    try {
      const data = new FormData();
      data.append("file", await prepareImageForUpload(carouselUpload.file));
      data.append("alt_text", carouselUpload.alt);
      data.append("is_weekly_highlight", "true");

      res = await fetch("/api/admin/images", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() },
        body: data
      });
    } catch {
      notify("error", "No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.");
      return;
    }

    if (!res.ok) {
      notify("error", await readApiError(res, "No se pudo subir la foto al carrusel"));
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
    const results = await Promise.allSettled(jobs);
    const failed = results.filter((r) => r.status === "rejected" || !r.value.ok).length;
    if (failed > 0) {
      notify("error", `No se pudieron quitar ${failed} de ${results.length} fotos del carrusel. Intenta de nuevo.`);
    } else {
      setCarouselOrder([]);
      notify("success", "Carrusel limpiado (las fotos siguen en la galería)");
    }
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
      set_as_design_image: false
    }));
    setUploadQueue((prev) => [...prev, ...next]);
  }

  function updateQueueItem(id: string, changes: Partial<UploadDraft>) {
    setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  async function uploadQueueAll() {
    if (!uploadQueue.length) return;
    let changedDesignPhoto = false;

    async function stopWithError(fileName: string, reason: string) {
      notify("error", `Error subiendo ${fileName}: ${reason}`);
      await Promise.all([loadImages(), changedDesignPhoto ? loadDesigns() : Promise.resolve()]);
    }

    for (const [index, item] of uploadQueue.entries()) {
      if (uploadQueue.length > 1) setBusyText(`Subiendo foto ${index + 1} de ${uploadQueue.length}…`);
      const setAsDesignImage = item.set_as_design_image && Boolean(item.design_id);
      let res: Response;
      try {
        const data = new FormData();
        data.append("file", await prepareImageForUpload(item.file));
        data.append("alt_text", item.alt);
        data.append("is_weekly_highlight", String(item.is_carousel));
        data.append("set_as_design_image", String(setAsDesignImage));
        if (item.brand_id) data.append("brand_id", item.brand_id);
        if (item.design_id) data.append("design_id", item.design_id);

        res = await fetch("/api/admin/images", {
          method: "POST",
          headers: { "x-csrf-token": getCsrfToken() },
          body: data
        });
      } catch {
        await stopWithError(item.file.name, "revisa tu conexión e intenta de nuevo");
        return;
      }

      if (!res.ok) {
        await stopWithError(item.file.name, await readApiError(res, "intenta de nuevo"));
        return;
      }
      if (setAsDesignImage) changedDesignPhoto = true;
      // Fuera de la cola en cuanto sube: si una posterior falla, "Subir todo"
      // no vuelve a subir (duplicar) las que ya estaban arriba.
      setUploadQueue((prev) => prev.filter((queued) => queued.id !== item.id));
    }

    await Promise.all([loadImages(), changedDesignPhoto ? loadDesigns() : Promise.resolve()]);
    notify("success", "Carga múltiple completada");
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
      set_as_design_image: false
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-neutral-700 bg-neutral-900 p-3 sm:p-4">
        <div className="relative">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "shrink-0 whitespace-nowrap",
                    activeTab === tab.key ? "bg-orange-500 hover:bg-orange-400" : ""
                  )}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Icon className="mr-1.5 h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-neutral-900 to-transparent sm:hidden" />
        </div>
      </Card>

      {/* Antes iba dentro de la pagina, arriba del todo: con un modal abierto
          quedaba tapado, y con la pagina desplazada quedaba fuera de la
          pantalla, asi que nunca se veia si algo se habia guardado o fallado. */}
      {toast ? (
        <div
          role={toast.type === "error" ? "alert" : "status"}
          aria-live={toast.type === "error" ? "assertive" : "polite"}
          className={cn(
            "fixed inset-x-3 top-4 z-[100] mx-auto flex max-w-lg items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-card backdrop-blur-sm",
            toast.type === "success"
              ? "border-emerald-400/40 bg-emerald-950/95 text-emerald-100"
              : "border-red-400/40 bg-red-950/95 text-red-100"
          )}
        >
          <p className="flex-1">{toast.text}</p>
          <button
            type="button"
            aria-label="Cerrar aviso"
            className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg opacity-80 hover:opacity-100"
            onClick={() => setToast(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-4">
          {loading.overview ? renderSkeleton(4) : null}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Diseños activos</p><p className="font-display text-2xl text-white">{metrics.designsActive}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Marcas</p><p className="font-display text-2xl text-white">{metrics.totalBrands}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Fotos catálogo</p><p className="font-display text-2xl text-white">{metrics.totalImages}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Fotos carrusel</p><p className="font-display text-2xl text-white">{metrics.carousel}</p></Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4"><p className="text-xs text-neutral-400">Promociones live</p><p className="font-display text-2xl text-white">{metrics.promotionsLive}</p></Card>
          </div>

          <Card className="border-neutral-700 bg-neutral-900 p-4">
            <h2 className="mb-3 font-display text-lg text-white">Accesos rápidos</h2>
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
              <h2 className="mb-3 font-display text-lg text-white">Alertas</h2>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-neutral-200"><AlertTriangle className="h-4 w-4 text-amber-300" /> Diseños sin imagen: {alerts.withoutImage}</p>
                <p className="flex items-center gap-2 text-neutral-200"><AlertTriangle className="h-4 w-4 text-amber-300" /> Promociones vencidas: {alerts.expired}</p>
                <p className="flex items-center gap-2 text-neutral-200"><AlertTriangle className="h-4 w-4 text-amber-300" /> Carrusel vacío: {alerts.emptyCarousel ? "Sí" : "No"}</p>
              </div>
            </Card>
            <Card className="border-neutral-700 bg-neutral-900 p-4">
              <h2 className="mb-3 font-display text-lg text-white">Última actividad</h2>
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
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg text-white">Carrusel semanal</h2>
            <p className="text-sm text-neutral-400">{carouselImages.length}/8 fotos</p>
          </div>

          {loading.carousel ? renderSkeleton(4) : null}

          <ul aria-label="Fotos del carrusel" className="grid gap-3 md:grid-cols-2">
            {carouselImages.map((img, index) => (
              <li key={img.id} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3">
                <img src={img.url} alt={img.alt ?? "carousel"} className="h-40 w-full rounded-lg bg-neutral-950 object-contain" />
                <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                  <span>Orden #{index + 1}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 w-11 p-0"
                      aria-label="Subir foto en el carrusel"
                      onClick={() => void moveCarouselImage(img.id, "up")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 w-11 p-0"
                      aria-label="Bajar foto en el carrusel"
                      onClick={() => void moveCarouselImage(img.id, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Input
                  className="mt-2"
                  aria-label={`Texto de la foto #${index + 1}`}
                  value={img.alt ?? ""}
                  onChange={(e) => setImages((prev) => prev.map((x) => (x.id === img.id ? { ...x, alt: e.target.value } : x)))}
                  onBlur={() => void patchImage(img.id, { alt: images.find((x) => x.id === img.id)?.alt ?? "" })}
                />
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" size="sm" onClick={() => void removeFromCarousel(img)}>
                    <X className="mr-1 h-4 w-4" /> Quitar del carrusel
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      openConfirm(
                        "Eliminar foto",
                        "La foto se borrará para siempre (del carrusel y de la galería). Si solo quieres que no salga en la web, usa «Quitar del carrusel».",
                        async () => {
                          await deleteImage(img);
                        }
                      )
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>

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
              aria-label="Elegir foto para el carrusel"
              onChange={(e) => {
                handleCarouselDrop(e.target.files);
                e.target.value = "";
              }}
            />
            {carouselUpload ? (
              <div className="mt-3 space-y-2">
                <img src={carouselUpload.preview} alt="Vista previa de la foto nueva" className="h-40 w-full rounded-lg bg-neutral-950 object-contain" />
                <Input
                  aria-label="Texto de la foto nueva"
                  value={carouselUpload.alt}
                  onChange={(e) => setCarouselUpload((prev) => (prev ? { ...prev, alt: e.target.value } : prev))}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="bg-orange-500 hover:bg-orange-400" disabled={busyText !== null} onClick={() => void runBusy("Subiendo foto al carrusel…", uploadCarouselImage)}>Confirmar subida</Button>
                  <Button variant="secondary" onClick={() => setCarouselUpload(null)}><X className="mr-1 h-4 w-4" />Cancelar</Button>
                </div>
              </div>
            ) : null}
          </Card>

          <div>
            <Button
              variant="secondary"
              onClick={() =>
                openConfirm("Limpiar carrusel", "Quitarás todas las fotos del carrusel. No se borran: siguen en la galería.", async () => {
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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button className="w-full bg-orange-500 hover:bg-orange-400 sm:w-auto" onClick={openNewDesignModal}><Plus className="mr-1 h-4 w-4" />Nuevo diseño</Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setCatalogView((v) => (v === "table" ? "grid" : "table"))}>{catalogView === "table" ? "Modo Grid" : "Modo Tabla"}</Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => void loadDesigns()}><RefreshCw className="mr-1 h-4 w-4" />Recargar</Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            <Input placeholder="Buscar diseño" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={catalogBrandFilter} onChange={(e) => setCatalogBrandFilter(e.target.value)}>
              <option value="all">Todas las marcas</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={catalogStatusFilter} onChange={(e) => setCatalogStatusFilter(e.target.value as "all" | "active" | "inactive")}> 
              <option value="all">Todos estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={catalogPromoFilter} onChange={(e) => setCatalogPromoFilter(e.target.value as "all" | "promo")}> 
              <option value="all">Todas promos</option>
              <option value="promo">Solo promo activa</option>
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={catalogSortBy} onChange={(e) => setCatalogSortBy(e.target.value as "name" | "price" | "created")}> 
              <option value="name">Ordenar: nombre</option>
              <option value="price">Ordenar: precio</option>
              <option value="created">Ordenar: creación</option>
            </select>
          </div>

          {loading.catalog ? renderSkeleton(6) : null}

          {catalogView === "table" ? (
            <div className="overflow-x-auto rounded-xl border border-neutral-800">
              <table className="min-w-[980px] text-sm">
                <thead>
                  <tr className="text-left text-neutral-400">
                    <th className="px-2 py-2">Imagen</th>
                    <th className="px-2 py-2">Nombre</th>
                    <th className="px-2 py-2">Marca</th>
                    <th className="px-2 py-2">Descripción</th>
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
                            <img src={design.image_url || "/logo-motosmart.png"} alt={design.name} className="h-12 w-16 rounded bg-neutral-950 object-contain" />
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-11 w-11 p-0"
                              aria-label={`Editar diseño ${design.name}`}
                              onClick={() => openEditDesignModal(design)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-11 w-11 p-0"
                              aria-label={`Eliminar diseño ${design.name}`}
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
                                    const body = (await res.json()) as { error?: string };
                                    notify("error", body.error ?? "No se pudo eliminar diseño");
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
                    <img src={design.image_url || "/logo-motosmart.png"} alt={design.name} className="h-40 w-full rounded-lg bg-neutral-950 object-contain" />
                    <p className="mt-2 font-display text-lg text-white">{design.name}</p>
                    <p className="text-xs text-neutral-400">{getBrandName(design.brand_id)}</p>
                    <p className="text-sm text-neutral-300">{design.short_description}</p>
                    <p className="mt-2 font-mono text-orange-300">{promo.hasPromotion && design.discount_price ? formatCOP(design.discount_price) : formatCOP(design.base_price)}</p>
                    {promo.hasPromotion ? <p className="text-xs text-emerald-300">{promo.percentOff}% OFF | ahorro {formatCOP(promo.savings)}</p> : null}
                    <Button className="mt-2" variant="secondary" aria-label={`Editar diseño ${design.name}`} onClick={() => openEditDesignModal(design)}>Editar</Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : null}

      {activeTab === "brands" ? (
        <Card className="space-y-4 border-neutral-700 bg-neutral-900 p-4">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-display text-lg text-white">Marcas</h3>
            <Button className="w-full bg-orange-500 hover:bg-orange-400 sm:w-auto" onClick={() => { setEditingBrand({ id: "", name: "", slug: "", image_url: null, description: "", is_active: true }); setBrandModalOpen(true); }}>
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
              <div key={brand.id} className="flex flex-col gap-3 rounded-xl border border-neutral-700 bg-neutral-950 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-white">{brand.name}</p>
                  <p className="text-xs text-neutral-400">/{brand.slug} | {brandCounts.get(brand.id) ?? 0} diseños</p>
                </div>
                <div className="flex gap-2 self-stretch sm:self-auto">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-11 w-11 p-0"
                    aria-label={`Editar marca ${brand.name}`}
                    onClick={() => { setEditingBrand(brand); setBrandModalOpen(true); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-11 w-11 p-0"
                    aria-label={`Eliminar marca ${brand.name}`}
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
                          const body = (await res.json()) as { error?: string };
                          notify("error", body.error ?? "No se pudo eliminar marca");
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
            <div className="mb-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="font-display text-base text-white">Productos</h4>
              <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-400 sm:w-auto" onClick={openNewProductModal}>
                <Plus className="mr-1 h-4 w-4" /> Nuevo producto
              </Button>
            </div>
            <div className="space-y-2">
              {products.map((product) => (
                <div key={product.id} className="flex flex-col gap-3 rounded-xl border border-neutral-700 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-white">{product.sku}</p>
                    <p className="text-xs text-neutral-400">{product.design_name} | Stock: {product.stock}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant={product.is_active ? "default" : "secondary"} onClick={() => void toggleProduct(product)}>
                      {product.is_active ? "Activo" : "Inactivo"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 w-11 p-0"
                      aria-label={`Editar producto ${product.sku}`}
                      onClick={() => openEditProductModal(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 w-11 p-0"
                      aria-label={`Eliminar producto ${product.sku}`}
                      onClick={() =>
                        openConfirm("Eliminar producto", "Esta acción eliminará el producto de forma permanente.", async () => {
                          await deleteProduct(product.id);
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Card>
      ) : null}

      {activeTab === "gallery" ? (
        <Card className="space-y-4 border-neutral-700 bg-neutral-900 p-4">
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={galleryFilter} onChange={(e) => setGalleryFilter(e.target.value as "all" | "carousel" | "unlinked")}> 
              <option value="all">Todas</option>
              <option value="carousel">Solo carrusel</option>
              <option value="unlinked">Sin vincular</option>
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={galleryBrandFilter} onChange={(e) => setGalleryBrandFilter(e.target.value)}>
              <option value="all">Todas marcas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={galleryDesignFilter} onChange={(e) => setGalleryDesignFilter(e.target.value)}>
              <option value="all">Todos diseños</option>
              {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <Input
              type="file"
              multiple
              accept="image/*"
              aria-label="Elegir fotos para la galería"
              onChange={(e) => {
                onFilesSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {uploadQueue.length ? (
            <Card className="border-neutral-700 bg-neutral-950 p-3">
              <h4 className="mb-2 text-sm text-white">Carga múltiple ({uploadQueue.length})</h4>
              <div className="space-y-3">
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    role="group"
                    aria-label={`Foto ${item.file.name}`}
                    className="grid gap-2 rounded-xl border border-neutral-700 p-2 md:grid-cols-[100px_1fr]"
                  >
                    <img src={item.preview} alt="" className="h-24 w-full rounded bg-neutral-950 object-contain" />
                    <div className="space-y-2">
                      <Input aria-label="Texto de la foto" value={item.alt} onChange={(e) => updateQueueItem(item.id, { alt: e.target.value })} />
                      <div className="grid gap-2 md:grid-cols-2">
                        <select
                          aria-label="Marca de la foto"
                          className="h-10 rounded-xl border border-neutral-700 bg-neutral-800 px-2 text-white"
                          value={item.brand_id}
                          onChange={(e) => updateQueueItem(item.id, { brand_id: e.target.value })}
                        >
                          <option value="">Marca</option>
                          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <select
                          aria-label="Diseño de la foto"
                          className="h-10 rounded-xl border border-neutral-700 bg-neutral-800 px-2 text-white"
                          value={item.design_id}
                          onChange={(e) => {
                            const designId = e.target.value;
                            updateQueueItem(item.id, {
                              design_id: designId,
                              brand_id: item.brand_id || designsById.get(designId)?.brand_id || "",
                              set_as_design_image: designId ? item.set_as_design_image : false
                            });
                          }}
                        >
                          <option value="">Diseño</option>
                          {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2 text-sm text-neutral-300 sm:flex-row sm:flex-wrap sm:gap-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.set_as_design_image}
                            disabled={!item.design_id}
                            onChange={(e) => updateQueueItem(item.id, { set_as_design_image: e.target.checked })}
                          />
                          Usar como foto principal del diseño
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.is_carousel}
                            onChange={(e) => updateQueueItem(item.id, { is_carousel: e.target.checked })}
                          />
                          Mostrar en el carrusel
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button className="bg-orange-500 hover:bg-orange-400" disabled={busyText !== null} onClick={() => void runBusy("Subiendo fotos…", uploadQueueAll)}><Upload className="mr-1 h-4 w-4" />Subir todo</Button>
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
                <p className="text-[11px] text-neutral-500">{img.is_carousel ? "Carrusel" : "Catálogo"}</p>
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
              <Label htmlFor={`setting-${item.key}`} className="text-xs text-neutral-400">{item.label}</Label>
              {item.key.includes("description") || item.key.includes("message") ? (
                <Textarea
                  id={`setting-${item.key}`}
                  value={settingsForm[item.key] ?? ""}
                  onChange={(e) => updateSettingField(item.key, e.target.value)}
                />
              ) : (
                <Input
                  id={`setting-${item.key}`}
                  type={item.key === "whatsapp_number" ? "tel" : "text"}
                  inputMode={item.key === "whatsapp_number" ? "tel" : undefined}
                  value={settingsForm[item.key] ?? ""}
                  onChange={(e) => updateSettingField(item.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <Button className="w-full bg-orange-500 hover:bg-orange-400 sm:w-auto" disabled={busyText !== null} onClick={() => void runBusy("Guardando textos…", saveSettingsForm)}><Save className="mr-1 h-4 w-4" />Guardar cambios</Button>
        </Card>
      ) : null}

      {activeTab === "features" ? (
        <Card className="space-y-3 border-neutral-700 bg-neutral-900 p-4">
          {loading.features ? renderSkeleton(6) : null}
          {features.map((feature) => (
            <div key={feature.id} className="flex flex-col items-start gap-3 rounded-xl border border-neutral-700 bg-neutral-950 p-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={activityFilter} onChange={(e) => { setActivityFilter(e.target.value); setActivityPage(1); }}>
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
                    const body = (await res.json()) as { error?: string };
                    notify("error", body.error ?? "No se pudo limpiar historial");
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                  <div className="sm:text-right">
                    <p className="flex items-center gap-1 text-xs text-neutral-400 sm:justify-end"><Clock3 className="h-3.5 w-3.5" />{formatRelativeTime(entry.created_at)}</p>
                    <p className="text-xs text-neutral-500">{new Date(entry.created_at).toLocaleString("es-CO")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Página {activityPage}</span>
            <div className="flex gap-2">
              <Button className="flex-1 sm:flex-none" size="sm" variant="secondary" disabled={activityPage === 1} onClick={() => setActivityPage((p) => p - 1)}>Anterior</Button>
              <Button className="flex-1 sm:flex-none" size="sm" variant="secondary" disabled={activityPage * 10 >= filteredActivity.length} onClick={() => setActivityPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "riders" ? <RiderPhotosTab notify={notify} runBusy={runBusy} /> : null}

      <Modal open={designModalOpen} onClose={requestCloseDesignModal} title={editingDesign.id ? "Editar diseño" : "Nuevo diseño"} className="max-w-3xl">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="design-name">Nombre</Label>
            <Input id="design-name" placeholder="Nombre" value={editingDesign.name} onChange={(e) => setEditingDesign((p) => ({ ...p, name: e.target.value, slug: toSlug(e.target.value) }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-slug">Slug</Label>
            <Input id="design-slug" placeholder="Slug" value={editingDesign.slug} onChange={(e) => setEditingDesign((p) => ({ ...p, slug: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-brand">Marca</Label>
            <select id="design-brand" className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={editingDesign.brand_id} onChange={(e) => setEditingDesign((p) => ({ ...p, brand_id: e.target.value }))}>
              <option value="">Marca</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-base-price">Precio base</Label>
            <Input id="design-base-price" type="number" className="font-mono" placeholder="Precio base" value={editingDesign.base_price} onChange={(e) => setEditingDesign((p) => ({ ...p, base_price: Number(e.target.value || 0) }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-discount-price">Precio rebaja</Label>
            <Input id="design-discount-price" type="number" className="font-mono" placeholder="Precio rebaja" value={editingDesign.discount_price ?? ""} onChange={(e) => setEditingDesign((p) => ({ ...p, discount_price: e.target.value ? Number(e.target.value) : null }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-promo-label">Etiqueta promo</Label>
            <Input id="design-promo-label" placeholder="Etiqueta promo" value={editingDesign.promotion_label} onChange={(e) => setEditingDesign((p) => ({ ...p, promotion_label: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-promo-start">Inicio de promoción</Label>
            <Input id="design-promo-start" type="datetime-local" value={editingDesign.promotion_starts_at ?? ""} onChange={(e) => setEditingDesign((p) => ({ ...p, promotion_starts_at: e.target.value || null }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="design-promo-end">Fin de promoción</Label>
            <Input id="design-promo-end" type="datetime-local" value={editingDesign.promotion_ends_at ?? ""} onChange={(e) => setEditingDesign((p) => ({ ...p, promotion_ends_at: e.target.value || null }))} />
          </div>
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
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="design-short-description">Descripción corta</Label>
            <Textarea id="design-short-description" placeholder="Descripción corta" value={editingDesign.short_description} onChange={(e) => setEditingDesign((p) => ({ ...p, short_description: e.target.value }))} />
          </div>
          {editingDesign.image_url ? (
            <div className="md:col-span-2">
              <img
                src={editingDesign.image_url}
                alt="Vista previa de la foto principal"
                className="h-48 w-full rounded-lg bg-neutral-950 object-contain"
              />
              {editingDesign.image_url !== designImageOnOpen ? (
                <p className="mt-1 text-sm text-amber-300">Foto nueva sin guardar: pulsa «Guardar» para publicarla en la web.</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="design-image-url">Imagen principal URL</Label>
            <Input id="design-image-url" placeholder="Imagen principal URL" value={editingDesign.image_url} onChange={(e) => setEditingDesign((p) => ({ ...p, image_url: e.target.value }))} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="design-image-file">Subir imagen principal</Label>
            <Input
              id="design-image-file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runBusy("Subiendo foto…", () => uploadImageForDesign(f));
                e.target.value = "";
              }}
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row">
            <Button
              className="bg-orange-500 hover:bg-orange-400"
              disabled={busyText !== null}
              onClick={() => void runBusy(editingDesign.id ? "Guardando diseño…" : "Creando diseño…", saveDesignModal)}
            >
              <Save className="mr-1 h-4 w-4" />Guardar
            </Button>
            <Button variant="secondary" onClick={requestCloseDesignModal}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={brandModalOpen} onClose={closeUnlessBusy(() => setBrandModalOpen(false))} title={editingBrand.id ? "Editar marca" : "Nueva marca"}>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="brand-name">Nombre</Label>
            <Input id="brand-name" placeholder="Nombre" value={editingBrand.name} onChange={(e) => setEditingBrand((p) => ({ ...p, name: e.target.value, slug: toSlug(e.target.value) }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="brand-slug">Slug</Label>
            <Input id="brand-slug" placeholder="Slug" value={editingBrand.slug} onChange={(e) => setEditingBrand((p) => ({ ...p, slug: e.target.value }))} />
          </div>
          {editingBrand.image_url ? (
            <img
              src={editingBrand.image_url}
              alt="Vista previa del logo"
              className="h-32 w-full rounded-lg bg-neutral-950 object-contain"
            />
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="brand-image-url">Imagen / logo URL</Label>
            <Input id="brand-image-url" placeholder="Imagen / logo URL" value={editingBrand.image_url ?? ""} onChange={(e) => setEditingBrand((p) => ({ ...p, image_url: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="brand-description">Descripción</Label>
            <Textarea id="brand-description" placeholder="Descripción" value={editingBrand.description ?? ""} onChange={(e) => setEditingBrand((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="brand-image-file">Subir imagen / logo</Label>
            <Input
              id="brand-image-file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runBusy("Subiendo logo…", () => uploadBrandImage(f));
                e.target.value = "";
              }}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={editingBrand.is_active ?? true} onChange={(e) => setEditingBrand((p) => ({ ...p, is_active: e.target.checked }))} />Activa</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="bg-orange-500 hover:bg-orange-400"
              disabled={busyText !== null}
              onClick={() => void runBusy(editingBrand.id ? "Guardando marca…" : "Creando marca…", saveBrand)}
            >
              <Save className="mr-1 h-4 w-4" />Guardar
            </Button>
            <Button variant="secondary" onClick={() => setBrandModalOpen(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={productModalOpen} onClose={closeUnlessBusy(() => setProductModalOpen(false))} title={editingProduct.id ? "Editar producto" : "Nuevo producto"}>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="product-design">Diseño</Label>
            <select
              id="product-design"
              className="h-11 w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white"
              value={editingProduct.design_id}
              onChange={(event) => setEditingProduct((prev) => ({ ...prev, design_id: event.target.value }))}
            >
              <option value="">Selecciona diseño</option>
              {designs.map((design) => (
                <option key={design.id} value={design.id}>
                  {design.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-sku">SKU</Label>
            <Input
              id="product-sku"
              placeholder="SKU"
              value={editingProduct.sku}
              onChange={(event) => setEditingProduct((prev) => ({ ...prev, sku: event.target.value.toUpperCase() }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-stock">Stock</Label>
            <Input
              id="product-stock"
              type="number"
              min={0}
              placeholder="Stock"
              value={editingProduct.stock}
              onChange={(event) => setEditingProduct((prev) => ({ ...prev, stock: Number(event.target.value || 0) }))}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={editingProduct.is_active}
              onChange={(event) => setEditingProduct((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            Activo
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="bg-orange-500 hover:bg-orange-400" disabled={busyText !== null} onClick={() => void runBusy("Guardando producto…", saveProduct)}>
              <Save className="mr-1 h-4 w-4" /> Guardar
            </Button>
            <Button variant="secondary" onClick={() => setProductModalOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(selectedImage)} onClose={closeUnlessBusy(() => setSelectedImage(null))} title="Detalle de imagen">
        {selectedImage ? (
          <div className="space-y-3">
            <img src={selectedImage.url} alt={selectedImage.alt ?? "imagen"} className="h-56 w-full rounded-xl bg-neutral-950 object-contain" />
            <Input aria-label="Texto de la foto" value={selectedImage.alt ?? ""} onChange={(e) => setSelectedImage((prev) => (prev ? { ...prev, alt: e.target.value } : prev))} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select aria-label="Marca vinculada" className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white" value={selectedImage.brand_id ?? ""} onChange={(e) => setSelectedImage((prev) => (prev ? { ...prev, brand_id: e.target.value || null } : prev))}>
                <option value="">Sin marca</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                aria-label="Diseño vinculado"
                className="h-11 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-base text-white"
                value={selectedImage.design_id ?? ""}
                onChange={(e) => {
                  const designId = e.target.value || null;
                  setSelectedImage((prev) =>
                    prev ? { ...prev, design_id: designId, brand_id: prev.brand_id ?? (designId ? designsById.get(designId)?.brand_id ?? null : null) } : prev
                  );
                }}
              >
                <option value="">Sin diseño</option>
                {designs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <Button
              variant="secondary"
              disabled={!selectedImage.design_id}
              onClick={() => void runBusy("Cambiando la foto principal…", () => setImageAsDesignPhoto(selectedImage))}
            >
              <ImagePlus className="mr-1 h-4 w-4" />Usar como foto principal del diseño
            </Button>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-300"><input type="checkbox" checked={selectedImage.is_carousel} onChange={(e) => setSelectedImage((prev) => (prev ? { ...prev, is_carousel: e.target.checked } : prev))} />Mostrar en carrusel</label>
            <Input value={selectedImage.url} readOnly />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button variant="secondary" onClick={() => setSelectedImage(null)}><X className="mr-1 h-4 w-4" />Cerrar</Button>
              <Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(selectedImage.url); notify("success", "URL copiada"); }}><Copy className="mr-1 h-4 w-4" />Copiar URL</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-400"
                disabled={busyText !== null}
                onClick={() =>
                  void runBusy("Guardando foto…", async () => {
                    if (await patchImage(selectedImage.id, selectedImage)) setSelectedImage(null);
                  })
                }
              >
                <Save className="mr-1 h-4 w-4" />Guardar cambios
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  openConfirm("Eliminar imagen", "Esta acción es irreversible.", async () => {
                    if (await deleteImage(selectedImage)) setSelectedImage(null);
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

      <Modal open={confirmState.open} onClose={closeUnlessBusy(() => setConfirmState({ open: false, title: "", description: "", action: null }))} title={confirmState.title}>
        <p className="text-sm text-neutral-300">{confirmState.description}</p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setConfirmState({ open: false, title: "", description: "", action: null })}>Cancelar</Button>
          <Button className="bg-orange-500 hover:bg-orange-400" disabled={busyText !== null} onClick={() => void runBusy("Procesando…", runConfirmAction)}>Confirmar</Button>
        </div>
      </Modal>

      <BusyOverlay text={busyText} />
    </div>
  );
}

export { AdminDashboardImpl as AdminDashboard };
