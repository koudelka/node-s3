var
  fs = require('fs'),
  crypto = require('crypto'),
  S3ConnectionPool = require('./lib/s3_connection_pool'),
  utils = require('./utils.js');

exports.S3Provider = {
  baseUrl: 's3.amazonaws.com',
  authPrefix: 'AWS',
  isHeader: function(header) {
    return (/x-amz-/i.test(header));
  },
  header : {acl: 'x-amz-acl', storageClass: 'x-amz-storage-class'},
};
    
exports.GSProvider = {
  baseUrl: 'commondatastorage.googleapis.com',
  authPrefix: 'GOOG1',
  isHeader: function(header) {
    return (/x-goog-/i.test(header));
  },
  header : {acl: 'x-goog-acl'},
};

var S3 = function(awsAccessKey, awsSecretKey, options) {
  this._awsSecretKey = awsSecretKey;
  this._awsAccessKey = awsAccessKey;

  options = options || {};
  this._provider = exports.S3Provider;
  if (options.provider) {
    this._provider = options.provider;
  }
  this._storageType = options.storageType || 'STANDARD';
  this._acl = options.acl || 'private';

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
                     this._getCanonicalizedProviderHeaders(request.headers) +  // can be blank
                     resource

  var hmac = crypto.createHmac('sha1', awsSecretKey)
                   .update(stringToSign)
                   .digest(encoding = 'base64')

  // append the headers to the supplied request object
  request.headers.Authorization = this._provider.authPrefix + ' ' + awsAccessKey + ':' + hmac
}

S3.prototype._getCanonicalizedProviderHeaders = function(headers) {
  var canonicalizedHeaders = []

  for (header in headers)
    // pull out amazon headers
    if (this._provider.isHeader(header)) {
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

S3.prototype.requestFactory = function(action, bucket, key, headers, callback) {
  var request = {
    manager: this,
    bucket: bucket,
    key: key,
    headers: utils.extend({
      'Date': new Date().toUTCString(),
      'Host': bucket + "." + this._provider.baseUrl
    }, headers)
  };
  this._addAuthorizationHeader(request, action)
  
  this.connection_pool.request(action, request, callback);
}

//
// Modifies the passed request object to include a GET header
//
S3.prototype._addGetHeaders = function(request) {
  request.headers = utils.extend({
    'Date': new Date().toUTCString(),
    'Host': request.bucket + "." + this._provider.baseUrl
  }, request.headers);

  this._addAuthorizationHeader(request, 'GET')
}

//
// Modifies the passed request object to include a PUT header
//
S3.prototype._addPutHeaders = function(request){
  request.headers = utils.extend({
    'Host': request.bucket + '.' + this._provider.baseUrl,
    'Date': new Date().toUTCString(),
  }, request.headers);
  
  this._addAuthorizationHeader(request, 'PUT')
}

// export the s3 library
exports.S3 = S3;
