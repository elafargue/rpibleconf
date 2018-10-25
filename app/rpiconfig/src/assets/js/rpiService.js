/**
 * This is our Raspberry Pi BLE service, reading/writing to the various characteristics
 * to configure various aspects - Wifi, etc.
 * 
 * Note that this is a singleton pattern, there is only ever one service
 */


 var str2ui = function(str) {
   var bufView=new Uint8Array(str.length);
    for (var i=0, j=str.length; i<j; i++) {
        bufView[i]=str.charCodeAt(i);
    }
    return bufView;
 }
 
class RPiService {
    constructor() {
      this.device = null;
      this.server = null;
      this._characteristics = new Map();
      this.portOpen = false;


      this.devAddress = null;
      this.timeoutCheckTimer = null;

      document.addEventListener("deviceready", function() {
        bluetoothle.initialize(function(res) {
            console.log('Initialize result', res);
        }, { request: true });
      });
    }
    connect(address, cb) {
      console.log('Connecting to the Pi with address', address);
      // Setup a callback in case we time out
      this.timeoutCheckTimer = setTimeout(this._checkConnectDelay, 30000);

      this.devAddress = address;
      bluetoothle.connect(this._trackConnect.bind(this, cb), this._trackError.bind(this), {
                address: address
      });
      
    }

    isConnected() {
      return this.portOpen;
    }

    disconnect(cb) {
        if (!this.portOpen) {
            return;
        }

        var self = this;

        // We need to disconnect before closing, as per the doc
        bluetoothle.disconnect(function (result) {
            // OK, we can now close the device:
            bluetoothle.close(function (result) {
                console.log(result);
                self.portOpen = false;
                cb();
                }, function (error) {}, {
                    address: self.devAddress
                });
            }, function (error) {
                console.log('Disconnect error', error);
                if (error.error == 'isDisconnected') {
                    // Already disconnected, so we can close
                    bluetoothle.close(function (result) {
                        console.log(result);
                        self.portOpen = false;
                        cb();
                    }, function (error) {}, {
                        address: self.devAddress
                    });
                }
            }, {
                address: this.devAddress
        });

    }

    /**
     * Get information about the current Wifi/network status.
     * 
     * Note: current implementation does not support characteristic
     * length over 20 bytes !
     * 
     * Right now, only SSID information, that's it.
     * @param {*Function} cb 
     */
    getWifiInfo(cb) {
      if (!this.portOpen) {
        cb({status: 'not connected'});
        return;
      }

      var readSuccess = function(res) {
        var u8a = bluetoothle.encodedStringToBytes(res.value);
        // Convert Uint8Array to string (painful)
        res.value = [].reduce.call(u8a,function(p,c){return p+String.fromCharCode(c)},'');
        res.value = res.value.replace(/^\"|\"$/g,''); // Remove the starting/ending quotes
        console.log(res.value);
        cb({ ssid: res.value});
      }

      bluetoothle.read( readSuccess, function(err) { console.log(err)},
                { address: this.devAddress,
                  service: 'ab513917-82bd-48fb-907f-66b87561d0f3',
           characteristic: '811d3012-5549-4fe6-96e3-e05ee8bad8a0'}
        );

    }

    /**
     *   Get RPi network information
     * @param {*Function} cb Called with contents of net info
     */
    getNetInfo(cb) {
      if (!this.portOpen) {
        cb({status: 'not connected'});
        return;
      }

      var readSuccess = function(res) {
        var u8a = bluetoothle.encodedStringToBytes(res.value);
        // Convert Uint8Array to string (painful)
        res.value = [].reduce.call(u8a,function(p,c){return p+String.fromCharCode(c)},'');
        res.value = res.value.replace(/^\"|\"$/g,''); // Remove the starting/ending quotes
        var netstat = res.value.split('|');
        var resp = {
            if_status: netstat[0]
        };
        for (var i=1; i < netstat.length; i++) {
            var ifinfo = netstat[i].split(':');
            switch (ifinfo[0]) {
                case 'wlan0':
                    resp['wlanip'] = ifinfo[1];
                    break;
                case 'eth0':
                    resp['ethip'] = ifinfo[1];
                    break;
            }
        }
        console.log(resp);
        cb(resp);
      }

      bluetoothle.read( readSuccess, function(err) { console.log(err)},
                { address: this.devAddress,
                  service: 'ab513917-82bd-48fb-907f-66b87561d0f3',
           characteristic: '9becf518-2f19-4652-a2bd-242d2cad27b2'}
        );
        
    }

    setWifi(ssid, psk, cb) {
        var self = this;
      if (!this.portOpen) {
        cb({status: 'not connected'});
        return;
      }

      // We need to transform ssid and PSK into Base64 encoded values
      ssid = bluetoothle.bytesToEncodedString(str2ui(ssid));
      psk = bluetoothle.bytesToEncodedString(str2ui(psk));

      var ssidWritten = function(res) {
        console.log('SSID Written', res);
        bluetoothle.write(pskWritten, function(err) { console.log(err)},
                { address: self.devAddress,
                  service: 'ab513917-82bd-48fb-907f-66b87561d0f3',
           characteristic: 'd15ae3b8-b284-473d-a885-51f859304924',
                    value: psk
                });

      };
      var pskWritten = function(res) {
        console.log('PSK Written', res);
        cb();
      }

      bluetoothle.write(ssidWritten, function(err) { console.log(err)},
            { address: this.devAddress,
              service: 'ab513917-82bd-48fb-907f-66b87561d0f3',
       characteristic: '811d3012-5549-4fe6-96e3-e05ee8bad8a0',
                value: ssid       
            });

    }

    /**
     * 
     * @param {*Function} cb callback called every time we find a device
     */
    findPis(cb) {
      var device_names = {};
      // We can do autoconnect on devices that have a discovery filter,
      // but this only works on Android 5.X and higher (API level 21 and later)
      //var filter_supported = (parseInt(device.version[0]) > 5);
      var filter_supported = true;
      // OK, we have Bluetooth, let's do the discovery now
      function startScanSuccess(status) {
        // Stop discovery after 15 seconds.
        if (status.status == 'scanStarted') {
          setTimeout(function () {
            bluetoothle.stopScan(function () {
                  console.log('Stopped scan');
                  // self.trigger('status', {scanning: false});
              }, function () {});
            }, 15000);
          }

          if (status.address) {
            // Don't issue 'ports' messages repeatedly when scanning,
            // because the BTLE subsystem triggers events several times
            // per second for each devices it sees as long as it sees them
            if (device_names[status.address] == undefined ||
                  (device_names[status.address].name != status.name)) {
                  device_names[status.address] = {
                    name: status.name || status.address,
                    address: status.address,
                    rssi: status.rssi
                  };
                  console.log('New BT Device', status);
                  cb(status);
                  //self.trigger('ports', device_names);
              }
            }
          }

          function startScanError(status) {
              console.log(status);
          }

          function startScan() {
              bluetoothle.startScan(startScanSuccess, startScanError, {
                  services: (filter_supported) ? ["ab513917-82bd-48fb-907f-66b87561d0f3" ] : [],
                  allowDuplicates: true
              });
          };

          function success(status) {
              if (status.status == 'disabled') {
                  // The user didn't enable BT...
                  bluetoothle.enable();
                  setTimeout(function() {
                      //self.trigger('status', {scanning: true});
                      startScan();
                  }, 10000);
              } else {
                  //self.trigger('status', {scanning: true});
                  startScan();
              }
          };

          function btinit() {
              bluetoothle.initialize(success, {
                  request: false,
                  statusReceiver: true
              });
          }

          if (device.platform == 'iOS') {
              btinit();
          } else {
              // Before anything else, make sure we have the right permissions (Android 6 and above only)
              bluetoothle.hasPermission(function (status) {
                  if (!status.hasPermission) {
                      bluetoothle.requestPermission(function (status) {
                          if (status.requestPermission) {
                              btinit();
                          }
                      });
                  } else {
                      btinit();
                  }
              });
          }
    };

    /**
     *   Track connection status
     * @param {*Function} cb 
     * @param {*Object} result 
     */
    _trackConnect(cb, result) {
        var self = this;
      
        if (result.status == 'connecting') {
            console.log(result);
            return;
        }
        if (result.status == 'connected') {
            // Right after we connect, we do a service
            // discovery, so that we can then connect to the various
            // services & characteristics. This is the Android call, the
            // iPhone call will be different:
            bluetoothle.discover(function (r) {
                if (r.status != 'discovered')
                    return;
                self.portOpen = true;
                if (self.timeoutCheckTimer) {
                    clearTimeout(self.timeoutCheckTimer);
                    self.timeoutCheckTimer = 0;
                }

                // We now have our services. We could check that we did
                // indeed get the master service we're looking for, but we
                // used a filter in the first place, so we know that the device
                // does have this service indeed...
                if (cb) cb(); // cb can be null if we're back from a reconnect...
            }, function (err) {
                console.log(err);              
            }, {
                address: self.devAddress
            });
            return;
        }
        if (result.status == 'disconnected') {
            console.log('_trackconnect - disconnected', result);
            // OK, the device disappeared: we will try to
            // reconnect as long as the user does not explicitely
            // ask to close
            this.portOpen = false;

            // We lost the connection, try to get it back
            bluetoothle.reconnect(this._trackConnect.bind(this, null), this._trackError.bind(this), {
                address: this.devAddress
            });
            console.log('status', {
                reconnecting: true
            });
        }
    }

    // Make sure that if after X seconds we have no connection, we cancel
    // the attempt
    _checkConnectDelay() {
        console.log('Check connect delay timeout');
        if (!this.portOpen) {
            this.disconnect();
            console.log('status', {
                openerror: true,
                reason: 'Device connection error',
                description: 'Could not connect to device. In you just enabled bluetooth, you might have to wait up to 15 seconds before you can connect.'
            });
        }
    }

    // This is called whenever we lose the connection
    _trackError(err) {
        console.log('_trackError', err);
        if (!this.portOpen) {
            // if the port was not open and we got an error callback, this means
            // we were not able to connect in the first place...
            console.log('status', {
                openerror: true,
                reason: 'Device connection error in _trackError',
                description: 'Android error: ' + err.message
            });
            // Do a disconnect to make sure we end up in a sane state:
            this.close();
        } else {
            this.portOpen = false;
            // We lost the connection, try to get it back
            bluetoothle.reconnect(this._trackConnect.bind(this, null), this._trackError.bind(this), {
                address: devAddress
            });
            console.log('status', {
                reconnecting: true
            });
        }
    }
}

export let rpiService = new RPiService()