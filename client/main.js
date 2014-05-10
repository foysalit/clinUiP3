var PatientsSubscription = Meteor.subscribe('patients');
Meteor.subscribe('reports');

var PatientsCollection = new Meteor.Collection('patients');
var ReportsCollection = new Meteor.Collection('reports');

//patients creation form template
Session.set('add_patient_form_errors', false);
Session.set('add_patient_form_show', false);

Template.add_patient_form.events({
	'click #add_patient': function (e) {
		e.preventDefault();
		var $form = $('#add_patient_form');
		Patients.createFormSubmitted($form);
	},
	'click .close-modal': function () {
		var $form = $('#add_patient_form');
		Patients.closeCreateForm($form);
	}
});

Template.add_patient_form.errors = function () {
	return Session.get('add_patient_form_errors');
};

Template.add_patient_form.show = function () {
	return Session.get('add_patient_form_show');
};


//patients report creation form template
Session.set('add_report_form_patient', false);
Session.set('add_report_form_errors', null);

Template.add_report_form.patient = function () {
	return Session.get('add_report_form_patient');
};

Template.add_report_form.reports = function () {
	var patient = Session.get('add_report_form_patient'),
		filter = Session.get('reports_filter'),
		reports = Reports.getByPatient(patient._id, filter);

	return reports;
};

Template.add_report_form.errors = function () {
	return Session.get('add_report_form_errors');
};

Template.add_report_form.events({
	'click #add_patient_report': function (e) {
		e.preventDefault();
		var $reportField = $('#report[type="text"]');

		Reports.createFieldSubmitted($reportField);
	},
	'keyup #report[type="text"]': function (e) {
		if(e.which === 13){
			e.preventDefault();
			var $reportField = $('#report[type="text"]');

			Reports.createFieldSubmitted($reportField);
		}
	},
	'click .remove-report': function (e) {
		e.preventDefault();
		
		var report = $(e.target).closest('.remove-report').data('id');
		Reports.remove(report);
	},
	'keyup #reports_filter': function (e) {
		var filter = $(e.currentTarget).val();

		Session.set('reports_filter', filter);
	}
});

//patients list template
Template.patients_list.patients = function () {
	if(Session.get('reload_patients_table')){
		Session.set('reload_patients_table', false);
		return Patients.getAll();
	}

	return Patients.getAll();
};

Template.patients_list.events({
	'click .add-patient-report': function (e) {
		e.preventDefault();
		var patientId = $(e.target).closest('.add-patient-report').data('id'),
			patient = Patients.getOne(patientId);

		Reports.showTable(patient);
	},
	'click .list-group-item': function (e) {
		var patientId = $(e.currentTarget).data('id'),
			patient = Patients.getOne(patientId);

		Reports.showTable(patient);
	},
	'click .remove-patient': function (e) {
		e.preventDefault();
		
		var patient = $(e.target).closest('.remove-patient').data('id');
		Patients.remove(patient);
	},
	'click #show_add_patient_form': function (e) {
		e.preventDefault();
		Session.set('add_patient_form_show', true);
	}
});

//gender graph
Meteor.autorun(function () {
	if(PatientsSubscription.ready()){
		Patients.drawChart();
	}
});

Template.gender_chart.maleCount = function () {
	return Patients.countByGender('male');
};

Template.gender_chart.femaleCount = function () {
	return Patients.countByGender('female');
};

var Utilities = {
	getValueFromForm: function (formData, field) {
		//if there's no form data passed as array of objects,
		//or field name isn't passed we don't go further
		if(formData.length <= 0 || field.length <= 0) return false;

		var fieldData = _.findWhere(formData, {name: field});

		if(typeof fieldData !== 'undefined') return fieldData.value;
		return false;
	},
	strMatcher: function(strs) {
		return function findMatches(q, cb) {
			var matches, substringRegex;
			 
			// an array that will be populated with substring matches
			matches = [];
			 
			// regex used to determine if a string contains the substring `q`
			substrRegex = new RegExp(q, 'i');
			 
			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
				if (substrRegex.test(str)) {
					// the typeahead jQuery plugin expects suggestions to a
					// JavaScript object, refer to typeahead docs for more info
					matches.push({ value: str });
				}
			});
			 
			cb(matches);
		};
	}
}

var Patients = {
	collection: PatientsCollection,
	filters: {},

	getAll: function () {
		return this.collection.find(this.filters).fetch();
	},

	setFilter: function (filter) {
		_.extend(this.filters, filter);
		this.reloadList();	
	},

	getOne: function (id) {
		return this.collection.findOne({_id: id});	
	},

	countByGender: function (gender) {
		return this.collection.find({gender: gender}).count();
	},

	reloadList: function () {
		Session.set('reload_patients_table', true);	
	},

	add: function (id, name, gender) {
		var validation = this.validate(id, name, gender);

		if(validation.length <= 0){
			this.collection.insert({name: name, id: id, gender: gender});
			this.drawChart();
			return true;
		}else{
			return {errors : validation};
		}
	},

	createFormSubmitted: function ($form) {
		var formData = $form.serializeArray();

		var id = parseInt(Utilities.getValueFromForm(formData, 'id')),
			gender = Utilities.getValueFromForm(formData, 'gender'),
			name = Utilities.getValueFromForm(formData, 'name');

		var addPatient = this.add(id, name, gender);

		if(addPatient === true){
			this.closeCreateForm($form);
		}else{
			Session.set('add_patient_form_errors', addPatient.errors);
		}
	},

	closeCreateForm: function ($form) {
		$form[0].reset();
		Session.set('add_patient_form_show', false);
	},
	
	validate: function (id, name, gender) {
		var results = [];

		if(parseInt(id) <= 0){
			results.push({
				field: 'id',
				message: 'id must be an integer bigger than 0'
			});
		}

		if(name.length <= 0){
			results.push({
				field: 'name',
				message: 'a name must be provided'
			});
		}

		if(gender.length <= 0){
			results.push({
				field: 'gender',
				message: 'a gender must be provided'
			});
		}

		return results;
	},

	remove: function (id) {
		this.collection.remove({_id: id});	
		this.drawChart();
	},

	drawChart: function () {
		var self = this,
			$el = $('#gender_chart'),
			male = this.countByGender('male'),
			female = this.countByGender('female');

		var chart = new CanvasJS.Chart("gender_chart", {
			title:{
				text: "Male/Female Patients"
			},
			data: [{
				type: "pie",
				click: function(e){
					alert( "The number of Patients that are "+ e.dataPoint.legendText+ " is "+ e.dataPoint.y + " " );
					console.log( "Lets go get the "+ e.dataPoint.legendText+ " patients in the PatientTable" );
					self.setFilter({gender: e.dataPoint.legendText});
				},
				showInLegend: true,
				dataPoints: [
					{ y: male, legendText:"male", indexLabel: "Male Patients" },
					{ y: female, legendText:"female" , indexLabel: "Female Patients"}
				]
			}]
		});

		chart.render();
	}
};

var Reports = {
	collection: ReportsCollection,

	getByPatient: function (patientId, filter) {
		var query = {patient: patientId};

		if(filter && filter.length > 0)
			query.content = {$regex: filter, $options: "i"};

		return this.collection.find(query).fetch();
	},

	add: function (report, patient) {
		var validation = this.validate(report, patient);

		if(validation.length <= 0){
			this.collection.insert({patient: patient._id, content: report});
			return true;
		}else{
			return {errors: validation};
		}
	},

	//takes care of the report form handling,
	//adds a new report when submitted
	createFieldSubmitted: function ($field) {
		var report = $field.val(),
			patient = Session.get('add_report_form_patient'),
			addReport = this.add(report, patient);

		if(addReport === true){
			Session.set('add_report_form_errors', null);
			$field.val('');
		}else{
			Session.set('add_report_form_errors', addReport.errors);
		}
	},

	createFieldSuggestions: function () {
		return [
			'test 1',
			'test 2', 
			'test 3'
		];	
	},

	createFieldTypeahead: function () {
		var source = this.createFieldSuggestions(),
			$field = $('#report[type="text"]');

		if($field.closest('.twitter-typeahead').length <= 0){
			$field.typeahead({
				minLength: 1,
		        highlight: true,
		        hint: false
			}, {
				name: 'reports',
				source: Utilities.strMatcher(source)
			});
		}
	},

	showTable: function (patient) {
		var self = this;
		Session.set('add_report_form_patient', patient);
		Session.set('reports_filter', null);

		Meteor.setTimeout(function () {
			self.createFieldTypeahead();
		}, 500);
	},

	validate: function (report, patient) {
		var results = [];

		if(report.length <= 0){
			results.push({
				field: 'report',
				message: 'a report must be provided'
			});
		}

		if(typeof patient._id == 'undefined' || patient._id.length <= 0){
			results.push({
				field: 'patientId',
				message: 'Patient id is invalid'
			});
		}

		return results;
	},

	remove: function (id) {
		this.collection.remove({_id: id});	
	}
};
