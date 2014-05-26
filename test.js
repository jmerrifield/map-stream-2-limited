var assert = require('assert')
var subject = require('./')
var through = require('through2')
var async = require('async')
var EventEmitter = require('events').EventEmitter

function testFun(data, callback) {
  if (data === 'throwTestErr') {
    callback(new Error('Error'))
  }

  this.running[data] = function () {
    delete this.running[data]
    callback(null, data)
  }.bind(this)
}

var events = new EventEmitter()

function collector() {
  return through.obj(function (chunk, enc, callback) {
    events.emit('data', chunk)
    callback()
  })
}

beforeEach(function () {
  var context = {running: {}}
  var output = collector()

  this.completeAndAssertItem = function (item) {
    return function (callback) {
      events.once('data', function (data) {
        assert.equal(data, item)
        callback()
      })

      context.running[item]()
    }
  }

  this.checkRunningFuncs = function (dataItems) {
    return function (callback) {
      assert.deepEqual(Object.keys(context.running), dataItems)
      callback()
    }
  }

  this.assertStreamEnd = function () {
    return function (callback) {
      this.stream.on('end', callback)
    }.bind(this)
  }

  this.changeLimit = function (fun) {
    return function (callback) {
      this.stream.changeLimit(fun)
      callback()
    }.bind(this)
  }

  this.stream = subject(testFun.bind(context), 2)
  this.stream.pipe(output)
})

it('runs things in parallel', function (done) {
  this.stream.write('a')
  this.stream.write('b')
  this.stream.write('c')
  this.stream.end()

  async.series([
    this.checkRunningFuncs(['a', 'b']),
    // Throw in a noop changeLimit to make sure nothing changes
    this.changeLimit(function (val) { return val }),
    this.checkRunningFuncs(['a', 'b']),
    this.completeAndAssertItem('a'),
    this.checkRunningFuncs(['b', 'c']),
    this.completeAndAssertItem('b'),
    this.checkRunningFuncs(['c']),
    this.completeAndAssertItem('c'),
    this.checkRunningFuncs([]),
    this.assertStreamEnd()
  ], done)
})

it('can increase concurrency', function (done) {
  this.stream.write('a')
  this.stream.write('b')
  this.stream.write('c')
  this.stream.write('d')
  this.stream.end()

  function inc(amount, val) {
    return val + amount
  }

  async.series([
    this.checkRunningFuncs(['a', 'b']),
    this.completeAndAssertItem('a'),
    this.checkRunningFuncs(['b', 'c']),
    this.changeLimit(inc.bind(null, 1)),
    this.checkRunningFuncs(['b', 'c', 'd']),
    this.completeAndAssertItem('b'),
    this.checkRunningFuncs(['c', 'd']),
    this.completeAndAssertItem('c'),
    this.checkRunningFuncs(['d']),
    this.completeAndAssertItem('d'),
    this.checkRunningFuncs([]),
    this.assertStreamEnd()
  ], done)
})

it('can decrease concurrency', function (done) {
  this.stream.write('a')
  this.stream.write('b')
  this.stream.write('c')
  this.stream.write('d')
  this.stream.end()

  function dec(amount, val) {
    return val - amount
  }

  async.series([
    this.checkRunningFuncs(['a', 'b']),
    this.completeAndAssertItem('a'),
    this.checkRunningFuncs(['b', 'c']),
    this.changeLimit(dec.bind(null, 1)),
    this.checkRunningFuncs(['b', 'c']),
    this.completeAndAssertItem('b'),
    this.checkRunningFuncs(['c']),
    this.completeAndAssertItem('c'),
    this.checkRunningFuncs(['d']),
    this.completeAndAssertItem('d'),
    this.checkRunningFuncs([]),
    this.assertStreamEnd()
  ], done)
})

it('passes along errors', function (done) {
  this.stream.on('error', function (err) {
    assert(err instanceof Error)
    done()
  })

  this.stream.write('throwTestErr')
})
