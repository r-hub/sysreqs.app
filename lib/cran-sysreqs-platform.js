
var got = require('got');
var redis = require('redis');
var isArray = require('is-array');
var async = require('async');

var map = require('../lib/map');
var urls = require('../lib/urls');
var get_platform = require('../lib/get-platform');
var match_platform = require('../lib/match-platform');

require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_url);

function cran_sysreqs_platform(pkg, platform, callback) {
    var pkgnover = pkg.split('-')[0];
    client.get('cran:' + pkgnover, function(err, entry) {

	if (err || entry === null) {
	    got(urls.crandb + '/-/sysreqs?key="' + pkg + '"', function(err, data) {
		if (err) { return callback(err); }
		get_platform(platform, function(err, platform) {
		    if (err || ! platform) { return callback("unknown platform"); }
		    map(client, data, function(err, result) {
			if (err) { return callback('sysreq not found'); }
			async.mapSeries(
			    result,
			    function(x, cb) { return match_platform(x, platform, cb) },
			    function(err, pkgs) {
				callback(null, pkgs);
			    }
			)
		    })
		})
	    })

	} else {
	    var sysreq = JSON.parse(entry)[pkgnover];
	    if (!isArray(sysreq)) { sysreq = [ sysreq ]; }
	    get_platform(platform, function(err, platform) {
		if (err || ! platform) { return callback("unknown platform"); }
		async.map(
		    sysreq,
		    function(item, callback) {
			client.get('sysreq:' + item, callback);
		    },
		    function(err, results) {
			if (err) { return callback(err); }
			results = results.map(JSON.parse);
			async.mapSeries(
			    results,
			    function(x, cb) { return match_platform(x, platform, cb); },
			    function(err, pkgs) {
				callback(null, pkgs);
			    }
			)
		    }
		)
	    })
	}
    })
    
}

module.exports = cran_sysreqs_platform;
