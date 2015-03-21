'use strict';

//phantomjs doesn't support bind in versions below 2 :(
/*Function.prototype.bind = Function.prototype.bind || function (thisp) {
  var fn = this;
  return function () {
    return fn.apply(thisp, arguments);
  };
};*/

describe('_resource', function () {

  var mockRole = {
    selectedRole : {'slug':'test-role', 'url': 'http://api.com/member/36'},
    person : {'url': 'http://api.com/member/36/'}
  };

  var mockCars,
    mockOwners;

  beforeEach(module('_resource.mocks.Cars'));
  beforeEach(module('_resource.mocks.Owners'));


  beforeEach(module('resourceExtend', function($provide, $injector, _resourceProvider){

    $provide.value('Roles', mockRole);

    _resourceProvider.defaults.params = function(Roles){
      return {'user_role': Roles.selectedRole.slug};
    }
  }));

  // instantiate service
  var Cars,
    _resource,
    $httpBackend,
    $rootScope,
    $q;

  beforeEach(inject(function (_$httpBackend_, __resource_, _$q_, _$rootScope_) {

    $httpBackend = _$httpBackend_;
    _resource = __resource_;
    $q = _$q_;
    $rootScope = _$rootScope_;

    $httpBackend.whenGET(/cars\/[0-9]/).respond(mockCars[1]);
    $httpBackend.whenGET(/cars/).respond(mockCars);
    $httpBackend.whenGET(/owners/).respond(mockOwners);

    Cars = _resource('cars/:id/', {'id':'@id'})
      .child('owners', _resource('owners/:id/', {'id':'@id', 'car_id':'^id'}));
  }));

  afterEach(inject(function($rootScope){
    $rootScope.$apply();
  }));

  it('should initialize correctly', function () {
    expect(Cars).toBeDefined();
  });

  it('Can get list of _resource instances using query', function () {
    var cars = Cars.query();
    $httpBackend.expectGET(/cars/);
    $httpBackend.flush();
    expect(cars.length).toBe(4);
    expect(cars[0].url).toBe("http://api.com/cars/1");
  });

  it('Each fetched _resource result is an instance of _resource', function () {
    var cars = Cars.query();
    $httpBackend.expectGET(/cars/);
    $httpBackend.flush();
    expect(cars.length).toBe(4);
    expect(cars[0].$children).toBeDefined();
  });

  it('Can get a single instance of _resource using GET', function () {
    var cars = Cars.get({'id':'2'});
    $httpBackend.flush();
    expect(cars.url).toBe("http://api.com/cars/2");
  });

  it('the retrieved element will have the configured nested resources', function () {
    var cars = Cars.get({'id':'2'});
    $httpBackend.flush();
    expect(cars.$children.owners).toBeDefined();
  });

  it('can retrieve nested resources with a mapped parameter to the parent', function () {
    var car = Cars.get({'id':'1'});
    $httpBackend.flush();
    $httpBackend.expectGET('owners?car_id=2').respond(200);
    car.$children.owners.query();
    $httpBackend.flush();
    expect(car.$children.owners).toBeDefined();
  });


  it('Can create a new _resource', function () {
    var car = new Cars;
    car.name = "Test";
    car.$save();
    $httpBackend.expectPOST('cars', {name : 'Test'}).respond(200);
    $httpBackend.flush();

    expect(car.name).toBe('Test');

  });

  it('Can modify an instance _resource', function () {

    var car = Cars.get({'id':'2'});
    $httpBackend.flush();

    car.name = 'Patchy';
    $httpBackend.expectPATCH(/cars\/2/).respond(200);
    car.$update();
    $httpBackend.flush();

    expect(car.name).toBe('Patchy');

  });

  it('Can extend _resource', function(){
    Cars = _resource('cars/:id/', {'id':'@id'}, [
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

  it('Extended methods go into instances of and _resource itself', function(){

    Cars = _resource('cars/:id/', {'id':'@id'}, [
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

  it('Static methods go into _resource', function(){

    Cars = _resource('cars/:id/', {'id':'@id'}, [
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

  it('Instance methods go into _resource instances, not the generator', function(){

    Cars = _resource('cars/:id/', {'id':'@id'}, [
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

    Cars = _resource('cars/:id/', {'id':'@id'});

    var instanceCar = new Cars({'id':1});

    expect(instanceCar.getWithChildren).toBeDefined();
    expect(Cars.getWithChildren).toBeUndefined();

  });


});
