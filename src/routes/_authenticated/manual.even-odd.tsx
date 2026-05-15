import { createFileRoute } from "@tanstack/react-router";
import { EvenOddPage } from "@/components/manual/EvenOddPage";

export const Route = createFileRoute("/_authenticated/manual/even-odd")({
  component: EvenOddPage,
});