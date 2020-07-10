"use strict";

const BeaconDriver = require('../../lib/BeaconDriver.js');
const BeaconAdvertisement = require('../../lib/BeaconAdvertisement.js');

class GenericBeaconDriver extends BeaconDriver {
    getBleName() {
        return 'Generic beacon';
    }

    get handledBeaconType() {
        return BeaconAdvertisement.btaGenericBeacon;
    }
}

module.exports = GenericBeaconDriver;