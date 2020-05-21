# connected_drive.js
[Work-In-Progress] ES6 module to access BMW Connected Drive API.

# Example usage
```javascript
import connected_drive from "connected_drive.js";

// Authenticate with BMW API.
const account = await connected_drive.auth(
  username,
  password
);

// Find a vehicle with known vehicle identification.
const vehicle = await account.findVehicle(vehicle_id);

// Flash it's headlights.
vehicle.flashLights();
```

# Acknowledgements
Inspired by https://github.com/bimmerconnected/bimmer_connected
