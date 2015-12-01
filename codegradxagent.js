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
var CodeGradX = require('codegradxlib');

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
    // .bindHelp() forces the process to exit!
    this.credentialsFile = './.fw4ex.json';
    // Customize
    if ( initializer ) {
        initializer(this);
    }
}

CodeGradX.Agent.prototype.exit = function (code) {
    process.exit(code || 0);
}

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
    return nodefn.call(fs.writeFile, filename, data)
    .then(function (err, result) {
           if ( err ) {
               return when.reject(err);
           } else {
               return when(result);
           }
    });
};

/** 
    `processAuthentication()` handle authentication, read/update credentials.

    @param {Array<string>} strings - command line options
    @returns {Promise<User>} 

*/

CodeGradX.Agent.prototype.processAuthentication = function (strings) {
    var agent = this;
    var commands = agent.getOptions(strings);
    agent.commands = commands;

    if ( commands.options.verbose ) {
        agent.verbose = true;
    }

    if ( commands.options.help ) {
        agent.usage();
        return when.reject(new Error("Help displayed"));
    }

    function updateCredentials (user) {
        if ( commands.options['update-credentials'] ) {
            agent.state.debug("Updating credentials", agent.credentialsFile);
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
                    agent.state.debug("Could not write credentials");
                    return when.reject(reason);
                });
        } else {
            return when(user);
        }
    }
    
    function couldNotAuthenticate (reason) {
        agent.state.debug("Failed authentication", reason).show();
        return when.reject(reason);
    }

    // --user= and --password= are present:
    if ( commands.options.user &&
         commands.options.password ) {
        return agent.state.getAuthenticatedUser(
            commands.options.user,
            commands.options.password )
            .then(updateCredentials, couldNotAuthenticate);

    // --credentials= designates a configuration file:
    } else if ( commands.options.credentials ) {
        CodeGradX.readFileContent(commands.options.credentials).then(
            function (content) {
                agent.state.debug("Read " + commands.options.credentials);
                agent.credentials = JSON.parse(content);
                // A cookie is present:
                if ( agent.credentials.cookie ) {
                    agent.state.debug("Using cookie");
                    agent.state.currentCookie = agent.credentials.cookie;
                    return agent.state.getAuthenticatedUser(
                        agent.credentials.user,
                        agent.credentials.password )
                        .then(updateCredentials, couldNotAuthenticate);

                // A user and its password are present:
                } else if ( agent.credentials.user &&
                            agent.credentials.password ) {
                    agent.state.debug("Using user+password");
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

// end of codegradxagent.js

