console.log('Background js loaded..')

//Global
// let memberId = '515010937'; //TODO: Change this
let memberId = ''; //TODO: Change this


/* Read X-CSRF-TOKEN on Request Save */ 
// chrome.webNavigation.onBeforeNavigate.addListener(function(){
  chrome.webRequest.onBeforeSendHeaders.addListener(
    function(details) {
      // console.log('****onBeforeSendHeaders - get x-csrf-token******', details)
      if(details.requestHeaders.length > 0) {
        for(rh in details.requestHeaders) {
          if(details.requestHeaders[rh].name === 'X-CSRF-Token') {
            var item = { 'token' :  
              {
                'X-CSRF-Token': details.requestHeaders[rh].value,
                'createdDate': new Date().valueOf()
              }
            };
            chrome.storage.local.set(item, function () {
              // console.log('*** CSRF TOKEN *** ' , item , ' stored' )
            })
          }
        }
      }
    },
    {urls: [ "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*"]},
    ["requestHeaders"]
  )
// },{
//   url: [{hostContains:"marketingcloudapps.com"}]
// }); 


//Monitor Email Assets
chrome.webRequest.onBeforeRequest.addListener(
  async function(details) {
    //Global declariations

    var assetData = {}
    var assetId = null;
    var enterpriseId;

    //Email/ cloudpage saves
    if(details.method == 'PUT') { 
      //console.log('PUT method')
      // console.log(details)
      var assetType = "Email";
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
      memberId = putJson.memberId + '';

      /*Save to storage */
      assetData['body']= putBody;
      assetData['folderId']= folderId;
      assetData['folderName']= folderName;
      assetData['name']= name;
      assetData['timeStamp']= timeStamp;
      assetData['url']= url;
      assetData['assetId']= putJson.id;
      assetData['customerKey']= putJson.customerKey;
      assetData['memberId']= memberId;
      assetData['compiledHtml'] = compile(putJson, "email");

      let isDuplicateEmail = await isDuplicateRequestEmailRequest(memberId, assetData['compiledHtml']);
      if(isDuplicateEmail) 
      {
        console.info('Duplicate save request; not saved')
      } 
      else 
      {
        console.info('Save request processed')
        saveToLocal(memberId, assetType, assetId, assetData)
      }
      


    } else if(details.method == 'PATCH') {
      var type = "query";
      //From url, make a GET call and in response, get queryText
      var getEndpoint = details.url; 
      // console.log(getEndpoint)
      /* Get - Start */
      var csrfToken = ""//items['X-CSRF-Token'] ; //= getcsrfToken();
      // console.log('csrfToken is ' + csrfToken);
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
          // console.log('***THEN IN FETCH GET REQUEST.***')  
            // console.log(response);  
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
                
                saveToLocal(enterpriseId, 'Query', assetId, assetData)

                }
              );

        }) ;
      /* Get - End */       
    }
    else if(details.method == 'POST' && details.url.indexOf('querystudio.herokuapp.com/query/create') > -1 ) {
      // console.log('Query studio post request  -- check for header ' , details);
      //debugger;
      var assetData = {};
      var url = details.url;
      var statusCode = details.statusCode;
      var timeStamp = details.timeStamp;
      // console.log(url,statusCode,timeStamp);
      var bytesArray = new Uint8Array(details.requestBody.raw[0].bytes); 
      var stringArray = utf8ArrayToString(bytesArray);
      postBody = stringArray;

      postJson = JSON.parse(postBody);
      // console.log(postJson);
      var querytext = postJson.querytext; 

      /*Save to storage */
      assetData = {};
      assetData['body']= { 'querytext': querytext };
      assetData['timeStamp']= timeStamp;
      assetData['url']= url;
      
      saveToLocal(memberId, 'query_studio', timeStamp, assetData);
      
    }//if patch ends

  },
  { 
    urls: [  "https://*.marketingcloudapps.com/fuelapi/asset/v1/content/assets/*" //to save email/ cloudpage assets
            ,"https://*.marketingcloudapps.com/AutomationStudioFuel3/fuelapi/automation/v1/queries/*" //To save sql activities
            ,"https://querystudio.herokuapp.com/query/create" //Query studio activity
          ]
  },
  ['requestBody',chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean) 
);


/* To read Request header of query studio */ 
// chrome.webNavigation.onBeforeNavigate.addListener(function(){
//   chrome.webRequest.onBeforeSendHeaders.addListener(
//     function(details) {
//       console.log('****onBeforeSendHeaders - check header ******')
//       console.log(details);
//       if(details.requestHeaders.length > 0) {
//         for(rh in details.requestHeaders) {
//           if(details.requestHeaders[rh].name === 'X-CSRF-Token') {
//             var t = { 'X-CSRF-Token' : details.requestHeaders[rh].value}
//             chrome.storage.local.set(t, function () {
//               //console.log('*** CSRF TOKEN *** ' + t['X-CSRF-Token'] + ' stored' )
//             })
//           }
//         }
//       }
//     },
//     {urls: [ "https://querystudio.herokuapp.com/query/create" ]},
//     ["requestHeaders"]
//   )
// },{
//   url: [{hostContains:"herokuapp.com"}]
// }); 


//Global Functions 

function saveToLocal(memberId, assetType, assetId,assetData) {
  // console.log('SaveToLocal - Asset id - ' + assetId + ' - memberId - ' + memberId)
  // console.log(assetData)
  /* Save to storage */
  if(assetId == null) { 
    //typeof assetId === 'undefined'
    // console.log("No saves needed.")
  }else {
    // console.log(memberId);
    chrome.storage.local.get(memberId, function(items){
      // console.log(items);
      if(Object.keys(items).length > 0) { 
        if(assetType == 'Email' && Object.keys(items[memberId]['email']).length > 0) {
          items[memberId]['email'].push(assetData);
          // console.log('Emali Items already found. updaed item ' , items , ' with asset data ' , assetData)
          chrome.storage.local.set(items, function() {
            // console.log('New item stored');
            // console.log(items)
          });
        } else if(assetType == 'query_studio') {
          //Query studio key exists - so store there.
          items[memberId]['query_studio'].push(assetData);
          // console.log('Query studio Items already found. updaed item ' , items , ' with asset data ' , assetData)
          chrome.storage.local.set(items, function() {
            // console.log('New item stored');
            // console.log(items)
          });

        }
      }else{
        //Else means, no emails were saved previously for this BU. So, save it as new one;
        if(assetType == 'Email')
        {
          var newBUItem = {} 
          newBUItem[memberId] = {};
          
          newBUItem[memberId]['email'] = [];
          newBUItem[memberId]['query_studio'] = [];
          newBUItem[memberId]['cloud_pages'] = [];
          newBUItem[memberId]['automation_studio'] = [];

          newBUItem[memberId]['email'].push(assetData);
          chrome.storage.local.set(newBUItem, function() {
            // console.log('New item stored')
            // console.log(newBUItem)
          });
        }
        else if (assetType == 'query_studio') 
        {
          //Query studio key does not exist- so , store new
          var newBUItem = {} 
          newBUItem[memberId] = {};
          
          newBUItem[memberId]['email'] = [];
          newBUItem[memberId]['query_studio'] = [];
          newBUItem[memberId]['cloud_pages'] = [];
          newBUItem[memberId]['automation_studio'] = [];

          newBUItem[memberId]['query_studio'].push(assetData);
          chrome.storage.local.set(newBUItem, function() {
            // console.log('New query_studio item stored')
            // console.log(newBUItem)
          });
          // chrome.storage.local.get(memberId, function(qsItems) { 
          //   console.log('QS items fetched ' , qsItems)
          //   if(Object.keys(qsItems).length === 0) { 
          //     qsItems = {};
          //     qsItems['QueryStudioItems'] = [];
          //   } //MKTODO
          //   console.log(qsItems);
          //   qsItems['QueryStudioItems'].push( assetData );
          //   chrome.storage.local.set(qsItems, function() {
          //     console.log('New Query item stored')
          //     console.log(qsItems)
          //   }); 
          // });
        }
      }
    });
  }
}


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

async function isDuplicateRequestEmailRequest(memberId,compiledHtml) { 
  return new Promise((resolve, reject) => {
    var isDuplicate = false; 
    chrome.storage.local.get(null, function(items) {
      // console.log(Object.keys(items), Object.keys(items[memberId]) )
      if(Object.keys(items).includes(memberId)) 
      { 
        if(Object.keys(items[memberId]).includes('email')) 
        {
          for(i in items[memberId]['email']) {
            // console.log('Is duplicate request')
            // console.log(items[memberId]['email'][i]['compiledHtml'])
            if(items[memberId]['email'][i]['compiledHtml'] == compiledHtml ) {
              isDuplicate = true; 
              resolve(isDuplicate);
              break;
            }
          }
        }
      }
      resolve(isDuplicate);
    });
  });
}

/* SF CONTENT RENDERING METHOD - START */
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
/* SF CONTENT RENDERING METHOD - END */


