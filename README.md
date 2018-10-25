# Raspberry Pi BLE Configuration

An attempt at solving the chicken-and-egg issue of how to configure a Raspberry Pi's Wifi settings without connecting it to the network or a screen and keyboard.

This repository contains:

- A nodejs daemon that you can run as an init script and advertises a Wifi config service
- A simple HMTL app that you can run on your Android phone to configure your Raspberry Pi.

License: MIT

## Notes

The service that is advertised will let the app change the Wifi settings easily. It never gives out the Wifi password, but can potentially let someone else chance the wifi settings of the Pi. If this is an issue, you should considering extending this service to add a command to disable it form the app.

