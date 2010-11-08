# S3 for Node.js

node-s3 is a (thus far) minimilist library for Amazon's S3 storage system.

## Usage

The first thing you'll need is a request manager:

     var s3 = new S3('your_aws_key', 'your_aws_secret_key')

### Commands

At the moment, the only supported commands are put and get, and are used thusly:

Put:
    var data_to_upload = {a:'b', c:'d'}
    s3.put({bucket:'my_bucket', key:'some_directory/key', data:data_to_upload}, function(err, result) {
      if (!err)
        do_stuff()
    })
You can also pass your own headers to put:
    var data_to_upload = {a:'b', c:'d'},
        headers = {
          x-amz-storage-class: 'REDUCED_REDUNDANCY'
        }

    s3.put({bucket:'my_bucket', key:'some_directory/key', data:data_to_upload, headers:headers}, function(err, result) {
      if (!err)
        do_stuff()
    })

Get:
    s3.get('my_bucket', 'some_directory/key', function(err, result) {
      if (!err)
        do_stuff(result)
    })


## Connection Pooling

node-s3 uses host (bucket) scoped connection pooling, via HTTP's keep-alive goodness. By default, ten possible connections per host are created, but not all of them connect immediately. The pool attempts to re-use the most recently freed http client, so as to minimize the number of actual connections made.


## Contributions

Pull requests are encouraged!
