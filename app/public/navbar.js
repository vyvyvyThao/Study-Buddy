let myPageBtn = document.getElementById("mypage");
let studySetsBtn = document.getElementById("studysets");
let friendsBtn = document.getElementById("friends");
let logoutBtn = document.getElementById("logout");

myPageBtn.addEventListener("click", () => {
    window.location.href = "/my-page.html";
})

studySetsBtn.addEventListener("click", () => {
    window.location.href = "/study-sets";
});

friendsBtn.addEventListener("click", () => {
    window.location.href = "/friends";
});

logoutBtn.addEventListener("click", () => {
  fetch("/logout", {
    method: "POST",
    credentials: "include",
  }).then((response) => {
    return response.json();
  }).then((body) => {
    window.location.href = "/";
    // window.location = body.url;
  })
});