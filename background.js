const DEBUG = false;
const log = (...args) => { if (DEBUG) console.log(...args); };

const delay = ms => new Promise(res => setTimeout(res, ms));

// Global BU state — set on first intercepted SFMC save
let memberId = '';
let token = '';

/* ─── Capture CSRF token from outgoing request headers ─── */
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    if (details.requestHeaders.length > 0) {
      for (let rh in details.requestHeaders) {
        if (details.requestHeaders[rh].name === 'X-CSRF-Token') {
          var item = {
            token: {
              'X-CSRF-Token': details.requestHeaders[rh].value,
              createdDate: new Date().valueOf()
            }
          };
          token = item;
          if (memberId === '') { break; }
          chrome.storage.local.get(memberId, function(existingItems) {
            if (existingItems[memberId]) {
              existingItems[memberId]['token'] = item.token;
              chrome.storage.local.set(existingItems);
            }
          });
        }
      }
    }
  },
  { urls: ['https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*'] },
  ['requestHeaders']
);


/* ─── Capture Email / CloudPage PUT saves + Automation Studio PATCH + Query Studio POST ─── */
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {

    /* ── Email / CloudPage PUT ── */
    if (details.method === 'PUT') {
      let assetData = {};
      let url = details.url;
      let assetId = url.substring(
        url.indexOf('/asset/v1/content/assets/') + '/asset/v1/content/assets/'.length
      );
      let timeStamp = details.timeStamp;

      if (!details.requestBody || !details.requestBody.raw || !details.requestBody.raw[0]) {
        log('PUT: no request body, skipping');
        return;
      }

      let bytesArray = new Uint8Array(details.requestBody.raw[0].bytes);
      let putBody = utf8ArrayToString(bytesArray);
      let putJson;
      try {
        putJson = JSON.parse(putBody);
      } catch (e) {
        log('PUT: failed to parse body JSON', e);
        return;
      }

      let name = putJson.name;
      let folderName = putJson.category ? putJson.category.name : '';
      let folderId = putJson.category ? putJson.category.id : null;
      memberId = String(putJson.memberId || '');

      assetData.body = putBody;
      assetData.folderId = folderId;
      assetData.folderName = folderName;
      assetData.name = name;
      assetData.timeStamp = timeStamp;
      assetData.url = url;
      assetData.assetId = putJson.id;
      assetData.customerKey = putJson.customerKey;
      assetData.memberId = memberId;
      assetData.compiledHtml = compile(putJson, 'email');

      let isDuplicateEmail = await isDuplicateRequestEmailRequest(memberId, assetData.compiledHtml);
      if (isDuplicateEmail || memberId === '') {
        log('Duplicate or no memberId — not saved');
      } else {
        log('Email save captured');
        saveToLocal(memberId, 'email', assetId, assetData);
        await setCurrentBUID(memberId);
      }

    /* ── Automation Studio SQL PATCH ── */
    } else if (details.method === 'PATCH') {
      let getEndpoint = details.url;
      let csrfHeader = (token && token.token) ? token.token['X-CSRF-Token'] : '';

      let requestOptions = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          credentials: 'same-origin',
          'X-CSRF-TOKEN': csrfHeader
        }
      };

      fetch(getEndpoint, requestOptions)
        .then(function(response) {
          return response.json();
        })
        .then(function(body) {
          let assetData = {};
          assetData.body = body;
          assetData.queryText = body.queryText || '';
          assetData.targetName = body.targetName || '';
          assetData.modifiedDate = body.modifiedDate || '';
          assetData.targetUpdateTypeName = body.targetUpdateTypeName || '';
          assetData.name = body.name || '';
          assetData.url = getEndpoint;
          assetData.timeStamp = new Date().valueOf();
          assetData.id = body.name || String(Date.now());
          assetData.favourite = false;

          let buId = memberId === '' ? '0' : memberId;
          saveToLocal(buId, 'automation_studio', body.name, assetData);
        })
        .catch(function(e) {
          log('PATCH GET failed', e);
        });

    /* ── Query Studio POST ── */
    } else if (details.method === 'POST' && details.url.indexOf('querystudio.herokuapp.com/query/create') > -1) {
      if (!details.requestBody || !details.requestBody.raw || !details.requestBody.raw[0]) {
        log('POST: no request body, skipping');
        return;
      }

      let url = details.url;
      let timeStamp = details.timeStamp;
      let bytesArray = new Uint8Array(details.requestBody.raw[0].bytes);
      let postBody = utf8ArrayToString(bytesArray);
      let postJson;
      try {
        postJson = JSON.parse(postBody);
      } catch (e) {
        log('POST: failed to parse body JSON', e);
        return;
      }

      let querytext = postJson.querytext || '';
      let assetData = {
        id: String(timeStamp),
        body: { querytext: querytext },
        name: '',        // user-editable label; defaults empty (shown as timestamp in UI)
        timeStamp: timeStamp,
        url: url,
        favourite: false
      };

      let buId = memberId === '' ? '0' : memberId;
      saveToLocal(buId, 'query_studio', timeStamp, assetData);
    }
  },
  {
    urls: [
      'https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*',
      'https://*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*',
      'https://querystudio.herokuapp.com/query/create'
    ]
  },
  ['requestBody', chrome.webRequest.OnBeforeSendHeadersOptions
    ? chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS
    : undefined
  ].filter(Boolean)
);


/* ─── Storage helpers ─── */

function saveToLocal(buId, assetType, assetId, assetData) {
  changeIcon();
  if (assetId == null) { return; }

  chrome.storage.local.get(buId, function(items) {
    if (items[buId]) {
      // BU already exists — append to the correct array
      let bu = items[buId];
      if (assetType === 'email' && Array.isArray(bu.email)) {
        bu.email.push(assetData);
      } else if (assetType === 'query_studio' && Array.isArray(bu.query_studio)) {
        bu.query_studio.push(assetData);
      } else if (assetType === 'automation_studio' && Array.isArray(bu.automation_studio)) {
        bu.automation_studio.push(assetData);
      }
      chrome.storage.local.set(items, function() {
        log('Updated existing BU', buId, assetType);
      });
    } else {
      // First save for this BU — initialise all arrays
      let newBU = {};
      newBU[buId] = {
        email: [],
        query_studio: [],
        cloud_pages: [],
        automation_studio: []
      };
      if (assetType === 'email') {
        newBU[buId].email.push(assetData);
      } else if (assetType === 'query_studio') {
        newBU[buId].query_studio.push(assetData);
      } else if (assetType === 'automation_studio') {
        newBU[buId].automation_studio.push(assetData);
      }
      chrome.storage.local.set(newBU, function() {
        log('Initialised new BU', buId, assetType);
      });
    }
  });
}

async function changeIcon() {
  chrome.action.setIcon({ path: './images/get_started48_recording.png' });
  await delay(5000);
  chrome.action.setIcon({ path: './images/get_started48.png' });
}

async function isDuplicateRequestEmailRequest(buId, compiledHtml) {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, function(items) {
      if (items[buId] && Array.isArray(items[buId].email)) {
        for (let i = 0; i < items[buId].email.length; i++) {
          if (items[buId].email[i].compiledHtml === compiledHtml) {
            resolve(true);
            return;
          }
        }
      }
      resolve(false);
    });
  });
}

async function setCurrentBUID(currentBuid) {
  return new Promise((resolve) => {
    let lastAccessedBU = {
      lastAccessed: { buid: currentBuid, time: new Date().valueOf() }
    };
    chrome.storage.local.set(lastAccessedBU, function() {
      log('lastAccessedBU saved', lastAccessedBU);
      resolve(true);
    });
  });
}


/* ─── UTF-8 byte array decoder ─── */
function utf8ArrayToString(aBytes) {
  var sView = '';
  for (var nPart, nLen = aBytes.length, nIdx = 0; nIdx < nLen; nIdx++) {
    nPart = aBytes[nIdx];
    sView += String.fromCharCode(
      nPart > 251 && nPart < 254 && nIdx + 5 < nLen ?
        (nPart - 252) * 1073741824 + (aBytes[++nIdx] - 128 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
      : nPart > 247 && nPart < 252 && nIdx + 4 < nLen ?
        (nPart - 248 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
      : nPart > 239 && nPart < 248 && nIdx + 3 < nLen ?
        (nPart - 240 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
      : nPart > 223 && nPart < 240 && nIdx + 2 < nLen ?
        (nPart - 224 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
      : nPart > 191 && nPart < 224 && nIdx + 1 < nLen ?
        (nPart - 192 << 6) + aBytes[++nIdx] - 128
      : nPart
    );
  }
  return sView;
}


/* ─── SF Content rendering (shared with index.js — keep in sync) ─── */
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
