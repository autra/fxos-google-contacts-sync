'use strict';
/* Shamelessly stolen from gaia */
/* global contacts */
/* global utils */

(function() {
  var CHUNK_SIZE = 5;

  window.ContactsImporter = function(pContacts, pAccessToken, pConnector) {
    /* jshint validthis:true */

    this.contacts = Object.keys(pContacts);
    var contactsHash = pContacts;
    var access_token = pAccessToken;
    var total = this.contacts.length;

    var self = this;
    var serviceConnector = pConnector;
    var numImported = 0;

    var isOnLine = navigator.onLine;

    // To count the number of merged duplicate contacts
    var numMergedDuplicated = 0;

    window.addEventListener('online', onLineChanged);
    window.addEventListener('offline', onLineChanged);

    function onLineChanged() {
      isOnLine = navigator.onLine;
    }

    function saveMozContact(deviceContact) {
      return new Promise(function(resolve, reject) {
        var req = navigator.mozContacts.save(
          utils.misc.toMozContact(deviceContact));

        req.onsuccess = resolve;
        req.onerror = reject;
      })
    }

    // TODO this could be done with promise
    function pictureReady(serviceContact, blobPicture) {
      // Photo is assigned to the service contact as it is needed by the
      // Fb Connector
      if (!blobPicture) {
        return Promise.resolve(serviceContact);
      }

      return utils.thumbnailImage(blobPicture).then((thumbnail) => {
        if (blobPicture !== thumbnail) {
          serviceContact.photo = [blobPicture, thumbnail];
        } else {
          serviceContact.photo = [blobPicture];
        }
        return serviceContact;
      });
    }

    this.start = function() {
      var allPromises = [];
      for (var hash of this.contacts) {
        allPromises.push(importContact(hash));
      }
      return Promise.all(allPromises);
    };

    // This method might be overritten
    this.persist = function(contactData, successCb, errorCb) {
      return saveMozContact(contactData);
    };

    // This method might be overwritten
    this.adapt = function(serviceContact) {
      return serviceConnector.adaptDataForSaving(serviceContact);
    };

    function importContact(hash) {
      var serviceContact = contactsHash[hash];
      // We need to get the picture
      if (isOnLine === true) {
        return serviceConnector.downloadContactPicture(
          serviceContact,
          access_token
        )
        .then(pictureReady.bind(this, serviceContact))
        .then(() => {
          return self.persist(self.adapt(serviceContact));
        })
        .catch((e) => {
          console.log(e);
          self.persist(self.adapt(serviceContact));
        });
      } else {
        return self.persist(self.adapt(serviceContact));
      }
    }

    function notifySuccess() {
      if (typeof self.onsuccess === 'function') {
        window.setTimeout(function do_success() {
          self.onsuccess(numImported, numMergedDuplicated);
        }, 0);
      }
    }

  };
})();
