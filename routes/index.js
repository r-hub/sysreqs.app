var express = require('express');
var router = express.Router();
var fs = require('fs');
var markedMan = require('marked-man');

// ------------------------------------------------------------------
// A simple summary of the API

router.get("/", function(req, res) {
    fs.readFile('./docs/api.md', function(err, data) {
	if (err) { throw(err); return; }

	markedMan(
	    data.toString(),
	    { format: 'html',
	      gfm: true
	    },
	    function(err, html) {
		if (err) { throw(err); return; }
		res.render('api', {
		    'html': html,
		    'partials': { 'ghcorner': 'ghcorner' }
		})
	    }
	)
    })
})

module.exports = router;
