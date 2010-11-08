module.exports = function(args, callback) {
  var request = {
    manager: this,
    headers: args.headers || {},
    bucket: args.bucket,
    key: args.key,
    data: args.data
  }

  switch (typeof request.data) {
    case 'object':
      request.data = JSON.stringify(args.data)
      request.headers['Content-Type'] = request.headers['Content-Type'] || "application/json charset=utf8"
      break
    case 'string':
      request.headers['Content-Type'] = request.headers['Content-Type'] || "text/plain charset=utf8"
  }

  if (args.meta)
    for (var k in args.meta)
      request.headers['x-amz-meta-' + k] = args.meta[k]

  this._addPutHeaders(request)

  this.connection_pool.request('PUT', request, function(http_req) {
    http_req.on('error', function(err) {
      callback(err, null)
    })

    http_req.write(request.data)

    http_req.end()

    var data = ""

    http_req.on('response', function(response) {
      //if (response.statusCode == '100') return

      response.on('data', function(chunk) {
        data += chunk
      })

      response.on('end', function() {
        if (response.statusCode == '200')
          callback(null, response)
        else
          callback(response, data)
      })

    })
  })
}
