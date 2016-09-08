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

    it("should submit another exercise and resume it", function (done) {
        var agent = CodeGradX.getCurrentAgent();
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "-V",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--update-credentials",
            "--type",     'exercise',
            "--stuff",    exerciseTGZFile1,
            "--counter",  350,
            "--timeout",  3,
            "--retry",     2
        ]).then(function (exercise) {
            expect(exercise).toBeDefined();
            agent.process([
                "-v",
                "--resume",   '351-exerciseSubmittedReport.xml',
                "--follow"
            ]).then(function (exercise2) {
                expect(exercise2.pseudojobs).toBeDefined();
                expect(exercise2.pseudojobs.perfect).toBeDefined();
                expect(exercise2.pseudojobs.perfect.mark).toBe(100);
                // Normally 35[23]-exerciseAuthorReport.xml are equal
                done();
            }, faildone);
        }, faildone);
    }, 400*1000); // 400 seconds

});
