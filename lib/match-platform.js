var isArray = require('is-array');
var inArray = require('../lib/in-array');

function match_platform(sysreq, platform, callback) {
    var name = Object.keys(sysreq)[0];
    var platforms = sysreq[name].platforms;
    var type = platforms[platform['name']];
    if (!type) { callback(null); return; }

    if (typeof type === 'string') { callback(null, type); return; }

    if (isArray(type)) {
	return match_array(type, platform, callback);
    } else {
	return match_object(type, platform, callback);
    }
}

function match_array(sysreqs, platform, callback) {
    var done = false;
    var i;
    for (i = 0; i < sysreqs.length; i++) {
        var sr = sysreqs[i];
	if (sr['distribution'] === undefined) {
	    done = true;
	    return callback(null, sr['buildtime']);

	} else if (platform['distribution'] === sr['distribution']) {
	    if (!sr['releases'] ||
		inArray(platform['release'], sr['releases'])) {
		done = true;
		return callback(null, sr['buildtime']);
	    }
	}
    }
    if (!done) callback(null);
}

function match_object(sysreq, platform, callback) {
    if ('script' in sysreq) {
	callback(null, 'script: ' + sysreq['script']);
    } else {
	callback(null, sysreq['buildtime']);
    }
}

module.exports = match_platform;
