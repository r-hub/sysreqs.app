var express = require('express');
var router = express.Router();
var populate = require('../lib/populate');
var tail = require('terminus').tail;
var toArray = require('stream-to-array')
var async = require('async');

var urls = require('../lib/urls');
var redis = require('redis');
require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_port, urls.redis_host);

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
    var query = req.params[0];
    toArray(
	client.scan({ pattern: "sysreq:*" }),
	function(err, arr) {
	    if (err) {
		res.status(404)
		    .set('Content-Type', 'application/json')
		    .send({ error: "not found" });

	    } else {
		arr = arr.map(function(x) { return x.replace("sysreq:", "") });
		async.filter(arr, try_map, function(results) {
		    res.set('Content-Type', 'application/json')
			.send(results);
		})
	    }
	}
    );

    function try_map(name, callback) {
	var item = "sysreq:" + name;
	client.get(item, function(err, entry) {
	    if (err) { callback(err); return; }
	    entry = JSON.parse(entry);
	    var reqs = entry[name].sysreqs;
	    if (reqs.constructor !== Array) { reqs = [ reqs ]; }
	    for (var p = 0; p < reqs.length; p++) {
		req = reqs[p];
		console.log(req);
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

		console.log(gotit);
		if (gotit) { callback(true); return; }
	    }

	    callback(false);
	})
    }
})

// ------------------------------------------------------------------
// Get canonical system requirement names for a CRAN package
// The latest version is used by default. Version numbers can be
// given after a dash.
//
// The mapping are cached in the DB. (TODO)

var re2 = new RegExp('/pkg/([-\\w\\.]+)$');

router.get(re2, function(req, res) {
    // TODO
})

// ------------------------------------------------------------------
// Get OS dependent requirements for a CRAN package

var re3 = new RegExp('/pkg/([-\\w\\.]+)/([\\w]+)$');

router.get(re3, function(req, res) {
    // TODO
})

module.exports = router;
