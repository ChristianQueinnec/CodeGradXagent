# CodeGradXagent

work : lint tests README.pdf
clean :
	-rm -f .fw4ex.json [0-9]*ml

# ############## Working rules:

lint :
	jshint codegradxagent.js spec/*.js

tests : clean spec/oefgc.tgz
#	./codegradxagent.js -h
	-rm .fw4ex.json [0-9]*ml
	jasmine

test-all : 
	cp -p ../CodeGradXlib/codegradxlib.js \
	   node_modules/codegradxlib/
	cd ../CodeGradXlib/ && m tests
	cd ../CodeGradXagent/ && m tests

spec/oefgc.tgz :
	cp -p ../CodeGradXlib/spec/oefgc.tgz spec/

# ############## NPM package
# Caution: npm takes the whole directory that is . and not the sole
# content of CodeGradXagent.tgz 

publish : clean README.pdf
	git status .
	-git commit -m "NPM publication `date`" .
	git push
	-rm -f CodeGradXagent.tgz
	m CodeGradXagent.tgz install
	cd tmp/CodeGradXagent/ && npm version patch && npm publish
	cp -pf tmp/CodeGradXagent/package.json .
	rm -rf tmp

CodeGradXagent.tgz : clean
	-rm -rf tmp
	mkdir -p tmp
	cd tmp/ && git clone https://github.com/ChristianQueinnec/CodeGradXagent.git
	rm -rf tmp/CodeGradXagent/.git
	cp -p package.json tmp/CodeGradXagent/ 
	tar czf CodeGradXagent.tgz -C tmp CodeGradXagent
	tar tzf CodeGradXagent.tgz

REMOTE	=	www.paracamplus.com
install : CodeGradXagent.tgz
	rsync -avu CodeGradXagent.tgz \
		${REMOTE}:/var/www/www.paracamplus.com/Resources/Javascript/

# ############## Various experiments (not all finished)

README.tex : README.md
	pandoc -o README.tex -f markdown README.md 
README.pdf : README.md
	pandoc -o README.pdf -f markdown README.md 

# end of Makefile
