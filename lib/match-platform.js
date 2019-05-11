var isArray = require('is-array');
var inArray = require('../lib/in-array');

function match_platform(sysreq, platform, callback) {
    var name = sysreq.name;
    var deps = sysreq.dependencies;

    if (isArray(type)) {
	return match_array(type, platform, callback);
    } else {
	return match_object(type, platform, callback);
    }
}

function match_array(sysreqs, platform, callback) {
    var done = false;
    sysreqs.forEach(function(sr) {

	if (sr['distribution'] === undefined) {
	    done = true;
	    return callback(null, sr['buildtime']);

	} else if (platform['distribution'] === sr['distribution']) {
	    if (!sr['releases'] ||
		inArray(platform['release'], sr['releases'])) {
		callback(null, sr['buildtime']);
		done = true;
		return;
	    }
	}
    })
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
