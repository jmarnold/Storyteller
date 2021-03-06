var expect = require('chai').expect;

var Spec = require('./../lib/model/specification');
var Suite = require('./../lib/model/suite');
var _ = require('lodash');

describe('Spec', function(){
	describe('Initial Object', function(){
		var spec = new Spec({title: 'Foo', id: '123', lifecycle: 'Acceptance'}, {});

		it('grabs name', function(){
			expect(spec.title).to.equal('Foo');
		});

		it('grabs id', function(){
			expect(spec.id).to.equal('123');
		});

		it('grabs lifecycle', function(){
			expect(spec.lifecycle).to.equal('Acceptance');
		});

		it('uses none as the default state', function(){
			expect(spec.state).to.equal('none');
		});

	});

	it('uses acceptance as the default lifecycle', function(){
		var newSpec = new Spec({name: 'foo', id: 1});

		expect(newSpec.lifecycle).to.equal('Acceptance');
	});
});

describe('Suite', function(){
	var data = {
		name: 'Top',
		path: '',
		suites: [
			{
				name: 'Sentences',
				path: 'Sentences',
				suites: [
					{name: 'Facts', path: 'Sentences/Facts', specs: [
						{id: 1, title: 'True Facts', lifecycle: 'Acceptance'},
						{id: 2, title: 'False Facts', lifecycle: 'Acceptance'},
					]}


				],
				specs: [
					{title: 'Simple 1', id: 3},
					{title: 'Simple 2', id: 4},
				]
			},
			{
				name: 'Tables',
				path: 'Tables',
				specs: [
					{title: 'Table 1', id: 5, lifecycle: 'regression'},
					{title: 'Table 2', id: 6, lifecycle: 'regression'},
				]
			}


		]

	}

	var suite = new Suite(data);

	it('knows its height', () => {
		expect(suite.height()).to.equal(10);

		expect(suite.suites[0].height()).to.equal(6);
		expect(suite.suites[0].suites[0].height()).to.equal(3);
		expect(suite.suites[1].height()).to.equal(3);
	});

	it('adds itself as the parent to all specs', () => {
		suite.suites[0].specs.forEach(s => {
			expect(s.suite).to.equal(suite.suites[0]);
		});
	});

	it('can add a top level child suite', () => {
		var s = new Suite(data);
		s.addChildSuite('foo');

		var child = s.childSuite('foo');

		expect(child).to.not.be.null;
		expect(child.path).to.equal('foo');
		expect(child.name).to.equal('foo');
	});

	it('can add a child suite to a child suite', () => {
		var s = new Suite(data);
		var child = s.childSuite('Sentences');

		child.addChildSuite('Methods');

		var grandchild = child.childSuite('Methods');

		expect(grandchild.path).to.equal('Sentences/Methods');
		expect(grandchild.name).to.equal('Methods');

	});

	it('can tell you if it has a spec positive', () => {
		expect(suite.suites[0].suites[0].hasSpec(1)).to.be.true;
	});

	it('can tell you if it has a spec negative', () => {
		expect(suite.hasSpec('non existent')).to.be.false;
	});

	// was a bug where Suite was double dipping its spec summary
	it('can summarize for a single suite', function(){
		var child = suite.childSuite('Sentences');
		var summary = child.summary();

		expect(summary).to.deep.equal({
			acceptance: 4,
			failed: 0,
			none: 4,
			regression: 0,
			success: 0,
			total: 4
		});
	});

	it('can get the id list of all the underlying specs', function(){
		expect(suite.allSpecIds()).to.deep.equal([3, 4, 1, 2, 5, 6]);
	});

	it('gets the name and path', function(){
		expect(suite.name).to.equal('Top');
		expect(suite.path).to.equal('');
	});

	it('builds child suites', function(){
		expect(suite.suites[0].name).to.equal('Sentences');
		expect(suite.suites[1].name).to.equal('Tables');
	});

	it('sets the parent on immediate child suites', function(){
		expect(suite.suites[0].parent).to.equal(suite);
		expect(suite.suites[1].parent).to.equal(suite);
	});

	it('builds grandchildren suites too', function(){
		expect(suite.suites[0].suites[0].name).to.equal('Facts');
	});

	it('builds specs underneath child suite', function(){
		expect(suite.suites[0].specs[0].title).to.equal('Simple 1');
		expect(suite.suites[0].specs[1].title).to.equal('Simple 2');
	});

	it('sets itself as the suite to a new spec', () => {
		var spec = {};
		suite.addSpec(spec);

		expect(spec.suite).to.equal(suite);
	});

	describe('when replacing a spec', () => {
		var suite = null;
		var oldSpec = null;

		beforeEach(() => {
			oldSpec = {title: 'Simple 1', id: 3};

			var data = {
				name: 'Top',
				path: '',
				specs: [
					oldSpec,
					{title: 'Simple 2', id: 4},
				]
			}

			suite = new Suite(data);
		});

	
		it('can replace a spec', () => {
			var newSpec = {id: 3};


			suite.replaceSpec(newSpec);


			expect(suite.hasSpec(3)).to.be.true;

			expect(newSpec.suite).to.equal(suite);

			expect(_.contains(suite.allSpecs(), oldSpec)).to.be.false;
			expect(_.contains(suite.allSpecs(), newSpec)).to.be.true;
		});
	});
});



describe('Suite filtering', function(){
	it('can filter the specs', function(){
		var data = {
			name: 'Facts',
			path: 'Facts',
			specs: [
				{name: 'Good Facts', id: 1},
				{name: 'Bad Facts', id: 2},
				{name: 'Weird Facts', id: 3},
				{name: 'Odd Facts', id: 4},
			]
		};

		var suite = new Suite(data);

		var filtered = suite.filter(function(x){
			return x.id > 2;
		});

		expect(filtered).to.not.equal(suite);
		expect(filtered.name).to.equal(suite.name);
		expect(filtered.path).to.equal(suite.path);

		var ids = _.map(filtered.specs, function(x){
			return x.id;
		});

		expect(ids).to.deep.equal([3, 4]);
	});

	it('can filter child suites', function(){
		
		var data = {
			name: 'Facts',
			path: 'Facts',
			suites: [

				{name: 'True', path: 'Facts/True', specs: [
					{title: 'Good Facts', id: 1},
					{title: 'Bad Facts', id: 2},
					{title: 'Weird Facts', id: 3},
					{title: 'Odd Facts', id: 4}
				]},

				{
					name: 'False', path: 'False',
					specs: [
						{title: 'Good Facts', id: 5},
						{title: 'Bad Facts', id: 6},
						{title: 'Weird Facts', id: 7},
						{title: 'Odd Facts', id: 8}
					]
				}
			]

		};

		var suite = new Suite(data);

		var filtered = suite.filter(function(x){
			return x.id < 3;
		});

		expect(filtered.suites.length).to.equal(1);
		expect(filtered.suites[0].name).to.equal('True');

		expect(filtered.suites[0].specs.length).to.equal(2);
		expect(filtered.suites[0].specs[0].title).to.equal('Good Facts');
		expect(filtered.suites[0].specs[1].title).to.equal('Bad Facts');
		
	});

	describe('Can determine its icon', () => {
		var suite = null;

		beforeEach(() => {
			suite = new Suite({name: 'Facts', path: 'Facts'});
		});

		it('has none for no specs', () => {
			expect(suite.icon()).to.equal('none');
		});

		it('has none if no successful, none running, no failures', () => {
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'none'});

			expect(suite.icon()).to.equal('none');
		});

		it('has failed if any failures but no running', () => {
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'success'});
			suite.specs.push({status: () => 'failed'});

			expect(suite.icon()).to.equal('failed');
		});

		it('has success if any successful, none running, no failures', () => {
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'success'});

			expect(suite.icon()).to.equal('success');
		});

		it('uses the running spec icon if one exists', () => {
			var running = {
				status: () => 'running',
				icon: () => 'running'
			};

			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'none'});
			suite.specs.push({status: () => 'success'});
			suite.specs.push({status: () => 'failed'});
			suite.specs.push(running);


			expect(suite.icon()).to.equal('running');

			running.icon = () => 'running-success';
			expect(suite.icon()).to.equal('running-success');
		});
	});
});

