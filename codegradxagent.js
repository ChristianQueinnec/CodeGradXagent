/**

 Command line utilities to interact with the CodeGradX infrastructure

## Installation

```bash
npm install codegradxagent
```

## Usage

This script is a command line utility to interact with the CodeGradX
infrastructure. It runs on Node.js.

@module codegradxagent
@author Christian Queinnec <Christian.Queinnec@codegradx.org>
@license MIT
@see {@link http://codegradx.org/|CodeGradX} site.

 */

var getopt = require('node-getopt');
var fs = require('fs');
var when = require('when');
var nodefn = require('when/node');
var _ = require('lodash');
var CodeGradX = require('./codegradxlib.js');

CodeGradX.Agent = function (initializer) {
    this.state = new CodeGradX.State();
    this.configuration = [
        ['h',  'help',                  "display that help"],
        ['v',  'verbose',               "show what the agent is doing"],
        ['',   'user=[LOGIN]',          "User's login"],
        ['',   'password=[PASSWORD]',   "User's password"],
        ['',   'credentials=[FILE]',    "a JSON file containing credentials"],
        ['',   'update-credentials',    "Update JSON file holding credentials"],
        ['',   'stuff=[FILE]',          "the file to submit"],
        ['',   'follow',                "fetch the derived reports"],
        ['d',  'xmldir',                "directory where to store reports"],
        ['c',  'counter',               "start value when counting reports"],
        ['t',  'type=[TYPE]',           "type of submission"],
        ['e',  'exercise=[SAFECOOKIE]', "identifier of an exercise"],
        ['r',  'retry=[NUMBER]',        "number of attempts"],
        ['o',  'offset=[NUMBER]',       "wait time before attempting"],
        ['s',  'timeout=[NUMBER]',      "wait time between attempts"],
        ['',   'send',                  "really request servers"]
    ];
    this.parser = getopt.create(this.configuration);
    // .bindHelp() forces the process to exit after displaying help!
    this.credentialsFile = './.fw4ex.json';
    this.startTime = _.now();
    this.xmldir = '.';
    this.counter = 0;
    var agent = this;
    if ( _.isFunction(initializer) ) {
        agent = initializer.call(agent, agent);
    }
    CodeGradX.getCurrentAgent = function () {
        return agent;
    }
    // Customize
    if ( initializer ) {
        initializer(this);
    }
}

/** Get the current agent (if defined)

    @returns {Agent}
    @property {object} Agent.commands 
    @property {Hashtable} Agent.commands.options - option name is the key
    @property {object} Agent.commands.argv - remaining files

*/

CodeGradX.getCurrentAgent = function () {
    throw new Error("no Agent");
}

/** Display a short summary of this script.
*/

CodeGradX.Agent.prototype.usage = function () {
    console.log("to be done from a file");
}

/** Promisify writing to a file.
    This code is similar to CodeGradX.readFileContent.

    @param {string} filename - file to write
    @param {string} data - new content of the file
    @returns {Promise<null>} yields control

*/

CodeGradX.writeFileContent = function (filename, data) {
    return nodefn.call(fs.writeFile, filename, data);
};

/** Debug utility to visualize what the agent is doing.
    It uses `console.log` for that visualization.

    @param {object} arguments
    @returns {nothing}
*/

CodeGradX.Agent.prototype.debug = function () {
    var agent = this;
    if ( ! agent.verbose ) {
        return;
    }
    var t = _.now() - agent.startTime; 
    // Separate seconds from milliseconds:
    var msg = ('000'+t).replace(/(...)$/, ".$1") + ' ';
    msg = msg.replace(/^0*/, '');
    for (var i=0 ; i<arguments.length ; i++) {
        if ( arguments[i] === null ) {
            msg += 'null ';
        } else if ( arguments[i] === undefined ) {
            msg += 'undefined ';
        } else {
            msg += arguments[i].toString() + ' ';
        }
    }
    console.log(msg);
}

/** Handle authentication, read and/or update credentials.
    By default the credentials file is name `./fw4ex.json`.

    @param {Array<string>} strings - command line options
    @returns {Promise<User>} 

*/

CodeGradX.Agent.prototype.processAuthentication = function (strings) {
    var agent = this;
    var commands = agent.getOptions(strings);
    agent.commands = commands;

    // Process global options:
    if ( commands.options.verbose ) {
        agent.verbose = true;
    }

    if ( commands.options.help ) {
        agent.usage();
        return when.reject(new Error("Help displayed"));
    }

    if ( commands.options.xmldir ) {
        agent.xmldir = commands.options.xmldir;
    }
    // counter....

    function updateCredentials (user) {
        agent.debug("Successful authentication of", user.email);
        if ( commands.options['update-credentials'] ) {
            agent.debug("Updating credentials", agent.credentialsFile);
            return CodeGradX.writeFileContent(
                agent.credentialsFile,
                JSON.stringify({
                    user:     (commands.options.user || 
                               agent.credentials.user),
                    password: (commands.options.password || 
                               agent.credentials.password),
                    cookie:   agent.state.currentCookie
                }) ).then(function () {
                    return when(user);
                }, function (reason) {
                    agent.debug("Could not write credentials");
                    return when.reject(reason);
                });
        } else {
            return when(user);
        }
    }
    
    function couldNotAuthenticate (reason) {
        agent.debug("Failed authentication", reason);
        return when.reject(reason);
    }

    // --user= and --password= are present:
    if ( commands.options.user &&
         commands.options.password ) {
        agent.debug("Authenticating with user and password...");
        return agent.state.getAuthenticatedUser(
            commands.options.user,
            commands.options.password )
            .then(updateCredentials, couldNotAuthenticate);

    // --credentials= designates a configuration file:
    } else if ( commands.options.credentials ) {
        agent.debug("Reading credentials", commands.options.credentials);
        return CodeGradX.readFileContent(commands.options.credentials).then(
            function (content) {
                agent.debug("Read credentials" + commands.options.credentials);
                agent.credentials = JSON.parse(content);
                // A user and its password are present:
                if ( agent.credentials.user &&
                     agent.credentials.password ) {
                    agent.debug("Authentication using user and password");
                    return agent.state.getAuthenticatedUser(
                        agent.credentials.user,
                        agent.credentials.password )
                        .then(updateCredentials, couldNotAuthenticate);

                // But a cookie may be present:
                } else if ( agent.credentials.cookie ) {
                    agent.debug("Authentication using cookie");
                    agent.state.currentCookie = agent.credentials.cookie;
                    return agent.state.getAuthenticatedUser(
                        agent.credentials.user,
                        agent.credentials.password )
                        .then(updateCredentials, couldNotAuthenticate);

                } else {
                    var error1 = new Error("Could not authenticate");
                    return couldNotAuthenticate(error1);
                }
            }, function () {
                var error2 = new Error("Could not read credentials");
                return couldNotAuthenticate(error2);
            });
    }
    return when.reject(new Error("No way to authenticate!"));
}

/** Parse command line arguments and enrich the agent with them.
    The agent will get a `commands` property. This method is only
    used by processAuthentication.

    @param {Array<string>} strings - command line arguments
    @return {Agent}

*/

CodeGradX.Agent.prototype.getOptions = function (strings) {
    var commands = {
        options: {
            "send": false
        }
    };
    if ( strings ) {
        commands = this.parser.parse(strings);
    } else {
        commands = this.parser.parseSystem();
    }
    //console.log(commands);
    this.commands = commands;
    return commands;
}

/** Store a report. 
    XML or HTML reports are numbered consecutively.
    
    @param {string|Buffer} content - content of the file to write
    @param {string} label - type of document
    @param {string} suffix - suffix of the file to write
    @returns {Promise<>}

*/

CodeGradX.Agent.prototype.writeReport = function (content, label, suffix) {
    var agent = this;
    var label = ('-' + label) || '';
    var file = agent.xmldir + '/' + 
        (++agent.counter) + label + '.' + suffix;
    return CodeGradX.writeFileContent(file, content)
    .then(function () {
        agent.debug("Now written", file);
        return when(file);
    });
}

/** Determine the type of interaction with the infrastructure.
    `type` may be `job`, `exercise` or `batch`.

    @returns {Promise<???>} yield a promise according to type

*/

CodeGradX.Agent.prototype.processType = function () {
    var agent = this;
    var type = agent.commands.options.type || 'job';
    if ( type === 'job' ) {
        return agent.processJob();
    } else if ( type === 'exercise' ) {
        return agent.processExercise();
    } else if ( type === 'batch' ) {
        return agent.processBatch();
    } else {
        return when.reject(new Error("Unknown interaction type " + type));
    }
};

/** Send a Job and wait for the marking report

    @returns {Promise<Job>} 

*/

CodeGradX.Agent.prototype.processJob = function () {
    var agent = this;
    var exercise = new CodeGradX.Exercise({
        safecookie: agent.commands.options.exercise
    });
    var parameters = {
        progress: function (parameters) {
            agent.debug("Waiting", parameters.i, "...");
        }
    };
    if ( agent.commands.options.timeout ) {
        parameters.step = agent.commands.options.timeout;
    }
    if ( agent.commands.options.retry ) {
        parameters.step = agent.commands.options.retry;
    }
    function cannotSendAnswer (reason) {
        agent.state.log.debug("Could not send file").show();
        throw reason;
    }
    function cannotGetReport (reason) {
        agent.debug("Could not get report");
        throw reason;
    }
    function storeReports (job) {
        agent.debug("Got job marking report", job.jobid);
        function storeXMLReport (job) {
            agent.debug("writing XML report");
            return agent.writeReport(job.XMLreport, 'jobStudentReport', 'xml');
        }
        function storeHTMLReport (job) {
            agent.debug("writing HTML report");
            return agent.writeReport(job._report, 'jobStudentReport', 'html');
        }
        function returnJob () {
            return when(job);
        }
        return storeXMLReport(job)
                .catch(cannotStoreReport)
                .then(storeHTMLReport)
                .catch(cannotStoreReport)
                .then(returnJob);
    }
    function cannotStoreReport (reason) {
        agent.debug("Could not store report");
        throw reason;
    }
    function getJobReport (job) {
        agent.debug("Job sent, known as", job.jobid);
        return agent.writeReport(job.responseXML, 'jobSubmittedReport', 'xml')
            .then(function () {
                agent.debug("Waiting for marking report");
                return job.getReport(parameters)
                    .catch(cannotGetReport)
                    .then(storeReports)
                    .catch(cannotStoreReport);
            }).catch(cannotStoreReport);
    }
    agent.debug("Sending job...");
    return exercise
        .sendFileAnswer(agent.commands.options.stuff)
        .catch(cannotSendAnswer)
        .then(getJobReport);
};

/** Send a Batch and wait for the associated marking reports

    @returns {Promise<Batch>} 

*/

CodeGradX.Agent.prototype.processBatch = function () {
    var agent = this;
    var exercise = new CodeGradX.Exercise({
        safecookie: agent.commands.options.exercise
    });
    function showProgress (parameters) {
        var batch = parameters.batch;
        if ( batch ) {
            agent.debug("Marked jobs:", batch.finishedjobs, 
                        '/', (batch.totaljobs || '?'),
                        '   still waiting...');
            //agent.state.log.show();
        } else {
            agent.debug("Waiting...", parameters.i);
        }
    }
    var parameters = {
        progress: showProgress
    };
    if ( agent.commands.options.timeout ) {
        parameters.step = agent.commands.options.timeout;
    }
    if ( agent.commands.options.retry ) {
        parameters.step = agent.commands.options.retry;
    }
    function cannotSendBatch (reason) {
        agent.state.log.debug("Could not send batch file").show();
        throw reason;
    }
    function cannotStoreReport (reason) {
        agent.debug("Could not store report");
        throw reason;
    }
    function cannotGetReport (reason) {
        agent.debug("Could not get batch final report");
        throw reason;
    }
    function storeBatchReport (batch) {
        agent.debug("Got batch final report", batch.batchid);
        function storeJobReports (job) {
            agent.debug("Got job marking report", job.jobid);
            function storeXMLReport (job) {
                agent.debug("writing XML report");
                return agent.writeReport(job.XMLreport, 
                                         'jobStudentReport', 
                                         'xml');
            }
            function storeHTMLReport (job) {
                agent.debug("writing HTML report");
                return agent.writeReport(job._report, 
                                         'jobStudentReport', 
                                         'html');
            }
            function returnJob () {
                return when(job);
            }
            return storeXMLReport(job)
                .catch(cannotStoreReport)
                .then(storeHTMLReport)
                .catch(cannotStoreReport)
                .then(returnJob);
        }
        function returnBatch () {
            if ( agent.commands.options.follow ) {
                agent.debug("Fetching individual jobs...");
                var promise, promises = [];
                _.forEach(batch.jobs, function (job) {
                    promise = job.getReport().then(storeJobReports);
                    promises.push(promise);
                });
                return when.all(promises);
            } else {
                return when(batch);
            }
        }
        return agent.writeReport(batch.XMLreport, 
                                 'multiJobStudentReport', 
                                 'xml')
        .then(returnBatch);
    }
    function getBatchReport (batch) {
        agent.debug("Batch sent, known as", batch.batchid);
        return agent.writeReport(batch.responseXML, 
                                 'multiJobSubmittedReport', 
                                 'xml')
            .then(function () {
                agent.debug("Waiting for final batch completion report...");
                return batch.getFinalReport(parameters)
                    .catch(cannotGetReport)
                    .then(storeBatchReport)
                    .catch(cannotStoreReport);
            }).catch(cannotStoreReport);
    }
    agent.debug("Sending batch...");
    return exercise
        .sendBatch(agent.commands.options.stuff)
        .catch(cannotSendBatch)
        .then(getBatchReport);
};

// end of codegradxagent.js

