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

router.get("/", function(req, res) {
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
        if (err) { throw(err); }
        var summary = {
            'name': process.env.SYSREQS_NAME || 'A sysreqs server',
            'sysreqs-version': '0.0.2', // TODO: should read package.json
            'sysreqs': meta.sysreqs,
            'platforms': meta.platforms,
            'scripts': meta.scripts,
            'overrides': meta.overrides,
            'last-updated': meta.last || 'never' };

        res.set('Content-Type', 'application/json')
	    .send(JSON.stringify(summary));
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
// Get a canonical mapping

router.get(new RegExp('^/get/([-\\w\\._]+)$'), function(req, res) {
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

var re1 = new RegExp('^/map/(.*)$');
router.get(re1, function(req, res) {
    query = req.params[0];
    map(client, query, function(err, result) {
	if (err) {
	    res.status(404)
		.render('error', {
		    message: 'sysreq not found',
		    error: { }
		});
	    return;
	}
	res.set('Content-Type', 'application/json')
	    .send(result);
    })
})

// ------------------------------------------------------------------
// Like /map, but for a specific platform

var re4 = new RegExp('^/map-platform/(.*)/(.*)$');

router.get(re4, function(req, res) {

    var query = req.params[1];

    map(client, query, function(err, result) {
	if (err) {
	    res.status(404)
		.render('error', {
		    message: 'sysreq not found',
		    error: { }
		});
	    return;
	}
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

var re2 = new RegExp('^/pkg/([-\\w\\.,]+)$');

router.get(re2, function(req, res) {
    var pkgs = req.params[0].split(',');
    async.map(
	pkgs,
	function(item, callback) {
	    cran_sysreqs(item, function(err, res) {
		if (err) {
		    callback(null, []);
		} else {
		    callback(null, res);
		}
	    })
	},
	function(err, results) {
	    if (err) {
		return res.status(404)
		    .render('error', {
			message: 'sysreq not found',
			error: err
		    });
	    }
	    var merged = [].concat.apply([], results);
	    res.set('Content-Type', 'application/json')
		.send(merged);
	})
    ;
});

// ------------------------------------------------------------------
// Get OS dependent requirements for a CRAN package

var re3 = new RegExp('^/pkg/([-\\w\\.,]+)/(.*)$');

router.get(re3, function(req, res) {
    var pkgs = req.params[0].split(',');
    var platform = req.params[1];
    async.map(
	pkgs,
	function(item, callback) {
	    cran_sysreqs_platform(item, platform, function(err, res) {
		if (err) {
		    callback(null, []);
		} else {
		    callback(null, res);
		}
	    });
	},
	function(err, results) {
	    if (err) {
		return res.status(404)
		    .render('error', {
			message: 'platform not found',
			error: { }
		    });
	    }
	    var merged = [].concat.apply([], results);
	    res.set('Content-Type', 'application/json')
		.send(merged);
	}
    );
})


// ------------------------------------------------------------------
// Get a platform

router.get(new RegExp('^/platform/get/([-\\w\\._]+)$'), function(req, res) {
    client.get('platform:' + req.params[0], function(err, entry) {
	if (err || entry === null) {
	    res.status(404)
		.render('error', {
		    message: err,
		    error: { }
		});

	} else {
	    res.set('Content-Type', 'application/json')
		.send(entry);
	}
    });
});

// ------------------------------------------------------------------
// List platforms

router.get('/platform/list', function(req, res) {
    var limit = req.query.limit || 10;
    var offset = req.query.offset || 0;
    toArray(
	client.scan({ pattern: "platform:*" }),
	function(err, arr) {
	    if (err) {
		res.status(500)
		    .render('error', {
			message: 'cannot connect to database',
			error: { }
		    });

	    } else {
		arr = arr.map(function(x) { return x.replace("platform:", "") });
		arr.sort();
		res.set('Content-Type', 'application/json')
		    .send(arr);
	    }
	}
    )
})

// ------------------------------------------------------------------
// Get a script

router.get(new RegExp('/script/([-\\w\\._]+)$'), function(req, res) {
    client.get('script:' + req.params[0], function(err, entry) {
	if (err || entry === null) {
	    res.status(404)
		.render('error', {
		    message: 'script not found',
		    error: { }
		});

	} else {
	    res.set('Content-Type', 'application/text')
		.send(entry);
	}
    });
});

module.exports = router;
