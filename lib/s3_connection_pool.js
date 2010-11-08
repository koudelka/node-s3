var
  http = require('http')

var S3ConnectionPool = function(args) {
  args = args || {}

  this.connections_per_bucket = args.num_connections_per_bucket || 10
  this.connections = {}
  this.queue = {}
}

//
// When a connection becomes available, the callback an http.ClientRequest object as an argument.
//
S3ConnectionPool.prototype.request = function(method, s3_request, callback) {
  var bucket = s3_request.bucket || '__NO_BUCKET__'

  s3_request.headers.Connection = 'keep-alive'

  if (!this.queue[bucket])
    this.queue[bucket] = []

  this.queue[bucket].push({
    method: method,
    path: '/' + s3_request.key,
    s3_request: s3_request,
    callback: callback
  })

  // create some initial connections for the bucket, if necessary
  if (!this.connections[bucket]) {
    console.log("Preparing " + this.connections_per_bucket + " connections to " + s3_request.headers.Host)
    this.connections[bucket] = []
    for (var i=0 ; i < this.connections_per_bucket ; i++)
      this.connections[bucket].push( http.createClient(80, s3_request.headers.Host) )
  }

  // If there are any connections available, run the request, otherwise the request
  // will be run when another returns
  if (this.connections[bucket].length)
    this._run_next_request_for_bucket(bucket)
}

S3ConnectionPool.prototype._run_next_request_for_bucket = function(bucket) {
  var self = this

  // return if there aren't any more requests to run
  var request = this.queue[bucket].shift()
  if (!request)
    return

  var http_client  = this.connections[bucket].pop(),
      http_request = http_client.request(request.method, request.path, request.s3_request.headers)

  http_request.on('error', function(err) {
    // put the connection back in the pool
    self.connections[bucket].push(http_client)
  })

  http_request.on('response', function(response) {
    response.on('end', function() {
      // put the connection back in the pool
      self.connections[bucket].push(http_client)
      self._run_next_request_for_bucket(bucket)
    })
  })

  request.callback(http_request)
}

//
// Why doesn't this work? Waiting for a timeout or something?
//
//S3ConnectionPool.prototype.close_connections = function(bucket) {
//  this.connections[bucket].forEach(function(http_client) {
//    if (http_client.connection)
//      http_client.connection.end()
//  })
//}

module.exports = S3ConnectionPool
