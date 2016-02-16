var ghGot = require('gh-got');
var got = require('got');
var urls = require('../lib/urls');
var redis = require('redis');
var client = redis.createClient(urls.redis_port, urls.redis_host);

var user = "r-hub";
var repo = "sysreqs";
var subdir = "sysreqs";

function populate() {
    var url = "repos/" + user + "/" + repo + "/contents/" + subdir;
    ghGot(url, function(err, res) {
	if (err) { console.log(err); return; }
	var file_list = res.map(function(x) { return x.download_url });
	var add_res = file_list.map(download_and_add);
    })
}

function download_and_add(url) {
    got(url, function(err, res) {
	if (err) { console.log(err); return; }
	var entry = JSON.parse(res);
	var name = get_name(entry);
	client.set(name, res);
	return true;
    })
}

function get_name(x) {
    for (var key in x) {
	if (x.hasOwnProperty(key)) return "sysreq:" + key;
    }
}

module.exports = populate;
