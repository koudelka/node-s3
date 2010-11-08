module.exports = function(bucket, key, callback) {
  var request = {
    manager: this,
    bucket: bucket,
    key: key
  }

  this._addGetHeaders(request)

  this.connection_pool.request('GET', request, function(http_req) {
    http_req.on('error', function(err) {
      callback(err, null)
    })

    http_req.end()

    var data = ""
    http_req.on('response', function(response) {
      response.on('data', function(chunk) {
        data += chunk
      })

      response.on('end', function() {
        response.data = data

        if (/^application.json\b/.test(response.headers['content-type'])) {
          try {
            response.data = JSON.parse(data)
          } catch(err) { }
        }

        if (response.statusCode == 200)
          callback(null, data)
        else
          callback(response, data)
      })
    })
  })
}
