# CodeGradXagent

CodeGradXagent is a script providing a command line interface to ease
interaction with the CodeGradX infrastructure. It internally uses the
CodeGradXlib library (an npm module) that runs on top of Node.js.
Reading the [page associated to the CodeGradXlib
](https://www.npmjs.com/package/codegradxlib)
npm module is recommended.

People interested in that script are mainly teachers wanting to mark a
batch of students' files or authors of exercises. Basic knowledge of
command line interface is required to automatize interactions with the
CodeGradX infrastructure. Others may prefer a Web interface.

## Installation

```javascript
npm install codegradxagent
```

Caution, if you are an author and wants to use the virtual machine for
authors, named [VMauthor](https://codegradx.org/CodeGradX/VM/).
You should also install the [codegradxvmauthor
](https://www.npmjs.com/package/codegradxvmauthor) module that configures the
agent to use VMauthor rather than the real constellation of servers.
See how to authenticate with VMauthor in the `codegradxvmauthor`
documentation.

## Usage

You may run this script with the regular CodeGradX infrastructure with
node as (where `...` is a path leading to the script):

```sh
node .../codegradxagent.js
```

If the `codegradxagent` script is executable, you may simply write:

```sh
.../codegradxagent.js
```

And, if `codegradxagent` is on your PATH, you just write:

```sh
codegradxagent.js
```

By default or with the `-h` or `--help` options, the script prints a
short summary of the possible options.

Two other global options, `-v` or `-V`, ask the codegradxagent to
be verbose and to show what it does. The second option also asks the
CodeGradXlib library to be verbose.

### Authentication

You cannot use the CodeGradX infrastructure if you are not registered
that is, you have a login and a password. These login and password may
be passed with the `--user` and `--password` options. Since that last
option may reveal your password to other users of your computer, you
may prefer to use a credentials file (by default, this file is named
`.fw4ex.json`). You mention that credentials file with the
`--credentials` option. When authenticated, the CodeGradX
infrastructure identifies you with a safe-cookie (a ciphered cookie).
This cookie is available for some hours so it may be stored in your
credentials file using the `--update-credentials` option.
Therefore, a series of invocations of the script starts often with

```bash
$ cat .fw4ex.json
{ "user": "myLogin",
  "password": "myPassword"
}
$ ./codegradxagent.js --update-credentials
```



### Sending an answer against an exercise

An exercise is identified by a safe-cookie (a long string of
characters). An exercise is specified by the `--exercise` option, the
associated value may take several forms, all of them yielding a
safe-cookie.

If you are the author of an exercise then, when this exercise was
checked and deployed, its safe-cookie was returned to you in the
authorExerciseReport file, say `2-exerciseAuthorReport.xml`.
Then `--exercise=file:2-exerciseAuthorReport.xml` allows the
CodeGradXagent to extract the safe-cookie from that file.

If the exercise is part of a campaign you can access, say this is the
3rd exercise of a campaign named `free`, then saying `--exercise
campaign:free#2` will extract the safe-cookie associated to that third
exercise.

Once you know how to get the safe-cookie identifying an exercise, you
may send an answer to that exercise. Depending on the exercise, the
expected answer may be a single file or a bunch of files. The answer
should be packed within a tar gzipped file, say `answer.tgz` and sent
with the `--stuff` option as in:

```bash
$ ./codegradxagent.js -t job -e 'campaign:free#2' --stuff answer.tgz
```

The `-t` or `--type` option specifies that we send an answer against
an exercise.

#### Produced files

The CodeGradX infrastructure is operated via REST protocols,
interactions often yields reports in XML or JSON. These reports are
stored in the directory specified by `--xmldir` (by default the
current directory), their name is prefixed by an integer starting with
the value of `--counter` (by default `0`). For instance, the
previous command will produce some reports:
- `1-jobSubmittedReport.xml` an intermediate report acknowledging the
  reception of a job to mark
- `2-jobStudentReport.xml` the grading report containing the mark
  given to the answer as well as a (perhaps lengthy) description of
  the tests performed on the answer.
- `3-jobStudentReport.html` an HTML translation of the grading report.
  You may prefer to run your own translation (this one is not very
  good).
- `4-jobProblemReport.xml` is intended for authors of exercises and
  contains information related to the bad behavior of the exercise.
  The most common errors are that the output of the exercise is
  invalid with respect to the XML grammar or some grading script is
  erroneous.

#### Time management

Some exercises may require a number of seconds to grade an answer. On
the other hand, some answers may loop or be stuck, they will be killed
once a given duration set by the author of the exercise is overrun.
Therefore three other options exist dealing with time:

- `offset` (by default 0 second) tells the script to wait that number of
  seconds before attempting to fetch the grading report.
- `retry` (by default 30) tells the script to try to fetch the grading
  report at most that number.
- `timeout` (by default 5 seconds, cannot be less than 5) tells the
  script to wait that number of seconds before any two attempts to
  fetch the grading report.

### Sending a batch against an exercise

The `--type` option should now be set to `batch`.

The identification of the exercise does not vary. 

A batch of students' answers is described by a manifest, a `fw4ex.xml`
file. Suppose for instance that we have the two students' files
`1.tgz` and `2.tgz` then the manifest may look like:

```sh
$ cat fw4ex.xml
<?xml version='1.0' encoding='UTF-8' ?>
<fw4ex version='1.0'>
  <multiJobSubmission label='batch.test.sh.1'>
    <job label='premiere' filename='1.tgz' />
    <job label='seconde'  filename='2.tgz' />
  </multiJobSubmission>
</fw4ex>
```

The whole batch file is then created and sent as:

```bash
$ tar czf /tmp/batch1.tgz fw4ex.xml 1.tgz 2.tgz
$ ./codegradxagent.js -t batch -e 'campaign:free#2' \
    --stuff /tmp/batch1.tgz \
    --offset=30 --timeout=25 --retry 5 \
    --xmldir /tmp/ --counter=100 \
    --follow
```

#### Produced files

The `--follow` option tells the script to fetch the grading reports of
the students as soon as they are graded. They will be stored in the
`/tmp/` directory with names prefixed by numbers starting at 100.

Some files are produced:
- `101-multiJobSubmittedReport.xml` acknowledges the reception of the batch
- `102-multiJobStudentReport.xml` is the batch instantaneous report in
  which appears the references to the students' grading reports as
  well as how many reports are graded.
- `103-jobStudentReport.xml` grading report of the first answer with
  label `premiere`
- etc.

#### Resumption

The management of time does not vary but, of course, should accomodate
the number of students' answers to be graded. If it appears that you
mention a too short duration and miss some students' grading report,
you may resume your script with:

```bash
$ ./codegradxagent.js --resume 101-multiJobSubmittedReport.xml --follow
```

### Submitting an exercise

The `--type` option should now be set to `exercise`.

An exercise is a somewhat complex tar gzipped file (see more thorough
documentation) that may be submitted as:

```bash
$ ./codegradxagent.js -t exercise --stuff 
```

Since an exercise contains a number of answers of pseudo-students, it
may take some time to check that all these answers are appropriately
graded: you must manage time accordingly.

#### Produced files

The `--follow` option tells the script to fetch the grading reports of
the pseudo-students once graded. 

Some files are produced:
- `1-exerciseSubmittedReport.xml` acknowledges the reception of the exercise
- `2-exerciseAuthorReport.xml` is the final report where appears the
  safe-cookie of the exercise if no problem was detected.

#### Resumption

The management of time does not vary but, of course, should accomodate
the number of students' answers to be graded. If it appears that you
mention a too short duration, you may resume your script and ask
for the grading reports of the pseudo-jobs with:

```bash
$ ./codegradxagent.js --resume 1-exerciseSubmittedReport.xml --follow
```

You may also set new options for time management.

### Updating a list of exercises

After the creation of a new exercise, you may want to let students use
that new exercise. You may send them the long URL leading to it or,
you may add it to a dedicated Web page listing the exercises they
should practice. A campaign is a concept of CodeGradX binding a group
of students, a group of teachers and a list of exercises during a
certain period of time. Here is how you may update that list of
exercises.

The `--type` option should be set to `exercisesset`. The `--campaign`
option names the campaign and `--stuff` is a YAML file listing the
exercises. The YAML file may look like:

``` yaml
exercises:
    prologue: |
      Exercises in some language
      This is a multi-line text.
    1:
      title: first set of exerciss
      prologue: make heavy use of closures
      1: org.codegradx.js.min3.3
      2: org.codegradx.js.min4.2
      epilogue: Arrived here ? Good!
    2:
      title: second set of exercises
      1: org.codegradx.js.min4.2
```

In return, you get the compiled JSON equivalent description.

## Miscellaneous

The `Samples` directory contains examples of XML files obtained
from the CodeGradX infrastructure.

Some features of the underlying library `codegradxlib` cannot be
operated through `codegradxagent`. The most prominent one is probably
the history of the user: its past jobs, batches and exercises.

New features such as sending a whole directory as an exercise, checking
the manifest `fw4ex.xml` could be added.
