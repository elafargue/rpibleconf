/**
 * This file is part of Wizkers.io
 *
 * The MIT License (MIT)
 *  Copyright (c) 2017 Edouard Lafargue, ed@wizkers.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var util = require('util'),
    os = require('os'),
    exec = require('child_process').exec,
    rwm = require('raspbian-wifi-manager'),
  debug = require('debug')('char:ssid');


var bleno = require('bleno');

var Descriptor = bleno.Descriptor;
var Characteristic = bleno.Characteristic;

var SSIDCharacteristic = function() {
  SSIDCharacteristic.super_.call(this, {
    uuid: '811d3012-5549-4fe6-96e3-e05ee8bad8a0',
    properties: ['read', 'write'],
    descriptors: [
      new Descriptor({
        uuid: '2901',
        value: 'WiFi SSID'
      })
    ]
  });

  this._networks = [];

  // Get the existing WiFi configuration
  this.refreshNetworks();

};

SSIDCharacteristic.prototype.refreshNetworks = function() {
  var self = this;
  // Get the existing WiFi configuration
  rwm.getKnownNetworks(function(networks) {
      debug(networks);
      if (networks.length > 0) debug(networks[0].attrib);
      self._networks = networks;
  });
}

util.inherits(SSIDCharacteristic, Characteristic);

SSIDCharacteristic.prototype.onReadRequest = function(offset, callback) {
    debug('Read request. Offset:', offset);
    var ssid = this._networks.length > 0 ? this._networks[0].ssid : '';
    callback(this.RESULT_SUCCESS, new Buffer(ssid.substr(offset)));
};

SSIDCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
    var self = this;
    debug('Writing SSID:', data);
    debug('Offset is',offset);
    // Now update the network with this new data
    rwm.clearNetworks(function() {
        debug('Networks cleared');
        rwm.addWpaDhcpNetwork(data.toString(),'',function(err) {
            debug('Network added');
            self.refreshNetworks();
            callback(self.RESULT_SUCCESS);
        });
   });
}

module.exports = SSIDCharacteristic;
