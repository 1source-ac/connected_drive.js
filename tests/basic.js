const connected_drive = require("..");

const USERNAME = "";
const PASSWORD = "";

const main = async () => {// Authenticate with BMW API.
    const account = await connected_drive.auth(
      USERNAME,
      PASSWORD
    );

    // Retrieve and output all vehicles.
    const vehicles = await account.vehicles();
    console.log(vehicles);    
    
    // Find first vehicle with by vehicle identification number.
    const vehicle = await account.findVehicle(vehicles[0].vin);

    // Output its location.
    console.log(await vehicle.location());
}

main();