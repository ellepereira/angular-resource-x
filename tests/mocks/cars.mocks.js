'use strict';

angular.
  module('_resourceMocks.cars', [])
  .value('Cars', [
    {
      "id": 1,
      "url": "http://api.com/cars/1",
      "active": true,
      "name": "Bentley",
      "color": "blue",
      "fuel": 1,
      "fuelMax": 10
    },
    {
      "id": 2,
      "url": "http://api.com/cars/2",
      "active": true,
      "name": "Prius",
      "color": "white",
      "fuel": 9,
      "fuelMax": 10
    },
    {
      "id": 3,
      "url": "http://api.com/cars/3",
      "active": true,
      "name": "Focus",
      "color": "red",
      "fuel": 8,
      "fuelMax": 10
    },
    {
      "id": 4,
      "url": "http://api.com/cars/4",
      "active": true,
      "name": "Charger",
      "color": "yellow",
      "fuel": 5,
      "fuelMax": 10
    }]);

