'use strict';

describe('_resource', function () {

  describe('$resource tests', resourceTests);
  describe('Configurations', configurationsTests);
  describe('Nesting Resources', nestingTests);
  describe('Methods, Statics and Extensions', methodsTests);
  //describe('Edge cases', function(){});

  ///////////////////////////////////////////
  //// shared variables
  var Departments,
    _resource,
    $httpBackend,
    mocks = {};

  ///////////////////////////////////////////
  //// mocks
  beforeEach(module('_resourceMocks.people'));
  beforeEach(module('_resourceMocks.departments'));
  
  ///////////////////////////////////////////
  //// different initializations
  function initDefault(){
    beforeEach(module('resourceX', function($provide, _resourceProvider) {

      $provide.value('Roles', {
        selectedRole: {'slug': 'test-role', 'url': 'http://api.com/member/36'},
        person: {'url': 'http://api.com/member/36/'}
      });

      _resourceProvider.defaults.params = function (Roles) {
        return {'user_role': Roles.selectedRole.slug};
      };

    }));

    beforeEach(inject(function (_$httpBackend_, __resource_, _People_, _Departments_) {

      $httpBackend = _$httpBackend_;
      _resource = __resource_;
      mocks.departments = _Departments_;
      mocks.people = _People_;

      Departments = _resource('departments/:id/', {'id': '@id'})
        .child('employees', _resource('people/:id/', {'id': '@id', 'department': '^id'}));
    }));

    afterAll(function(){
      Departments = null;
      _resource = null;
      $httpBackend = null;
      mocks = {};
    })
  }

  ///////////////////////////////////////////
  //// tests
  function configurationsTests(){

    initDefault();

    it('should initialize correctly', function () {
      expect(Departments).toBeDefined();
    });

  }

  function nestingTests(){

    initDefault();

    it('the retrieved element will have the configured nested resources', function () {
      var departments = Departments.get({'id':'2'});
      $httpBackend.expectGET(/departments\/2/).respond(mocks.departments[1]);
      $httpBackend.flush();
      expect(departments.$children['employees']).toBeDefined();
    });

    it('can retrieve nested resources with a mapped parameter to the parent', function () {

      var department = Departments.get({'id':'1'});
      $httpBackend.expectGET(/departments\/1/).respond(mocks.departments[0]);
      $httpBackend.flush();
      $httpBackend.expectGET('people?department=1').respond(200);
      department.$children['employees'].query();
      $httpBackend.flush();
      expect(department.$children['employees']).toBeDefined();
    });

  }

  function methodsTests(){

    initDefault();

    it('by default, getWithChildren is a static', function(){
      Departments = _resource('departments/:id/', {'id':'@id'});
      var instanceCar = new Departments({'id':1});
      expect(Departments.getWithChildren).toBeDefined();
      expect(instanceCar.getWithChildren).toBeUndefined();
    });

    it('Can extend _resource', function(){
      Departments = _resource('departments/:id/', {'id':'@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params' : {'id':'@id'}
        }
      ]).extend('test', function(){
        return 'rest result';
      });

      expect(Departments.test).toBeDefined();
      expect(Departments.test()).toBe('rest result');

    });

    it('Extended methods go into instances of and _resource itself', function(){

      Departments = _resource('departments/:id/', {'id':'@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params' : {'id':'@id'}
        }
      ])
        .extend('test', function(){
          return 'rest result';
        })
        .extend('testOwner', function(){
          return this.id;
        });

      var instanceCar = new Departments({'id':1});

      expect(instanceCar.test).toBeDefined();
      expect(instanceCar.testOwner()).toBe(1);

    });

    it('Static methods go into _resource', function(){

      Departments = _resource('departments/:id/', {'id':'@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params' : {'id':'@id'}
        }
      ])
        .static('test', function(){
          return 'rest result';
        });

      var instanceCar = new Departments({'id':1});

      expect(Departments.test).toBeDefined();
      expect(instanceCar.test).toBeUndefined();

    });

    it('Instance methods go into _resource instances, not the generator', function(){

      Departments = _resource('departments/:id/', {'id':'@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params' : {'id':'@id'}
        }
      ])
        .method('test', function(){
          return this.$$url;
        });

      var instanceCar = new Departments({'id':1});

      $httpBackend.expect('OPTIONS', /departments/).respond(200);
      Departments.options();

      expect(Departments.test).toBeUndefined();
      expect(instanceCar.test).toBeDefined();

    });
  }

  function resourceTests(){

    initDefault();

    it('Can create a new _resource', function () {
      var department = new Departments;
      department.name = "Test";
      department.$save();
      $httpBackend.expectPOST('departments', {name : 'Test'}).respond(200);
      $httpBackend.flush();

      expect(department.name).toBe('Test');

    });

    it('Can modify an instance _resource', function () {

      var department = Departments.get({'id':'2'});
      $httpBackend.expectGET(/departments\/2/).respond(200).respond(mocks.departments[1]);
      $httpBackend.flush();

      department.name = 'Patchy';
      $httpBackend.expectPATCH(/departments\/2/).respond(200);
      department.$update();
      $httpBackend.flush();

      expect(department.name).toBe('Patchy');
    });

    it('Can get list of _resource instances using query', function () {
      var departments = Departments.query();
      $httpBackend.expectGET(/departments/).respond(mocks.departments);
      $httpBackend.flush();
      expect(departments.length).toBe(4);
      expect(departments[0].url).toBe("http://api.com/departments/1");
    });

    it('Each fetched _resource result is an instance of _resource', function () {
      var departments = Departments.query();
      $httpBackend.expectGET(/departments/).respond(mocks.departments);
      $httpBackend.flush();
      expect(departments.length).toBe(4);
      expect(departments[0].$children).toBeDefined();
    });

    it('Can get a single instance of _resource using GET', function () {
      var departments = Departments.get({'id':'2'});
      $httpBackend.expectGET(/departments\/2/).respond(mocks.departments[1]);
      $httpBackend.flush();
      expect(departments.url).toBe("http://api.com/departments/2");
    });
  }

});



