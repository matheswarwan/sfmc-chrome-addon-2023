const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };

/* ─── Global constants ─── */
const GLOBAL = {};
GLOBAL.EMAIL = {};
GLOBAL.EMAIL.TOAST_MESSAGE_INVALID_TOKEN    = '❌ Token invalid. You haven\'t accessed Marketing Cloud in the last 15 minutes. Please refresh Marketing Cloud.';
GLOBAL.EMAIL.TOAST_MESSAGE_INVALID_FETCH    = '❌ Error reverting email (network error).';
GLOBAL.EMAIL.TOAST_MESSAGE_EMAIL_REVERTED   = '✅ Email reverted to this version!';
GLOBAL.EMAIL.TOAST_MESSAGE_CONTENT_CLEARED  = '🪹 All contents cleared!';
GLOBAL.EMAIL.TOAST_MESSAGE_SQL_COPIED       = '👍 SQL copied to clipboard';
GLOBAL.EMAIL.TOAST_MESSAGE_SQL_COPY_ERROR   = '❌ Unable to copy to clipboard';
GLOBAL.EMAIL.TOAST_MESSAGE_DELETED          = '🗑️ Selected items deleted.';
GLOBAL.EMAIL.TOAST_DURATION                 = 5 * 1000;
GLOBAL.TOAST = {};
GLOBAL.TOAST.SUCCESS = 'success';
GLOBAL.TOAST.ERROR   = 'error';

/* ─── Module-level state ─── */
let currentBuid   = null;
let buids         = [];
let loadUICount   = 0;
let data          = {};
const allowedTokenAge = 15; // minutes

/* ─── SFMC stack discovery ─── */
const SFMC_STACK_IDS = [
  's1', 's4', 's6', 's7', 's8', 's10', 's11', 's12', 's13',
  's50', 's51', '401', '402', '403'
];
const SFMC_SELECTED_STACK_KEY = 'sfmcSelectedStack';


/* ═══════════════════════════════════════════════
   ENTRY POINT
═══════════════════════════════════════════════ */
(async function main() {
  data        = await getData();
  buids       = getBuids(data);
  currentBuid = await getCurrentBUID().catch(() => buids[buids.length - 1] || null);
  loadUI(currentBuid);
})();


/* ═══════════════════════════════════════════════
   CORE UI LOADER
═══════════════════════════════════════════════ */
async function loadUI(buid) {
  log('loadUI #', loadUICount++, 'buid:', buid);

  data  = await getData();
  buids = getBuids(data);

  // If the requested BU doesn't exist in data, fall back to most recent
  if (buid === null || buid === undefined || !data[buid]) {
    buid = buids[buids.length - 1] || null;
  }
  currentBuid = buid;

  // Remove all delegated listeners to avoid stacking
  const selectors = [
    '.ck-left-split-view-toggle-btn',
    '.ck-left-sub-menu-item-back',
    '.ck-left-sub-menu-item',
    '.ck-left-l2-menu-item-back',
    '.ck-left-l2-menu-item',
    '.ck-revert-btn',
    '.ck-left-split-view-buid-dropdown',
    '.ck-left-split-view-buid-dropdown-li',
    '.ck-left-split-view-buid-dropdown-ul',
    '.ck-items-refresh-btn',
    '.ck-left-split-view-clear-all-btn',
    '.ck-delete-selected-btn',
    '.ck-preview-botton-action-btn'
  ];
  selectors.forEach(sel => $(sel).off('click'));

  $('.ck-email-preview-screen').removeClass('slds-show').addClass('slds-hide');

  // Header count
  if (buids.length > 0) {
    $('.ck-title-items-count').text(buids.length + ' Business unit(s) found.');
  } else {
    $('.ck-title-items-count').text('No data saved yet!');
  }

  // Toggle split-view panel
  $('.ck-left-split-view-toggle-btn').on('click', () => {
    $('.ck-left-split-view').toggleClass('slds-is-open slds-is-closed');
    $('.ck-left-split-view-toggle-btn').toggleClass('slds-is-open slds-is-closed');
  });

  // Refresh
  $('.ck-items-refresh-btn').on('click', () => loadUI(currentBuid));

  // Clear all
  $('.ck-left-split-view-clear-all-btn').on('click', async function() {
    if (!confirm('Clear ALL saved data for all business units?')) { return; }
    chrome.storage.local.clear();
    showToastMessage(GLOBAL.TOAST.SUCCESS, GLOBAL.EMAIL.TOAST_MESSAGE_CONTENT_CLEARED);
    loadUI(null);
  });

  await setTitle(currentBuid);
  setLeftMenuTop(buids, currentBuid);
}


/* ═══════════════════════════════════════════════
   LEFT MENU — TOP (BU dropdown + category list)
═══════════════════════════════════════════════ */
async function setLeftMenuTop(buids, activeBuid) {
  // Build BU dropdown items — most-recent first
  let liHtml = '';
  for (let i = buids.length - 1; i >= 0; i--) {
    let label = buids[i] === '0' ? 'Unassigned' : buids[i];
    liHtml += `
      <li class="slds-dropdown__item" role="presentation">
        <a href="#" role="menuitem" tabindex="-1" buid="${buids[i]}" class="ck-left-split-view-buid-dropdown-li">
          <span class="slds-truncate" title="${label}">
            <svg class="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small" aria-hidden="true">
              <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#user"></use>
            </svg>
            <span>${label}</span>
          </span>
        </a>
      </li>`;
  }
  $('.ck-left-split-view-buid-dropdown-ul').html(liHtml);

  // BU dropdown toggle
  $('.ck-left-split-view-buid-dropdown').off('click').on('click', function() {
    $('.ck-left-split-view-buid-dropdown').toggleClass('slds-is-open slds-is-closed');
  });

  // BU selection
  $('.ck-left-split-view-buid-dropdown-li').on('click', async function() {
    let selectedBuid = $(this).attr('buid');
    await setCurrentBUID(selectedBuid);
    loadUI(selectedBuid);
  });

  // Category menu
  const menuItems = ['Email', 'Query Studio'];
  let menuHtml = '';
  for (let item of menuItems) {
    menuHtml += `
      <li class="slds-split-view__list-item" role="presentation">
        <a href="#" role="option"
          class="ck-left-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
          menutype="${item}" tabindex="0">
          <div class="slds-grid slds-wrap">
            <span class="slds-truncate slds-text-body_regular slds-text-color_default"
              title="${item}">${item}</span>
          </div>
        </a>
      </li>`;
  }

  let menuWrap = `<ul aria-multiselectable="true" class="slds-scrollable_y" role="listbox"
    aria-label="Select a category">${menuHtml}</ul>`;
  $('.ck-left-menu').html(menuWrap);

  $('.ck-left-menu-item').on('click', function() {
    let menuItemType = $(this).attr('menutype');
    // Phase 1.1 fix: was `currentBuid (...)` — now a proper assignment
    currentBuid = (currentBuid == null ? (buids[buids.length - 1] || '0') : currentBuid);
    setLeftSubMenu(currentBuid, menuItemType);
  });
}


/* ═══════════════════════════════════════════════
   LEFT MENU — L1 (Asset list per category)
═══════════════════════════════════════════════ */
async function setLeftSubMenu(buid, menuItemType) {
  // Phase 2: use the parameter directly — never scrape from DOM
  log('setLeftSubMenu buid:', buid, 'type:', menuItemType);

  if (!data[buid]) {
    showToastMessage(GLOBAL.TOAST.ERROR, 'No data found for Business Unit: ' + buid);
    return;
  }

  let backBtn = `
    <li class="slds-split-view__list-item" role="presentation">
      <a href="#" role="option"
        class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        tabindex="0">
        <svg class="slds-button__icon" aria-hidden="true">
          <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
        </svg>
      </a>
    </li>`;

  if (menuItemType === 'Email') {
    let emailData = data[buid]['email'] || [];
    let uniqueEmails = [], uniqueAssetIds = [];
    for (let item of emailData) {
      if (!uniqueAssetIds.includes(item.assetId)) {
        uniqueEmails.push({ assetId: item.assetId, name: item.name });
        uniqueAssetIds.push(item.assetId);
      }
    }

    let liHtml = backBtn;
    for (let email of uniqueEmails) {
      liHtml += `
        <li class="slds-split-view__list-item" role="presentation">
          <a href="#" role="option"
            class="ck-left-sub-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
            menutype="${email.assetId}" tabindex="0">
            <div class="slds-grid slds-wrap slds-grid_vertical-align-center">
              <label class="slds-checkbox slds-m-right_x-small" onclick="event.stopPropagation()">
                <input type="checkbox" class="ck-select-checkbox" data-buid="${buid}"
                  data-asset-id="${email.assetId}" data-type="email">
                <span class="slds-checkbox_faux"></span>
              </label>
              <span class="slds-truncate slds-text-body_regular slds-text-color_default"
                title="${email.name}">${email.name}</span>
            </div>
          </a>
        </li>`;
    }

    let html = buildListWrapper(liHtml);
    html += buildDeleteBar();
    $('.ck-left-menu').html(html);

    $('.ck-left-sub-menu-item-back').on('click', () => setLeftMenuTop(buids, buid));
    $('.ck-left-sub-menu-item').on('click', function() {
      let assetId = $(this).attr('menutype');
      setAuditHistoryUI(menuItemType, buid, assetId);
    });
    bindDeleteBar(buid, menuItemType);

  } else if (menuItemType === 'Query Studio') {
    // Collect from all BUs including BU '0'
    let allBuids = Object.keys(data).filter(id => id !== 'token' && id !== 'lastAccessed');
    let queryStudioData = [];
    for (let b of allBuids) {
      if (data[b] && Array.isArray(data[b].query_studio)) {
        queryStudioData = queryStudioData.concat(
          data[b].query_studio.map(q => ({ ...q, _buid: b }))
        );
      }
    }
    queryStudioData = queryStudioData.filter(item => item != null);
    // Sort newest first
    queryStudioData.sort((a, b) => b.timeStamp - a.timeStamp);

    // Search bar
    let searchHtml = `
      <li class="slds-split-view__list-item" style="padding:4px 8px;">
        <input type="text" id="ck-qs-search" class="slds-input" placeholder="Search queries…">
      </li>`;

    let liHtml = backBtn + searchHtml;
    for (let item of queryStudioData) {
      let label = item.name && item.name.trim() ? item.name : getFormattedDate(item.timeStamp);
      let favIcon = item.favourite ? '★' : '☆';
      liHtml += `
        <li class="slds-split-view__list-item ck-qs-item" role="presentation"
            data-query="${encodeURIComponent((item.body && item.body.querytext) ? item.body.querytext : '')}">
          <a href="#" role="option"
            class="ck-left-sub-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
            timeStamp="${item.timeStamp}" data-buid="${item._buid}" tabindex="0">
            <div class="slds-grid slds-wrap slds-grid_vertical-align-center">
              <label class="slds-checkbox slds-m-right_x-small" onclick="event.stopPropagation()">
                <input type="checkbox" class="ck-select-checkbox"
                  data-buid="${item._buid}" data-timestamp="${item.timeStamp}" data-type="query_studio">
                <span class="slds-checkbox_faux"></span>
              </label>
              <span class="ck-qs-fav slds-m-right_x-small" style="cursor:pointer;color:#f0a500"
                data-buid="${item._buid}" data-timestamp="${item.timeStamp}">${favIcon}</span>
              <span class="ck-qs-label slds-truncate slds-text-body_regular slds-text-color_default"
                title="${label}" data-buid="${item._buid}" data-timestamp="${item.timeStamp}">${label}</span>
            </div>
          </a>
        </li>`;
    }

    let html = buildListWrapper(liHtml);
    html += buildDeleteBar();
    $('.ck-left-menu').html(html);

    // Search filter
    $('#ck-qs-search').on('input', function() {
      let term = $(this).val().toLowerCase();
      $('.ck-qs-item').each(function() {
        let queryText = decodeURIComponent($(this).data('query') || '').toLowerCase();
        let labelText = $(this).find('.ck-qs-label').text().toLowerCase();
        $(this).toggle(queryText.includes(term) || labelText.includes(term));
      });
    });

    $('.ck-left-sub-menu-item-back').on('click', () => setLeftMenuTop(buids, buid));
    $('.ck-left-sub-menu-item').on('click', function() {
      let timeStamp = $(this).attr('timeStamp');
      showQueryStudioPreview(menuItemType, timeStamp);
    });

    // Favourite toggle
    $('.ck-qs-fav').on('click', function(e) {
      e.stopPropagation();
      let b = $(this).data('buid');
      let ts = String($(this).data('timestamp'));
      toggleFavourite(b, ts, $(this));
    });

    // Inline rename on label double-click
    $('.ck-qs-label').on('dblclick', function(e) {
      e.stopPropagation();
      let $label = $(this);
      let b = $label.data('buid');
      let ts = String($label.data('timestamp'));
      let current = $label.text();
      let $input = $('<input type="text" class="slds-input" style="font-size:12px">').val(current);
      $label.replaceWith($input);
      $input.focus().on('blur keydown', function(ev) {
        if (ev.type === 'keydown' && ev.key !== 'Enter') { return; }
        let newName = $input.val().trim();
        $input.replaceWith($('<span class="ck-qs-label slds-truncate slds-text-body_regular slds-text-color_default"></span>')
          .text(newName || current)
          .data({ buid: b, timestamp: ts })
        );
        renameQuery(b, ts, newName);
      });
    });

    bindDeleteBar(buid, menuItemType);
  }
}


/* ═══════════════════════════════════════════════
   LEFT MENU — L2 (Audit history per email)
═══════════════════════════════════════════════ */
async function setAuditHistoryUI(menuItemType, buid, assetId) {
  if (menuItemType !== 'Email') { return; }

  let emailData = (data[buid] && data[buid].email) ? data[buid].email : [];

  let backBtn = `
    <li class="slds-split-view__list-item" role="presentation">
      <a href="#" role="option"
        class="ck-left-l2-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        tabindex="0">
        <svg class="slds-button__icon" aria-hidden="true">
          <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
        </svg>
      </a>
    </li>`;

  let liHtml = backBtn;
  // Newest first
  for (let i = emailData.length - 1; i >= 0; i--) {
    let item = emailData[i];
    if (String(item.assetId) !== String(assetId)) { continue; }
    let savedTime = getFormattedDate(item.timeStamp);
    liHtml += `
      <li class="slds-split-view__list-item" role="presentation">
        <a href="#" role="option"
          class="ck-left-l2-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
          assetName="${item.name}" assetId="${item.assetId}"
          timeStamp="${item.timeStamp}" tabindex="0">
          <div class="slds-grid slds-wrap slds-grid_vertical-align-center">
            <label class="slds-checkbox slds-m-right_x-small" onclick="event.stopPropagation()">
              <input type="checkbox" class="ck-select-checkbox"
                data-buid="${buid}" data-asset-id="${item.assetId}"
                data-timestamp="${item.timeStamp}" data-type="email_version">
              <span class="slds-checkbox_faux"></span>
            </label>
            <span class="slds-truncate slds-text-body_regular slds-text-color_default"
              title="${savedTime}">${savedTime}</span>
          </div>
        </a>
      </li>`;
  }

  let html = buildListWrapper(liHtml);
  html += buildDeleteBar();
  $('.ck-left-menu').html(html);

  $('.ck-left-l2-menu-item-back').on('click', () => setLeftSubMenu(buid, menuItemType));
  $('.ck-left-l2-menu-item').on('click', function() {
    let assetName = $(this).attr('assetName');
    let aId       = $(this).attr('assetId');
    let timeStamp = $(this).attr('timeStamp');
    showEmailPreview(buid, menuItemType, assetName, aId, timeStamp);
  });
  bindDeleteBar(buid, menuItemType, assetId);
}


/* ═══════════════════════════════════════════════
   RIGHT PANEL — Email preview
═══════════════════════════════════════════════ */
function showEmailPreview(buid, menuItemType, assetName, assetId, timeStamp) {
  if (menuItemType !== 'Email') { return; }

  $('.ck-email-preview-screen').removeClass('slds-hide').addClass('slds-show');
  $('.ck-email-name').text(assetName);
  $('.ck-preview-botton-action-btn').html('Revert to this version');

  let emailData = (data[buid] && data[buid].email) ? data[buid].email : [];
  let found = false;
  for (let item of emailData) {
    if (item.timeStamp.toString() === String(timeStamp)) {
      let emailBody = JSON.parse(item.body);
      let emailHtml = compile(emailBody, 'email');

      let v = document.getElementById('ck-email-preview-body');
      let iframe = document.createElement('iframe');
      iframe.style.height = $(document).height() + 'px';
      iframe.style.width = '100%';
      v.replaceChildren(iframe);
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(emailHtml);
      iframe.contentWindow.document.close();
      found = true;
      break;
    }
  }
  if (!found) {
    $('#ck-email-preview-body').text('Email content not found for this timestamp.');
  }

  // Phase 1.4 fix: always off() before on() to prevent handler stacking
  $('.ck-revert-btn, .ck-preview-botton-action-btn')
    .attr({ assetId, assetName, timeStamp, memberId: buid })
    .off('click')
    .on('click', el => revertEmail(el));
}


/* ═══════════════════════════════════════════════
   RIGHT PANEL — Query Studio preview + runner
═══════════════════════════════════════════════ */
function showQueryStudioPreview(menuItemType, timeStamp) {
  if (menuItemType !== 'Query Studio') { return; }

  let allBuids = Object.keys(data).filter(id => id !== 'token' && id !== 'lastAccessed');
  let queryStudioData = [];
  for (let b of allBuids) {
    if (data[b] && Array.isArray(data[b].query_studio)) {
      queryStudioData = queryStudioData.concat(data[b].query_studio);
    }
  }

  let matched = queryStudioData.find(item => String(item.timeStamp) === String(timeStamp));
  if (!matched) {
    showToastMessage(GLOBAL.TOAST.ERROR, 'Query not found.');
    return;
  }

  let sqlText = (matched.body && matched.body.querytext) ? matched.body.querytext : '';
  let executedDate = getFormattedDate(matched.timeStamp);

  // Build right panel: editor (history view) + runner
  let panelHtml = `
    <div class="ck-query-runner-wrap" style="display:flex;flex-direction:column;height:100%;padding:12px;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <span class="slds-text-heading_small" style="flex:1">Query saved on: ${executedDate}</span>
        <button class="ck-run-query-btn slds-button slds-button_brand">▶ Run</button>
        <button class="ck-copy-sql-btn slds-button slds-button_neutral">Copy SQL</button>
        <a class="ck-open-qs-btn slds-button slds-button_neutral"
          href="https://querystudio.herokuapp.com" target="_blank">Open in Query Studio</a>
      </div>
      <textarea id="ck-sql-editor-ta" style="display:none"></textarea>
      <div class="ck-query-results" style="margin-top:12px;overflow:auto;flex:1;"></div>
    </div>`;

  $('.ck-email-preview-screen').removeClass('slds-hide').addClass('slds-show');
  $('.ck-revert-btn').hide();
  $('.ck-email-name').text('Query Studio');
  // Replace card body with runner panel
  $('#ck-email-preview-body').html(panelHtml);
  // Hide default footer action link
  $('.ck-preview-botton-action-btn').closest('footer').hide();

  // Init CodeMirror
  let sqlEditor = CodeMirror.fromTextArea(document.getElementById('ck-sql-editor-ta'), {
    lineNumbers: true,
    mode: 'text/x-sql',
    extraKeys: { 'Ctrl-Space': 'autocomplete' },
    autoRefresh: true,
    theme: 'twilight'
  });
  sqlEditor.setValue(sqlText);
  sqlEditor.setSize('100%', '300px');
  sqlEditor.refresh();

  // Phase 1.4 fix: off() before on()
  $('.ck-copy-sql-btn').off('click').on('click', function() {
    let sql = sqlEditor.getValue();
    navigator.clipboard.writeText(sql).then(
      () => showToastMessage(GLOBAL.TOAST.SUCCESS, GLOBAL.EMAIL.TOAST_MESSAGE_SQL_COPIED),
      () => showToastMessage(GLOBAL.TOAST.ERROR,   GLOBAL.EMAIL.TOAST_MESSAGE_SQL_COPY_ERROR)
    );
  });

  // Run query — SFMC internal API flow (replaces querystudio.herokuapp.com):
  //   1. POST /AutomationStudioFuel3/fuelapi/automation/v1/queries/   → create query activity
  //   2. POST /...queries/{id}/actions/start/                          → start execution
  //   3. GET  /...queries/{id}/actions/isrunning/  (poll)             → wait for completion
  //   4. GET  /fuelapi/data/v1/customobjectdata/key/{key}/rowset      → paginate all rows
  //   5. DELETE /...queries/{id}                                       → cleanup activity
  //
  // Auth: X-CSRF-Token + session cookies (same as email revert). No OAuth needed.
  // The target DE must be pre-created by the user and its customer key stored in
  // chrome.storage.local under the key 'sfmcQueryResultsDEKey'.
  // If no DE key is configured, the runner prompts the user to set one up.
  $('.ck-run-query-btn').off('click').on('click', async function() {
    let sql = sqlEditor.getValue().trim();
    if (!sql) {
      showToastMessage(GLOBAL.TOAST.ERROR, 'Please enter a SQL query.');
      return;
    }

    let $btn     = $(this);
    let $results = $('.ck-query-results');

    const MAX_POLLS = 72;   // ~6 min at 5 s intervals
    const POLL_MS   = 5000;

    function setStatus(msg) {
      $results.html(`<p style="color:#888;font-style:italic">${escapeHtml(msg)}</p>`);
    }

    $btn.prop('disabled', true).text('Preparing…');

    // Declared outside try so finally can reference them for cleanup
    let queryId  = null;
    let tempDeId = null;
    const tempDeKey  = generateUUID();
    const tempDeName = 'sfmc_ext_' + Date.now();
    let AS_BASE   = null;
    let DATA_BASE = null;
    let JSON_HDRS = null;

    try {
      // ── Resolve base URL and CSRF token ───────────────────────────
      let csrfToken = await getcsrfToken(setStatus).catch(() => null);
      if (!csrfToken) {
        throw new Error(GLOBAL.EMAIL.TOAST_MESSAGE_INVALID_TOKEN);
      }

      let instanceBase = await getSfmcInstanceBase();
      if (!instanceBase) {
        throw new Error('Cannot determine SFMC instance URL. Please save an email or SQL query in SFMC first so the extension can detect your instance.');
      }

      AS_BASE   = instanceBase + '/AutomationStudioFuel3/fuelapi/automation/v1/queries';
      DATA_BASE = instanceBase + '/fuelapi/data/v1/customobjectdata';
      JSON_HDRS = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken };

      // ── Step 0: Build and create a temporary results DE ───────────
      // Analyse the SQL to determine output column names and types, then
      // POST to /fuelapi/data/v1/customobjectdata/ with the inferred schema.
      // If DE creation is unavailable, fall back to a pre-configured DE key.
      setStatus('Analysing query schema…');
      $btn.text('Preparing…');
      let deKey;
      try {
        let deFields = await buildTempDEFields(sql, instanceBase, JSON_HDRS);
        setStatus('Creating temporary results DE…');
        const createDERes = await fetch(DATA_BASE + '/', {
          method: 'POST',
          headers: JSON_HDRS,
          credentials: 'include',
          body: JSON.stringify({ name: tempDeName, customerKey: tempDeKey, fields: deFields })
        });
        if (!createDERes.ok) {
          throw new Error('HTTP ' + createDERes.status + ' — ' + await createDERes.text().catch(() => ''));
        }
        const createDEBody = await createDERes.json();
        // Save the internal ID for cleanup; fall back to customerKey
        tempDeId = createDEBody.id || createDEBody.objectID || tempDeKey;
        deKey    = tempDeKey;
        log('Temp DE created:', tempDeName, 'key:', tempDeKey, 'id:', tempDeId);
      } catch (deErr) {
        log('Temp DE creation failed:', deErr.message, '— trying pre-configured DE key');
        deKey = await new Promise(r =>
          chrome.storage.local.get('sfmcQueryResultsDEKey', d => r(d.sfmcQueryResultsDEKey || null))
        );
        if (!deKey) {
          $results.html(`
            <div style="padding:16px;">
              <p><strong>Automatic DE creation failed.</strong></p>
              <p>Please create a Data Extension in SFMC manually and paste its
              <strong>Customer Key</strong> below as a one-time fallback.</p>
              <div style="display:flex;gap:8px;margin-top:8px;">
                <input id="ck-de-key-input" class="slds-input" placeholder="DE Customer Key" style="flex:1">
                <button id="ck-de-key-save" class="slds-button slds-button_brand">Save &amp; Run</button>
              </div>
              <p style="color:#888;font-size:11px;margin-top:6px">
                Error: ${escapeHtml(deErr.message)}</p>
            </div>`);
          $btn.prop('disabled', false).text('▶ Run');
          $('#ck-de-key-save').on('click', async function() {
            let k = $('#ck-de-key-input').val().trim();
            if (!k) { return; }
            await new Promise(r => chrome.storage.local.set({ sfmcQueryResultsDEKey: k }, r));
            showToastMessage(GLOBAL.TOAST.SUCCESS, 'DE key saved. Click ▶ Run again.');
          });
          return; // finally still runs, but queryId/tempDeId are null → no-op cleanup
        }
        setStatus('Using pre-configured results DE…');
      }

      // ── Step 1: Create a temporary query activity ─────────────────
      setStatus('Creating query activity…');
      $btn.text('Creating…');
      const activityName = 'sfmc_ext_' + Date.now();
      const createQRes = await fetch(AS_BASE + '/', {
        method: 'POST',
        headers: JSON_HDRS,
        credentials: 'include',
        body: JSON.stringify({
          name: activityName,
          key: generateUUID(),
          description: 'Temporary — created by SFMC Revert Changes extension. Safe to delete.',
          queryText: sql,
          targetName: deKey,
          targetKey:  deKey,
          targetUpdateTypeId:   0,
          targetUpdateTypeName: 'Overwrite',
          categoryId: 0
        })
      });
      if (!createQRes.ok) {
        const errText = await createQRes.text().catch(() => '');
        throw new Error('Failed to create query activity (HTTP ' + createQRes.status + '). ' + errText);
      }
      const createQBody = await createQRes.json();
      queryId = createQBody.queryDefinitionId || createQBody.queryDefinitionID || createQBody.id;
      if (!queryId) {
        throw new Error('Query activity created but no ID in response: ' + JSON.stringify(createQBody));
      }

      // ── Step 2: Start execution ────────────────────────────────────
      setStatus('Starting query execution…');
      $btn.text('Starting…');
      const startRes = await fetch(AS_BASE + '/' + queryId + '/actions/start/', {
        method: 'POST', headers: JSON_HDRS, credentials: 'include'
      });
      if (!startRes.ok) {
        throw new Error('Failed to start query (HTTP ' + startRes.status + ')');
      }

      // ── Step 3: Poll until complete ────────────────────────────────
      $btn.text('Running…');
      let polls = 0, isRunning = true;
      while (isRunning) {
        if (polls >= MAX_POLLS) {
          throw new Error('Query timed out after ' + (MAX_POLLS * POLL_MS / 1000) + 's.');
        }
        await new Promise(r => setTimeout(r, POLL_MS));
        polls++;
        setStatus('Running… (' + (polls * POLL_MS / 1000) + 's elapsed)');
        const pollRes = await fetch(AS_BASE + '/' + queryId + '/actions/isrunning/', {
          method: 'GET', headers: JSON_HDRS, credentials: 'include'
        });
        if (!pollRes.ok) { throw new Error('Status check failed (HTTP ' + pollRes.status + ')'); }
        const pollData = await pollRes.json();
        isRunning = pollData.isRunning ?? pollData.isrunning ?? false;
      }

      // ── Step 4: Paginate all rows from the results DE ─────────────
      $btn.text('Fetching…');
      setStatus('Query complete — fetching results…');
      let allRows = [];
      let page    = 1;
      const PAGE_SIZE = 2500;
      while (true) {
        const rowsRes = await fetch(
          DATA_BASE + '/key/' + deKey + '/rowset?$pageSize=' + PAGE_SIZE + '&$page=' + page,
          { method: 'GET', headers: JSON_HDRS, credentials: 'include' }
        );
        if (!rowsRes.ok) {
          throw new Error('Failed to fetch results page ' + page + ' (HTTP ' + rowsRes.status + ')');
        }
        const rowsData = await rowsRes.json();
        const items = rowsData.items || [];
        allRows = allRows.concat(items);
        if (items.length < PAGE_SIZE) { break; }
        page++;
      }

      // ── Render results as an SLDS data table ──────────────────────
      if (allRows.length === 0) {
        $results.html('<p style="color:#888">Query returned no rows.</p>');
      } else {
        const resCols = Object.keys(allRows[0].values || {});
        const thead = '<tr>' + resCols.map(c =>
          `<th class="slds-text-title_caps" scope="col" style="white-space:nowrap">${escapeHtml(c)}</th>`
        ).join('') + '</tr>';
        const tbody = allRows.map(row => {
          const vals = row.values || {};
          return '<tr>' + resCols.map(c =>
            `<td>${escapeHtml(vals[c] == null ? '' : String(vals[c]))}</td>`
          ).join('') + '</tr>';
        }).join('');
        $results.html(`
          <p style="color:#888;margin-bottom:6px">${allRows.length.toLocaleString()} row(s) returned</p>
          <div style="overflow:auto;">
            <table class="slds-table slds-table_cell-buffer slds-table_bordered slds-table_striped" style="font-size:12px">
              <thead>${thead}</thead>
              <tbody>${tbody}</tbody>
            </table>
          </div>`);
      }

    } catch (e) {
      $results.html('<p style="color:#c23934"><strong>Error:</strong> ' + escapeHtml(e.message) + '</p>');
    } finally {
      $btn.prop('disabled', false).text('▶ Run');
      // Fire-and-forget cleanup — always runs, even on error or early return
      if (queryId  && AS_BASE   && JSON_HDRS) {
        fetch(AS_BASE   + '/' + queryId,  { method: 'DELETE', headers: JSON_HDRS, credentials: 'include' }).catch(() => {});
      }
      if (tempDeId && DATA_BASE && JSON_HDRS) {
        fetch(DATA_BASE + '/' + tempDeId, { method: 'DELETE', headers: JSON_HDRS, credentials: 'include' }).catch(() => {});
      }
    }
  });
}


/* ═══════════════════════════════════════════════
   REVERT EMAIL
═══════════════════════════════════════════════ */
async function revertEmail(el) {
  let buid      = $(el.target).attr('memberid') || $(el.target).attr('memberId');
  let timeStamp = $(el.target).attr('timeStamp');

  let items = await new Promise(resolve =>
    chrome.storage.local.get(buid, resolve)
  );

  if (!items[buid] || !Array.isArray(items[buid].email)) {
    showToastMessage(GLOBAL.TOAST.ERROR, 'Could not find saved data for this BU.');
    return;
  }

  let emailArr = items[buid].email;
  for (let i = 0; i < emailArr.length; i++) {
    if (emailArr[i].timeStamp.toString() !== String(timeStamp)) { continue; }

    let url  = emailArr[i].url;
    let body = emailArr[i].body;

    let csrfToken = await getcsrfToken(log).catch(() => null);
    if (!csrfToken) {
      showToastMessage(GLOBAL.TOAST.ERROR, GLOBAL.EMAIL.TOAST_MESSAGE_INVALID_TOKEN);
      return;
    }

    let requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        credentials: 'same-origin',
        'X-CSRF-Token': csrfToken
      },
      body: body
    };

    try {
      let response = await fetch(sanitizeEmailPutURL(url), requestOptions);
      let resData  = await response.json();
      if (response.status >= 200 && response.status < 400) {
        showToastMessage(GLOBAL.TOAST.SUCCESS, GLOBAL.EMAIL.TOAST_MESSAGE_EMAIL_REVERTED);
      } else {
        showToastMessage(GLOBAL.TOAST.ERROR, 'Error reverting email (status ' + response.status + ').');
      }
    } catch (e) {
      showToastMessage(GLOBAL.TOAST.ERROR, GLOBAL.EMAIL.TOAST_MESSAGE_INVALID_FETCH);
    }
    break;
  }
}


/* ═══════════════════════════════════════════════
   SELECTIVE DELETE
═══════════════════════════════════════════════ */
function buildListWrapper(liHtml) {
  return `<ul aria-multiselectable="true" class="slds-scrollable_y" role="listbox"
    aria-label="Select an item" style="flex:1;overflow-y:auto;">${liHtml}</ul>`;
}

// Phase 3.1: sticky delete bar at the bottom
function buildDeleteBar() {
  return `
    <div class="ck-delete-bar" style="padding:6px 8px;border-top:1px solid #dddbda;background:#fff;flex-shrink:0;">
      <button class="ck-delete-selected-btn slds-button slds-button_destructive" style="width:100%" disabled>
        Delete Selected
      </button>
    </div>`;
}

function bindDeleteBar(buid, menuItemType, assetId) {
  // Enable/disable delete button based on checkbox state
  $(document).off('change.ck-checkbox').on('change.ck-checkbox', '.ck-select-checkbox', function() {
    let anyChecked = $('.ck-select-checkbox:checked').length > 0;
    $('.ck-delete-selected-btn').prop('disabled', !anyChecked);
  });

  $('.ck-delete-selected-btn').off('click').on('click', async function() {
    let checked = $('.ck-select-checkbox:checked');
    if (checked.length === 0) { return; }

    if (!confirm('Delete ' + checked.length + ' selected item(s)?')) { return; }

    // Group deletions by type and buid
    let toDelete = { email_version: [], email_asset: [], query_studio: [] };
    checked.each(function() {
      let type = $(this).data('type');
      let b    = String($(this).data('buid'));
      let ts   = $(this).data('timestamp') ? String($(this).data('timestamp')) : null;
      let aid  = $(this).data('asset-id') ? String($(this).data('asset-id')) : null;
      if (type === 'email_version') {
        toDelete.email_version.push({ buid: b, assetId: aid, timeStamp: ts });
      } else if (type === 'email') {
        toDelete.email_asset.push({ buid: b, assetId: aid });
      } else if (type === 'query_studio') {
        toDelete.query_studio.push({ buid: b, timeStamp: ts });
      }
    });

    let allData = await getData();

    // Delete specific email versions
    for (let d of toDelete.email_version) {
      if (allData[d.buid] && Array.isArray(allData[d.buid].email)) {
        allData[d.buid].email = allData[d.buid].email.filter(
          e => e.timeStamp.toString() !== d.timeStamp
        );
      }
    }
    // Delete all versions of an email asset
    for (let d of toDelete.email_asset) {
      if (allData[d.buid] && Array.isArray(allData[d.buid].email)) {
        allData[d.buid].email = allData[d.buid].email.filter(
          e => String(e.assetId) !== d.assetId
        );
      }
    }
    // Delete query studio entries
    for (let d of toDelete.query_studio) {
      if (allData[d.buid] && Array.isArray(allData[d.buid].query_studio)) {
        allData[d.buid].query_studio = allData[d.buid].query_studio.filter(
          q => String(q.timeStamp) !== d.timeStamp
        );
      }
    }

    // Write back — must set each BU key individually
    await new Promise(resolve => chrome.storage.local.set(allData, resolve));

    showToastMessage(GLOBAL.TOAST.SUCCESS, GLOBAL.EMAIL.TOAST_MESSAGE_DELETED);
    // Reload the same view
    if (menuItemType === 'Email' && assetId) {
      data = await getData();
      setAuditHistoryUI(menuItemType, buid, assetId);
    } else {
      loadUI(buid);
    }
  });
}


/* ═══════════════════════════════════════════════
   QUERY HELPERS (favourites, rename)
═══════════════════════════════════════════════ */
async function toggleFavourite(buid, timeStamp, $el) {
  let allData = await getData();
  if (!allData[buid] || !Array.isArray(allData[buid].query_studio)) { return; }
  let qs = allData[buid].query_studio;
  for (let i = 0; i < qs.length; i++) {
    if (String(qs[i].timeStamp) === timeStamp) {
      qs[i].favourite = !qs[i].favourite;
      $el.text(qs[i].favourite ? '★' : '☆');
      break;
    }
  }
  await new Promise(resolve => chrome.storage.local.set(allData, resolve));
}

async function renameQuery(buid, timeStamp, newName) {
  let allData = await getData();
  if (!allData[buid] || !Array.isArray(allData[buid].query_studio)) { return; }
  for (let i = 0; i < allData[buid].query_studio.length; i++) {
    if (String(allData[buid].query_studio[i].timeStamp) === timeStamp) {
      allData[buid].query_studio[i].name = newName;
      break;
    }
  }
  await new Promise(resolve => chrome.storage.local.set(allData, resolve));
}


/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function showToastMessage(toastType, message) {
  // Phase 1.8: escape message to prevent accidental HTML injection
  let toastDiv = `
    <div class="ck-toast-message-main slds-notify_container slds-is-relative">
      <div class="slds-notify slds-notify_toast slds-theme_${toastType}" role="status">
        <span class="slds-assistive-text">${toastType}</span>
        <div class="slds-notify__content">
          <h2 class="slds-text-heading_small">${escapeHtml(message)}</h2>
        </div>
        <div class="slds-notify__close">
          <button class="ck-toast-message-close-btn slds-button slds-button_icon slds-button_icon-inverse" title="Close">
            <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
              <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#close"></use>
            </svg>
            <span class="slds-assistive-text">Close</span>
          </button>
        </div>
      </div>
    </div>`;

  $('.ck-toast-message-main').remove();

  if ($('.slds-grid.slds-einstein-header.slds-card__header').is(':visible')) {
    $('.slds-grid.slds-einstein-header.slds-card__header').prepend(toastDiv);
  } else {
    $('.ck-email-toast-div').removeClass('slds-hide').addClass('slds-show').prepend(toastDiv);
  }

  $('.ck-toast-message-close-btn').off('click').on('click', function() {
    $('.ck-toast-message-main').remove();
  });

  $('.ck-toast-message-main').delay(GLOBAL.EMAIL.TOAST_DURATION).fadeOut('slow');
}


/* ═══════════════════════════════════════════════
   CHROME STORAGE HELPERS
═══════════════════════════════════════════════ */
async function getData() {
  return new Promise(resolve =>
    chrome.storage.local.get(null, resolve)
  );
}

function getBuids(d) {
  const CONFIG_KEYS = new Set(['token', 'lastAccessed', 'sfmcQueryResultsDEKey', SFMC_SELECTED_STACK_KEY]);
  return Object.keys(d).filter(id => !CONFIG_KEYS.has(id));
}

async function setCurrentBUID(buid) {
  return new Promise(resolve => {
    let lastAccessedBU = { lastAccessed: { buid: buid, time: new Date().valueOf() } };
    chrome.storage.local.set(lastAccessedBU, () => resolve(true));
  });
}

async function getCurrentBUID() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('lastAccessed', function(item) {
      if (item.lastAccessed && item.lastAccessed.buid) {
        resolve(item.lastAccessed.buid);
      } else {
        reject(false);
      }
    });
  });
}

async function setTitle(buid) {
  let label = buid === '0' ? 'Unassigned' : (buid || 'No data');
  $('.ck-buid-title').text('  ' + label + '  ');
}

// Walks through known SFMC stacks (previously used stack first) and fetches
// update-token.json with session cookies to obtain a fresh CSRF token.
// onStatus(msg): optional progress callback shown to the user.
// Returns the new token string, or null if all stacks fail.
async function tryRefreshCsrfToken(onStatus) {
  onStatus = onStatus || log;

  const stored = await new Promise(r =>
    chrome.storage.local.get(SFMC_SELECTED_STACK_KEY, d => r(d[SFMC_SELECTED_STACK_KEY] || null))
  );
  const stacksToTry = stored
    ? [stored, ...SFMC_STACK_IDS.filter(s => s !== stored)]
    : SFMC_STACK_IDS;

  for (const stackId of stacksToTry) {
    try {
      onStatus('Connecting to SFMC (stack ' + stackId + ')…');
      const res = await fetch(
        'https://mc.' + stackId + '.marketingcloudapps.com/AutomationStudioFuel3/update-token.json',
        { credentials: 'include' }
      );
      if (res.status !== 200) { continue; }

      // Remember the working stack for future calls
      await new Promise(r => chrome.storage.local.set({ [SFMC_SELECTED_STACK_KEY]: stackId }, r));

      // Extract CSRF token — try response header first, then JSON body
      let token = res.headers.get('X-CSRF-Token');
      if (!token) {
        try {
          const body = await res.json();
          token = body['X-CSRF-Token'] || body['csrfToken'] || body['token'] || body['csrf'] || null;
        } catch (_) {}
      }
      if (!token) { continue; } // 200 but no token in response — try next stack

      // Persist the fresh token under the current BU
      if (currentBuid) {
        const buItem = await new Promise(r => chrome.storage.local.get(currentBuid, r));
        if (!buItem[currentBuid]) { buItem[currentBuid] = {}; }
        buItem[currentBuid].token = { 'X-CSRF-Token': token, createdDate: Date.now() };
        await new Promise(r => chrome.storage.local.set({ [currentBuid]: buItem[currentBuid] }, r));
      }
      onStatus('CSRF token refreshed via stack ' + stackId);
      return token;
    } catch (_) {
      // Network error or CORS — try next stack
    }
  }

  onStatus('Unable to refresh token. Please open Automation Studio in SFMC.');
  return null;
}

async function getcsrfToken(onStatus) {
  const item = await new Promise(r => chrome.storage.local.get(currentBuid, r));
  const t = item[currentBuid] && item[currentBuid].token;

  if (t && t['X-CSRF-Token'] && t['createdDate']) {
    const ageMinutes = (Date.now() - t.createdDate) / 60000;
    if (ageMinutes < allowedTokenAge) {
      return t['X-CSRF-Token'];
    }
  }

  // Token missing or stale — attempt auto-refresh by probing known stacks
  const freshToken = await tryRefreshCsrfToken(onStatus);
  if (freshToken) { return freshToken; }

  throw new Error('no_token');
}


/* ═══════════════════════════════════════════════
   UTILITY FUNCTIONS
═══════════════════════════════════════════════ */
function getFormattedDate(timeStamp) {
  let d = new Date(timeStamp);
  // Phase 1.3 fix: use d.getSeconds() not d.getHours() for the seconds slot
  let pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function sanitizeEmailPutURL(url) {
  let t = new URL(url);
  t.search = '';
  return t.toString();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Returns the SFMC stack ID (e.g. 's50') from any SFMC hostname by matching
// each dot-separated part against the known SFMC_STACK_IDS list.
function extractStackFromUrl(url) {
  try {
    const parts = new URL(url).hostname.split('.');
    for (const p of parts) {
      if (SFMC_STACK_IDS.includes(p)) { return p; }
    }
  } catch (_) {}
  return null;
}

// Always returns 'https://mc.{stack}.marketingcloudapps.com' — the canonical
// mc. subdomain — regardless of what subdomain the stored URL used
// (e.g. content-builder.s50 → mc.s50).
async function getSfmcInstanceBase() {
  const d = await getData();
  const CONFIG_KEYS = new Set(['token', 'lastAccessed', 'sfmcQueryResultsDEKey', SFMC_SELECTED_STACK_KEY]);

  // Fastest path: tryRefreshCsrfToken already confirmed the stack
  if (d[SFMC_SELECTED_STACK_KEY]) {
    return 'https://mc.' + d[SFMC_SELECTED_STACK_KEY] + '.marketingcloudapps.com';
  }

  // Fall back: scan stored email / automation-studio URLs, extract stack ID
  for (const b of Object.keys(d).filter(k => !CONFIG_KEYS.has(k))) {
    const candidates = [
      ...((d[b] && d[b].email)            ? d[b].email.map(e => e.url)            : []),
      ...((d[b] && d[b].automation_studio) ? d[b].automation_studio.map(a => a.url) : []),
    ].filter(Boolean);
    for (const url of candidates) {
      const stack = extractStackFromUrl(url);
      if (stack) { return 'https://mc.' + stack + '.marketingcloudapps.com'; }
    }
  }
  return null;
}

// RFC 4122 v4 UUID — used as the query activity external key
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}


/* ═══════════════════════════════════════════════
   DATA VIEW SCHEMAS
   Column types/lengths sourced from dataviews.io (Zuzanna Jarczyńska).
   Keys are UPPERCASE for case-insensitive lookup.
   SMTPBounceReason is nvarchar(max) in the data view but DE max is 4000.
═══════════════════════════════════════════════ */
const DATA_VIEW_SCHEMAS = {
  '_SUBSCRIBERS': [
    { name: 'SubscriberID',       type: 'Number'  },
    { name: 'SubscriberKey',      type: 'Text',   length: 254  },
    { name: 'DateUndeliverable',  type: 'Date'    },
    { name: 'DateJoined',         type: 'Date'    },
    { name: 'DateUnsubscribed',   type: 'Date'    },
    { name: 'Domain',             type: 'Text',   length: 254  },
    { name: 'EmailAddress',       type: 'Text',   length: 254  },
    { name: 'BounceCount',        type: 'Number'  },
    { name: 'SubscriberType',     type: 'Text',   length: 100  },
    { name: 'Status',             type: 'Text',   length: 50   },
    { name: 'Locale',             type: 'Text',   length: 50   },
  ],
  '_SENT': [
    { name: 'AccountID',          type: 'Number'  },
    { name: 'OYBAccountID',       type: 'Number'  },
    { name: 'JobID',              type: 'Number'  },
    { name: 'ListID',             type: 'Number'  },
    { name: 'BatchID',            type: 'Number'  },
    { name: 'SubscriberID',       type: 'Number'  },
    { name: 'SubscriberKey',      type: 'Text',   length: 254  },
    { name: 'EventDate',          type: 'Date'    },
    { name: 'Domain',             type: 'Text',   length: 254  },
    { name: 'TriggererSendDefinitionObjectID', type: 'Text', length: 254 },
    { name: 'TriggeredSendCustomerKey',        type: 'Text', length: 254 },
  ],
  '_OPEN': [
    { name: 'AccountID',          type: 'Number'  },
    { name: 'OYBAccountID',       type: 'Number'  },
    { name: 'JobID',              type: 'Number'  },
    { name: 'ListID',             type: 'Number'  },
    { name: 'BatchID',            type: 'Number'  },
    { name: 'SubscriberID',       type: 'Number'  },
    { name: 'SubscriberKey',      type: 'Text',   length: 254  },
    { name: 'EventDate',          type: 'Date'    },
    { name: 'IsUnique',           type: 'Boolean' },
    { name: 'Domain',             type: 'Text',   length: 254  },
    { name: 'TriggererSendDefinitionObjectID', type: 'Text', length: 254 },
    { name: 'TriggeredSendCustomerKey',        type: 'Text', length: 254 },
  ],
  '_CLICK': [
    { name: 'AccountID',          type: 'Number'  },
    { name: 'OYBAccountID',       type: 'Number'  },
    { name: 'JobID',              type: 'Number'  },
    { name: 'ListID',             type: 'Number'  },
    { name: 'BatchID',            type: 'Number'  },
    { name: 'SubscriberID',       type: 'Number'  },
    { name: 'SubscriberKey',      type: 'Text',   length: 254  },
    { name: 'EventDate',          type: 'Date'    },
    { name: 'Domain',             type: 'Text',   length: 254  },
    { name: 'URL',                type: 'Text',   length: 4000 },
    { name: 'LinkName',           type: 'Text',   length: 500  },
    { name: 'LinkContent',        type: 'Text',   length: 4000 },
    { name: 'IsUnique',           type: 'Boolean' },
    { name: 'TriggererSendDefinitionObjectID', type: 'Text', length: 254 },
    { name: 'TriggeredSendCustomerKey',        type: 'Text', length: 254 },
  ],
  '_BOUNCE': [
    { name: 'AccountID',           type: 'Number'  },
    { name: 'OYBAccountID',        type: 'Number'  },
    { name: 'JobID',               type: 'Number'  },
    { name: 'ListID',              type: 'Number'  },
    { name: 'BatchID',             type: 'Number'  },
    { name: 'SubscriberID',        type: 'Number'  },
    { name: 'SubscriberKey',       type: 'Text',   length: 254  },
    { name: 'EventDate',           type: 'Date'    },
    { name: 'IsUnique',            type: 'Boolean' },
    { name: 'Domain',              type: 'Text',   length: 254  },
    { name: 'BounceCategoryID',    type: 'Number'  },
    { name: 'BounceCategory',      type: 'Text',   length: 100  },
    { name: 'BounceSubcategoryID', type: 'Number'  },
    { name: 'BounceSubcategory',   type: 'Text',   length: 100  },
    { name: 'BounceTypeID',        type: 'Number'  },
    { name: 'BounceType',          type: 'Text',   length: 100  },
    { name: 'SMTPBounceReason',    type: 'Text',   length: 4000 },
    { name: 'SMTPMessage',         type: 'Text',   length: 4000 },
    { name: 'SMTPCode',            type: 'Text',   length: 50   },
    { name: 'TriggererSendDefinitionObjectID', type: 'Text', length: 254 },
    { name: 'TriggeredSendCustomerKey',        type: 'Text', length: 254 },
    { name: 'IsFalseBounce',       type: 'Boolean' },
  ],
  '_UNSUBSCRIBE': [
    { name: 'AccountID',           type: 'Number'  },
    { name: 'OYBAccountID',        type: 'Number'  },
    { name: 'JobID',               type: 'Number'  },
    { name: 'ListID',              type: 'Number'  },
    { name: 'BatchID',             type: 'Number'  },
    { name: 'SubscriberID',        type: 'Number'  },
    { name: 'SubscriberKey',       type: 'Text',   length: 254  },
    { name: 'EventDate',           type: 'Date'    },
    { name: 'IsUnique',            type: 'Boolean' },
    { name: 'Domain',              type: 'Text',   length: 254  },
    { name: 'TriggererSendDefinitionObjectID', type: 'Text', length: 254 },
    { name: 'TriggeredSendCustomerKey',        type: 'Text', length: 254 },
  ],
  '_COMPLAINT': [
    { name: 'AccountID',           type: 'Number'  },
    { name: 'OYBAccountID',        type: 'Number'  },
    { name: 'JobID',               type: 'Number'  },
    { name: 'ListID',              type: 'Number'  },
    { name: 'BatchID',             type: 'Number'  },
    { name: 'SubscriberID',        type: 'Number'  },
    { name: 'SubscriberKey',       type: 'Text',   length: 254  },
    { name: 'EventDate',           type: 'Date'    },
    { name: 'Domain',              type: 'Text',   length: 254  },
    { name: 'TriggererSendDefinitionObjectID', type: 'Text', length: 254 },
    { name: 'TriggeredSendCustomerKey',        type: 'Text', length: 254 },
  ],
};


/* ═══════════════════════════════════════════════
   SQL PARSING + TEMP DE SCHEMA HELPERS
═══════════════════════════════════════════════ */

// Parse FROM/JOIN table references from a SQL string.
// Returns [{ name, alias }] where alias is the query-level table alias.
function parseQuerySources(sql) {
  const cleaned = sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const sources = [];
  // Matches: FROM/JOIN [Ent.][bracketed-or-plain name] [AS] [alias]
  const re = /\b(?:FROM|JOIN)\s+(?:Ent\.)?(?:\[([^\]]+)\]|([a-zA-Z_#][a-zA-Z0-9_]*))\s*(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)?/gi;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    const name  = (m[1] || m[2]).trim();
    const raw   = m[3] ? m[3].trim() : '';
    // Reject SQL keyword tokens that the regex incorrectly captured as aliases
    const alias = (raw && !/^(WHERE|ON|SET|INTO|GROUP|ORDER|HAVING|SELECT|LEFT|RIGHT|INNER|OUTER|CROSS|FULL)$/i.test(raw))
      ? raw : name;
    sources.push({ name, alias });
  }
  return sources;
}

// Parse the SELECT column list.
// Returns [{ outputName, sourceTable, sourceCol, expression }].
// outputName is the column alias; sourceTable/sourceCol are null for expressions.
function parseSelectColumns(sql) {
  const cleaned = sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const m = cleaned.match(/\bSELECT\b\s+(?:DISTINCT\s+)?(?:TOP\s+\d+\s+)?([\s\S]+?)\s+\bFROM\b/i);
  if (!m) { return []; }
  const selectClause = m[1].trim();
  if (selectClause === '*') {
    return [{ outputName: '*', sourceTable: null, sourceCol: '*', expression: '*' }];
  }

  // Split by comma respecting parenthesis depth
  const rawCols = [];
  let depth = 0, cur = '';
  for (const ch of selectClause) {
    if      (ch === '(' ) { depth++; cur += ch; }
    else if (ch === ')' ) { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { rawCols.push(cur.trim()); cur = ''; }
    else                  { cur += ch; }
  }
  if (cur.trim()) { rawCols.push(cur.trim()); }

  return rawCols.map(col => {
    // col AS alias
    const asM = col.match(/^([\s\S]+?)\s+AS\s+\[?([a-zA-Z_][a-zA-Z0-9_]*)\]?\s*$/i);
    if (asM) {
      const expr = asM[1].trim();
      const alias = asM[2].trim();
      const dotM  = expr.match(/^\[?([a-zA-Z_][a-zA-Z0-9_]*)\]?\.\[?([a-zA-Z_][a-zA-Z0-9_]*)\]?$/);
      return { outputName: alias, sourceTable: dotM ? dotM[1] : null,
               sourceCol: dotM ? dotM[2] : null, expression: expr };
    }
    // table.col  or  col  (no alias)
    const dotM = col.match(/^\[?([a-zA-Z_][a-zA-Z0-9_]*)\]?\.\[?([a-zA-Z_][a-zA-Z0-9_]*)\]?$/);
    if (dotM) {
      return { outputName: dotM[2], sourceTable: dotM[1], sourceCol: dotM[2], expression: col };
    }
    // Bare column name
    const bareM = col.match(/^\[?([a-zA-Z_][a-zA-Z0-9_]*)\]?$/);
    if (bareM) {
      return { outputName: bareM[1], sourceTable: null, sourceCol: bareM[1], expression: col };
    }
    // Complex expression with no alias — name will be derived by caller
    return { outputName: null, sourceTable: null, sourceCol: null, expression: col };
  });
}

// Infer the SFMC DE field type for one SELECT column given the loaded schema map.
// schemas: { ALIAS_UPPER → [{ name, type, length }, ...] }
function inferFieldType(colDesc, schemas) {
  const { sourceTable, sourceCol, expression } = colDesc;

  // Aggregate functions → Number
  if (/^\s*(COUNT|SUM|AVG|MIN|MAX|STDEV|VAR)\s*\(/i.test(expression)) {
    return { type: 'Number' };
  }
  // Date-producing expressions
  if (/\b(GETDATE|GETUTCDATE|CONVERT\s*\(\s*(DATE|DATETIME|SMALLDATETIME))\b/i.test(expression)) {
    return { type: 'Date' };
  }

  // Simple column reference — look up in loaded schemas
  if (sourceCol) {
    const schemasToSearch = sourceTable
      ? [schemas[sourceTable.toUpperCase()]].filter(Boolean)
      : Object.values(schemas);
    for (const schema of schemasToSearch) {
      const fd = schema.find(f => f.name.toUpperCase() === sourceCol.toUpperCase());
      if (fd) { return { type: fd.type, length: fd.length }; }
    }
  }
  return { type: 'Text', length: 500 };
}

// Try to fetch a user DE's field definitions from the internal SFMC FuelAPI.
// Tries two candidate URL patterns; returns [{ name, type, length }] or null.
async function getDEFieldsByName(deName, instanceBase, headers) {
  const safe = deName.replace(/'/g, "''");
  const urls = [
    instanceBase + '/fuelapi/data/v1/customobjectdata/name/' + encodeURIComponent(deName),
    instanceBase + '/fuelapi/data/v1/customobjectdata?$filter=name eq \'' + safe + '\'',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
      if (!res.ok) { continue; }
      const body = await res.json();
      const obj  = Array.isArray(body) ? body[0] : (body.items ? body.items[0] : body);
      if (obj && Array.isArray(obj.fields)) {
        return obj.fields.map(f => ({
          name:   f.name,
          type:   f.type     || 'Text',
          length: f.maxLength || f.length || 500,
        }));
      }
    } catch (_) {}
  }
  return null;
}

// Build the field list for a temporary results DE by analysing the SQL query.
// Looks up data view schemas from DATA_VIEW_SCHEMAS and user DE schemas via API.
// Falls back to Text(500) for any column it cannot resolve.
async function buildTempDEFields(sql, instanceBase, headers) {
  const sources = parseQuerySources(sql);
  const cols    = parseSelectColumns(sql);

  // Populate schema cache: { ALIAS_UPPER → fieldArray }
  const schemas = {};
  for (const src of sources) {
    const normName = src.name.replace(/^\[|\]$/g, '');
    const key      = normName.toUpperCase();
    if (DATA_VIEW_SCHEMAS[key]) {
      schemas[src.alias.toUpperCase()] = DATA_VIEW_SCHEMAS[key];
      schemas[key]                     = DATA_VIEW_SCHEMAS[key];
    } else if (!normName.startsWith('_')) {
      // User DE — try API lookup (best-effort)
      const fetched = await getDEFieldsByName(normName, instanceBase, headers).catch(() => null);
      if (fetched) {
        schemas[src.alias.toUpperCase()] = fetched;
        schemas[key]                     = fetched;
      }
    }
  }

  // SELECT * — expand from the first source table's schema
  if (cols.length === 1 && cols[0].sourceCol === '*') {
    const first  = sources[0];
    const schema = first && (schemas[first.alias.toUpperCase()] || schemas[first.name.toUpperCase()]);
    if (schema) {
      const fields = schema.map(f => ({
        name: f.name, type: f.type,
        length: f.type === 'Text' ? (f.length || 500) : undefined,
        isPrimaryKey: false, isNullable: true,
      }));
      const skIdx = fields.findIndex(f => f.name.toUpperCase() === 'SUBSCRIBERKEY');
      const pkIdx = skIdx >= 0 ? skIdx : 0;
      fields[pkIdx].isPrimaryKey = true;
      fields[pkIdx].isNullable   = false;
      return fields;
    }
    return [{ name: 'Result', type: 'Text', length: 4000, isPrimaryKey: true, isNullable: false }];
  }

  // Named column list
  const fields = [];
  for (const col of cols) {
    const name = col.outputName || ('col_' + (fields.length + 1));
    const { type, length } = inferFieldType(col, schemas);
    const fd = { name, type, isPrimaryKey: false, isNullable: true };
    if (type === 'Text') { fd.length = length || 500; }
    fields.push(fd);
  }
  if (fields.length === 0) {
    return [{ name: 'Result', type: 'Text', length: 4000, isPrimaryKey: true, isNullable: false }];
  }

  // Choose PK: prefer SubscriberKey, otherwise first field
  const skIdx = fields.findIndex(f => f.name.toUpperCase() === 'SUBSCRIBERKEY');
  const pkIdx = skIdx >= 0 ? skIdx : 0;
  fields[pkIdx].isPrimaryKey = true;
  fields[pkIdx].isNullable   = false;
  return fields;
}


/* ─── SF Content rendering (keep in sync with background.js) ─── */
function getReferences(content, type) {
  var typeMarker = '<div data-type="' + type + '" data-key="';
  var splitContent = content.split(typeMarker);
  var results = [];
  if (splitContent.length > 1) {
    for (var i = 1; i < splitContent.length; i++) {
      var endTagMatches = splitContent[i].match(/(\/>)|(>[^<]*<\/div>)/i);
      var match = endTagMatches[0] || '>';
      results.push(typeMarker + splitContent[i].split(match)[0] + match);
    }
  }
  return results;
}

function compile(asset, channel) {
  asset = asset || {};
  var content = asset.superContent || asset.content || asset.design;
  if (content) {
    ['slot', 'block'].forEach(function(type) {
      var references = getReferences(content, type);
      var types = type + 's';
      references.forEach(function(reference) {
        var refKey = reference.split('data-key="')[1].split('"')[0];
        if (asset[types] && asset[types][refKey]) {
          content = content.replace(reference, compile(asset[types][refKey]));
        }
      });
    });
    return content;
  } else if (asset.views) {
    if (asset.views[channel]) {
      return compile(asset.views[channel], channel);
    } else if (asset.views.html) {
      return compile(asset.views.html, channel);
    }
  }
  return '';
}
