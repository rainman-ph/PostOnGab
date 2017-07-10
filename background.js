/* 

ShareOnGab by gab.ai/miraculix 2017

*/

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

var DEBUG = false;
var VERSION = browser.runtime.getManifest().version;

var gLoggedIn2Gab = false;
var gContextMenuWindowId = null;
var gPopupTab = null;
var gTabInfo = null;
var gSelectedText = "";

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

function debugLog(txt)
{
  if (DEBUG) console.log(getTimestamp() + ": " + txt);
}

function getTimestamp()
{
  return Math.floor(Date.now() / 1000);
}

/* ################################################################################################## */

function shareOnGab(tab)
{
  let popup_url = browser.extension.getURL("popup.html");
  var executing = browser.tabs.executeScript(tab.id, {
      file: "popup.js"
  });
  executing.then( function() { popupLoaded(tab.id) }, null);
}

function popupLoaded(tab_id)
{
  gPopupTab = tab_id;

}

function sendMessageToPopupTab(message)
{
  if (gPopupTab != null) browser.tabs.sendMessage(gPopupTab, message);
}

/* ################################################################################################## */

function createDefaultHeaders()
{
  let headers = new Headers();
  headers.append("User-Agent", "ShareOnGab v" + VERSION);
  return headers;
}

function postGab(text)
{

  let sog_headers = createDefaultHeaders();
  sog_headers.append("Content-Type", "application/json");

  let data = JSON.stringify({ 
    'body': text,
    'reply_to': "",
    'is_quote': 0,
    'gif': "",
    'category': null,
    'topic': null,
    'share_twitter': null,
    'share_facebook': null,
    'is_replies_disabled': false
  });

  let init = { method: 'POST',
               headers: sog_headers,
               body: data,
               credentials: 'include',
               cache: 'no-cache' };

  var req = new Request('https://gab.ai/posts', init);

  fetch(req).then(function(response) 
  {
    if (response.ok)
    {
      response.text().then(function(text) { 
        gabResponseReceived(text);
      });
    } else {
      debugLog("fail status: " + response.status);
      sendMessageToPopupTab({gab_error: "unknown error status " + response.status});
    }
  });
}

var gLastRedirectTabOpened = 0;

function gabResponseReceived(response_text)
{
  let regex = /gab\.ai\/auth\/login/;
  let match = regex.exec(response_text);
  if (match != null) 
  {
    gLoggedIn2Gab = false;
    // fix me hax
    if (getTimestamp() - gLastRedirectTabOpened < 2) return;
    gLastRedirectTabOpened = getTimestamp();

    sendMessageToPopupTab({notlogged: "Not logged in"});
    browser.tabs.create({
      url:"https://gab.ai" //,
    });
  } else {
    let response_json = null;
    try {
       response_json = JSON.parse(response_text);
    } catch (e) {
      debugLog("ERROR response: " + response_text);
      sendMessageToPopupTab({gab_error: response_text});
      return;
    }
    if (response_json.state != null)
    {
      if (response_json.state == "error")
      {
        sendMessageToPopupTab({gab_error: response_json.message});
      } else {
        // TODO: unknown state
        sendMessageToPopupTab({gab_error: response_json.message});
      } 
    }
    if (response_json.published_at != null) 
    {
      let gaburl = "https://gab.ai/" + response_json.actuser.username + "/posts/" + response_json.post.id;
      sendMessageToPopupTab({ok: gaburl});
      browser.tabs.create({
        url:gaburl //,
      });
    } 
    gLoggedIn2Gab = true;
  } 
}

/* ################################################################################################## */

function handleMessage(request, sender, sendResponse) 
{
  if (request.sharegab != null)
  {
    gPopupTab = sender.tab.id;
    postGab(request.sharegab);
  } else 
  if (request.needdata != null)
  {
    gPopupTab = sender.tab.id;
    let txt = "";
    if (gSelectedText != "") txt = gSelectedText;
    debugLog(txt);
    sendMessageToPopupTab({url: gTabInfo.url, title: gTabInfo.title, selected: txt});
  }
}

/* ################################################################################################## */

browser.contextMenus.create({
  id: "shareongab",
  title: "Share on Gab.ai",
  contexts: ["page", "tab", "selection"]
});

browser.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId == "shareongab") {

    if (info.selectionText != null) gSelectedText = info.selectionText;
    else gSelectedText = "";
    gContextMenuWindowId = tab.windowId;
    gTabInfo = tab;
    shareOnGab(tab);
  }
});

browser.browserAction.onClicked.addListener((tab) => {
  gContextMenuWindowId = tab.windowId;
  gTabInfo = tab;
  shareOnGab(tab);
});

browser.runtime.onMessage.addListener(handleMessage);

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */
