const axios = require("axios");
const qs = require("qs");
const util = require("util");
const to = require("await-to-js").default;
const moment = require("moment");

// NOTE: only for anything except China and USA
const AUTH_SERVER = "b2vapi.bmwgroup.com";
const AUTH_URL = `https://${AUTH_SERVER}/gcdm/oauth/authenticate`;

const API_SERVER = "www.bmw-connecteddrive.com";
const API_BASE_URL = `https://${API_SERVER}/api`;
const VEHICLES_URL = `${API_BASE_URL}/me/vehicles/v2`;
const SINGLE_VEHICLE_URL = `${VEHICLES_URL}/%s`;
const REMOTE_SERVICE_URL = `${SINGLE_VEHICLE_URL}/executeService`;
const VEHICLE_STATUS_URL = `${API_BASE_URL}/vehicle/dynamic/v1/%s?offset=-60`;
const VEHICLE_NAVIGATION_URL = `${API_BASE_URL}/vehicle/navigation/v1/%s`;

axios.defaults.timeout = 10000;

module.exports = {
  async auth(username, password) {
    let access_token = "";
    let token_expires_in = "";
    let vehicles = [];

    const values = {
      client_id: "dbf0a542-ebd1-4ff0-a9a7-55172fbfce35",
      redirect_uri:
        "https://www.bmw-connecteddrive.com/app/static/external-dispatch.html",
      response_type: "token",
      scope: "authenticate_user vehicle_data remote_services",
      username,
      password
    };

    console.log("Authenticating...");
    let err;
    let result = await axios.post(AUTH_URL, qs.stringify(values), {
      timeout: 1000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "124",
        "Connection": "Keep-Alive",
        "Host": "b2vapi.bmwgroup.com",
        "Accept-Encoding": "gzip",
        "Authorization": "Basic blF2NkNxdHhKdVhXUDc0eGYzQ0p3VUVQOjF6REh4NnVuNGNEanli" +
                         "TEVOTjNreWZ1bVgya0VZaWdXUGNRcGR2RFJwSUJrN3JPSg==",
        "Credentials": "nQv6CqtxJuXWP74xf3CJwUEP:1zDHx6un4cDjybLENN3kyfumX2kEYigWPcQpdvDRpIBk7rOJ",
        "User-Agent": "okhttp/2.60",
      }
    });

    const token_data = qs.parse(
      new URL(result.request.res.responseUrl).hash.slice(1)
    );

    access_token = token_data.access_token;
    token_expires_in = new Date(
      new Date().getTime() + 1000 * token_data.expires_in
    );

    const headers = {
      authorization: `Bearer ${access_token}`
    };

    return {
      async vehicles() {
        console.log("Getting vehicles...");
        result = await axios.get(VEHICLES_URL, { headers: headers });
        return result.data;
      },
      async findVehicle(vin) {
        console.log("Getting vehicles...");
        result = await axios.get(VEHICLES_URL, { headers: headers });
        vehicles = result.data; //.map(vehicle => ({ vin: vehicle.vin })));

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
            if(err) console.log(err);
            else console.log(result.data);
          },
          async status() {
            if (vehicle === undefined) {
              console.log("Invalid vin.");
              return;
            }
            console.log(`Requesting status for ${vehicle.vin}...`);
            [err, result] = await to(
              axios.get(util.format(VEHICLE_STATUS_URL, vehicle.vin), {
                headers: headers
              })
            );
            if (err) {
              throw Error(err);
            }

            return result.data.attributesMap;
          },
          async location() {
            if (vehicle === undefined) {
              console.log("Invalid vin.");
              return;
            }
            console.log(`Requesting location for ${vehicle.vin}...`);
            [err, result] = await to(
              axios.get(util.format(VEHICLE_NAVIGATION_URL, vehicle.vin), {
                headers: headers
              })
            );
            if (err) {
              throw Error(err);
            }

            return result.data;
          }
        };
      }
    };
  }
};
