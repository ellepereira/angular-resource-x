# resource-generator
AngularJS Resource Extension

## About
Resource Generator wraps a call to $resource and provides some extra functionality. The provider can be configured with a base API URL, default parameters, extenders, methods and statics.

While $resource is amazing in itself, we wanted to provide a more declarative approach to $resource management. Typically if you wanted more functions out of your resources, you'd have to create a service that instantiated a resource and then managed the resource with methods on that service. Resource Generator creates one stop call for both your $resource and its management.

Here's how your resource definition might look like:
```javascript
var Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
  {
    'name': 'owners',
    'url': 'owners/:id/',
    'params': {'id':'@id'},
    'link': {'car_id', 'id'}
  }
])
  .method('paint', function(color){
    this.color = color;
    return this.$save();
  }
  .method('turnOn', function(){
    this.on = true;
  });
  
var camaro = new Cars();
camaro.paint('yellow');
```

### Configuration
The ResourceGenerator provider takes in 4 arguments:
- `url`: the URL to get this resource from.
- `paramDefaults`: the hash of parameter defaults for this resource, exactly like $resource. Will also take a function that returns an object.
- `children`: child endpoints. Configured like so:
```javascript
  {
    //A name for your child endpoint.
    'name': 'owners', 
    //URL for this endpoint.
    'url': 'carowners/{id}', 
    //Exactly like the parent, will take an object or a function that returns an object.
    'params': {'id':'@id'}, 
    //Object that has as a key a query field on this child and as a value a variable name to fetch from its parent.
    'link': {'car_id', 'id'} 
  }
```

## Usage
To simply create a standard $resource just call ResourceGenerator with only the first 2 parameters:
```javascript
//creates a Cars resource and binds the "id" query field to the object's id
var Cars = ResourceGenerator('cars/:id/', {'id':'@id'});
```
As you can expect, a $resource is returned pointing to the cars endpoint and matches the id url query field with the object's id.

Children endpoints are automatically added to the instance of the parent's resource. Like so:
```javascript
var Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
  {
    'name': 'owners',
    'url': 'owners/:id/',
    'params': {'id':'@id'},
    'link': {'car_id', 'id'}
  }
]);

//now when we get an instance of Car we also get some helper variables:
var prius = Cars.get({'id':1});
var priusOwners;

//we wait for the car to be fetched
prius.$promise.then(function(){
  //$owners automatically get added to prius with their "car_id" query param set to the prius' id.
  priusOwners = prius.$owners.query();
});
```

### Methods
Methods allow the manipulation of resource instantiated with your resource-generator. Example:
```javascript
var Cars = ResourceGenerator('cars/:id/', {'id':'@id'}).method('paint', function(color){
  this.color = color;
  return this.$save();
}

//then anywhere you want to use the Cars
var prius = new Cars();
prius.paint('blue');
```

### Statics
Statics (static methods) however, work in the non-instantiated ResourceGenerator, like so:
```javascript
var Cars = ResourceGenerator('cars/:id/', {'id':'@id'}).static('getAllRedCars', function(){
  return this.query({color:'red'});
}

//now to get that list of red cars you call
var redCars = Cars.getAllRedCars();
```

### Extends
Extends are simply _both_ a method and a static - as in they work on both instantiated and non-instantiated versions of your resource object.
```javascript
var Cars = ResourceGenerator('cars/:id/', {'id':'@id'}).extend('toggleIgnition', function(car){
  var useCar = (this.id) ? this : car;
  //toggle between on/off
  useCar.on = !useCar.on;
  
  return useCar.$save();
}

//now we can use that method with an instantiated Car
var prius = new Cars({'name':'prius'});
//turn car on
prius.toggleIgnition();
//and turn it back off, using the non-instantiated Cars
Cars.toggleIgnition(prius);
```

### Other Helper Stuff

#### Resolved Parameters
You can pass either a parameters object to ResourceGenerator _or_ a function that returns one _or_ a function that returns a promise to return one. Furthermore, the function uses angular's dependency injection so you can do something link:
```javascript
//modifying the default params in this case, but this works for any time you pass in a parameters list
//In this example, I want to attach a user's login role to all calls made from my resources, and if no role exists, fetch one.
ResourceGeneratorProvider.defaults.params = function(RolesService){
  if(RolesService.myRole){
    return {'user_role': RolesService.myRole};
  }
  else{
    return RolesService.getRole().then(function(role){
      return {'user_role': RolesService.myRole}
    }
  }
}
```
Do note however that this function will be called every single time a request goes out. It's best to cache results and reuse them and not make a new request each time unless necessary.

#### GetWithChildren()
GetWithChildren() is a default method for all ResourceGenerators. It will parallel load all of the resource's childrens and save their result to the resource. Like so:
```javascript
var Cars = ResourceGenerator('cars/:id/', {'id':'@id'}, [
  {
    'name': 'owners',
    'url': 'owners/:id/',
    'params': {'id':'@id'},
    'link': {'car_id', 'id'}
  }
]);

var prius = Cars.getWithChildren({'id':5});
var priusOwners;

prius.$promise.then(function(){
  priusOwners = prius._owners;
});
```


  
    
    
