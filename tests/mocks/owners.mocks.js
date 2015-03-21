'use strict';

angular.
  module('_resourceMocks.owners', [])
  .value('Owners', [
    {
      "id": 1,
      "url": "http://api.com/people/1",
      "first_name": "John",
      "last_name": "Oliver",
      "car_id": 1
    },
    {
      "id": 2,
      "url": "http://api.com/people/2",
      "first_name": "Martha",
      "last_name": "Stewart",
      "car_id": 1
    },
    {
      "id": 3,
      "url": "http://api.com/people/3",
      "first_name": "Jason",
      "last_name": "Vorhees",
      "car_id": 1
    }]);

