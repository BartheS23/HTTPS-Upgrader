//statistics script
"use strict";

//Internalization
[
  {id: 'statsTitle', messageId: 'statsTitle'}
].forEach(item => {
  const container = document.getElementById(item.id);
  container.innerText = browser.i18n.getMessage(item.messageId);
})

//Get all visited domains (used as key for stored data)
let domainHistory = JSON.parse(window.localStorage.getItem('domainHistory'));
let domainData = [];
let dataTab = [];

/*
* Create dataTab table: [domain, #url, #http, #https, ratio]
* Key: domain name
*/
if (domainHistory != null) {
  for(let domain of domainHistory){
    domainData = JSON.parse(localStorage.getItem(domain));
    let ratio = http_https_ratio(domainData[1], domainData[2]);
    let ratioMean = domainData[3] / domainData[0].length;
    let dataTabTemp = [domain, domainData[0].length, domainData[1], domainData[2], ratio.toFixed(2), ratioMean.toFixed(2)];
    dataTab.push(dataTabTemp);
  }
}

//sort the data (ratio)
dataTab.sort(function(a,b) {
    return a[4]-b[4];
});

/**
 * https://www.valentinog.com/blog/html-table/
 * Generate a table header
 * @param table - the table
 * @param data - table header
 */
function generateTableHead(table, data) {
  let thead = table.createTHead();
  let row = thead.insertRow();
  for (let key of data) {
    let th = document.createElement("th");
    let text = document.createTextNode(key);
    th.appendChild(text);
    row.appendChild(th);
  }
}

/**
 * Generate a table
 * @param table - the table
 * @param data - data of the table
 */
function generateTable(table, data) {
  let tbody = table.createTBody();
  for (let element of data) {
    let row = tbody.insertRow();
    for (let key in element) {
      let cell = row.insertCell();
      let text = document.createTextNode(element[key]);
      cell.appendChild(text);
    }
  }
}

/**
 * Compute the total HTTP/HTTPS ratio
 * @param {number} http - number of HTTP links
 * @param {number} https - number of HTTPS links
 * @return {number} ratio - the ratio
 */
function http_https_ratio(http, https){
  let ratio = (https/(https+http))*100;
  return (ratio) ? ratio : 0;
}

//Table
let table = document.querySelector("table");
//Table header Internalization and data
let thDomain = browser.i18n.getMessage("statsThDomain");
let thVisitedPages = browser.i18n.getMessage("statsThVisitedPages");
let thRatioMean = browser.i18n.getMessage("statsThRatioMean")
let tableHeader = [thDomain, thVisitedPages, "HTTP", "HTTPS", "Ratio", thRatioMean];

//Generate Table header and Table
generateTableHead(table, tableHeader);
generateTable(table, dataTab);
