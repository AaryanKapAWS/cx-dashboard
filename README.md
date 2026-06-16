# Substation Commissioning Dashboard

Real-time equipment inspection progress tracker for HV substation projects.

## Features
- Upload SLD drawings (PDF) → auto-extract equipment lists
- Maps equipment to IEC/IEEE test templates
- Tracks commissioning levels (L1-L5) per equipment
- Multi-site project selector
- Live Procore inspection data integration

## Tech Stack
- React + Vite
- Highcharts (solid gauge, column charts)
- pdf.js (client-side PDF parsing)

## Development
```bash
npm install
npm run dev
```

## Deployment
Push to `main` branch → auto-deploys to GitHub Pages via Actions.

## Author
Aaryan Kapoor — ACx Team, Dublin
