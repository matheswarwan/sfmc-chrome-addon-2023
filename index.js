console.log('Addon loaded...')
let currentBuid = 0;
let buids;
let loadUICount = 0;
const allowedTokenAge = 15;
let data;

// (async () => {
//   data = await getData();
// })();

// chrome.storage.local.get(null, async function(items) {
//   data = items;
// });



// This is just data format; not actual data;
let data_dev = {
  100015966: {
    email: [
      {
        body: "<h1>This is heading 1</h1><h3>This is h3</h3><b>This is bold text</b>",
        folderId: 324667,
        folderName: "Content Builder",
        name: "2nd Email",
        assetId: 204441,
        timeStamp: 1677978882499.578,
        url: "https://content-builder.s10.marketingcloudapps.com/fuelapi/asset/v1/content/assets/204440",
      },
      {
        body: "sample text 2",
        folderId: 324667,
        folderName: "Content Builder",
        name: "Lyft Amp Demo",
        timeStamp: 1677978482523.143,
        assetId: 204440,
        url: "https://content-builder.s10.marketingcloudapps.com/fuelapi/asset/v1/content/assets/204440",
      },
      {
        body: "sample text 3",
        folderId: 324667,
        folderName: "Content Builder",
        name: "2nd Email",
        assetId: 204441,
        timeStamp: 1673978882399.578,
        url: "https://content-builder.s10.marketingcloudapps.com/fuelapi/asset/v1/content/assets/204440",
      },
      {
        body: "sample text 4",
        folderId: 324667,
        folderName: "Content Builder",
        name: "2nd Email",
        assetId: 204441,
        timeStamp: 1679978882499.578,
        url: "https://content-builder.s10.marketingcloudapps.com/fuelapi/asset/v1/content/assets/204440",
      },
    ],
    query_studio: [
      {
        timeStamp: 1673978882399.578,
      },
      {
        timeStamp: 1673978982399.578,
      },
      {
        timeStamp: 1673988882399.578,
      },
      {
        timeStamp: 1674978882399.578,
      },
      {
        timeStamp: 1675978882399.578,
      },
      {
        timeStamp: 1676978882399.578,
      },
    ],
    cloud_pages: [
      {
        timeStamp: 1673978882399.578,
      },
      {
        timeStamp: 1673978982399.578,
      },
      {
        timeStamp: 1673988882399.578,
      },
      {
        timeStamp: 1674978882399.578,
      },
      {
        timeStamp: 1675978882399.578,
      },
      {
        timeStamp: 1676978882399.578,
      },
    ],
    automation_studio: [
      {
        timeStamp: 1673978882399.578,
      },
      {
        timeStamp: 1673978982399.578,
      },
      {
        timeStamp: 1673988882399.578,
      },
      {
        timeStamp: 1674978882399.578,
      },
      {
        timeStamp: 1675978882399.578,
      },
      {
        timeStamp: 1676978882399.578,
      },
    ],
  },
};

(async function main() {
  data = await getData();
  console.log('Get Data in global... ' , data)
  buids = Object.keys(data)
  buids = buids.filter((id) => id != 'token' && id != '0' && id != 'lastAccessed');
  currentBuid = (currentBuid == 0 ? buids[0] : currentBuid)

  loadUI(currentBuid);
})();


async function getData() {
  return new Promise( (resolve, reject) => {
    chrome.storage.local.get(null, async function(items) {
      resolve(items);
    })
  });
}

async function loadUI(currentBuid) {
  console.log("Load UI count : ", loadUICount++);

  // data = await getData();
  // console.log('Get Data... ' , data)
  // buids = Object.keys(data)
  // buids = buids.filter((id) => id != 'token' && id != '0');
  // currentBuid = (currentBuid == 0 ? buids[0] : currentBuid)

  // let t = await getcsrfToken().catch(function(){ 
  //   console.log('Error fetching CSRF Token')
  // });
  // console.log(t);

  //Global Event Listners Set UI items
  // $('.ck-buid-title').text('  ' + (currentBuid == undefined ? 'No history!': currentBuid) + '  '); //Set BUID as title
  setTitle();//Set BUID as title
  if(buids != undefined) {
    $(".ck-title-items-count").text(
      buids.length + " Business units found."
    ); //Set BUID as title
  }
  //OFF / Remove ALL Event listners 
  $('.ck-left-split-view-toggle-btn').off('click');
  $('.ck-left-sub-menu-item-back').off('click');
  $('.ck-left-sub-menu-item').off('click');
  $('.ck-left-l2-menu-item-back').off('click');
  $('.ck-left-l2-menu-item').off('click');
  $('.ck-revert-btn').off('click');
  $('.ck-left-split-view-toggle-btn').off('click');
  $('.ck-left-split-view-buid-dropdown').off('click');
  $('.ck-left-split-view-buid-dropdown-li').off('click');
  $('.ck-left-split-view-buid-dropdown-ul').off('click');
  $('.ck-items-refresh-btn').off('click');
  $('.ck-left-split-view-clear-all-btn').off('click');

  $('.ck-left-split-view-clear-all-btn').on('click', async function() {
    chrome.storage.local.clear();
    $(".ck-items-refresh-btn").trigger('click');  
    //TODO: Reload UI
    showToastMessage('All Contents Cleared!!!');
  })

  $(".ck-items-refresh-btn").on("click", function() {
    loadUI(currentBuid);
  });

  setLeftMenuTop(buids, currentBuid);
}


//Ui Classes
$(".ck-left-split-view-toggle-btn").on("click", () => {
  $(".ck-left-split-view")
    .toggleClass("slds-is-open")
    .toggleClass("slds-is-closed");
  $(".ck-left-split-view-toggle-btn")
    .toggleClass("slds-is-open")
    .toggleClass("slds-is-closed");
});

// $(".ck-items-refresh-btn").on("click", loadUI(currentBuid));

//Functions

async function setLeftMenuTop(buids, currentBuid) {
  console.log("Setting left menu - top order");

  let liHtml = "";

  
  // for(i in buids) {
  //Set Current BUID as the last BUID 
  currentBuid = buids[buids.length-1];
  for(var i=buids.length-1; i>=0; i--) {
    liHtml += `
      <li class="slds-dropdown__item" role="presentation">
         <a href="#" role="menuitem" tabindex="-1" buid="${buids[i]}" class="ck-left-split-view-buid-dropdown-li" >
           <span class="slds-truncate" title="${buids[i]}">
             <svg
               class="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small"
               aria-hidden="true"
             >
               <use
                 xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#user"
               ></use>
             </svg>
             <span>${buids[i]}</span>
           </span>
         </a>
     </li>`
  }

  $('.ck-left-split-view-buid-dropdown-ul').html(liHtml);
  //debugger;
  $('.ck-left-split-view-buid-dropdown').off('click');
  $('.ck-left-split-view-buid-dropdown').on('click', function(){
    console.log('Dropdown click triggered..')
    $('.ck-left-split-view-buid-dropdown').toggleClass('slds-is-open').toggleClass('slds-is-closed');
  });
  
  $('.ck-left-split-view-buid-dropdown-li').on('click', async function(){
    currentBuid = $(this).attr('buid');
    console.log('load ui for ' , currentBuid);
    // $('.ck-buid-title').text('  ' + (currentBuid == undefined ? 'No history!': currentBuid) + '  ');
    console.log('Current BU ID On change ' , currentBuid)
    await setCurrentBUID(currentBuid)
      .then(function(){
        setTitle();
      })
      .then(function(){
        loadUI(currentBuid);
      })
    // await setTitle();
    //$('.ck-left-split-view-buid-dropdown').trigger('click');
    // loadUI(currentBuid);
  });
  

  // let menuItems = [
  //   "Email",
  //   "Query Studio",
  //   "Landing Pages",
  //   "Automation Studio",
  // ];

  let menuItems = [
    "Email",
    "Query Studio"
  ];

  liHtml = "";
  for (item in menuItems) {
    liHtml += `
    <li class="slds-split-view__list-item" role="presentation">
      <a
        href="#"
        role="option"
        class="ck-left-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        menutype="${menuItems[item]}"
        tabindex="0"
      >
        <div class="slds-grid slds-wrap">
          <span
            class="slds-truncate slds-text-body_regular slds-text-color_default"
            title="${menuItems[item]}"
            >${menuItems[item]}</span
          >
          <!-- <span class="slds-truncate slds-col_bump-left" title="0"
            >0</span
          > -->
        </div>
      </a>
    </li>`;
  }

  var html = `<ul
      aria-multiselectable="true"
      class="slds-scrollable_y"
      role="listbox"
      aria-label="Select an item to open it in a new workspace tab."
    > ${liHtml}
    </ul>`;

  $(".ck-left-menu").html(html);

  //Event Listners
  $(".ck-left-menu-item").click(function () {
    console.log("clicked on", $(this).attr("menutype"));
    let menuItemType = $(this).attr("menutype");
    // Removed this to show query studio results even when the BU is selected as 0
    // if(currentBuid != 0){
    //   setLeftSubMenu(currentBuid, menuItemType);
    // }

    setLeftSubMenu(currentBuid, menuItemType);
  });
}

async function setLeftSubMenu(currentBuid, menuItemType) {
  console.log("Set Left Sub Menu called with current BUID - " , currentBuid);
  // currentBuid = (currentBuid == undefined ? 0 : currentBuid)
  currentBuid = ( $('.ck-buid-title').text().trim().length > 0 ? $('.ck-buid-title').text().trim() : currentBuid);

  if (menuItemType == "Email") {
    let liHtml = "";
    let emailData = data[currentBuid]["email"];

    let uniqueEmails = [],
      uniqueAssetIds = [];
    for (item in emailData) {
      if (!uniqueAssetIds.includes(emailData[item]["assetId"])) {
        var t = {};
        t["assetId"] = emailData[item]["assetId"];
        t["name"] = emailData[item]["name"];
        uniqueEmails.push(t);
      }
      uniqueAssetIds.push(emailData[item]["assetId"]);
    }

    liHtml = ` <li class="slds-split-view__list-item" role="presentation">
      <a
        href="#"
        role="option"
        class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        menutype="goBack"
        tabindex="0"
      >
      <svg class="slds-button__icon" aria-hidden="true">
        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
      </svg>
      </a>
    </li>`;

    console.log(uniqueEmails);
    for (item in uniqueEmails) {
      var emailStoredCount = '';
      //var emailStoredCount = await getStoredCount(currentBuid, 'email', uniqueEmails[item]["assetId"]);
      liHtml += `
      <li class="slds-split-view__list-item" role="presentation">
        <a
          href="#"
          role="option"
          class="ck-left-sub-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
          menutype="${uniqueEmails[item]["assetId"]}"
          tabindex="0"
        >
          <div class="slds-grid slds-wrap">
            <span
              class="slds-truncate slds-text-body_regular slds-text-color_default"
              title="${uniqueEmails[item]["name"]}"
              >${uniqueEmails[item]["name"]}</span
            >
            <span class="slds-truncate slds-col_bump-left" title="0"
              >${ emailStoredCount }</span
            >
          </div>
        </a>
      </li>`;
      console.log(item + ' -- ' + uniqueEmails[item] + ' - ' + emailStoredCount )
    }

    var html = `<ul
        aria-multiselectable="true"
        class="slds-scrollable_y"
        role="listbox"
        aria-label="Select an item to open it in a new workspace tab."
      > ${liHtml}
      </ul>`;

    $(".ck-left-menu").html(html);

    //Event Listners
    $(".ck-left-sub-menu-item-back").on("click", () => {
      setLeftMenuTop(buids, currentBuid);
    });

    $(".ck-left-sub-menu-item").on('click', function () {
      console.log("clicked from submenu ", $(this).attr("menutype"));
      let assetId = $(this).attr("menutype");
      setAuditHistoryUI(menuItemType, currentBuid, assetId);
    });
  } else if (menuItemType == "Query Studio") {
    let liHtml = "";
    let queryStudioData = data[currentBuid]["query_studio"];

    liHtml = ` <li class="slds-split-view__list-item" role="presentation">
      <a
        href="#"
        role="option"
        class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        menutype="goBack"
        tabindex="0"
      >
      <svg class="slds-button__icon" aria-hidden="true">
        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
      </svg>
      </a>
    </li>`;

    //for (item in queryStudioData) {
    for (var item = queryStudioData.length - 1; item >= 0; item--) {
      liHtml += `
      <li class="slds-split-view__list-item" role="presentation">
        <a
          href="#"
          role="option"
          class="ck-left-sub-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
          timeStamp="${queryStudioData[item]["timeStamp"]}"
          tabindex="0"
        >
          <div class="slds-grid slds-wrap">
            <span
              class="slds-truncate slds-text-body_regular slds-text-color_default"
              title="${queryStudioData[item]["timeStamp"]}"
              >${getFormattedDate(
                queryStudioData[item]["timeStamp"]
              )}</span
            >
            <span class="slds-truncate slds-col_bump-left" title="0"
              >0</span
            >
          </div>
        </a>
      </li>`;
    }

    var html = `<ul
      aria-multiselectable="true"
      class="slds-scrollable_y"
      role="listbox"
      aria-label="Select an item to open it in a new workspace tab."
    > ${liHtml}
    </ul>`;

    $(".ck-left-menu").html(html);
    //Event Listners
    $(".ck-left-sub-menu-item-back").on('click', ()=> {
      setLeftMenuTop(buids, currentBuid);
    });

    $(".ck-left-sub-menu-item").click(function () {
      console.log("clicked from submenu ", $(this).attr("timeStamp"));
      let timeStamp = $(this).attr("timeStamp")
      showQueryStudioPreview(menuItemType, timeStamp) ;
    });
  } else if (menuItemType == "Landing Pages") {
    let liHtml = "";
    let emailData = data[currentBuid]["email"];

    liHtml = ` <li class="slds-split-view__list-item" role="presentation">
      <a
        href="#"
        role="option"
        class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        menutype="goBack"
        tabindex="0"
      >
      <svg class="slds-button__icon" aria-hidden="true">
        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
      </svg>
      </a>
    </li>`;

    var html = `<ul
      aria-multiselectable="true"
      class="slds-scrollable_y"
      role="listbox"
      aria-label="Select an item to open it in a new workspace tab."
    > ${liHtml}
    </ul>`;

    $(".ck-left-menu").html(html);
    //Event Listners
    $(".ck-left-sub-menu-item-back").on('click', ()=>{
      setLeftMenuTop(buids, currentBuid);
    });

    $(".ck-left-sub-menu-item").click(function () {
      console.log("clicked from submenu ", $(this).attr("menutype"));
    });
  } else if (menuItemType == "Automation Studio") {
    {
      let liHtml = "";
      let emailData = data[currentBuid]["email"];

      liHtml = ` <li class="slds-split-view__list-item" role="presentation">
        <a
          href="#"
          role="option"
          class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
          menutype="goBack"
          tabindex="0"
        >
        <svg class="slds-button__icon" aria-hidden="true">
          <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
        </svg>
        </a>
      </li>`;

      var html = `<ul
        aria-multiselectable="true"
        class="slds-scrollable_y"
        role="listbox"
        aria-label="Select an item to open it in a new workspace tab."
      > ${liHtml}
      </ul>`;

      $(".ck-left-menu").html(html);
      //Event Listners
      $(".ck-left-sub-menu-item-back").on('click', ()=>{
        setLeftMenuTop(buids, currentBuid);
      });

      $(".ck-left-sub-menu-item").click(function () {
        console.log("clicked from submenu ", $(this).attr("menutype"));
      });
    }
  }
}

async function setAuditHistoryUI(menuItemType, currentBuid, assetId) {
  console.log(menuItemType, assetId);
  if (menuItemType == "Email") {
    let liHtml = "";
    let emailData = data[currentBuid]["email"];

    liHtml = ` <li class="slds-split-view__list-item" role="presentation">
      <a
        href="#"
        role="option"
        class="ck-left-l2-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        menutype="goBack"
        tabindex="0"
      >
      <svg class="slds-button__icon" aria-hidden="true">
        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
      </svg>
      </a>
    </li>`;

    //for (item in emailData) {
    for (var item = emailData.length - 1; item >= 0; item--) {
      if (emailData[item]["assetId"] == assetId) {
        let d = new Date(emailData[item]["timeStamp"]);
        let savedTime =
          d.getDate() +
          "/" +
          (d.getMonth() + 1) +
          "/" +
          d.getFullYear() +
          " " +
          d.getHours() +
          ":" +
          d.getMinutes() +
          ":" +
          d.getHours();

        liHtml += `
        <li class="slds-split-view__list-item" role="presentation">
          <a
            href="#"
            role="option"
            class="ck-left-l2-menu-item slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
            assetName="${emailData[item]["name"]}"
            assetId="${emailData[item]["assetId"]}"
            timeStamp="${emailData[item]["timeStamp"]}"
            tabindex="0"
          >
            <div class="slds-grid slds-wrap">
              <span
                class="slds-truncate slds-text-body_regular slds-text-color_default"
                title="${emailData[item]["timeStamp"]}"
                >${savedTime}</span
              >
              <!-- <span class="slds-truncate slds-col_bump-left" title="0"
                >0</span
              > -->
            </div>
          </a>
        </li>`;
      }
    }

    var html = `<ul
        aria-multiselectable="true"
        class="slds-scrollable_y"
        role="listbox"
        aria-label="Select an item to open it in a new workspace tab."
      > ${liHtml}
      </ul>`;

    $(".ck-left-menu").html(html);
    //debugger;
    //Event Listners
    //$('.ck-left-l2-menu-item-back').on('click',setLeftSubMenu(menuItemType));
    $(".ck-left-l2-menu-item-back").on("click", () => {
      setLeftSubMenu(currentBuid, menuItemType);
    });

    $(".ck-left-l2-menu-item").on('click',function () {
      //console.log( "clicked View audit history for ", $(this).attr("assetName"), ' -- ',  $(this).attr("assetId"), " -- ", $(this).attr("timeStamp") );
      let assetName = $(this).attr("assetName");
      let assetId = $(this).attr("assetId");
      let timeStamp = $(this).attr("timeStamp");
      showEmailPreview(currentBuid, menuItemType, assetName, assetId, timeStamp);
    });
  } else if (menuItemType == "Query Studio") {
    //TODO: Modify below
    let liHtml = "";
    let emailData = data[currentBuid]["email"];

    liHtml = ` <li class="slds-split-view__list-item" role="presentation">
      <a
        href="#"
        role="option"
        class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        menutype="goBack"
        tabindex="0"
      >
      <svg class="slds-button__icon" aria-hidden="true">
        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
      </svg>
      </a>
    </li>`;

    var html = `<ul
      aria-multiselectable="true"
      class="slds-scrollable_y"
      role="listbox"
      aria-label="Select an item to open it in a new workspace tab."
    > ${liHtml}
    </ul>`;

    $(".ck-left-menu").html(html);
    //Event Listners
    $(".ck-left-sub-menu-item-back").on('click', ()=>{
      setLeftMenuTop(buids, currentBuid);
    });

    $(".ck-left-sub-menu-item").click(function () {
      console.log("clicked submenu ", $(this).attr("menutype"));
    });
  } else if (menuItemType == "Landing Pages") {
    let liHtml = "";
    let emailData = data[currentBuid]["email"];

    liHtml = ` <li class="slds-split-view__list-item" role="presentation">
      <a
        href="#"
        role="option"
        class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
        menutype="goBack"
        tabindex="0"
      >
      <svg class="slds-button__icon" aria-hidden="true">
        <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
      </svg>
      </a>
    </li>`;

    var html = `<ul
      aria-multiselectable="true"
      class="slds-scrollable_y"
      role="listbox"
      aria-label="Select an item to open it in a new workspace tab."
    > ${liHtml}
    </ul>`;

    $(".ck-left-menu").html(html);
    //Event Listners
    $(".ck-left-sub-menu-item-back").on('click', ()=>{
      setLeftMenuTop(buids, currentBuid);
    });

    $(".ck-left-sub-menu-item").click(function () {
      console.log("clicked from submenu ", $(this).attr("menutype"));
    });
  } else if (menuItemType == "Automation Studio") {
    {
      let liHtml = "";
      let emailData = data[currentBuid]["email"];

      liHtml = ` <li class="slds-split-view__list-item" role="presentation">
        <a
          href="#"
          role="option"
          class="ck-left-sub-menu-item-back slds-split-view__list-item-action slds-grow slds-has-flexi-truncate"
          menutype="goBack"
          tabindex="0"
        >
        <svg class="slds-button__icon" aria-hidden="true">
          <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#back"></use>
        </svg>
        </a>
      </li>`;

      var html = `<ul
        aria-multiselectable="true"
        class="slds-scrollable_y"
        role="listbox"
        aria-label="Select an item to open it in a new workspace tab."
      > ${liHtml}
      </ul>`;

      $(".ck-left-menu").html(html);
      //Event Listners
      $(".ck-left-sub-menu-item-back").on('click', ()=>{
        setLeftMenuTop(buids, currentBuid);
      });

      $(".ck-left-sub-menu-item").click(function () {
        console.log("clicked from submenu ", $(this).attr("menutype"));
      });
    }
  }
}

function showEmailPreview(currentBuid, menuItemType, assetName, assetId, timeStamp) {
  if(menuItemType == 'Email') { 
    $('.ck-email-toast-div').removeClass('slds-show');
    $('.ck-email-preview-screen').removeClass('slds-hide').addClass('slds-show');
    $('.ck-email-name').text(assetName);
    $('.ck-preview-botton-action-btn').html('Revert to this version')

    let emailData = data[currentBuid]['email'];

    $('.ck-email-preview-body').html('Email Content Not Found');
    for(item in emailData){ 
      if(emailData[item]['timeStamp'].toString() == timeStamp)  //Convert int to string with +''
      { 
        // TODO: Get data from compiledHTML and show instead of compilin again
        let emailBody = JSON.parse(emailData[item]['body']);
        let emailHtml = compile(emailBody, 'email')


        var tableStart = `<iframe id="iframe" height="600px" width="400px"><html><head></head><body>`;
        var tableEnd = `</body></html></iframe><br>`;
        //htmlContent = tableStart + htmlContent + tableEnd;
      
        var newDom = new DOMParser().parseFromString(emailHtml, "text/html")
        console.log(newDom);
      
        let v = document.getElementById("ck-email-preview-body");
        let iframe = document.createElement('iframe');
        iframe.style.height = $( document ).height() + 'px';
        iframe.style.width = "100%";
      
        v.replaceChildren(iframe);
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(emailHtml);
        iframe.contentWindow.document.close();

        break;

        //$('.ck-email-preview-body').html(emailHtml);
      }
    }

    //Set Revert button event listner 
    $('.ck-revert-btn, .ck-preview-botton-action-btn').attr('assetId', assetId);
    $('.ck-revert-btn, .ck-preview-botton-action-btn').attr('assetName', assetName);
    $('.ck-revert-btn, .ck-preview-botton-action-btn').attr('timeStamp', timeStamp);
    $('.ck-revert-btn, .ck-preview-botton-action-btn').attr('memberId', currentBuid);
    $('.ck-revert-btn, .ck-preview-botton-action-btn').on('click', (el)=> {
      revertEmail(el);
    });

    //Popup help text
    // $('.ck-revert-btn').mouseenter( function(){
    //   $('.ck-revert-btn-help-popup').removeClass('slds-hide').addClass('slds-show');
    // });
    // $('.ck-revert-btn').mouseleave( function(){
    //   $('.ck-revert-btn-help-popup').removeClass('slds-show').addClass('slds-hide');
    // });

  }
}


function showQueryStudioPreview(menuItemType, timeStamp) {
  if(menuItemType == 'Query Studio') { 

    let sqlText = '';

    $('.ck-email-preview-screen').removeClass('slds-hide').addClass('slds-show');

    $('.ck-revert-btn').remove();
    
    buids = Object.keys(data);
    buids = buids.filter((id) => id != 'token' && id != 'lastAccessed'); //Remove Token

    let queryStudioData = [];
    for(i in buids) {
      queryStudioData = queryStudioData.concat(data[buids[i]]['query_studio']);
    }

    for(item in queryStudioData){ 
      if(queryStudioData[item]['timeStamp'] == timeStamp) {
        // debugger;
        sqlText = queryStudioData[item]['body']['querytext'];
        let executedDate = getFormattedDate(queryStudioData[item]['timeStamp']);

        //let editorTextArea = document.createElement('textarea');
        //editorTextArea.id = 'ck-sql-editor';
        // $('.ck-email-preview-body').html(editorTextArea);

        var taTag = ` <textarea id="queryTextArea" style="display:block;margin-left:50px; margin-right:50px"></textarea> `;
        $('.ck-email-preview-body').html(taTag);

        var halfHeight = $(document).height() / 2 + 'px';
        var halfWidth = $(document).width() / 2 + 'px';

        var sqlEditor = CodeMirror.fromTextArea( document.getElementById('queryTextArea'), {
          lineNumbers: true,
          mode: "text/x-sql",
          extraKeys: {"Ctrl-Space": "autocomplete"}, // To invoke the auto complete
          autoRefresh: true
        });

        sqlEditor.setValue(sqlText);
        sqlEditor.setSize(halfWidth, halfHeight);
        sqlEditor.refresh();
      

        $('.ck-email-name').text('Query Saved on: ' + executedDate );
        $('.ck-preview-botton-action-text, .ck-preview-botton-action-btn').html('Copy SQL');
        $('.ck-preview-botton-action-btn, .ck-email-name').on('click', function(){
          console.log('SQL to clipboard - ' ,sqlText);
          navigator.clipboard.writeText(sqlText).then(function() {
            console.log('Async: Copying to clipboard was successful!');
            showToastMessage('SQL Copied to clipboard')
          }, function(err) {
            console.error('Async: Could not copy text: ', err);
            showToastMessage('Unable to copy to clipboard')
          });
        });

        break; 
      }
    }


  }
}

async function revertEmail(el) {
  return new Promise((resolve, reject) => {
    console.log($(el.target))
    let buid = $(el.target).attr('memberid');
    let assetId = $(el.target).attr('assetId');
    let assetName = $(el.target).attr('assetName');
    let timeStamp = $(el.target).attr('timeStamp');

    chrome.storage.local.get(buid, async function (items) {
      console.log('Getting data in revert email ', items, buid )
      let emailArr = items[buid]['email'];
      for(i in emailArr)
      {
        if( emailArr[i]['timeStamp'].toString() == timeStamp )
          //&& emailArr[i]['assetId'].toString() == assetId
          //&& emailArr[i]['assetName'] == assetName ) 
          {
            var url = emailArr[i]['url'];
            var body = emailArr[i]['body'];

            var csrfToken = await getcsrfToken().catch( function(error){
              console.log('Invalid CSRF Token. Refresh Marketing Cloud!');
              //alert('CSRF Token is invalid!');
              showToastMessage('CSRF Token Invalid. Kindly refresh Marketing Cloud.');
            });
            console.log('csrf token ' , csrfToken);

            if(csrfToken == undefined) { throw error; }

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
            // debugger;
            try{
              url = sanitizeEmailPutURL(url);
              await fetch(url, requestOptions)  
              .then(function(response) {                      // first then()
                response.json().then( (data) => {
                  if(response.status >= 200 && response.status < 400)
                  {
                    console.log('Revert Response:') 
                    console.log('response: ' , response)
                    console.log('data: ' , data)
                    showToastMessage('Email reverted back to this version!')
                    //reloadTab(tabId);
                    isReverted = true; 
                    resolve(isReverted);
                    //return isReverted;
                  }else {
                    isReverted = false; 
                    showToastMessage('Error reverting email!')
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
            }
            catch(e) 
            {
              console.log('Error making fetch request ' , e)
              showToastMessage('Error reverting email (fetch error).')
            }
          }
      }
    //   csrfToken = await getcsrfToken(); //TODO: throw error if token not found; or reload the page
    //   
    }); 
  });
}

function showToastMessage(message) {
  var toastDiv = 
    `<div class="ck-toast-message-main slds-notify_container slds-is-relative">
    <div class="slds-notify slds-notify_toast slds-theme_success" role="status">
    <span class="slds-assistive-text">success</span>
    <span class="slds-icon_container slds-icon-utility-success slds-m-right_small slds-no-flex slds-align-top" title="Description of icon when needed">
    <svg class="slds-icon slds-icon_small" aria-hidden="true">
    <use xlink:href="/assets/icons/utility-sprite/svg/symbols.svg#success"></use>
    </svg>
    </span>
    <div class="slds-notify__content">
    <h2 class="slds-text-heading_small ">${message}</h2>
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
    </div>`

    //Remove old ones 
    $('.ck-toast-message-main').remove();

    if($('.slds-grid.slds-einstein-header.slds-card__header').is(':visible') > 0){
      $('.slds-grid.slds-einstein-header.slds-card__header').prepend(toastDiv);
    } else {
      $('.ck-email-toast-div').removeClass('slds-hide').addClass('slds-show').prepend(toastDiv);
    }
    
    $('.ck-toast-message-main').show();

    $('.ck-toast-message-close-btn').off('click');
    $('.ck-toast-message-close-btn').on('click', function(){
      $('.ck-toast-message-main').hide();
      $('.ck-toast-message-main').remove();
    });

    $('.ck-toast-message-main').delay(5000).fadeOut('slow');

  //$('body').append(toastDiv);
}

async function getcsrfToken_old() {
  return new Promise( (resolve, reject) => {
    chrome.storage.local.get('token', function(token){
      if(Object.keys(token['token']).includes('X-CSRF-Token') && Object.keys(token['token']).includes('createdDate'))
      {
        //Check if token is within 10 mins valid
        let currentTokenAge = ( new Date() - new Date(token['token']['createdDate']) ) / 60000 ; //this returns in minute
        if( currentTokenAge < allowedTokenAge ) 
        {
          resolve(token['token']['X-CSRF-Token'])
        }
        else 
        {
          reject(false);
        }
      }
    });
  });
}

async function getcsrfToken() {
  return new Promise( (resolve, reject) => {
    chrome.storage.local.get(currentBuid, function(item){
      console.log(currentBuid,item);
      if(Object.keys(item[currentBuid]['token']).includes('X-CSRF-Token') && Object.keys(item[currentBuid]['token']).includes('createdDate'))
      {
        //Check if token is within 10 mins valid
        let currentTokenAge = ( new Date() - new Date(item[currentBuid]['token']['createdDate']) ) / 60000 ; //this returns in minute
        console.log(item, currentTokenAge, item[currentBuid]['token']['X-CSRF-Token'])
        if( currentTokenAge < allowedTokenAge ) 
        {
          resolve(item[currentBuid]['token']['X-CSRF-Token'])
        }
        else 
        {
          reject(false);
        }
      }
    });
  });
}

function getFormattedDate(timeStamp) {
  let d = new Date(timeStamp);
  let formattedDate =
    d.getDate() +
    "/" +
    (d.getMonth() + 1) +
    "/" +
    d.getFullYear() +
    " " +
    d.getHours() +
    ":" +
    d.getMinutes() +
    ":" +
    d.getHours();
  return formattedDate;
}

function sanitizeEmailPutURL(url) {
  let t = new URL(url);
  t.search = '';
  return t.toString(); 
}

async function getStoredCount(memberId, assetType, assetId) {
  var emailCount = 0;
  return new Promise(async (resolve, reject) => {
    if(assetType == 'email') {
      var data = await getData();
      if(Object.keys(data).includes(memberId)) //BU Exists
      {
        if(Object.keys(data[memberId]).includes('email')) //Email exists
        {
          for(i in data[memberId]['email']) {
            if(data[memberId]['email'][i].assetId == assetId) {
              emailCount++;
            }
          }
        }
      }
    }
    console.log('Get stored count ' , memberId, assetType, assetId, emailCount)
    //return 5;
  });
  resolve(emailCount);
}

async function setCurrentBUID(currentBuid) {
  return new Promise( (resolve, reject) => {
    var lastAccessedBU = { 
      'lastAccessed' : { 'buid' : currentBuid, 'time' : new Date().valueOf() } 
    }
    chrome.storage.local.set(lastAccessedBU, function(){
      console.log('lastAccessedBU saved ' , lastAccessedBU )
      resolve(true);
    })
  });
}

async function setTitle() {
  return new Promise( (resolve, reject) => {
    chrome.storage.local.get('lastAccessed', function(item){
      console.log('lastAccessedBU from SAVED ' , item['lastAccessed']['buid'] );
      var lastAccessedBU = item['lastAccessed']['buid'];
      $('.ck-buid-title').text('  ' + lastAccessedBU + '  ');
      resolve(true);
    })
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
