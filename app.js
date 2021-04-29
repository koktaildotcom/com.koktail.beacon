'use strict';

const Homey = require('homey');

class Beacon extends Homey.App {

    isPairing = false;

    /**
     * on init the app
     */
    async onInit() {

        this._log = [];

        console.log('Successfully init Beacon app version: %s', this.manifest.version);

        if (!this.homey.settings.get('ignoreAddressType')) {
            this.homey.settings.set('ignoreAddressType', true)
        }

        if (!this.homey.settings.get('updateInterval')) {
            this.homey.settings.set('updateInterval', 10)
        }

        if (!this.homey.settings.get('timeout')) {
            this.homey.settings.set('timeout', 30)
        }

        if (!this.homey.settings.get('verificationAmountInside')) {
            this.homey.settings.set('verificationAmountInside', 1)
        }

        if (!this.homey.settings.get('verificationAmountOutside')) {
            this.homey.settings.set('verificationAmountOutside', 5)
        }

        this.logTrigger = this.homey.flow.getTriggerCard('log');

        this.beaconInsideRange = this.homey.flow.getTriggerCard('beacon_inside_range');

        this.deviceBeaconInsideRange = this.homey.flow.getDeviceTriggerCard('device_beacon_inside_range');

        this.beaconOutsideRange = this.homey.flow.getTriggerCard('beacon_outside_range');

        this.deviceBeaconOutsideRange = this.homey.flow.getDeviceTriggerCard('device_beacon_outside_range');

        this.beaconStateChanged = this.homey.flow.getTriggerCard('beacon_state_changed');

        this.deviceBeaconStateChanged = this.homey.flow.getDeviceTriggerCard('device_beacon_state_changed');

        this.deviceBeaconIsInsideRange = this.homey.flow.getConditionCard('beacon_is_inside_range')
        this.deviceBeaconIsInsideRange.registerRunListener((args, state) => {
            return args.device.getCapabilityValue("detect");
        });

        this.homey.flow.getActionCard('update_beacon_presence')
            .registerRunListener(async () => {
                return Promise.resolve(await this.scanning())
            });

        if (this._useTimeout()) {
            await this.scanning();
        }

        this.homey.settings.on('set', function (setting) {
            if (setting === 'useTimeout') {
                if (this.homey.settings.get('useTimeout') !== false) {
                    this.homey.app.scanning()
                }
            }
        })
    }

    log(message) {
        const logMessage = this._getDateTime(new Date()) + ' ' + message;
        console.log(logMessage);
        this._log.push(logMessage);

        // limit log
        if (this._log.length > 100) {
            this._log.length = 101;
        }
    }

    sendLog() {
        if (this.logTrigger) {
            this.logTrigger.trigger({
                'log': this._log.join('')
            })
        }
    }

    /**
     * @param date Date
     * @returns {string}
     * @private
     */
    _getDateTime(date) {

        let hour = date.getHours();
        hour = (hour < 10 ? "0" : "") + hour;

        let min = date.getMinutes();
        min = (min < 10 ? "0" : "") + min;

        let sec = date.getSeconds();
        sec = (sec < 10 ? "0" : "") + sec;

        let year = date.getFullYear();

        let month = date.getMonth() + 1;
        month = (month < 10 ? "0" : "") + month;

        let day = date.getDate();
        day = (day < 10 ? "0" : "") + day;

        return day + "-" + month + "-" + year + " " + hour + ":" + min + ":" + sec;
    }

    /**
     * @private
     *
     * set a new timeout for synchronisation
     */
    _setNewTimeout() {
        const seconds = this.homey.settings.get('updateInterval')
        console.log('try to scan again in ' + seconds + ' seconds')
        setTimeout(this.scanning.bind(this), 1000 * seconds)
    }

    /**
     * @private
     *
     * handle generic_beacon matches
     */
    async scanning() {
        console.log('start scanning')
        if (this._useTimeout() && this.isPairing) {
            console.log('stop scanning for now, try to pair')
            this._setNewTimeout();

            return;
        }

        try {
            let updateDevicesTime = new Date()
            const advertisements = await this.homey.ble.discover([], this.homey.settings.get('timeout') * 1000);
            if (advertisements.length !== 0) {
                this.homey.emit('update.beacon.status', advertisements)
            } else {
                this.log('No advertisements given');
            }
            this.log('All devices are synced complete in: ' + (new Date() - updateDevicesTime) / 1000 + ' seconds')

            if (this._useTimeout()) {
                this._setNewTimeout()
            }

            return true
        } catch (error) {
            this.log(error.message)

            if (this._useTimeout()) {
                this._setNewTimeout()
            }

            return false
        }
    }

    _useTimeout() {
        return (this.homey.settings.get('useTimeout') !== false);
    }
}

module.exports = Beacon;
