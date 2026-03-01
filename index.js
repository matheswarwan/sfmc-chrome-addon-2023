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

  // Run query against Query Studio API
  $('.ck-run-query-btn').off('click').on('click', async function() {
    let sql = sqlEditor.getValue().trim();
    if (!sql) {
      showToastMessage(GLOBAL.TOAST.ERROR, 'Please enter a SQL query.');
      return;
    }
    $('.ck-query-results').html('<p style="color:#888">Running query…</p>');
    $(this).prop('disabled', true);

    try {
      let response = await fetch('https://querystudio.herokuapp.com/query/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ querytext: sql })
      });

      if (!response.ok) {
        let errText = await response.text();
        $('.ck-query-results').html('<p style="color:red">Error: ' + escapeHtml(errText) + '</p>');
        return;
      }

      let result = await response.json();
      renderQueryResults(result);
    } catch (e) {
      $('.ck-query-results').html('<p style="color:red">Network error: ' + escapeHtml(String(e)) + '</p>');
    } finally {
      $('.ck-run-query-btn').prop('disabled', false);
    }
  });
}

function renderQueryResults(result) {
  // result may be an array of row objects or { rows: [...], ... }
  let rows = Array.isArray(result) ? result : (result.rows || result.results || result.data || []);
  if (!Array.isArray(rows) || rows.length === 0) {
    $('.ck-query-results').html('<p style="color:#888">Query returned no rows.</p>');
    return;
  }
  let cols = Object.keys(rows[0]);
  let headerHtml = cols.map(c => `<th style="padding:4px 8px;border:1px solid #ddd;background:#f4f4f4">${escapeHtml(c)}</th>`).join('');
  let bodyHtml   = rows.map(row =>
    '<tr>' + cols.map(c => `<td style="padding:4px 8px;border:1px solid #ddd">${escapeHtml(String(row[c] != null ? row[c] : ''))}</td>`).join('') + '</tr>'
  ).join('');
  $('.ck-query-results').html(`
    <p style="font-size:12px;color:#888;margin-bottom:4px">${rows.length} row(s)</p>
    <div style="overflow:auto">
      <table style="border-collapse:collapse;font-size:12px;width:100%">
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>
    </div>`);
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

    let csrfToken = await getcsrfToken().catch(() => null);
    if (!csrfToken) {
      showToastMessage(GLOBAL.TOAST.ERROR, GLOBAL.EMAIL.TOAST_MESSAGE_INVALID_TOKEN);
      return;   // Phase 1.2 fix: return instead of `throw error` (error was undefined)
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
  return Object.keys(d).filter(id => id !== 'token' && id !== 'lastAccessed');
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

async function getcsrfToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(currentBuid, function(item) {
      if (!item[currentBuid] || !item[currentBuid].token) {
        reject(false);
        return;
      }
      let t = item[currentBuid].token;
      if (t['X-CSRF-Token'] && t['createdDate']) {
        let ageMinutes = (new Date() - new Date(t.createdDate)) / 60000;
        if (ageMinutes < allowedTokenAge) {
          resolve(t['X-CSRF-Token']);
        } else {
          reject(false);
        }
      } else {
        reject(false);
      }
    });
  });
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
