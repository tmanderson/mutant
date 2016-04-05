const async = require('async');
const os = require('os');
const get = require('lodash/get');
const config = require('./config');
const testProcessCreator = require('./test-process-creator');
const reporter = require('./reporter');

function getMutationParams(testPath, mutation, stateMask) {
    return {
        testPath,
        env: {
            MUTATION: mutation,
            STATEMASK: stateMask
        }
    };
}

function mutationTestRun(queue, testPath, stateMask) {
    return (mutation, mapCallback) => {
        let nodeCount = 1;
        return async.whilst(
            () => stateMask.length <= nodeCount,
            whilstCallback => {
                return queue.push(
                    getMutationParams(testPath, mutation, stateMask),
                    (error, result) => {
                        nodeCount = get(result, 'nodeCount');
                        stateMask = `${get(result, 'stateMaskWithResult')}1`;
                        return whilstCallback(error, result);
                    }
                );
            },
            mapCallback
        );
    };
}

module.exports = (testPath) => {
    const queue = async.queue(testProcessCreator, 1);
    queue.push({testPath}, reporter('initial'));
    queue.concurrency = os.cpus().length;
    return async.map(
        config.get('mutations'),
        mutationTestRun(queue, testPath, '1'),
        reporter('default')
    );
};
