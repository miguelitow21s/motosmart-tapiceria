import { FEATURE_INFO } from "@/features/admin/lib/features-info";
import { SETTING_LABELS } from "@/features/admin/lib/settings-keys";
import type { ActivityEntry, Brand, Design } from "@/features/admin/types";

/*
  Convierte un registro de actividad ({ action, entity, detail }) en una frase:
  "Editó el diseño «Yamaha DT 125»". Antes se mostraba el JSON crudo.
*/

type Lookups = { designs: Design[]; brands: Brand[] };

export type ActivityKind = "create" | "update" | "delete" | "upload" | "module" | "purge";

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  create: "Creaciones",
  update: "Cambios",
  delete: "Borrados",
  upload: "Fotos subidas",
  module: "Módulos",
  purge: "Limpiezas del historial"
};

export function activityKind(entry: ActivityEntry): ActivityKind {
  switch (entry.action) {
    case "create":
      return "create";
    case "delete":
    case "clear":
      return "delete";
    case "upload":
      return "upload";
    case "toggle_feature":
      return "module";
    case "purge":
      return "purge";
    default:
      return entry.entity === "feature" ? "module" : "update";
  }
}

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

function quoted(name: string | null) {
  return name ? ` «${name}»` : "";
}

export function describeActivity(entry: ActivityEntry, { designs, brands }: Lookups): string {
  const detail = entry.detail ?? {};
  const slug = str(detail.slug);

  switch (entry.entity) {
    case "design": {
      const name = designs.find((design) => design.id === entry.entity_id)?.name ?? slug;
      if (entry.action === "create") return `Creó el diseño${quoted(name)}`;
      if (entry.action === "delete") return `Eliminó un diseño${quoted(slug)}`;
      return `Editó el diseño${quoted(name)}`;
    }
    case "brand": {
      const name = brands.find((brand) => brand.id === entry.entity_id)?.name ?? slug;
      if (entry.action === "create") return `Creó la marca${quoted(name)}`;
      if (entry.action === "delete") return "Eliminó una marca";
      return `Editó la marca${quoted(name)}`;
    }
    case "image": {
      if (entry.action === "upload") return detail.isWeeklyHighlight ? "Subió una foto al carrusel" : "Subió una foto";
      if (entry.action === "delete") return "Eliminó una foto";
      if (detail.setAsDesignImage) {
        const design = designs.find((item) => item.id === detail.design_id);
        return `Cambió la foto principal${design ? ` de «${design.name}»` : " de un diseño"}`;
      }
      return "Editó una foto";
    }
    case "carousel":
      return entry.action === "clear" ? "Vació el carrusel" : "Cambió el orden del carrusel";
    case "rider_photo": {
      const rider = str(detail.rider_name);
      if (entry.action === "upload") return `Publicó la foto del piloto${quoted(rider)}`;
      if (entry.action === "delete") return "Eliminó una foto de pilotos";
      if (detail.is_active === false) return "Ocultó una foto de pilotos";
      if (detail.is_active === true) return "Publicó de nuevo una foto de pilotos";
      if (detail.display_order !== undefined) return "Cambió el orden de los pilotos";
      return `Editó la foto del piloto${quoted(rider)}`;
    }
    case "setting": {
      const key = str(detail.key) ?? entry.entity_id ?? "";
      if (key === "carousel_order") return "Cambió el orden del carrusel";
      // Una clave que el panel ya no conoce no se muestra cruda.
      const label = SETTING_LABELS.get(key);
      return label ? `Cambió el texto${quoted(label)}` : "Cambió un texto de la tienda";
    }
    case "feature": {
      const name = FEATURE_INFO[entry.entity_id ?? ""]?.label ?? null;
      return `${detail.enabled ? "Encendió" : "Apagó"} el módulo${quoted(name)}`;
    }
    case "product": {
      const sku = str(detail.sku);
      if (entry.action === "create") return `Creó el producto${quoted(sku)}`;
      if (entry.action === "delete") return "Eliminó un producto";
      return `Editó el producto${quoted(sku)}`;
    }
    case "admin_activity_logs":
      return "Borró la actividad de hace más de 90 días";
    default:
      // Registros de versiones viejas del panel: sin nombres internos a la vista.
      return "Hizo un cambio en el panel";
  }
}
