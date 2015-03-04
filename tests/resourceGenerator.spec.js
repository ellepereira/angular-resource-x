'use strict';

describe('ResourceGenerator', function () {

  var mockRole = {
    selectedRole : {'slug':'test-role', 'url': 'http://api.com/member/36'},
    person : {'url': 'http://api.com/member/36/'}
  };

  var mockCars = [
    {
      "id": 1,
      "url": "http://api.com/cars/1",
      "active" : true,
      "name": "Bentley",
      "color": "blue",
      "fuel": 1,
      "fuelMax": 10
    },
    {
      "id": 2,
      "url": "http://api.com/cars/2",
      "active" : true,
      "name": "Prius",
      "color": "white",
      "fuel": 9,
      "fuelMax": 10
    },
    {
      "id": 3,
      "url": "http://api.com/cars/3",
      "active" : true,
      "name": "Focus",
      "color": "red",
      "fuel": 8,
      "fuelMax": 10
    },
    {
      "id": 4,
      "url": "http://api.com/cars/4",
      "active" : true,
      "name": "Charger",
      "color": "yellow",
      "fuel": 5,
      "fuelMax": 10
    }];

  beforeEach(module('resourceGenerator', function($provide, $injector, ResourceGeneratorProvider){

    $provide.value('Roles', mockRole);

    ResourceGeneratorProvider.defaults.params = function(Roles){
      return {'user_role': Roles.selectedRole.slug};
    }
  }));

  // instantiate service
  var Cars,
    ResourceGenerator,
    $httpBackend,
    $rootScope,
    $q;

  beforeEach(inject(function (_$httpBackend_, _ResourceGenerator_, _$q_, _$rootScope_) {

    $httpBackend = _$httpBackend_;
    ResourceGenerator = _ResourceGenerator_;
    $q = _$q_;
    $rootScope = _$rootScope_;

    $httpBackend.whenGET(/cars\/[0-9]/).respond(mockCars[1]);
    $httpBackend.whenGET(/cars/).respond(mockCars);

    Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
      {
        'name': 'owners',
        'endpoint': 'owners/:id/',
        'params' : {'id':'@id'},
        'link': {'car': 'id'}
      }
    ]);

  }));

  afterEach(inject(function($rootScope){
    $rootScope.$apply();
  }));

  it('should initialize correctly', function () {
    expect(Cars).toBeDefined();
  });

  it('Can get list of ResourceGenerator instances using query', function () {
    var cars = Cars.query();
    $httpBackend.expectGET(/cars/);
    $httpBackend.flush();
    expect(cars.length).toBe(4);
    expect(cars[0].url).toBe("http://api.com/cars/1");
  });

  it('Each fetched ResourceGenerator result is an instance of ResourceGenerator', function () {
    var cars = Cars.query();
    $httpBackend.expectGET(/cars/);
    $httpBackend.flush();
    expect(cars.length).toBe(4);
    expect(cars[0].$owners).toBeDefined();
  });

  it('Can get a single instance of ResourceGenerator using GET', function () {
    var cars = Cars.get({'id':'2'});
    $httpBackend.flush();
    expect(cars.url).toBe("http://api.com/cars/2");
  });

  it('the retrieved element will have the configured subresources', function () {
    var cars = Cars.get({'id':'2'});
    $httpBackend.flush();
    expect(cars.$owners).toBeDefined();
  });


  it('Can create a new ResourceGenerator', function () {
    var loc = new Cars;
    loc.product_name = "Test";
    loc.$save();
    $httpBackend.expectPOST(/cars/, {product_name : 'Test'}).respond(200);
    $httpBackend.flush();

    expect(loc.product_name).toBe('Test');

  });

  it('Can modify an instance ResourceGenerator', function () {

    var car = Cars.get({'id':'2'});
    $httpBackend.flush();

    car.name = 'Patchy';
    $httpBackend.expectPATCH(/cars\/2/).respond(200);
    car.$update();
    $httpBackend.flush();

    expect(car.name).toBe('Patchy');

  });

  it('Can extend ResourceGenerator', function(){
    Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
      {
        'name': 'other_regions',
        'endpoint': 'cars/:id/',
        'params' : {'id':'@id'}
      }
    ]).extend('test', function(){
      return 'rest result';
    });

    expect(Cars.test).toBeDefined();
    expect(Cars.test()).toBe('rest result');

  });

  it('Extended methods go into instances of and ResourceGenerator itself', function(){

    Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
      {
        'name': 'other_regions',
        'endpoint': 'cars/:id/',
        'params' : {'id':'@id'}
      }
    ])
      .extend('test', function(){
        return 'rest result';
      })
      .extend('testOwner', function(){
        return this.id;
      });

    var instanceCar = new Cars({'id':1});

    expect(instanceCar.test).toBeDefined();
    expect(instanceCar.testOwner()).toBe(1);

  });

  it('Static methods go into ResourceGenerator', function(){

    Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
      {
        'name': 'other_regions',
        'endpoint': 'cars/:id/',
        'params' : {'id':'@id'}
      }
    ])
      .static('test', function(){
        return 'rest result';
      });

    var instanceCar = new Cars({'id':1});

    expect(Cars.test).toBeDefined();
    expect(instanceCar.test).toBeUndefined();

  });

  it('Instance methods go into ResourceGenerator instances, not the generator', function(){

    Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
      {
        'name': 'other_regions',
        'endpoint': 'cars/:id/',
        'params' : {'id':'@id'}
      }
    ])
      .method('test', function(){
        return this.$$url;
      });

    var instanceCar = new Cars({'id':1});

    $httpBackend.expect('OPTIONS', /cars/).respond(200);
    Cars.options();

    expect(Cars.test).toBeUndefined();
    expect(instanceCar.test).toBeDefined();

  });

  it('by default, getWithChildren is a method', function(){

    Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
      {
        'name': 'other_regions',
        'endpoint': 'cars/:id/',
        'params' : {'id':'@id'}
      }
    ]);

    var instanceCar = new Cars({'id':1});

    expect(instanceCar.getWithChildren).toBeDefined();
    expect(Cars.getWithChildren).toBeUndefined();

  });

  it('Can be configured to have dynamic parameters', function(){
    var cars = Cars.query();
    $httpBackend.expectGET(/user_role=test-role/);
    $httpBackend.flush();
  });

  it('Can pass a function for params', function(){

    var params = function funcParams(){
      return {'id':'@id'};
    };

    Cars = ResourceGenerator('cars/:id/', params);
    var cars = Cars.query();
    $httpBackend.flush();
    cars[0].name = 'new prius';
    $httpBackend.expectPATCH(/cars\/1/).respond(200);
    cars[0].$update();
    $httpBackend.flush();

  })

});
