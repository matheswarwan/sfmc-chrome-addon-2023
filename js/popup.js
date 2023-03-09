console.log('popup loaded.')
//showToastMessage(true,'Addon loaded..');

/*
  Helper functions
*/
var selectedEmailId;
var selectedQueryKey;
var throttleMilliSeconds = 1000;
var currentBuid; 
var menuType;
var currentPage; 
var supportedPageTypes = ['Email', 'Query', 'QueryStudio'];

function resetUI() {
  //Modal hiding
  $('#ck-previewScreen-RevertButton').css({visibility: 'hidden'}); 
  $('#ck-svg-additionalDetails').css({visibility: 'hidden'}); 
  $('.ck-slds-additionalDetails').css({visibility: 'hidden'}); 

  //Menu hiding 
}

function setModalVisible(){ 
  ('.ck-slds-additionalDetails').css({visibility: 'visible'})
}

/*Getters*/ 
async function getPosFromStorage() { 
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('pos', function (items) {
      console.log('Position from local storage ' , items)
      resolve(items);
    });
  });
}

function getHtmlPreviewModal() {
  /* popup modal - start */ 
  var node_1 = document.createElement('SECTION');
  node_1.setAttribute('id', 'ck-docked-dialog');
  node_1.setAttribute('role', 'dialog');
  node_1.setAttribute('tabindex', '-1');
  node_1.setAttribute('aria-modal', 'true');
  node_1.setAttribute('aria-label', 'Meaningful description of the modal content');
  node_1.setAttribute('class', 'slds-modal slds-fade-in-open');

  var node_2 = document.createElement('DIV');
  node_2.setAttribute('class', 'slds-modal__container');
  node_2.setAttribute('style', 'width:100%'); //Override style width to 100%
  node_1.appendChild(node_2);

  var node_3 = document.createElement('BUTTON');
  node_3.setAttribute('class', 'slds-button slds-button_icon slds-modal__close slds-button_icon-inverse');
  node_3.setAttribute('style', 'top:1rem !important'); //Override .slds-modal__close class's top to 1 rem to display it in UI
  node_3.setAttribute('id', 'ck-previewScreen-CancelButton');
  node_2.appendChild(node_3);

  var node_4 = document.createElement('svg');
  node_4.setAttribute('class', 'slds-button__icon slds-button__icon_large');
  node_4.setAttribute('aria-hidden', 'true');
  node_3.appendChild(node_4);

  var closeSvg = `
  <div data-slds-icons-section="true" style="width:18px">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="close">
      <g>
      <path d="M31 25.4l13-13.1c.6-.6.6-1.5 0-2.1l-2-2.1c-.6-.6-1.5-.6-2.1 0L26.8 21.2c-.4.4-1 .4-1.4 0L12.3 8c-.6-.6-1.5-.6-2.1 0l-2.1 2.1c-.6.6-.6 1.5 0 2.1l13.1 13.1c.4.4.4 1 0 1.4L8 39.9c-.6.6-.6 1.5 0 2.1l2.1 2.1c.6.6 1.5.6 2.1 0L25.3 31c.4-.4 1-.4 1.4 0l13.1 13.1c.6.6 1.5.6 2.1 0L44 42c.6-.6.6-1.5 0-2.1L31 26.8c-.4-.4-.4-1 0-1.4z"/>
    </g>
    </svg>
  </div>`
  var node_5 = document.createElement('div');
  node_5.setAttribute('class', 'icons-min-height');
  node_5.innerHTML = closeSvg;
  node_4.appendChild(node_5);

  /* var node_5 = document.createElement('use');
  node_5.setAttribute('xlink:href', './images/symbols.svg#close');
  node_4.appendChild(node_5); */

  var node_6 = document.createElement('SPAN');
  node_6.setAttribute('class', 'slds-assistive-text');
  node_3.appendChild(node_6);

  var node_7 = document.createTextNode((new String("Cancel and close")));
  node_6.appendChild(node_7);

  var node_8 = document.createElement('DIV');
  node_8.setAttribute('class', 'slds-modal__content slds-p-around_medium slds-modal__content_headless');
  node_8.setAttribute('id', 'ck-dialog-emailPreview');
  var screenWidth = screen.width - 100;//Set width based on screen size
  node_8.setAttribute('style', 'overflow-x: auto;  border: 2px solid #dddbda;') ; //width:'+ screenWidth + 'px;'); //To enable horizontal scrolling; 
  //node_8.setAttribute('style', 'overflow-x: auto; width:'+ screenWidth + 'px;'); //To enable horizontal scrolling; 
  node_2.appendChild(node_8);

  //Additional Details to show subjectline and pre-header
  var additionalDetailsHTML = `<h3 class="slds-section__title">
  <button aria-controls="expando-unique-id" aria-expanded="false" class="slds-button slds-section__title-action">
    <div class="icons-min-height">
    <div data-slds-icons-section="true" style="width:15px">
      <svg id="ck-svg-additionalDetails"  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
        <path d="M47.6 17.8L27.1 38.5c-.6.6-1.6.6-2.2 0L4.4 17.8c-.6-.6-.6-1.6 0-2.2l2.2-2.2c.6-.6 1.6-.6 2.2 0l16.1 16.3c.6.6 1.6.6 2.2 0l16.1-16.3c.6-.6 1.6-.6 2.2 0l2.2 2.2c.5.7.5 1.6 0 2.2z"/>
      </svg>
    </div>
  </div>
    <span class="slds-truncate" title="Section Title" style="padding-left:10px">Additional Details</span>
  </button>
  </h3>
  <div aria-hidden="true" class="slds-section__content" id="expando-unique-id">
  <p class="slds-section__content ck-subjectline" style="padding-left:20px">SubjectLine: </p>
  <p class="slds-section__content ck-preheader" style="padding-bottom:20px; padding-left:20px">PreHeader: </p>
  </div>`
  var node_additionalDetails = document.createElement('DIV');
  node_additionalDetails.setAttribute('class', 'slds-section ck-slds-additionalDetails')
  node_additionalDetails.setAttribute('style', 'background-color:white; margin-top:0px; margin-bottom:0px;')
  node_additionalDetails.innerHTML = additionalDetailsHTML;
  node_2.appendChild(node_additionalDetails);

  var node_9 = document.createElement('DIV');
  node_9.setAttribute('class', 'slds-modal__footer');
  node_2.appendChild(node_9);


  var node_deleteButton = document.createElement('BUTTON');
  node_deleteButton.setAttribute('class', 'slds-button slds-button_text-destructive slds-float_left');
  node_deleteButton.setAttribute('id', 'ck-href-delete-local-storage');
  node_deleteButton.setAttribute('emailName', '');
  node_deleteButton.setAttribute('dateSaved', '');
  node_deleteButton.innerHTML = `Delete <div class="icons-min-height">
  <div data-slds-icons-section="true" style="width:15px; transform: translate(30%, -5%)">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="delete">
      <g>
          <path fill="#c23934" d="M45.5 10H33V6c0-2.2-1.8-4-4-4h-6c-2.2 0-4 1.8-4 4v4H6.5c-.8 0-1.5.7-1.5 1.5v3c0 .8.7 1.5 1.5 1.5h39c.8 0 1.5-.7 1.5-1.5v-3c0-.8-.7-1.5-1.5-1.5zM23 7c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v3h-6V7zM41.5 20h-31c-.8 0-1.5.7-1.5 1.5V45c0 2.8 2.2 5 5 5h24c2.8 0 5-2.2 5-5V21.5c0-.8-.7-1.5-1.5-1.5zM23 42c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1V28c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v14zm10 0c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1V28c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v14z"/>
      </g>
    </svg>
  </div>
  </div>`;
  node_9.appendChild(node_deleteButton);

  var node_10 = document.createElement('BUTTON');
  node_10.setAttribute('class', 'slds-button slds-button_neutral');
  node_10.setAttribute('aria-label', 'Cancel and close');
  node_10.setAttribute('id', 'ck-previewScreen-close');
  node_9.appendChild(node_10);

  var node_11 = document.createTextNode((new String("Cancel")));
  node_10.appendChild(node_11);

  var node_12 = document.createElement('BUTTON');
  node_12.setAttribute('class', 'slds-button slds-button_brand');
  node_12.setAttribute('id', 'ck-previewScreen-RevertButton');
  node_9.appendChild(node_12);

  var node_13 = document.createTextNode((new String("Restore")));
  node_12.appendChild(node_13);

  var node_14 = document.createElement('DIV');
  node_14.setAttribute('class', 'slds-docked_container');
  node_14.setAttribute('id', 'ck-slds-docked_container');
  node_14.setAttribute('style', 'position: absolute;z-index: 9;cursor: move;');

  var node_15 = document.createElement('DIV');
  node_15.setAttribute('class', 'slds-backdrop slds-backdrop_open');
  node_15.setAttribute('id', 'ck-backdrop-hidder');
  node_15.setAttribute('role', 'presentation');
  node_15.setAttribute('hidden', '');
  node_14.appendChild(node_15);

  var node_16 = document.createElement('DIV');
  node_16.setAttribute('class', 'slds-docked-composer slds-docked-composer_overflow');
  node_14.appendChild(node_16);

  var node_17 = document.createElement('BUTTON');
  node_17.setAttribute('class', 'slds-button slds-button_icon del-slds-docked-composer_overflow__button');
  node_17.setAttribute('aria-haspopup', 'true');
  //node_17.setAttribute('style', 'padding-right: 1rem !important');
  //node_17.setAttribute('style', 'display: block !important');
  node_17.setAttribute('id', 'ck-docker-button');
  node_16.appendChild(node_17);

  var node_18 = document.createElement('svg');
  node_18.setAttribute('class', 'slds-button__icon d-ck-docked-icon-counter');
  node_18.setAttribute('aria-hidden', 'true');
  node_17.appendChild(node_18);
  /*
  <div class="icons-min-height">
    <div data-slds-icons-section="true" class="" style="width:18px">
      <svg xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 52 52" id="clock"><g><path d="M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z"/><path d="M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z"/></g>
      </svg>
    </div>
  </div>
  */

  /* var node_19 = document.createElement('symbol');
  node_19.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  node_19.setAttribute('viewBox', '0 0 52 52');
  node_19.setAttribute('id', 'clock');
  node_19.innerHTML = '<g><path d="M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z"/><path d="M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z"/></g>'
  node_18.appendChild(node_19);
  */
  var node_19 = document.createElement('div');
  node_19.setAttribute('class','icons-min-height');
  node_19.innerHTML = `
  <div data-slds-icons-section="true" class="" style="width:15px">
      <svg xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 52 52" id="clock"><g><path d="M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z"/><path d="M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z"/></g>
      </svg>
    </div>`
  node_18.appendChild(node_19);
  /* var node_19 = document.createElement('use');
  node_19.setAttribute('xlink:href', './images/symbols.svg#clock');
  //node_19.setAttribute('style', 'height:100%; width:100%;');
  node_18.appendChild(node_19);  */

  var node_20 = document.createElement('SPAN');
  node_20.setAttribute('class', 'slds-text-body_small slds-m-left_xx-small ck-docked-icon-counter');
  node_20.setAttribute('id', 'ck-docked-icon-counter');
  node_17.appendChild(node_20);

  var node_21 = document.createTextNode((new String("0")));
  node_20.appendChild(node_21);

  var node_22 = document.createElement('DIV');
  node_22.setAttribute('class', 'slds-dropdown slds-dropdown_right slds-dropdown_bottom slds-dropdown_small slds-nubbin_bottom-right');
  node_22.setAttribute('hidden', '');
  node_22.setAttribute('id', 'ck-docker-popup');
  node_16.appendChild(node_22);

  var node_23 = document.createElement('UL');
  node_23.setAttribute('class', 'slds-dropdown__list slds-dropdown_length-with-icon-7');
  node_23.setAttribute('role', 'menu');
  node_23.setAttribute('id', 'ck-docker-popup-ul');
  node_22.appendChild(node_23);


  return node_1;
  //document.getElementById('body').appendChild(node_1);
  //console.log('Preview modal added...')

  /* popup modal - end */ 
}

function getHtmlPopupButton(){
  var node_1 = document.createElement('DIV');
  node_1.setAttribute('class', 'ck-main-addon slds-dropdown-trigger slds-dropdown-trigger_click slds-docked-composer slds-docked-composer_overflow slds-is-open shadow-drag');
  node_1.setAttribute('style', `max-width: 52px; width: 52px; max-height: 38px; height: 38px; border-radius: 3px; position: absolute; bottom: 0px; right: 38px; stroke: rgb(0, 101, 204); transition: stroke-width 1s ease 0s, stroke-dashoffset 1s ease 0s, stroke-dasharray 1s ease 0s; `); //additional styles
  node_1.setAttribute('id', 'ck-main-addon');


  var node_2 = document.createElement('BUTTON');
  node_2.setAttribute('class', 'slds-button slds-button_icon del-slds-docked-composer_overflow__button ck-main-addon-btn');
  node_2.setAttribute('title', 'Show More');
  node_2.setAttribute('style', 'padding:12px;');
  node_2.setAttribute('id', 'ck-main-addon-btn');
  node_1.appendChild(node_2); 
  
  var node_clockSVG = document.createElement('div');
  node_clockSVG.setAttribute('class','icons-min-height');
  node_clockSVG.innerHTML = `
  <div data-slds-icons-section="true" class="" style="width:15px">
      <svg xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 52 52" id="clock"><g><path d="M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z"/><path d="M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z"/></g>
      </svg>
    </div>`
    node_2.appendChild(node_clockSVG);
  
  var node_clocktext = document.createElement('SPAN');
  node_clocktext.setAttribute('class', 'slds-text-body_small slds-m-left_xx-small ck-docked-icon-counter');
  node_clocktext.setAttribute('id', 'ck-docked-icon-counter');
  node_clocktext.innerHTML = '0';
  node_2.appendChild(node_clocktext);
  
  var node_3 = document.createElement('DIV');
  node_3.setAttribute('class', 'slds-dropdown slds-dropdown_bottom ck-topMenu');
  node_3.setAttribute('id', 'ck-topMenu');
  node_3.setAttribute('style', 'width:240px;max-width:240px;left:-120px;margin-right:.25rem;display:inline-block;');
  node_1.appendChild(node_3);

  var node_4 = document.createElement('UL');
  node_4.setAttribute('class', 'slds-dropdown__list');
  node_4.setAttribute('id', 'ck-topMenu-ul');
  node_4.setAttribute('role', 'menu');
  node_4.setAttribute('aria-label', 'Show More');
  node_3.appendChild(node_4);

  //var clockIcon = createCounterIcon();
  //node_1.appendChild(clockIcon)
  return node_1; 
}

function getHtmlClearAllButton() {
  //Add DeleteAll Button
  var footer = document.createElement('footer');
  footer.setAttribute('class','slds-popover__footer');

  var ul = document.createElement('ul');
  var li = document.createElement('li');
  var button = document.createElement('button');
  button.setAttribute('class','slds-button slds-button_reset slds-p-vertical_xx-small slds-size_1-of-1')
  button.setAttribute('id','ck-href-delete-all-local-storage')
  button.innerText = 'Clear all'
  
  var div = document.createElement('div');
  div.setAttribute('class','icons-min-height');

  var svg = document.createElement('svg');
  svg.setAttribute('class','slds-button__icon slds-button__icon_left')
  svg.setAttribute('style','width:15px')
  
  var g = document.createElement('g');
  var path = document.createElement('path');
  path.setAttribute('fill','#c23934');
  path.setAttribute('viewBox','0 0 52 52');
  path.setAttribute('d','M45.5 10H33V6c0-2.2-1.8-4-4-4h-6c-2.2 0-4 1.8-4 4v4H6.5c-.8 0-1.5.7-1.5 1.5v3c0 .8.7 1.5 1.5 1.5h39c.8 0 1.5-.7 1.5-1.5v-3c0-.8-.7-1.5-1.5-1.5zM23 7c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v3h-6V7zM41.5 20h-31c-.8 0-1.5.7-1.5 1.5V45c0 2.8 2.2 5 5 5h24c2.8 0 5-2.2 5-5V21.5c0-.8-.7-1.5-1.5-1.5zM23 42c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1V28c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v14zm10 0c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1V28c0-.6.4-1 1-1h2c.6 0 1 .4 1 1v14z');

  g.appendChild(path);
  svg.appendChild(g);
  div.appendChild(svg);
  button.appendChild(div);
  li.appendChild(button);
  ul.appendChild(li);
  footer.appendChild(ul);

  return footer;
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

const getCurrentPage = async () => {  
  return new Promise((resolve, reject) => {
    /* if(document.URL.includes('cloud/#app/Email/C12/Default.aspx') || document.URL.includes('%23Content') || document.URL.includes('Content%20Builder')) {
      currentPage = 'Email';
    } else */
    if (document.URL.includes('Automation%20Studio')) {
      currentPage = 'Query';
    }else if (document.URL.includes('Query%20Studio')) {
      currentPage = 'QueryStudio';
    }else {
      currentPage = 'Email';
    }
    resolve(currentPage);
  });
}

const getData = async (menuType) => {  
  currentBuid = await getCurrentBuid();
  currentPage = await getCurrentPage();
  return new Promise((resolve, reject) => {
    

    if(supportedPageTypes.includes(currentPage)) {
      menuType = currentPage;
      console.log('Addon identified the current page as ' , currentPage)
    }

     chrome.storage.local.get(null, function (items) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      //data = items;
      if(menuType == 'Email') { 
        var itemsForThisBU = {}
        var keys = Object.keys(items).filter(key => key.includes(currentBuid));
        console.log('Matched keys for this BU ' , keys)
        for(i in items) {
            if(keys.includes(i)){
                itemsForThisBU[i] = items[i]
            }
        }

        itemsForThisBU = Object.keys(itemsForThisBU).sort().reverse().reduce(
          (obj, key) => { 
            obj[key] = itemsForThisBU[key]; 
            return obj;
          }, 
          {}
        );


        console.log('items to send back ' , itemsForThisBU)
        resolve(itemsForThisBU)
      } else if (menuType == 'Query') {
        var itemsForThisBU = {}
        var keys = Object.keys(items).filter(key => (key.includes('Query') && !key.includes('QueryStudioItems') && !key.includes('Query_undefined') ) );
        console.log('Matched keys for this BU ' , keys)
        for(i in items) {
            if(keys.includes(i)){
                itemsForThisBU[i] = items[i]
            }
        }

        itemsForThisBU = Object.keys(itemsForThisBU).sort().reverse().reduce(
          (obj, key) => { 
            obj[key] = itemsForThisBU[key]; 
            return obj;
          }, 
          {}
        );


        console.log('items to send back ' , itemsForThisBU)
        resolve(itemsForThisBU)
      } else if (menuType == 'QueryStudio') {
          var itemsForThisBU = {};
          var QueryStudioItems = items['QueryStudioItems'];
          for(qsi in QueryStudioItems) {
              //console.log(QueryStudioItems[qsi])
              var k  = Object.keys(QueryStudioItems[qsi])[0]
              itemsForThisBU[k] = QueryStudioItems[qsi][k]
          }
          console.log('items to send back for QS from local storage ' , itemsForThisBU)
          resolve(itemsForThisBU)
      }
    });  
  });
}

const getData_Query = async (selectedQueryKey) => {  
  return new Promise((resolve, reject) => {
    
     chrome.storage.local.get(selectedQueryKey, function (item) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      console.log('getData_Query item fetched ' , item)
      resolve(item)
      
    });  
  });
}

const getAllData = async () => {  
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, function (items) {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      data = items;
      console.log('items')
      console.log(items)
      resolve(items);
    });  
  });
}


// SF CONTENT RENDERING METHODs - getRefereence & compile
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

const pause = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};


const throttle = async (func, delay)=>{
  let prev = 0;
  return (...args) => {
    let now = new Date().getTime();
    if(now - prev> delay){
      prev = now;
      return func(...args); 
    }
  }
} 


/*
* itemNumber - starts from 1 
*/
function addMenuItemList(itemNumber, menuName, emailNames, emailsList) {


  var li = document.createElement('li');
  li.setAttribute('class', 'slds-dropdown__item ck-menu-item')
  li.setAttribute('id', 'ck-menu-item-'+itemNumber)
  li.setAttribute('role', 'presentation')
  li.setAttribute('menuNumber', itemNumber)

  //Arrow icon 
  var div1 = document.createElement('div');
  div1.setAttribute('class', 'icons-min-height ck-menu-item-svg')
  div1.setAttribute('style', 'display:inline-flex')
  div1.setAttribute('id', 'ck-menu-item-'+itemNumber+'-svg')

  var div2 = document.createElement('div');
  div2.setAttribute('data-slds-icons-section', 'true')
  div2.setAttribute('style', 'width:15px')
  div2.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="left">
    <path d="M38 8.3v35.4c0 1-1.3 1.7-2.2.9L14.6 27.3c-.8-.6-.8-1.9 0-2.5L35.8 7.3c.9-.7 2.2-.1 2.2 1z"/>
  </svg>`

  /* var svg = document.createElement('svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('viewBox', '0 0 52 52')
  svg.innerHTML = '<path d="M38 8.3v35.4c0 1-1.3 1.7-2.2.9L14.6 27.3c-.8-.6-.8-1.9 0-2.5L35.8 7.3c.9-.7 2.2-.1 2.2 1z"/>'

  var path = document.createElement('path');
  path.setAttribute('d', 'M38 8.3v35.4c0 1-1.3 1.7-2.2.9L14.6 27.3c-.8-.6-.8-1.9 0-2.5L35.8 7.3c.9-.7 2.2-.1 2.2 1z') */ 
  
  var a = document.createElement('a');
  a.setAttribute('href', '#')
  a.setAttribute('role', 'menuitem')
  a.setAttribute('tabindex', (itemNumber-1))
  
  var span = document.createElement('span');
  span.setAttribute('class', 'slds-truncate')
  span.setAttribute('title', menuName)
  span.innerHTML = menuName;


  var subMenuDiv = addSubMenuItems(emailNames, emailsList, menuName, itemNumber)

  div1.appendChild(div2);    
  a.appendChild(div1);
  a.appendChild(span);
  li.appendChild(a);
  li.appendChild(subMenuDiv);
  
  //hide sub-menu by default
  //$(subMenuDiv).css({visibility: 'hidden'});
  $(subMenuDiv).css({
    visibility: 'hidden'
  });

  return li; 
}
  
function addSubMenuItems(emailNames, emailsList, emailName, menuNumber){

  var subMenuTabIndex = 0;

  var div = document.createElement('div');
  div.setAttribute('class', 'slds-dropdown slds-dropdown_submenu slds-dropdown_submenu-left slds-dropdown_bottom ck-subMenu-item')
  div.setAttribute('id', 'ck-subMenu-item-'+menuNumber)
  div.setAttribute('parentMenuNumber', menuNumber)
  div.setAttribute('style', 'max-width:240px;left:auto;right:140px;margin-right:0.5rem;bottom:' + (34* ((emailNames.length)-Number(menuNumber))) + 'px;')
  //console.log('Submenu pixel rates ' , (34* ((emailNames.length)-Number(menuNumber))) )

  var ul = document.createElement('ul');
  ul.setAttribute('class', 'slds-dropdown__list')
  ul.setAttribute('role', 'menu')
  ul.setAttribute('aria-label', 'Menu Item ' + emailName)

  for(i in emailsList){
    if(emailsList[i]['emailName'] == emailName) {
      var emailKey = emailsList[i]['key']
      var listLabel =
          emailsList[i]['time'].getMonth() +
        1 +
        "/" +
          emailsList[i]['time'].getDate() +
        "/" +
          emailsList[i]['time'].getFullYear() +
        " at " +
        ( emailsList[i]['time'].getHours() % 12) +
        ":" +
          emailsList[i]['time'].getMinutes() +
        ":" + 
          emailsList[i]['time'].getSeconds() +
        " " +
        ( emailsList[i]['time'].getHours() > 12 ? "PM" : "AM");
        
      var li = document.createElement('li');
      li.setAttribute('class', 'slds-dropdown__item ck-subMenu-li')
      li.setAttribute('id', 'ck-subMenu-li-'+subMenuTabIndex)
      li.setAttribute('role', 'presentation')
      
      var a = document.createElement('a');
      a.setAttribute('href', '#')
      a.setAttribute('role', 'menuitem')
      a.setAttribute('tabindex', subMenuTabIndex);
      subMenuTabIndex++;
      
      var span = document.createElement('span');
      span.setAttribute('class', 'slds-truncate')
      span.setAttribute('title',listLabel)
      span.innerHTML = listLabel;
      console.log(listLabel)
  
      var spanDup = document.createElement('span');
      spanDup.setAttribute('class', 'ck-previewEmail')
      spanDup.innerHTML = ` <button
      class="slds-button slds-button_icon del-slds-docked-composer_overflow__button"
      aria-haspopup="true"
      style=""
      emailName = "${emailKey}"
      dateSaved = "${listLabel}"
      >
      <div class="icons-min-height ck-preview-icon ck-subMenu-item-svg">
        <div data-slds-icons-section="true" style="width:15px; display:inline-flex; ">
          <svg viewBox="0 0 52 52" id="preview_${listLabel}" xmlns="http://www.w3.org/2000/svg">
            <g>
                <path d="M51.8 25.1C47.1 15.6 37.3 9 26 9S4.9 15.6.2 25.1c-.3.6-.3 1.3 0 1.8C4.9 36.4 14.7 43 26 43s21.1-6.6 25.8-16.1c.3-.6.3-1.2 0-1.8zM26 37c-6.1 0-11-4.9-11-11s4.9-11 11-11 11 4.9 11 11-4.9 11-11 11z" />
                <path d="M26 19c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7z" />
            </g>
          </svg>
        </div>
      </div>
      </button>`;
      span.appendChild(spanDup);
  
      
      a.appendChild(span);
      li.appendChild(a);
      ul.appendChild(li);
    }
  }

  div.appendChild(ul)
  return div; 
}

function addMenuItemList_Query(
  itemNumber,  //Item position 
  menuName, //Query Activity Name
  queryNames, //list of all Queries 
  queryData //All query data (raw)
  ) {


  var li = document.createElement('li');
  li.setAttribute('class', 'slds-dropdown__item ck-menu-item')
  li.setAttribute('id', 'ck-menu-item-'+itemNumber)
  li.setAttribute('role', 'presentation')
  li.setAttribute('menuNumber', itemNumber)

  //Arrow icon 
  var div1 = document.createElement('div');
  div1.setAttribute('class', 'icons-min-height ck-menu-item-svg')
  div1.setAttribute('style', 'display:inline-flex')
  div1.setAttribute('id', 'ck-menu-item-'+itemNumber+'-svg')

  var div2 = document.createElement('div');
  div2.setAttribute('data-slds-icons-section', 'true')
  div2.setAttribute('style', 'width:15px')
  div2.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="left">
    <path d="M38 8.3v35.4c0 1-1.3 1.7-2.2.9L14.6 27.3c-.8-.6-.8-1.9 0-2.5L35.8 7.3c.9-.7 2.2-.1 2.2 1z"/>
  </svg>`

  /* var svg = document.createElement('svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  svg.setAttribute('viewBox', '0 0 52 52')
  svg.innerHTML = '<path d="M38 8.3v35.4c0 1-1.3 1.7-2.2.9L14.6 27.3c-.8-.6-.8-1.9 0-2.5L35.8 7.3c.9-.7 2.2-.1 2.2 1z"/>'

  var path = document.createElement('path');
  path.setAttribute('d', 'M38 8.3v35.4c0 1-1.3 1.7-2.2.9L14.6 27.3c-.8-.6-.8-1.9 0-2.5L35.8 7.3c.9-.7 2.2-.1 2.2 1z') */ 
  
  var a = document.createElement('a');
  a.setAttribute('href', '#')
  a.setAttribute('role', 'menuitem')
  a.setAttribute('tabindex', (itemNumber-1))
  
  var span = document.createElement('span');
  span.setAttribute('class', 'slds-truncate')
  span.setAttribute('title', menuName)
  span.innerHTML = menuName;


  var subMenuDiv = addSubMenuItems_Query(itemNumber, menuName, queryNames, queryData )

  div1.appendChild(div2);    
  a.appendChild(div1);
  a.appendChild(span);
  li.appendChild(a);
  li.appendChild(subMenuDiv);
  
  //hide sub-menu by default
  $(subMenuDiv).css({
    visibility: 'hidden'
  });

  return li; 
}
  
function addSubMenuItems_Query(itemNumber, menuName, queryNames, queryData ){

  var subMenuTabIndex = 0;

  var div = document.createElement('div');
  div.setAttribute('class', 'slds-dropdown slds-dropdown_submenu slds-dropdown_submenu-left slds-dropdown_bottom ck-subMenu-item')
  div.setAttribute('id', 'ck-subMenu-item-'+itemNumber)
  div.setAttribute('parentMenuNumber', itemNumber)
  div.setAttribute('style', 'max-width:240px;left:auto;right:140px;margin-right:.25rem;bottom:' + (34* ((queryNames.length)-Number(itemNumber))) + 'px;')
  //console.log('Submenu pixel rates ' , (34* ((emailNames.length)-Number(menuNumber))) )

  var ul = document.createElement('ul');
  ul.setAttribute('class', 'slds-dropdown__list')
  ul.setAttribute('role', 'menu')
  ul.setAttribute('aria-label', 'Menu Item ' + menuName)

  for(i in queryData){
    if(queryData[i]['name'] == menuName) {
      var emailKey = null;
      var queryKey = i
      var modifiedDate = new Date(queryData[i]['modifiedDate']);
      var listLabel =
          modifiedDate.getMonth() +
        1 +
        "/" +
          modifiedDate.getDate() +
        "/" +
          modifiedDate.getFullYear() +
        " at " +
        ( modifiedDate.getHours() % 12) +
        ":" +
          modifiedDate.getMinutes() +
        ":" + 
          modifiedDate.getSeconds() +
        " " +
        ( modifiedDate.getHours() > 12 ? "PM" : "AM");
        
      var li = document.createElement('li');
      li.setAttribute('class', 'slds-dropdown__item ck-subMenu-li')
      li.setAttribute('id', 'ck-subMenu-li-'+subMenuTabIndex)
      li.setAttribute('role', 'presentation')
      
      var a = document.createElement('a');
      a.setAttribute('href', '#')
      a.setAttribute('role', 'menuitem')
      a.setAttribute('tabindex', subMenuTabIndex);
      subMenuTabIndex++;
      
      var span = document.createElement('span');
      span.setAttribute('class', 'slds-truncate')
      span.setAttribute('title',listLabel)
      span.innerHTML = listLabel;
      console.log(listLabel)
  
      var spanDup = document.createElement('span');
      spanDup.setAttribute('class', 'ck-previewEmail')
      spanDup.innerHTML = ` <button
      class="slds-button slds-button_icon del-slds-docked-composer_overflow__button"
      aria-haspopup="true"
      style="padding-right: 1rem !important"
      emailName = "${emailKey}"
      queryKey = "${queryKey}"
      dateSaved = "${listLabel}"
      >
      <div class="icons-min-height ck-preview-icon ck-subMenu-item-svg">
        <div data-slds-icons-section="true" style="width:15px; display:inline-flex;">
          <svg viewBox="0 0 52 52" id="preview_${listLabel}" xmlns="http://www.w3.org/2000/svg">
            <g>
                <path d="M51.8 25.1C47.1 15.6 37.3 9 26 9S4.9 15.6.2 25.1c-.3.6-.3 1.3 0 1.8C4.9 36.4 14.7 43 26 43s21.1-6.6 25.8-16.1c.3-.6.3-1.2 0-1.8zM26 37c-6.1 0-11-4.9-11-11s4.9-11 11-11 11 4.9 11 11-4.9 11-11 11z" />
                <path d="M26 19c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7z" />
            </g>
          </svg>
        </div>
      </div>
      </button>`;
      span.appendChild(spanDup);
  
      
      a.appendChild(span);
      li.appendChild(a);
      ul.appendChild(li);
    }
  }

  div.appendChild(ul)
  return div; 
}

function addMenuItemList_QS(
  itemNumber,  //Item position 
  menuName, //Query Activity Name
  queryNames, //list of all Queries 
  queryData //All query data (raw)
  ) {

  //STUB - Temp - hide layout
  $('#ck-docked-dialog').css({
    visibility: 'hidden'
  });

  var modifiedDate = new Date(Number(menuName));
  var listLabel =
      modifiedDate.getMonth() +
    1 +
    "/" +
      modifiedDate.getDate() +
    "/" +
      modifiedDate.getFullYear() +
    " at " +
    ( modifiedDate.getHours() % 12) +
    ":" +
      modifiedDate.getMinutes() +
    ":" + 
      modifiedDate.getSeconds() +
    " " +
    ( modifiedDate.getHours() > 12 ? "PM" : "AM");

  var li = document.createElement('li');
  li.setAttribute('class', 'slds-dropdown__item ck-menu-item')
  li.setAttribute('id', 'ck-menu-item-'+itemNumber)
  li.setAttribute('role', 'presentation')
  li.setAttribute('menuNumber', itemNumber)
  li.setAttribute('style', 'padding:10px !important; text-align:center;')

  //Arrow icon 
 var div1 = document.createElement('div');
  div1.setAttribute('class', 'icons-min-height ck-menu-item-svg')
  div1.setAttribute('style', 'display:inline-flex')
  div1.setAttribute('id', 'ck-menu-item-'+itemNumber+'-svg')

 /*  var div2 = document.createElement('div');
  div2.setAttribute('data-slds-icons-section', 'true')
  div2.setAttribute('style', 'width:15px')
  div2.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="left">
    <path d="M38 8.3v35.4c0 1-1.3 1.7-2.2.9L14.6 27.3c-.8-.6-.8-1.9 0-2.5L35.8 7.3c.9-.7 2.2-.1 2.2 1z"/>
  </svg>`
  
  var a = document.createElement('a');
  a.setAttribute('href', '#')
  a.setAttribute('role', 'menuitem')
  a.setAttribute('tabindex', (itemNumber-1))
  
  var span = document.createElement('span');
  span.setAttribute('class', 'slds-truncate')
  span.setAttribute('title', menuName)
  span.innerHTML = menuName; */

  var spanDup = document.createElement('span');
  spanDup.setAttribute('class', 'ck-previewEmail')
  spanDup.innerHTML = ` <button
  class="slds-button slds-button_icon del-slds-docked-composer_overflow__button"
  aria-haspopup="true"
  style=""
  emailName = "${menuName}"
  queryKey = "${menuName}"
  dateSaved = "${menuName}"
  >
  <div class="icons-min-height ck-preview-icon ck-subMenu-item-svg" style="display:inline-flex; padding-right:15px !important;">
    <div data-slds-icons-section="true" style="width:15px">
      <svg viewBox="0 0 52 52" id="preview_${menuName}" xmlns="http://www.w3.org/2000/svg">
        <g>
            <path d="M51.8 25.1C47.1 15.6 37.3 9 26 9S4.9 15.6.2 25.1c-.3.6-.3 1.3 0 1.8C4.9 36.4 14.7 43 26 43s21.1-6.6 25.8-16.1c.3-.6.3-1.2 0-1.8zM26 37c-6.1 0-11-4.9-11-11s4.9-11 11-11 11 4.9 11 11-4.9 11-11 11z" />
            <path d="M26 19c-3.9 0-7 3.1-7 7s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7z" />
        </g>
      </svg>
    </div>
  </div>
  ${listLabel}
  </button>`;
  
  //div1.appendChild(spanDup);
  li.appendChild(spanDup);
  console.log(li)


  //var subMenuDiv = addSubMenuItems_Query(itemNumber, menuName, queryNames, queryData )
  console.log(queryData[menuName])
  console.log(queryData[menuName]['body'])
  console.log(queryData[menuName]['body']['querytext'])

  //div1.appendChild(div2);    
  //a.appendChild(div1);
  //a.appendChild(span);
  //li.appendChild(a);
  //li.appendChild(subMenuDiv);
  
  //hide sub-menu by default
  //$(subMenuDiv).css({visibility: 'hidden'});

  return li; 
}

async function updateMenuCount(menuType){
  var data = await getData(menuType);
  var dataLength = Object.keys(data).length;
  console.log('Update Menu Count to ', dataLength , data)
  $('#ck-docked-icon-counter').empty().text(dataLength);
}

function createCounterIcon(emailName){
/*
<div class="slds-docked-composer slds-docked-composer_overflow" style="width:50px;">
        <button
          class="slds-button slds-button_icon slds-docked-composer_overflow__button"
          aria-haspopup="true"
          style="display: block !important; "
          id="ck-docker-button"
        >
                <svg xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 52 52" id="clock"><g><path d="M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z"/><path d="M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z"/></g>
                </svg>
          <span
            class="slds-text-body_small slds-m-left_xx-small ck-docked-icon-counter"
            id="ck-docked-icon-counter"
            >0
          </span>
        </button>
        </div>
*/


  var node_1 = document.createElement('SPAN');
  node_1.setAttribute('id', 'ck-docked-icon-counter');
  node_1.setAttribute('class', 'slds-button__icon slds-text-body_small slds-m-left_xx-small ck-docked-icon-counter');

  var node_2 = document.createElement('DIV');
  node_2.setAttribute('class', 'icons-min-height');
  node_2.setAttribute('id', 'ck-docked-icon-counter');
  node_2.setAttribute('style', 'display: inline-block;');
  node_1.appendChild(node_2);

  var node_3 = document.createElement('DIV');
  node_3.setAttribute('data-slds-icons-section', 'true');
  node_3.setAttribute('class', '');
  node_3.setAttribute('style', 'width:15px');
  node_2.appendChild(node_3);

  var node_4 = document.createElement('svg');
  node_4.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  node_4.setAttribute('viewBox', '0 0 52 52');
  node_4.setAttribute('id', 'clock');
  node_3.appendChild(node_4);

  var node_5 = document.createElement('g');
  node_4.appendChild(node_5);

  var node_6 = document.createElement('path');
  node_6.setAttribute('d', 'M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z');
  node_5.appendChild(node_6);

  var node_7 = document.createElement('path');
  node_7.setAttribute('d', 'M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z');
  node_5.appendChild(node_7);

  console.log('Counter icon = ' , node_1)

  return node_1;

}
function createCounterIcon_old(emailName){
  //<span class="slds-text-body_small slds-m-left_xx-small ck-docked-icon-counter" id="ck-docked-icon-counter">0</span>
  //</button>
/* <span id="ck-docked-icon-counter" class="slds-button__icon slds-text-body_small slds-m-left_xx-small ck-docked-icon-counter">
<div class="icons-min-height" id="ck-docked-icon-counter" style="display: inline-block;">5
  <div data-slds-icons-section="true" class="" style="width:15px">
      <svg xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 52 52" id="clock"><g><path d="M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z"/><path d="M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z"/></g>
      </svg>
  </div>
</div>
</span> */

  var node_1 = document.createElement('SPAN');
  node_1.setAttribute('id', 'ck-docked-icon-counter');
  node_1.setAttribute('class', 'slds-button__icon slds-text-body_small slds-m-left_xx-small ck-docked-icon-counter');

  var node_2 = document.createElement('DIV');
  node_2.setAttribute('class', 'icons-min-height');
  node_2.setAttribute('id', 'ck-docked-icon-counter');
  node_2.setAttribute('style', 'display: inline-block;');
  node_1.appendChild(node_2);

  var node_3 = document.createElement('DIV');
  node_3.setAttribute('data-slds-icons-section', 'true');
  node_3.setAttribute('class', '');
  node_3.setAttribute('style', 'width:15px');
  node_2.appendChild(node_3);

  var node_4 = document.createElement('svg');
  node_4.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  node_4.setAttribute('viewBox', '0 0 52 52');
  node_4.setAttribute('id', 'clock');
  node_3.appendChild(node_4);

  var node_5 = document.createElement('g');
  node_4.appendChild(node_5);

  var node_6 = document.createElement('path');
  node_6.setAttribute('d', 'M26 2C12.8 2 2 12.8 2 26s10.8 24 24 24 24-10.8 24-24S39.2 2 26 2zm0 42c-9.9 0-18-8.1-18-18S16.1 8 26 8s18 8.1 18 18-8.1 18-18 18z');
  node_5.appendChild(node_6);

  var node_7 = document.createElement('path');
  node_7.setAttribute('d', 'M29.4 26.2c-.3-.3-.4-.7-.4-1.1v-9.6c0-.8-.7-1.5-1.5-1.5h-3c-.8 0-1.5.7-1.5 1.5v12.1c0 .4.2.8.4 1.1l7.4 7.4c.6.6 1.5.6 2.1 0L35 34c.6-.6.6-1.5 0-2.1l-5.6-5.7z');
  node_5.appendChild(node_7);

  
  console.log('Counter icon = ' , node_1)

  return node_1;
  //$('.ck-docked-icon-counter').text(emailName.length);
  //$('.ck-main-addon-btn').append(node_18)
  //$('.ck-main-addon-btn').append(span)
}

function sendMessage(data){
  return new Promise((resolve, reject) => {
    
    chrome.runtime.sendMessage( data , async function(response) { 
        console.log('Addonconfig stored')
        resolve(true);
    });

  });
}

function dragElement(elmnt) 
{
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0, leftPos;
  // otherwise, move the DIV from anywhere inside the DIV:
  elmnt.onmousedown = dragMouseDown;
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    //elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; //Make it only draggable in bottom
    leftPos = (elmnt.offsetLeft - pos1) + "px";
    elmnt.style.left = leftPos;
    //console.log('save this ' , leftPos);
    
  }

  function closeDragElement(e) {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;

    var data = { 
      'action': 'config',
      'addonConfig' : {
        'pos': {
          'left': elmnt.style.left
        }
      }
    }
    //console.log('Stopped moving. Save this ? ' , data)
    throttle( () =>  sendMessage(data) );
  }
}

async function updateDockerIconCount(){
  var data = await getData();
  var keys = Object.keys(data);
  var dataLength = keys.filter(key => key.includes('_')).length; //Exclude xcsrf & other invalid keys
  //console.log('****Update docker icon count to **** ', dataLength , ' at time ' , new Date() )
  

  //$('#ck-main-addon').text(dataLength);
  $('#ck-docked-icon-counter').empty().text(dataLength);
  //Always close the popup
  $('#ck-docker-popup').css({visibility: 'hidden'}); 
  $("#ck-docked-dialog").css({visibility: 'hidden'}); 
  $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

}

const showQueryPreview = async (selectedQueryKey) => {
  $("#ck-topMenu").css({visibility: 'hidden'}); 
  $('#ck-previewScreen-RevertButton').css({visibility: 'visible'}); 

  console.log('Show Query Preview ' + selectedQueryKey);

  var data = await getData_Query(selectedQueryKey);
  console.log('data for selectedQueryKey at showQueryPreview: ', data);
  

  var rawBody = data[selectedQueryKey]['queryText'];
  var url = data[selectedQueryKey]['url'];
  if(url.split('AutomationStudioFuel3/fuelapi/automation/v1/queries/')[1] == '') {
    $('#ck-previewScreen-RevertButton').css({visibility: 'hidden'}); 
  } else {
    $('#ck-previewScreen-RevertButton').css({visibility: 'visible'}); 
  }
  //rawBody = rawBody.replace(/(?:\r\n|\r|\n)/g, '<br>')
  var targetName = data[selectedQueryKey]['body']['targetName']
  var targetUpdateTypeName = data[selectedQueryKey]['body']['targetUpdateTypeName']
  var targetDescription = data[selectedQueryKey]['body']['targetDescription']

  var taTag = ` <textarea id="queryTextArea" style="display:block;width:100%; height:`+$(document).height() / 2 +`px;" cols="50"></textarea> `;
  $('#ck-dialog-emailPreview').html(taTag);

  var myTextArea = document.getElementById('queryTextArea');
  var editor = CodeMirror.fromTextArea(myTextArea, {
    lineNumbers: true,
    //mode: "javascript",
    mode: "text/x-sql",
    extraKeys: {"Ctrl-Space": "autocomplete"}, // To invoke the auto complete
    autoRefresh: true
    //hint: CodeMirror.hint.sql
  });
  editor.setValue(rawBody);
  editor.refresh();
  console.log(CodeMirror.modes )
  console.log(CodeMirror.mimeModes)
  //editor.CodeMirror.refresh();


  showAdditionalDetails_Query(targetName, targetUpdateTypeName, targetDescription);
  setAdditionalDetailsCSS();

}

const showQSPreview = async (selectedQueryKey) => {
  $("#ck-topMenu").css({visibility: 'hidden'}); 
  $('#ck-previewScreen-RevertButton').css({visibility: 'visible'}); 
  console.log('Show QS Preview ' + selectedQueryKey);

  var data = await getData('QueryStudio');
  console.log('selectedQueryKey at showQSPreview: ', data);


  var rawBody = '';
  for(key in data) {
    //var key = Object.keys(data[d])[0];
    if(key == selectedQueryKey){
      rawBody = data[key];
      break;
    }
  }

  var queryText = rawBody['body']['querytext']
  var timeStamp = new Date(rawBody['timeStamp'])
  
  var taTag = ` <textarea id="queryTextArea" style="display:block;width:100%; height:`+$(document).height() / 2 +`px;" cols="50"></textarea> `;
  $('#ck-dialog-emailPreview').html(taTag);

  var myTextArea = document.getElementById('queryTextArea');
  var editor = CodeMirror.fromTextArea(myTextArea, {
    lineNumbers: true,
    //mode: "javascript",
    mode: "text/x-sql",
    extraKeys: {"Ctrl-Space": "autocomplete"}, // To invoke the auto complete
    autoRefresh: true
    //hint: CodeMirror.hint.sql
  });
  editor.setValue(queryText);
  editor.refresh();
  console.log(CodeMirror.modes )
  console.log(CodeMirror.mimeModes)
  //editor.CodeMirror.refresh();


  showAdditionalDetails_QS(timeStamp);
  setAdditionalDetailsCSS();
  changeRestoreButton_QS(selectedQueryKey, queryText);

}


function showAdditionalDetails_QS(timeStamp){
  var modifiedDate = new Date(Number(timeStamp));
  var listLabel =
      modifiedDate.getMonth() +
    1 +
    "/" +
      modifiedDate.getDate() +
    "/" +
      modifiedDate.getFullYear() +
    " at " +
    ( modifiedDate.getHours() % 12) +
    ":" +
      modifiedDate.getMinutes() +
    ":" + 
      modifiedDate.getSeconds() +
    " " +
    ( modifiedDate.getHours() > 12 ? "PM" : "AM");
  $(".ck-subjectline").html('<b>Executed/ Saved on:</b> ' + listLabel);
  $(".ck-preheader").html('');
}

function changeRestoreButton_QS(selectedQueryKey, queryText) {
  $('#ck-previewScreen-RevertButton').html('Copy SQL');
  $('#ck-previewScreen-RevertButton').on('click', function() { 
    navigator.clipboard.writeText(queryText);
    //alert('Query Copied to clipboard')
  });
  $("#ck-href-delete-local-storage").on('click',async function () {
  
  if(selectedQueryKey != null){ 
    console.log('Delete selectedQueryKey in QS ', selectedQueryKey)
    await removeRequest_QS(selectedQueryKey);

    $("#ck-docker-popup").css({visibility: 'hidden'}); 
    //MK TODO: Update the counter in docker popup - ck-docked-icon-counter
    await updateDockerIconCount();
  } else {
      console.error("No Email selected for deletion!");
  }  
});
  
  
}


function showAdditionalDetails_Query(targetName, targetUpdateTypeName, targetDescription){
  $(".ck-subjectline").html('<b>Target Name:</b> ' + targetName 
    + '<br> <b>Update Type:</b> ' + targetUpdateTypeName
    + '<br> <b>Description: </b>' + targetDescription);
  $(".ck-preheader").html('');
}

const showEmailPreview = async (emailId) => {
  $("#ck-topMenu").css({visibility: 'hidden'}); 
  $('#ck-previewScreen-RevertButton').css({visibility: 'visible', lineNo: 1249}); 
  
  selectedEmailId = emailId; 
  console.log('Show Email Preview ' + emailId);

  var data = await getData('Email');
  console.log(data);


  var rawBody = data[emailId]['body'];
  var emailHtml = data[emailId]['compiledHtml'];
  var winHeight = window.innerHeight - 100; 
  ckIframe = `<iframe id="ck-email-preview-iframe-v2" width="100%" height="` +winHeight+ `px" frameborder="0" style="border:none;"></iframe>`;
  $('#ck-dialog-emailPreview').html(ckIframe);
  document.getElementById('ck-email-preview-iframe-v2').src = "data:text/html;charset=utf-8," + escape(emailHtml);//https://stackoverflow.com/questions/38731161/loading-a-string-if-html-into-an-iframe-using-javascript

  showSubjectLine(JSON.parse(rawBody));
  setAdditionalDetailsCSS();

}

function setAdditionalDetailsCSS(){
  
  //SubjectLine preheader section - set icon to > on page load and remove slds-is-open css class to close section 
  $('.ck-slds-additionalDetails').css({
    'border': '2px solid #dddbda;'
  })
  $('.ck-slds-additionalDetails').removeClass('slds-is-open');
  $('#ck-svg-additionalDetails').css({
    "-webkit-transform" : "rotate(270deg)",
    "transform" : "rotate(270deg)"
  });
  $('#ck-svg-additionalDetails').css({visibility: 'visible'}); 

  //Toggle Additional Details section to show/ hide subject/ preheader
  $('.ck-slds-additionalDetails').on('click', 
  function() {
    //Show / hide details
    $('.ck-slds-additionalDetails').toggleClass('slds-is-open')

    var isSldsOpen = $('.ck-slds-additionalDetails').attr('class').includes('slds-is-open'); 
    if( isSldsOpen ) { 
      //Section is open - change arrow
      $('#ck-svg-additionalDetails').css({
        "-webkit-transform" : "rotate(0deg)",
        "transform" : "rotate(0deg)"
      });
      $('#ck-svg-additionalDetails').css({visibility: 'visible'});
    } else {
      //Section is closed 
      $('#ck-svg-additionalDetails').css({
        "-webkit-transform" : "rotate(270deg)",
        "transform" : "rotate(270deg)"
      });
      $('#ck-svg-additionalDetails').css({visibility: 'visible'});
    }

    }
  );

  console.log('Additional Details should be clickable')
}

function showSubjectLine(bodyJson){
  var subjectLine, preHeader; 
  console.log(bodyJson);
  //Set Subject Line and Preheader
  if(Object.keys(bodyJson).includes('views')) {
    if(Object.keys(bodyJson.views).includes('subjectline')) {
      if(Object.keys(bodyJson.views.subjectline).includes('content')) {
        subjectLine = bodyJson.views.subjectline.content; 
        $(".ck-subjectline").html('Subject: ' + subjectLine );
      } else {
        subjectLine = '';
        $(".ck-subjectline").html('Subject: ');
      }
    }

    if( Object.keys(bodyJson.views).includes('preheader') ){
      if(Object.keys(bodyJson.views.preheader).includes('content')) {
        preHeader = bodyJson.views.preheader.content; 
        $(".ck-preheader").html('Preheader: ' + preHeader );
      } else {
        preHeader = '';
        $(".ck-preheader").html('Preheader: ' );
      }
    }
  } else {
    //this type of content block doesn't have sl / ph 
    $(".ck-subjectline").html('SubjectLine/ Preheader not available for this content block.');
    $(".ck-preheader").html('');
  }
}

function showToastMessage(status, message) {

  $('#body').find('.ck-restore-toast-message').remove();

  var div = document.createElement('div');
  div.setAttribute('class','slds-notify_container slds-is-relative ck-restore-toast-message');
  
  if(status) { 
    div.innerHTML = `<div class="slds-notify slds-notify_toast slds-theme_success" role="status">
      <span class="slds-assistive-text">success</span>
      <span class="slds-icon_container slds-icon-utility-success slds-m-right_small slds-no-flex slds-align-top" title="Description of icon when needed">
      <svg class="slds-icon slds-icon_small" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="success"><path d="M26 2C12.7 2 2 12.7 2 26s10.7 24 24 24 24-10.7 24-24S39.3 2 26 2zm13.4 18L24.1 35.5c-.6.6-1.6.6-2.2 0L13.5 27c-.6-.6-.6-1.6 0-2.2l2.2-2.2c.6-.6 1.6-.6 2.2 0l4.4 4.5c.4.4 1.1.4 1.5 0L35 15.5c.6-.6 1.6-.6 2.2 0l2.2 2.2c.7.6.7 1.6 0 2.3z"/></svg>
      </svg>
      </span>
      <div class="slds-notify__content">
      <h2 class="slds-text-heading_small ">${message}</h2>
      </div>
      <div class="slds-notify__close">
      <button class="slds-button slds-button_icon slds-button_icon-inverse" title="Close" id="ck-restore-toast-message-close-icon">
      <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="close"><path d="M31 25.4l13-13.1c.6-.6.6-1.5 0-2.1l-2-2.1c-.6-.6-1.5-.6-2.1 0L26.8 21.2c-.4.4-1 .4-1.4 0L12.3 8c-.6-.6-1.5-.6-2.1 0l-2.1 2.1c-.6.6-.6 1.5 0 2.1l13.1 13.1c.4.4.4 1 0 1.4L8 39.9c-.6.6-.6 1.5 0 2.1l2.1 2.1c.6.6 1.5.6 2.1 0L25.3 31c.4-.4 1-.4 1.4 0l13.1 13.1c.6.6 1.5.6 2.1 0L44 42c.6-.6.6-1.5 0-2.1L31 26.8c-.4-.4-.4-1 0-1.4z"/>
      </svg>
      </svg>
      <span class="slds-assistive-text">Close</span>
      </button>
      </div>
      </div>`;
    }else {
      div.innerHTML = `<div class="slds-notify slds-notify_toast slds-theme_warning" role="status">
      <span class="slds-assistive-text">warning</span>
      <span class="slds-icon_container slds-icon-utility-warning slds-m-right_small slds-no-flex slds-align-top" title="Description of icon when needed">
      <svg class="slds-icon slds-icon_small" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="warning"><path d="M51.4 42.5l-22.9-37c-1.2-2-3.8-2-5 0L.6 42.5C-.8 44.8.6 48 3.1 48h45.8c2.5 0 4-3.2 2.5-5.5zM26 40c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm3-9c0 .6-.4 1-1 1h-4c-.6 0-1-.4-1-1V18c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v13z"/></svg>
      </svg>
      </span>
      <div class="slds-notify__content">
      <h2 class="slds-text-heading_small ">${message}</h2>
      </div>
      <div class="slds-notify__close">
      <button class="slds-button slds-button_icon slds-button_icon-inverse" title="Close" id="ck-restore-toast-message-close-icon">
      <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="close"><path d="M31 25.4l13-13.1c.6-.6.6-1.5 0-2.1l-2-2.1c-.6-.6-1.5-.6-2.1 0L26.8 21.2c-.4.4-1 .4-1.4 0L12.3 8c-.6-.6-1.5-.6-2.1 0l-2.1 2.1c-.6.6-.6 1.5 0 2.1l13.1 13.1c.4.4.4 1 0 1.4L8 39.9c-.6.6-.6 1.5 0 2.1l2.1 2.1c.6.6 1.5.6 2.1 0L25.3 31c.4-.4 1-.4 1.4 0l13.1 13.1c.6.6 1.5.6 2.1 0L44 42c.6-.6.6-1.5 0-2.1L31 26.8c-.4-.4-.4-1 0-1.4z"/>
      </svg>
      <span class="slds-assistive-text">Close</span>
      </button>
      </div>
      </div>`;
    }
    
    $('#body').append(div);
    $('#ck-restore-toast-message-close-icon').on('click', function() {
      $('.ck-restore-toast-message').remove();
    })

}

function showRestoreToastMessage(response) {
  console.log('Show Restore Toast Message ' , response)

  $('#body').find('.ck-restore-toast-message').remove();

  var status = response; //(Object.keys(response).length > 0 ? response.status :  false );
  var message = (status ? 'Successfully restored. Please reopen the asset/ refresh the page.': 'Unable to restore')
  var div = document.createElement('div');
  div.setAttribute('class','slds-notify_container slds-is-relative ck-restore-toast-message');
  
  if(status) { 
    div.innerHTML = `<div class="slds-notify slds-notify_toast slds-theme_success" role="status">
      <span class="slds-assistive-text">success</span>
      <span class="slds-icon_container slds-icon-utility-success slds-m-right_small slds-no-flex slds-align-top" title="Description of icon when needed">
      <svg class="slds-icon slds-icon_small" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="success"><path d="M26 2C12.7 2 2 12.7 2 26s10.7 24 24 24 24-10.7 24-24S39.3 2 26 2zm13.4 18L24.1 35.5c-.6.6-1.6.6-2.2 0L13.5 27c-.6-.6-.6-1.6 0-2.2l2.2-2.2c.6-.6 1.6-.6 2.2 0l4.4 4.5c.4.4 1.1.4 1.5 0L35 15.5c.6-.6 1.6-.6 2.2 0l2.2 2.2c.7.6.7 1.6 0 2.3z"/></svg>
      </svg>
      </span>
      <div class="slds-notify__content">
      <h2 class="slds-text-heading_small ">${message}</h2>
      </div>
      <div class="slds-notify__close">
      <button class="slds-button slds-button_icon slds-button_icon-inverse" title="Close" id="ck-restore-toast-message-close-icon">
      <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="close"><path d="M31 25.4l13-13.1c.6-.6.6-1.5 0-2.1l-2-2.1c-.6-.6-1.5-.6-2.1 0L26.8 21.2c-.4.4-1 .4-1.4 0L12.3 8c-.6-.6-1.5-.6-2.1 0l-2.1 2.1c-.6.6-.6 1.5 0 2.1l13.1 13.1c.4.4.4 1 0 1.4L8 39.9c-.6.6-.6 1.5 0 2.1l2.1 2.1c.6.6 1.5.6 2.1 0L25.3 31c.4-.4 1-.4 1.4 0l13.1 13.1c.6.6 1.5.6 2.1 0L44 42c.6-.6.6-1.5 0-2.1L31 26.8c-.4-.4-.4-1 0-1.4z"/>
      </svg>
      </svg>
      <span class="slds-assistive-text">Close</span>
      </button>
      </div>
      </div>`;
    }else {
      div.innerHTML = `<div class="slds-notify slds-notify_toast slds-theme_warning" role="status">
      <span class="slds-assistive-text">warning</span>
      <span class="slds-icon_container slds-icon-utility-warning slds-m-right_small slds-no-flex slds-align-top" title="Description of icon when needed">
      <svg class="slds-icon slds-icon_small" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="warning"><path d="M51.4 42.5l-22.9-37c-1.2-2-3.8-2-5 0L.6 42.5C-.8 44.8.6 48 3.1 48h45.8c2.5 0 4-3.2 2.5-5.5zM26 40c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm3-9c0 .6-.4 1-1 1h-4c-.6 0-1-.4-1-1V18c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v13z"/></svg>
      </svg>
      </span>
      <div class="slds-notify__content">
      <h2 class="slds-text-heading_small ">${message}</h2>
      </div>
      <div class="slds-notify__close">
      <button class="slds-button slds-button_icon slds-button_icon-inverse" title="Close" id="ck-restore-toast-message-close-icon">
      <svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" id="close"><path d="M31 25.4l13-13.1c.6-.6.6-1.5 0-2.1l-2-2.1c-.6-.6-1.5-.6-2.1 0L26.8 21.2c-.4.4-1 .4-1.4 0L12.3 8c-.6-.6-1.5-.6-2.1 0l-2.1 2.1c-.6.6-.6 1.5 0 2.1l13.1 13.1c.4.4.4 1 0 1.4L8 39.9c-.6.6-.6 1.5 0 2.1l2.1 2.1c.6.6 1.5.6 2.1 0L25.3 31c.4-.4 1-.4 1.4 0l13.1 13.1c.6.6 1.5.6 2.1 0L44 42c.6-.6.6-1.5 0-2.1L31 26.8c-.4-.4-.4-1 0-1.4z"/>
      </svg>
      <span class="slds-assistive-text">Close</span>
      </button>
      </div>
      </div>`;
    }
    
    $('#body').append(div);
    $('#ck-restore-toast-message-close-icon').on('click', function() {
      $('.ck-restore-toast-message').remove();
    })

}

const revertChanges = async (assetType) => {
    console.log('Revert Change Function invoked for ' , assetType);
    var msgData = { 
      'action': 'Restore',
      'assetType': assetType,
      'accessToken' : ''
    };
    if(assetType == 'Email') {
      msgData['EmailSelected'] = selectedEmailId;
    } else if(assetType == 'Query') {
      msgData['QuerySelected'] = selectedQueryKey;
    } else if(assetType == 'QueryStudio') {
      msgData['QuerySelected'] = selectedQueryKey;
    }

    console.log('Send this message to background js ' , msgData)

    var handleResponse = function(response) {
      console.log('Restore status ' , response);
      showRestoreToastMessage(response);
      /*if(response.status == true) {
        console.log('Restore Success')
      } else {
        console.log('Restore failed.')
      }*/
    }
    chrome.runtime.sendMessage( msgData ,handleResponse);


    //restoreRequest(selectedEmailId);

    console.log('Restore complete...')
}

async function removeRequest(requestKey){
  return new Promise((resolve, reject) => {
    var filteredList = {};
    chrome.storage.local.get(null, function (items) {  
      for(i in items){
          if(i != requestKey ) {
              filteredList[i] = items[i]
          }
      }
      console.log('All Items in local storage ' , items)
      console.log('Filtered items with ', requestKey , ' removed ', filteredList)
      chrome.storage.local.clear(function() {
          console.log('All Data Removed');
          chrome.storage.local.set(filteredList, function() {
              console.log('New Filtered List saved to local storage');
              resolve(true);
          });
      });
    });
  });
}

async function removeRequest_QS(selectedQueryKey){
  return new Promise((resolve, reject) => {
    var filteredList = {};
    chrome.storage.local.get('QueryStudioItems', function (qsItems) {  
      for(i in qsItems['QueryStudioItems']) { 
         if(Object.keys(qsItems['QueryStudioItems'][i])[0] == selectedQueryKey) { 
          qsItems['QueryStudioItems'].splice(i,1)
          chrome.storage.local.set(qsItems, function() {
            console.log('QS item removal of ' , selectedQueryKey , ' is complete. New array is ', qsItems); 
            hideAllMenuItems();
            resolve(true);
          });
        } 
      }
    });
  });
}

async function removeAllRequests(){
  currentPage = await getCurrentPage();
  currentBuid = await getCurrentBuid();
  return new Promise((resolve, reject) => {
    var updatedItems = {};
    var toastMessage = '';
    var counter = 0;
    chrome.storage.local.get(null, function(items){
      //Exclude from items
      if(currentPage == 'Email') {
        for(i in items){
          if(i.includes(''+ currentBuid+'_')) {
            counter++;
          }else {
            updatedItems[i] = items[i];
          }
          console.log(i , ' -- ' , updatedItems);
        }
        toastMessage = ''+ counter + ' Email items stored for BU ID ' + currentBuid + ' are cleared.'
      }else if(currentPage == 'Query') {
        for(i in items){
          if(i.includes('Query_')) {
            counter++;
          }else{
            updatedItems[i] = items[i];
          }
          console.log(i , ' -- ' , updatedItems);
        }
        toastMessage = ''+ counter + ' Query items are cleared.'
      }else if(currentPage == 'QueryStudio') {
        for(i in items){
          if(i == 'QueryStudioItems') {
            counter = items['QueryStudioItems'].length; 
          }else { 
            updatedItems[i] = items[i];
          }
          console.log(i , ' -- ' , updatedItems);
        }
        toastMessage = ''+ counter + ' Query Studio items are cleared.'
      }
    console.log('Updated items to be set ' , updatedItems);
 
    //Clear all items 
    chrome.storage.local.clear(function() {
      console.log('All Data Removed');
    }); 

    //Set items 
    chrome.storage.local.set(updatedItems, function() {
      console.log('Updated items set ' , updatedItems);
    })
    
    //respond back

    hideAllMenuItems();
    showToastMessage(true, toastMessage);
    resolve(true);

  }); //chrome local storage get ends
}); //promise ends 
    
}

async function refreshEventListnersForMenu(menuType, isTopMenuVisible){

  isTopMenuVisible = (typeof isTopMenuVisible === 'undefined' ? true : isTopMenuVisible)

  if(menuType == 'Email') {
    updateDockerIconCount();
    //Clicking on Docker Button
    $("#ck-docker-button").on('click',async function () {
      $("#ck-docker-popup").toggle(500);
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 
    });

    //SVG Icon functions
    //Hide arrow icons 
    //-mk $('.ck-menu-item-svg').css({visibility: 'hidden'}); 
    //-mk $('.ck-subMenu-item-svg').css({visibility: 'hidden'});
    //Show/hide arrow icons
    $('.icons-min-height.ck-menu-item-svg').css({
      visibility: 'hidden' 
    });
    $('.icons-min-height.ck-subMenu-item-svg').css({
      visibility: 'hidden' 
    });
    
    $('.slds-dropdown__item.ck-menu-item').on( {
      mouseenter: function (event) {
        $('.icons-min-height.ck-menu-item-svg').css({
          visibility: 'hidden' 
        });
        $( this ).find('.icons-min-height.ck-menu-item-svg').css({
          visibility: 'visible' 
        });
        $('.ck-subMenu-item').css({
          visibility: 'hidden' 
        });
        var menuNumber = $(this).attr('menuNumber');
        $('div[parentMenuNumber='+menuNumber+']').css({
          visibility: 'visible' 
        });

          /* $('.icons-min-height.ck-menu-item-svg').css({visibility: 'hidden'}); 
          $( this ).find('.icons-min-height.ck-menu-item-svg').css({visibility: 'visible'});  //show icon
          var menuNumber = $(this).attr('menunumber');
          $('.ck-subMenu-item').css({visibility: 'hidden'});
          var menuNumber = $(this).attr('menuNumber');
          $('div[parentMenuNumber='+menuNumber+']').css({visibility: 'visible'});   */
      },
      mouseleave: function (event) {
        //$( this ).find('.icons-min-height.ck-menu-item-svg').css({visibility: 'hidden'});  //hide icon
        //var menuNumber = $(this).attr('menunumber');
        //$(this).find('.ck-subMenu-item-'+menuNumber).css({visibility: 'hidden'});//hide submenu 
      }
    });

    $('.slds-dropdown__item.ck-subMenu-li').on( {
      mouseenter: function (event) {
          //$('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'hidden'}); 
          //-css $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'visible'}); 
          $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({
            visibility: 'visible' 
          });
      },
      mouseleave: function (event) {
        //-css $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'hidden'}); 
        $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({
          visibility: 'hidden' 
        });
      }
    });

    //CSS for highlighting animation 
    /*var cssAnimation = 
    { 'stroke-width': '5px',
      'stroke-dashoffset': 0,
      'stroke-dasharray': 0 }

    $('#ck-main-addon').css(cssAnimation);*/
    
    //Make Element Draggable
    var mainAddonDiv = document.getElementById('ck-main-addon');
    dragElement(mainAddonDiv);
    var pos = await getPosFromStorage();
    $('#ck-main-addon').css({ left: pos.left + 'px', position:'absolute'}); 
    /* $(function() {  
      var options = {
        axis: 'x',
        cursor: "move",
        revert: false
      }
      $("#ck-main-addon").unbind("droppable");
      $("#ck-main-addon").draggable(options);  
    });  */


    //Event listners 
    $('.ck-previewEmail').on('click',
    async function () {
      var selectedEmailName =  $(this).find('button').attr('emailname');
      //Show dialog popup
      $("#ck-docker-popup").css({visibility: 'hidden'}); 
      $("#ck-docked-dialog").css({visibility: 'visible'}); 
      $("#ck-backdrop-hidder").css({visibility: 'visible'}); 
      showEmailPreview(
        selectedEmailName
      );
    });


    //Preview Screen - Header buttons
    $("#ck-previewScreen-close").on('click',function () {
      $("#ck-docker-popup").css({visibility: 'visible'}); 
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 
    });

    //Preview Screen - footer buttons
    $("#ck-previewScreen-CancelButton").on('click',
      async function () {
      //Todo - change this if needed
      $("#ck-docker-popup").css({visibility: 'visible'}); 
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

      await updateDockerIconCount();
    });
    //TODO: Change to On Click
    $("#ck-previewScreen-RevertButton").on('click',
      //throttle(
      async function () {
        console.log('Button click called at ' , new Date() , '. This function is throttled.')
        
        $("#ck-docker-popup").css({visibility: 'visible'}); 
        $("#ck-docked-dialog").css({visibility: 'hidden'}); 
        $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

        if (selectedEmailId != null) {
          await revertChanges(menuType);
        } else {
          console.error("No Email selected for preview!");
        }

        await updateDockerIconCount();
      }
      //, throttleMilliSeconds)
    );

    $("#ck-href-delete-local-storage").on('click',async function () {
      
      if(selectedEmailId != null){ 
        console.log('Delete asset button clicked for ', selectedEmailId)
        await removeRequest(selectedEmailId);

        $("#ck-docker-popup").css({visibility: 'hidden'}); 
        //MK TODO: Update the counter in docker popup - ck-docked-icon-counter
        await updateDockerIconCount();
      } else {
          console.error("No Email selected for deletion!");
      }  
    });

    $("#ck-href-delete-all-local-storage").on('click',removeAllRequests);


    /* MK SUB MENU - End */

    hideAllMenuItems();  // why is this? and below? 
    
    if(isTopMenuVisible) {
      $(".ck-topMenu").css({visibility: 'hidden'}); 
    } else {
      $(".ck-topMenu").css({visibility: 'visible'}); 
    } 

    //SubjectLine preheader section - set icon to > on page load and remove slds-is-open css class to close section 
    $('.ck-slds-additionalDetails').removeClass('slds-is-open');
    $('#ck-svg-additionalDetails').css({
      "-webkit-transform" : "rotate(270deg)",
      "transform" : "rotate(270deg)"
    });
    $('#ck-svg-additionalDetails').css({visibility: 'hidden'}); 
  
    //Toggle Additional Details section to show/ hide subject/ preheader
    $('.ck-slds-additionalDetails').on('click', 
    function() {
      //Show / hide details
      $('.ck-slds-additionalDetails').toggleClass('slds-is-open')
  
      var isSldsOpen = $('.ck-slds-additionalDetails').attr('class').includes('slds-is-open'); 
      if( isSldsOpen ) { 
        //Section is open - change arrow
        $('#ck-svg-additionalDetails').css({
          "-webkit-transform" : "rotate(0deg)",
          "transform" : "rotate(0deg)"
        });
        $('#ck-svg-additionalDetails').css({visibility: 'visible'});
      } else {
        //Section is closed 
        $('#ck-svg-additionalDetails').css({
          "-webkit-transform" : "rotate(270deg)",
          "transform" : "rotate(270deg)"
        });
        $('#ck-svg-additionalDetails').css({visibility: 'visible'});
      }
  
      }
    );

    //Set the preview modal button name as 'Revert'
    $('#ck-previewScreen-RevertButton').text('Revert');

  } 
  else if (menuType == 'Query') {
    console.log('Event Listner refresh for query');

    $("#ck-docker-button").on('click',async function () {
      $("#ck-docker-popup").toggle(500);
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 
    });

    //SVG Icon functions
    //Hide arrow icons 
    //-mk $('.ck-menu-item-svg').css({visibility: 'hidden'}); 
    //-mk $('.ck-subMenu-item-svg').css({visibility: 'hidden'});
    //Show/hide arrow icons
    $('.slds-dropdown__item.ck-menu-item').on( {
      mouseenter: function (event) {
          //-mk $('.icons-min-height.ck-menu-item-svg').css({visibility: 'hidden'}); 
          $( this ).find('.icons-min-height.ck-menu-item-svg').css({visibility: 'visible'});  //show icon
          var menuNumber = $(this).attr('menunumber');
          //$(this).find('.ck-subMenu-item-'+menuNumber).css({visibility: 'visible'});
          //$(this).find('.slds-dropdown__item.ck-subMenu-item').css({visibility: 'visible'});//show submenu 
          //-mk $('.ck-subMenu-item').css({visibility: 'hidden'});
          //console.log('hide all submenus')
          var menuNumber = $(this).attr('menuNumber');
          $('div[parentMenuNumber='+menuNumber+']').css({visibility: 'visible'});  
      },
      mouseleave: function (event) {
      }
    });

    $('.slds-dropdown__item.ck-subMenu-li').on( {
      mouseenter: function (event) {
          //$('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'hidden'}); 
          $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'visible'}); 
      },
      mouseleave: function (event) {
        //-mk $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'hidden'}); 
      }
    });

    
    //Make Element Draggable
    var mainAddonDiv = document.getElementById('ck-main-addon');
    dragElement(mainAddonDiv);
    var pos = await getPosFromStorage();
    $('#ck-main-addon').css({ left: pos.left + 'px', position:'absolute'}); 
    

    //Event listners 
    $('.ck-previewEmail').on('click',
    async function () {
      selectedQueryKey =  $(this).find('button').attr('queryKey');
      //Show dialog popup
      $("#ck-docker-popup").css({visibility: 'hidden'}); 
      $("#ck-docked-dialog").css({visibility: 'visible'}); 
      $("#ck-backdrop-hidder").css({visibility: 'visible'}); 
      showQueryPreview(
        selectedQueryKey
      );
    });


    //Preview Screen - Header buttons
    $("#ck-previewScreen-close").on('click',function () {
      $("#ck-docker-popup").css({visibility: 'visible'}); 
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 
    });

    //Preview Screen - footer buttons
    $("#ck-previewScreen-CancelButton").on('click',
      async function () {
      //Todo - change this if needed
      $("#ck-docker-popup").css({visibility: 'visible'}); 
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

      await updateDockerIconCount();
    });

    $("#ck-previewScreen-RevertButton").on('click',
      //throttle(
      async function () {
        console.log('Button click called at ' , new Date() , '. This function is throttled.')
        
        $("#ck-docker-popup").css({visibility: 'visible'}); 
        $("#ck-docked-dialog").css({visibility: 'hidden'}); 
        $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

        if (selectedQueryKey != null) {
          await revertChanges(menuType);
        } else {
          console.error("No Query selected for preview!");
        }

        await updateDockerIconCount();
      }
      //, throttleMilliSeconds)
    );

    $("#ck-href-delete-local-storage").on('click',async function () {
      
      if(selectedEmailId != null){ 
        console.log('Delete asset button clicked for ', selectedEmailId)
        await removeRequest(selectedEmailId);

        $("#ck-docker-popup").css({visibility: 'hidden'}); 
        //MK TODO: Update the counter in docker popup - ck-docked-icon-counter
        await updateDockerIconCount();
      } else {
          console.error("No Email selected for deletion!");
      }  
    });

    $("#ck-href-delete-all-local-storage").on('click',removeAllRequests);


    /* MK SUB MENU - End */

    hideAllMenuItems();
    
    if(isTopMenuVisible) {
      $(".ck-topMenu").css({visibility: 'hidden'}); 
    } else {
      $(".ck-topMenu").css({visibility: 'visible'}); 
    }

    //SubjectLine preheader section - set icon to > on page load and remove slds-is-open css class to close section 
    $('.ck-slds-additionalDetails').removeClass('slds-is-open');
    $('#ck-svg-additionalDetails').css({
      "-webkit-transform" : "rotate(270deg)",
      "transform" : "rotate(270deg)"
    });
    $('#ck-svg-additionalDetails').css({visibility: 'visible'}); 
  
    //Toggle Additional Details section to show/ hide subject/ preheader
    $('.ck-slds-additionalDetails').on('click', 
    function() {
      //Show / hide details
      $('.ck-slds-additionalDetails').toggleClass('slds-is-open')
  
      var isSldsOpen = $('.ck-slds-additionalDetails').attr('class').includes('slds-is-open'); 
      if( isSldsOpen ) { 
        //Section is open - change arrow
        $('#ck-svg-additionalDetails').css({
          "-webkit-transform" : "rotate(0deg)",
          "transform" : "rotate(0deg)"
        });
        $('#ck-svg-additionalDetails').css({visibility: 'visible'});
      } else {
        //Section is closed 
        $('#ck-svg-additionalDetails').css({
          "-webkit-transform" : "rotate(270deg)",
          "transform" : "rotate(270deg)"
        });
        $('#ck-svg-additionalDetails').css({visibility: 'visible'});
      }
  
      }
    );

    //Set the preview modal button name as 'Revert'
    $('#ck-previewScreen-RevertButton').text('Revert');

  } //Query as menuType ends 
  else if (menuType == 'QueryStudio') {
    console.log('Event Listner refresh for query studio QS');

    $("#ck-docker-button").on('click',async function () {
      $("#ck-docker-popup").toggle(500);
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 
    });

    //SVG Icon functions
    //Hide arrow icons 
    $('.ck-menu-item-svg').css({visibility: 'hidden'}); 
    $('.ck-subMenu-item-svg').css({visibility: 'hidden'});
    //Show/hide arrow icons
    $('.slds-dropdown__item.ck-menu-item').on( {
      mouseenter: function (event) {
          $('.icons-min-height.ck-menu-item-svg').css({visibility: 'hidden'}); 
          $( this ).find('.icons-min-height.ck-menu-item-svg').css({visibility: 'visible'});  //show icon
          var menuNumber = $(this).attr('menunumber');
          //$(this).find('.ck-subMenu-item-'+menuNumber).css({visibility: 'visible'});
          //$(this).find('.slds-dropdown__item.ck-subMenu-item').css({visibility: 'visible'});//show submenu 
          //-mk $('.ck-subMenu-item').css({visibility: 'hidden'});
          //console.log('hide all submenus')
          var menuNumber = $(this).attr('menuNumber');
          $('div[parentMenuNumber='+menuNumber+']').css({visibility: 'visible'});  
      },
      mouseleave: function (event) {
      }
    });

    $('.slds-dropdown__item.ck-menu-item').on( {
      mouseenter: function (event) {
          //$('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'hidden'}); 
          $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'visible'}); 
      },
      mouseleave: function (event) {
        $( this ).find('.icons-min-height.ck-preview-icon.ck-subMenu-item-svg').css({visibility: 'hidden'}); 
      }
    });

    
    //Make Element Draggable
    var mainAddonDiv = document.getElementById('ck-main-addon');
    dragElement(mainAddonDiv);
    var pos = await getPosFromStorage();
    $('#ck-main-addon').css({ left: pos.left + 'px', position:'absolute'}); 
    

    //Event listners 
    $('.ck-previewEmail').on('click',
    async function () {
      var selectedQueryKey =  $(this).find('button').attr('queryKey');
      //Show dialog popup
      $("#ck-docker-popup").css({visibility: 'hidden'}); 
      $("#ck-docked-dialog").css({visibility: 'visible'}); 
      $("#ck-backdrop-hidder").css({visibility: 'visible'}); 
      showQSPreview(
        selectedQueryKey
      );
    });


    //Preview Screen - Header buttons
    $("#ck-previewScreen-close").on('click',function () {
      $("#ck-docker-popup").css({visibility: 'visible'}); 
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 
    });

    //Preview Screen - footer buttons
    $("#ck-previewScreen-CancelButton").on('click',
      async function () {
      //Todo - change this if needed
      $("#ck-docker-popup").css({visibility: 'visible'}); 
      $("#ck-docked-dialog").css({visibility: 'hidden'}); 
      $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

      await updateDockerIconCount();
    });

    $("#ck-previewScreen-RevertButton").on('click',
      //throttle(
      async function () {
        console.log('Button click called at ' , new Date() , '. This function is throttled.')
        
        $("#ck-docker-popup").css({visibility: 'visible'}); 
        $("#ck-docked-dialog").css({visibility: 'hidden'}); 
        $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

        if (selectedEmailId != null) {
          await revertChanges('QueryStudio');
        } else {
          console.error("No Email selected for preview!");
        }

        await updateDockerIconCount();
      }
      //, throttleMilliSeconds)
    );

    

    $("#ck-href-delete-all-local-storage").on('click',removeAllRequests);


    /* MK SUB MENU - End */

    hideAllMenuItems();
    
    if(isTopMenuVisible) {
      $(".ck-topMenu").css({visibility: 'hidden'}); 
    } else {
      $(".ck-topMenu").css({visibility: 'visible'}); 
    }

    //SubjectLine preheader section - set icon to > on page load and remove slds-is-open css class to close section 
    $('.ck-slds-additionalDetails').removeClass('slds-is-open');
    $('#ck-svg-additionalDetails').css({
      "-webkit-transform" : "rotate(270deg)",
      "transform" : "rotate(270deg)"
    });
    $('#ck-svg-additionalDetails').css({visibility: 'visible'}); 

    //Toggle Additional Details section to show/ hide subject/ preheader
    $('.ck-slds-additionalDetails').on('click', 
    function() {
      //Show / hide details
      $('.ck-slds-additionalDetails').toggleClass('slds-is-open')

      var isSldsOpen = $('.ck-slds-additionalDetails').attr('class').includes('slds-is-open'); 
      if( isSldsOpen ) { 
        //Section is open - change arrow
        $('#ck-svg-additionalDetails').css({
          "-webkit-transform" : "rotate(0deg)",
          "transform" : "rotate(0deg)"
        });
        $('#ck-svg-additionalDetails').css({visibility: 'visible'});
      } else {
        //Section is closed 
        $('#ck-svg-additionalDetails').css({
          "-webkit-transform" : "rotate(270deg)",
          "transform" : "rotate(270deg)"
        });
        $('#ck-svg-additionalDetails').css({visibility: 'visible'});
      }

      }
    );
    
    //Set the preview modal button name as 'Revert'
    $('#ck-previewScreen-RevertButton').text('Copy SQL');

  }

}

function hideAllMenuItems() { 
  //hide all by default.
  $("#ck-docker-popup").css({visibility: 'hidden'}); 
  $("#ck-docked-dialog").css({visibility: 'hidden'}); 
  $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

  $("#ck-topMenu").css({visibility: 'hidden'}); 
}

async function repositionMenu() {
  $('#ck-topMenu').css({ left: '-50px', position:'absolute'});
  //assume - you clicked first menu item 
  var menuItemPos = $('#ck-menu-item-0').position()
  $('#ck-subMenu-item-1').css({ left: '-120px', top: menuItemPos.top ,position:'absolute'});

  hideAllMenuItems();

  console.log('Menu repositioned ' , menuItemPos)
  
}

async function refreshDataForMenu(menuType){ 
  if(menuType == 'Email') { 
    var data = await getData(menuType);
    console.log('data in new modal ' , data);
    //void main()
    var emailNames = [];
    var emailsList = [];
    for(i in data) {
      if(data[i]['name']){ 
        var t = {}
        t['key'] = i;
        t['buid'] = i.split('_')[0];
        t['emailId'] = i.split('_')[1];
        t['time'] = new Date(Number(i.split('_')[2]));
        t['emailName'] = data[i]['name']
        emailNames.push(data[i]['name'])
        emailsList.push(t)
      }
    }
    emailNames = [...new Set(emailNames)]; //to remove duplicates
    console.log(emailNames)
    console.log(emailsList)
    
    //Clear the menu element 
    $('#ck-topMenu-ul').empty()
    for(i in emailNames) {
      var li = addMenuItemList(i, emailNames[i], emailNames, emailsList);
      $('#ck-topMenu-ul').append(li);
    }
  }else if(menuType == 'Query') {
    var data = await getData(menuType);
    console.log('refreshDataForMenu has this data -  ' , data);

    //MA-205 : Show clear all only when there are items
    if(Object.keys(data).length === 0) {
      $('footer').remove();
    }

    var queryNames = [];

    for(i in data) {
      queryNames.push(data[i]['name']);
    }

    queryNames = [...new Set(queryNames)]; //to remove duplicates
    console.log('Unique query activity names ' , queryNames)

    $('#ck-topMenu-ul').empty()
    for(i in queryNames) {
      var li = addMenuItemList_Query(i, queryNames[i], queryNames, data);
      $('#ck-topMenu-ul').append(li);
    }

  } else if(menuType == 'QueryStudio') {
    var data = await getData(menuType);
    console.log('refreshDataForMenu has this data for QS menutype (mk-abc)-  ' , data);

    var queryNames = Object.keys(data);

    //MA-205 : Show clear all only when there are items
    if(Object.keys(data).length === 0) {
      $('footer').remove();
    }
    queryNames = [...new Set(queryNames)]; // to remove duplicates
    queryNames = queryNames.sort().reverse(); // Sort descending
    console.log('Unique query activity names ' , queryNames)

    $('#ck-topMenu-ul').empty()
    for(i in queryNames) {
      var li = addMenuItemList_QS(i, queryNames[i], queryNames, data);
      $('#ck-topMenu-ul').append(li);
    }

  }

  updateMenuCount(menuType);
}

function loadBackgroundTransparentLayer() {

  //Close/ open popup with transparent background 
  var ckMainAddon = document.getElementById('ck-main-addon');
  var ckDockedDialog = document.getElementById('ck-docked-dialog');
  var ckMainAddonBtn = document.getElementById('ck-main-addon-btn');
  var ckTopMenu = document.getElementById('ck-topMenu');
  var ckMainAddonBtn = document.getElementById('ck-main-addon-btn');
  var overlay = document.getElementById('backgroundOverlay');

  overlay.style.display = 'none';

  /* document.onclick = function(e){
      if(e.target.id == 'backgroundOverlay'){
        console.log('Main doc clicked.. If part')

        ckMainAddon.style.display = 'block';
        ckDockedDialog.style.display = 'none';
        ckTopMenu.style.display = 'none';
        overlay.style.display = 'none';
      }
      if(e.target === ckMainAddonBtn){
        console.log('Main doc clicked.. Else part')
        ckMainAddon.style.display = 'block';
        ckDockedDialog.style.display = 'block';
        ckTopMenu.style.display = 'block';
        
        overlay.style.display = 'block';
      }
  }; */

}

async function loadMenuItems(menuType){

  currentPage = await getCurrentPage();

  if(currentPage in supportedPageTypes) {
    menuType = currentPage;
    console.log('Addon identified the current page as ' , currentPage)
  }

  await refreshDataForMenu(menuType); 
  await refreshEventListnersForMenu(menuType, true);
  //Update count 
  //updateMenuCount(menuType);

//Global Event Listners
  $('.ck-main-addon-btn').on('click',
  async function(e) {
    currentPage = await getCurrentPage();

    if(supportedPageTypes.includes(currentPage)) {
      menuType = currentPage;
      console.log('Addon identified the current page as ' , currentPage)
    }

    await refreshDataForMenu(menuType);
    //var isTopMenuVisible = $(".ck-topMenu").is(':visible')
    var isTopMenuVisible = ( $(".ck-topMenu").css('visibility') == 'hidden' ? false : true )
    await refreshEventListnersForMenu(menuType, isTopMenuVisible);
  });
  $('.ck-main-addon').on('click',
  async function(e) {
    if (e.target !== this) //prevent closing of menus on clicking them 
    {  return; }
    currentPage = await getCurrentPage();

    if(supportedPageTypes.includes(currentPage)) {
      menuType = currentPage;
      console.log('Addon identified the current page as ' , currentPage)
    }
    //$(".ck-topMenu").toggle();
    //$(".ck-topMenu").css({visibility: 'visible'}); 
    await refreshDataForMenu(menuType);
    //var isTopMenuVisible = $(".ck-topMenu").is(':visible')
    var isTopMenuVisible = ( $(".ck-topMenu").css('visibility') == 'hidden' ? false : true )
    await refreshEventListnersForMenu(menuType, isTopMenuVisible);
  });
  //MA-195 - sticky
  // $('.ck-main-addon').toggleClass('slds-is-open');
  // $('.ck-main-addon').on('blur', function(){
  //   $(this).toggleClass('slds-is-open');
  // });
  
  // hideAllMenuItems();
  //await repositionMenu();

}

async function loadMenu(menuType) { 
  if(menuType == 'Email') {
    //MAIN FUNCTION - MK123
    if(    document.getElementById('ck-docked-dialog') != null  ) { 
      //Exists - don't do anything;
      console.log('Docker already added... Not adding again.')
    } else if(document.getElementById('body') != null) {


    /* Body as dom - start */    
    var node_1 = getHtmlPopupButton();
    $('#ck-main-addon').remove();
    $('#body').append(node_1);
    console.log('Node1-4 added')
      
    var node_1 = getHtmlPreviewModal();
    $('#body').append(node_1);

    var emails  = await getData('Email');
    var emailNames = Object.keys(emails);

    //MA-205 : Show clear all only when there are items
    if(emailNames.length > 0) {
      var footer = getHtmlClearAllButton();
      $('#ck-topMenu').append(footer);
    }

    //MK-Update menu removed - updateMenuCount(emailNames);
    //var counterIcon = createCounterIcon(emailNames);
    //$('.ck-main-addon').append(counterIcon);

    await loadMenuItems(menuType);

    //hide all by default.
    $("#ck-docker-popup").css({visibility: 'hidden'}); 
    $("#ck-docked-dialog").css({visibility: 'hidden'}); 
    $("#ck-backdrop-hidder").css({visibility: 'hidden'}); 

    } else {
      console.log('page load incomplete.')

    }//If-else condition ends
  }//EMail Menu type 
  else if(menuType == 'Query') { 
    console.log('show Query menu')
    if(    document.getElementById('ck-docked-dialog') != null  ) { 
      //Exists - don't do anything;
      console.log('Docker already added... Not adding again.')
    } else if(document.getElementById('body') != null) {


    /* Body as dom - start */    
    var node_1 = getHtmlPopupButton();
    $('#ck-main-addon').remove();
    $('#body').append(node_1);
    console.log('Node1-4 added')
      
    var node_1 = getHtmlPreviewModal();
    $('#body').append(node_1);

    var footer = getHtmlClearAllButton();
    $('#ck-topMenu').append(footer);

    /* TODO: var emails  = await getData();
    var emailNames = Object.keys(emails);

    updateMenuCount(emailNames); */

    await loadMenuItems(menuType);

    }//If-else condition ends
  } 
  else if (menuType == 'QueryStudio') {
    console.log('show Query studio menu')
    if(    document.getElementById('ck-docked-dialog') != null  ) { 
      //Exists - don't do anything;
      console.log('Docker already added... Not adding again.')
    } else if(document.getElementById('body') != null) {


    /* Body as dom - start */    
    var node_1 = getHtmlPopupButton();
    $('#ck-main-addon').remove();
    $('#body').append(node_1);
    console.log('Addon button added');

    var node_1 = getHtmlPreviewModal();
    $('#body').append(node_1);

    var footer = getHtmlClearAllButton();
    $('#ck-topMenu').append(footer);

    /* TODO: var emails  = await getData();
    var emailNames = Object.keys(emails);

    updateMenuCount(emailNames); */

    await loadMenuItems(menuType);

    }//If-else condition ends
      
  }

  //Doc: All loading completed; Reset UI to reseting position 
  resetUI();

  //Add Background overlay to close the addon - TODO:
  var node_overlay = document.createElement('div');
  node_overlay.setAttribute('id','backgroundOverlay')
  node_overlay.setAttribute('style','background-color:transparent;position:fixed;top:0;left:0;right:0;bottom:0;display:block;')
  //$('#body').append(node_overlay);

}

const loadAddon = async () => {
  const windowLocation = window.location;

  if (document.readyState == "complete") 
  {
    //console.log('Document is in ready state.')
    await pause(2500);


    var sfmc = document.getElementsByClassName('mc-header-user-and-account persistent-nav');
  
    currentPage = await getCurrentPage();
    if(currentPage == 'Query') {
      await loadMenu(currentPage);
      updateDockerIconCount();
    }else if(currentPage == 'QueryStudio') {
      await loadMenu(currentPage);
      updateDockerIconCount();
    }else { //Load EMail by default if(currentPage == 'Email') {
      await loadMenu(currentPage);
      updateDockerIconCount();
    }

    //loadBackgroundTransparentLayer();
  }
}
/*
  Main start
*/


window.onload = async function () {
  //console.log("Window Load Function");
  await loadAddon();
};



chrome.runtime.onMessage.addListener(
  async function(request, sender, sendResponse) {
    console.log('Message received in Background .js \n Request' , request , '\n Sender', sender, '\n sendResponse',sendResponse);
    if(request.action == 'updateDockerIconCount') {
      //console.log('updateDockerIconCount Received');
      throttle( ()=> { updateDockerIconCount() }, throttleMilliSeconds); //Execute a max of once a second
    }else if(request.action == 'Restore') {
      console.log('[Msg, Background --> Popup]: Restore Message received' , request);
      showRestoreToastMessage(request.status);
    }else if(request.action == 'showToastMessage') {
      console.log(request);
      showToastMessage(true,request.message);
    }
  }
);