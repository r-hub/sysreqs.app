var express = require('express');
var router = express.Router();
var populate = require('../lib/populate');

var urls = require('../lib/urls');
var redis = require('redis');
var client = redis.createClient(urls.redis_port, urls.redis_host);

// A simple summary of the API

router.get("/", function(req, res) {
    res.render('index');
})


// Download all entries from GitHub, and put them into the
// Redis DB

router.get("/populate", function(req, res) {

    populate();

    res.set('Content-Type', 'application/json')
	.send({ 'operation': 'populate',
		'result': 'OK' });
})

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

// Map a SystemRequirements field to canonical system requirement names
// We need to load all records from the Redis DB, and search them

var re1 = new RegExp('/map/(.*)$');

router.get(re1, function(req, res) {

})

// Get canonical system requirement names for a CRAN package
// The latest version is used by default. Version numbers can be
// given after a dash.
//
// The mapping are cached in the DB. (TODO)

var re2 = new RegExp('/pkg/([-\\w\\.]+)$');

router.get(re2, function(req, res) {

})

// Get OS dependent requirements for a CRAN package

var re3 = new RegExp('/pkg/([-\\w\\.]+)/([\\w]+)$');

router.get(re3, function(req, res) {

})

module.exports = router;
