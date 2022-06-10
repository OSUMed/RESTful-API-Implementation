// open /Applications/Google\ Chrome.app --args --user-data-dir="/var/tmp/Chrome dev session" --disable-web-security
// You need to set the CORS header on your web server. It is disabled
// by default for security reasons.

// Source: Google OAth Docs, https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow#js-client-library_1

const getOathGood = () => {
  // Google's OAuth 2.0 endpoint for requesting an access token
  var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

  // Create <form> element to submit parameters to OAuth 2.0 endpoint.
  var form = document.createElement("form");
  form.setAttribute("method", "GET"); // Send as a GET request.
  form.setAttribute("action", oauth2Endpoint);

  const CLIENTID =
    "1006447667530-ckqvr9acstgi51c54093126uso1nmi6q.apps.googleusercontent.com";
  const CLIENTSECRET = "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";
  const CLIENTID7 =
    "936549727362-pr84u5suvvar213m1u8lb3a2rc14kp32.apps.googleusercontent.com";
  const CLIENTSECRET7 = "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";
  // Homework 7.      /// .com?key=value, .com#key=value
  var params = {
    response_type: "code",
    //redirect_uri: "http://localhost:8888/oauth",
    redirect_uri: "https://finalproject-351702.wl.r.appspot.com/oauth",
    client_id: CLIENTID,
    scope: "https://www.googleapis.com/auth/userinfo.profile",
    include_granted_scopes: "true",
    state: CLIENTSECRET, // use handlebars
    //state: "hello world", // this works too? hmmm...
  };

  // Add form parameters as hidden input values.
  for (var p in params) {
    var input = document.createElement("input");
    input.setAttribute("type", "hidden");
    input.setAttribute("name", p);
    input.setAttribute("value", params[p]);
    form.appendChild(input);
  }

  // Add form to page and submit it to open the OAuth 2.0 endpoint.
  document.body.appendChild(form);
  form.submit();
};
