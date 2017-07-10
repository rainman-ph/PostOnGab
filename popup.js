/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

var gCharacterLimitLock = false;
var gUrl = null;
var gTitle = null;
var gIdoc = null;
var gIframeContainer = null;

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

function listenToMessages()
{
	browser.runtime.onMessage.addListener(request => {
		if (request.url != null)
		{
			let txt = request.title;
			let get_meta = true;
			if (request.selected != "") {
				txt = request.selected;
				get_meta = false;
			}
			preparePopup(request.url, txt, get_meta);
		}// else
		if (request.ok != null)
		{
			let submit_button = gIdoc.getElementById("s2g_submit");
			submit_button.setAttribute("value", "Redirecting");
	  		window.setTimeout(function() { closeDialog() }, 2000);
		} else
		if (request.notlogged != null)
		{
			let submit_button = gIdoc.getElementById("s2g_submit");
			submit_button.setAttribute("value", "Not logged in");
			window.setTimeout(function() { submit_button.setAttribute("value", "SEND") } , 5000);
		} else
		if (request.gab_error != null) {
			let submit_button = gIdoc.getElementById("s2g_submit");
			submit_button.setAttribute("value", "Error");
		}
	}); 
}

/* ################################################################################################## */

function getMetaData(url)
{
  let x = new XMLHttpRequest();
  x.open("GET", url, true);
  x.responseType = "document";
  x.onload = function () { searchMeta(x); }
  x.send();
}

function searchMeta(xhr)
{
	if (xhr.status != 200) return;
	let tmp_title = null;
	let tmp_url = null;
	let meta_tags = xhr.responseXML.head.getElementsByTagName("meta");
	// search for facebook meta tags
	for (let i=0; i<meta_tags.length; i++)
	{
		let prop = meta_tags[i].getAttribute("property");
		if (prop != null) {
			if (prop == "og:title") tmp_title = meta_tags[i].getAttribute("content");
			else if (prop == "og:url") tmp_url = meta_tags[i].getAttribute("content");
			if (tmp_title != null && tmp_url != null) break;
		}
	}
	if (tmp_title != null) gTitle = tmp_title;
	if (tmp_url != null) gUrl = tmp_url;

	if (gIdoc != null) modifyDialog(gUrl, gTitle);
}

/* ################################################################################################## */

function addClickListeners()
{
	let character_count = gIdoc.getElementById("s2g_count");
	let sog_textbox = gIdoc.getElementById("s2g_textbox");
	let bg = gIdoc.getElementById("sog_background");
	let cancel_button = gIdoc.getElementById("s2g_cancel");
	let submit_button = gIdoc.getElementById("s2g_submit");
	let profile_link = gIdoc.getElementById("sog_gab_link"); 
	let git_link = gIdoc.getElementById("sog_git_link"); 

	profile_link.addEventListener("click", function() {  var win = window.open("https://gab.ai/miraculix", "_blank"); win.focus() });
	git_link.addEventListener("click", function() {  var win = window.open("https://github.com/Miraculix200/ShareOnGab", "_blank"); win.focus() });
	cancel_button.addEventListener("click", function() { closeDialog(); });
	submit_button.addEventListener("click", function() { submitGab(sog_textbox); });
	bg.addEventListener("click", function() { closeDialog() });

	sog_textbox.addEventListener("keyup", function() {
		character_count.textContent = 300 - sog_textbox.value.length;
		if (sog_textbox.value.length > 300) {
			if (gCharacterLimitLock) return;
			submit_button.setAttribute("value", "TOO LONG");
			character_count.style.color = "red";
			gCharacterLimitLock = true;
		} else {
			if (!gCharacterLimitLock) return;
			submit_button.setAttribute("value", "SEND");
			character_count.style.color = "black";
			gCharacterLimitLock = false;
		} 
	});
}

function modifyDialog(url, title)
{
	if (gIdoc == null) return; // fix me
	let sog_textbox = gIdoc.getElementById("s2g_textbox");
	let character_count = gIdoc.getElementById("s2g_count");
	sog_textbox.textContent = title + "\n" + url;
	character_count.textContent = 300 - sog_textbox.value.length;
	character_count.textContent = character_count.textContent;
}

function closeDialog()
{ 
	let fill = document.getElementById("s2g_fill");
	if (fill == null) return; // fix me
	document.body.removeChild(fill);
	debugger; // exit() the script
}

/* ################################################################################################## */

var gLastGabSent = 0;

function submitGab(textbox)
{
	if (gCharacterLimitLock) {
		console.log("too many characters");
	} else {
		if (Date.now() - gLastGabSent < 2000) {
			console.log("2 seconds delay before sending next gab. Doubleclick?");
			return;
		}
		gLastGabSent = Date.now();
		browser.runtime.sendMessage({
			sharegab: textbox.value
	  	});
	}
}

/* ################################################################################################## */

function createIframe()
{
	let popurl = browser.extension.getURL("popup.html");
	let fill_screen = document.createElement("div");
	fill_screen.setAttribute("id", "s2g_fill")
	let div_ifr = document.createElement("div");
	let ifr = document.createElement("iframe");
	ifr.setAttribute("src", popurl);
	ifr.setAttribute("scrolling", "no");
	ifr.setAttribute("frameborder", "0px");

	fill_screen.style.cssText = "z-index: 1990;"
	fill_screen.style.cssText += "position: fixed;";
	fill_screen.style.cssText += "top: 0px;";
	fill_screen.style.cssText += "bottom: 0px;";
	fill_screen.style.cssText += "width: 100% !important;";
	fill_screen.style.cssText += "visibility: hidden;";
	fill_screen.style.cssText += "background-color: rgb(42, 42, 42, 0.6);"

	ifr.style.cssText = "height:100%;";
	ifr.style.cssText += "width:100%;";	
	ifr.style.cssText += "position: absolute;";	
	ifr.style.cssText += "top: 0;";	
	ifr.style.cssText += "left: 0;";

	div_ifr.style.cssText = "height:100% !important;";
	div_ifr.style.cssText += "width:100% !important;";
	div_ifr.style.cssText += "display: block !important;";
	div_ifr.style.cssText += "position: relative;";
	div_ifr.style.cssText += "padding: 0 0 0 0 !important;";
	div_ifr.style.cssText += "margin: 0 0 0 0 !important;";
	div_ifr.style.cssText += "z-index:1999;";

	div_ifr.appendChild(ifr);
	fill_screen.appendChild(div_ifr);
	document.body.appendChild(fill_screen);
	gIframeContainer = fill_screen;
	return ifr;
}

function preparePopup(url, title, get_meta)
{
	gUrl = url;
	gTitle = title;
	if (gIframeContainer == null)
	{
		var ifr = createIframe();
		waitIframeLoaded(ifr, url, title, get_meta);
	} else {
		modifyDialog(url, title);
		gIframeContainer.style.visibility = "visible";		
	}
}

function waitIframeLoaded(ifr, url, title, get_meta)
{
	ifr.addEventListener("load", function() 
	{ 
		var y = (ifr.contentWindow || ifr.contentDocument);
		if (y.document) y = y.document;
		gIdoc = y;
		addClickListeners();
		modifyDialog(url, title);
		gIframeContainer.style.visibility = "visible";
		if (get_meta) getMetaData(gUrl);
	});
}

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

listenToMessages();

browser.runtime.sendMessage({
	needdata: "ohai"
});

/* ################################################################################################## */
/* ################################################################################################## */
/* ################################################################################################## */

