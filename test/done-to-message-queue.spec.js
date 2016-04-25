'use strict'

function trackCalls(name) {
  trackCalls.calls = trackCalls.calls || [];
  trackCalls.calls.push(name);
}
trackCalls.reset = function () {
  trackCalls.calls = [];
}

function itFnStubWithDone(done) {
  trackCalls('itFnStubWithDone before done');
  done();
  trackCalls('itFnStubWithDone after done');  
}

function itStub(done) {
  return function (description, fn, timeout) {
    trackCalls('itStub before itFnStubWithDone');
    fn(done);
    trackCalls('itStub after itFnStubWithDone');
  };  
}

describe('done-to-message-queue', function () {
  describe('order of operations without shim', function () {
    it('should call done before track calls after done is logged', function (done) {
      trackCalls.reset();
      expect(trackCalls.calls.length).toBe(0);
      
      var doneMock = function() { trackCalls('doneMock')};
      
      itStub(doneMock)('test', itFnStubWithDone, 0);
      
      setTimeout(function () {
        expect(trackCalls.calls).toEqual([
          'itStub before itFnStubWithDone',
          'itFnStubWithDone before done',
          'doneMock',
          'itFnStubWithDone after done',
          'itStub after itFnStubWithDone',
          ]);
        done();
      }, 10);
    });
  });
  
  describe('order of operations with shim', function () {
    it('should call done after track calls after done is logged', function (done) {
      trackCalls.reset();
      expect(trackCalls.calls.length).toBe(0);
      var doneMock = function() { trackCalls('doneMock')};
      var global = { it: itStub(doneMock) };
      shimJasmineItDoneToMessageQueueIfAsync(global);
      
      setTimeout(function () {
        trackCalls('test setTimeout');
      });
      global.it('test', itFnStubWithDone, 0);
      
      setTimeout(function () {
        expect(trackCalls.calls).toEqual([
          'itStub before itFnStubWithDone',
          'itFnStubWithDone before done',
          'itFnStubWithDone after done',
          'itStub after itFnStubWithDone',
          'test setTimeout',
          'doneMock',
          ]);
        done();
      }, 10);
    });
  });
  
  describe('shimJasmineItDoneToMessageQueueIfAsync', function () {
    var itMock;
    var doneMock;
    var doneFailMock = 'doneFailMock';
    var global = {};

    beforeEach(function () {
      doneMock = jasmine.createSpy('doneMock');
      doneMock['doneFailMock'] = doneFailMock;
      itMock = jasmine.createSpy('it').and.callFake(function (description, fn, timeout) { fn(doneMock) });
      global.it = itMock;
      shimJasmineItDoneToMessageQueueIfAsync(global);
    });

    it('itMock should not equal global.it', function () {
      expect(global.it).not.toBe(itMock);
    });

    it('itMock should be called with exact parameters if fn does not take arguments', function () {
      var description = 'test desc';
      var fn = jasmine.createSpy('mock test')
      var timeout = 100;

      expect(itMock).not.toHaveBeenCalled();
      expect(fn).not.toHaveBeenCalled();

      global.it(description, fn, timeout);

      expect(itMock).toHaveBeenCalledWith(description, fn, timeout);
      expect(fn).toHaveBeenCalled();
    });

    it('itMock should be called with exact parameters expet fn if fn does take arguments', function (done) {
      var description = 'test desc';
      var fn = function (testDone) {
        expect(testDone).not.toBe(doneMock);
        expect(testDone['doneFailMock']).toBe(doneFailMock);
        done();
      };
      var timeout = 100;

      expect(itMock).not.toHaveBeenCalled();

      global.it(description, fn, timeout);

      expect(itMock).toHaveBeenCalledWith(description, fn, timeout);
    });
  });
});