// Jasmine test related to the vmauthor virtual machine. The vmauthor
// virtual machine hosts a full constellation of CodeGradX servers.
// The vmauthor virtual machine is available from 
//       http://paracamplus.com/CodeGradX/VM/latest/

var CodeGradX = require('codegradxlib');
var Agent = require('../codegradxagent.js');
var vmauthor = require('./vmauthor-data.js');
var vmauthData = require('./vmauth-data.json');

describe("CodeGradXagent process Job", function () {

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

    var exerciseTGZFile1 = "spec/org.example.fw4ex.grading.check.tgz";
    var exercise1;

    it("should submit an exercise", function (done) {
        var agent = CodeGradX.getCurrentAgent();
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "-v",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'exercise',
            "--stuff",    exerciseTGZFile1,
            "--timeout",  10,
            "--follow"
        ]).then(function (exercise) {
            expect(exercise).toBeDefined();
            expect(exercise.pseudojobs).toBeDefined();
            expect(exercise.pseudojobs.perfect).toBeDefined();
            expect(exercise.pseudojobs.perfect.mark).toBe(100);
            exercise1 = exercise;
            done();
        }, faildone);
    }, 400*1000); // 400 seconds

    it("send a job against this new exercise", function (done) {
        var agent = CodeGradX.getCurrentAgent();
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        expect(exercise1).toBeDefined();
        agent.process([
            "--Verbose",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--exercise", exercise1.safecookie,
            "--counter",  100,
            "--type",     'job',
            "--stuff",    'spec/oefgc/1.tgz'
        ]).then(function (job) {
            expect(job).toBeDefined();
            expect(job.mark).toBe(10);
            done();
        }, faildone);
    }, 100*1000); // 100 seconds

    it("send a job against this new exercise specified with file:", 
       function (done) {
        var agent = CodeGradX.getCurrentAgent();
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "--Verbose",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--exercise", 'file:2-exerciseAuthorReport.xml',
            "--counter",  200,
            "--offset",    7,
            "--type",     'job',
            "--stuff",    'spec/oefgc/1.tgz'
        ]).then(function (job) {
            expect(job).toBeDefined();
            expect(job.mark).toBe(10);
            done();
        }, faildone);
    }, 100*1000); // 100 seconds

    // it("send a job against this new exercise specified with campaign:", 
    //    function (done) {
    //     var agent = CodeGradX.getCurrentAgent();
    //     expect(agent).toBeDefined();
    //     var faildone = make_faildone(done);
    //     agent.process([
    //         "--Verbose",
    //         "--user",     vmauthData.login,
    //         "--password", vmauthData.password,
    //         "--exercise", 'campaign:example#2',
    //         "--counter",  300,
    //         "--offset",    7,
    //         "--type",     'job',
    //         "--stuff",    'spec/min.c'
    //     ]).then(function (job) {
    //         expect(job).toBeDefined();
    //         expect(job.mark).toBe(1);
    //         done();
    //     }, faildone);
    // }, 100*1000); // 100 seconds

});
