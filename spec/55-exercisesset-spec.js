// Jasmine test related to the vmauthor virtual machine. The vmauthor
// virtual machine hosts a full constellation of CodeGradX servers.
// The vmauthor virtual machine is available from 
//       http://paracamplus.com/CodeGradX/VM/latest/

var CodeGradX = require('codegradxlib');
var Agent = require('../codegradxagent.js');
var vmauthor = require('./vmauthor-data.js');
var vmauthData = require('./vmauth-data.json');
var vmauth2Data = require('./vmauth2-data.json');

describe("CodeGradXagent process exercisesSet", function () {
    CodeGradX.xml2html.default.markFactor = 1;
    
    function initializer (agent) {
        // User VMauthor's servers:
        agent.state = new CodeGradX.State(vmauthor.initialize);
        return agent;
    }

    it("should be loaded", function () {
        expect(Agent).toBeDefined();
        var agent = new CodeGradX.Agent(initializer);
        expect(agent).toBeDefined();
    });

    function make_faildone (done) {
        return function faildone (reason) {
            //agent.state.debug(reason).show();
            //console.log(reason);
            fail(reason);
            done();
        };
    }

    it("should fail uploading an exercisesset, not teacher", function (done) {
        var agent = new CodeGradX.Agent(initializer);
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "-v",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'exercisesset',
            "--stuff",    'spec/es.yml',
            "--campaign", 'example',
            "--timeout",  10,
            "--follow"
        ]).then(faildone).catch(done);
    });

    it("should fail uploading an exercisesset, missing stuff",
       function (done) {
        var agent = new CodeGradX.Agent(initializer);
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "-v",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'exercisesset',
            //"--stuff",    'spec/es.yml',
            //"--campaign", 'example',
            "--timeout",  10,
            "--follow"
        ]).then(faildone).catch(done);
    });

    it("should fail uploading an exercisesset, missing campaign",
       function (done) {
        var agent = new CodeGradX.Agent(initializer);
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "-v",
            "--user",     vmauth2Data.login,
            "--password", vmauth2Data.password,
            "--type",     'exercisesset',
            "--stuff",    'spec/es.yml',
            //"--campaign", 'example',
            "--timeout",  10,
            "--follow"
        ]).then(faildone).catch(done);
    });

    it("should succeed uploading an exercisesset", function (done) {
        expect(Agent).toBeDefined();
        var agent = new CodeGradX.Agent(initializer);
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "-v",
            "--user",     vmauth2Data.login,
            "--password", vmauth2Data.password,
            "--type",     'exercisesset',
            "--stuff",    'spec/es.yml',
            "--campaign", 'example',
            "--timeout",  10,
            "--follow"
        ]).then(function (exercisesSet) {
            console.log(exercisesSet);
            done();
        }).catch(faildone);
    });
});
