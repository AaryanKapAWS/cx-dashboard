# HV Substation Commissioning Tool

Automates the HV substation commissioning pipeline: **Scope Definition → COR Generation → Procore Inspections → Asana Project Tracking**

**Live:** [aaryankapaws.github.io/cx-dashboard](https://aaryankapaws.github.io/cx-dashboard/)

## What It Does

1. **Bay Builder** — Define commissioning scope by adding sections (Transformer Bay, Switchgear, Line Bay, Battery & DC, etc.) with pre-configured equipment and test templates
2. **COR Generator** — One-click Excel export: formatted 20-column Commissioning Outstanding Register with live formulas, Gantt chart, and progress tracking
3. **SLD Viewer** — Interactive single-line diagram view of the entire scope with collapsible sections and test detail drill-down
4. **Procore Upload** — Generates .xlsm bulk upload file for creating inspections in Procore
5. **Asana Integration** — Creates structured Asana projects with sections, tasks, milestones, and dependencies from the commissioning scope

## Tech Stack

- **React 18** + **Vite** (client-side SPA)
- **ExcelJS** — COR Excel generation
- **JSZip** — Procore .xlsm template manipulation (preserves VBA + formatting)
- **Asana API** — OAuth flow for project creation (pending admin approval)
- **GitHub Pages** — deployment via `gh-pages` branch

## Section Presets (13 types)

| Preset | Use Case |
|--------|----------|
| Transformer Bay (Oil/Dry) | HV power transformer bays |
| Line Bay | HV overhead/cable line bays |
| Bus Section | Bus section/coupler bays |
| Switchgear (AIS/GIS) | MV switchgear boards with feeder-based structure |
| Protection & Stability | Relay panels, stability testing |
| Cable Testing | HV/MV cable commissioning |
| Battery & DC System | Battery banks, chargers, UPS, DC distribution |
| Earthing System | Earth grid, earth electrodes |
| Substation Checks | SCADA, grid interface, AC/DC distribution |
| Aux Transformer | Standalone auxiliary transformers |
| Panel Board | LV/MV panel boards with feeders |
| Custom | Blank — add anything from equipment palette |

## Equipment & Tests

- **56 equipment types** across 10 categories
- **234+ test definitions** mapped to commissioning levels L1–L5
- Full test customisation per item (tick/untick individual tests)

## Development

```bash
npm install
npm run dev
```

> **Note:** If Node.js is not on PATH (Windows), prefix with:
> ```powershell
> $env:PATH += ";C:\Users\aarynkap\node-v22.16.0-win-x64"
> ```

## Deployment

```bash
npm run build
npm run deploy
```

Deploys to `gh-pages` branch → GitHub Pages.

> ⚠️ **NEVER use `git add -A`** — use explicit paths to avoid committing `.env.local` secrets:
> ```bash
> git add src/ public/ package.json vite.config.js index.html
> git commit -m "message"
> git push
> ```

## Project Structure

```
src/
├── App.jsx                    — Main app (Bay Builder mode)
├── components/
│   ├── BayBuilder.jsx         — Scope tree builder
│   ├── EquipmentTable.jsx     — Equipment register with feeder tabs
│   ├── TestCustomiser.jsx     — Per-item test tick/untick
│   ├── SLDViewer.jsx          — Interactive SLD view
│   └── DocsReference.jsx      — Documentation tab
├── utils/
│   ├── corGenerator.js        — COR Excel generation
│   ├── inspectionUploadGenerator.js — Procore .xlsm output
│   ├── asanaAPI.js            — Asana OAuth + token management
│   ├── asanaProjectBuilder.js — Asana project creation
│   └── asanaExporter.js       — CSV fallback export
└── data/
    └── test_templates.json    — 56 equipment types, 234+ tests
```

## Author

**Aaryan Kapoor** — PM Intern, ACx Team, Amazon Dublin
