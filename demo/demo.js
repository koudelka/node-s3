storage = require('../');
settings = require('./settings.js');

var s3 = new storage.S3(settings.key_id, settings.key_secret, {provider:storage.GSProvider, acl:"public-read"});

s3.requestFactory('PUT', 'johntitor', 'time/machine', {"Content-Type": "text/plain"}, function(req) {
	req.write("this is a test");
	req.end();
		
    req.addListener('response', function(response) {
      response.on('data', function(chunk) {
      	console.log(chunk.toString('ascii'));
      })

      response.on('end', function() {
      	console.log("DONE");
      })

    })
	
})

