# map-stream-2-limited

[![NPM version](https://badge.fury.io/js/map-stream-2-limited.svg)](http://badge.fury.io/js/map-stream-2-limited)
[![Build Status](https://travis-ci.org/jmerrifield/map-stream-2-limited.svg?branch=master)](https://travis-ci.org/jmerrifield/map-stream-2-limited)

Limited concurrency `map-stream` implementation. Inspired by
[map-stream-limit](https://github.com/parshap/map-stream-limit)
but built on `through2` and additionally allows the concurrency to be changed
after instantiation.

Somewhat experimental and likely to be caught out by edge cases...

## Install

```bash
$ npm install map-stream-2-limited
```

## Usage

```js
var mapLimited = require('map-stream-2-limited')
var transform = mapLimited(function (data, callback) {
  callback(null, data)

  // or

  callback(new Error('something failed'))

}, 10) // initial concurrency limit of 10

someStream
.pipe(transform)

// Modify concurrency limit by supplying a transform function
transform.changeLimit(function (limit) {
  return limit + 1 // Will throw if you attempt to change the limit to < 1
})

```

## License

[MIT](http://opensource.org/licenses/MIT)

© [Jon Merrifield](http://www.jmerrifield.com)
