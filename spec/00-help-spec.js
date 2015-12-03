// 

var CodeGradX = require('../codegradxlib.js');
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

    it("displays help", function (done) {
        var agent = new CodeGradX.Agent();
        var faildone = make_faildone(done);
        spyOn(agent, "usage");
        agent.processAuthentication([
            "-h"
        ]).then(faildone, function (reason) {
            expect(agent.usage).toHaveBeenCalled();
            done();
        });
    });

    it("cannot read absent credentials", function (done) {
        var agent = new CodeGradX.Agent();
        var faildone = make_faildone(done);
        agent.processAuthentication([
            "--credentials", "spec/absentCredentials.json"
        ]).then(faildone, function (reason) {
            expect(agent.credentials).not.toBeDefined();
            done();
        });
    });

});
