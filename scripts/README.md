# Scripts

## push-to-asana.js

Pushes your commissioning project to Asana using the PAT (Personal Access Token).

### Setup

1. Make sure `.env.local` has your token:
   ```
   ASANA_PAT=2/1234.../abcdef...
   ```

2. Export from the dashboard:
   - Build your scope in the Bay Builder
   - Click **📊 Export to Asana**
   - A `.json` file downloads to your machine

3. Move the JSON to `scripts/exports/` (or specify the path directly)

### Usage

```powershell
# From the project root:
node scripts/push-to-asana.js

# Or specify a file directly:
node scripts/push-to-asana.js path/to/asana_MyProject_2026-08-11.json
```

### What it does

1. Reads the PAT from `.env.local` (never exposed to browser)
2. Reads the project JSON (equipment, sections, tests)
3. Creates an Asana project with:
   - 🏁 Milestones section (7 milestones with dependencies)
   - Equipment sections (one per feeder/bay)
   - Tasks per equipment item (with test checklists in notes)
   - Start/due dates based on test count
4. Opens the project in your browser when done

### Security

- PAT stays on your machine — never sent to GitHub Pages
- The dashboard only generates a JSON file (no API calls in browser)
- Token expires every 90 days (Asana will email you)
