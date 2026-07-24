import { createFileRoute, redirect } from "@tanstack/react-router";

// v5.5: página pública de planos removida. Acesso é definido pelo master.
export const Route = createFileRoute("/planos")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
