/*
 * Copyright 2015. Author: Jeffrey Hing. All Rights Reserved.
 *
 * MIT License
 *
 * Unit tests for ShellCommand.
 */
'use strict';

//----------------------------------
// Module dependencies and variables
//----------------------------------

var ShellCommand = require('./ShellCommand');
var deferred = require('deferred');

//
// Commands for testing actual shell processes.
//
var nodeCmd = 'node -e "setTimeout(function(){},10);"';
var nodeCmdDelay = 'node -e "setTimeout(function(){},400);"';
var nodeCmdFail = 'node -e "throw new Error(\"someError\");"';

/*
 * A ShellCommand used for testing basic logic.
 *
 * @constructor
 */
function Cmd(delay, id, outputQueue, succeed) {
    var self = this;
    self._delay = delay;
    self._id = id;
    self._outputQueue = outputQueue;
    self._succeed = succeed !== undefined ? succeed : true;

    // Override private model's close function
    self._shellCommand = {};
    self._shellCommand.close = function() {
        self._outputQueue.push('close ' + self._id);
    };
}

// Pass the "instanceof ShellCommand" test.
Cmd.prototype = Object.create(ShellCommand.prototype);

Cmd.prototype.constructor = Cmd;

// Override run function.
Cmd.prototype.run = function() {
    var self = this;
    var def = deferred();

    setTimeout(function() {
        self._outputQueue.push(self._id);
        if (self._succeed) {
            def.resolve();
        } else {
            def.reject();
        }
    }, self._delay);

    return def.promise;
};

//----------------------------------
// Unit Tests
//----------------------------------

describe('ShellCommmand', function() {

    //----------------------------------
    // Synchronous execution tests
    //----------------------------------

    describe('executing synchronous commands', function() {

        it('should succeed', function(done) {
            new ShellCommand()
                .sync(nodeCmd)
                .run()
                .then(
                    function() {
                        done();
                    },
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    }
                );
        });

        it('should fail', function(done) {
            new ShellCommand()
                .sync(nodeCmdFail)
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should fail if at least one fails', function(done) {
            new ShellCommand()
                .sync(
                    nodeCmd,
                    nodeCmdFail,
                    nodeCmd
                )
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should be executed in order', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .sync(
                    new Cmd(400, 'A', outputQueue),
                    new Cmd(1, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('A');
                        expect(outputQueue[1]).toBe('B');
                        expect(outputQueue[2]).toBe('C');
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Asynchronous execution tests
    //----------------------------------

    describe('executing asynchronous commands', function() {

        it('should succeed', function(done) {
            new ShellCommand()
                .async(nodeCmd)
                .run()
                .then(
                    function() {
                        done();
                    },
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    }
                );
        });

        it('should fail', function(done) {
            new ShellCommand()
                .async(nodeCmdFail)
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should fail if at least one fails', function(done) {
            new ShellCommand()
                .async(
                    nodeCmd,
                    nodeCmdFail,
                    nodeCmd
                )
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should be executed in order of completion', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .async(
                    new Cmd(200, 'A', outputQueue),
                    new Cmd(400, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('C');
                        expect(outputQueue[1]).toBe('A');
                        expect(outputQueue[2]).toBe('B');
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Parallel execution tests
    //----------------------------------

    describe('executing parallel commands', function() {

        it('should succeed', function(done) {
            new ShellCommand()
                .parallel(nodeCmd)
                .run()
                .then(
                    function() {
                        done();
                    },
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    }
                );
        });

        it('should fail', function(done) {
            new ShellCommand()
                .parallel(nodeCmdFail)
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should fail if at least one fails', function(done) {
            new ShellCommand()
                .parallel(
                    nodeCmd,
                    nodeCmdFail,
                    nodeCmd
                )
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        done();
                    }
                );
        });

        it('should close all if at least one fails', function(done) {
            var outputQueue = [];
            var commandQueue = new ShellCommand();

            commandQueue
                .parallel(
                    new Cmd(400, 'A', outputQueue),
                    new Cmd(400, 'B', outputQueue),
                    nodeCmdDelay,
                    nodeCmdDelay,
                    nodeCmdFail
                )
                .run()
                .then(
                    function() {
                        // Should not get here.
                        expect(false).toBe(true);
                    },
                    function() {
                        expect(outputQueue[0]).toBe('close A');
                        expect(outputQueue[1]).toBe('close B');
                        expect(commandQueue._shellCommand.areAllClosed())
                            .toBe(true);
                        done();
                    }
                );
        });

        it('should be executed in order', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .parallel(
                    new Cmd(200, 'A', outputQueue),
                    new Cmd(400, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('C');
                        expect(outputQueue[1]).toBe('A');
                        expect(outputQueue[2]).toBe('B');
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Batched execution tests
    //----------------------------------

    describe('batched commands', function() {

        it('should be executed in the correct order', function(done) {
            var outputQueue = [];

            new ShellCommand()
                .async(
                    new Cmd(200, 'A', outputQueue),
                    new Cmd(400, 'B', outputQueue),
                    new Cmd(1, 'C', outputQueue)
                )
                .sync(
                    new Cmd(400, 'D', outputQueue),
                    new Cmd(1, 'E', outputQueue),
                    new Cmd(1, 'F', outputQueue)
                )
                .parallel(
                    new Cmd(200, 'G', outputQueue),
                    new Cmd(400, 'H', outputQueue),
                    new Cmd(1, 'I', outputQueue)
                )
                .async(
                    new Cmd(200, 'J', outputQueue),
                    new Cmd(400, 'K', outputQueue),
                    new Cmd(1, 'L', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('C');
                        expect(outputQueue[1]).toBe('A');
                        expect(outputQueue[2]).toBe('B');
                        expect(outputQueue[3]).toBe('D');
                        expect(outputQueue[4]).toBe('E');
                        expect(outputQueue[5]).toBe('F');
                        expect(outputQueue[6]).toBe('I');
                        expect(outputQueue[7]).toBe('G');
                        expect(outputQueue[8]).toBe('H');
                        expect(outputQueue[9]).toBe('L');
                        expect(outputQueue[10]).toBe('J');
                        expect(outputQueue[11]).toBe('K');
                        done();
                    }
                );
        });
    });

    //----------------------------------
    // Nested execution tests
    //----------------------------------

    describe('nest sync within async', function() {

        it('should be executed in the correct order', function(done) {
            var outputQueue = [];

            var syncCmds = new ShellCommand()
                .sync(
                    new Cmd(200, 'C1', outputQueue),
                    new Cmd(1, 'C2', outputQueue),
                    new Cmd(1, 'C3', outputQueue)
                );

            new ShellCommand()
                .async(
                    new Cmd(1, 'A', outputQueue),
                    syncCmds,
                    new Cmd(400, 'B', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('A');
                        expect(outputQueue[1]).toBe('C1');
                        expect(outputQueue[2]).toBe('C2');
                        expect(outputQueue[3]).toBe('C3');
                        expect(outputQueue[4]).toBe('B');
                        done();
                    }
                );
        });
    });

    describe('nest async within sync', function() {

        it('should be executed in the correct order', function(done) {
            var outputQueue = [];

            var asyncCmds = new ShellCommand()
                .async(
                    new Cmd(200, 'C1', outputQueue),
                    new Cmd(400, 'C2', outputQueue),
                    new Cmd(1, 'C3', outputQueue)
                );

            new ShellCommand()
                .sync(
                    new Cmd(1, 'A', outputQueue),
                    asyncCmds,
                    new Cmd(1, 'B', outputQueue)
                )
                .run()
                .then(
                    function() {
                        expect(outputQueue[0]).toBe('A');
                        expect(outputQueue[1]).toBe('C3');
                        expect(outputQueue[2]).toBe('C1');
                        expect(outputQueue[3]).toBe('C2');
                        expect(outputQueue[4]).toBe('B');
                        done();
                    }
                );
        });
    });
});
