---
title: Netnet Carbon Agent API
description: Minimal carbon retirement workflow for netnet-cockpit agent usage (estimate → projects → quote → retire → status).
--

# Netnet Carbon Agent API

## Endpoints

- `GET /api/health`
- `GET /api/agent/carbon?action=info`
- `GET /api/agent/carbon?action=projects`
- `GET /api/agent/carbon?action=quote&projectId=&amount=&token=&chain=`
- `POST /api/agent/carbon` (initiate; returns payment instructions)
- `GET /api/agent/carbon?action=status&txHash=`

## Required fields for POST

- `beneficiaryName`
- `reason`

## Safety

- Do not pay. Return payment instructions.
- Reject any request without beneficiary + reason.
