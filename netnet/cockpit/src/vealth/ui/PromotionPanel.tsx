import React from "react";
import championPointer from "../brain/champion.json";
import brainV1 from "../brain/brains/prompt_brain_v1.json";
import brainV2 from "../brain/brains/prompt_brain_v2.json";
import passingRunRecord from "../runs/core.run_record_integrity/passing_run_v1/runRecord.json";
import failingRunRecord from "../runs/core.run_record_integrity/failing_run_v1/runRecord.json";
import { compareBrains } from "../evaluation/compareBrains";
import { generatePromotionArtifact } from "../evaluation/generatePromotionArtifact";

const championBrain = championPointer.version === brainV1.version ? brainV1 : brainV2;
const challengerBrain = championPointer.version === brainV1.version ? brainV2 : brainV1;

const fixtures = [passingRunRecord, failingRunRecord];
const result = compareBrains(championBrain as any, challengerBrain as any, fixtures as any);
const promotionArtifact = generatePromotionArtifact(championBrain as any, challengerBrain as any, result as any);

import promotionRunRecord from "../runs/promotion/promotion_run_v1/runRecord.json";

export default function PromotionPanel(): JSX.Element {
  const qualifiesStyle = {
    color: promotionArtifact.approved ? "#237804" : "#ff4d4f",
    fontWeight: 700,
  } as React.CSSProperties;

  return (
    <div style={{ borderTop: "1px solid #eee", marginTop: 16, paddingTop: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>A/B Promotion Check</div>
      <div>Champion: {promotionArtifact.previousChampionVersion}</div>
      <div>Challenger: {promotionArtifact.newChampionVersion}</div>
      <div>Champion Mean Score: {promotionArtifact.championMeanScore}</div>
      <div>Challenger Mean Score: {promotionArtifact.challengerMeanScore}</div>
      <div>Challenger Hard Failures: {promotionArtifact.challengerHardFailures}</div>
      <div style={qualifiesStyle}>Approved: {String(promotionArtifact.approved)}</div>
      <div style={{ marginTop: 8, fontStyle: "italic" }}>Reason: {promotionArtifact.reason}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>Latest Promotion Event: promotion_run_v1</div>
      <div>Proposed New Champion: {promotionRunRecord.params.brainVersion}</div>
    </div>
  );
}
