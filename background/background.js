"use strict";

//Clear the local storage when the scrit is launched
window.localStorage.clear();

/*
* Listen for a storing request from content.js
*/
browser.runtime.onMessage.addListener(gotMessage);

//stores localy all scanned links (for info tab)
let linksScanned = [];

/**
 * Stores data in browser local storage:
 *   -domain name
 *   -visited pages (history)
 *   -number of HTTP / HTTPS urls
 * Doesnt allow duplicates (urls and domain)
 */
function gotMessage(request, sender, sendResponse){
  //Contains: domain, url, http, https, ratio
  let store = request.store;
  if (store) {

    /*
    How data is stored - key: [value1, value2]
    domainHistory: [domain1, domain2]
    domain1: [[url1, url2, url3], http, https, ratio]
    domain2: [[url1, url2, url3], http, https, ratio]
    */

    /*
    * DOMAIN-HISTORY
    * Get data from storage, check duplicate, save domain name
    * key: domainHistory
    * value: domain name
    */
    let domainHistory = [];
    let domainHistoryTemp = JSON.parse(window.localStorage.getItem('domainHistory'));
    domainHistory = domainHistoryTemp === null ? [] : domainHistoryTemp;
    //Avoid duplicate in domain history
    if (!domainHistory.includes(store.domain)) {
      domainHistory.push(store.domain);
    }
    //setItem - We have to sringify the array (storage takes only string)
    window.localStorage.setItem('domainHistory', JSON.stringify(domainHistory));

    /*
    * URL, NUMBER OF HTTP / HTTPS
    * Save URLs (history), number of HTTP / HTTPS
    * key: domain name
    * value: [[url1, url2], #HTTP, #HTTPS]
    */
    let urlHistory = [];
    let all = [urlHistory];
    //getItem - Has to be parsed to JSON

    /**
     * If storage already contains URL (duplicate), Nothing happen
     * If storage is NOT empty, Values are upgraded
     */
     let allTemp = JSON.parse(window.localStorage.getItem(store.domain));
     if (allTemp != null) {
       all = allTemp;
       //Avoid duplicated URL - update values
       if (!all[0].includes(store.actualUrl)) {
         //getItem - We have to parse it into JSON
         let oldHttp = all[1] === null ? 0 : parseInt(all[1]);
         let newHttp = store.http + oldHttp;

         let oldHttps = all[2] === null ? 0 : parseInt(all[2]);
         let newHttps = store.https + oldHttps;

         let oldRatio = all[3] === null ? 0 : parseFloat(all[3]);
         let newRatio = store.ratio + oldRatio;

         all[0].push(store.actualUrl);
         all[1] = newHttp;
         all[2] = newHttps;
         all[3] = newRatio;
       }
     }else {
       //default values (actual webpage) if storage is empty
       all = [[store.actualUrl], store.http, store.https, store.ratio];
     }

    //Save in storage --> domain: [[url1, url2], #HTTP, #HTTPS]
    window.localStorage.setItem(
      store.domain.toString(),
      JSON.stringify(all)
    );

  }
  //stores all scanned links (used for info)
  if(request.pageOK){
    linksScanned.push(request.pageOK);
    window.localStorage.removeItem("scannedLinks");
    //setItem - We have to sringify the array (storage takes only string)
    window.localStorage.setItem('scannedLinks', JSON.stringify(linksScanned));
  }

  if(request.backRestoreScanned){
    linksScanned = [];
  }

  if (request.badgeText) {
    browser.tabs.get(sender.tab.id, function(tab) {
      if (browser.runtime.lastError) {
        return; // the prerendered tab has been nuked, happens in omnibox search
      }
      if (tab.index >= 0) { // tab is visible
        browser.browserAction.setBadgeText({tabId:tab.id, text:request.badgeText});
      } else {
         // prerendered tab, invisible yet, happens quite rarely
         var tabId = sender.tab.id, text = request.badgeText;
         browser.webNavigation.onCommitted.addListener(function update(details) {
           if (details.tabId == tabId) {
             browser.browserAction.setBadgeText({tabId: tabId, text: text});
             browser.webNavigation.onCommitted.removeListener(update);
           }
         });
       }
     });
   }
}
