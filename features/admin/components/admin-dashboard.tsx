"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Brand = { name: string; slug: string; description: string };
type Design = { brand_id: string; name: string; slug: string; short_description: string; image_url: string; base_price: number };
type ProductRow = { id: string; sku: string; is_active: boolean; stock: number; designs?: { name?: string } | null };
type Activity = { id: string; action: string; entity: string; created_at: string };
type Feature = { name: string; enabled: boolean };

export function AdminDashboard() {
  const [brand, setBrand] = useState<Brand>({ name: "", slug: "", description: "" });
  const [design, setDesign] = useState<Design>({
    brand_id: "",
    name: "",
    slug: "",
    short_description: "",
    image_url: "",
    base_price: 0
  });
  const [settingKey, setSettingKey] = useState("homepage_copy");
  const [settingValue, setSettingValue] = useState("{\"title\":\"MotoSmart\"}");
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageBrandId, setImageBrandId] = useState("");
  const [imageDesignId, setImageDesignId] = useState("");
  const [features, setFeatures] = useState<Feature[]>([]);

  function getCsrfToken() {
    return document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrf-token="))
      ?.split("=")[1];
  }

  useEffect(() => {
    loadProducts();
    loadActivity();
    loadFeatures();
  }, []);

  async function loadProducts() {
    const res = await fetch("/api/admin/products");
    if (!res.ok) return;
    const payload = (await res.json()) as { data: ProductRow[] };
    setProducts(payload.data ?? []);
  }

  async function loadActivity() {
    const res = await fetch("/api/admin/activity");
    if (!res.ok) return;
    const payload = (await res.json()) as { data: Activity[] };
    setActivity(payload.data ?? []);
  }

  async function loadFeatures() {
    const res = await fetch("/api/admin/features");
    if (!res.ok) return;
    const payload = (await res.json()) as { data: Feature[] };
    setFeatures(payload.data ?? []);
  }

  async function submitBrand() {
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify(brand)
    });
    setMessage(res.ok ? "Marca creada" : "Error creando marca");
    if (res.ok) loadActivity();
  }

  async function submitDesign() {
    const res = await fetch("/api/admin/designs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken() ?? ""
      },
      body: JSON.stringify(design)
    });
    setMessage(res.ok ? "Diseno creado" : "Error creando diseno");
    if (res.ok) loadActivity();
  }

  async function submitSetting() {
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(settingValue);
    } catch {
      setMessage("JSON de setting invalido");
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
    if (res.ok) loadActivity();
  }

  const previewData = useMemo(
    () => ({
      ...design,
      brandName: brand.name || "Marca",
      brandDescription: brand.description || "Descripcion de marca"
    }),
    [brand, design]
  );

  async function uploadImage() {
    if (!imageFile) {
      setMessage("Selecciona una imagen");
      return;
    }

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("alt_text", imageAlt);
    if (imageBrandId) formData.append("brand_id", imageBrandId);
    if (imageDesignId) formData.append("design_id", imageDesignId);
    formData.append("is_weekly_highlight", "true");

    const res = await fetch("/api/admin/images", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() ?? "" },
      body: formData
    });
    const payload = (await res.json()) as { url?: string };
    setMessage(res.ok ? "Imagen publicada" : "Error subiendo imagen");
    if (res.ok) {
      setImageUrl(payload.url ?? "");
      setImageFile(null);
      await loadActivity();
    }
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
    setMessage(res.ok ? "Visibilidad actualizada" : "Error actualizando producto");
    if (res.ok) {
      await loadProducts();
      await loadActivity();
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
      await loadFeatures();
      await loadActivity();
    }
  }

  function handleDrop(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3">
        <h3 className="font-display text-lg text-white">Agregar marca</h3>
        <Input placeholder="Nombre" value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} />
        <Input placeholder="Slug" value={brand.slug} onChange={(e) => setBrand({ ...brand, slug: e.target.value })} />
        <Textarea
          placeholder="Descripcion"
          value={brand.description}
          onChange={(e) => setBrand({ ...brand, description: e.target.value })}
        />
        <Button onClick={submitBrand}>Guardar marca</Button>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-display text-lg text-white">Agregar diseno</h3>
        <Input placeholder="Brand ID" value={design.brand_id} onChange={(e) => setDesign({ ...design, brand_id: e.target.value })} />
        <Input placeholder="Nombre" value={design.name} onChange={(e) => setDesign({ ...design, name: e.target.value })} />
        <Input placeholder="Slug" value={design.slug} onChange={(e) => setDesign({ ...design, slug: e.target.value })} />
        <Input
          placeholder="Imagen URL"
          value={design.image_url}
          onChange={(e) => setDesign({ ...design, image_url: e.target.value })}
        />
        <Input
          placeholder="Precio base"
          type="number"
          value={design.base_price}
          onChange={(e) => setDesign({ ...design, base_price: Number(e.target.value) })}
        />
        <Textarea
          placeholder="Descripcion corta"
          value={design.short_description}
          onChange={(e) => setDesign({ ...design, short_description: e.target.value })}
        />
        <Button onClick={submitDesign}>Guardar diseno</Button>
      </Card>

      <Card className="space-y-3">
        <h3 className="font-display text-lg text-white">Preview antes de publicar</h3>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <p className="font-display text-xl text-white">{previewData.brandName}</p>
          <p className="text-sm text-neutral-300">{previewData.brandDescription}</p>
          <div className="mt-4 rounded-xl border border-red-300/30 bg-red-600/10 p-4">
            <p className="font-display text-lg">{previewData.name || "Diseno"}</p>
            <p className="text-sm text-neutral-300">{previewData.short_description || "Descripcion corta del diseno"}</p>
            <p className="mt-2 text-primary">
              {previewData.base_price ? `$ ${previewData.base_price.toLocaleString("es-CO")}` : "$ 0"}
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 lg:col-span-2">
        <h3 className="font-display text-lg text-white">Editar textos / settings</h3>
        <Input placeholder="Clave" value={settingKey} onChange={(e) => setSettingKey(e.target.value)} />
        <Textarea value={settingValue} onChange={(e) => setSettingValue(e.target.value)} />
        <Button onClick={submitSetting}>Guardar setting</Button>
      </Card>

      <Card className="space-y-3 lg:col-span-2">
        <h3 className="font-display text-lg text-white">Subir imagen semanal (Drag & Drop)</h3>
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
          <p className="text-sm text-neutral-300">Suelta la imagen aqui o selecciona manualmente</p>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleDrop(e.target.files)}
            className="mt-4 cursor-pointer"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Brand ID (opcional)" value={imageBrandId} onChange={(e) => setImageBrandId(e.target.value)} />
          <Input placeholder="Design ID (opcional)" value={imageDesignId} onChange={(e) => setImageDesignId(e.target.value)} />
        </div>
        <Input placeholder="Texto ALT" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} />
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Preview" className="h-48 w-full rounded-xl object-cover" />
        ) : null}
        <Button onClick={uploadImage}>Publicar imagen</Button>
      </Card>

      <Card className="space-y-3 lg:col-span-2">
        <h3 className="font-display text-lg text-white">Toggle visibilidad de productos</h3>
        <div className="space-y-2">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between rounded-xl border border-white/10 p-3">
              <div>
                <p className="text-sm text-white">{product.sku}</p>
                <p className="text-xs text-neutral-400">{product.designs?.name ?? "Sin diseno"} | Stock: {product.stock}</p>
              </div>
              <Button variant={product.is_active ? "default" : "secondary"} onClick={() => toggleProduct(product.id, product.is_active)}>
                {product.is_active ? "Activo" : "Inactivo"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 lg:col-span-2">
        <h3 className="font-display text-lg text-white">Feature flags (sin redeploy)</h3>
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

      <Card className="space-y-3 lg:col-span-2">
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
