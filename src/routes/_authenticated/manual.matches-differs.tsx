import { createFileRoute } from "@tanstack/react-router";
import { StrategyPage } from "@/components/manual/StrategyPage";

export const Route = createFileRoute("/_authenticated/manual/matches-differs")({
  component: () => <StrategyPage id="matches-differs" />,
});