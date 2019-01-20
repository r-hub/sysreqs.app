var express = require('express');
var router = express.Router();
var fs = require('fs');
var marked = require('marked');

router.get('/', function(req, res) {
    fs.readFile('./docs/api.md', function(err, data) {
	if (err) { throw(err); return; }

	marked(data.toString(), { 'format': 'html' }, function(err, html) {
	    if (err) { console.log(err); throw(err); return; }
	    res.render('api', {
		'html': html,
		'partials': { 'ghcorner': 'ghcorner' }
	    })
	})
    })
})

module.exports = router;
