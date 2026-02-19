import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  guidance?: ReactNode;
  outputs?: ReactNode;
  rightSlot?: ReactNode;
};

export default function PageHeader({
  title,
  subtitle,
  guidance,
  outputs,
  rightSlot,
}: PageHeaderProps) {
  return (
    <header className="nn-page-headerCard">
      <div className="nn-page-headerTop">
        <div className="nn-page-headerText">
          <h1>{title}</h1>
          {subtitle ? <p className="nn-page-lead">{subtitle}</p> : null}
        </div>
        {rightSlot ? <div className="nn-page-headerActions">{rightSlot}</div> : null}
      </div>

      {guidance ? (
        <details className="nn-page-detail">
          <summary className="nn-page-detailSummary">What do I do here?</summary>
          <div className="nn-page-detailBody">{guidance}</div>
        </details>
      ) : null}

      {outputs ? (
        <details className="nn-page-detail">
          <summary className="nn-page-detailSummary">Outputs</summary>
          <div className="nn-page-detailBody">{outputs}</div>
        </details>
      ) : null}
    </header>
  );
}
