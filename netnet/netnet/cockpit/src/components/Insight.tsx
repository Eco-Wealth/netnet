"use client";

import * as React from "react";
import type { InsightSpec } from "@/lib/insight";
import { insightTitle } from "@/lib/insight";

type InsightProps = {
  insight: InsightSpec;
  children: React.ReactElement;
};

export default function Insight({ insight, children }: InsightProps) {
  const title = insightTitle(insight);
  return React.cloneElement(children, {
    title,
    "aria-label": children.props["aria-label"] || title,
  });
}

