var isArray = require('is-array');

function inArray(item, arr) {
    if (!arr) { return false; }
    if (!isArray(arr)) { return false; }
    return arr.indexOf(item) > -1;
}

module.exports = inArray;
