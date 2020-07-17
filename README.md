# Bus

## Demo

Visit `https://bus.mattschlosser.me`


## Backend

This is a simple project I dad this evening to read bus data
from a database. A simple server for sending bus data to the client
based on a time interval.


Users can query all bus locations stored under the `bus.db` file with
a request like 
```
http://localhost:8080/bus/2020-05-22/14:50/2
```

will return the data of all buses on March 22, 2020 between 2:48 and 2:52 pm
The '2' indicates a 2 minute spread on either side. It can be adjusted between 1 - 5. 
This is useful for displaying data in a time sequence fashion.

## Frontend

Visit `http://localhost:8080/`

Here, the data is presented in a map like view. Users can see the location of
the bus and see updated location in half minute intervals

Future plans involve adding interface controls to allow users to pick time/date

## Setup

Create a sqlite db named `bus.db` with the following schema


```sql
CREATE TABLE pos(id integer primary key autoincrement, bus integer, lat double, long double, trip int, timestamp timestamp, bearing int, speed double);
CREATE INDEX ts on pos(timestamp);
```

Here is where data about buses should be stored. 

Due to large file size, the `bus.db` file cannot be uploaded to 
GitHub. 

