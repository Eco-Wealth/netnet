"use client";

import type { ReactNode } from "react";
import styles from "@/components/operator/OperatorSeat.module.css";

type TooltipProps = {
  text: string;
  children: ReactNode;
};

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className={styles["nn-tooltipWrap"]}>
      {children}
      <span className={styles["nn-tooltipBubble"]} role="tooltip">
        {text}
      </span>
    </span>
  );
}

