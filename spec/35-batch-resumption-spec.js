// Jasmine test related to the vmauthor virtual machine. The vmauthor
// virtual machine hosts a full constellation of CodeGradX servers.
// The vmauthor virtual machine is available from 
//       http://paracamplus.com/CodeGradX/VM/latest/

var CodeGradX = require('codegradxlib');
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
        var exerciseName = "org.example.li205.function.1";
        agent.process([
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--update-credentials"
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

    it("initiate a batch then resume it", function (done) {
        agent = CodeGradX.getCurrentAgent();
        var faildone = make_faildone(done);
        function resumeBatch (batch) {
            expect(batch).toBeDefined();
            // Check that the batch is not yet completed:
            // expect(batch.finishedjobs).toBeLessThan(batch.totaljobs);
            agent.process([
                "-V",
                "--resume",   '601-multiJobSubmittedReport.xml',
                "--counter",  651,
                "--timeout",   10,
                "--retry",     30,
                "--follow"
            ]).then(function (batch2) {
                // normally 6[05]1-multiJobSubmittedReport.xml are equal
                expect(batch2).toBeDefined();
                expect(batch2.finishedjobs).toBe(batch2.totaljobs);
                done();
            }, faildone);
        }
        agent.process([
            "-V",
            "--type",     'batch',
            "--stuff",    'spec/oefgc.tgz',
            "--exercise", exercise1.safecookie,
            "--offset",   10,
            "--timeout",   5,
            "--retry",     3,
            "--counter",  600,
            "--follow"
        ]).then(resumeBatch).catch(resumeBatch);
    }, 500*1000); // 500 seconds

    it("resume the former (already completed) batch", function (done) {
        agent = CodeGradX.getCurrentAgent();
        var faildone = make_faildone(done);
        agent.process([
            "--resume",   '601-multiJobSubmittedReport.xml',
            "--counter",  671,
            "--follow"
        ]).then(function (batch) {
            expect(batch).toBeDefined();
            expect(batch.finishedjobs).toBe(batch.totaljobs);
            expect(batch.jobs.third).toBeDefined();
            done();
        }, faildone);
    }, 500*1000); // 500 seconds

});
