var express = require('express');
var router = express.Router();
var populate = require('../lib/populate');
var map = require('../lib/map');
var get_platform = require('../lib/get-platform');
var match_platform = require('../lib/match-platform');
var tail = require('terminus').tail;
var toArray = require('stream-to-array')
var async = require('async');
var got = require('got');
var isArray = require('is-array');

var urls = require('../lib/urls');
var redis = require('redis');
require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_url);

var cran_sysreqs = require('../lib/cran-sysreqs');
var cran_sysreqs_platform = require('../lib/cran-sysreqs-platform');

// ------------------------------------------------------------------
// Summary

router.get("/", function(req, res, next) {
    async.parallel({
        sysreqs: function(callback) {
            client.eval(
                "return #redis.pcall('keys', 'sysreq:*')", 0, callback)
        },
        platforms: function(callback) {
            client.eval(
                "return #redis.pcall('keys', 'platform:*')", 0, callback)
        },
        scripts: function(callback) {
            client.eval(
                "return #redis.pcall('keys', 'script:*')", 0, callback)
        },
        overrides: function(callback) {
            client.eval(
                "return #redis.pcall('keys', 'cran:*')", 0, callback)
        },
        last: function(callback) {
            client.get(
                "meta:last-updated", callback)
        }
    }, function(err, meta) {
        if (err) { return next(err); }
        var summary = {
            'name': process.env.SYSREQS_NAME || 'A sysreqs server',
            'sysreqs-version': '0.0.2', // TODO: should read package.json
            'sysreqs': meta.sysreqs,
            'platforms': meta.platforms,
            'scripts': meta.scripts,
            'overrides': meta.overrides,
            'last-updated': meta.last || 'never' };

        res.set('Content-Type', 'application/json')
	    .send(summary);
    })
});

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
// List canonical mappings

router.get('/sysreq', function(req, res, next) {
    var limit = req.query.limit || 10;
    var offset = req.query.offset || 0;
    toArray(
	client.scan({ pattern: "sysreq:*" }),
	function(err, arr) {
	    if (err) { return next(err); }
	    arr = arr.map(function(x) { return x.replace("sysreq:", "") });
	    arr.sort();
	    res.set('Content-Type', 'application/json')
		.send(arr);
	}
    )
})

// ------------------------------------------------------------------
// Get a canonical mapping

router.get('/sysreq/:id', function(req, res, next) {
    client.get('sysreq:' + req.params.id, function(err, entry) {
        if (err) { return next(err); }
        if (entry === null) {
	    res.status(404)
	        .set('Content-Type', 'application/json')
                .send({ "status": "error",
                        "message": "sysreq not found" });
	} else {
	    res.set('Content-Type', 'application/json')
		.send(entry);
	}
    })
})

// ------------------------------------------------------------------
// List platforms

router.get('/platform', function(req, res, next) {
    toArray(
	client.scan({ pattern: "platform:*" }),
	function(err, arr) {
            if (err) { return next(err); }
	    arr = arr.map(function(x) { return x.replace("platform:", "") });
	    arr.sort();
	    res.set('Content-Type', 'application/json')
		.send(arr);
	    }
    )
})

// ------------------------------------------------------------------
// Get a platform

router.get('/platform/:id', function(req, res, next) {
    client.get('platform:' + req.params.id, function(err, entry) {
        if (err) { return next(err); }
	if (entry === null) {
	    res.status(404)
	        .set('Content-Type', 'application/json')
                .send({ "status": "error",
                        "message": "platform not found" });
	} else {
	    res.set('Content-Type', 'application/json')
		.send(entry);
	}
    });
});

// ------------------------------------------------------------------
// List scripts

router.get('/script', function(req, res, next) {
    toArray(
	client.scan({ pattern: "script:*" }),
	function(err, arr) {
            if (err) { return next(err); }
	    arr = arr.map(function(x) { return x.replace("script:", "") });
	    arr.sort();
	    res.set('Content-Type', 'application/json')
		.send(arr);
	    }
    )
})

// ------------------------------------------------------------------
// Get a script

router.get('/script/:id', function(req, res, next) {
    client.get('script:' + req.params.id, function(err, entry) {
        if (err) { return next(err); }
	if (entry === null) {
	    res.status(404)
	        .set('Content-Type', 'application/json')
                .send({ "status": "error",
                        "message": "script not found" });
	} else {
	    res.set('Content-Type', 'application/text')
		.send(entry);
	}
    })
})

// ------------------------------------------------------------------
// List overrides

router.get('/override', function(req, res, next) {
    toArray(
	client.scan({ pattern: "cran:*" }),
	function(err, arr) {
            if (err) { return next(err); }
	    arr = arr.map(function(x) { return x.replace("cran:", "") });
	    arr.sort();
	    res.set('Content-Type', 'application/json')
		.send(arr);
	    }
    )
})

// ------------------------------------------------------------------
// Get a script

router.get('/override/:id', function(req, res, next) {
    client.get('cran:' + req.params.id, function(err, entry) {
        if (err) { return next(err); }
	if (entry === null) {
	    res.status(404)
	        .set('Content-Type', 'application/json')
                .send({ "status": "error",
                        "message": "override not found" });
	} else {
	    res.set('Content-Type', 'application/json')
		.send(entry);
	}
    })
})

// ------------------------------------------------------------------
// Map a SystemRequirements field to canonical system requirement names
// We need to load all records from the Redis DB, and search them

router.get('/map/:string', function(req, res, next) {
    map(client, req.params.string, function(err, result) {
	if (err) { return next(err); }
	res.set('Content-Type', 'application/json')
	    .send(result);
    })
})

// ------------------------------------------------------------------
// Like /map, but for a specific platform

router.get('/map/platform/:platform/:string', function(req, res, next) {

    var query = req.params.string;

    map(client, query, function(err, result) {
	if (err) { return next(err); }
	get_platform(req.params.platform, function(err, platform) {
            if (err) { return next(err); }
            if (!platform) {
	    res.status(404)
	        .set('Content-Type', 'application/json')
                .send({ "status": "error",
                        "message": "platform not found" });
            }
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
// Like GET /map, but this supports multiple strings

router.post('/map', function(req, res, next) {
    // TODO
})

// ------------------------------------------------------------------
// Like GET /map/platformd/:platform but this supports multiple strings

router.post('/map/platform/:platform', function(req, res, next) {
    // TODO
})

// ------------------------------------------------------------------
// Map a CRAN package

router.get('/pkg/:package', function(req, res, next) {
    // TODO
})

// ------------------------------------------------------------------
// Map a CRAN package, on a platform

router.get('/pkg/:platform/:package', function(req, res, next) {

})

// ------------------------------------------------------------------
// Map multiple CRAN packages

router.post('/pkg', function(req, res, next) {
    // TODO
})

// ------------------------------------------------------------------
// Map multiple CRAN packages, on a platform

router.post('/pkg/:platform', function(req, res, next) {
    // TODO
})

module.exports = router;
