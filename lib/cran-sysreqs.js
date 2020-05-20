
var got = require('got');
var redis = require('redis');
var isArray = require('is-array');
var async = require('async');

var map = require('../lib/map');
var urls = require('../lib/urls');

require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_url);

function cran_sysreqs(pkgstr, callback) {
    var pkgs = pkgstr.split(',');
    var keys = pkgs.map(function(x) { return 'cran:' + x; });
    client.mget(keys, function(err, res) {
        if (err) { return(callback(err)); }
        var sr = [];
        var miss = [];
        for (i = 0; i < keys.length; i++) {
            if (pkgs[i] == "R") {
                // do nothing
            } else if (res[i] === null) {
                miss.push(pkgs[i]);
            } else {
                sr.push(res[i]);
            }
        }
        var srs0 = sr.join('\n');
        if (miss.length > 0) {
            var url = urls.crandb + '/-/sysreqs?keys=' +
                JSON.stringify(miss);
            got(url, function(err, data) {
                if (err) { return callback(err); }
                var ans = JSON.parse(data);
                var anskeys = Object.keys(ans);
                var arr = [];
                // Put _all_ missing packages into the cache, including the
                // ones not found in the crandb. This helps avoiding
                // repeated crandb queries for non-cran packages.
                var multi = client.multi();
                for (i = 0; i < miss.length; i++) {
                    var key = 'cran:' + miss[i];
                    var val = ans[miss[i]] || '';
                    multi.set(key, val, 'EX', 5 * 60 * 60); // 5 hours
                }
                multi.exec()
                if (arr.length > 0) {
                    client.mset(arr, function(err, res) {
                        if (err) {
                            console.log("Cannot add to cache: ", arr, err);
                        }
                    });
                }
                var srs = Object.values(ans).join("\n");
                return map(client, srs0 + '\n' + srs, callback);
            })
        } else {
            return map(client, srs0, callback);
        }
    });
}

module.exports = cran_sysreqs;
