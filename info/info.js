"use strict";
//Internalization
[
  {id: 'scannedTitle', messageId: 'scannedTitle'}
].forEach(item => {
  const container = document.getElementById(item.id);
  container.innerText = browser.i18n.getMessage(item.messageId);
})

//get all scanned links from the local storage
let scannedLinks = JSON.parse(window.localStorage.getItem('scannedLinks'));

// Generate a list with all the scanned links of a webpage and their respons code
let list = document.getElementById("info-list");
renderLinkByCode(scannedLinks);


/**
 * Function which renders all the links by response code
 * @param {array} data - json array with all the urls and their response code
 */
function renderLinkByCode(data){
  let ul,li,a;
  //sort data by code, lowest before
  data.sort(function(a,b){
    return a.code > b.code;
  })
  let previousCode = 0;
  for (let urlObj of data){
    if(previousCode !== urlObj.code){
      createHTag(browser.i18n.getMessage("testedRequestText")+" " + urlObj.code);
      previousCode = urlObj.code;
      ul = document.createElement('ul');
    }else{
      list.appendChild(ul);
    }
    li = document.createElement('li');
    a = document.createElement('a');
    a.appendChild(document.createTextNode(urlObj.url));
    a.href = urlObj.url;
    li.appendChild(a);
    ul.appendChild(li);
  }
  list.appendChild(ul);


}

/**
 * Create a h3 title easily
 * @param{string} text - text which will be the title
 */
function createHTag(text){
  let h3 = document.createElement("H3");
  let h3Title = document.createTextNode(text);
  h3.appendChild(h3Title);
  list.appendChild(h3);
}
