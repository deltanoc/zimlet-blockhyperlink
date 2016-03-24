/**
 * @license
 * Zimbra Block Hyperlinks Zimlet
 *
 * Copyright 2016 Deltanoc Ltd.
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

function BlockHyperlink() {
	com_zimbra_blockhyperlink_HandlerObject.settings = {};
}

/**
* Makes the Zimlet class a subclass of ZmZimletBase.
*
*/
BlockHyperlink.prototype = new ZmZimletBase();
BlockHyperlink.prototype.constructor = BlockHyperlink;


/**
* This method gets called by the Zimlet framework when the zimlet loads.
*  
*/
BlockHyperlink.prototype.init =
function() {
	com_zimbra_blockhyperlink_HandlerObject.version = this._zimletContext.version;
	com_zimbra_blockhyperlink_HandlerObject.settings['activeUrl'] = this._zimletContext.getConfig("activeUrl");
	com_zimbra_blockhyperlink_HandlerObject.settings['showAlertMessage'] = this._zimletContext.getConfig("showAlertMessage");
	com_zimbra_blockhyperlink_HandlerObject.alertMessage = this.getMessage("alertMessage");
	AjxPackage.require({name:"MailCore", callback:new AjxCallback(this, this._applyRequestHeaders)});
};

/**
* This method called by the Zimlet framework when open new email message
*  
*/
BlockHyperlink.prototype.onMsgView = function (msg, oldMsg, msgView){  
	var container = msgView.getContentContainer();
	var html_content = container.innerHTML;
	var html_ret = container.innerHTML;
	var re = /<a\b[^>]*>([\s\S]*?)<\/a>/gm;
	var match;

	while (match = re.exec(html_content)){
		html_ret = html_ret.replace(match[0],this.replaceURLWithHTMLLinks(match[0]));
	}
	container.innerHTML = html_ret;
	return true;
}

/**
* This method replace <a> tag href with ajax function
*  
*/
BlockHyperlink.prototype.replaceURLWithHTMLLinks =
function(text) {
	
	var el = document.createElement('html');
	el.innerHTML = text;
	var old_url_href = String(el.getElementsByTagName('a')[0]);

	var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
	if(text.indexOf(com_zimbra_blockhyperlink_HandlerObject.settings['activeUrl']) == -1) {
		if (Boolean(com_zimbra_blockhyperlink_HandlerObject.settings['showAlertMessage'])) // Alert Message is Active
			return text.replace(exp,"javascript:top.com_zimbra_blockhyperlink_HandlerObject.prototype.AlertMessage('"+old_url_href+"');" );
		else // Alert Message is Deactive, so will block link forever
			return text.replace(exp,"#" );
	}
	else {
		return text; 
	}

};

/**
* This method creates alert message
*  
*/
BlockHyperlink.prototype.AlertMessage =
function(text) {

	this._dialog =  null;
	var style = DwtMessageDialog.INFO_STYLE; //show info status by default

	this._dialog = appCtxt.getYesNoMsgDialog(); // returns DwtMessageDialog
	msg = com_zimbra_blockhyperlink_HandlerObject.alertMessage;

	this.sendUrl = text;
	this._dialog.setButtonListener(DwtDialog.YES_BUTTON, new AjxListener(this, this._yesBtnListener)); // listens for YES button events
	this._dialog.setButtonListener(DwtDialog.NO_BUTTON, new AjxListener(this, this._noBtnListener)); // listens for NO button events
	this._dialog.reset(); // reset dialog
	this._dialog.setMessage(msg, style);
	this._dialog.popup();
};

/**
* This method redirect user to URL
*  
*/
BlockHyperlink.prototype._yesBtnListener = 
function(obj) {
	this._dialog.popdown(); 
	window.open(this.sendUrl);

};

/**
* This method closes alert message
*  
*/
BlockHyperlink.prototype._noBtnListener = 
function(obj) {
	this._dialog.popdown(); 
};

/**
* This method work if match funtion find a url
*  
*/
BlockHyperlink.prototype._getHtmlContent =
function(html, idx, obj, context) {

	var escapedUrl = obj.replace(/\"/g, '\"').replace(/^\s+|\s+$/g, "");
	if (escapedUrl.substr(0, 4) == 'www.') {
		escapedUrl = "http://" + escapedUrl;
	}
	if (escapedUrl.indexOf("\\\\") == 0) {
		obj.isUNC = true;
		escapedUrl = "file://" + escapedUrl;
	}
	escapedUrl = escapedUrl.replace(/\\/g, '/');

	var link = "<a target='_blank' href='javascript:top.com_zimbra_blockhyperlink_HandlerObject.prototype.AlertMessage(\"" + escapedUrl +"\")"; // Default link to use when ?app= fails

	if (escapedUrl.split(/[\?#]/)[0] == ("" + window.location).split(/[\?#]/)[0]) {
		var paramStr = escapedUrl.substr(escapedUrl.indexOf("?"));
		if (paramStr) {
			var params = AjxStringUtil.parseQueryString(escapedUrl);
			if (params) {
				var app = params.app;
				if (app && app.length > 0) {
					app = app.toUpperCase();
					if (appCtxt.getApp(ZmApp[app])) {
						link = "<a href='javascript:top.appCtxt.getAppController().activateApp(top.ZmApp." + app + ", null, null);";
					}
				}
			}
		}
	}
	html[idx++] = link;
	html[idx++] = "'>";
	html[idx++] = AjxStringUtil.htmlEncode(obj);
	html[idx++] = "</a>";
	return idx;
};

/**
* This method fires if server side extension find an url
*  
*/
BlockHyperlink.prototype.match = 
function(line,startIndex) {
	var re = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)\S+(?:[^\s`!\[\]{};:'".,?«»“”‘’]))/gi; 
	re.lastIndex = startIndex;
	var match = re.exec(line);
	if(match)
	{
		return match;
	}
	else
		return null;
};