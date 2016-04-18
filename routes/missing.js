
var express = require('express');
var router = express.Router();
var urls = require('../lib/urls');
var map = require('../lib/map');
var got = require('got');
var async = require('async');

var redis = require('redis');
require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_url);

router.get('/missing', function(req, res) {
  var url = urls.crandb + '/-/sysreqs';
  got(url, function(err, data) {
    if (err) { return console.log(err); }
    var sys = JSON.parse(data);
    var keys = Object.keys(sys);
    async.filterLimit(
      keys,
      10,
      function(item, callback) {
        if (item.indexOf('-') > -1) { return callback(false); }
        map(client, sys[item], function(err, canon) {
          if (err) { return callback(false); }
          callback(true);
        })
      },
      function(results) {
        var sres = results.map(function(x) {
            return { 'package': x, 'SystemRequirements': sys[x] };
        })
        res.set('Content-Type', 'application/json')
           .send(JSON.stringify(sres));
      }
    )
  });
});

module.exports = router;
