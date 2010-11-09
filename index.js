require('underscore')
var
  fs = require('fs'),
  crypto = require('crypto'),
  S3ConnectionPool = require('./lib/s3_connection_pool')

var S3 = function(awsAccessKey, awsSecretKey, options){
  this._awsSecretKey = awsSecretKey
  this._awsAccessKey = awsAccessKey

  options = options || {}

  this._storageType = options.storageType || 'STANDARD'
  this._acl = options.acl || 'private'

  this.connection_pool = new S3ConnectionPool()
}

//
// S3 Commands
//
fs.readdirSync(__dirname + '/lib/commands').forEach(function(filename) {
  var command = filename.replace(/.js$/, '')
  S3.prototype[command] = require(__dirname + '/lib/commands/' + filename)
})


// Modifies the passed request object to include an Authorization signature header
S3.prototype._addAuthorizationHeader = function(request, method) {
  var awsAccessKey = request.manager._awsAccessKey,
      awsSecretKey = request.manager._awsSecretKey
      
  var date        = request.headers.Date || new Date().toUTCString()
  var contentType = request.headers['Content-Type'] || ''
  var md5         = request.headers['Content-MD5'] || ''
  var resource    = request.resource || '/' + request.bucket + '/' + request.key

  var stringToSign = method + "\n" +
                     md5 + "\n" +
                     contentType + "\n" + // (optional)
                     date + "\n" +        // only include if no x-amz-date
                     this._getCanonicalizedAmzHeaders(request.headers) +  // can be blank
                     resource

  var hmac = crypto.createHmac('sha1', awsSecretKey)
                   .update(stringToSign)
                   .digest(encoding = 'base64')

  // append the headers to the supplied request object
  request.headers.Authorization = 'AWS ' + awsAccessKey + ':' + hmac
}

S3.prototype._getCanonicalizedAmzHeaders = function(headers) {
  var canonicalizedHeaders = []

  for (header in headers)
    // pull out amazon headers
    if (/x-amz-/i.test(header)) {
      var value = headers[header]

      if (value instanceof Array)
        value = value.join(',')

      canonicalizedHeaders.push(header.toString().toLowerCase() + ':' + value)
    }

  var result = canonicalizedHeaders.sort().join('\n')

  if (result)
    result += '\n'

  return result
}

//
// Modifies the passed request object to include a GET header
//
S3.prototype._addGetHeaders = function(request) {
  request.headers = _({
    'Date': new Date().toUTCString(),
    'Host': request.bucket + '.s3.amazonaws.com'
  }).extend(request.headers)

  this._addAuthorizationHeader(request, 'GET')
}

//
// Modifies the passed request object to include a PUT header
//
S3.prototype._addPutHeaders = function(request){
  var hash = crypto.createHash('md5').update(request.data).digest(encoding = 'base64')

  request.headers = _({
    'Host': request.bucket + '.s3.amazonaws.com',
    'Date': new Date().toUTCString(),
    'Content-Length': request.data.length,
    'Content-MD5' : hash,
    'x-amz-acl': request.manager._acl,
    'x-amz-storage-class': request.manager._storageType
  })
  .extend(request.headers)

  this._addAuthorizationHeader(request, 'PUT')
}

// export the s3 library
module.exports = S3
