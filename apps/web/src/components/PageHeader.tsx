export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-5">
      <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </header>
  );
}
