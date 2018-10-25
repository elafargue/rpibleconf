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
    debug = require('debug')('char:psk'),
    bleno = require('bleno');

var Descriptor = bleno.Descriptor;
var Characteristic = bleno.Characteristic;

var PSKCharacteristic = function() {
  PSKCharacteristic.super_.call(this, {
    uuid: 'd15ae3b8-b284-473d-a885-51f859304924',
    properties: ['write'],
    descriptors: [
      new Descriptor({
        uuid: '2901',
        value: 'PSK key'
      })
    ]
  });
};

PSKCharacteristic.prototype.refreshNetworks = function(cb) {
  var self = this;
  // Get the existing WiFi configuration
  rwm.getKnownNetworks(function(networks) {
      debug(networks);
      if (networks.length > 0) debug(networks[0].attrib);
      self._networks = networks;
      if (cb) cb();
  });
}

util.inherits(PSKCharacteristic, Characteristic);

PSKCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
    var self = this;
    debug('Writing PSK Key', data);
    // Now update the network with this new data

    // We only support one network, so the idea is to refresh the list of networks,
    // then assign the PSK key to the first one and commit/reload
    this.refreshNetworks(function() {
	if (self._networks.length == 0) {
	   debug('Warning: no network defined, cannot set PSK');
           callback(this.RESULT_SUCCESS);
           return;
        }

        var ssid = self._networks[0].ssid;
        rwm.addWpaDhcpNetwork(ssid,data.toString(),function(err) {
            debug('Network PSK configured');
            self.refreshNetworks();
            debug('Bouncing wlan0 to force association');
            exec('ifdown wlan0; ifup wlan0', function(error, stdout, stderr) {
              debug('Bounce result', stdout);
              callback(self.RESULT_SUCCESS);
            });
        });
    });
}


module.exports = PSKCharacteristic;
