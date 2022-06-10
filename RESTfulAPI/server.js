/* ------------- Sources and Imports ------------- */

// SOURCES: Class Lecture document :
// Comments and code structure from lectures:
// export GOOGLE_APPLICATION_CREDENTIALS="/Users/medicherla/Documents/CloudHY/FinalTemplates/934305879_load-4/assignment4-348203-e263ef5ba7e6.json"
const express = require("express");
const app = express();
const axios = require("axios").default;
const { Datastore } = require("@google-cloud/datastore");
var cors = require("cors"); // Go around for CORS errors
const url = require("url");
const bodyParser = require("body-parser");

/* ------------- Constants ------------- */

// Constants for Authorization:
// Working set:
// const CLIENTID7 =
//   "936549727362-pr84u5suvvar213m1u8lb3a2rc14kp32.apps.googleusercontent.com";
// const CLIENTSECRET7 = "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";

// Test set:
const CLIENTID7 =
  "HIDDEN";
const CLIENTSECRET7 = "HIDDEN";

// Constants for Entities and other uses(pagination, localhost..)
const BOAT = "Boat";
const LOAD = "Load";
const USER = "User";
//const selfURL = "http://localhost:8888";
const selfURL = "https://finalproject-351702.wl.r.appspot.com";

/* ------------- Setup: Authorization, Datastore and Middleware ------------- */

// const datastore = new Datastore({
//   projectId: "assignment4-348203", // projectId: "finalproject-351702",
// });
const datastore = new Datastore({
  projectId: "finalproject-351702",
});

// Sets up authorization library and redirect URIs for Google OAuth:
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(CLIENTID7);
//const redirect_uri = "http://localhost:8888/oauth";
const redirect_uri = "https://finalproject-351702.wl.r.appspot.com/oauth";
//const router = express.Router();

// Middleware function setup: bodyparser, public folder, cors setup:
app.use(bodyParser.json());
app.use("/static", express.static("public"));
app.use(cors());

/* ------------- Authorization & User Creation Functions ------------- */

// Gets JWT from the parameter from the endpoint /oauth. Returns object of data:
async function get_jwt(code) {
  // Use sent code to send an axios post request to get JWT information:
  let call_one = await axios.post("https://oauth2.googleapis.com/token", {
    code: code,
    client_id: CLIENTID7,
    client_secret: CLIENTSECRET7, // Do we need to send the secret through form since we manually add it here?
    redirect_uri: redirect_uri,
    grant_type: "authorization_code",
  });
  console.log("Call one JWT in here: ", call_one.data);
  //const get_sub = await verify(call_one.data.id_token);   // Backup, uneeded

  // Creates a new property in retrieved JSON object with the sub value:
  call_one.data.sub = await verify(call_one.data.id_token);
  console.log("get call_one.data.sub in get jwt is: ", call_one.data);

  // Create user account:
  const new_user = await post_user(call_one.data.sub); // Returns User entity record
  console.log("Created user is: ", new_user);

  // return the updated JSON object from the POST request:
  return call_one.data;
}

// Verifies Given JWT and returns the JWT sub property(our user id_token):
async function verify(token) {
  // Function copied from Google Oauth2 Docs
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENTID7, // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();
  const userid = payload["sub"]; // Will be used as our user id_token
  console.log("User sub id is: ", userid);
  return userid;
}

// Verifies Given JWT and returns the JWT sub property(our user id_token):
// Returns true if JWT is valid & user_id is valid(matches user_id from
// req.param.user_id with the sub value inside the given JWT)
async function verify_jwt_and_user_id(token, user_id) {
  // Function copied from Google Oauth2 Docs
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: CLIENTID7, // Specify the CLIENT_ID of the app that accesses the backend
  });
  const payload = ticket.getPayload();
  const sub_value = payload["sub"]; // Will be used as our user id_token
  console.log("User sub id is: ", sub_value);
  return sub_value == user_id;
}

async function post_user(sub) {
  var key = datastore.key(USER);
  console.log("Makeing a new USER: ", key);
  const new_user = {
    id: key.id,
    user_id: sub,
    boat: [],
  };
  return datastore.save({ key: key, data: new_user }).then(() => {
    console.log("The key is: ", key.id);
    const add_id = {
      id: key.id,
      self: `${selfURL}/users/${key.id}`,
      user_id: sub,
      boat: [],
    };
    return datastore.save({ key: key, data: add_id }).then(() => {
      return datastore.get(key).then((entity) => {
        console.log("posted: ", entity[0]);
        return entity[0];
      });
    });
  });
}

// Basic POST functions: Post boat, loads, and user:
async function post_boat(name, type, length, user = "ERROR") {
  var key = datastore.key(BOAT);
  console.log("Makeing a new boat: ", key);
  const new_boat = {
    id: key.id,
    name: name,
    type: type,
    length: length,
    loads: [],
    user: user, // sub property in the JWT.
    self: `${selfURL}/boats/`,
  };
  // // Add boat to user & save boat into database:
  // await update_boat_for_user(key.id, owner, "add");
  return datastore.save({ key: key, data: new_boat }).then(() => {
    console.log("The key is: ", key.id);
    const add_id = {
      id: key.id,
      name: name,
      type: type,
      length: length,
      loads: [],
      user: user, // sub property in the JWT.
      self: `${selfURL}/boats/${key.id}`,
    };
    return datastore.save({ key: key, data: add_id }).then(() => {
      return datastore.get(key).then((entity) => {
        console.log("posted: ", entity[0]);
        return entity[0];
      });
    });
  });
}

// Calls update_boat_for_user to assign boat to user:
async function add_boat_to_user_helper(boat_entity) {
  console.log(
    "post_boat_to_user entity is: ",
    boat_entity.id,
    boat_entity.user
  );
  await update_boat_for_user(boat_entity.id, boat_entity.user, "add");
  return boat_entity;
}

/* ------------- Basic Setup & Retrieving Functions ------------- */
// This set of functions are to post entity records and get entity records

function post_load(volume, item, created) {
  var key = datastore.key(LOAD);
  const new_load = {
    item: item,
    volume: volume,
    id: key.id,
    carrier: null,
    creation_date: created,
  };
  return datastore.save({ key: key, data: new_load }).then(() => {
    return key;
  });
}

function post_load_id(volume, item, created, id) {
  var key = datastore.key([LOAD, parseInt(id, 10)]);
  const new_idLoad = {
    item: item,
    self: `${selfURL}/loads/${id}`,
    volume: volume,
    id: id,
    carrier: null,
    creation_date: created,
  };
  return datastore.save({ key: key, data: new_idLoad }).then(() => {
    return datastore.get(key).then((entity) => {
      return entity[0];
    });
  });
}

async function get_load(id) {
  var load_exists = await check_if_load_exists(id);
  if (!load_exists) {
    return "No Load with given Load Id exists";
  }
  const key = datastore.key([LOAD, parseInt(id, 10)]);
  return datastore.get(key).then((entity) => {
    //console.log("get_boat entity[0]: ", entity[0], typeof entity[0]);
    return entity[0];
  });
}

async function put_load(id, item, volume, creation_date, carrier) {
  var load_exists = await check_if_load_exists(id);

  if (load_exists) {
    var load_entity = await get_load(id);
    console.log("inside put_load load_entity is: ", load_entity);

    console.log(
      "params are in put_load: ",
      id,
      item,
      volume,
      creation_date,
      carrier
    );
    // if (carrier == null) {
    //   if (load_entity.carrier) {
    //     await update_loads_on_boat(
    //       load_entity.carrier.id,
    //       load_entity.id,
    //       "remove"
    //     );
    //   }
    //   carrier = null;
    // } else {
    //   await update_loads_on_boat(carrier.id, load_entity.id, "add");
    // }
    // var load_on_a_boat = await check_if_load_exists_on_boats(load_entity.id);
    // console.log("put] load load_on_a_boat: ", load_on_a_boat);
    // if (!load_on_a_boat) {
    // }
    await update_loads_on_boat(carrier.id, load_entity.id, "add");
    const updated_load = {
      self: load_entity.self,
      id: load_entity.id,
      carrier: carrier,
      item: item,
      volume: volume,
      creation_date: creation_date,
    };

    var key = datastore.key([LOAD, parseInt(id, 10)]);
    console.log("inside put_load key is: ", key);
    return datastore.save({ key: key, data: updated_load }).then(() => {
      return datastore.get(key).then((entity) => {
        console.log("posted: ", entity[0]);
        return entity[0];
      });
    });
  } else {
    return "No Load with given Load Id exists";
  }
}

async function patch_load(
  id,
  item = null,
  volume = null,
  creation_date = null,
  carrier = null
) {
  var load_exists = await check_if_load_exists(id);

  if (load_exists) {
    var load_entity = await get_load(id);
    console.log("inside put_load load_entity is: ", load_entity);

    if (item == null) {
      item = load_entity.item;
    }
    if (volume == null) {
      volume = load_entity.volume;
    }
    if (creation_date == null) {
      creation_date = load_entity.creation_date;
    }
    if (carrier == null) {
      carrier = load_entity.carrier;
    } else {
      await update_loads_on_boat(carrier.id, load_entity.id, "add");
    }

    const updated_load = {
      self: load_entity.self,
      id: load_entity.id,
      carrier: carrier,
      item: item,
      volume: volume,
      creation_date: creation_date,
    };
    console.log("patch loads updated_load: ", updated_load);
    // var returned_entity = await datastore.save({ key: key, data: updated_load });

    // // Update carrier?

    // var updated_load_entity = await get_load(id);
    // console.log("patch loads params results: ", updated_load_entity);

    var key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.save({ key: key, data: updated_load }).then(() => {
      return datastore.get(key).then((entity) => {
        console.log("posted: ", entity[0]);
        return entity[0];
      });
    });
  } else {
    return "No Load with given Load Id exists";
  }
}

async function put_boat(id, name, type, length, loads, jwt_user_id) {
  var boat_exists = await check_if_boat_exists(id);
  console.log(" put_boat boat_exists  is: ", boat_exists);

  var boat_entity = await get_boat(id);
  console.log(" put_boat  boat_entity is: ", boat_entity);

  // If boat exists, perform put_boat, if not, return boat doesn't exist:
  if (boat_exists) {
    var boat_entity = await get_boat(id);
    console.log("put_boat boat_entity", boat_entity);
    if (boat_entity.user == jwt_user_id) {
      console.log("put_boat jwt_user_id check", boat_entity.user, jwt_user_id);

      // PUT requires load in req.body, so delete carrier in previous boat
      // loads and add carrier to new loads in req.body:
      if (boat_entity.loads.length > 0) {
        for (const boat_load of boat_entity.loads) {
          // Updates carrier of each load on the boat
          await update_carrier_on_load(boat_entity.id, boat_load.id, "remove");
        }
      }
      if (loads != undefined) {
        for (const load of loads) {
          // Updates carrier of each load on the boat
          await update_carrier_on_load(boat_entity.id, load.id, "add");
        }
      } else {
        loads = [];
      }
      // Create updated boat items and save it in datastore:
      const updated_boat = {
        self: boat_entity.self,
        id: boat_entity.id,
        user: boat_entity.user,
        loads: loads,
        name: name,
        type: type,
        length: length,
      };
      var key = datastore.key([BOAT, parseInt(updated_boat.id, 10)]);
      console.log("put_boat updated_boat, key", updated_boat, key);
      return datastore.save({ key: key, data: updated_boat }).then(() => {
        return datastore.get(key).then((entity) => {
          console.log("put_boat updated_boat_entity: ", entity[0]);
          return entity[0];
        });
      });
    } else {
      console.log("put_boat jwt verification failed");
      return "Verification failed: JWT is valid but accessing other user's boat";
    }
  } else {
    return "No boat with boat id exists";
  }
}

async function patch_boat(
  id,
  name = null,
  type = null,
  length = null,
  loads = null,
  jwt_user_id
) {
  var boat_exists = await check_if_boat_exists(id);
  console.log(" patch_boat boat_exists  is: ", boat_exists);

  var boat_entity = await get_boat(id);
  console.log(" patch_boat  boat_entity is: ", boat_entity);

  // If boat exists, perform put_boat, if not, return boat doesn't exist:
  if (boat_exists) {
    if (boat_entity.user == jwt_user_id) {
      console.log("put_boat jwt_user_id check", boat_entity.user, jwt_user_id);

      // If any item was not filled in PATCH req.body, insert them manually
      // via retrieved boat_entity:
      if (name == null) {
        name = boat_entity.name;
      }
      if (type == null) {
        type = boat_entity.type;
      }
      if (length == null) {
        length = boat_entity.length;
      }
      if (loads == null) {
        loads = boat_entity.loads;
      }
      if (loads != null) {
        // PATCH can have load in req.body, so delete carrier in previous boat
        // loads and add carrier to new loads in req.body:
        for (const boat_load of boat_entity.loads) {
          // Updates carrier of each load on the boat
          await update_carrier_on_load(boat_entity.id, boat_load.id, "remove");
        }
        for (const load of loads) {
          // Updates carrier of each load on the boat
          await update_carrier_on_load(boat_entity.id, load.id, "add");
        }
      }
      // Create updated boat items and save it in datastore:
      var key = datastore.key([BOAT, parseInt(boat_entity.id, 10)]);
      const updated_boat = {
        self: boat_entity.self,
        id: boat_entity.id,
        user: boat_entity.user,
        loads: loads,
        name: name,
        type: type,
        length: length,
      };
      return datastore.save({ key: key, data: updated_boat }).then(() => {
        return datastore.get(key).then((entity) => {
          console.log("patch_boat updated_boat_entity: ", entity[0]);
          return entity[0];
        });
      });
      // var returned_key = datastore.save({ key: key, data: updated_boat });

      // var updated_boat_entity = await get_boat(returned_key);
      // return updated_boat_entity;
    } else {
      console.log("patch_boat jwt verification failed");
      return "Verification failed: JWT is valid but accessing other user's boat";
    }
  } else {
    return "No boat with boat id exists";
  }
}

// function post_user(sub) {
//   var key = datastore.key(USER);
//   console.log("Makeing a new USER: ", key);
//   const new_user = {
//     id: key.id,
//     user_id: sub,
//     boat: null,
//   };
//   return datastore.save({ key: key, data: new_user }).then(() => {
//     console.log("The key is: ", key.id);
//     const add_id = {
//       id: key.id,
//       self: `${selfURL}/users/${key.id}`,
//       user_id: sub,
//       boat: null,
//     };
//     return datastore.save({ key: key, data: add_id }).then(() => {
//       return datastore.get(key).then((entity) => {
//         console.log("posted: ", entity[0]);
//         return entity[0];
//       });
//     });
//   });
// }

async function get_boat(id) {
  const key = datastore.key([BOAT, parseInt(id, 10)]);
  return datastore.get(key).then((entity) => {
    console.log("get_boat entity[0]: ", entity[0], typeof entity[0]);
    return entity[0];
  });
}
async function get_user_boat(id, jwt_user_id) {
  var boat_exists = await check_if_boat_exists(id);
  if (!boat_exists) {
    return "No Boat with given Boat Id exists";
  }
  var boat_entity = await get_boat(id);
  console.log(
    "Inside get_user_boat: ",
    boat_entity,
    boat_entity.user,
    jwt_user_id
  );
  if (boat_entity.user == jwt_user_id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
      console.log("get_boat entity[0]: ", entity[0], typeof entity[0]);
      return entity[0];
    });
  } else {
    return "Verification failed: JWT is valid but accessing other user's boat";
  }
}

function get_user(id) {
  const key = datastore.key([USER, parseInt(id, 10)]);
  return datastore.get(key).then((entity) => {
    //console.log("get_boat entity[0]: ", entity[0], typeof entity[0]);
    return entity[0];
  });
}

function fromDatastore(item) {
  item.id = item[Datastore.KEY].id;
  return item;
}
// async function get_boats(user_id) {
//   const boats = datastore.createQuery(BOAT);
//   var boat_entities = await datastore.runQuery(boats);
//   var collect_user_boats = [];
//   boat_entities[0].forEach((boat) => {
//     if (boat.user == user_id) {
//       collect_user_boats.push(boat);
//     }
//   });
//   return collect_user_boats;
// }

async function get_boats(req, user_id) {
  //const q = datastore.createQuery(LOAD);
  var query = datastore.createQuery(BOAT).filter("user", "=", user_id).limit(5);
  var results = {};
  console.log("query results first are: ", query);

  var query_size = datastore.createQuery(BOAT).filter("user", "=", user_id);
  var number = await datastore.runQuery(query_size);
  console.log("get_boats NUMBER size is: ", number[0]);
  // Searches our query for the word "cursor", if found,
  // it starts the query there each round
  if (Object.keys(req.query).includes("cursor")) {
    query = query.start(req.query.cursor);
  }
  console.log("query results before are: ", query);

  // Run our query and create our output object by adding
  // a limited number of results and a hard coded link
  // if there are even more results:
  return datastore.runQuery(query).then((entities) => {
    console.log("query results are: ", entities);
    results["items"] = entities[0].map(fromDatastore);

    if (entities[1].moreResults !== "NO_MORE_RESULTS") {
      results["next"] = selfURL + "/boats/?cursor=" + entities[1].endCursor;
      results["quantity"] = number[0].length;
    }
    return results;
  });
}
async function get_loads(req) {
  //const q = datastore.createQuery(LOAD);
  var query = datastore.createQuery(LOAD).limit(5);
  var results = {};

  var query_size = datastore.createQuery(LOAD);
  var number = await datastore.runQuery(query_size);
  console.log("get_loads NUMBER size is: ", number[0]);
  // Searches our query for the word "cursor", if found,
  // it starts the query there each round
  if (Object.keys(req.query).includes("cursor")) {
    query = query.start(req.query.cursor);
  }
  console.log("query results before are: ", query);

  // Run our query and create our output object by adding
  // a limited number of results and a hard coded link
  // if there are even more results:
  return datastore.runQuery(query).then((entities) => {
    console.log("query results are: ", entities);
    results["items"] = entities[0].map(fromDatastore);
    if (entities[1].moreResults !== "NO_MORE_RESULTS") {
      results["next"] = selfURL + "/loads/?cursor=" + entities[1].endCursor;
      results["quantity"] = number[0].length;
    }
    return results;
  });
}

async function runPageQuery(pageCursor) {
  let query = datastore.createQuery(LOAD).limit(6);

  if (pageCursor) {
    query = query.start(pageCursor);
  }
  const results = await datastore.runQuery(query);
  const entities = results[0];
  const info = results[1];

  if (info.moreResults !== Datastore.NO_MORE_RESULTS) {
    // If there are more results to retrieve, the end cursor is
    // automatically set on `info`. To get this value directly, access
    // the `endCursor` property.
    const results = await runPageQuery(info.endCursor);

    // Concatenate entities
    results[0] = entities.concat(results[0]);
    return results;
  }

  return [entities, info];
}

async function get_users() {
  const q = datastore.createQuery(USER);
  var user_entities = await datastore.runQuery(q);
  return user_entities[0];
}

/* ------------- Unused Functions: Delete Later ------------- */
// This set functions to retrieve the user or boat id's from a boat
// and to edit boats and loats:

async function get_userId_from_boat(boatId) {
  var boat_entity = await get_boat(boatId);
  if (boat_entity.user) {
    console.log(
      "get_userId_from_boat Boat entity format is: ",
      boat_entity,
      boat_entity.user.id
    );
    return boat_entity.user.id;
  }
}
// async function get_user_id_from_user(boatId) {
//   var boat_entity = await get_boat(boatId);
//   if (boat_entity.user) {
//     console.log(
//       "get_userId_from_boat Boat entity format is: ",
//       boat_entity,
//       boat_entity.user.id
//     );
//     return boat_entity.user.id;
//   }
// }
async function get_loadId_from_boat(boatId) {
  var boat_entity = await get_boat(boatId);
  console.log("get_loadId_from_boat Boat entity format is: ", boat_entity);
  var collect_boat_load_ids = [];

  boat_entity.loads.forEach((load) => {
    collect_boat_load_ids.push(String(load.id));
  });
  console.log("Boat entity collect_boat_load_ids  is: ", collect_boat_load_ids);

  return collect_boat_load_ids;
}

/* ------------- Helper Checker Functions ------------- */
// Checking functions to ensure only valid actions happen:
//    ex: remove load only if load exists on boat

// Checks if user exists:
async function check_if_user_exists(userId) {
  const users = datastore.createQuery(USER);
  var user_entities = await datastore.runQuery(users);
  var collect_user_ids = [];
  user_entities[0].forEach((user) => {
    collect_user_ids.push(user.id);
  });
  console.log(
    "check_if_user_exists: ",
    userId,
    collect_user_ids.includes(String(userId)),
    collect_user_ids
  );
  return collect_user_ids.includes(userId);
}

// Checks if boat exists:
async function check_if_boat_exists(boatId) {
  const boats = datastore.createQuery(BOAT);
  var boat_entities = await datastore.runQuery(boats);
  var collect_boat_ids = [];
  boat_entities[0].forEach((boat) => {
    collect_boat_ids.push(boat.id);
    console.log(boat.id);
  });
  console.log(
    "check_if_boat_exists",
    boatId,
    collect_boat_ids.includes(boatId),
    collect_boat_ids
  );
  return collect_boat_ids.includes(boatId); // false
}

// Checks if load exists:
async function check_if_load_exists(loadId) {
  const loads = datastore.createQuery(LOAD);
  var load_entities = await datastore.runQuery(loads);
  var collect_load_ids = [];
  load_entities[0].forEach((load) => {
    collect_load_ids.push(String(load.id)); //collect_load_ids.push(String(load.id)); ??
    console.log(typeof load.id, load.id);
  });
  console.log(
    "check_if_load_exists",
    loadId,
    collect_load_ids.includes(loadId),
    collect_load_ids
  );
  return collect_load_ids.includes(loadId); // true
}

// Checks if load exists:
async function check_if_load_exists_on_boats(loadId) {
  const boats = datastore.createQuery(BOAT);
  var boat_entities = await datastore.runQuery(boats);
  var collect_load_ids = [];
  boat_entities[0].forEach((boat) => {
    if (boat.loads.length > 0) {
      console.log(
        "check_if_load_exists_on_boats loop: ",
        boat.loads,
        boat.loads[0].id
      );
      for (load in boat.loads) {
        collect_load_ids.push(String(load)); //collect_load_ids.push(String(load.id)); ??
      }
    }
  });
  console.log("check_if_load_exists_on_boats: ", collect_load_ids, loadId);
  return collect_load_ids.includes(loadId); // true
}

// This test checks if a specific load is currently on a boat:
//    ----> If it passes, perform add_load_to_boat function
async function check_if_load_already_on_boat(loadId) {
  const loads = datastore.createQuery(LOAD);
  const boats = datastore.createQuery(BOAT);
  var load_entities = await datastore.runQuery(loads);
  var boat_entities = await datastore.runQuery(boats);
  var collect_boat_load_ids = [];
  console.log("check_if_load_already_on_boat :", boat_entities[0]);
  if (boat_entities[0]) {
    boat_entities[0].forEach((boat) => {
      boat.loads.forEach((load) => {
        collect_boat_load_ids.push(String(load.id));
      });
    });
  }
  console.log(
    "check_if_load_already_on_boat",
    loadId,
    collect_boat_load_ids.includes(loadId),
    collect_boat_load_ids
  );
  return collect_boat_load_ids.includes(loadId);
}

// Checks status of boats current ownership:
//     ----> If it passes with check_if_user_already_has_any_boat,
//           assign boat to user
async function check_if_boat_already_assigned(boatId) {
  const boats = datastore.createQuery(BOAT);
  var boat_entities = await datastore.runQuery(boats);
  var collect_boat_user_ids = [];
  boat_entities[0].forEach((boat) => {
    collect_boat_user_ids.push(boat.user);
    console.log(boat.id);
  });
  // Return true if boat is already assigned to a user:
  return collect_boat_user_ids.includes(boatId);
}

// Checks status for if a user is assigned to any specific boat:
//     ----> If it passes with check_if_boat_already_assigned,
//           assign boat to user
async function check_if_user_already_has_any_boat(boatId, userId) {
  var user_key = datastore.key([USER, parseInt(userId, 10)]);
  var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]);
  var user_entity = await datastore.get(user_key);
  var boat_entity = await datastore.get(boat_key);
  console.log(
    "Check if any boats assigned to user: UserE, UEntity.boat, boatId: ",
    user_entity,
    user_entity.boat,
    boatId
  );
  if (user_entity[0].boat) {
    return user_entity[0].boat.id == boatId;
  } else {
    return user_entity[0].boat;
  }
  // Return true if user has the boat or a boat:
  //return user_entity.boat.id == boatId || user_entity.boat != null;
}

// Checks status for if a user is assigned to any boat:
//     ----> If it passes, de-assign boat from user
async function check_if_user_already_has_boat(boatId, userId) {
  var user_key = datastore.key([USER, parseInt(userId, 10)]);
  var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]);
  var user_entity = await datastore.get(user_key);
  var boat_entity = await datastore.get(boat_key);
  console.log(
    "check_if_user_already_has_boat: ",
    user_entity[0],
    user_entity[0].boat
  );
  // Return true if user has the boat:
  if (user_entity[0].boat) {
    return user_entity[0].boat.id == boatId;
  } else {
    return false;
  }
}

// This test checks if a specific load is present on a specific boat:
//     ----> If it passes, remove_load_on_boat
async function check_if_boat_already_has_load_on_it(boatId, loadId) {
  var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]);
  var boat_entity = await datastore.get(boat_key);
  var collect_boat_load_ids = [];
  boat_entity[0].loads.forEach((load) => {
    collect_boat_load_ids.push(String(load.id));
  });

  return collect_boat_load_ids.includes(loadId);
}

/* ------------- Helper Update Functions ------------- */
// Performs the main updating between connected or soon to be
// connected entity records. Action parameter takes remove or add:
//      "add": connects/adds an entity record to another entity record
//      "remove": disconnects/removes an entity record from another entity record
//      eg: "add" a load to a boat & "remove" a load from a boat
//      eg: "remove" to "deassign" a boat from a user

// To update a load's carrier:
async function update_carrier_on_load(boatId, loadId, action) {
  // update_boat_for_user
  var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]);
  var load_key = datastore.key([LOAD, parseInt(loadId, 10)]);
  var boat_entity = await datastore.get(boat_key);
  var load_entity = await datastore.get(load_key);
  var id = load_entity[0].id;
  var self = load_entity[0].self;
  let carrier = null;
  var item = load_entity[0].item;
  var volume = load_entity[0].volume;
  var creation_date = load_entity[0].creation_date;
  console.log("update_carrier_on_load's action: ", action, boat_entity[0]);
  if (action == "add") {
    // load's carrier will be retrived boat entity
    carrier = {
      id: boat_entity[0].id,
      self: boat_entity[0].self,
    };
    console.log(
      "update_carrier_on_load INLOOP's add carrier is: ",
      carrier,
      typeof carrier
    );
  } else if (action == "remove") {
    // load's carrier will be retrived boat entity
    carrier = null;
    console.log(
      "update_carrier_on_load INLOOP's remove carrier is: ",
      carrier,
      typeof carrier
    );
  }
  console.log("update_carrier_on_load's carrier is: ", carrier, action);
  const updated_carrier_on_load = {
    id: id,
    volume: volume,
    carrier: carrier, // load's carrier will be removed
    item: item,
    creation_date: creation_date,
    self: self,
  };
  console.log(
    "update_carrier_on_load's updated_carrier_on_load is: ",
    updated_carrier_on_load
  );
  var returned_entity = await datastore.save({
    key: load_key,
    data: updated_carrier_on_load,
  });
  return returned_entity; // returns load entity key
}

// To update a boat's load:
async function update_loads_on_boat(boatId, loadId, action) {
  var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]);
  var load_key = datastore.key([LOAD, parseInt(loadId, 10)]);
  var boat_entity = await datastore.get(boat_key);
  var load_entity = await datastore.get(load_key);
  var length = boat_entity[0].length;
  var id = boat_entity[0].id;
  var self = boat_entity[0].self;
  var type = boat_entity[0].type;
  var name = boat_entity[0].name;
  var user = boat_entity[0].user;
  var boat_loads = boat_entity[0].loads;
  console.log("update_loads_on_boat BEFORE spliced item: ", boat_loads);

  if (action == "add") {
    // add load to our boat:
    boat_loads.push({ id: load_entity[0].id, self: load_entity[0].self });
  } else if (action == "remove") {
    // Iterate through boat's loads to find load id. Then splice it out:
    let spliced_idx = -1;
    for (let idx = 0; idx < boat_loads.length; idx++) {
      if (boat_loads[idx].id == loadId) {
        spliced_idx = idx;
      }
    }
    if (spliced_idx > -1) boat_loads.splice(spliced_idx, 1);
  }
  console.log("update_loads_on_boat After spliced item: ", boat_loads);
  // send updated boat entity to datastore:
  const updated_boat_entity = {
    length: length,
    id: id,
    self: self,
    type: type,
    name: name,
    user: user,
    loads: boat_loads,
  };
  var returned_entity = await datastore.save({
    key: boat_key,
    data: updated_boat_entity,
  });
  return boatId; // returns boat entity key
}

// To update a user's boat assignment:
async function update_boat_for_user(boatId, userSub, action) {
  var collect_users = await get_users();
  let userId = 0;
  console.log("collect_users is: ", collect_users);
  for (var user in collect_users) {
    console.log(
      "User is: ",
      user,
      collect_users[user].user_id,
      userSub,
      collect_users[user].id
    );
    if (collect_users[user].user_id == userSub) {
      userId = collect_users[user].id;
    }
  }
  // update_carrier_on_load
  var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]);
  var user_key = datastore.key([USER, parseInt(userId, 10)]);
  var boat_entity = await datastore.get(boat_key);
  var user_entity = await datastore.get(user_key);
  console.log("update_boat_for_user's user_entity is: ", boat_key, user_key);
  var id = user_entity[0].id;
  var boat_array = user_entity[0].boat;
  var user_id = user_entity[0].user_id;
  var self = user_entity[0].self;
  // if (action == "add") {
  //   // assign boat to user:
  //   boat = { id: boat_entity[0].id, self: boat_entity[0].self };
  // } else if (action == "remove") {
  //   // remove boat assigned to user:
  //   boat = null;
  // }
  console.log("What is boat array: ", boat_array);
  if (action == "add") {
    // add load to our boat:
    boat_array.push({ id: boat_entity[0].id, self: boat_entity[0].self });
  } else if (action == "remove") {
    // Iterate through boat's loads to find load id. Then splice it out:
    let spliced_idx = -1;
    for (let idx = 0; idx < boat_array.length; idx++) {
      if (boat_array[idx].id == boatId) {
        spliced_idx = idx;
      }
    }
    if (spliced_idx > -1) boat_array.splice(spliced_idx, 1);
  }
  const updated_boat_for_user = {
    id: id,
    boat: boat_array, // user's assigned boat will be updated
    user_id: user_id,
    self: self,
  };
  await datastore.save({
    key: user_key,
    data: updated_boat_for_user,
  });
  return boatId; // returns user entity key
}

// To update a boat's owner/user:
async function update_user_assigned_to_boat(boatId, userId, action) {
  var user_key = datastore.key([USER, parseInt(userId, 10)]);
  var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]);
  var user_entity = await datastore.get(user_key);
  var boat_entity = await datastore.get(boat_key);
  console.log("update_user_assigned_to_boat boat_entity: ", boat_entity);
  var id = boat_entity[0].id;
  var type = boat_entity[0].type;
  var name = boat_entity[0].name;
  var self = boat_entity[0].self;
  var length = boat_entity[0].length;
  let user = boat_entity[0].user;
  let loads = boat_entity[0].loads;
  if (action == "add") {
    // assign boat to user:
    user = { id: user_entity[0].id, self: user_entity[0].self };
  } else if (action == "remove") {
    // remove boat assigned to user:
    user = null;
  }
  const updated_user_on_boat = {
    id: id,
    type: type,
    user: user, // boat's current user will be updated
    name: name,
    self: self,
    length: length,
    loads: loads,
  };
  console.log(
    "update_user_assigned_to_boat updated_user_on_boat: ",
    updated_user_on_boat
  );
  try {
    var result = await datastore.save({
      key: boat_key,
      data: updated_user_on_boat,
    });
    return boatId;
  } catch (error) {
    console.error(error);
  }
  // return datastore
  //   .save({
  //     key: boat_key,
  //     data: updated_user_on_boat,
  //   })
  //   .then(() => {
  //     return boatId; // returns boat entity key
  //   });
}

/* ------------- Parent Entity Relating Functions ------------- */
// Parent function which create relationships between entity records:
// Performs function by calling other functions: The checking functions
// to see if the action is valid and if so, the update functions to perform
// the actual valid actions(add or remove items from an entity record)

// To add a load to a boat:
async function add_load_to_boat(boatId, loadId) {
  let boat_exists = await check_if_boat_exists(boatId);
  let load_exists = await check_if_load_exists(loadId);
  console.log(
    "Exist results: ",
    boat_exists,
    load_exists,
    boat_exists && load_exists,
    !(boat_exists && load_exists)
  );
  if (!(boat_exists && load_exists)) {
    return "The specified boat and/or load does not exist";
  }
  let check_boat = await check_if_load_already_on_boat(loadId);
  if (check_boat) {
    return "The load is already loaded on another boat";
  }
  let updated_boat_key = await update_loads_on_boat(boatId, loadId, "add");
  let updated_load_key = await update_carrier_on_load(boatId, loadId, "add");

  // Unneeded because we are just copying the id and self:
  // // Get userId from boat:
  // let userId = await get_userId_from_boat(boatId);
  // // Update Load with updated boat:
  // if (userId) {
  //   await update_boat_for_user(boatId, userId, "add");
  // }

  // // Repeat to update the details in each property
  // let updated_boat_key2 = await update_loads_on_boat(boatId, loadId, "add");
  // let updated_load_key2 = await update_carrier_on_load(boatId, loadId, "add");
  // if (userId) {
  //   await update_boat_for_user(boatId, userId, "add");
  // }
  // Then return:
  if (updated_boat_key && updated_load_key) {
    return "load added to boat";
  }
}

// To remove a load from a boat:
async function remove_load_on_boat(boatId, loadId) {
  let boat_exists = await check_if_boat_exists(boatId);
  let load_exists = await check_if_load_exists(loadId);
  console.log(
    "Exist results: ",
    boat_exists,
    load_exists,
    boat_exists && load_exists,
    !(boat_exists && load_exists)
  );
  if (!boat_exists) {
    return "The specified boat and/or load does not exist";
  }
  if (!load_exists) {
    return "The specified boat and/or load does not exist";
  }
  let check_boat = await check_if_boat_already_has_load_on_it(boatId, loadId);
  if (!check_boat) {
    return "Boat doesn't have given load on it";
  }
  let updated_boat_key = await update_loads_on_boat(boatId, loadId, "remove");
  let updated_load_key = await update_carrier_on_load(boatId, loadId, "remove");

  // Unneeded because just updating id and self:
  // // Get userId from boat:
  // let userId = await get_userId_from_boat(boatId);
  // console.log("remove_load_on_boat's returned userId is: ", userId);
  // // Update Load with updated boat:
  // if (userId) {
  //   await update_boat_for_user(boatId, userId, "add");
  // }

  // Then return:
  if (updated_boat_key && updated_load_key) {
    return "load removed from boat";
  }
}

// To assign a boat to a user:
async function assign_boat_to_user(boatId, userId) {
  // Check if boat and user exist:
  let boat_exists = await check_if_boat_exists(boatId);
  let user_exists = await check_if_user_exists(userId);
  console.log(
    "entity exist checker: ",
    boat_exists,
    user_exists,
    "boat user ids are: ",
    boatId,
    userId
  );
  if (!boat_exists || !user_exists) {
    return "The specified boat and/or user does not exist";
  }

  // Check if boat is already assigned, if so return error:
  let is_boat_assigned = await check_if_boat_already_assigned(boatId);
  if (is_boat_assigned) {
    return "Boat is already assigned, boat can only have one owner";
  }
  // Check if user already has any boat assigned, if so return error:
  let boat_on_user = await check_if_user_already_has_any_boat(boatId, userId);
  if (boat_on_user) {
    return "user is assigned a boat, user can't have more than one assigned boat";
  }

  // Boat is not already assigned & user is not assigned a boat, so assign:
  let updated_user_key = await update_user_assigned_to_boat(
    boatId,
    userId,
    "add"
  );
  let updated_boat_key = await update_boat_for_user(boatId, userId, "add");

  // // Get loadId from boat:
  // let loadIds = await get_loadId_from_boat(boatId);
  // // Update Load with updated boat:
  // if (loadIds) {
  //   for (const loadId of loadIds) {
  //     await update_carrier_on_load(boatId, loadId, "add");
  //   }
  // }

  // Or use Promise.all:
  // await Promise.all(
  //   loadIds.map(async (loadId) => {
  //     const contents = update_carrier_on_load(boatId, loadId, "add");
  //     console.log(contents);
  //   })
  // );

  //let updated_load_key = await update_carrier_on_load(boatId, loadId, "add");
  // Repeat to update the details in each property

  // let updated_user_key2 = await update_user_assigned_to_boat(
  //   boatId,
  //   userId,
  //   "add"
  // );
  // let updated_boat_key2 = await update_boat_for_user(boatId, userId, "add");

  // if (loadIds) {
  //   for (const loadId of loadIds) {
  //     await update_carrier_on_load(boatId, loadId, "add");
  //   }
  // }
  // Then return:
  if (updated_boat_key && updated_user_key) {
    return "boat added to user";
  }
}

// To remove the assigned boat from a user:
async function deassign_boat_from_user(boatId, userId) {
  // Check if boat and user exist:
  let boat_exists = await check_if_boat_exists(boatId);
  let user_exists = await check_if_user_exists(userId);
  console.log(
    "entity exist checker: ",
    boat_exists,
    user_exists,
    "boat user ids are: ",
    boatId,
    userId
  );
  if (!boat_exists || !user_exists) {
    return "The specified boat and/or user does not exist";
  }

  // Check if given boat on this user, if not, return error:
  let boat_on_user = await check_if_user_already_has_boat(boatId, userId);
  if (boat_on_user == false) {
    return "boat is not assigned to user";
  }

  // Else, remove boat to user and remove user to boat:
  let updated_user_key = await update_user_assigned_to_boat(
    boatId,
    userId,
    "remove"
  );
  let updated_boat_key = await update_boat_for_user(boatId, userId, "remove");

  // Unneeded because we are just updating id and self:
  // // Get loadId from boat:
  // let loadIds = await get_loadId_from_boat(boatId);
  // // Update Load with updated boat:
  // if (loadIds) {
  //   for (const loadId of loadIds) {
  //     await update_carrier_on_load(boatId, loadId, "add");
  //   }
  // }

  // Then return:
  if (updated_boat_key && updated_user_key) {
    return "boat added to user";
  }
}

/* ------------- Non-User Entity Editing Functions ------------- */
// These functions perform the put, patch and delete operations on
// the non-user entities and updates any entity that has a relationship
// with it:
//      eg: if a load is on a boat. Updating the load will update the
//          boat that is related to that load from a prior HTTPS request:

async function delete_boat(boatId, jwt_user_id) {
  var boat_exists = await check_if_boat_exists(boatId);
  if (!boat_exists) {
    return "No Boat with given Boat Id exists";
  }
  var boat_entity = await get_boat(boatId);
  console.log("delete_boat: get boat: ", boat_entity);
  if (boat_entity.user == jwt_user_id) {
    console.log("delete_boat jwt matches");
    var boat_key = datastore.key([BOAT, parseInt(boatId, 10)]); // for datastore.delete()
    var boat_entity = await get_boat(boatId);
    // Boats will always have a user because they can only be made by a registered user?
    if (boat_entity.user) {
      //let boat_userId = await get_user_id_from_user(boatId);
      console.log(
        "delete_boat boat_entity.user: get boat: ",
        boat_entity,
        boat_entity.user,
        boat_entity.user.user_id
      );
      await update_boat_for_user(boatId, boat_entity.user, "remove");
      // Perform delete function and update any entities boat is related to
      // only if the supplied user_id from the JWT equals the user_id of the boat
      // that is requested to be deleted:
    }
    for (const boat_load of boat_entity.loads) {
      // Updates carrier of each load on the boat
      await update_carrier_on_load(boat_entity.id, boat_load.id, "remove");

      return datastore.delete(boat_key);
    }
  } else {
    return "Verification failed: JWT is valid but accessing other user's boat";
  }

  // Don't use forEach, can't use await with it: https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop
  // boat_entity.loads.forEach((boat_load) => {
  //   update_carrier_on_load(boat_entity.id, boat_load.id, "remove");
  // });
}

async function delete_load(loadId) {
  var load_exists = await check_if_load_exists(loadId);
  if (!load_exists) {
    return "No Load with given Load Id exists";
  }
  var load_key = datastore.key([LOAD, parseInt(loadId, 10)]); // for datastore.delete()
  var load_entity = await get_load(loadId);
  if (load_entity.carrier) {
    var boatId = await update_loads_on_boat(
      load_entity.carrier.id,
      String(load_entity.id),
      "remove"
    );
    // var boat_entity = await get_boat(boatId);
    // console.log(
    //   "delete_load Boat entity is: ",
    //   boat_entity,
    //   "Boat id is: ",
    //   boatId
    // );
    // if (boat_entity.user) {
    //   let userId = await get_userId_from_boat(boatId);
    //   await update_boat_for_user(boatId, userId, "add");
    // }
  }
  return datastore.delete(load_key);
}

/* ------------- Begin Controller Functions ------------- */

// Test Endpoint:
app.get("/", function (req, res) {
  res.status(200).json("Hello World");
});

/* ------------- Controller Functions: OAuth2 endpoint ------------- */

// User authorization gets returned here. Renders back the id_token:
app.get("/oauth", (req, res) => {
  // Make axios call to get user_id and jwt items:
  let names = get_jwt(req.query.code).then((data) => {
    console.log("names are: ", data);
    console.log("main are: ", data.access_token, data.id_token);
    res.send(
      `<h3>USER INFO PAGE</h3> <br> <strong>User Id(sub property of JWT Token)</strong> is ${data.sub} <br>  <br> <strong>Access Code</strong> is ${data.access_token} <br> <strong>JWT</strong> is ${data.id_token}`
    );
    //res.redirect(redirect_uri);
  });
});

/* ------------- Controller Functions: Unprotected Entity endpoints ------------- */

app
  .route("/loads")
  .get((req, res) => {
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    const boat = get_loads(req).then((boat) => {
      res.status(200).json(boat);
    });
  })
  .post((req, res) => {
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    if (!req.body.volume || !req.body.item || !req.body.creation_date) {
      res.status(400).json({
        Error:
          "The request object is missing at least one of the required attributes",
      });
    } else {
      post_load(req.body.volume, req.body.item, req.body.creation_date).then(
        (key) => {
          post_load_id(
            req.body.volume,
            req.body.item,
            req.body.creation_date,
            key.id
          ).then((entity) => {
            res.status(201).json(entity);
          });
        }
      );
    }
  })
  .patch((req, res) => {
    res.set("Accept", ["GET", "POST"]);
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .put((req, res) => {
    res.set("Accept", ["GET", "POST"]);
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .delete((req, res) => {
    res.set("Accept", ["GET", "POST"]);
    res.status(405).json({ Error: "405 Method Not Allowed" });
  });

app
  .route("/loads/:id")
  // Retrieves a load entity record if it exists:
  .get((req, res) => {
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    console.log("I am here get /loads/:id");
    get_load(req.params.id).then((result) => {
      if (result != "No Load with given Load Id exists") {
        // Return the 0th element which is the lodging with this id
        res.status(200).json(result);
      }
      if ((result = "No Load with given Load Id exists")) {
        // The 0th element is undefined. This means there is no lodging with this id
        res
          .status(404)
          .json({ Error: "404 Not Found: No load with this load_id exists" });
      }
    });
  })
  .post((req, res) => {
    res.set("Accept", ["GET", "PATCH", "PUT", "DELETE"]);
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .put((req, res) => {
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    if (
      !req.body.item ||
      !req.body.volume ||
      !req.body.creation_date ||
      !req.body.carrier
    ) {
      res.status(400).json({
        Error:
          "400 Bad Request: The request object is missing at least one of the required attributes",
      });
    } else {
      put_load(
        req.params.id,
        req.body.item,
        req.body.volume,
        req.body.creation_date,
        req.body.carrier
      ).then((result) => {
        if (result != "No Load with given Load Id exists") {
          // Return the 0th element which is the lodging with this id
          res.status(200).json(result);
        }
        if ((result = "No Load with given Load Id exists")) {
          // The 0th element is undefined. This means there is no lodging with this id
          res
            .status(404)
            .json({ Error: "404 Not Found: No load with this load_id exists" });
        }
      });
    }
  })
  .patch((req, res) => {
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    patch_load(
      req.params.id,
      req.body.item,
      req.body.volume,
      req.body.creation_date,
      req.body.carrier
    ).then((result) => {
      if (result != "No Load with given Load Id exists") {
        // Return the 0th element which is the lodging with this id
        res.status(200).json(result);
      }
      if ((result = "No Load with given Load Id exists")) {
        // The 0th element is undefined. This means there is no lodging with this id
        res
          .status(404)
          .json({ Error: "404 Not Found: No load with this load_id exists" });
      }
    });
  })
  .delete((req, res) => {
    delete_load(req.params.id).then((result) => {
      console.log("returned get load idx entity is: ", result);
      if (result != "No Load with given Load Id exists") {
        // Return the 0th element which is the lodging with this id
        res.status(204).end();
      }
      if ((result = "No Load with given Load Id exists")) {
        // The 0th element is undefined. This means there is no lodging with this id
        res
          .status(404)
          .json({ Error: "404 Not Found: No load with this load_id exists" });
      }
    });
  });

// Adds a load to a boat if both exist:
app.put("/boats/:boatId/loads/:loadId", function (req, res) {
  add_load_to_boat(req.params.boatId, req.params.loadId).then((result) => {
    if (result == "The specified boat and/or load does not exist") {
      res.status(404).json({
        Error: "404 Not Found: The specified boat and/or load does not exist",
      });
    } else if (result == "The load is already loaded on another boat") {
      res.status(403).json({
        Error: "403 Forbidden: The load is already loaded on another boat",
      });
    } else if (result == "load added to boat") {
      res.status(204).json("Success");
    }
  });
});

// Removes a load from a boat if both exist & the specific load is on the specific boat:
app.delete("/boats/:boatId/loads/:loadId", function (req, res) {
  remove_load_on_boat(req.params.boatId, req.params.loadId).then((result) => {
    if (result == "The specified boat and/or load does not exist") {
      res.status(404).json({
        Error:
          "404 Not Found: No boat with this boat_id is loaded with the load with this load_id", // ???
      });
    } else if (result == "Boat doesn't have given load on it") {
      res.status(404).json({
        Error:
          "404 Not Found: No boat with this boat_id is loaded with the load with this load_id",
      });
    } else if (result == "load removed from boat") {
      res.status(204).json("Success");
    }
  });
});

/* ------------- Controller Functions: Protected Entity endpoints ------------- */

app
  .route("/boats")
  .get((req, res) => {
    console.log("I am in app.get/boats rn");
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    // If JWT missing or not valid, return public boats only:
    // Invalid or missing JWT -> return 401
    if (!req.headers.authorization) {
      console.log(
        "Missing JWT token--> return 401: ",
        req.headers.authorization
      );
      res.status(401).json({
        Error:
          "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
      });
    } else if (req.headers.authorization.substring(0, 6) != "Bearer") {
      console.log("Bad JWT token--> return 401: ", req.headers.authorization);
      res.status(401).json({
        Error:
          "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
      });
    } else {
      // If JWT valid, return owner boats even if empty. If invalid boats, return public boats only:
      const next_token = req.headers.authorization.substring("Bearer ".length);
      console.log(next_token);
      const get_sub = verify(next_token);
      get_sub
        .then((jwt_user_id) => {
          if (jwt_user_id) {
            get_boats(req, jwt_user_id)
              .then((entity) => {
                console.log("Entity is: ", entity);
                res.status(200).json(entity);
              })
              .catch((e) => console.error(e));
          } else {
            res.status(401).end();
          }
        })
        .catch(() => {
          console.log("catch: ", req.body.name, req.body.type, req.body.length);
          res.status(401).json({
            Error:
              "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
          });
        });
    }
  })
  .post((req, res) => {
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    if (req.get("content-type") !== "application/json") {
      res.status(415).json({
        Error:
          "415 Unsupported Media Type: Server only accepts application/json data.",
      });
    }
    // Invalid or missing JWT -> return 401
    if (!req.headers.authorization) {
      console.log(
        "Missing JWT token--> return 401: ",
        req.headers.authorization
      );
      res.status(401).json({
        Error:
          "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
      });
    } else if (req.headers.authorization.substring(0, 6) != "Bearer") {
      console.log("Bad JWT token--> return 401: ", req.headers.authorization);
      res.status(401).json({
        Error:
          "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
      });
    } else {
      console.log("POST boat else clause called");
      const next_token = req.headers.authorization.substring("Bearer ".length);
      console.log(next_token);
      const get_sub = verify(next_token);
      get_sub
        .then((jwt_user_id) => {
          console.log("Sub value is: ", jwt_user_id);
          if (!req.body.name || !req.body.type || !req.body.length) {
            res.status(400).json({
              Error:
                "400 Bad Request: The request object is missing at least one of the required attributes",
            });
            return;
          }
          if (jwt_user_id) {
            post_boat(
              req.body.name,
              req.body.type,
              req.body.length,
              jwt_user_id // Change this!
            ).then((entity) => {
              console.log("Final POST Boat Entity is: ", entity);
              add_boat_to_user_helper(entity).then((entity) => {
                res.status(201).json(entity);
              });
            });
          } else {
            console.log(
              "get_sub ELSE: ",
              req.body.name,
              req.body.type,
              req.body.length,
              jwt_user_id
            );
            res.status(401).end();
          }
        })
        .catch(() => {
          console.log("catch: ", req.body.name, req.body.type, req.body.length);
          res.status(401).json({
            Error:
              "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
          });
        });
    }
  })
  .patch((req, res) => {
    res.set("Accept", ["GET", "POST"]);
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .put((req, res) => {
    res.set("Accept", ["GET", "POST"]);
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .delete((req, res) => {
    res.set("Accept", ["GET", "POST"]);
    res.status(405).json({ Error: "405 Method Not Allowed" });
  });

app
  .route("/users")
  .get((req, res) => {
    const accepts = req.accepts(["application/json"]);
    if (!accepts) {
      res.status(406).json({
        Error:
          "406 Not Acceptable: Server only offers application/json media type",
      });
    }
    get_users().then((users) => {
      res.status(200).json(users);
    });
  })
  .post((req, res) => {
    res.set("Accept", "GET");
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .patch((req, res) => {
    res.set("Accept", "GET");
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .put((req, res) => {
    res.set("Accept", "GET");
    res.status(405).json({ Error: "405 Method Not Allowed" });
  })
  .delete((req, res) => {
    res.set("Accept", "GET");
    res.status(405).json({ Error: "405 Method Not Allowed" });
  });

app.get("/boats/:id", function (req, res) {
  console.log("I am in app.get/boats rn");
  // If JWT missing or not valid, return public boats only:
  const accepts = req.accepts(["application/json"]);
  if (!accepts) {
    res.status(406).json({
      Error:
        "406 Not Acceptable: Server only offers application/json media type",
    });
  }
  if (!req.headers.authorization) {
    console.log("Missing JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else if (req.headers.authorization.substring(0, 6) != "Bearer") {
    console.log("Bad JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else {
    // If JWT valid, return owner boats even if empty. If invalid boats, return public boats only:
    console.log("I am in app.get/boats else rn");

    const next_token = req.headers.authorization.substring("Bearer ".length);
    console.log(next_token);
    const get_sub = verify(next_token);
    get_sub
      .then((jwt_user_id) => {
        if (jwt_user_id) {
          get_user_boat(req.params.id, jwt_user_id).then((result) => {
            console.log(
              "returned get boat idx entity is: ",
              result,
              req.params.id,
              jwt_user_id
            );
            if (result == "No Boat with given Boat Id exists") {
              res.status(404).json({
                Error: "404 Not Found: No Boat with given Boat Id exists",
              });
            }
            if (
              result ==
              "Verification failed: JWT is valid but accessing other user's boat"
            ) {
              res.status(401).json({
                Error:
                  "401 Unauthorized: Verification failed: JWT is valid but accessing another user's boat",
              });
            } else {
              // Return the 0th element which is the lodging with this id

              res.status(200).json(result);
            }
          });
        } else {
          res.status(401).end();
        }
      })
      .catch(() => {
        console.log("catch bad JWT: ");
        res.status(401).json({
          Error:
            "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
        });
      });
  }
});

// NO POST
app.post("/boats/:id", (req, res) => {
  res.set("Accept", ["GET", "PATCH", "PUT", "DELETE"]);
  res.status(405).json({ Error: "405 Method Not Allowed" });
});

app.put("/boats/:id", (req, res) => {
  const accepts = req.accepts(["application/json"]);
  if (!accepts) {
    res.status(406).json({
      Error:
        "406 Not Acceptable: Server only offers application/json media type",
    });
  }
  // Invalid or missing JWT -> return 401

  // Invalid or missing JWT -> return 401
  if (!req.headers.authorization) {
    console.log("Missing JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else if (req.headers.authorization.substring(0, 6) != "Bearer") {
    console.log("Bad JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else {
    console.log("PUT boat else clause called");
    const next_token = req.headers.authorization.substring("Bearer ".length);
    console.log("next_token should be a promise: ", next_token);
    const get_sub = verify(next_token);
    get_sub
      .then((jwt_user_id) => {
        console.log("Sub value is: ", jwt_user_id);
        if (jwt_user_id) {
          if (
            !req.body.name ||
            !req.body.type ||
            !req.body.length ||
            !req.body.loads
          ) {
            res.status(400).json({
              Error:
                "400 Bad Request: The request object is missing at least one of the required attributes",
            });
          }
          put_boat(
            req.params.id,
            req.body.name,
            req.body.type,
            req.body.length,
            req.body.loads,
            jwt_user_id
          ).then((result) => {
            if (
              result ==
              "Verification failed: JWT is valid but accessing other user's boat"
            ) {
              console.log("put_boat verification failed clause");

              res.status(401).json({
                Error:
                  "401 Bad Request: Verification failed: JWT is valid but accessing other user's boat",
              });
            }
            if (result != "No boat with boat id exists") {
              res.status(200).json(result);
            }
            if ((result = "No boat with boat id exists")) {
              res.status(404).json({
                Error: "404 Not Found: No boat with boat id exists",
              });
            }
          });
        }
      })
      .catch(() => {
        console.log("catch: ", req.body.name, req.body.type, req.body.length);
        res.status(401).json({
          Error:
            "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
        });
      });
  }
});

app.patch("/boats/:id", (req, res) => {
  const accepts = req.accepts(["application/json"]);
  if (!accepts) {
    res.status(406).json({
      Error:
        "406 Not Acceptable: Server only offers application/json media type",
    });
  }
  // Invalid or missing JWT -> return 401

  if (!req.headers.authorization) {
    console.log("Missing JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else if (req.headers.authorization.substring(0, 6) != "Bearer") {
    console.log("Bad JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else {
    console.log("PATCH boat else clause called");
    const next_token = req.headers.authorization.substring("Bearer ".length);
    console.log("next_token should be a promise: ", next_token);
    const get_sub = verify(next_token);
    get_sub
      .then((jwt_user_id) => {
        console.log("Sub value is: ", jwt_user_id);
        if (jwt_user_id) {
          patch_boat(
            req.params.id,
            req.body.name,
            req.body.type,
            req.body.length,
            req.body.loads,
            jwt_user_id
          ).then((result) => {
            if (
              result ==
              "Verification failed: JWT is valid but accessing other user's boat"
            ) {
              console.log("put_boat verification failed clause");

              res.status(401).json({
                Error:
                  "401 Bad Request: Verification failed: JWT is valid but accessing other user's boat",
              });
            }
            if (result != "No boat with boat id exists") {
              res.status(200).json(result);
            }
            if ((result = "No boat with boat id exists")) {
              res.status(404).json({
                Error: "404 Not Found: No boat with boat id exists",
              });
            }
          });
        }
      })
      .catch(() => {
        console.log("catch: ", req.body.name, req.body.type, req.body.length);
        res.status(401).json({
          Error:
            "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
        });
      });
  }
});

app.delete("/boats/:id", (req, res) => {
  // Invalid or missing JWT -> return 401
  if (!req.headers.authorization) {
    console.log("Missing JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else if (req.headers.authorization.substring(0, 6) != "Bearer") {
    console.log("Bad JWT token--> return 401: ", req.headers.authorization);
    res.status(401).json({
      Error:
        "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
    });
  } else {
    console.log("DELETE boat else clause called");
    const next_token = req.headers.authorization.substring("Bearer ".length);
    console.log("next_token should be a promise: ", next_token);
    const get_sub = verify(next_token);
    get_sub
      .then((jwt_user_id) => {
        console.log("Sub value is: ", jwt_user_id);
        if (jwt_user_id) {
          delete_boat(req.params.id, jwt_user_id).then((result) => {
            if (result == "No Boat with given Boat Id exists") {
              res.status(404).json({
                Error: "404 Not Found: No Boat with given Boat Id exists",
              });
            }
            if (
              result ==
              "Verification failed: JWT is valid but accessing other user's boat"
            ) {
              res.status(401).json({
                Error:
                  "401 Unauthorized: Verification failed: JWT is valid but accessing another user's boat",
              });
            } else {
              res.status(204).json(result);
            }
          });
        }
      })
      .catch(() => {
        console.log("catch bad JWT: ");
        res.status(401).json({
          Error:
            "401 Unauthorized: User Authentication has failed: Missing JWT token or invalid JWT token",
        });
      });
  }
});

/* ------------- End Controller Functions ------------- */

// Listen to the App Engine-specified port, or 8888 otherwise
const PORT = process.env.PORT || 8888;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});
