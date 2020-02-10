const axios = require("axios");
const qs = require("qs");
const util = require("util");
const to = require("await-to-js").default;
const moment = require("moment");

// NOTE: only for anything except China and USA
const ROW_SERVER = "b2vapi.bmwgroup.com";
const AUTH_URL = `https://${ROW_SERVER}/gcdm/oauth/token`;

const auth_headers = {
  "Content-Type": "application/x-www-form-urlencoded",
  "Content-Length": "124",
  Connection: "Keep-Alive",
  Host: "b2vapi.bmwgroup.com",
  "Accept-Encoding": "gzip",
  Authorization:
    "Basic blF2NkNxdHhKdVhXUDc0eGYzQ0p3VUVQOjF6REh4NnVuNGNEanli" +
    "TEVOTjNreWZ1bVgya0VZaWdXUGNRcGR2RFJwSUJrN3JPSg==",
  Credentials:
    "nQv6CqtxJuXWP74xf3CJwUEP:1zDHx6un4cDjybLENN3kyfumX2kEYigWPcQpdvDRpIBk7rOJ",
  "User-Agent": "okhttp/2.60"
};

const BASE_URL = `https://${ROW_SERVER}/webapi/v1`;
const VEHICLES_URL = `${BASE_URL}/user/vehicles`;
const SINGLE_VEHICLE_URL = `${VEHICLES_URL}/%s`;
const REMOTE_SERVICE_URL = `${SINGLE_VEHICLE_URL}/executeService`;
const VEHICLE_STATUS_URL = `${SINGLE_VEHICLE_URL}/status`;

module.exports = {
  async auth(username, password) {
    let access_token = "";
    let token_expires_in = "";
    let vehicles = [];

    const values = {
      grant_type: "password",
      scope: "authenticate_user vehicle_data remote_services",
      username: username,
      password: password
    };

    console.log("Authenticating...");
    let err;
    let result = await axios.post(AUTH_URL, qs.stringify(values), {
      headers: auth_headers
    });

    access_token = result.data.access_token;
    token_expires_in = new Date(
      new Date().getTime() + 1000 * result.data.expires_in
    );

    const headers = {
      Authorization: `Bearer ${access_token}`,
      referer: "https://www.bmw-connecteddrive.de/app/index.html"
    };

    return {
      async vehicles() {
        console.log("Getting vehicles...");
        result = await axios.get(VEHICLES_URL, { headers: headers });
        return result.data.vehicles;
      },
      async findVehicle(vin) {
        console.log("Getting vehicles...");
        result = await axios.get(VEHICLES_URL, { headers: headers });
        vehicles = result.data.vehicles; //.map(vehicle => ({ vin: vehicle.vin })));

        let vehicle = vehicles.find(vehicle => vehicle.vin == vin);

        return {
          async flashLights() {
            if (vehicle === undefined) {
              console.log("Invalid vin.");
              return;
            }
            console.log(`Flashing lights for ${vehicle.vin}...`);
            [err, result] = await to(
              axios.post(
                util.format(REMOTE_SERVICE_URL, vehicle.vin),
                qs.stringify({ serviceType: "LIGHT_FLASH" }),
                {
                  headers: headers
                }
              )
            );
            console.log(result.data);
          },
          async status() {
            if (vehicle === undefined) {
              console.log("Invalid vin.");
              return;
            }
            console.log(`Requesting status for ${vehicle.vin}...`);
            [err, result] = await to(
              axios.get(util.format(VEHICLE_STATUS_URL, vehicle.vin), {
                headers: headers,
                params: {
                  deviceTime: moment().format("YYYY-MM-DDTHH:mm:ss")
                }
              })
            );
            if (err) {
              throw Error(err);
            }

            return result.data.vehicleStatus;
          }
        };
      }
    };
  }
};
