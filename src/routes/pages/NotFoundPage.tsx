import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="max-w-xl">
      <h1 className="mb-1 text-page font-bold tracking-tight text-fg">Page not found</h1>
      <p className="mb-4 text-body text-fg-muted">
        That route doesn&rsquo;t exist in the dashboard.
      </p>
      <Link to="/" className="text-body font-medium text-brand-red underline underline-offset-2">
        Back to Overview
      </Link>
    </section>
  );
}
