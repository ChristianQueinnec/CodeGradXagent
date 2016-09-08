// 

var CodeGradX = require('codegradxlib');
var Agent = require('../codegradxagent.js');

describe("CodeGradXagent", function () {
    it("should be loaded", function () {
        expect(Agent).toBeDefined();
        var agent = new CodeGradX.Agent();
        expect(agent).toBeDefined();
    });

    function make_faildone (done) {
        return function faildone (reason) {
            agent.state.debug(reason).show();
            fail(reason);
            done();
        };
    }

    it("should write into a file", function (done) {
        var agent = new CodeGradX.Agent();
        var faildone = make_faildone(done);
        var content = '{"test": 1}';
        CodeGradX.writeFileContent(
            agent.credentialsFile,
            content ).then(function () {
                CodeGradX.readFileContent(agent.credentialsFile).then(
                    function (content2) {
                        expect(content2.toString()).toBe(content);
                        done();
                    }, faildone);
            }, faildone );
    });

    it("cannot write into a unexistent file", function (done) {
        var agent = new CodeGradX.Agent();
        var faildone = make_faildone(done);
        var content = '{"test": 1}';
        CodeGradX.writeFileContent(
            "/un/existing/path.json",
            content ).then(faildone, function (reason) {
                expect(reason).toBeDefined();
                done();
            });
    });

});
