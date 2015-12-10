#!/usr/bin/env node
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
        ['V',  'Verbose',               "be more verbose"],
        ['',   'user=[LOGIN]',          "User's login"],
        ['',   'password=[PASSWORD]',   "User's password"],
        ['',   'credentials=[FILE]',    "a JSON file containing credentials"],
        ['',   'update-credentials',    "Update JSON file holding credentials"],
        ['',   'stuff=[FILE]',          "the file to submit"],
        ['',   'follow',                "fetch the derived reports"],
        ['d',  'xmldir',                "directory where to store reports"],
        ['c',  'counter=[NUMBER]',      "start value when counting reports"],
        ['t',  'type=[TYPE]',           "type of submission"],
        ['e',  'exercise=[SAFECOOKIE]', "identifier of an exercise"],
        ['r',  'resume=[FILE]',         "resume job, exercise or batch"],
        ['',   'retry=[NUMBER]',        "number of attempts"],
        ['',   'offset=[NUMBER]',       "wait time before attempting"],
        ['',   'timeout=[NUMBER]',      "wait time between attempts"]
    ];
    this.parser = getopt.create(this.configuration);
    this.parser.errorFunc = function (e) {
        throw e;
    };
    //console.log(this.parser);
    // .bindHelp() forces the process to exit after displaying help!
    this.credentialsFile = './.fw4ex.json';
    this.startTime = _.now();
    this.xmldir = '.';
    this.counter = 0;
    var agent = this;
    // Customize
    if ( _.isFunction(initializer) ) {
        agent = initializer.call(agent, agent);
    }
    CodeGradX.getCurrentAgent = function () {
        return agent;
    };
};

/** Get the current agent (if defined)

    @returns {Agent}
    @property {object} Agent.commands 
    @property {Hashtable} Agent.commands.options - option name is the key
    @property {object} Agent.commands.argv - remaining files

*/

CodeGradX.getCurrentAgent = function () {
    throw new Error("no Agent");
};

/** Display a short summary of this script.
*/

CodeGradX.Agent.prototype.usage = function () {
    var agent = this;
    agent.parser.showHelp();
};

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
    if ( agent.verbose > 1 ) {
        agent.state.log.showAndRemove();
    }
    console.log(msg);
};

/** Parse options and run the agent.

    @param {Array<string>} strings.
    @returns {Promise<???>} depending on option `type`

*/

CodeGradX.Agent.prototype.process = function (strings) {
    var agent = this;
    var commands;
    try {
        commands = agent.getOptions(strings);
        agent.commands = commands;
    } catch (exc) {
        agent.usage();
        return when.reject(exc);
    }

    // Process global options:
    if ( commands.options.verbose ) {
        agent.verbose = 1;
    }
    if ( commands.options.Verbose ) {
        // Be more verbose
        agent.verbose = 2;
    }
    if ( commands.options.help ) {
        agent.usage();
        return when.reject(new Error("Help displayed"));
    }

    if ( commands.options.xmldir ) {
        agent.xmldir = commands.options.xmldir;
    }
    if ( commands.options.counter ) {
        agent.counter = commands.options.counter;
    }

    if ( commands.options.resume ) {
        // Default type for resumptions:
        agent.commands.options.type = 'resume';
    }

    function agentProcess () {
        return agent.processAuthentication()
            .then(_.bind(agent.processType, agent));
    }

    if ( commands.options.offset &&
         commands.options.offset > 0 ) {
        var dt = commands.options.offset * 1000;
        commands.options.offset = 0;
        return when(agent).delay(dt).then(agentProcess);
    }

    return agentProcess();
};

/** Handle authentication, read and/or update credentials.
    By default the credentials file is name `./fw4ex.json`.

    @returns {Promise<User>} 

*/

CodeGradX.Agent.prototype.processAuthentication = function () {
    var agent = this;
    function updateCredentials (user) {
        agent.debug("Successful authentication of", user.email);
        if ( agent.commands.options['update-credentials'] ) {
            agent.debug("Updating credentials", agent.credentialsFile);
            return CodeGradX.writeFileContent(
                agent.credentialsFile,
                JSON.stringify({
                    user:     (agent.commands.options.user || 
                               agent.credentials.user),
                    password: (agent.commands.options.password || 
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

    // if a cookie is already known:
    if ( agent.state.currentCookie ) {
        agent.debug("Reusing already known cookie...");
        return agent.state.sendAXServer('x', {
            path: '/'
        }).catch(function (reason) {
            agent.debug("Obsolete or wrong cookie");
            delete agent.state.currentCookie;
            return agent.processAuthentication();
        });
    }

    // --user= and --password= are present:
    if ( agent.commands.options.user &&
         agent.commands.options.password ) {
        agent.debug("Authenticating with user and password...");
        return agent.state.getAuthenticatedUser(
            agent.commands.options.user,
            agent.commands.options.password )
            .then(updateCredentials)
            .catch(couldNotAuthenticate);

    // --credentials= designates a configuration file:
    } else if ( agent.commands.options.credentials ) {
        agent.debug("Reading credentials", agent.commands.options.credentials);
        return CodeGradX.readFileContent(agent.commands.options.credentials)
            .then(function (content) {
                agent.debug("Read credentials" + 
                            agent.commands.options.credentials);
                agent.credentials = JSON.parse(content);
                // A user and its password are present:
                if ( agent.credentials.user &&
                     agent.credentials.password ) {
                    agent.debug("Authentication using user and password");
                    return agent.state.getAuthenticatedUser(
                        agent.credentials.user,
                        agent.credentials.password )
                        .then(updateCredentials)
                        .catch(couldNotAuthenticate);

                // But a cookie may be present:
                } else if ( agent.credentials.cookie ) {
                    agent.debug("Authentication using cookie");
                    agent.state.currentCookie = agent.credentials.cookie;
                    return agent.state.getAuthenticatedUser(
                        agent.credentials.user,
                        agent.credentials.password )
                        .then(updateCredentials)
                       .catch(couldNotAuthenticate);

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
};

/** Parse command line arguments and enrich the agent with them.
    The agent will get a `commands` property. This method is only
    used by processAuthentication.

    @param {Array<string>} strings - command line arguments
    @return {Agent}

*/

CodeGradX.Agent.prototype.getOptions = function (strings) {
    var agent = this;
    var commands = {
        options: {
            "send": false
        }
    };
    try {
        if ( strings ) {
            commands = this.parser.parse(strings);
        } else {
            commands = this.parser.parseSystem();
        }
    } catch (exc) {
        agent.debug("getOptions failure", exc);
        throw("getOptions failure: " + exc);
    }
    //console.log(commands);
    this.commands = commands;
    return commands;
};

/** Store a report. 
    XML or HTML reports are numbered consecutively.
    
    @param {string|Buffer} content - content of the file to write
    @param {string} label - type of document
    @param {string} suffix - suffix of the file to write
    @returns {Promise<>}

*/

CodeGradX.Agent.prototype.writeReport = function (content, label, suffix) {
    var agent = this;
    label = ('-' + label) || '';
    var file = agent.xmldir + '/' + 
        (++agent.counter) + label + '.' + suffix;
    return CodeGradX.writeFileContent(file, content)
    .then(function () {
        agent.debug("Now written", file);
        return when(file);
    });
};

/** Determine the type of interaction with the infrastructure.
    `type` may be `job`, `exercise` or `batch`. If no type is
    given, return a `Promise<User>`.

    @returns {Promise<???>} yield a promise according to type

*/

CodeGradX.Agent.prototype.processType = function (user) {
    var agent = this;
    var type = agent.commands.options.type;
    if ( type === 'job' ) {
        return agent.processJob();
    } else if ( type === 'exercise' ) {
        return agent.processExercise();
    } else if ( type === 'batch' ) {
        return agent.processBatch();
    } else if ( type === 'resume' ) {
        return agent.processResume();
    } else {
        return when(agent.state.currentUser);
    }
};

/** Determine an exercise. An exercise may be specified by a safecookie
    (a long chain of characters starting with `U`) or by a kind of URI
    telling where to find that safecookie. Syntaxes for that URI are:
      
    file:exerciseAuthorReport.xml   means the exercise mentioned.
    
    campaign:free#N      means the Nth exercise of campaign `free`

    @param {string} string - a safecookie or a kind of URI
    @returns {Promise<Exercise>}
*/

CodeGradX.Agent.prototype.guessExercise = function (string) {
    var agent = this;
    var exercise, index;

    // file: should prefix an exerciseAuthorReport XML file:
    var results = string.match(/^file:(.*)$/);
    if ( results ) {
        var file = results[1];
        index = results[3] || 0;
        var content = fs.readFileSync(file, 'utf8');
        results = content.match(/<exerciseAuthorReport .* safecookie="([^"]+)"/);
        if ( results ) {
            exercise = new CodeGradX.Exercise({
                safecookie: results[1]
            });
            return when(exercise);
        } else {
            return when.reject("Could not find safecookie within " + string);
        }
    }

    // campaign: prefixes the name of a campaign:
    results = string.match(/^campaign:(.+)#(\d+)$/);
    if ( results ) {
        var campaignName = results[1];
        index = results[2] / 1;
        var user = agent.state.currentUser;
        return user.getCampaign(campaignName)
        .then(function (campaign) {
            return campaign.getExercise(index)
            .then(function (exercise) {
                if ( exercise ) {
                    return when(exercise);
                } else {
                    var error = new Error("Cannot find exercise#" + index +
                       " of the " + campaign.name + " campaign");
                    return when.reject(error);
                }
            });
        });
    }
    exercise = new CodeGradX.Exercise({
        safecookie: string
    });
    return when(exercise);
};

/** Send a Job and wait for the marking report

    @returns {Promise<Job>} 

*/

CodeGradX.Agent.prototype.processJob = function () {
    var agent = this;
    return agent.guessExercise(agent.commands.options.exercise)
        .then(function (exercise) {
            //console.log(exercise);
            var parameters = {
                progress: function (parameters) {
                    agent.debug("Waiting", parameters.i, "...");
                }
            };
            if ( agent.commands.options.timeout ) {
                parameters.step = agent.commands.options.timeout;
            }
            if ( agent.commands.options.retry ) {
                parameters.attempts = agent.commands.options.retry;
            }
            function cannotSendAnswer (reason) {
                agent.state.log.debug("Could not send file").show();
                throw reason;
            }
            function getJobReport (job) {
                agent.debug("Job sent, known as", job.jobid);
                return agent.writeReport(job.responseXML, 
                                         'jobSubmittedReport', 
                                         'xml')
                    .then(function () {
                        agent.debug("Waiting for marking report");
                        return job.getReport(parameters)
                            .catch(_.bind(agent.cannotGetReport, agent))
                            .then(_.bind(agent.storeJobReports, agent))
                            .catch(_.bind(agent.cannotStoreReport, agent));
                    }).catch(_.bind(agent.cannotStoreReport, agent));
            }
            agent.debug("Sending job...");
            return exercise
                .sendFileAnswer(agent.commands.options.stuff)
                .catch(cannotSendAnswer)
                    .then(getJobReport);
        });
};

/** storeJobReports store the XML and HTML content of a job in the
    `xmldir` directory. When the file is written, control is passed
    to the returned promise.

    @param {Job} job 
    @returns {Promise<nothing>}

    */

CodeGradX.Agent.prototype.storeJobReports = function (job) {
    var agent = this;
    agent.debug("Got job marking report", job.jobid);
    function storeXMLReport (job) {
        agent.debug("writing XML report");
        return agent.writeReport(job.XMLreport, 
                                 'jobStudentReport', 
                                 'xml');
    }
    function storeHTMLReport (job) {
        agent.debug("writing HTML report");
        return agent.writeReport(job.HTMLreport, 
                                 'jobStudentReport', 
                                 'html');
    }
    function returnJob () {
        return when(job);
    }
    return storeXMLReport(job)
        .then(returnJob)
        .catch(_.bind(agent.cannotStoreReport, agent))
        .then(storeHTMLReport)
        .catch(_.bind(agent.cannotStoreReport, agent))
        .then(returnJob);
};

CodeGradX.Agent.prototype.cannotStoreReport = function (reason) {
    var agent = this;
    agent.debug("Could not store report", reason);
    throw reason;
};

CodeGradX.Agent.prototype.cannotGetReport = function (reason) {
    var agent = this;
    agent.debug("Could not get report", reason);
    throw reason;
};

/** Store a Batch report (even not completed): a multiJobStudentReport
    XML document. 

    @param {Batch} batch
    @returns {Promise<Batch>}

*/

CodeGradX.Agent.prototype.storeBatchReport = function (batch) {
    var agent = this;
    agent.debug("Got batch final report", batch.batchid);
    function returnBatch () {
        return when(batch);
    }
    function fetchJobs () {
        if ( agent.commands.options.follow ) {
            agent.debug("Fetching individual jobs...");
            var promise, promises = [];
            _.forEach(batch.jobs, function (job) {
                if ( ! job._stored ) {
                    promise = job.getReport()
                        .then(_.bind(agent.storeJobReports, agent));
                    promises.push(promise);
                }
            });
            return when.all(promises);
        } else {
            return when(batch);
        }
    }
    return agent.writeReport(batch.XMLreport, 
                             'multiJobStudentReport', 
                             'xml')
        .then(fetchJobs)
        .then(returnBatch);
};

CodeGradX.Agent.prototype.storeExerciseReport = function (exercise) {
    var agent = this;
    function returnExercise () {
        return when(exercise);
    }
    function fetchPseudoJobs () {
        if ( agent.commands.options.follow ) {
            agent.debug("Fetching individual pseudo-jobs...");
            var promise, promises = [];
            _.forEach(exercise.pseudojobs, function (job) {
                promise = job.getReport()
                    .then(_.bind(agent.storeJobReports, agent));
                promises.push(promise);
            });
            return when.all(promises);
        } 
        return when(exercise);
    }
    agent.debug("Got exercise autocheck report");
    return agent.writeReport(exercise.XMLauthorReport,
                             'exerciseAuthorReport',
                             'xml')
        .then(fetchPseudoJobs)
        .then(returnExercise);
};

/** Examine a Batch (even not completed) and fetch the grading reports
    of already graded jobs. Use the `_stored` tag to fetch only once
    the report.

    @param {Batch} batch
    @returns {Promise<Batch>}

*/

CodeGradX.Agent.prototype.fetchJobs = function (batch) {
    var agent = this;
    function returnBatch () {
        return when(batch);
    }
    if ( agent.commands.options.follow &&
         batch.finishedjobs > 0 ) {
        agent.debug("Fetching in advance individual jobs...");
        var promise, promises = [];
        _.forEach(batch.jobs, function (job) {
            if ( ! job._stored ) {
                promise = job.getReport()
                    .then(_.bind(agent.storeJobReports, agent))
                    .then(function (job) {
                        agent.debug("Stored report for job " + job.jobid);
                        job._stored = true;
                        return promise.done(job);
                    });
                promises.push(promise);
            }
        });
        when.all(promises).then(returnBatch).catch(ignore);
    }
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
        function ignore () { return; }
        if ( batch ) {
            agent.debug("Marked jobs:", batch.finishedjobs, 
                        '/', (batch.totaljobs || '?'),
                        '   still waiting...');
            //agent.state.log.show();
            // Fetch job reports for already marked jobs:
            agent.fetchJobs(batch);
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
        parameters.attempts = agent.commands.options.retry;
    }
    function cannotSendBatch (reason) {
        agent.state.log.debug("Could not send batch file");
        throw reason;
    }
    function getBatchReport (batch) {
        agent.debug("Batch sent, known as", batch.batchid);
        return agent.writeReport(batch.responseXML, 
                                 'multiJobSubmittedReport', 
                                 'xml')
            .then(function () {
                agent.debug("Waiting for final batch completion report...");
                return batch.getFinalReport(parameters)
                    .catch(_.bind(agent.cannotGetReport, agent))
                    .then(_.bind(agent.storeBatchReport, agent))
                    .catch(_.bind(agent.cannotStoreReport, agent));
            }).catch(_.bind(agent.cannotStoreReport, agent));
    }
    agent.debug("Sending batch...");
    return exercise
        .sendBatch(agent.commands.options.stuff)
        .catch(cannotSendBatch)
        .then(getBatchReport);
};

/** Send an Exercise and wait for the autocheck report

    @returns {Promise<Exercise>} 

*/

CodeGradX.Agent.prototype.processExercise = function () {
    var agent = this;
    var parameters = {};
    if ( agent.commands.options.timeout ) {
        parameters.step = agent.commands.options.timeout;
    }
    if ( agent.commands.options.retry ) {
        parameters.attempts = agent.commands.options.retry;
    }
    function cannotSendExercise (reason) {
        agent.state.log.debug("Could not send exercise file");
        throw reason;
    }
    function getExerciseReport (exercise) {
        agent.debug("Exercise sent, known as", exercise.name);
        return agent.writeReport(exercise.XMLsubmission,
                                 "exerciseSubmittedReport",
                                 "xml")
        .then(function () {
            agent.debug("Waiting for exercise autocheck report...");
            return exercise.getExerciseReport(parameters)
            .catch(_.bind(agent.cannotGetReport, agent))
            .then(_.bind(agent.storeExerciseReport, agent))
            .catch(_.bind(agent.cannotStoreReport, agent));
        }).catch(_.bind(agent.cannotStoreReport, agent));
    }
    agent.debug("Sending exercise...");
    return agent.state.currentUser
        .submitNewExercise(agent.commands.options.stuff)
        .catch(cannotSendExercise)
        .then(getExerciseReport);
};

/** Resume a former process. A previous exercise or batch was not finished
    so resume it.

    @returns {Promise<???>} 

*/

CodeGradX.Agent.prototype.processResume = function () {
    var agent = this;
    var file = agent.commands.options.resume;
    var content = fs.readFileSync(file, 'utf8');
    if ( content.match(/<multiJobSubmittedReport /) ) {
        return agent.processResumeBatch(content);
    } else if ( content.match(/<exerciseSubmittedReport/) ) {
        return agent.processResumeExercise(content);
    } else {
        return when.reject(new Error("Cannot resume " + file));
    }
};

/** Resume a former processBatch that is wait for the completion of the
    Batch and fetch all the students' jobs.

    @returns {Promise<Batch>} 

*/

CodeGradX.Agent.prototype.processResumeBatch = function (content) {
    var agent = this;
    function showProgress (parameters) {
        var batch = parameters.batch;
        function ignore () { return; }
        if ( batch ) {
            agent.debug("Marked jobs:", (batch.finishedjobs || '?'),
                        '/', (batch.totaljobs || '?'),
                        '   still waiting...');
            //agent.state.log.show();
            // Fetch job reports for already marked jobs:
            agent.fetchJobs(batch);
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
        parameters.attempts = agent.commands.options.retry;
    }
    return CodeGradX.parsexml(content).then(function (js) {
        js = js.fw4ex.multiJobSubmittedReport;
        var batch = new CodeGradX.Batch({
            responseXML: content,
            response: js,
            personid: CodeGradX._str2num(js.person.$.personid),
            archived: CodeGradX._str2Date(js.batch.$.archived),
            batchid:  js.batch.$.batchid,
            pathdir:  js.$.location
        });
        return batch.getFinalReport(parameters)
            .catch(_.bind(agent.cannotGetReport, agent))
            .then(_.bind(agent.storeBatchReport, agent))
            .catch(_.bind(agent.cannotStoreReport, agent));
    });
};

CodeGradX.Agent.prototype.processResumeExercise = function (content) {
    var agent = this;
    var parameters = {};
    if ( agent.commands.options.timeout ) {
        parameters.step = agent.commands.options.timeout;
    }
    if ( agent.commands.options.retry ) {
        parameters.attempts = agent.commands.options.retry;
    }
    return CodeGradX.parsexml(content).then(function (js) {
        js = js.fw4ex.exerciseSubmittedReport;
        var exercise = new CodeGradX.Exercise({
          location: js.$.location,
          personid: CodeGradX._str2num(js.person.$.personid),
          exerciseid: js.exercise.$.exerciseid,
          XMLsubmission: content
        });
        return exercise.getExerciseReport(parameters)
        .catch(_.bind(agent.cannotGetReport, agent))
        .then(_.bind(agent.storeExerciseReport, agent))
        .catch(_.bind(agent.cannotStoreReport, agent));
    });
};

/* *********************************************************************
   Determine whether this module is used as a script or as a library.
   If used as a script then process the arguments otherwise do nothing.
*/

if ( _.endsWith(process.argv[1], 'codegradxagent.js') ) {
    // We are running that script:
    var agent = new CodeGradX.Agent();
    agent.process(process.argv.slice(2))
    .catch(function (exc) {
        console.log('Failure: ' + exc);
    });
}

// end of codegradxagent.js

