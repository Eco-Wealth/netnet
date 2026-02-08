# netnet

The **Next.js app** lives at `netnet/cockpit`.

This root package provides a single entrypoint so you don’t have to `cd` multiple times.

## Quickstart (from repo root)

**Requirements**
- Node **20+** (recommended: `node -v` shows `v20.x`)
- npm **9+**

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Scripts

All scripts delegate into `netnet/cockpit`.

```bash
npm run dev
npm run build
npm run start
npm run test
```

## Troubleshooting

### I have a stray root `package-lock.json` from earlier

If you previously ran `npm install` at the repo root *before* a root `package.json` existed, you may have a junk `package-lock.json`.

Fix:

```bash
rm -f package-lock.json
rm -rf node_modules
npm install
```

## Node pin

This repo includes `.nvmrc` with Node 20.
