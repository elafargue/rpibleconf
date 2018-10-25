<template>
	<f7-page>
		<f7-navbar title="WiFi" back-link="Back" sliding></f7-navbar>
		<f7-block>
			<p>WiFi configuration</p>
		</f7-block>
		<f7-list form>
			<f7-list-item>
				<f7-label>SSID</f7-label>
				<f7-input type="text" v-model="ssid" placeholder="Enter SSID here"></f7-input>
			</f7-list-item>
			<f7-list-item>
				<f7-label>Key</f7-label>
				<f7-input type="text" v-model="psk" placeholder="Enter PSK key here"></f7-input>
			</f7-list-item>
		</f7-list>
		<f7-block>
			<f7-button fill raised v-on:click="writeWifi">Save</f7-button>
		</f7-block>

		<f7-block>
			<f7-chip :bg="statuscolor" :text="status"></f7-chip>
			<f7-chip :text="wlanip"></f7-chip>
			<f7-chip :text="ethip"></f7-chip>
		</f7-block>

	</f7-page>
</template>

<script>
	import { rpiService } from "../../js/rpiService.js"

	// Careful to bind this function to 'this'
	var refreshNetInfo = function() {
		var self = this;
		rpiService.getNetInfo( function(info) {
			if (info.status) {
				self.status = info.status;
				self.statuscolor = red;
				return;
			}
			if (info.if_status == 'COMPLETED') {
				info.if_status = 'WiFi is up'; // Easier to understand...
				self.statuscolor = 'green';
			}
			if (info.if_status == '') {
				info.if_status = 'Wifi configuration issue';
				self.statuscolor = 'red';
			}
			self.status = info.if_status;
			self.wlanip = 'Wifi IP: ' + info.wlanip;
			self.ethip = 'Eth IP: ' + info.ethip;
		});
	}

	export default {
		data() {
			return {
				ssid: '',
				psk: '',
				status: 'WiFi disconnected',
				wlanip: 'Wifi IP: not assigned',
				ethip: 'Eth IP: not assigned',
				statuscolor: 'green'
			}
		},
		methods: {
			writeWifi: function() {
				var self = this;
				if (!this.psk) {
					this.$f7.alert('PSK Key cannot be empty', 'Error');
				} else {
					this.$f7.showIndicator();
					rpiService.setWifi(this.ssid, this.psk, function() {
						self.status = "Wifi coming up, wait 5 seconds...";
						self.statuscolor = "orange";
						self.wlanip = "Wifi IP: not assigned";
						self.$f7.hideIndicator();
						setTimeout(refreshNetInfo.bind(self), 6000);
					});
				}
			}
		},
		mounted () {
			console.log('Mounted');
			var self = this;
			if (!rpiService.isConnected()) {
				this.status = 'Not connected to a Pi';
				this.statuscolor = 'red';
			} else {
				rpiService.getWifiInfo( function(info) {
					if (info.status) {
						self.status = info.status;
						self.statuscolor = red;
						return;
					}
					self.ssid = info.ssid;
				});
				refreshNetInfo.bind(this)();
			}
  		 }
	}
</script>