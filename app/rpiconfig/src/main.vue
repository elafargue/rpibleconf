<template>
	<!-- App -->
	<div id="app">
		<!-- Statusbar -->
		<f7-statusbar></f7-statusbar>
		<!-- Left Panel with "cover" effect -->
		<f7-panel left cover>
		<f7-view>
			<f7-pages navbar-fixed>
			<f7-page>
				<f7-navbar title="About"></f7-navbar>
				<f7-block>
					<p>ConfiBLE, by Wizkers.io. Configure your Raspberry Pi over BLE.</p>
					<p>Visit <a href="http://wizkers.io/">Wizkers.io</a> for details.</p>
				</f7-block>
			</f7-page>
			</f7-pages>
		</f7-view>
		</f7-panel>
		<!-- Main Views -->
		<f7-views>
			<f7-view id="main-view" navbar-through :dynamic-navbar="true" main>
				<!-- Navbar -->
				<f7-navbar>
					<f7-nav-left>
						<f7-link icon="icon-bars" open-panel="left"></f7-link>
					</f7-nav-left>
					<f7-nav-center sliding>ConfiBLE</f7-nav-center>
				</f7-navbar>
				<!-- Pages -->
				<f7-pages>
					<f7-page>
						<f7-block>
							<f7-button fill raised v-on:click="onDevClick">{{ devStatus }}</f7-button>
						</f7-block>
						<f7-block-title>Tasks</f7-block-title>
						<f7-list>
							<f7-list-item link="/wifi/" title="Setup WiFi"></f7-list-item>
						</f7-list>
					</f7-page>
				</f7-pages>
			</f7-view>
		</f7-views>
		
		<!-- Popup -->
		<f7-popup id="devselect">
			<f7-view navbar-fixed>
				<f7-pages>
					<f7-page>
						<f7-navbar title="Select Raspberry Pi">
							<f7-nav-right>
								<f7-link :close-popup="true">Close</f7-link>
							</f7-nav-right>
						</f7-navbar>
						<f7-block>
							<f7-button fill raised v-on:click="scanPi" >SCAN</f7-button>
						</f7-block>
						<f7-block>
							<f7-list>
					            <f7-list-item v-for="(item, key) in devs" :key="key"
								              v-on:click="connectPi(key)">
									{{item.name}}
								</f7-list-item>
							</f7-list>
						</f7-block>
					</f7-page>
				</f7-pages>
			</f7-view>
		</f7-popup>

	</div>
</template>

<script>

	import { rpiService } from "./assets/js/rpiService.js"

	console.log('Initialized RPI Service in vue', rpiService)

	var devices = [];

	export default {
		data() {
			return {
				devs: devices,
				devStatus: 'Select Pi'
			}
		},
		methods: {
			onDevClick: function() {
				var self = this;
				if (rpiService.isConnected()) {
					rpiService.disconnect(function() {
						self.devStatus = 'Select Pi';
					});
				} else {
					console.log('Open device select');
					console.log(this.$$('#devselect'));
					this.$f7.popup('#devselect');
				}
			},
			scanPi: function() {
				var cb = function(status) {
					console.log('Got a new device', status.name);
					devices.push({name: status.name, address: status.address});
				}
				devices.splice(0, devices.length); // We can't simply assign to [] to empty because we need to keep the reference
				rpiService.findPis(cb);
			},
			connectPi: function(idx) {
				var self = this;
				console.log('Connect to device:', devices[idx].name);
				this.$f7.showIndicator();
				rpiService.connect(devices[idx].address, function() {
					self.$f7.hideIndicator();
					self.devStatus = 'Disconnect';
					self.$f7.closeModal();
				});
			}

		}
	}
</script>
