var ghGot = require('gh-got');
var got = require('got');
var urls = require('../lib/urls');
var redis = require('redis');
var client = redis.createClient(urls.redis_url);

var user = "r-hub";
var repo = "sysreqsdb";
var ref = "v2";

function populate() {
    populate_this("sysreqs", "sysreq:");
    populate_this("platforms", "platform:");
    populate_this("cran", "cran:");
    populate_this("scripts", "script:", false);
}

function populate_this(subdir, prefix, json) {
    if (json === undefined) { json = true; }
    var url = "repos/" + user + "/" + repo + "/contents/" + subdir;
    if (ref) { url = url + "?ref=" + ref; }
    ghGot(url, function(err, res) {
	if (err) { console.log(err); return; }
	var file_list = res.map(function(x) { return x.download_url });
	res.map(function(x) {
	    download_and_add(x.name, x.download_url, prefix, json);
	});
    })
}

function download_and_add(name, url, prefix, json) {
    got(url, function(err, res) {
	var name2 = name, entry;
	if (err) { console.log(err); return; }
	if (json) {
	    entry = JSON.parse(res);
	    name2 = get_name(entry, prefix);
	} else {
	    entry = res;
	    name2 = prefix + name;
	}
	client.set(name2, res);
	console.log("Adding " + name2);
	return true;
    })
}

function get_name(x, prefix) {
    if (x.id) return prefix + x.id;
    if (x.name) return prefix + x.name;
    for (var key in x) {
	if (x.hasOwnProperty(key)) return prefix + key;
    }
}

module.exports = populate;
