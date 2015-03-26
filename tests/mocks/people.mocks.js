'use strict';

angular.
  module('resourceMocks.people', [])
  .value('People', [
    {
      'id': 1,
      'url': 'http://api.com/people/1',
      'name': 'John Carver',
      'jobTitle': 'manager',
      'department': 'http://api.com/departments/4'
    },
    {
      'id': 2,
      'url': 'http://api.com/people/2',
      'name': 'Jack Bauer',
      'jobTitle': 'Superhero',
      'department': 'http://api.com/departments/3'
    },
    {
      'id': 3,
      'url': 'http://api.com/people/3',
      'name': 'Jesus Riviera',
      'jobTitle': 'chief',
      'department': 'http://api.com/departments/2'
    },
    {
      'id': 4,
      'url': 'http://api.com/people/4',
      'name': 'Jack White',
      'jobTitle': 'star',
      'department': 'http://api.com/departments/1'
    }]);

