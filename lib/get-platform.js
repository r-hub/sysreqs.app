
var urls = require('../lib/urls');
var redis = require('redis');
require("redis-scanstreams")(redis);
var client = redis.createClient(urls.redis_port, urls.redis_host);

function get_platform(id, callback) {
    client.get("platform:" + id, function(err, res) {
	if (err) { callback(err); return; }
	callback(null, JSON.parse(res));
    })
}

module.exports = get_platform;
