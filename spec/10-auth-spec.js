// Jasmine test related to the vmauthor virtual machine. The vmauthor
// virtual machine hosts a full constellation of CodeGradX servers.
// The vmauthor virtual machine is available from 
//       http://paracamplus.com/CodeGradX/VM/latest/

var CodeGradX = require('codegradxlib');
var Agent = require('../codegradxagent.js');
var vmauthor = require('./vmauthor-data.js');
var vmauthData = require('./vmauth-data.json');

describe("CodeGradXagent authentication", function () {

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

    it("cannot read absent credentials", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.process([
            "--credentials", "spec/absentCredentials.json"
        ]).then(faildone, function (reason) {
            expect(agent.credentials).not.toBeDefined();
            done();
        });
    });

    var safecookie1;

    it("with user+password", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.process([
            "--user",     vmauthData.login,
            "--password", vmauthData.password
        ]).then(function (user) {
            expect(user).toBeDefined();
            expect(user.email).toBe('nobody@example.com');
            safecookie1 = agent.state.currentCookie;
            done();
        }, faildone);
    }, 10*1000); // 10 seconds

    it("with previous cookie", function (done) {
        agent = CodeGradX.getCurrentAgent();
        var faildone = make_faildone(done);
        agent.process([
        ]).then(function (user) {
            expect(user).toBeDefined();
            expect(user.email).toBe('nobody@example.com');
            done();
        }, faildone);
    }, 10*1000); // 10 seconds

    it("update credentials with user+password", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.process([
            "--user",     vmauthData.login,
            "--password", vmauthData.password,
            "--update-credentials"
        ]).then(function (user) {
            expect(user).toBeDefined();
            CodeGradX.readFileContent(agent.credentialsFile).then(
                function (content) {
                    var json = JSON.parse(content);
                    //console.log(JSON.stringify(json));
                    expect(json.cookie).toMatch(/^u=U.{30}/);
                    done();
                }, faildone);
        }, faildone);
    }, 10*1000); // 10 seconds

    it("with user but wrong password", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.state.log.size = 100;
        agent.process([
            "--user",     vmauthData.login,
            "--password", '123456WrongPassword'
        ]).then(faildone, function (reason) {
            //agent.state.log.show();
            expect(reason).toBeDefined();
            done();
        });
    }, 10*1000); // 10 seconds

    it("with credentials with cookie", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        agent.process([
            "--credentials", agent.credentialsFile
        ]).then(function (user) {
            expect(user).toBeDefined();
            done();
        }, faildone);
    }, 10*1000); // 10 seconds

    it("with credentials with wrong cookie", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        CodeGradX.writeFileContent(
            agent.credentialsFile, 
            '{"cookie": ["u=U1234"]}').then(
                function () {
                    agent.process([
                        "--credentials", agent.credentialsFile
                    ]).then(function (user) {
                        console.log(user);
                        faildone();
                    }, function (reason) {
                        expect(reason).toBeDefined();
                        done();
                    });
                }, faildone);
    }, 10*1000); // 10 seconds

    it("with credentials without cookie", function (done) {
        agent = new CodeGradX.Agent(initializer);
        var faildone = make_faildone(done);
        CodeGradX.writeFileContent(
            agent.credentialsFile, 
            JSON.stringify({
                user:     vmauthData.login,
                password: vmauthData.password
            })).then(function () {
                agent.process([
                    "--credentials", agent.credentialsFile
                ]).then(function (user) {
                    expect(user).toBeDefined();
                    done();
                }, faildone);
            }, faildone);
    }, 10*1000); // 10 seconds

    it("cannot authenticate with wrong credentials", function (done) {
        agent = new CodeGradX.Agent(initializer);
        //console.log(agent);
        var faildone = make_faildone(done);
        CodeGradX.writeFileContent(
            agent.credentialsFile, 
            '{"user": "nobody:0", "password": "totallyWrong"}').then(
                function () {
                    agent.process([
                        "--credentials", agent.credentialsFile
                    ]).then(function (user) {
                        console.log(user);
                        faildone();
                    }, function (reason) {
                        expect(reason).toBeDefined();
                        done();
                    });
                }, faildone);
    }, 10*1000); // 10 seconds

});
