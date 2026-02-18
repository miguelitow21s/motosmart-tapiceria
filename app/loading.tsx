import { SectionContainer } from "@/components/shared/section-container";

export default function GlobalLoading() {
  return (
    <SectionContainer className="py-16">
      <div className="space-y-4">
        <div className="h-10 w-2/3 animate-pulse rounded-xl bg-white/10" />
        <div className="h-5 w-1/2 animate-pulse rounded-lg bg-white/10" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
