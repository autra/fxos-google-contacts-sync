// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {

  'use strict';

  var ACCESS_TOKEN_KEY = 'access_token';
  var TOKEN_VALIDITY_KEY = 'token_validity';
  // Enter a client ID for a web application from the Google Developer Console.
  // The provided clientId will only work if the sample is run directly from
  // https://google-api-javascript-client.googlecode.com/hg/samples/authSample.html
  // In your Developer Console project, add a JavaScript origin that corresponds to the domain
  // where you will be running the script.
  var clientId = '265634177893-rejd6a9m1d2q1g5a4pu1tive751g4akm.apps.googleusercontent.com';

  // Enter the API key from the Google Develoepr Console - to handle any unauthenticated
  // requests in the code.
  // The provided key works for this sample only when run from
  // https://google-api-javascript-client.googlecode.com/hg/samples/authSample.html
  // To use in your own application, replace this API key with your own.
  var apiKey = 'AIzaSyDwIbLCByl-fhQ6QVYvKBqMsV4h2hueHq4';

  // To enter one or more authentication scopes, refer to the documentation for the API.
  var scopes = 'https%3A%2F%2Fwww.google.com%2Fm8%2Ffeeds';

  var oauthWindow;
  var accessToken;
  var tokenValidity;

  var authorizeButton = document.getElementById('authorize-button');
  authorizeButton.onclick = function(e) {
    var url = `https://accounts.google.com/o/oauth2/auth?scope=${scopes}` +
      `&redirect_uri=https%3A%2F%2Fphoxygen.eu%2Foauth_result&response_type=token` +
      `&client_id=${clientId}&approval_prompt=force&state=friends`;
    oauthWindow = window.open(url, '', 'dialog');
  };

  var importButton = document.getElementById('import-contacts');
  importButton.onclick = startImport;

  function enableImport() {
    var timeEnable;
    if (!accessToken || !tokenValidity) {
      timeEnable = -1
    } else {
      timeEnable = tokenValidity - Date.now();
    }

    if (timeEnable > 0) {
      importButton.style.display = '';
      authorizeButton.querySelector('div[data-l10n-id]').dataset.l10nId =
        'reauthorize';
      navigator.mozL10n.translate(authorizeButton);
      setTimeout(disableImport, timeEnable);
    } else {
      disableImport();
    }
  }

  function disableImport() {
    importButton.style.display = 'none';
    authorizeButton.querySelector('div[data-l10n-id]').dataset.l10nId =
      'authorize';
    navigator.mozL10n.translate(authorizeButton);
  }

  function loadPersistedState() {
    accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    tokenValidity = new Date(localStorage.getItem(TOKEN_VALIDITY_KEY));
    navigator.mozL10n.ready(enableImport);
  }

  function saveAccessToken(parameters) {
    accessToken = parameters.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    tokenValidity = new Date(Date.now() + parameters.expires_in * 1000);
    localStorage.setItem(TOKEN_VALIDITY_KEY, tokenValidity);
  }

  function tokenDataReady(e) {
    var parameters = e.data;
    if (e.origin !== location.origin) {
      return;
    }
    if (!parameters || !parameters.access_token) {
      return;
    }

    saveAccessToken(parameters);
    enableImport();
    oauthWindow.close();
  }

  function startImport() {
    GmailConnector.listAllContacts(accessToken)
    .then((result) => {
        var importer = new ContactsImporter(result.data, accessToken, GmailConnector);
        importer.start();
    })
    .catch((e) => console.error(e));
  }

  window.addEventListener('message', tokenDataReady);

  loadPersistedState();

});
