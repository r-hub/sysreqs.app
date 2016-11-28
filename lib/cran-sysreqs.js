
var got = require('got');
var redis = require('redis');
var isArray = require('is-array');
var async = require('async');

var map = require('../lib/map');
var urls = require('../lib/urls');

require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_url);

function cran_sysreqs(pkg, callback) {
    var pkgnover = pkg.split('-')[0];
    client.get('cran:' + pkgnover, function(err, entry) {

	if (err || entry === null) {
	    // Error, we get it from crandb
	    got(urls.crandb + '/-/sysreqs?key="' + pkg + '"', function(err, data) {
		if (err) { return callback(err); }

		map(client, data, function(err, result) {
		    if (err) { return callback(err); }
		    return callback(null, result);
		})
	    })
	} else {
	    // No error, so we have the canonical names, no need to map
	    var sysreq = JSON.parse(entry)[pkgnover];
	    if (!isArray(sysreq)) { sysreq = [ sysreq ]; }
	    async.map(
		sysreq,
		function(item, callback) {
		    client.get('sysreq:' + item, callback);
		},
		function(err, results) {
		    if (err) { return console.log(err); }
		    results = results.map(JSON.parse);
		    callback(null, results);
		}
	    );
	}
    })
}

module.exports = cran_sysreqs;
