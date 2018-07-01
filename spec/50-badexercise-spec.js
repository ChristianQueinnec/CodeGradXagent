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

    var exerciseTGZFile = "spec/org.example.fw4ex.bad.check.tgz";
    var exercise;

    it("should submit an exercise", function (done) {
        var agent = CodeGradX.getCurrentAgent();
        expect(agent).toBeDefined();
        var faildone = make_faildone(done);
        agent.process([
            "-v",
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--type",     'exercise',
            "--stuff",    exerciseTGZFile,
            "--timeout",  10,
            "--counter",  700,
            "--follow"
        ]).then(function (exercise) {
            //console.log(exercise);//DEBUG
            expect(exercise).toBeDefined();
            expect(exercise.pseudojobs).toBeDefined();
            expect(exercise.pseudojobs.perfect).toBeDefined();
            expect(exercise.pseudojobs.perfect.problem).toBeTruthy();
            expect(exercise.pseudojobs.perfect.XMLproblemReport)
                .toMatch(/No corresponding opening element for/);
            done();
        }, faildone);
    }, 400*1000); // 400 seconds

});
