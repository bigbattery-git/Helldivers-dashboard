// Official Korean planet name; "(원문)" opens the English original (design system README "문구").
export function PlanetName({ name, nameEn }: { name: string; nameEn: string }) {
  if (name === nameEn) return <span>{name}</span>;
  return (
    <details className="group inline-block align-baseline">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
        {name}{" "}
        <span className="text-xs text-subtle group-open:hidden">(원문)</span>
      </summary>
      <span lang="en" className="text-xs text-subtle">
        {nameEn}
      </span>
    </details>
  );
}
