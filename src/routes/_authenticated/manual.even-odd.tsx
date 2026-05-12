import { createFileRoute } from "@tanstack/react-router";
import { StrategyPage } from "@/components/manual/StrategyPage";

export const Route = createFileRoute("/_authenticated/manual/even-odd")({
  component: () => <StrategyPage id="even-odd" />,
});