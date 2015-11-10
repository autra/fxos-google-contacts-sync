(function() {
  'use strict';
  var accessToken = window.location.search.substring(1).split('=')[1];
  window.opener.postMessage({accessToken: accessToken}, location.origin);

})();
