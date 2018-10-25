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
  debug = require('debug')('char:netstat');


var bleno = require('bleno');

var Descriptor = bleno.Descriptor;
var Characteristic = bleno.Characteristic;

var NetstatCharacteristic = function() {
  NetstatCharacteristic.super_.call(this, {
    uuid: '9becf518-2f19-4652-a2bd-242d2cad27b2',
    properties: ['read'],
    descriptors: [
      new Descriptor({
        uuid: '2901',
        value: 'Network status'
      })
    ]
  });
};

util.inherits(NetstatCharacteristic, Characteristic);

NetstatCharacteristic.prototype.onReadRequest = function(offset, callback) {
    var self = this;

    var ifs = '';
    var interfaces = os.networkInterfaces();
    for (var iface in interfaces) {
        interfaces[iface].forEach( function(ipadd) {
          if (ipadd.family != 'IPv4' || ipadd.internal )
            return; // Skip lo and ipv6
          ifs += '|' + iface + ':' + ipadd.address;
        });
    }

    exec('wpa_cli status', function(error, stdout, stderr) {
      var wpa_state = '';
      var ip_address = '';
      var lines = stdout.split(os.EOL);
      for (var i in lines) {
        var val = lines[i].split('=');
        switch (val[0]) {
          case 'wpa_state':
            wpa_state = val[1];
            break;
        }
      }
      // We simply concatenate the interface state with the IP      
      var resp = wpa_state + ifs;
      callback(self.RESULT_SUCCESS, new Buffer(resp.substr(offset)));
    })
};

module.exports = NetstatCharacteristic;
