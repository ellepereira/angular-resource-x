'use strict';

angular.
  module('_resourceMocks.departments', [])
  .value('Departments', [
    {
      'id': 1,
      'url': 'http://api.com/departments/1',
      'name': 'Sales',
      'profits': 9002,
      'manager': 'http://api.com/people/4'
    },
    {
      'id': 2,
      'url': 'http://api.com/departments/2',
      'name': 'Accounting',
      'profits': 1000,
      'manager': 'http://api.com/people/3'
    },
    {
      'id': 3,
      'url': 'http://api.com/departments/3',
      'name': 'IT',
      'profits': 10000,
      'manager': 'http://api.com/people/2'
    },
    {
      'id': 4,
      'url': 'http://api.com/departments/4',
      'name': 'Warehouse',
      'profits': 3000,
      'manager': 'http://api.com/people/1'
    }]);

