"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

const materials = ["Cuero sintetico", "Alcantara", "Cuero premium"];

export function CustomizerSimulator() {
  const [brand, setBrand] = useState("Yamaha");
  const [design, setDesign] = useState("Sport Pro");
  const [baseColor, setBaseColor] = useState("Negro");
  const [material, setMaterial] = useState(materials[0]);
  const [seamColor, setSeamColor] = useState("Rojo");
  const [embroideryText, setEmbroideryText] = useState("MotoSmart");
  const [foam, setFoam] = useState<"original" | "modificada">("original");

  const waUrl = useMemo(() => {
    const text = [
      "Hola MotoSmart, quiero cotizar una tapiceria personalizada:",
      `Marca: ${brand}`,
      `Diseno: ${design}`,
      `Color base: ${baseColor}`,
      `Material: ${material}`,
      `Costura: ${seamColor}`,
      `Bordado: ${embroideryText || "Sin texto"}`,
      `Espuma: ${foam}`
    ].join("\n");

    return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }, [brand, design, baseColor, material, seamColor, embroideryText, foam]);

  async function submitQuote() {
    const csrf = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrf-token="))
      ?.split("=")[1];

    await fetch("/api/custom-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrf ?? ""
      },
      body: JSON.stringify({
        brand,
        design,
        baseColor,
        material,
        seamColor,
        embroideryText,
        foam
      })
    });

    trackEvent("quote_submit_whatsapp", { brand, design, foam });
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative flex min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-black/50 p-6"
      >
        <div className="absolute inset-8 rounded-[30px] border border-white/10" />
        <div className="relative w-full max-w-sm rounded-2xl border border-white/20 bg-gradient-to-b from-red-500/35 to-black/70 p-8">
          <p className="font-display text-xl text-white">Vista previa 2D</p>
          <div className="mt-6 space-y-2 text-sm text-neutral-100">
            <p>Base: {baseColor}</p>
            <p>Material: {material}</p>
            <p>Costura: {seamColor}</p>
            <p>Bordado: {embroideryText || "Sin texto"}</p>
            <p>Espuma: {foam}</p>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Marca" />
        <Input value={design} onChange={(e) => setDesign(e.target.value)} placeholder="Diseno" />
        <Input value={baseColor} onChange={(e) => setBaseColor(e.target.value)} placeholder="Color base" />
        <select
          className="h-11 w-full rounded-xl border border-white/15 bg-black/50 px-4 text-sm text-white"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
        >
          {materials.map((item) => (
            <option key={item} value={item} className="bg-black">
              {item}
            </option>
          ))}
        </select>
        <Input value={seamColor} onChange={(e) => setSeamColor(e.target.value)} placeholder="Color costura" />
        <Input
          value={embroideryText}
          onChange={(e) => setEmbroideryText(e.target.value)}
          placeholder="Texto bordado"
          maxLength={30}
        />
        <div className="flex gap-2">
          <Button variant={foam === "original" ? "default" : "secondary"} onClick={() => setFoam("original")}>
            Espuma original
          </Button>
          <Button variant={foam === "modificada" ? "default" : "secondary"} onClick={() => setFoam("modificada")}>
            Espuma modificada
          </Button>
        </div>
        <Button className="w-full" onClick={submitQuote}>
          Enviar cotizacion por WhatsApp
        </Button>
      </div>
    </div>
  );
}
