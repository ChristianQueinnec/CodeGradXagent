// Jasmine test related to the vmauthor virtual machine. The vmauthor
// virtual machine hosts a full constellation of CodeGradX servers.
// The vmauthor virtual machine is available from 
//       http://paracamplus.com/CodeGradX/VM/latest/

var CodeGradX = require('../codegradxlib.js');
var Agent = require('../codegradxagent.js');
var vmauthor = require('./vmauthor-data.js');
var vmauthData = require('./vmauth-data.json');

describe("CodeGradXagent process Batch", function () {

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

    it("should get hold of one exercise", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        var exerciseName = "com.paracamplus.li205.function.1";
        agent.process([
            "--user",     vmauthData.login,
            "--password", vmauthData.password
        ]).then(function (user) {
            expect(user).toBeDefined();
            user.getCampaign('free').then(function (campaign) {
                expect(campaign).toBeDefined();
                expect(campaign.name).toBe('free');
                campaign.getExercise(exerciseName).then(function (exercise) {
                    expect(exercise).toBeDefined();
                    exercise1 = exercise;
                    //console.log(exercise);
                    done();
                }, faildone);
            }, faildone);
        }, faildone);
    }, 10*1000); // 10 seconds

    it("send a batch and get all jobs reports", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.process([
            "-V",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'batch',
            "--stuff",    'spec/oefgc.tgz',
            "--exercise", exercise1.safecookie,
            "--offset",   30,
            "--timeout",  10,
            "--counter",  400,
            "--follow"
        ]).then(function (batch) {
            expect(batch).toBeDefined();
            expect(batch.finishedjobs).toBe(batch.totaljobs);
            console.log(batch); // DEBUG
            expect(batch.jobs.third).toBeDefined();
            done();
        }, faildone);
    }, 500*1000); // 500 seconds

});
