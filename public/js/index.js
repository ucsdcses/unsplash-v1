// Get the elements with class="column"
var elements = document.getElementsByClassName("column");

// Declare a "loop" variable
var i = 0;

// fetch the photos by making an API call to our server's /photos
fetch('/photos', {method: 'GET'}).then(function (response) {
  return response.json();
})
.then(function (photoUrls) {
  photoUrls.forEach(element => {
    let col = i % 4;
    let img = document.createElement('img');
    img.src = element;
    elements[col].appendChild(img);
    i++;
  });
});