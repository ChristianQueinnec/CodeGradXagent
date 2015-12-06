// test authentication wrt vmauthor

var CodeGradX = require('../codegradxlib.js');
var Agent = require('../codegradxagent.js');
var vmauthor = require('./vmauthor-data.js');
var vmauthData = require('./vmauth-data.json');

describe("CodeGradXagent process Job, Batch, Exercise", function () {

    function initializer (agent) {
        // User VMauthor's servers:
        agent.state = new CodeGradX.State(vmauthor.initialize);
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
        var exerciseName = "com.paracamplus.li205.function.1";
        agent.processAuthentication([
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

    it("send a job", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.processAuthentication([
            "-v",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'job',
            "--stuff",    'spec/min.c',
            "--exercise", exercise1.safecookie
        ]).then(function (user) {
            expect(user).toBeDefined();
            agent.processJob().then(function (job) {
                expect(job).toBeDefined();
                done();
            }, faildone);
        }, faildone);
    }, 100*1000); // 100 seconds

    it("send a batch", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.processAuthentication([
            "-v",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'batch',
            "--stuff",    'spec/oefgc.tgz',
            "--exercise", exercise1.safecookie,
            "--timeout",  10,
            "--follow"
        ]).then(function (user) {
            expect(user).toBeDefined();
            agent.processBatch().then(function (batch) {
                expect(batch).toBeDefined();
                done();
            }, faildone);
        }, faildone);
    }, 300*1000); // 300 seconds

});
