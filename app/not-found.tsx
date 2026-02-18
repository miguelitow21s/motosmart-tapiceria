import Link from "next/link";
import { SectionContainer } from "@/components/shared/section-container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SectionContainer className="py-24 text-center">
      <h1 className="font-display text-5xl text-white">404</h1>
      <p className="mt-3 text-neutral-300">No encontramos la pagina solicitada.</p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </SectionContainer>
  );
}
