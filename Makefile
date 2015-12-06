work : nothing 
clean :: cleanMakefile

tests : spec/oefgc.tgz
	-rm .fw4ex.json [0-9]*ml
	jasmine

spec/oefgc.tgz :
	cp -p ../CodeGradXlib/spec/oefgc.tgz spec/


# end of Makefile
