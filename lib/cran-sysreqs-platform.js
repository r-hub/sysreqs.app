
var async = require('async');

var get_platform = require('../lib/get-platform');
var match_platform = require('../lib/match-platform');
var cran_sysreqs = require('../lib/cran-sysreqs');

function cran_sysreqs_platform(pkgstr, platform, callback) {
    cran_sysreqs(pkgstr, function(err, sysreqs) {
        if (err) { return(callback(err)); }
        get_platform(platform, function(err, platform) {
	    if (err || ! platform) { return callback("unknown platform"); }
	    async.mapSeries(
	        sysreqs,
	        function(x, cb) { return match_platform(x, platform, cb) },
	        function(err, pkgs) { return callback(null, pkgs); }
	    )
        })
    })
}

module.exports = cran_sysreqs_platform;
