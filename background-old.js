//Remove console logs 
//writeConsoleLog = console.log; //save the log function in your own function
//console.log = function(){} //override the original log function


/* -- Dev area starts  -- */

/* https://stackoverflow.com/questions/19103183/how-to-insert-html-with-a-chrome-extension */ 
/* chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.executeScript({
    code: 'var div=document.createElement("div"); document.body.appendChild(div); div.innerText="test123";'
  });
});
*/

/* chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.create({
      'url': chrome.extension.getURL('page.html')
  }, function(tab) {

  });
});*/


chrome.runtime.onMessage.addListener(function(message, sender) {
  
  console.log(message)
  console.log(sender)
  console.log("This message received")
  if(message['viewRequest'] != null ) {
  } else if(message['selectedCheckbox'] != null ) {
    console.log('Message Received on compare checkbox selection' + JSON.stringify(message));
  }
});


/* chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('Waking up on history update.');
  console.log(details);
}); */

function getStorage() {
  chrome.storage.local.get(null, function (items) {
    console.log(items ) 
  } 
)
}

/* -- Dev area ends -- */

/* Background wakeup script - start */
//https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
// background.js
/* chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log('wake me up');
}); */

/* Capture Request - Start */ 


var putBody; 
/* https://stackoverflow.com/questions/3195865/converting-byte-array-to-string-in-javascript */
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

/* MK[21July]: New method of saving */
function saveToLocal(enterpriseId, assetId,assetData) {
    console.log('SaveToLocal - Asset id - ' + assetId + ' - enterpriseId - ' + enterpriseId)
    console.log(assetData)
    /* Save to storage */
    if(assetId == null) { 
      //typeof assetId === 'undefined'
      console.log("No saves needed.")
    }else {
      console.log(enterpriseId);
      chrome.storage.local.get(enterpriseId, function(items){
        console.log(items);
        if(items) { 
          var newItems = [] 
          for(i in items[enterpriseId]) { 
            newItems.push(items[enterpriseId][i]);
          }
          newItems.push(assetData);
          var newItemJson = {} 
          newItemJson[enterpriseId] = newItems ;
          chrome.storage.local.set(newItemJson, function() {
            console.log('New item stored')
            console.log(newItemJson)
          });
        }else{
          var newItemJson = {} 
          newItemJson[enterpriseId] = [] ;
          newItemJson[enterpriseId].push(assetData);
          chrome.storage.local.set(newItemJson, function() {
            console.log('New item stored')
            console.log(newItemJson)
          });
        }
      });
    }
}

//MK- WIP
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    //Global declariations

    var assetData = {}
    var assetId = null;
    var enterpriseId;

    //Email/ cloudpage saves
    if(details.method == 'PUT') { 
      //console.log('PUT method')
      console.log(details)
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

      /*Save to storage */
      assetData['body']= putBody;
      assetData['folderId']= folderId;
      assetData['folderName']= folderName;
      assetData['name']= name;
      assetData['timeStamp']= timeStamp;
      assetData['url']= url;

      saveToLocal(enterpriseId, assetId, assetData)


    } else if(details.method == 'PATCH') {
      var type = "query";
      //From url, make a GET call and in response, get queryText
      var getEndpoint = details.url; 
      console.log(getEndpoint)
      /* Get - Start */
      var csrfToken = ""//items['X-CSRF-Token'] ; //= getcsrfToken();
      console.log('csrfToken is ' + csrfToken);
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
          console.log('***THEN IN FETCH GET REQUEST.***')  
            console.log(response);  
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
                
                saveToLocal(enterpriseId, assetId, assetData)

                }
              );

        }) ;
      /* Get - End */       
    }//if patch ends
  },
  { 
    urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*" //to save email/ cloudpage assets
            ,"https://*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*" //To save sql activities
          ]
  },
  ['requestBody',chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean) 
);

/* MK[21July]: Old method of saving */
chrome.webRequest.onBeforeRequest.addListener(
    function(details) {
      //wakeup();
      //Request URL: https://content-builder.s10.marketingcloudapps.com/fuelapi/asset/v1/content/assets/
      if(details.method == 'PUT') { 
        console.log('**********Check if this has x-csrf-token?**********')
        console.log(details);
        console.table(details);
        var url = details.url;
        var assetId = url.substring(
          url.indexOf('/asset/v1/content/assets/') + '/asset/v1/content/assets/'.length
          , url.length)
        var statusCode = details.statusCode;
        var timeStamp = details.timeStamp;
        var bytesArray = new Uint8Array(details.requestBody.raw[0].bytes); 
        var stringArray = utf8ArrayToString(bytesArray);
        //console.log("details after saving")
        //console.log(details);
        putBody = stringArray;

        putJson = JSON.parse(putBody);
        var name = putJson.name; 
        var folderName = putJson.category.name; 
        var folderId = putJson.category.id; 
        var enterpriseId = putJson.enterpriseId; 
        
      }

      //https://stackoverflow.com/questions/11593853/intercept-http-request-body-from-chrome-extension
      
      if(typeof assetId === 'undefined') {
        console.log("IGNORED UNDEFINED SAVES")
      }else {
        /*Save to storage */
        var k = 'SFMC_'+ assetId + '_' + timeStamp;
        var v = {}
        v['url'] = url;
        v['name'] = name;
        v['folderName'] = folderName; 
        v['folderId'] = folderId; 
        v['assetId'] = assetId;
        v['statusCode'] = statusCode;
        v['timeStamp'] = timeStamp;
        v['body'] = putBody;
        v['enterpriseId'] = enterpriseId;
        var obj= {};
        var v1 = k;
        obj[v1] = v;
        console.log('putBody  ' )
        console.log(putBody);

        var duplicateCheck = false;
        chrome.storage.local.get(null, function(k) { 
            for(i in k) { 
                //console.log(k[i]['body']) 
                if(k[i]['body'] == putBody) { 
                    console.log('Same body present in ' + i );
                    duplicateCheck = true; 
                    break; 
                }
            }
            console.log("For loop completed.") 
        });
        
        if(duplicateCheck) {
          console.log(k + ' is not stored as duplicate request found.')
        }else{ 
          chrome.storage.local.set(obj, function() {
            console.log(k + ' key is stored.');
          });
        }
      }
    },
    { 
      urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]
    },
    ['requestBody',chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean) 
  );

/* To read x-csrf-token value */ 
chrome.webNavigation.onBeforeNavigate.addListener(function(){
  chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
      console.log('****onBeforeSendHeaders - check x-csrf-token******')
      console.log(details)
      if(details.requestHeaders.length > 0) {
        for(rh in details.requestHeaders) {
          if(details.requestHeaders[rh].name === 'X-CSRF-Token') {
            var t = { 'X-CSRF-Token' : details.requestHeaders[rh].value}
            chrome.storage.local.set(t, function () {
              console.log('*** CSRF TOKEN *** ' + t['X-CSRF-Token'] + ' stored' )
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
/*
chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    console.log('****OnBeforeSendHeaders - check x-csrf-token******')
    console.log(details)
    /*for (var i = 0; i < details.requestHeaders.length; ++i) {
       if (details.requestHeaders[i].name === 'User-Agent') {
        details.requestHeaders.splice(i, 1);
        break;
      }
    }* /
    return {requestHeaders: details.requestHeaders};
  },
  {urls: ["<all_urls>"]},
  ["blocking", "requestHeaders"]
);
*/

/* Capture Request - End */ 



/* Delete these later 

/* chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  alert(changeInfo.url);
  //console.log("TAB CHANGED")
})

chrome.tabs.onActivated.addListener(function(activeInfo) {
  console.log("TAB CHANGED - On Activated")
})
   */ 



// background.js

/* chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    console.log("inside onBeforeRequest + all urls")
    console.log(details);
  },
  {urls: [ "<all_urls>"]},
  []
); */


/*
chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    console.log("inside onHeadersReceived + https://*.marketingcloudapps.com/*")
    console.log(details);
  },
  {urls: [ "https://*.marketingcloudapps.com/*"]},
  []
); 
*/ 
/* Can't use because of limitation - https://developer.chrome.com/docs/extensions/reference/storage/#property-sync */ 
/* function storeLocal(details, fileName) { 
  fn = 'SFMC_'+ fileName; 
  chrome.storage.sync.set({fn : details}, function() {
    console.log('fn ' + fn + "\n" + 'request ' + details);
  });
} 
// To get all stored keys 
chrome.storage.local.get(null, function(items) {
    var allKeys = Object.keys(items);
    console.log(allKeys);
});
 */ 

/* Displays a 'save' option to user */
/*function download(content, mimeType, filename){
  const a = document.createElement('a') // Create "a" element
  const blob = new Blob([content], {type: mimeType}) // Create a blob (file-like object)
  const url = URL.createObjectURL(blob) // Create an object URL from blob
  a.setAttribute('href', url) // Set "a" element link
  a.setAttribute('download', filename) // Set download filename
  a.click() // Start downloading
}*/
  
// get headers > cookies 
/* chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    //console.log("inside onBeforeRequest")
    //console.log(details);
    if(details.method == 'PUT') { 
      console.log('does this have headers? ')
      console.log(details);
     
    }
   

  },//<all_urls> //https://content-builder.s10.marketingcloudapps.com/fuelapi/asset/v1/content/assets/166613

  {urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]},
  ['extraHeaders']
); */

/*

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
      console.log("Details from onBeforeSendHeaders. Does this have cookie? ") 
      console.log(details);
  }, {
      urls: ["https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]
  }, [ 'requestHeaders']
);


chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
      console.log("Details from onHeaderReceived. Does this have cookie? ")
      console.log(details);
  }, {
      urls: ["https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]
  }, ['responseHeaders']
);

chrome.webRequest.onCompleted.addListener(
  function (details) {
    console.log("Details from onCompleted. Does this have cookie? ")
    console.log(details);
}, {
    urls: ["https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]
}, ['responseHeaders']
)

chrome.webRequest.onHeadersReceived.addListener(
  function (details) {
      console.log("Details from onHeaderReceived (extraHeaders). Does this have cookie? ")
      console.log(details);
  }, {
      urls: ["https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]
  }, ['extraHeaders']
);

chrome.webRequest.onCompleted.addListener(
  function (details) {
    console.log("Details from onCompleted (extraHeaders). Does this have cookie? ")
    console.log(details);
}, {
    urls: ["https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]
}, ['extraHeaders']
)




*/