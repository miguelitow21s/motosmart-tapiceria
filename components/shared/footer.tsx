import { getSiteSettings } from "@/lib/settings";

export async function Footer() {
  const settings = await getSiteSettings();

  return (
    <footer className="mt-20 border-t border-white/10 bg-black/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-neutral-300 md:px-8">
        <p>{settings.business_name} - Medellin</p>
        <p>Diseno premium para motos. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
