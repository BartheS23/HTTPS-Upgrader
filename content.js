"use strict"; //Strict mode makes it easier to write "secure" JavaScript.

/**
* Creates a new Filter according to a protocol (ex: http, https, mailto)
* Stores all URL having the chosen protocol
* Stores duplicates in separate array
* @class Filter
*/
class Filter {
  /**
  * @constructs Filter
  * @param {string} protocol - the protocol name (https:)
  */
  constructor(protocol){
    this.protocol = protocol;
    this.urls = [];
    this.duplicates = [];
  }
  /**
  * Set a URL to the filter
  * Sort out duplicates
  * @param {object} url - URL to save
  */
  setUrl(url){
    if (!this.getHref().includes(url.href)) {
      this.urls.push(url);
    }else {
      this.duplicates.push(url);
    }
  }

  /**
  * Get the href from the URL
  * @return href - the href address of the URL
  */
  getHref(){
    let href = [];
    for (let i = 0; i < this.urls.length; i++) {
      href[i] = this.urls[i].href;
    }
    return href;
  }
}

/**
* Scan a web page using a Filter
* @class FilterPage
*/
class FilterPage {
  /**
  * Default constructor stores protocols in use
  * @constructs FilterPage
  * @param {object} protocolList - Array containing the protocols (string) to create
  */
  constructor(protocolList){
    this.protocols = protocolList;
    this.filters = [];
    this.convertedUrls = [];
  }

  /**
   * Scan a web page, and stores URL
   */
  scanPageUrls(){
    this.filters = [];
    this.convertedUrls = [];
    for(let i = 0; i < this.protocols.length; i++) {
      let tmpFilter = new Filter(this.protocols[i]);
      for(let i = 0; i < document.links.length; i++) {
        // if the protocol is http it will put the URL in http filter
        let url = new URL(document.links[i].href);
        if (url.protocol === tmpFilter.protocol) {
          tmpFilter.setUrl(url);
        }
      }
      this.filters.push(tmpFilter);
    }
  }

  /**
   * Get all Filters and corresponding URLs
   * @return all Filters with theirs URLs
   */
  getAllFilters(){
    let allFilters = [];
    for(let i = 0; i < this.filters.length; i++) {
      let tmpFilter = this.filters[i];
      allFilters.push([tmpFilter.protocol, tmpFilter.urls]);
    }
    return allFilters;
  }

  /**
   * Get a list of URL corresponding to a protocol
   * @param {string} filter - the protocol (https:)
   * @return list of URL
   */
  getFilterProtocol(filter){
    //protocol format --> http:
    let format = /^[a-z]+\:{1}$/gm;
    if (format.exec(filter)) {
      for(let i = 0; i < this.filters.length; i++) {
        let tmpFilter = this.filters[i];
        if (tmpFilter.protocol === filter) {
          return tmpFilter.urls;
        }
      }
    }else{
      throw new Error("Wrong filter format");
    }
  }

  /**
   * Calculate the HTTP / HTTPS ratio
   * @return ratio
   */
  http_https_ratio(){
    let numberHTTP = 0;
    let numberHTTPS = 0;
    for(let i = 0; i < this.filters.length; i++) {
      if(this.filters[i].protocol === "http:"){
          numberHTTP = this.filters[i].urls.length;
      }
      if(this.filters[i].protocol === "https:"){
          numberHTTPS = this.filters[i].urls.length;
      }
    }
    let ratio = (numberHTTPS/(numberHTTPS+numberHTTP))*100;
    return (ratio) ? ratio : 0;
  }

  /**
   * Get the upgradable HTTP URL
   * @return convertedUrls
   */
  getSecuredUrl(){
    return this.convertedUrls;
  }

  /**
   * Puts a tested link with return code 200 - OK into array of convertible links
   * @param {string} url - the url which will be put in the array
   */
  putSecuredTestedUrl(url){
    this.convertedUrls.push(url);
  }

  /**
   * Clear the secured URL array
   */
  clearSecuredUrl(){
    this.convertedUrls = [];
  }
}

/********************************
*---- CONSTANTS DECLARATION ----*
********************************/
//constant having the http response status codes
const RESPONSE_STATUS_CODE = {
  ok : 200,
  badRequest : 400,
  notFound : 404,
  requestTimeout : 408
}

//Timeout for XHR request
const XHR_TIMEOUT = 2000; //in miliseconds
const FILTER_OPTIONS = ["https:", "http:"];
//Scan the website using filters (protocols)
let filterPageObj = new FilterPage(FILTER_OPTIONS);

/********************************
*-------- MAIN SECTION ---------*
********************************/

//Once all the DOM elements of the page are ready to use
$(function() {
  filterPageObj.scanPageUrls();
  updateBadgeText(filterPageObj.http_https_ratio().toFixed(1));

  //Some pages weren't able to load all links after DOM is loaded
  //Scanns again to check if any change has occured after 500 miliseconds
  setTimeout(function(){
    filterPageObj.scanPageUrls();
    backgroundStorage();
    updateBadgeText(filterPageObj.http_https_ratio().toFixed(1));
  },500);

  /**
   * Message handler
   * Get message from popup when it is launched
   * Execute tasks that are ordered from the popup
   */
  browser.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        let msg;
        //Send webpage data to popup
        if(request.infoCode == "pageInfo"){
          msg = {
            nbHTTP: filterPageObj.getFilterProtocol("http:").length,
            nbHTTPS: filterPageObj.getFilterProtocol("https:").length,
            ratio: filterPageObj.http_https_ratio().toFixed(2),
            actualPageProtocol: window.location.protocol
          };
        }else if(request.infoCode == "convertScanner"){
          //Find convertible links
          filterPageObj.clearSecuredUrl();
          let httpLinksFilter = filterPageObj.getFilterProtocol("http:");
          //double check if there is really no http link
          if (httpLinksFilter != 0) {
            msg = {nbTotalHttpLinks : httpLinksFilter.length};
            isUrlSecure(getHttpsVersion(httpLinksFilter),filterPageObj);
          }
        }else if(request.infoCode == "convertAllLinks"){
          //Replace all converted http links to https if it's possible

          //selects all <a> html tag with a http link on the page
          $("a[href^='http://']").each(function(){
            let linkToConvert = $(this).attr("href");
            for(let i = 0; i < filterPageObj.getSecuredUrl().length; i++){
              let href = filterPageObj.getSecuredUrl()[i];  //get the url which can be converted (all https urls)
              //remove s from the link to check if it concordes with the link who will be converted
              let httpHref = href.substring(0,4)+ href.slice(5);
              //checked if a link is convertible (remove last /)
              if((httpHref === linkToConvert) || (httpHref.replace(/\/$/,'') === linkToConvert) ){
                $(this).attr("href",href);
              }
            }
          });
          //get all new link after conversion
          filterPageObj.scanPageUrls()
          //update the browser badge
          updateBadgeText(filterPageObj.http_https_ratio().toFixed(1));
          // remove the higlight red link + warning if convertion ok
          $("a[href^='https://']").each(function(){
            $(this).css('background', '');
            $(this).children('.imgDangerUrlHttp').remove();
          });
        }
        //if the listener has a message to send back
        sendResponse(msg);
    });


  /**
   * Launched when a link is clicked
   * Check if a link can be converted
   */
  $("a").click(function(){
    let clickedLink = $(this).attr("href");
    let comp = new RegExp('^http://');
    if(comp.test(clickedLink)){//check if link is http
      let checkURL = clickedLink.replace(/^http:/, "https:"); //replace http with https
      /**
       * Check if the link is convertible.
       * YES: redirect to secure
       * NOT: ask user if redirect or not on unsecure
       */
      sendXHR(checkURL, clickedLink_success, clickedLink_error);
      return false;
    }
  });

  //highlight all http links in red
  $("a[href^='http://']").each(function(){
    $(this).css('background', 'yellow');
    //add warning img after http link --> security error from web pages
    $(this).append('<img class="imgDangerUrlHttp" src="'+browser.extension.getURL("icons/projectIcon/H-UG-iconOpen256.png")+'" width="16px"></img>');
  });

  /**
   * Send data to the background script
   * Data to send: actual URL, domain name, number of HTTP / HTTPS URL and the ratio
   * @function backgroundStorage
   */
  function backgroundStorage(){
    //data we want to store
    let storeTemp = {
      actualUrl: window.location.href,
      domain: document.domain,
      http: filterPageObj.getFilterProtocol('http:').length,
      https: filterPageObj.getFilterProtocol('https:').length,
      ratio: filterPageObj.http_https_ratio()
    };
    //Send data to background.js
    browser.runtime.sendMessage({store: storeTemp});
  }

  /**
   * Update message of browser badge (popup button)
   * Send a request to background.js which will update it
   * @param msg - the message we want to show on the badge
   */
  function updateBadgeText(msg) {
    browser.runtime.sendMessage({badgeText: msg});
  }

});

/********************************
*---------- FUNCTIONS ----------*
********************************/

/**
 * Check if http links have a https version
 * For each link a XHR request will be send to check if it has an https equivalent
 * @param {object} unsecureUrl - the array of unsecured links which will be putSecuredTestedUrl
 */
function isUrlSecure(unsecureUrl){
  for (let i = 0; i < unsecureUrl.length; i++) {
    sendXHR(unsecureUrl[i], findConvertibleLinks_success, findConvertibleLinks_error);
  }
}

/**
 *  Inform popup after a url is tested
 *  @param {string} url - the tested url after XHR
 *  @param {number} code - the http status code from the XHR
 */
function sendResponseStatus(url, code) {
  browser.runtime.sendMessage({
    pageOK: {url,code}
  });
}

/**
 * Success function for clicked link XHR
 * @param {number} status - the status of the XHR
 * @param {string} url - the tested URL
 */
function clickedLink_success(status, url) {
  // If a convertible link is found then redirect
  if (status == RESPONSE_STATUS_CODE.ok) {
    window.location.href = url;
  }else{
    //otherwise call error function
    clickedLink_error(status, url);
  }
}

/**
 * Error function for clicked link XHR
 * @param {number} status - the status of the XHR
 * @param {string} url - the tested URL
 */
function clickedLink_error(status, url) {
  let oldUrl = url.replace(/^https:/, "http:"); //replace https with http
  // If a convertible link is not found then ask to redirect or not
  if (confirm(browser.i18n.getMessage("clickedLink"))) {
    window.location.href = oldUrl;
  } else {
    //abort redirection
    return false;
  }
}

/**
 * Success function for finding convertible links
 * @param {number} status - the status of the XHR
 * @param {string} url - the tested URL
 */
function findConvertibleLinks_success(status, url) {
  //Save the convertible link and inform the popup
  if(status === RESPONSE_STATUS_CODE.ok){
    filterPageObj.putSecuredTestedUrl(url);
  }

  sendResponseStatus(url, status);
}

/**
 * Error function for finding convertible links
 * @param {number} status - the status of the XHR
 * @param {string} url - the tested URL
 */
function findConvertibleLinks_error(status, url) {
  //inform the popup that unconvertible link is found
  sendResponseStatus(url, status);
}

/**
 * Send a XHR to an URL
 * @param {string} url - the url which will be used to send a XHR
 * @param {function} success - XHR success function
 * @param {function} error - XHR error function
 */
function sendXHR(url, success, error) {
  let xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.timeout = XHR_TIMEOUT; //miliseconds

  xhr.onload = function () {
    //Checking XHR status code
    for(let code in RESPONSE_STATUS_CODE){
      if (xhr.status === RESPONSE_STATUS_CODE[code]) {
        success(RESPONSE_STATUS_CODE[code], url);
        return;
      }
    }

    //default value if not in code response constant
    error(RESPONSE_STATUS_CODE.badRequest, url);
  };

  xhr.ontimeout = function(){
    //Page timed out to respond. May have any secure version (HTTPS)
    error(RESPONSE_STATUS_CODE.requestTimeout, url);
  };

  xhr.onerror = function() {
    //Network Error, request couldnt be made
    error(RESPONSE_STATUS_CODE.badRequest, url);
  };
  xhr.send();

}

/**
 * basic conversion from http --> https
 * @param {object} httpArray - array containing the http links which will be converted
 * @return {object} httpsArray - the converted http links in an array
 */
function getHttpsVersion(httpArray){
  let httpsArray = [];
  for (let i = 0; i < httpArray.length; i++) {
    httpsArray[i] = httpArray[i].href.replace(/^http:/, "https:");
  }
  return httpsArray;
}
