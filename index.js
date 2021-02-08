const axios = require("axios");
const qs = require("qs");
const util = require("util");
const to = require("await-to-js").default;
const moment = require("moment");

const AUTH_URL = `https://customer.bmwgroup.com/gcdm/oauth/authenticate`;

// NOTE: only for anything except China and USA
const API_SERVER = "b2vapi.bmwgroup.com";
const API_SERVER_NEW = "www.bmw-connecteddrive.de";
const API_BASE_URL = `https://${API_SERVER}/webapi/v1`;
const API_BASE_URL_NEW = `https://${API_SERVER_NEW}/api`;
const VEHICLES_URL = `${API_BASE_URL_NEW}/me/vehicles/v2`;
const SINGLE_VEHICLE_URL = `${VEHICLES_URL}/%s`;
const REMOTE_SERVICE_URL = `https://${API_SERVER_NEW}/remoteservices/rsapi/v1/%s/%s`;
const REMOTE_SERVICE_STATUS_URL = `${SINGLE_VEHICLE_URL}/serviceExecutionStatus?serviceType=%s`;
const VEHICLE_STATUS_URL = `${API_BASE_URL_NEW}/vehicle/dynamic/v1/%s?offset=-60`;
const VEHICLE_NAVIGATION_URL = `${API_BASE_URL_NEW}/vehicle/navigation/v1/%s`;

// https://www.bmw-connecteddrive.de/api/me/vehicles/v2?all=true&brand=BM

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

    let error;
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
      throw new Error("Authentication failed.");
    }

    const token_data = qs.parse(
      result.request.res.responseUrl.split("#")[1]
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
        try {
          result = await axios.get(VEHICLES_URL, { headers: headers });
        } catch (err) {
          throw new Error(err);
        }
        return result.data;
      },
      async findVehicle(vin) {
        result = await axios.get(VEHICLES_URL, { headers: headers });
        vehicles = result.data; //.map(vehicle => ({ vin: vehicle.vin })));

        let vehicle = vehicles.find(vehicle => vehicle.vin == vin);

        return {
          async flashLights() {
            if (vehicle === undefined) {
              throw new Error("Invalid vehicle identification number (vin).");
            }
            [error, result] = await to(
              axios.post(
                util.format(REMOTE_SERVICE_URL, vehicle.vin),
                qs.stringify({ serviceType: "LIGHT_FLASH" }),
                {
                  headers: headers
                }
              )
            );
            if (error)
              throw error;
            return result.data;
          },
          async lockStatus() {
            if (vehicle === undefined) {
              throw new Error("Invalid vehicle identification number (vin).");
            }
            [error, result] = await to(
              axios.get(
                util.format(REMOTE_SERVICE_STATUS_URL, vehicle.vin, "DOOR_LOCK"),
                {
                  headers: headers
                }
              )
            );
            if (error)
              throw error;
            return result.data;
          },
          async lock() {
            if (vehicle === undefined) {
              throw new Error("Invalid vehicle identification number (vin).");
            }
            [error, result] = await to(
              axios.post(
                util.format(REMOTE_SERVICE_URL, vehicle.vin, "RDL"),
                { clientId: 3 },
                {
                  headers
                }
              )
            );
            if (error) throw error;

            return result.data;
          },
          async unlock() {
            if (vehicle === undefined) {
              throw new Error("Invalid vehicle identification number (vin).");
            }
            [error, result] = await to(
              axios.post(
                util.format(REMOTE_SERVICE_URL, vehicle.vin, "RDU"),
                { clientId: 3 },
                {
                  headers
                }
              )
            );
            if (error) throw error;
            return result.data;                        
          },
          async status() {
            if (vehicle === undefined) {
              throw new Error("Invalid vehicle identification number (vin).");
            }
            [error, result] = await to(
              axios.get(util.format(VEHICLE_STATUS_URL, vehicle.vin), {
                headers: headers
              })
            );
            if (error) {
              throw new Error(`${error.message}: ${JSON.stringify([error.response.status, error.response.headers, error.response.data])}`);
            }

            return result.data.attributesMap;
          },
          async location() {
            if (vehicle === undefined) {
              throw new Error("Invalid vehicle identification number (vin).");
            }
            [error, result] = await to(
              axios.get(util.format(VEHICLE_NAVIGATION_URL, vehicle.vin), {
                headers: headers
              })
            );
            if (error) {
              throw new Error(`${error.message}: ${JSON.stringify([error.response.status, error.response.headers, error.response.data])}`);
            }

            return result.data;
          }
        };
      }
    };
  }
};
