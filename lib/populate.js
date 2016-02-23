var ghGot = require('gh-got');
var got = require('got');
var urls = require('../lib/urls');
var redis = require('redis');
var client = redis.createClient(urls.redis_port, urls.redis_host);

var user = "r-hub";
var repo = "sysreqs";

function populate() {
    populate_this("sysreqs", "sysreq:");
    populate_this("platforms", "platform:");
}

function populate_this(subdir, prefix) {
    var url = "repos/" + user + "/" + repo + "/contents/" + subdir;
    ghGot(url, function(err, res) {
	if (err) { console.log(err); return; }
	var file_list = res.map(function(x) { return x.download_url });
	var add_res = file_list.map(
	    function(x) { download_and_add(x, prefix); }
	);
    })
}

function download_and_add(url, prefix) {
    got(url, function(err, res) {
	if (err) { console.log(err); return; }
	var entry = JSON.parse(res);
	var name = get_name(entry, prefix);
	client.set(name, res);
	return true;
    })
}

function get_name(x, prefix) {
    if (x.id) return prefix + x.id;
    for (var key in x) {
	if (x.hasOwnProperty(key)) return prefix + key;
    }
}

module.exports = populate;
