$(document).ready(function(){
    var config = {
        apiKey: "AIzaSyCvOV_3YvdjP8OtdUx8wMh7-VadYfHUK2g",
        authDomain: "ardunio-project.firebaseapp.com",
        databaseURL: "https://ardunio-project.firebaseio.com",
        storageBucket: "ardunio-project.appspot.com"
    };
    firebase.initializeApp(config);

    var db = firebase.database();

    var potRef = firebase.database().ref('pot/');
    potRef.on('value', function(snapshot) {
        var potReading = snapshot.val().data;
        $('.pot-value').html(potReading);
        console.log(potReading)
    });
})