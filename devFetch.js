const Fetch = require('./fetch.js');
const path = require('path');
var fs = require('fs');


class DevFetch extends Fetch {
    constructor() {
        super();
    }

    fetchFromFile(req, fileName) {
        return new Promise(function (resolve, reject) {
            fs.readFile('dev_config' + path.sep + fileName, 'utf8', function (err, contents) {
                if (err) reject(err);
                resolve(contents);
            });
        });
    }
}

module.exports = DevFetch;
