# SFMC Revert Changes

A Chrome Extension (Manifest V3) for **Salesforce Marketing Cloud (SFMC)** that automatically captures every save event for emails and SQL queries, lets you preview and revert to any previous version, and includes a built-in SQL query runner backed by Query Studio.

---

## Features

### Email Version History
- Automatically intercepts every **Content Builder email save** (PUT request) in the background
- Stores a full version history per email asset, per Business Unit
- Preview any saved version in a sandboxed iframe
- **One-click revert** — replays the saved payload back to the SFMC API using your current session token

### SQL Query History
- Captures every **Query Studio** query execution automatically
- Captures **Automation Studio SQL activity** edits (PATCH)
- Per-query features inspired by [SFMCQuerySaver](https://github.com/matheswarwan/SFMCQuerySaver):
  - **Rename** — double-click any query label to give it a meaningful name
  - **Favourite / pin** — star (★) important queries so they sort to the top
  - **Search / filter** — real-time filter by name or query text
  - **Copy SQL** — one click copies the full query to clipboard

### SQL Query Runner
Run ad-hoc SQL queries against your SFMC data directly from the extension, without leaving Chrome:

1. Open a saved query (or type a new one in the CodeMirror editor)
2. Click **▶ Run**
3. The extension drives the full Query Studio execution flow:
   - `POST /query/create` — creates the query activity
   - `POST /query/:id/start` — triggers execution
   - `GET /query/:id/isrunning` — polls every 5 seconds until complete
   - `GET /query/results?p=1` — fetches and displays the results table
4. Results appear inline, pre-styled with Salesforce Lightning Design System

### Multi-Business Unit Support
- Tracks saved data per Business Unit (member ID) automatically
- Switch between BUs via the dropdown in the left panel
- Unauthenticated Query Studio saves (before your first SFMC save) appear under **Unassigned**

### Selective Deletion
- Checkboxes on every email asset, version date, and query entry
- **Delete Selected** removes only the checked items from storage
- **Clear All** wipes everything (with confirmation)

---

## Installation

> No build step required — this is plain HTML/CSS/JS loaded directly by Chrome.

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the root folder of this repository
6. The extension icon appears in the Chrome toolbar

---

## Usage

### Capturing Email Saves
1. Navigate to any SFMC Content Builder URL (`*.marketingcloudapps.com`)
2. Open an email and click **Save** — the toolbar icon flashes briefly to confirm capture
3. Click the extension icon → the history panel opens

### Viewing & Reverting Emails
1. Click the extension icon to open the panel
2. Select **Email** from the left menu
3. Click an email name to see its version history
4. Click a timestamp to preview that version in the right panel
5. Click **Revert to this version** (or the replace icon) to push that version back to SFMC

> The revert uses your captured CSRF token, which is valid for **15 minutes** after your last SFMC page interaction. If the revert fails, refresh Marketing Cloud and try again.

### Running SQL Queries
1. Make sure you are logged into [Query Studio](https://querystudio.herokuapp.com) in the same Chrome session
2. Click the extension icon → select **Query Studio** from the left menu
3. Click any saved query to open it in the editor, or type a new query directly
4. Click **▶ Run** — progress is shown inline (Creating → Starting → Running → Fetching results)
5. Results appear as an SLDS-styled table below the editor
6. Use **Copy SQL** to copy the query, or **Open in Query Studio** to open it in the full app

### Managing Queries
- **Rename**: double-click a query label in the list and press Enter
- **Favourite**: click the ☆ star icon next to any query; starred queries sort to the top
- **Search**: use the search box at the top of the Query Studio list
- **Delete**: check one or more entries and click **Delete Selected**

---

## Architecture

```
manifest.json       Chrome MV3 config — permissions, icons, service worker
background.js       Service worker — intercepts SFMC API requests, saves to storage
popup.html/js       Toolbar popup — opens index.html as a tab, prevents duplicates
index.html          Main UI shell — SLDS layout, split-view panel
index.js            Main UI logic — menus, preview, revert, SQL runner
js/                 Vendored libraries (jQuery 3.6.0, CodeMirror + SQL/JS modes)
css/                Vendored styles (SLDS, CodeMirror Twilight theme)
images/             Extension icons (default + recording flash state)
assets/             SLDS SVG icon sprites
```

### How Captures Work

`background.js` runs as a Manifest V3 **service worker** and listens on:

| URL pattern | Method | What is captured |
|---|---|---|
| `*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*` | `PUT` | Email / Cloud Page saves |
| `*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*` | Headers | `X-CSRF-Token` for future reverts |
| `*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*` | `PATCH` | Automation Studio SQL edits |
| `querystudio.herokuapp.com/query/create` | `POST` | Query Studio executions |

### Storage Schema

All data lives in `chrome.storage.local`, keyed by Business Unit ID:

```js
{
  "[memberId]": {
    email:             [ { body, compiledHtml, name, assetId, folderId, folderName, customerKey, memberId, timeStamp, url } ],
    query_studio:      [ { id, name, body: { querytext }, timeStamp, url, favourite } ],
    automation_studio: [ { name, queryText, targetName, modifiedDate, timeStamp, url, favourite } ],
    cloud_pages:       [],
    token:             { "X-CSRF-Token": "...", createdDate: <ms> }
  },
  "0":            { /* Unassigned BU — Query Studio saves before first SFMC save */ },
  "lastAccessed": { buid: "...", time: <ms> }
}
```

---

## Permissions

| Permission | Why |
|---|---|
| `storage` + `unlimitedStorage` | Email bodies can be large; version history grows over time |
| `webRequest` | Intercept outgoing SFMC API requests to capture saves |
| `tabs` | Open `index.html` as a full tab from the popup |

Host access is scoped to `*.marketingcloudapps.com`, `*.exacttarget.com`, and `querystudio.herokuapp.com` only.

---

## Vendored Libraries

All dependencies are checked in — there is no `package.json` or build step.

| Library | Version | Path |
|---|---|---|
| jQuery | 3.6.0 | `js/jquery-3.6.0.min.js` |
| CodeMirror | bundled | `js/codemirror.js` |
| CodeMirror SQL mode | — | `js/codemirror-sql.js` |
| CodeMirror JS mode | — | `js/codemirror-javascript.js` |
| Salesforce Lightning Design System | bundled | `css/salesforce-lightning-design-system.min.css` |
| CodeMirror Twilight theme | — | `css/codemirror-twilight.css` |

---

## Development

### Reloading after changes

| Changed file | How to reload |
|---|---|
| `background.js` | `chrome://extensions` → click the **↻** refresh button on the card, or click the **Service Worker** link |
| `index.js` / `index.html` | Close and reopen the extension tab, or `Ctrl+Shift+R` |
| `manifest.json` | `chrome://extensions` → click **↻** |
| `popup.js` | Close and reopen the extension popup |

### Debug logging

Set `const DEBUG = true;` at the top of `background.js` or `index.js` to enable verbose `console.log` output. Keep it `false` in production.

### Known limitations

- CSRF token validity is hardcoded to **15 minutes** — if the revert fails, refresh Marketing Cloud to capture a fresh token
- `compile()` and `getReferences()` are duplicated in `background.js` and `index.js` — keep both copies in sync when modifying
- The Query Studio runner requires an active logged-in session at `querystudio.herokuapp.com` in the same Chrome profile
- Query results pagination beyond page 1 is not yet implemented in the runner
