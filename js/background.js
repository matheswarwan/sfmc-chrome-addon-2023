//TODO: https://stackoverflow.com/questions/53939205/how-to-avoid-extension-context-invalidated-errors-when-messaging-after-an-exte


console.log("Background JS loaded...");

//Global variables
var throttleMilliSeconds = 1000;
var skipNextSave = false; 
var currentAssetId = async() => { await resetCurrentAssetId(); };
var currentBuid = async() => { await restCurrentBuid(); };
var lstReferenceBlock = [];
var getRequestMade = false;

async function resetCurrentAssetId() { 
  return new Promise((resolve,reject) => {  
    var zeroAssetId = { currentAssetId : 0 } 
    chrome.storage.local.set(zeroAssetId, function () {
      console.log('Asset ID reset to 0' )
      resolve(true)
    });
  });
}
async function restCurrentBuid() { 
  return new Promise((resolve,reject) => {  
    var zeroBuid = { currentBuid : 0 } 
    chrome.storage.local.set(zeroBuid, function () {
      console.log('BUID ID reset to 0' )
      resolve(true)
    });
  });
}

// triggered upon first install, update of extension and update of Chrome
chrome.runtime.onInstalled.addListener(function (object) {
  // Open up new tab with thank you page upon first installation
  if (chrome.runtime.OnInstalledReason.INSTALL === object.reason) {
    console.log("Addon Installed.");
    sendMessageToToastMessage('Email','Thank you for installing the addon.')
  }
});

// listen when url is changed
/* chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  console.log("Tab update detected. TODO - You may need to hide/ show the docker: ", tabId, changeInfo);
  if (changeInfo.url) {

    //console.log(changeInfo);
    //console.log('Send Message ' + tabId, {url: changeInfo.url});
    
    chrome.tabs.sendMessage(tabId, {
      url: changeInfo.url
    });
  }
});*/

/* Methods to save content */
function utf8ArrayToString(aBytes) {
  var sView = "";
  
  for (var nPart, nLen = aBytes.length, nIdx = 0; nIdx < nLen; nIdx++) {
      nPart = aBytes[nIdx];
      
      sView += String.fromCharCode(
          nPart > 251 && nPart < 254 && nIdx + 5 < nLen ? /* six bytes */
              /* (nPart - 252 << 30) may be not so safe in ECMAScript! So...: */
              (nPart - 252) * 1073741824 + (aBytes[++nIdx] - 128 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
          : nPart > 247 && nPart < 252 && nIdx + 4 < nLen ? /* five bytes */
              (nPart - 248 << 24) + (aBytes[++nIdx] - 128 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
          : nPart > 239 && nPart < 248 && nIdx + 3 < nLen ? /* four bytes */
              (nPart - 240 << 18) + (aBytes[++nIdx] - 128 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
          : nPart > 223 && nPart < 240 && nIdx + 2 < nLen ? /* three bytes */
              (nPart - 224 << 12) + (aBytes[++nIdx] - 128 << 6) + aBytes[++nIdx] - 128
          : nPart > 191 && nPart < 224 && nIdx + 1 < nLen ? /* two bytes */
              (nPart - 192 << 6) + aBytes[++nIdx] - 128
          : /* nPart < 127 ? */ /* one byte */
              nPart
      );
  }
  return sView;
}


/* To read x-csrf-token value */ 
chrome.webNavigation.onBeforeNavigate.addListener(function(){
  chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
      //console.log('****onBeforeSendHeaders - check x-csrf-token******')
      //console.log(details)
      if(details.requestHeaders.length > 0) {
        for(rh in details.requestHeaders) {
          if(details.requestHeaders[rh].name === 'X-CSRF-Token') {
            var t = { 'X-CSRF-Token' : details.requestHeaders[rh].value}
            chrome.storage.local.set(t, function () {
              //console.log('*** CSRF TOKEN *** ' + t['X-CSRF-Token'] + ' stored' )
            })
          }
        }
      }
    },
    {urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]},
    ["requestHeaders"]
  )
},{
  url: [{hostContains:"marketingcloudapps.com"}]
}); 

function getReferences(content, type) {
  var typeMarker = '<div data-type="' + type + '" data-key="';
  var splitContent = content.split(typeMarker);
  var results = [];
  if (splitContent.length > 1) {
    for (var i = 1; i < splitContent.length; i++) {
      var endTagMatches = splitContent[i].match(/(\/>)|(>[^<]*<\/div>)/i);
      var match = endTagMatches[0] || ">";
      results.push(typeMarker + splitContent[i].split(match)[0] + match);
    }
  }
  return results;
}

function compile(asset, channel) {
  asset = asset || {};
  var content = asset.superContent || asset.content || asset.design;
  if (content) {
    ["slot", "block"].forEach(function (type) {
      var references = getReferences(content, type);
      var types = type + "s";
      references.forEach(function (reference) {
        var refKey = reference.split('data-key="')[1].split('"')[0];
        if (asset[types] && asset[types][refKey]) {
          content = content.replace(reference, compile(asset[types][refKey]));
        } else {
          console.error(
            "Bad Asset: referenced " + type + " does not exist: " + refKey
          );
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
  return "";
}

async function isDuplicateRequest(compiledHtml) { 
  return new Promise((resolve, reject) => {
    var isDuplicate = false; 
    chrome.storage.local.get(null, function(items) {
      for(i in items) {
        //console.log(i , ' -- ' , items[i]['compiledHtml'])
        if(items[i]['compiledHtml'] == compiledHtml ) {
          isDuplicate = true; 
          resolve(isDuplicate);
          break;
        }
      }
      resolve(isDuplicate);
    });
  });
}

async function isDuplicateRequestQuery(queryBody) { 
  return new Promise((resolve, reject) => {
    var isDuplicate = false; 
    chrome.storage.local.get(null, function(items) {
      for(i in items) {
        //console.log(i , ' -- ' , items[i]['compiledHtml'])
        if(i.includes('Query_') && Object.keys(items[i]).includes('queryText')) {
          console.log('starts iwth query and contains sql text');
          queryBody['body']['modifiedDate'] = null;
          items[i]['body']['modifiedDate'] = null; 
          //from https://stackoverflow.com/questions/44008665/how-to-compare-javascript-objects-obtained-by-parsing-json
          var s1 =  JSON.stringify(queryBody['body'], Object.keys(queryBody['body']).sort());
          var s2 =  JSON.stringify(items[i]['body'], Object.keys(items[i]['body']).sort());

          if(s1 == s2) {
            console.log('Query item is duplicate ')
            isDuplicate = true; 
            resolve(isDuplicate);
            break;
          }
        }
      }
      resolve(isDuplicate);
    });
  });
}


/* MK[21July]: New method of saving */
async function saveToLocal(enterpriseId, assetId,assetData, assetType) {
  console.log('SaveToLocal - Asset id - ' + assetId + ' - enterpriseId - ' + enterpriseId)
  //console.log(assetData)
  /* Save to storage */
  if(assetType == 'Email') {
    if(assetId == null) { 
      //typeof assetId === 'undefined'
      //console.log("No saves needed.")
    }else {
      //add rendered html data to figure out if this is unique 
      assetData['compiledHtml'] = compile(JSON.parse(assetData['body']), "email");
      //console.log("assetData['compiledHtml']" , assetData['compiledHtml'])
      newItemJson = {};
      var name = enterpriseId + "_" + assetId + "_" + assetData['timeStamp'];
      newItemJson[name] = assetData;
      //Check if this data exists already
      var isDuplicate = false; 
      isDuplicate = await isDuplicateRequest(assetData['compiledHtml']);
      console.log('is duplicate? ' , isDuplicate);
      if(! isDuplicate){ 
        chrome.storage.local.set(newItemJson, function() {
          console.log('New item stored')
          console.log(newItemJson)
        });
      } else {
        console.log('Duplicate request; not saved.')
      }
      /*
      //console.log(enterpriseId);
      chrome.storage.local.get(enterpriseId, function(items){
        //console.log(items);
        if(items) { 
          var newItems = [] 
          for(i in items[enterpriseId]) { 
            newItems.push(items[enterpriseId][i]);
          }
          newItems.push(assetData);
          var newItemJson = {} 
          newItemJson[enterpriseId] = newItems ;
          chrome.storage.local.set(newItemJson, function() {
            //console.log('New item stored')
            //console.log(newItemJson)
          });
        }else{
          var newItemJson = {} 
          newItemJson[enterpriseId] = [] ;
          newItemJson[enterpriseId].push(assetData);
          chrome.storage.local.set(newItemJson, function() {
            //console.log('New item stored')
            //console.log(newItemJson)
          });
        }
      }); */
    }
  }else if(assetType == 'Query') {
    console.log('Not saving Query ', assetData);
    newItemJson = {};
    var name = enterpriseId + "_" + assetId + "_" + assetData['body']['modifiedDate'];
    newItemJson[name] = assetData;
    var isDuplicate = false; 
    isDuplicate = await isDuplicateRequestQuery(assetData);
    console.log('is duplicate? (TODO) : ' , isDuplicate);
    if(! isDuplicate){ 
      chrome.storage.local.set(newItemJson, function() {
        console.log('New Query item stored')
        console.log(newItemJson)
      });
    } else {
      console.log('Duplicate request; not saved.')
    }
    
  }
}
chrome.webRequest.onCompleted.addListener(
  function(details){
    //Email/ cloudpage saves
    if(details.method == 'GET' && details.url.indexOf('fuelapi/asset/v1/content/assets') > -1 && !getRequestMade){ //TODO: Instead of checking currentAssetID as Number, check if the URL ends with a number 
      console.log('******* GET details********' , details)
      var url = details.url;
      currentAssetId = url.substring(
        url.indexOf('/asset/v1/content/assets/') + '/asset/v1/content/assets/'.length
        , url.length);

      //Check if it's number
      currentAssetId = Number(currentAssetId);
      if(currentAssetId > 0 ) { 
        //mk123 - Replay get request to read response 
        getRequestMade = true; //Important to avoid looping multiple times
        var respBody = makeFetch(url).then(function(respBody){
          //TODO: Defect fix: Get All Dynamic blocks in Email (raised by Elena)
          /*
          * Check for slots and template ids
          * views.html.slots.{anything}.blocks.{anything}.id -- store this 
          * views.html.template.id -- store this 
          */
          var lstReferenceBlock = [];
          //Check all slots
          if(Object.keys(respBody).includes('views') && Object.keys(respBody.views).includes('html') && Object.keys(respBody.views.html).includes('slots') ){ 
            var allSlots = Object.keys(respBody.views.html.slots);
            for (k in allSlots) {
              var slotName = allSlots[k];
              if(Object.keys(respBody.views.html.slots[slotName]).includes('blocks')) {
                var allBlockNames = Object.keys(respBody.views.html.slots[slotName].blocks);
                  for(b in allBlockNames) {
                    var blockName = allBlockNames[b];
                    //if meta.options.id is not found, it's not a reference content block 
                    if(Object.keys(respBody.views.html.slots[slotName].blocks[blockName]).includes('meta') 
                      && 
                    Object.keys(respBody.views.html.slots[slotName].blocks[blockName].meta).includes('options') 
                      && 
                    Object.keys(respBody.views.html.slots[slotName].blocks[blockName].meta.options).includes('id') )
                    {
                        lstReferenceBlock.push(respBody.views.html.slots[slotName].blocks[blockName].meta.options.id);
                  } 
                }
              }
            }
          }
          //Check all templates - templates can be only one value
          if(Object.keys(respBody).includes('views') && Object.keys(respBody.views).includes('template') ) {
            lstReferenceBlock.push(respBody.views.template.id);
          }

          console.log('List of blocks referenced in email ' , lstReferenceBlock); 


          //If this asset is part of dynamic reference block email, then it's not opened by user
          console.log(respBody.memberId)
          currentBuid = respBody.memberId
          currentBuid = Number(currentBuid);
          console.log('******* respBody.memberId ********' , currentBuid)
          console.log('Current Asset ID that is opened ' , currentAssetId);
          if(lstReferenceBlock.length == 0 || 
            (lstReferenceBlock.length > 0 && !lstReferenceBlock.includes(currentAssetId) )
             ) { 
            var t = { 
                      'currentAssetId': currentAssetId,
                      'currentBuid': currentBuid
                    }
            chrome.storage.local.set(t, function() {
              console.log('currentAssetId & currentBuid saved ' , t)
            });
          }//end if
        });
        
       
      }
    } else if(details.method == 'POST' && 
      ( details.url.indexOf('AutomationStudioFuel3/fuelapi/automation/v1/queries') > -1 
        && details.url.indexOf('actions/validate') == -1 
      )
    ) {
      console.log('This is the response message... check if this has key ' , details)
      if(Object.keys(details).includes('requestBody') && details.method == 'POST') { //Check if newly created or old saved - start 
        var bytesArray = new Uint8Array(details.requestBody.raw[0].bytes); 
        var stringArray = utf8ArrayToString(bytesArray);
        detailsBody = stringArray;

        detailsBodyJson = JSON.parse(detailsBody);
        console.log(detailsBodyJson);
      }

    } else { 
      getRequestMade = false;
    }

    //Refresh the docker to show the counter
    //Send Message to popup js to updateDockerIconCount method 
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
      console.log(tabs[0]);
      tabId=tabs[0].id;
      console.log('Tab ID after saving request to send message ' , tabId)
      chrome.tabs.sendMessage(tabId, {
        'action': 'updateDockerIconCount'
      });
    });

  },
  { 
    urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*" //to save email/ cloudpage assets
            ,"https://*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*" //To save sql activities
          ]
    ,types: ["xmlhttprequest"] 
  }
);

chrome.webRequest.onResponseStarted.addListener(
  async function(details){
    if(details.method == 'POST' && 
      ( details.url.indexOf('AutomationStudioFuel3/fuelapi/automation/v1/queries') > -1 
        && details.url.indexOf('actions/validate') == -1 
      )
    ) {
      console.log('This is the response message... check if this has key ' , details)
      if(Object.keys(details).includes('requestBody') && details.method == 'POST') { //Check if newly created or old saved - start 
        var bytesArray = new Uint8Array(details.requestBody.raw[0].bytes); 
        var stringArray = utf8ArrayToString(bytesArray);
        detailsBody = stringArray;

        detailsBodyJson = JSON.parse(detailsBody);
        console.log(detailsBodyJson);
      }

    }
  },
  { 
    urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*" //to save email/ cloudpage assets
            ,"https://*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*" //To save sql activities
          ]
    ,types: ["xmlhttprequest"] 
  },
  ["responseHeaders"]
);


//['requestBody','xmlhttprequest','responseHeaders','responseBody','extraHeaders']
const getCurrentAssetId = async () => {  
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('currentAssetId', function (items) {
      console.log('currentAssetId from getCurrentAssetID  - ', items);
      currentAssetId = items['currentAssetId']; 
      resolve(currentAssetId);
    });
  });
}

const getCurrentBuid = async () => {  
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('currentBuid', function (items) {
      console.log('currentBuid from getcurrentBuid  - ', items);
      currentBuid = items['currentBuid']; 
      resolve(currentBuid);
    });
  });
}

async function getAuditHistory(emailIdToShow, currentBuid) {  
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, function (items) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      console.log(items)
      var filteredItems = {};
      for(i in items) {
          var buid = i.split('_')[0];
          var emailId = i.split('_')[1];
          var time = i.split('_')[2];
          
          if(emailId == emailIdToShow && buid == currentBuid) {
            filteredItems[i] = items[i];
          }
      }
      console.log('Filtered Assets to be displayed to popup: ' , filteredItems)
      resolve(filteredItems);
    });
  });
}

async function updateDockerIconCount(){
  var currentOpenedAssetID = await getCurrentAssetId();
  var currentBuid = await getCurrentBuid();
  var data = await getAuditHistory(currentOpenedAssetID, currentBuid);
  var keys = Object.keys(data);
  var dataLength = data.length;

  //$('#ck-docked-icon-counter').text(dataLength);
  document.getElementById('ck-docked-icon-counter').innerHTML = dataLength;
}

function getSanitisedURL(type, endpoint, body) {
  if(type == 'Query') {
    //Expected format - https://mc.s10.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/75624219-1cbb-4e19-b1b1-294e0ce376a4

  }
}

chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    //Global declariations

    var assetData = {}
    var assetId = null;
    var enterpriseId, memberId;

    if( (details.method == 'PUT' && !skipNextSave) &&  details.url.indexOf('fuelapi/asset/v1/content/assets') > -1 ) { 
      ////console.log('PUT method')
      //console.log(details)
      var type = "email";
      var url = details.url;
      assetId = url.substring(
        url.indexOf('/asset/v1/content/assets/') + '/asset/v1/content/assets/'.length
        , url.length)
      var statusCode = details.statusCode;
      var timeStamp = details.timeStamp;
      var bytesArray = new Uint8Array(details.requestBody.raw[0].bytes); 
      var stringArray = utf8ArrayToString(bytesArray);
      putBody = stringArray;

      putJson = JSON.parse(putBody);
      var name = putJson.name; 
      var folderName = putJson.category.name; 
      var folderId = putJson.category.id; 
      enterpriseId = putJson.enterpriseId;
      enterpriseId = enterpriseId + ''; //Convert to String; Json key only accepts Strings.
      memberId = putJson.memberId;
      memberId = memberId + ''; 

      /*Save to storage */
      assetData['body']= putBody;
      assetData['folderId']= folderId;
      assetData['folderName']= folderName;
      assetData['name']= name;
      assetData['timeStamp']= timeStamp;
      assetData['url']= url;

      saveToLocal(memberId, assetId, assetData, 'Email');

      //Refresh the updateDockerIconCount
      //del- updateDockerIconCount();

      //Send Message to popup js to updateDockerIconCount method 
      chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
        console.log(tabs[0]);
        tabId=tabs[0].id;
        console.log('Tab ID after saving request to send message ' , tabId)
        chrome.tabs.sendMessage(tabId, {
          'action': 'updateDockerIconCount'
        });
      });
      
      

    } else if (details.method == 'PUT' && skipNextSave) { //if already skipped one save
      skipNextSave = false;
    } else if((details.method == 'PATCH' || details.method == 'POST') 
    && ( details.url.indexOf('AutomationStudioFuel3/fuelapi/automation/v1/queries') > -1 
         && details.url.indexOf('actions/validate') == -1 
        )
    ) {
      var type = "query";
      //From url, make a GET call and in response, get queryText
      var getEndpoint = details.url; 
      //sanitise get endpoint 
      //getEndpoint = getSanitisedURL('Query', getEndpoint);
        var detailsBody = '';
        console.log('details --> ' , details)
      if(Object.keys(details).includes('requestBody') && details.method == 'POST') { //Check if newly created or old saved - start 
        var bytesArray = new Uint8Array(details.requestBody.raw[0].bytes); 
        var stringArray = utf8ArrayToString(bytesArray);
        detailsBody = stringArray;

        detailsBodyJson = JSON.parse(detailsBody);
        console.log(detailsBodyJson);

        var assetData = {};

        assetData['body']= detailsBodyJson;
        assetData['queryText']= detailsBodyJson.queryText;
        assetData['targetName']= detailsBodyJson.targetName;
        assetData['modifiedDate']= detailsBodyJson.modifiedDate;
        assetData['targetUpdateTypeName']= detailsBodyJson.targetUpdateTypeName;
        assetData['name']= detailsBodyJson.name;
        assetData['url']= details.url + detailsBodyJson.key; //MK - TODO : key is empty and thus the patch URL when restroing is coming as wrong. So, change this method to 'Chrome.webrequest.oncompleted' and get key from response 

        assetId = detailsBodyJson.name; 
        enterpriseId = "Query";  
        saveToLocal(enterpriseId, assetId, assetData, 'Query')

      } else {
        /* Get - Start */
        var csrfToken = ""//items['X-CSRF-Token'] ; //= getcsrfToken();
        //console.log('csrfToken is ' + csrfToken);
        requestOptions = {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            credentials: "same-origin",
            'X-CSRF-TOKEN': csrfToken     
          }
        };
        
        fetch(getEndpoint, requestOptions)  
          .then(function(response) {                      // first then()
            //console.log('***THEN IN FETCH GET REQUEST.***')  
              //console.log(response);  
              response.json().then(
                function(body) {
                  
                  /*Save to storage */
                  assetData['body']= body;
                  assetData['queryText']= body.queryText;
                  assetData['targetName']= body.targetName;
                  assetData['modifiedDate']= body.modifiedDate;
                  assetData['targetUpdateTypeName']= body.targetUpdateTypeName;
                  assetData['name']= body.name;
                  assetData['url']= getEndpoint;

                  //Only then it'll be saved
                  assetId = body.name; 
                  enterpriseId = "Query";
                  if(assetId != null) {
                    saveToLocal(enterpriseId, assetId, assetData, 'Query')
                  }
                  }
                );

          }) ;
        /* Get - End */  
      }//Check if newly created or old saved ends  
    }//if patch ends
    else if(details.method == 'POST' && details.url.indexOf('querystudio.herokuapp.com/query/create') > -1 ) {
      console.log('Query studio post request ' , details);
      
      var assetData = {};
      var url = details.url;
      var statusCode = details.statusCode;
      var timeStamp = details.timeStamp;
      console.log(url,statusCode,timeStamp);
      var bytesArray = new Uint8Array(details.requestBody.raw[0].bytes); 
      var stringArray = utf8ArrayToString(bytesArray);
      postBody = stringArray;

      postJson = JSON.parse(postBody);
      console.log(postJson);
      var querytext = postJson.querytext; 

      /*Save to storage */
      assetData[timeStamp] = {};
      assetData[timeStamp]['body']= { 'querytext': querytext };
      assetData[timeStamp]['timeStamp']= timeStamp;
      assetData[timeStamp]['url']= url;
      

      chrome.storage.local.get('QueryStudioItems', function(qsItems) { 
        console.log('QS items fetched ' , qsItems)
        if(Object.keys(qsItems).length === 0) { 
          qsItems = {};
          qsItems['QueryStudioItems'] = [];
        } //MKTODO
        console.log(qsItems);
        qsItems['QueryStudioItems'].push( assetData );
        chrome.storage.local.set(qsItems, function() {
          console.log('New Query item stored')
          console.log(qsItems)
        }); 
      });
    }
    
  },
  { 
    urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*" //to save email/ cloudpage assets
            ,"https://*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*" //To save sql activities
            ,"https://querystudio.herokuapp.com/query/create" //Query studio activity
          ]
  },
  ['requestBody',chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean) 
);


// Restore action 

const getAccessToken = async (url) => { 
  var at = '';
  //return promise 
  return new Promise((resolve, reject) => {
    fetch(url) 
      .then((response) => response.json())
      .then((data) => { 
        console.log(data)
        var at = data.accessToken;
        resolve(at);
      });
    /* axios.get(url).then((response) => {
      console.log('Axios response');
      if(response.status == 200) {
        at = response.data.accessToken;
        console.log(at);
        resolve(at); 
      }
    }, (error) => {
      console.log('Axios error');
      console.log(error);
      reject(error);
    }); */
  });   
}


const getcsrfToken = async () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('X-CSRF-Token', function (items) {
      console.log('CSRF Token retreived ');
      console.log(items['X-CSRF-Token']);
      resolve( items['X-CSRF-Token'] ); 
    });
  });
}


async function makeFetch(url) { 
  return new Promise((resolve, reject) => {
    fetch(url)  
    .then(function(response) {
        response.json().then(body => {
          console.log('Body in make Fetch ' , body);
          resolve(body)
        });
      });
  });
}

async function reloadTab(tabId) {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  //printLog(debug, "Tab ID from reloadTab function " + tab.id)
  chrome.tabs.reload(tabId, {}, function () { console.log(tabId, ' - reload done') } )
  //window.close();
  //alert("Reverted.")
  return tabId;
}

async function restoreRequestEmail(assetKey) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(assetKey, async function (items) {
      url = items[assetKey]['url'] ;
      body = items[assetKey]['body'];
      csrfToken = await getcsrfToken(); //TODO: throw error if token not found; or reload the page
      headers = {
        "Content-Type": "application/json",
        credentials: "same-origin",
        'X-CSRF-Token': csrfToken
      };

      requestOptions = {
        method: "PUT",
        headers: headers,
        body: body, 
      };
      
      await fetch(url, requestOptions)  
      .then(function(response) {                      // first then()
        response.json().then( (data) => {
          if(response.status >= 200 && response.status < 400)
          {
            console.log('Revert Response:') 
            console.log('response: ' , response)
            console.log('data: ' , data)
                
            //reloadTab(tabId);
            isReverted = true; 
            resolve(isReverted);
            //return isReverted;
          }else {
            isReverted = false; 
            resolve(isReverted);
            //return isReverted;
          }
        });
      }) 
      .catch(function(error) {                        // catch
        console.log('Request failed', error);
        isReverted = false; 
        resolve(isReverted);
        //return isReverted;
      });
    }); 
  });
}

async function restoreRequestQuery(assetKey) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(assetKey, async function (item) {

      //Check if modifiedDate is null and set to current date time 
      if(item[assetKey]['body']['modifiedDate'] == null) { 
        item[assetKey]['body']['modifiedDate'] = new Date().toISOString();
      }

      url = item[assetKey]['url'] ;
      //check if url has the Key. If not, throw error;
      body = JSON.stringify(item[assetKey]['body']);
      console.log('Restore Request Query: Fetched item ', item, 'Body ' , body)
      csrfToken = await getcsrfToken(); //TODO: throw error if token not found; or reload the page
      headers = {
        "Content-Type": "application/json",
        credentials: "same-origin",
        'X-CSRF-Token': csrfToken
      };

      requestOptions = {
        method: "PATCH",
        headers: headers,
        body: body, 
      };
      
      fetch(url, requestOptions)  
      .then(function(response) {                      // first then()
        response.json().then( (data) => {
          if(response.status >= 200 && response.status < 400)
          {
            console.log('Revert Response:') 
            console.log('response: ' , response)
            console.log('data: ' , data)
                
            //reloadTab(tabId);
            isReverted = true; 
            resolve(isReverted);
            //return isReverted;
          }else {
            isReverted = false; 
            var statusText = response.statusText;
            console.log('ERROR reverting SQL activity. Status text - ' , statusText)
            resolve(isReverted);
            //return isReverted;
          }
        });
      }) 
      .catch(function(error) {                        // catch
        console.log('Request failed', error);
        isReverted = false; 
        resolve(isReverted);
        //return isReverted;
      });
    }); 
  });
}

async function restoreRequest(assetType, assetKey) {
  var isReverted = false; 
  skipNextSave = true; 
  console.log('assetType: ', assetType , ' assetKey ', assetKey )
  var url, body, requestOptions, csrfToken, headers;
  return new Promise((resolve, reject) => 
  {
    if(assetType == 'Email') {
      restoreRequestEmail(assetKey).then(function(restoreResponse) {
        resolve(restoreResponse);
      });
    } else if(assetType == 'Query') {
      restoreRequestQuery(assetKey).then(function(restoreResponse) {
        resolve(restoreResponse);
      });
    }
  });
  //return isReverted; 
}

const throttleFunction=(func, delay)=>{
  let prev = 0;
  return (...args) => {
    let now = new Date().getTime();
    if(now - prev> delay){
      prev = now;
      return func(...args); 
    }
  }
} 


function sendMessageToToastMessage(assetType, message) {
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    console.log(tabs[0]);
    tabId=tabs[0].id;
    console.log('Tab ID after saving request to send message ' , tabId)
    chrome.tabs.sendMessage(tabId, {
      'action': 'showToastMessage',
      'assetType': assetType,
      'message': message
    });
  });
}

function sendRestoreStatusToPopupJs(assetType, restoreResponse) {
  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    console.log(tabs['id']);
    tabId=tabs['id'];
    console.log('Tab ID after saving request to send message ' , tabId)
    chrome.tabs.sendMessage(tabId, {
      'action': 'Restore',
      'assetType': assetType,
      'status': restoreResponse
    });
  });
}

//TODO: Implement throttle for restore request; don't restore multiple times
chrome.runtime.onMessage.addListener(
  async function(request, sender, sendResponse) {
    console.log('Message received in Background .js \n Request' , request , '\n Sender', sender, '\n sendResponse',sendResponse);
    var result; 
//    return new Promise(function (resolve,reject) {
      if(request.action == 'Restore') {
        console.log('restore request Received');
        /* var newURL = 'https://mc.s10.exacttarget.com/cloud/update-token.json';
        var at = await getAccessToken(newURL, sender.tab.id);
        console.log('Access Token generated : ' , at, ' sender.tab.id ' , sender.tab.id); */
        //throttleFunction( ()=> {
          var assetType = request.assetType;
          var assetKey = (request.assetType == 'Email' ? request.EmailSelected : request.QuerySelected) ;
          restoreRequest(assetType, assetKey ).then( (restoreResponse) => {
            console.log('Restore response in then ' , restoreResponse);
            console.log('{prints after restore status } Restore result for ', request.EmailSelected , ' --> ' , restoreResponse)

            if(restoreResponse) {
              console.log('Restore successful')
              sendRestoreStatusToPopupJs(assetType, restoreResponse);
              sendResponse({'action':'Restore','status': restoreResponse});
              return true;
            }else{
              console.log('Restore faled')
              sendRestoreStatusToPopupJs(assetType, restoreResponse);
              sendResponse({'action':'Restore', 'status': restoreResponse})
              return true; 
            }
          })
          .catch( function(error) {
            console.log('Restore ERRORED: ', error)
          })
          /*if(result) { 
            console.log('Restore successful')
            //sendResponse({'action':'Restore', 'status': restoreResult});
            //return true;
          }else{
            console.log('Restore faled')
            //sendResponse({'action':'Restore', 'status': restoreResult})
            //return true; 
          }*/
        } else if(request.action == 'config') {
          chrome.storage.local.set(request['addonConfig'], function() {
            result = true; 
            console.log('Config saved ' , request.addonConfig )
            sendResponse({'action':'config', 'status': result})
            return true; 
          });
          /*{ 
            'action': 'config',
            'addonConfig' : {
              'pos': {
                'left': leftPos
              }
            } */
        }
        //sendResponse({'action':request.action, 'status': restoreResult});
        //return true;
        //, throttleMilliSeconds); //Execute a max of once a second
      //}
    //});
});