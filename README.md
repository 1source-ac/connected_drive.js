# connected_drive.js
ES6 API to access BMW Connected Drive API.

# Example usage
```
const connected_drive = require("connected_drive.js");
let account = await connected_drive.auth(
  username,
  password
);
let vehicle = await account.findVehicle(vin);
vehicle.flashLights();
```
