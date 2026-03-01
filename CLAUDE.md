# CLAUDE.md — SFMC Revert Changes Chrome Extension

## Project Overview

This is a **Chrome Extension (Manifest V3)** built for **Salesforce Marketing Cloud (SFMC)**. Its purpose is to automatically capture save events made in SFMC (emails, SQL queries) and allow users to revert assets to any previously saved version.

- **Extension name**: SFMC Revert Changes
- **Version**: 0.1
- **No build system** — all files are plain static JS/HTML/CSS loaded directly by Chrome. There is no `package.json`, no npm, no webpack, and no compilation step.

---

## Repository Structure

```
sfmc-chrome-addon-2023/
├── manifest.json          # Chrome Extension Manifest V3 config
├── background.js          # Service worker: intercepts SFMC API requests, saves data
├── popup.html             # Tiny popup shell that opens index.html as a tab
├── popup.js               # Popup logic — opens index.html, prevents duplicate tabs
├── index.html             # Main extension UI (full-page tab)
├── index.js               # Main UI logic — menus, previews, revert actions
├── js/
│   ├── jquery-3.6.0.min.js
│   ├── codemirror.js
│   ├── codemirror-sql.js
│   └── codemirror-javascript.js
├── css/
│   ├── salesforce-lightning-design-system.min.css  # SLDS (vendored)
│   ├── salesforce-lightning-design-system.css      # (also present)
│   ├── codemirror.css
│   └── codemirror-twilight.css                     # Dark theme for CodeMirror
├── images/
│   ├── get_started16.png
│   ├── get_started32.png
│   ├── get_started48.png         # Default toolbar icon
│   ├── get_started48_recording.png  # Icon shown during a save event
│   ├── get_started128.png
│   └── icons/
└── assets/                # SLDS icon sprites (SVG symbols)
```

---

## Architecture

### Background Service Worker (`background.js`)

The core of the extension. It runs as a Manifest V3 **service worker** and:

1. **Intercepts outgoing web requests** on SFMC domains via `chrome.webRequest` listeners.
2. **Captures CSRF tokens** from request headers (`X-CSRF-Token`) via `onBeforeSendHeaders`.
3. **Captures asset bodies** from request payloads via `onBeforeRequest` with `requestBody`.
4. **Saves captured data** to `chrome.storage.local`.
5. **Flashes the toolbar icon** for 5 seconds after a save.

Monitored URLs:
- `https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*` — Email/CloudPage PUT saves
- `https://*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*` — SQL activities
- `https://querystudio.herokuapp.com/query/create` — Query Studio POST saves

### `chrome.storage.local` Data Schema

All data is namespaced by Business Unit ID (`memberId`, a numeric string):

```js
{
  "[memberId]": {
    email: [
      {
        body: "<raw JSON string of full SFMC asset payload>",
        compiledHtml: "<pre-compiled HTML string>",
        folderId: Number,
        folderName: String,
        name: String,
        assetId: Number,
        customerKey: String,
        memberId: String,
        timeStamp: Number,  // Unix ms timestamp
        url: String         // Original PUT URL
      }
    ],
    query_studio: [
      {
        body: { querytext: String },
        timeStamp: Number,
        url: String
      }
    ],
    cloud_pages: [],        // Placeholder — not yet implemented
    automation_studio: [],  // Placeholder — not yet implemented
    token: {
      "X-CSRF-Token": String,
      createdDate: Number   // Unix ms, used to check token age (<15 min)
    }
  },
  "0": {                    // Special BU for unauthenticated Query Studio saves
    query_studio: [...],
    ...
  },
  "lastAccessed": {
    buid: String,
    time: Number
  }
}
```

### UI (`index.html` + `index.js`)

A full-page Chrome extension tab (opened from the popup). Built with:
- **Salesforce Lightning Design System (SLDS)** for all visual components
- **jQuery 3.6.0** for DOM manipulation and event handling
- **CodeMirror** for the SQL editor/viewer

**3-level navigation pattern:**
1. **Top menu**: Business Unit dropdown + category list (`Email`, `Query Studio`)
2. **Sub-menu (L1)**: List of unique assets within the selected category
3. **Sub-menu (L2)**: Audit history — all saved versions of a specific asset, by timestamp

**CSS class naming convention**: All custom classes use the `ck-` prefix (e.g., `ck-email-preview-screen`, `ck-left-menu`, `ck-revert-btn`). SLDS classes use the `slds-` prefix. Never mix or remove these prefixes.

### Popup (`popup.html` + `popup.js`)

Minimal: clicking the extension icon in the toolbar opens `index.html` as a new tab (or focuses it if already open). No UI is rendered in the popup itself.

---

## Key Functions Reference

### `background.js`

| Function | Purpose |
|---|---|
| `saveToLocal(memberId, assetType, assetId, assetData)` | Persists captured asset to `chrome.storage.local` |
| `isDuplicateRequestEmailRequest(memberId, compiledHtml)` | Prevents duplicate saves by comparing compiled HTML |
| `setCurrentBUID(buid)` | Stores `lastAccessed` BU to storage |
| `compile(asset, channel)` | Recursively compiles SFMC asset (resolves slots/blocks) into raw HTML |
| `getReferences(content, type)` | Parses SFMC slot/block references from HTML content |
| `utf8ArrayToString(aBytes)` | Decodes raw request bytes to a UTF-8 string |
| `changeIcon()` | Briefly changes toolbar icon to the "recording" state |

### `index.js`

| Function | Purpose |
|---|---|
| `main()` (IIFE) | Entry point — loads data and initialises UI |
| `loadUI(currentBuid)` | (Re)renders the full UI for the current BU |
| `setLeftMenuTop(buids, currentBuid)` | Renders the BU dropdown and top-level category menu |
| `setLeftSubMenu(currentBuid, menuItemType)` | Renders L1 asset list for Email or Query Studio |
| `setAuditHistoryUI(menuItemType, currentBuid, assetId)` | Renders L2 version history for an email asset |
| `showEmailPreview(currentBuid, menuItemType, assetName, assetId, timeStamp)` | Displays email HTML in an iframe |
| `showQueryStudioPreview(menuItemType, timeStamp)` | Displays SQL in a CodeMirror editor |
| `revertEmail(el)` | Makes a PUT request to SFMC to revert an email to a saved version |
| `getcsrfToken()` | Retrieves stored CSRF token (validates age <15 min) |
| `showToastMessage(toastType, message)` | Displays an SLDS toast notification |
| `sanitizeEmailPutURL(url)` | Strips query params from a URL before PUT |
| `getData()` | Reads all data from `chrome.storage.local` |
| `setCurrentBUID(buid)` | Saves current BU to `lastAccessed` in storage |
| `getCurrentBUID()` | Reads `lastAccessed.buid` from storage |

---

## Development Workflow

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the root directory of this repo
5. The extension will appear in the toolbar

### Making Changes

- **No compilation needed.** Edit JS/HTML/CSS files directly.
- After changing `background.js`: go to `chrome://extensions` → click **Service Worker** link to reload it, or click the **↻** (refresh) button on the extension card.
- After changing `index.js` / `index.html` / `popup.js`: close and reopen the extension tab, or hard-refresh it (`Ctrl+Shift+R`).
- After changing `manifest.json`: click the **↻** button on the extension card at `chrome://extensions`.

### Testing Manually

1. Navigate to any SFMC URL matching the `content_scripts` matches (e.g., `https://*.marketingcloudapps.com/*`).
2. Open an email in Content Builder and save it — the toolbar icon will flash briefly.
3. Click the extension icon → the extension tab opens, showing saved versions.
4. Use **Query Studio** on `https://querystudio.herokuapp.com/*` and run a query — it is captured automatically.

There are **no automated tests** in this project.

---

## Known Issues and TODOs

These are existing limitations noted in the code — do not accidentally "fix" them without full understanding of the impact:

- `memberId` is initialized as `''` in `background.js` and only set once the first SFMC save is intercepted. Query Studio saves before a SFMC save will be stored under BU `'0'`.
- The `PATCH` method handler in `background.js` (for Automation Studio SQL activities) is incomplete — the `saveToLocal` call is commented out.
- `Landing Pages` and `Automation Studio` in the menu are placeholders with no data rendering logic.
- `getStoredCount` in `index.js` has a bug: `resolve(emailCount)` is placed after the function's closing brace — it is unreachable.
- `for(rh in details.requestHeaders)` and similar `for...in` loops over arrays in `background.js` are non-standard but intentional.
- Line 344 of `index.js` contains `currentBuid (currentBuid == undefined ? 0 : currentBuid)` — this appears to be a bug (calling a variable as a function) but has not caused issues because the condition is rarely hit. Do not change without understanding the callsite.
- CSRF token validity window is hardcoded to 15 minutes (`allowedTokenAge = 15` in `index.js`).
- `compile()` and `getReferences()` are duplicated between `background.js` and `index.js`. They must remain in sync.

---

## Permissions and Security Context

The extension requests the following Chrome permissions:

| Permission | Reason |
|---|---|
| `storage` | Storing versioned email/SQL data |
| `unlimitedStorage` | Email bodies can be large |
| `webRequest` | Intercepting SFMC API requests |
| `tabs` | Opening `index.html` as a tab from popup |

**Host permissions** are scoped to `marketingcloudapps.com`, `exacttarget.com`, and `querystudio.herokuapp.com` only.

The revert flow sends a PUT request directly to the SFMC API from the extension page context, using the previously captured CSRF token. The token has a 15-minute validity window — if stale, the user must refresh Marketing Cloud to generate a fresh one.

---

## Third-Party Libraries (Vendored)

All dependencies are vendored in `js/` and `css/` — there is no package manager.

| Library | Version | Location |
|---|---|---|
| jQuery | 3.6.0 | `js/jquery-3.6.0.min.js` |
| CodeMirror | (bundled) | `js/codemirror.js` |
| CodeMirror SQL mode | — | `js/codemirror-sql.js` |
| CodeMirror JS mode | — | `js/codemirror-javascript.js` |
| SLDS (Salesforce LDS) | (bundled) | `css/salesforce-lightning-design-system.min.css` |
| CodeMirror Twilight theme | — | `css/codemirror-twilight.css` |

Do **not** introduce npm/yarn/pnpm or a bundler unless specifically asked. Updating libraries means replacing the vendored files manually.

---

## Conventions

- **Custom CSS classes**: Always prefix with `ck-` (e.g., `ck-revert-btn`, `ck-left-menu`).
- **SLDS classes**: Use SLDS utility classes (`slds-*`) for layout, spacing, and theming. Never inline style SLDS components.
- **jQuery**: DOM querying and event handling use jQuery (`$`). Avoid mixing with vanilla `document.querySelector` except where needed (e.g., `document.getElementById('ck-email-preview-body')`).
- **`chrome.storage.local` keys**: Always use the `memberId` string as the top-level key. Special keys are `lastAccessed`, `token`, and `0`.
- **Async patterns**: The codebase uses `async/await` with `new Promise` wrappers around Chrome callback APIs. Follow this pattern when adding new Chrome API calls.
- **No ES modules**: All JS is loaded as plain `<script>` tags. Do not use `import`/`export`.
- **Global state** in `index.js`: `currentBuid`, `buids`, `data`, and `loadUICount` are module-level globals. Be aware of their lifecycle across `loadUI()` calls.

---

## Issue #4 — Query Runner: Replace Query Studio with SFMC Internal APIs

### Problem

The current query runner (`showQueryStudioPreview` in `index.js`) pipes SQL through `https://querystudio.herokuapp.com`. The results endpoint (`GET /query/results?p=1`) only returns the first page of HTML — multi-page result sets are silently truncated. There is no reliable way to paginate through all results with the current approach.

### Proposed Strategy

Replace the Query Studio 4-step flow with a direct SFMC internal API flow:

1. **Create a temporary Data Extension** to hold query results (columns/types inferred from query output)
2. **Create a Query Activity** targeting that DE
3. **Start the query** and poll until complete
4. **Read all rows from the DE** with proper pagination (up to 2500 rows/page)
5. **Delete the temporary DE** after results are displayed

All calls use the same auth as existing extension API calls: **X-CSRF-Token + browser session cookies** (no OAuth required). The base URL is extracted from the instance URL already stored in captured email/query data.

### Auth Model

| API surface | Base URL | Auth |
|---|---|---|
| Internal FuelAPI proxy | `https://{instance}.marketingcloudapps.com/fuelapi/...` | X-CSRF-Token + cookies |
| Automation Studio FuelAPI | `https://{instance}.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/...` | X-CSRF-Token + cookies |
| Public REST API | `https://{subdomain}.rest.marketingcloudapis.com/...` | OAuth Bearer — **do not use** |

The extension must never introduce OAuth. All API calls must go through the FuelAPI proxy domain using the captured CSRF token.

### API Endpoints — Certainty Levels

| Step | Method | Path (relative to instance base URL) | Certainty |
|---|---|---|---|
| Create temp DE | `POST` | `/fuelapi/data/v1/customobjectdata/` | ⚠️ Needs validation — see below |
| Create query activity | `POST` | `/AutomationStudioFuel3/fuelapi/automation/v1/queries/` | ✅ Domain confirmed by existing interceptor |
| Start query | `POST` | `/AutomationStudioFuel3/fuelapi/automation/v1/queries/{id}/actions/start/` | ⚠️ Needs validation |
| Poll status | `GET` | `/AutomationStudioFuel3/fuelapi/automation/v1/queries/{id}/actions/isrunning/` | ⚠️ Needs validation |
| Read DE rows | `GET` | `/fuelapi/data/v1/customobjectdata/key/{key}/rowset?$pageSize=2500&$page=N` | ⚠️ Needs validation |
| Delete temp DE | `DELETE` | `/fuelapi/data/v1/customobjectdata/{id}` | ⚠️ Needs validation |

#### Create Query Activity — Request Body

```json
{
  "name": "sfmc_ext_{timestamp}",
  "key": "{UUID}",
  "description": "Temporary — created by SFMC Revert Changes extension",
  "queryText": "<user SQL>",
  "targetName": "<temp DE name>",
  "targetKey":  "<temp DE customerKey>",
  "targetUpdateTypeId": 0,
  "targetUpdateTypeName": "Overwrite",
  "categoryId": 0
}
```

Response contains `queryDefinitionId` used in subsequent calls.

#### DE Row Read — Pagination

```
GET /fuelapi/data/v1/customobjectdata/key/{deKey}/rowset?$pageSize=2500&$page=1
```

Response shape:
```json
{
  "count": 12500,
  "items": [ { "keys": {}, "values": {} }, ... ],
  "links": { "next": "...?$page=2" }
}
```

Keep incrementing `$page` while `items.length === pageSize` (or while `links.next` is present). Max `$pageSize` is 2500.

### Fallback Plan (if DE creation via FuelAPI is blocked)

If `POST /fuelapi/data/v1/customobjectdata/` returns 401/403 (CSRF auth rejected for DE creation), the user pre-creates a single **permanent results DE** in SFMC with a known customer key, and the extension:
- Stores the customer key in `chrome.storage.local` (user configures it once in extension settings)
- Always targets this DE with `targetUpdateTypeId: 0` (Overwrite) — each run replaces previous results
- Skips the create and delete steps entirely

### Browser Console Validation Scripts

Run these from the **browser DevTools console** while on any `https://*.marketingcloudapps.com` page. Get your CSRF token from DevTools → Network → any recent SFMC request → `X-CSRF-Token` request header.

#### Setup
```javascript
const BASE = window.location.origin;
const CSRF = 'PASTE_YOUR_X-CSRF-TOKEN_HERE';
const JSON_HDRS = { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF };
console.log('Base:', BASE, '| Token length:', CSRF.length);
```

#### Validate Step 1 — Create Query Activity
```javascript
const qName = 'sfmc_ext_validate_' + Date.now();
const r1 = await fetch(BASE + '/AutomationStudioFuel3/fuelapi/automation/v1/queries/', {
  method: 'POST', headers: JSON_HDRS, credentials: 'include',
  body: JSON.stringify({
    name: qName, key: crypto.randomUUID(),
    description: 'Extension validation — safe to delete',
    queryText: 'SELECT TOP 1 SubscriberKey FROM _Subscribers',
    targetName: 'PASTE_AN_EXISTING_DE_NAME',
    targetKey:  'PASTE_THAT_DEs_CUSTOMER_KEY',
    targetUpdateTypeId: 0, targetUpdateTypeName: 'Overwrite', categoryId: 0
  })
});
const b1 = await r1.json();
console.log('Step 1 status:', r1.status, '| queryDefinitionId:', b1.queryDefinitionId);
// ✅ 200/201 + queryDefinitionId present = success
// ❌ 401/403 = CSRF rejected on this endpoint
```

#### Validate Step 2 — Start Query
```javascript
const QUERY_ID = b1.queryDefinitionId; // from Step 1
const r2 = await fetch(
  BASE + `/AutomationStudioFuel3/fuelapi/automation/v1/queries/${QUERY_ID}/actions/start/`,
  { method: 'POST', headers: JSON_HDRS, credentials: 'include' }
);
console.log('Step 2 status:', r2.status, await r2.json());
// ✅ 200 = started
```

#### Validate Step 3 — Poll Status
```javascript
const r3 = await fetch(
  BASE + `/AutomationStudioFuel3/fuelapi/automation/v1/queries/${QUERY_ID}/actions/isrunning/`,
  { method: 'GET', headers: JSON_HDRS, credentials: 'include' }
);
const b3 = await r3.json();
console.log('Step 3 status:', r3.status, b3);
// Note the exact field name returned (isRunning vs isrunning vs status)
```

#### Validate Step 4 — Read DE Rows
```javascript
const DE_KEY = 'PASTE_ANY_DE_CUSTOMER_KEY';
const r4 = await fetch(
  BASE + `/fuelapi/data/v1/customobjectdata/key/${DE_KEY}/rowset?$pageSize=5&$page=1`,
  { method: 'GET', headers: JSON_HDRS, credentials: 'include' }
);
const b4 = await r4.json();
console.log('Step 4 status:', r4.status, '| count:', b4.count, '| items:', b4.items?.length);
console.log('Sample item:', JSON.stringify(b4.items?.[0], null, 2));
// ✅ 200 + items array = success — note the items[].keys / items[].values shape
// ❌ 401 = CSRF not accepted here
```

#### Validate Step 5 — Create Temp DE (critical unknown)

First, **capture the real endpoint** by opening the Network tab, manually creating a small DE in Contact Builder, then noting the exact POST URL and request body. Then also try the likely candidate:

```javascript
const deName = 'sfmc_ext_test_' + Date.now();
const r5 = await fetch(BASE + '/fuelapi/data/v1/customobjectdata/', {
  method: 'POST', headers: JSON_HDRS, credentials: 'include',
  body: JSON.stringify({
    name: deName, customerKey: deName,
    fields: [
      { name: 'pk',   type: 'Text', length: 254,  isPrimaryKey: true,  isNullable: false },
      { name: 'col1', type: 'Text', length: 4000, isPrimaryKey: false, isNullable: true  }
    ]
  })
});
console.log('Step 5 status:', r5.status, await r5.text());
// ✅ 200/201 = can create DEs with CSRF auth — full dynamic flow is possible
// ❌ 404 = wrong path (use Network tab to find the real endpoint)
// ❌ 401/403 = use fallback plan (pre-created DE with stored customer key)
```

### What to Record After Validation

After running the scripts, note:

1. **Step 1**: HTTP status + exact field name for the query ID in the response
2. **Step 2**: HTTP status + response body shape
3. **Step 3**: HTTP status + exact field name that indicates running state (`isRunning`, `isrunning`, `status`, etc.)
4. **Step 4**: HTTP status + confirm `items[N].keys` / `items[N].values` shape, and whether `links.next` is present
5. **Step 5**: HTTP status + if 404, the real DE-creation URL seen in the Network tab
6. **DE create body**: If the Network tab reveals a different request body schema than assumed above, record it here
