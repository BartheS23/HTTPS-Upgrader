//popup script
"use strict"; //Strict mode makes it easier to write "secure" JavaScript.

//Internalization
[
  {id: 'httpFound', messageId: 'httpFound'},
  {id: 'httpsFound', messageId: 'httpsFound'},
  {id: 'ratio', messageId: 'ratio'},
  {id: 'findConvertLinks', messageId: 'findConvertLinks'},
  {id: 'scanBtn', messageId: 'scanButton'},
  {id: 'convertBtn', messageId: 'convertButton'},
  {id: 'resetBtn', messageId: 'resetButton'},
  {id: 'statsBtn', messageId: 'statsButton'},
  {id: 'actualPageStatus', messageId: 'actualPageStatus'},
  {id: 'infoBtn', messageId: 'infoBtn'}
].forEach(item => {
  const container = document.getElementById(item.id);
  container.innerText = browser.i18n.getMessage(item.messageId);
});

let nbOfConvertiblePages;
let nbTotalLinks;
let nbContentFound;
getPageInfos();

/**
 * Is launched when popup is open.
 * Sends a request to content_script (content.js) to get webpage information
 * tabs[0] corresponds to the current open tab on the browser
 */
function getPageInfos(){
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    browser.tabs.sendMessage(tabs[0].id, {infoCode: "pageInfo"}, function(response) {
      writeToPopup(response);
    });
  });
}

/**
* Function which modifies the elements of the popup html
* @param {object} linkInfos - data received from content.js
*/
function writeToPopup(linkInfos){
  let nbHTTP = (linkInfos === undefined) ? "N/A" : linkInfos.nbHTTP;
  let nbHTTPS = (linkInfos === undefined) ? "N/A" : linkInfos.nbHTTPS;
  let ratio = (linkInfos === undefined) ? "N/A" : linkInfos.ratio;

  document.getElementById("httpFound").innerHTML += " "+nbHTTP;
  document.getElementById("httpsFound").innerHTML += " "+nbHTTPS;
  document.getElementById("ratio").innerHTML += " "+ratio+"%";

  //if no http page found, scanner to convert not needed
  if (linkInfos.nbHTTP !== 0) {
    document.getElementById("convertLinks").hidden = false;
  }
  if(linkInfos.actualPageProtocol === "http:"){
    document.getElementById("actualPageStatus").hidden = false;
  }
}

/**
 *  calls the content script when clicked on the scan button
 *  content script starts to try to convert the http links
 */
document.getElementById("scanPage").addEventListener("click", function(){
  nbOfConvertiblePages = 0;
  nbTotalLinks = 0;
  document.getElementById("convFound").hidden = false;
  document.getElementById("loadingGif").hidden = false;
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    browser.tabs.sendMessage(tabs[0].id, {infoCode: "convertScanner"},function(response){
      nbContentFound = response.nbTotalHttpLinks;
    });
  });
  browser.runtime.sendMessage({backRestoreScanned: "can be restored!"});
});

/**
 *  Content script Listener, this code is called when the content script could find
 *  a http link which response when it's queried from https. the link is available here
 *  it will update the field which shows how many convertible link was found
 */
browser.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.pageOK) {
      if(request.pageOK.code === 200){
        nbOfConvertiblePages++;
        nbTotalLinks++;
        document.getElementById("convFound").innerText = browser.i18n.getMessage("convFoundMsg")+" "+nbOfConvertiblePages+"/"+nbTotalLinks;
      }else {
        nbTotalLinks++;
        document.getElementById("convFound").innerText = browser.i18n.getMessage("convFoundMsg")+" "+nbOfConvertiblePages+"/"+nbTotalLinks;
      }
      if(nbTotalLinks === nbContentFound){
        if(nbOfConvertiblePages > 0){
          document.getElementById("convertBtn").hidden = false;
          document.getElementById("infoBtn").hidden = false;
        }
        document.getElementById("loadingGif").hidden = true;
      }
    }
});

// when button reset is clicked relaunches the whole script
document.getElementById("resetBtn").addEventListener("click", function(){
    location.reload();
});

// when button convert is clicked sends info to content script content.js
document.getElementById("convertBtn").addEventListener("click", function(){
  document.getElementById("convGif").hidden = false;
  browser.tabs.query({active: true, currentWindow: true}, function(tabs) {
    browser.tabs.sendMessage(tabs[0].id, {infoCode: "convertAllLinks"},function(response){
      location.reload();
    });
  });
});

// when stats button is clicked, opens new tab with the statistics
document.getElementById("statsBtn").addEventListener("click", function(){
    browser.tabs.create({'url':"../stats/stats.html"})
});

// when button info is clicked opens new tab with the information
document.getElementById("infoBtn").addEventListener("click", function(){
    browser.tabs.create({'url':"../info/info.html"})
});
