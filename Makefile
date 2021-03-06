# CodeGradXagent

work : lint tests 
clean :
	-rm -f .fw4ex.json [0-9]*ml

# ############## Working rules:

lint :
	eslint codegradxagent.js

tests : clean lint spec/oefgc.tgz spec/org.example.fw4ex.bad.check.tgz
#	./codegradxagent.js -h
	-rm .fw4ex.json [0-9]*ml
	@echo " tests require a running vmauthor..."
	ping -c 3 xvmauthor.codegradx.org
	export NODE_TLS_REJECT_UNAUTHORIZED=0 ;\
	jasmine

update :
	-rm -rf node_modules
	npm install codegradxlib@`jq -r .version < ../CodeGradXlib/package.json`
	npm install

refresh :
	cp -p ../CodeGradXlib/codegradxlib.js \
	   node_modules/codegradxlib/

test-all : 
	cd ../CodeGradXlib/ && m tests
	cd ../CodeGradXagent/ && m tests

spec/oefgc.tgz :
	cp -p ../CodeGradXlib/spec/oefgc.tgz spec/
spec/org.example.fw4ex.bad.check.tgz :
	cd spec; tar czf org.example.fw4ex.bad.check.tgz \
		-C org.example.fw4ex.bad.check .

# ############## NPM package
# Caution: npm takes the whole directory that is . and not the sole
# content of CodeGradXagent.tgz 

publish : lint clean
	-rm -rf node_modules/codegradx*
	npm install codegradxlib@`jq -r .version < ../CodeGradXlib/package.json`
	git status .
	-git commit -m "NPM publication `date`" .
	git push
	-rm -f CodeGradXagent.tgz
	m CodeGradXagent.tgz install
	cd tmp/CodeGradXagent/ && npm version patch && npm publish
	cp -pf tmp/CodeGradXagent/package.json .
	rm -rf tmp
	npm install -g codegradxagent@`jq -r .version < package.json`
	m propagate

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

propagate :
	cd ../CodeGradXvmauthor ; npm install -S codegradxagent

# ############## Various experiments (not all finished)

README.tex : README.md
	pandoc -o README.tex -f markdown README.md 
README.pdf : README.md
	pandoc -o README.pdf -f markdown README.md 

# end of Makefile
