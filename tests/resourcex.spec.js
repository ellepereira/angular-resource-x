'use strict';

describe('$resource_', function () {

  //port over tests from ngResource
  describe('$resource tests', resourceTests);
  //test different configuration options
  describe('Configurations', configurationsTests);
  //test nesting resources
  describe('Nesting Resources', nestingTests);
  //test methods and extending
  describe('Methods and Statics', methodsTests);
  //anything else/edge cases here
  //describe('Edge cases', function(){});

  ///////////////////////////////////////////
  //// shared variables
  var Departments,
    $resource_,
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
    module('ngResourceX', function ($provide, $resource_Provider) {

      $provide.value('Roles', {
        selectedRole: {'slug': 'test-role', 'url': 'http://api.com/member/36'},
        person: {'url': 'http://api.com/member/36/'}
      });

      $resource_Provider.defaults.params['user_role'] = 'test_role';
      $resource_Provider.defaults.methods = {
        'testMethod': angular.noop
      };
      $resource_Provider.defaults.extensions = {
        'testExtension': angular.noop
      };

      resourceXProvider = $resource_Provider;

    })
  }

  //resource inits
  function initDepartmentWithChild() {
    Departments = $resource_('departments/:id/', {'id': '@id'})
      //.relate('employees', $resource_('people/:id/', {'id': '@id', 'department': '^id'}));
      .relationships({
        'employees': $resource_('people/:id/', {'id': '@id', 'department': '^id'}),
        'computers': $resource_('computers/:id/', {'id':'@id', 'department':'^id'})
      });
  }

  //init our globals
  function initGlobalsDefault() {
    inject(function (_$httpBackend_, _$resource__, _People_, _Departments_) {
      $httpBackend = _$httpBackend_;
      $resource_ = _$resource__;
      mocks.departments = _Departments_;
      mocks.people = _People_;
    })
  }

  //reset our globals
  function resetGlobalsDefault() {
    Departments = null;
    $resource_ = null;
    $httpBackend = null;
    mocks = {};
  }

  ///////////////////////////////////////////
  //// tests
  function configurationsTests() {

    initAllDefault();

    it('should have all default params', function () {
      expect(resourceXProvider.defaults.baseUrl).toBeDefined();
      expect(resourceXProvider.defaults.relationPrefix).toBe('_');
      expect(resourceXProvider.defaults.statics).toBeDefined();
      //expect(resourceXProvider.defaults.statics.getFull).toBeDefined();
      expect(resourceXProvider.defaults.statics.relate).toBeDefined();
      expect(resourceXProvider.defaults.params).toBeDefined();
      expect(resourceXProvider.defaults.methods).toBeDefined();
    });

    it('should have set baseURL default param', function () {
      expect(resourceXProvider.defaults).toBeDefined();
    });

    it('should have set user_role as a default request param', function () {
      expect(resourceXProvider.defaults.params.user_role).toBeDefined();
      expect(resourceXProvider.defaults.params['user_role']).toBe('test_role');
    });

    it('new resources should have default statics', function(){
      var R = $resource_('test/api');
      expect(R.getFull).toBeDefined();
      expect(R.relate).toBeDefined();
      expect(R.relationships).toBeDefined();
    });

    it('new resources should have default methods', function(){
      var R = $resource_('test/api');
      var testR = new R();
      expect(testR.testMethod).toBeDefined();
    });


  }

  function nestingTests() {

    initAllDefault();

    it('the retrieved element will have the configured nested resources', function () {
      var departments = Departments.get({'id': '2'});
      $httpBackend.expectGET(/departments\/2/).respond(mocks.departments[1]);
      $httpBackend.flush();
      expect(departments.$relationships['employees']).toBeDefined();
    });

    it('can retrieve nested resources with a mapped parameter to the parent', function () {

      var department = Departments.get({'id': '1'});
      $httpBackend.expectGET(/departments\/1/).respond(mocks.departments[0]);
      $httpBackend.flush();
      $httpBackend.expectGET(/people\?department=1/).respond(200);
      department.$relationships['employees'].query();
      $httpBackend.flush();
      expect(department.$relationships['employees']).toBeDefined();
    });

  }

  function methodsTests() {

    initAllDefault();

    it('Can create a new relationship to a $resource_', function () {
      var testResourceX = $resource_('testResource/:id', {'id':'@id'});
      testResourceX.relate('testRelation', $resource_('test/:testId', {'testId':'@testId'}));
      expect(testResourceX.$relationships['testRelation']).toBeDefined();
    });


    it('getFull returns promise for resource with its related resources included', function () {
      Departments.getFull({'id':1});
      $httpBackend.expectGET(/departments\/1/).respond(mocks.departments[0]);
      $httpBackend.expectGET(/people\?department=1/).respond(mocks.people);
      $httpBackend.expectGET(/computers\?department=1/).respond([]);
      $httpBackend.flush();
    });

    it('Static methods go into the resource factory', function () {

      Departments = $resource_('departments/:id/', {'id': '@id'})
        .static('test', function () {
          return 'rest result';
        });

      var instanceDepartment = new Departments({'id': 1});
      expect(Departments.test).toBeDefined();
      expect(instanceDepartment.test).toBeUndefined();

    });

    it('Instance methods go into resource instance', function () {

      Departments = $resource_('departments/:id/', {'id': '@id'})
        .method('test', function () {
          return this.id;
        });

      var instanceDepartment = new Departments({'id': 1});

      $httpBackend.expect('OPTIONS', /departments/).respond(200);
      Departments.options();

      expect(Departments.test).toBeUndefined();
      expect(instanceDepartment.test).toBeDefined();
      expect(instanceDepartment.test()).toBe(1);

    });

    it('Can extend with an hash of methods', function () {

      Departments = $resource_('departments/:id/', {'id': '@id'})
        .method(
          {
            'test': function () {
              return this.id;
            }
          }
        );

      var instanceDepartment = new Departments({'id': 1});

      expect(instanceDepartment.test).toBeDefined();
      expect(instanceDepartment.test()).toBe(1);

    });

    it('Can extend with an Array of methods', function () {

      Departments = $resource_('departments/:id/', {'id': '@id'})
        .method([
          {
            'test': function () {
              return this.id;
            }
          }
        ]);

      var instanceDepartment = new Departments({'id': 1});

      expect(instanceDepartment.test).toBeDefined();
      expect(instanceDepartment.test()).toBe(1);

    });
  }

  function resourceTests() {

    initAllDefault();

    it('Can create a new $resource_', function () {
      var department = new Departments;
      department.name = "Test";
      department.$save();
      $httpBackend.expectPOST(/departments/, {name: 'Test'}).respond(200);
      $httpBackend.flush();

      expect(department.name).toBe('Test');

    });

    it('Can modify an instance $resource_', function () {

      var department = Departments.get({'id': '2'});
      $httpBackend.expectGET(/departments\/2/).respond(200).respond(mocks.departments[1]);
      $httpBackend.flush();

      department.name = 'Patchy';
      $httpBackend.expectPATCH(/departments\/2/).respond(200);
      department.$update();
      $httpBackend.flush();

      expect(department.name).toBe('Patchy');
    });

    it('Can get list of $resource_ instances using query', function () {
      var departments = Departments.query();
      $httpBackend.expectGET(/departments/).respond(mocks.departments);
      $httpBackend.flush();
      expect(departments.length).toBe(4);
      expect(departments[0].url).toBe("http://api.com/departments/1");
    });

    it('Each fetched $resource_ result is an instance of $resource_', function () {
      var departments = Departments.query();
      $httpBackend.expectGET(/departments/).respond(mocks.departments);
      $httpBackend.flush();
      expect(departments.length).toBe(4);
      expect(departments[0]).toBeDefined();
    });

    it('Can get a single instance of $resource_ using GET', function () {
      var departments = Departments.get({'id': '2'});
      $httpBackend.expectGET(/departments\/2/).respond(mocks.departments[1]);
      $httpBackend.flush();
      expect(departments.url).toBe("http://api.com/departments/2");
    });

    it('Catch invalid parameter', function () {
      Departments.relate('bad', $resource_('bad/:id/', {'id':'^'}));
      var departments = Departments.query();
      $httpBackend.expectGET(/departments/).respond(mocks.departments);
      $httpBackend.flush();
      $httpBackend.expectGET(/bad/).respond(mocks.departments);
      expect( function(){ departments[0].$relationships['bad'].query() } ).toThrow(new Error("Dotted member path is invalid."));
    });
  }

});



