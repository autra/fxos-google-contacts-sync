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

    /**
     * Save a contact in the device DB. Return a promise that resolve to the
     * contact.
     *
     * It's useful because contact.id will then be populated.
     */
    function saveMozContact(deviceContact) {
      return new Promise(function(resolve, reject) {
        var contact = utils.misc.toMozContact(deviceContact);
        var req = navigator.mozContacts.save(contact);

        req.onsuccess = function() {
          resolve(contact);
        };
        req.onerror = reject;
      })
    }

    function deleteMozContact(id) {
      return new Promise(function(resolve, reject) {
        var contact = new mozContact();
        contact.id = id;
        var req = navigator.mozContacts.remove(contact);

        req.onsuccess = resolve;
        req.onerror = reject;
      });
    }

    function getMozContactById(id) {
      return new Promise(function(resolve, reject) {
        var req = navigator.mozContacts.find({
          filterBy: ['id'],
          filterValue: [id],
          filterOp: 'equals'
        });

        req.onsuccess = function() {
          if (this.result.length === 0) {
            reject(new Error('no contact found'));
          } else {
            resolve(this.result[0]);
          }
        };

        req.onerror = reject
      });
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
        // TODO proper reporting of success
        allPromises.push(importContact(hash).then((contact) => {
          return {
            action: 'created',
            id: contact.id
          };
        }));
      }
      return Promise.all(allPromises);
    };

    this.startSync = function(lastImportDate) {
      var allPromises = [];
      for (var hash of this.contacts) {
        allPromises.push(syncContact(hash));
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

    function syncContact(hash) {
      var serviceContact = contactsHash[hash];

      var mozId = localStorage.getItem(serviceContact.uid);
      if (serviceContact.deleted) {
        return deleteMozContact(mozId).then(() => {
          localStorage.removeItem(serviceContact.uid);
          localStorage.removeItem('mozcontact#' + mozId);
          return {
            action: 'deleted',
            id: mozId
          };
        });
      } else if (!mozId) {
        return importContact(hash).then((contact) => {
          return {
            action: 'created',
            id: contact.id
          };
        });
      } else {
        var mozContactPromise = getMozContactById(mozId);
        var newContactPromise = createMozContact(hash);
        return Promise.all([mozContactPromise, newContactPromise])
        .then(contacts => {
          var mozContact = contacts[0];
          var newContact = contacts[1];
          return new window.contacts.Updater.update(mozContact, newContact);
        }).then(self.persist)
        .then((contact) => {
          return {
            action: 'updated',
            id: contact.id
          };
        });
      }
    }

    function createMozContact(hash) {
      var serviceContact = contactsHash[hash];
      // We need to get the picture
      var promise;
      if (isOnLine === true) {
        promise = serviceConnector.downloadContactPicture(
          serviceContact,
          access_token
        )
        .then(pictureReady.bind(this, serviceContact))
        .catch((e) => {
          // a picture download fail does not block the save
          console.log('Error while downloading picture for contact',
                      serviceContact, e);
        });
      } else {
        promise = Promise.resolve(serviceContact);
      }
      return promise.then(() => self.adapt(serviceContact));
    }

    function importContact(hash) {
      return createMozContact(hash)
      .then((contact) => self.persist(contact))
      .then((contact) => {
        // save mapping between google id and mozcontact id
        // using localstorage for now
        // we naively store both side of the relationship for now.
        localStorage.setItem('mozcontact#' + contact.id,
                             contactsHash[hash].uid);
        localStorage.setItem(contactsHash[hash].uid, contact.id);
        return contact;
      });
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
