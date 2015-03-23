# `$resourceX` (ng-resource-x)

## Get All You Need out of $resource!

The resource extension (`$resourceX`) service wraps angular's `$resource` service to provide the following utilities:
* **Nested Resources**: resources _always_ have relationships, $resource should be aware of them!
* **Methods**: No more creating a separate service to manage your $resource's business logic and validation!
* **One Get to Get Them All**: Don't pollute your ui-router resolve with 4 different calls to build one object, get all the relationships at once!

## Usage
```javascript
//In this example, we have a Department resource which has employees as a sub-resource.
var Department = $resourceX('departments/:id/', {'id':'@department_id'})
    //nested resource
    .child('employees', $resourceX('people/:id/', {id:'@id', department:'^department_id'});
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
//by default, getWithChildren will get all children
var Sales = Department.getWithChildren({'name':'Sales'}); 
//the above sends out 2 requests: GET /departments?name=Sales and GET /people?department_id=1
Sales.$promise.then(example);

function example(){
  //by default we prefix children results with a '_' but it's configurable/removable
  Sales._people.hire(new Person({'name': 'Joey', 'jobTitle':'manager'}));
  //will output 'Joey says Hello!'
  console.log(Sales._people[0].name + ' says Hello!'); 
}
```

You don't have to use .getWithChildren at all, all children are just added as an array to the `$resourceX` as well:
```javascript
//Say we want to get all the female workers who work in accounting
var Accounting = Department.get({'name':'Accounting'});
var Accounting.$promise.then(example);

function example(){
  var Accountants = Accounting.$children['employees'];
  var FemaleAccountants = Accountants.query({'sex': 'female'});
  //the above request will look like: GET /people?department_id=2&sex=female
  //the department_id is inferred from the parent
}
```

### Creating a `$resourceX`
`$resourceX` takes the same arguments to create a resource as `$resource`. Any resource you can create with $resource can be created with `$resourceX`.

#### Nesting Resources
The `^` as the first character in a param map stands in place of a `@` letting `$resourceX` know to look for this parameter on its `$parent` property. You can go all sorts of crazy with '^' as they DO work through multiple levels (`^^^id` would get the ID of an object 3 levels above this one). Alternatively you can simply use the $parent variable like you would in a plain $resource call:
```javascript
var People = $resourceX('people/:id/', {id:'@id', department:'@$parent.department_id'})
```
Either way, the People resource will look for a parent containing the department_id value and pass it on to all its calls. This way when its created through a parent department, all subsequent calls to People will attempt to filter by department_id.

#### Using Nested Resources
You can then nest the declared resource using the `child(name, function)` method. The method can also take in all children at once if you pass in an object, like so:
```javascript
//declare both employees and computers nested $resourceXs
var Department = $resourceX('departments/:id/', {'id':'@department_id'})
    .child({
      'employees': $resourceX('people/:id/', {'id':'@id', 'department':'^department_id'}),
      'computers': $resourceX('computers/:id/', {'id':'@comp_id', 'department':'^department_id'})
    });
```
Once nested, resources can be accessed through the `$children` property on the parent or may automatically be loaded using the `getWithChildren(params, children)` method.
```javascript
//... skipping the promises part for these examples
var IT = Department.get({'name':'IT'});
var computers = IT.$children['computers'].query();
console.log(computers); //outputs the computers belonging to this department
//OR
var IT = Department.getWithChildren({'name':'IT'}, ['computers']);
console.log(IT._computers); //outputs the computers belonging to this department
```

#### Adding Methods
There are 3 different kinds of methods you can attach to a `$resourceX`:
* method - Methods only attach to an instantiated `$resourceX` (so the `$resourceX` once you get it back from the database or create using new).
* static - Statics (short for static methods) only attach to the `$resourceX` and not its instances (so Department, but not IT).
* extend - is really just both a method and a static. The developer will need to be aware of the context on their own.

There's many ways to add methods, as shown:
```javascript
//using func(name, method) syntax:
var Department = $resourceX('departments/:id/', {'id':'@department_id'})
  // hires a person to work at a department. "this" is the specific instance of a department
  .method('hire', function(person){
    this._employees.push(person);
    return this.$save();
  })
  // gets all departments whose income is above 9001 (are profitable ;) )
  .static('getProfitable', function(){
    return this.query({'income':9001});
  })
  // if a department is passed in, gets the income of that department,
  // otherwise gets income of all departments
  .extend('getIncome', function(department){
    if(department){
      return department.income; //in the real world, wrap this in a $q.when...
    }
    else{
      return this.query().$promise.then(function(allDepartments){
        return allDepartments.reduce(function(profits, department){
          return profits + department.income;
        }, 0);
      });
    }
  })
```
