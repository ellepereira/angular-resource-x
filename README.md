# `$resource_` (ng-resource-x)

[![Join the chat at https://gitter.im/luciano7/ng-resource-x](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/luciano7/ng-resource-x?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)[![Build Status](https://travis-ci.org/luciano7/ng-resource-x.svg)](https://travis-ci.org/luciano7/ng-resource-x)

## Get All You Need out of $resource!

How do you use $resource_? Well, you can use it exactly the same as plain $resource.
```javascript
var departments = $resource_('departments/:id/', {'id':'@id'});
```

However the resource extension (`$resource_`) service wraps angular's `$resource` service to provide the following utilities:
* **[Relationships](#resource-relationships)**: resources _always_ have relationships, $resource should be aware of them!
* **[Methods](#adding-methods)**: No more creating a separate service to manage your $resource's business logic and validation!
* **[One Call, Get All](#using-nested-resources)**: Don't pollute your ui-router resolve with 4 different calls to build one object, get all the relationships at once!

## Usage
```javascript
//In this example, we have a Department resource which has employees as a sub-resource.
var Department = $resource_('departments/:id/', {'id':'@department_id'})
    //related resource
    .relate('employees', $resource_('people/:id/', {id:'@id', department:'^department_id'});
    //instance methods
    .method('hire', hireMethod)
    //static methods
    .static('getManagers', getManagersMethod);

/////////
// methods allow you to be more declarative to users of your service. They don't 
// need to know details of the data model, they can just descriptive methods 
// like: hire(person).
function hireMethod(person, job){ 
  this._employees.push(person);
  person.department = this.department_id;
  person.jobTitle = job;
  return person.$save();
}

function getManagersMethod(){
  return this.get({'jobTitle':'manager'});
}
```
Now that you've declared Departments and Employees, you can use them like so:

```javascript
//by default, getFull will get all related resources
var Sales = Department.getFull({'name':'Sales'}); 
//the above sends out 2 requests: GET /departments?name=Sales and GET /people?department_id=1
Sales.$promise.then(example);

function example(){
  //by default we prefix related results with a '_' but it's configurable/removable
  Sales._people.hire(new Person({'name': 'Joey', 'jobTitle':'manager'}));
  //will output 'Joey says Hello!'
  console.log(Sales._people[0].name + ' says Hello!'); 
}
```

You don't have to use .getFull at all, all related resources are just added as an array to the `$resource_` as well:
```javascript
//Say we want to get all the female workers who work in accounting
var Accounting = Department.get({'name':'Accounting'});
var Accounting.$promise.then(example);

function example(){
  var Accountants = Accounting.$relationships['employees'];
  var FemaleAccountants = Accountants.query({'sex': 'female'});
  //the above request will look like: GET /people?department_id=2&sex=female
  //the department_id is inferred from the parent
}
```

### Creating a `$resource_`
`$resource_` takes the same arguments to create a resource as `$resource`. Any resource you can create with $resource can be created with `$resource_`.

#### Resource Relationships
The `^` as the first character in a param map stands in place of a `@` letting `$resource_` know to look for this parameter on its `$parent` property. You can go all sorts of crazy with '^' as they DO work through multiple levels (`^^^id` would get the ID of an object 3 levels above this one). Alternatively you can simply use the $parent variable like you would in a plain $resource call:
```javascript
var People = $resource_('people/:id/', {id:'@id', department:'@$parent.department_id'})
```
Either way, the People resource will look for a parent containing the department_id value and pass it on to all its calls. This way when its created through a parent department, all subsequent calls to People will attempt to filter by department_id.

#### Using Related Resources
You can then nest the declared resource using the `relate(name, function)` method. To pass in more than one relationship at a time, use `relationships({})`:
```javascript
//declare both employees and computers nested $resource_s
var Department = $resource_('departments/:id/', {'id':'@department_id'})
    .relationships({
      'employees': $resource_('people/:id/', {'id':'@id', 'department':'^department_id'}),
      'computers': $resource_('computers/:id/', {'id':'@comp_id', 'department':'^department_id'})
    });
```
Once related, resources can be accessed through the `$relationships` property on the `$resource_` or may automatically be loaded using the `getFull(params, resources)` method.
```javascript
//... skipping the promises part for these examples
var IT = Department.get({'name':'IT'});
var computers = IT.$relationships['computers'].query();
console.log(computers); //outputs the computers belonging to this department
//OR
var IT = Department.getFull({'name':'IT'}, ['computers']);
console.log(IT._computers); //outputs the computers belonging to this department
```

#### Adding Methods
There are 2 different kinds of methods you can attach to a `$resource_`:
* method - Methods only attach to an instantiated `$resource_` (so the `$resource_` once you get it back from the database or create using new).
* static - Statics (short for static methods) only attach to the `$resource_` and not its instances (so Department, but not IT).

There's many ways to add methods, as shown:
```javascript
//using func(name, method) syntax:
var Department = $resource_('departments/:id/', {'id':'@department_id'})
  // hires a person to work at a department. "this" is the specific instance of a department
  .method('hire', function(person){
    this._employees.push(person);
    return this.$save();
  })
  // gets all departments whose income is above 9001 (are profitable ;) )
  .static('getProfitable', function(){
    return this.query({'income':9001});
  });
```
