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
