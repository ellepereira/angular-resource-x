'use strict';

describe('$resourceX', function () {

  //port over tests from ngResource
  describe('$resource tests', resourceTests);
  //test different configuration options
  describe('Configurations', configurationsTests);
  //test nesting resources
  describe('Nesting Resources', nestingTests);
  //test methods and extending
  describe('Methods, Statics and Extensions', methodsTests);
  //anything else/edge cases here
  //describe('Edge cases', function(){});

  ///////////////////////////////////////////
  //// shared variables
  var Departments,
    $resourceX,
    resourceXProvider,
    $httpBackend,
    mocks = {};

  ///////////////////////////////////////////
  //// mocks
  beforeEach(module('resourceMocks.people'));
  beforeEach(module('resourceMocks.departments'));

  ///////////////////////////////////////////
  //// initializations

  // does all other initializations, default
  function initAllDefault() {
    beforeEach(initResourceXWithRoles);
    beforeEach(initGlobalsDefault);
    beforeEach(initDepartmentWithChild);
    afterAll(resetGlobalsDefault);
  }

  //module inits
  function initResourceXWithRoles() {
    module('ngResourceX', function ($provide, $resourceXProvider) {

      $provide.value('Roles', {
        selectedRole: {'slug': 'test-role', 'url': 'http://api.com/member/36'},
        person: {'url': 'http://api.com/member/36/'}
      });

      $resourceXProvider.defaults.params = function (Roles) {
        return {'user_role': Roles.selectedRole.slug};
      };

      resourceXProvider = $resourceXProvider;

    })
  }

  //resource inits
  function initDepartmentWithChild() {
    Departments = $resourceX('departments/:id/', {'id': '@id'})
      .child('employees', $resourceX('people/:id/', {'id': '@id', 'department': '^id'}));
  }

  //init our globals
  function initGlobalsDefault() {
    inject(function (_$httpBackend_, _$resourceX_, _People_, _Departments_) {
      $httpBackend = _$httpBackend_;
      $resourceX = _$resourceX_;
      mocks.departments = _Departments_;
      mocks.people = _People_;
    })
  }

  //reset our globals
  function resetGlobalsDefault() {
    Departments = null;
    $resourceX = null;
    $httpBackend = null;
    mocks = {};
  }

  ///////////////////////////////////////////
  //// tests
  function configurationsTests() {

    initAllDefault();

    it('should initialize correctly', function () {
      expect(Departments).toBeDefined();
    });

    it('should have default params', function () {
      expect(resourceXProvider.defaults).toBeDefined();
    });

    it('should have set baseURL default param', function () {
      expect(resourceXProvider.defaults).toBeDefined();
    });

    it('should have set user_role as a default request param', function () {
      expect(resourceXProvider.defaults).toBeDefined();
    });

  }

  function nestingTests() {

    initAllDefault();

    it('the retrieved element will have the configured nested resources', function () {
      var departments = Departments.get({'id': '2'});
      $httpBackend.expectGET(/departments\/2/).respond(mocks.departments[1]);
      $httpBackend.flush();
      expect(departments.$children['employees']).toBeDefined();
    });

    it('can retrieve nested resources with a mapped parameter to the parent', function () {

      var department = Departments.get({'id': '1'});
      $httpBackend.expectGET(/departments\/1/).respond(mocks.departments[0]);
      $httpBackend.flush();
      $httpBackend.expectGET('people?department=1').respond(200);
      department.$children['employees'].query();
      $httpBackend.flush();
      expect(department.$children['employees']).toBeDefined();
    });

  }

  function methodsTests() {

    initAllDefault();

    it('by default, getWithChildren is a static', function () {
      Departments = $resourceX('departments/:id/', {'id': '@id'});
      var instanceCar = new Departments({'id': 1});
      expect(Departments.getWithChildren).toBeDefined();
      expect(instanceCar.getWithChildren).toBeUndefined();
    });

    it('Can extend $resourceX', function () {
      Departments = $resourceX('departments/:id/', {'id': '@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params': {'id': '@id'}
        }
      ]).extend('test', function () {
        return 'rest result';
      });

      expect(Departments.test).toBeDefined();
      expect(Departments.test()).toBe('rest result');

    });

    it('Extended methods go into instances of and $resourceX itself', function () {

      Departments = $resourceX('departments/:id/', {'id': '@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params': {'id': '@id'}
        }
      ])
        .extend('test', function () {
          return 'rest result';
        })
        .extend('testOwner', function () {
          return this.id;
        });

      var instanceCar = new Departments({'id': 1});

      expect(instanceCar.test).toBeDefined();
      expect(instanceCar.testOwner()).toBe(1);

    });

    it('Static methods go into $resourceX', function () {

      Departments = $resourceX('departments/:id/', {'id': '@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params': {'id': '@id'}
        }
      ])
        .static('test', function () {
          return 'rest result';
        });

      var instanceCar = new Departments({'id': 1});

      expect(Departments.test).toBeDefined();
      expect(instanceCar.test).toBeUndefined();

    });

    it('Instance methods go into $resourceX instances, not the generator', function () {

      Departments = $resourceX('departments/:id/', {'id': '@id'}, [
        {
          'name': 'other_regions',
          'endpoint': 'departments/:id/',
          'params': {'id': '@id'}
        }
      ])
        .method('test', function () {
          return this.$$url;
        });

      var instanceCar = new Departments({'id': 1});

      $httpBackend.expect('OPTIONS', /departments/).respond(200);
      Departments.options();

      expect(Departments.test).toBeUndefined();
      expect(instanceCar.test).toBeDefined();

    });
  }

  function resourceTests() {

    initAllDefault();

    it('Can create a new $resourceX', function () {
      var department = new Departments;
      department.name = "Test";
      department.$save();
      $httpBackend.expectPOST('departments', {name: 'Test'}).respond(200);
      $httpBackend.flush();

      expect(department.name).toBe('Test');

    });

    it('Can modify an instance $resourceX', function () {

      var department = Departments.get({'id': '2'});
      $httpBackend.expectGET(/departments\/2/).respond(200).respond(mocks.departments[1]);
      $httpBackend.flush();

      department.name = 'Patchy';
      $httpBackend.expectPATCH(/departments\/2/).respond(200);
      department.$update();
      $httpBackend.flush();

      expect(department.name).toBe('Patchy');
    });

    it('Can get list of $resourceX instances using query', function () {
      var departments = Departments.query();
      $httpBackend.expectGET(/departments/).respond(mocks.departments);
      $httpBackend.flush();
      expect(departments.length).toBe(4);
      expect(departments[0].url).toBe("http://api.com/departments/1");
    });

    it('Each fetched $resourceX result is an instance of $resourceX', function () {
      var departments = Departments.query();
      $httpBackend.expectGET(/departments/).respond(mocks.departments);
      $httpBackend.flush();
      expect(departments.length).toBe(4);
      expect(departments[0].$children).toBeDefined();
    });

    it('Can get a single instance of $resourceX using GET', function () {
      var departments = Departments.get({'id': '2'});
      $httpBackend.expectGET(/departments\/2/).respond(mocks.departments[1]);
      $httpBackend.flush();
      expect(departments.url).toBe("http://api.com/departments/2");
    });
  }

});



