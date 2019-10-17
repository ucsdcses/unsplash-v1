// Get the elements with class="column"
var elements = document.getElementsByClassName("column");

// Declare a "loop" variable
var i = 0;

// fetch the photos by making an API call to our server's /photos
fetch('/photos', {method: 'GET'}).then(function (response) {
  if (response.status == 200) {
    return response.json();
  } else if (response.status == 404) {
    throw new Error("Could not fetch photos from google cloud storage");
  } else {
    throw new Error("Error communicating with the server");
  }
})
.then(function (photoUrls) {
  photoUrls.forEach(element => {
    let col = i % 4;
    let img = document.createElement('img');
    img.src = element;
    elements[col].appendChild(img);
    i++;
  });
})
.catch(err => alert(err));  // alert the user of the error