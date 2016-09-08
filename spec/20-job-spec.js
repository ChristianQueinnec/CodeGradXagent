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

    // Get the safecookie identifying exercise com.paracamplus.li205.function.1
    var exercise1;

    it("should get hold of exercise", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        var exerciseName = "org.example.li205.function.1";
        agent.process([
            "--user",     vmauthData.login,
            "--password", vmauthData.password
        ]).then(function (user) {
            expect(user).toBeDefined();
            user.getCampaign('example').then(function (campaign) {
                expect(campaign).toBeDefined();
                expect(campaign.name).toBe('example');
                campaign.getExercise(exerciseName).then(function (exercise) {
                    expect(exercise).toBeDefined();
                    exercise1 = exercise;
                    //console.log(exercise);
                    done();
                }, faildone);
            }, faildone);
        }, faildone);
    }, 10*1000); // 10 seconds

    it("send a job", function (done) {
        agent = new CodeGradX.Agent(initializer);
        expect(CodeGradX.getCurrentAgent()).toBe(agent);
        var faildone = make_faildone(done);
        agent.process([
            "-v",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'job',
            "--stuff",    'spec/min.c',
            "--exercise", exercise1.safecookie
        ]).then(function (job) {
            expect(job).toBeDefined();
            done();
        }, faildone);
    }, 100*1000); // 100 seconds

});
