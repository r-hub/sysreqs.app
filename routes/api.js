var express = require('express');
var router = express.Router();
var populate = require('../lib/populate');
var get_platform = require('../lib/get-platform');
var match_platform = require('../lib/match-platform');
var tail = require('terminus').tail;
var toArray = require('stream-to-array')
var async = require('async');
var got = require('got');

var urls = require('../lib/urls');
var redis = require('redis');
require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_url);

// ------------------------------------------------------------------
// Download all entries from GitHub, and put them into the
// Redis DB

router.get("/populate", function(req, res) {

    populate();

    res.set('Content-Type', 'application/json')
	.send({ 'operation': 'populate',
		'result': 'OK' });
})

// ------------------------------------------------------------------
// Get a canonical mapping

router.get(new RegExp('/get/([-\\w\\._]+)$'), function(req, res) {
    client.get('sysreq:' + req.params[0], function(err, entry) {
	if (err || entry === null) {
	    res.status(404)
		.render('error', {
		    message: 'sysreq not found',
		    error: { }
		});

	} else {
	    res.set('Content-Type', 'application/json')
		.send(entry);
	}
    })
})

// ------------------------------------------------------------------
// List canonical mappings

router.get('/list', function(req, res) {
    var limit = req.query.limit || 10;
    var offset = req.query.offset || 0;
    toArray(
	client.scan({ pattern: "sysreq:*" }),
	function(err, arr) {
	    if (err) {
		res.status(500)
		    .render('error', {
			message: 'cannot connect to database',
			error: { }
		    });

	    } else {
		arr = arr.map(function(x) { return x.replace("sysreq:", "") });
		arr.sort();
		res.set('Content-Type', 'application/json')
		    .send(arr);
	    }
	}
    )
})

// ------------------------------------------------------------------
// Map a SystemRequirements field to canonical system requirement names
// We need to load all records from the Redis DB, and search them

var re1 = new RegExp('/map/(.*)$');
router.get(re1, function(req, res) {
    query = req.params[0];
    map(query, function(err, result) {
	if (err) { throw(err); return; }
	res.set('Content-Type', 'application/json')
	    .send(result);
    })
})

function map(query, callback) {
    toArray(
	client.scan({ pattern: "sysreq:*" }),
	function(err, arr) {
	    if (err) { callback(err);  return; }
	    arr = arr.map(function(x) { return x.replace("sysreq:", "") });
	    async.concat(
		arr,
		function(x, cb) { try_map(x, query, cb) },
		callback
	    )
	}
    );
}

function try_map(name, query, callback) {
    var item = "sysreq:" + name;
    client.get(item, function(err, entry) {
	if (err) { callback(err); return; }
	entry = JSON.parse(entry);
	var reqs = entry[name].sysreqs;
	if (reqs.constructor !== Array) { reqs = [ reqs ]; }
	for (var p = 0; p < reqs.length; p++) {
	    req = reqs[p];
	    var gotit = false;

	    // Regular expression or not
	    if (req.length >= 2 && req[0] == '/') {
		var restr = req.replace(
			/^\/(.*)\/([a-zA-Z]*)$/,
		    function(match, $1, $2) { return $1 }
		);
		var re = new RegExp(restr, "i");
		gotit = re.test(query);

	    } else {
		gotit = query.indexOf(req) > -1;
	    }

	    if (gotit) { callback(null, [ entry ]); return; }
	}

	callback(null, []);
    })
}


// ------------------------------------------------------------------
// Like /map, but for a specific platform

var re4 = new RegExp('/map-platform/(.*)/(.*)$');

router.get(re4, function(req, res) {

    var query = req.params[1];

    map(query, function(err, result) {
	if (err) { throw(err); return; }
	get_platform(req.params[0], function(err, platform) {
	    if (err || ! platform) { res.end("Unknown platform"); return; }
	    async.mapSeries(
		result,
		function(x, cb) { return match_platform(x, platform, cb) },
		function(err, pkgs) {
		    res.set('Content-Type', 'application/json')
			.send(pkgs);
		}
	    )
	})
    })
})

// ------------------------------------------------------------------
// Get canonical system requirement names for a CRAN package
// The latest version is used by default. Version numbers can be
// given after a dash.
//
// First check if the system requirement is in the overrides.
// If yes, then just use that. Otherwise use crandb to get the
// SystemRequirements field.
//
// The mapping are cached in the DB. (TODO)

var re2 = new RegExp('/pkg/([-\\w\\.]+)$');

router.get(re2, function(req, res) {
    var pkg = req.params[0];
    client.get('cran:' + pkg, function(err, entry) {

	if (err || entry === null) {
	    // Error, we get it from crandb
	    got(urls.crandb + '/-/sysreqs?key="' + pkg + '"', function(err, data) {
		if (err) { throw(err); return; }
		map(data, function(err, result) {
		    if (err) { throw(err); return; }
		    res.set('Content-Type', 'application/json')
			.send(result);
		})
	    })
	} else {
	    var sysreq = JSON.parse(entry)[pkg];
	    // No error, so we have the canonical names
	    map(sysreq, function(err, result) {
		if (err) { throw(err); return; }
		res.set('Content-Type', 'application/json')
		    .send(result);
	    })
	}
    })
})

// ------------------------------------------------------------------
// Get OS dependent requirements for a CRAN package

var re3 = new RegExp('/pkg/([-\\w\\.]+)/(.*)$');

router.get(re3, function(req, res) {
    var pkg = req.params[0];
    got(urls.crandb + '/-/sysreqs?key="' + pkg + '"', function(err, data) {
	if (err) { throw(err); return; }
	get_platform(req.params[1], function(err, platform) {
	    if (err || ! platform) { throw("Unknown platform"); return; }
	    map(data, function(err, result) {
		if (err) { throw(err); return; }
		async.mapSeries(
		    result,
		    function(x, cb) { return match_platform(x, platform, cb) },
		    function(err, pkgs) {
			res.set('Content-Type', 'application/json')
			    .send(pkgs);
		    }
		)
	    })
	})
    })
})

module.exports = router;
