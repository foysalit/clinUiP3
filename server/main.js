var Patients = new Meteor.Collection('patients');
var Reports = new Meteor.Collection('reports');

var allowAll = {
	insert: function (userId, doc) {
		// implement user permission later on
		return true;
	},
	update: function (userId, doc, fields, modifier) {
		// implement user permission later on
		return true;
	},
	remove: function (userId, doc) {
		// implement user permission later on
		return true;
	}
};

Patients.allow(allowAll);
Reports.allow(allowAll);

Meteor.publish('patients', function () {
	return Patients.find();
});

Meteor.publish('reports', function () {
	return Reports.find();
});