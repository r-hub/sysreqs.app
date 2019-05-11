var toArray = require('stream-to-array');
var async = require('async');

var map = function(client, query, callback) {
    toArray(
	client.scan({ pattern: "sysreq:*" }),
	function(err, arr) {
	    if (err) { callback(err);  return; }
	    arr = arr.map(function(x) { return x.replace("sysreq:", "") });
	    async.concat(
		arr,
		function(x, cb) { try_map(client, x, query, cb) },
		callback
	    )
	}
    );
}

function try_map(client, name, query, callback) {
    var item = "sysreq:" + name;
    client.get(item, function(err, entry) {
	if (err) { callback(err); return; }
        try {
	    entry = JSON.parse(entry);
	    var reqs = entry.sysreqs;
            console.log(reqs);
	    if (reqs.constructor !== Array) { reqs = [ reqs ]; }
	    for (var p = 0; p < reqs.length; p++) {
	        req = reqs[p];
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
		    gotit = query.toLowerCase().indexOf(req.toLowerCase()) > -1;
	        }
                
	        if (gotit) { callback(null, [ entry ]); return; }
	    }
            
	    callback(null, []);
        } catch (err) {
            callback(err);
        }  
    })
}

module.exports = map;
