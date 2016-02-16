var express = require('express');
var router = express.Router();
var populate = require('../lib/populate');

router.get("/", function(req, res) {

    populate();
    
    res.set('Content-Type', 'application/json')
	.send({ 'operation': 'populate',
		'result': 'OK' });
})

module.exports = router;
