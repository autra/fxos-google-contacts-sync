(function() {
  'use strict';
  //var accessToken = window.location.search.substring(1).split('=')[1];
  var accessToken = location.hash;
  var hash = document.location.hash.substring(1);
  var parameters = {};

  var dataStart = hash.indexOf('access_token');
  if (dataStart !== -1) {
    var elements = hash.split('&');

    elements.forEach(function(p) {
      var values = p.split('=');
      parameters[values[0]] = values[1];
    });

    window.opener.postMessage(parameters, location.origin);

    // Finally the window is closed
    window.close();
  }

})();
