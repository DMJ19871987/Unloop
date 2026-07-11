import type { Metadata } from "next";
import { FieldGuide } from "@/components/guide/FieldGuide";

export const metadata: Metadata = {
  title: "Field guide - Unloop",
};

export default function GuidePage() {
  return <FieldGuide />;
}
