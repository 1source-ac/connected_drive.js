const axios = require("axios");
const qs = require("qs");
const util = require("util");
const to = require("await-to-js").default;
const moment = require("moment");

const AUTH_URL = `https://customer.bmwgroup.com/gcdm/oauth/authenticate`;

// NOTE: only for anything except China and USA
const API_SERVER = "b2vapi.bmwgroup.com";
const API_BASE_URL = `https://${API_SERVER}/webapi/v1`;
const VEHICLES_URL = `${API_BASE_URL}/user/vehicles`;
const SINGLE_VEHICLE_URL = `${VEHICLES_URL}/%s`;
const REMOTE_SERVICE_URL = `${SINGLE_VEHICLE_URL}/executeService`;
const REMOTE_SERVICE_STATUS_URL = `${SINGLE_VEHICLE_URL}/serviceExecutionStatus?serviceType=%s`;
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
    let result;
    try {
      result = await axios.post(AUTH_URL, qs.stringify(values), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": "124",
          //        "Host": "b2vapi.bmwgroup.com",
          "Accept-Encoding": "gzip",
        }
      });
    } catch (err) {
      console.log(err);
      throw new Error("Authentication failed.");
    }

    console.log("Authenticated.");

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
        try {
          result = await axios.get(VEHICLES_URL, { headers: headers });
        } catch (err) {
          console.log(err);
          return [];
        }
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
            if (err) console.log(err);
            else console.log(result.data);
          },
          async lockStatus() {
            if (vehicle === undefined) {
              console.log("Invalid vin.");
              return;
            }
            console.log(`Retrieving status for lock request from ${vehicle.vin}...`);
            [err, result] = await to(
              axios.get(
                util.format(REMOTE_SERVICE_STATUS_URL, vehicle.vin, "DOOR_LOCK"),
                {
                  headers: headers
                }
              )
            );
            if (err) console.log(err);
            else console.log(result.data);
          },
          async lock() {
            if (vehicle === undefined) {
              console.log("Invalid vin.");
              return;
            }
            console.log(`Locking ${vehicle.vin}...`);
            [err, result] = await to(
              axios.post(
                util.format(REMOTE_SERVICE_URL, vehicle.vin),
                qs.stringify({ serviceType: "DOOR_LOCK" }),
                {
                  headers: headers
                }
              )
            );
            if (err) console.log(err);
            else console.log(result.data);
          },
          async unlock() {
            if (vehicle === undefined) {
              console.log("Invalid vin.");
              return;
            }
            console.log(`Locking ${vehicle.vin}...`);
            [err, result] = await to(
              axios.post(
                util.format(REMOTE_SERVICE_URL, vehicle.vin),
                qs.stringify({ serviceType: "DOOR_UNLOCK" }),
                {
                  headers: headers
                }
              )
            );
            if (err) console.log(err);
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
              throw Error(`${err.mesage}: ${JSON.stringify(error.response.data)}`);
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
              throw Error(`${err.mesage}: ${JSON.stringify(error.response.data)}`);
            }

            return result.data;
          }
        };
      }
    };
  }
};
