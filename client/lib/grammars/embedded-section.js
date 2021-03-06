var Section = require('./../model/section');
var Fixture = require('./../fixtures/fixture');
var Step = require('./../model/step');
var CompositeGrammar = require('./composite-grammar');

class EmbeddedSection extends CompositeGrammar{
	constructor(metadata){
		super(metadata);

		this.type = 'embedded-section';

		this.fixture = new Fixture(metadata.fixture);
		if (!this.title)
		{
			this.title = this.fixture.title;
		}
	}

	buildStep(data){
		var step = new Step(data, [], this);

		var section = this.readRawData(data || {collections: []});

		this.writeSection(step, section);

		return step;
	}


	newStep(){
		var step = new Step({}, [], this);
		var section = new Section({steps: []}, this.fixture);
		this.writeSection(step, section);

		return step;
	}

	preview(step, loader){
		var section = this.readSection(step);
		return section.preview(loader.chromed(), step);
	}

	editor(step, loader){
		var section = this.readSection(step);
		return section.editor(loader.chromed(), step);
	}

	buildResults(step, loader){
		var section = this.readSection(step);
		return section.buildResults(loader.chromed(), step);
	}

	selectNext(location){
		return null;
	}

	selectPrevious(location){
		return null;

	}

	selectLast(step){
		var section = this.readSection(step);
		return section.selectLast(step);
	}

}

module.exports = EmbeddedSection;