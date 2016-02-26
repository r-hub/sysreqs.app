
var urls = {
    'crandb': 'http://crandb.r-pkg.org',
}

if (!! process.env.REDIS_URL) {
    urls['redis_url'] = process.env.REDIS_URL
} else if (!! process.env.REDIS_HOST && !! process.env.REDIS.HOST) {
    urls['redis_url'] = 'redis://' + process.env.REDIS_HOST + ':' +
	process.env.REDIS_PORT + '/0';
} else {
    urls['redis_url'] = 'redis://127.0.0.1:6379/0';
}

module.exports = urls;
