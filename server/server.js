const app = require('express')();
const server = require('http').Server(app);
const PORT = require('../src/config.js').port;

let employees = [];
seedRandomData();


// Set up socket.io server
const io = require('socket.io')(server);

io.on('connection', function(socket){
	// this gets triggered when a client connects
  console.log('a user connected');
  
  // this is the function that will update information on the front end
  // first argument is channel name - describing what that information is; sort of like an endpoint
  // channel name has to be the same on server and client for the same types of data transactions
  // second argument is a standard JSON object
  const updateLoc = () => {
	  socket.emit('tagLocationUpdate', getUpdateObject());
  };
  
  setInterval(updateLoc, 50);
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get('/employeeData', (req, res) => {
	res.send(JSON.stringify(employees));
});


server.listen(PORT);
console.log("Server listening on " + PORT);

/* Code you don't need starts here */

function getUpdateObject() {
	  const id = Math.floor(Math.random() * 100);
	  const emp = employees[id];
	  let eq = null;
	  const eqid = Math.floor(Math.random() * 3);
	  let name = null;
	  if(eqid == 0) {
		  eq = emp.hardhat;
		  name = "hardhat";
	  }
	  else if(eqid == 1) {
		  eq = emp.leftBoot;
		  name = "leftBoot";
	  }
	  else {
		  eq = emp.rightBoot;
		  name = "rightBoot";
	  }
	  let dx = Math.random() * 2 - 1;
	  let dy = Math.random() * 2 - 1;
	  let len = Math.sqrt(dx * dx + dy * dy);
	  dx /= len;
	  dy /= len;
	  eq.coords.x += 0.01 * dx;
	  eq.coords.y += 0.01 * dy;
	return {
		  id: id,
		 name: name,
		 x: eq.coords.x,
		 y: eq.coords.y
	  };
}
/* Code you don't need ends here */

function seedRandomData() {
    for(let i=0; i<100; i++) {
      let newEmp = {
        "name": "EmployeeName" + i,
        "id": i
      };
      newEmp.hardhat = {
        "status": 1,
        "ousideBounds": 0,
        "coords": {"x": Math.random(), "y": Math.random()}
      };
      newEmp.leftBoot = {
        "status": 1,
        "ousideBounds": 0,
        "coords": {"x": Math.random(), "y": Math.random()}
      };
      newEmp.rightBoot = {
        "status": 1,
        "ousideBounds": 0,
        "coords": {"x": Math.random(), "y": Math.random()}
      };
      if(Math.random() < 0.05) {
        newEmp.hardhat.status = 0;
      }
      if(Math.random() < 0.05) {
        newEmp.hardhat.outsideBounds = 1;
      }
      if(Math.random() < 0.05) {
        newEmp.leftBoot.status = 0;
      }
      if(Math.random() < 0.05) {
        newEmp.leftBoot.outsideBounds = 1;
      }
      if(Math.random() < 0.05) {
        newEmp.rightBoot.status = 0;
      }
      if(Math.random() < 0.05) {
        newEmp.rightBoot.outsideBounds = 1;
      }
      employees.push(newEmp);
    }
}
