let signup_button = document.getElementById("signup");
let login_button = document.getElementById("login");

signup_button.addEventListener("click", () => {
  let usernameInput = document.getElementById("signup_username");
  let emailInput = document.getElementById("signup_email");
  let passwordInput = document.getElementById("signup_password");
  let currentDate = new Date();
  let timestampValue = currentDate.toISOString();
  let dateAndTime = timestampValue.split('T');
  let timeVal = dateAndTime[1].split('.');
  let finalTimestampValue = dateAndTime[0] + " " + timeVal[0];
  //console.log(finalTimestampValue);
  let usernameValue = usernameInput.value;
  let emailValue = emailInput.value;
  let passwordValue = passwordInput.value;
  //console.log(username, email, password);
  fetch("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: usernameValue,
      email: emailValue,
      password: passwordValue,
      timestamp: finalTimestampValue
    })
  });
});


login_button.addEventListener("click", () => {
  let usernameInput = document.getElementById("username");
  let passwordInput = document.getElementById("password");
  let currentDate = new Date();
  let timestampValue = currentDate.toISOString();
  let dateAndTime = timestampValue.split('T');
  let timeVal = dateAndTime[1].split('.');
  let lastLoginValue = dateAndTime[0] + " " + timeVal[0];

  let usernameValue = usernameInput.value;
  let passwordValue = passwordInput.value;

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: usernameValue,
      password: passwordValue,
      last_login: lastLoginValue
    })
  }).then((response) => {
    return response.json();
  }).then(body => {
    console.log("BODY: ", body);
    window.location = body.url;
  }).catch((error) => {
    console.log(error);
  })
});