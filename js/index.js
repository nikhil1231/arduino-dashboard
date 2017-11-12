$(document).ready(function(){

    // value from 1 - 100
    var chartlength = 30;

    // determined by python script
    var uploadFreq = 1000;

    // Set up firebase connection
    var config = {
        apiKey: "AIzaSyCvOV_3YvdjP8OtdUx8wMh7-VadYfHUK2g",
        authDomain: "ardunio-project.firebaseapp.com",
        databaseURL: "https://ardunio-project.firebaseio.com",
        storageBucket: "ardunio-project.appspot.com"
    };
    firebase.initializeApp(config);

    var db = firebase.database();

    var settings = {
        numlights: 4,
        bulbpower: 100,
        powerprice: 15
    };
    firebase.database().ref('settings/').on('value',function(snap){
        if(snap.val()){
            settings = snap.val();
        }else{
            $('#warning-modal').modal('show');
        }
    });

    // listen for changes to LDR and temperature values on database
    var ldrRef = firebase.database().ref('ldr_today/value');
    ldrRef.on('value', function(snapshot) {
        var ldrReading = snapshot.val();
        $('.ldr-value').html(getEnergy(settings.numlights,settings.bulbpower,ldrReading,true) + "J<br>£" + getPrice(settings.numlights,settings.bulbpower,ldrReading,settings.powerprice).toFixed(2));
    });

    var ldrMonthRef = firebase.database().ref('ldr_this_month/value');
    ldrMonthRef.on('value', function(snapshot) {
        var ldrReading = snapshot.val();
        $('.ldr-month-value').html(getEnergy(settings.numlights,settings.bulbpower,ldrReading,true) + "J<br>£" + getPrice(settings.numlights,settings.bulbpower,ldrReading,settings.powerprice).toFixed(2));
    });

    var tempRef = firebase.database().ref('temp/');
    tempRef.on('value', function(snapshot) {
        var tempReading = snapshot.val().data;
        $('.temp-value').html(parseFloat(tempReading).toFixed(1) + " &deg;C");
    });


    var calDark, calLight;

    // Save LDR values when buttons clicked
    $('#cal-dark').click(function(){
        firebase.database().ref('ldr/data').once('value', function(snap){
            calDark = snap.val();
            $('#cal-dark').addClass('disabled');
            $('#cal-dark').html("Calibrated");
        })
        if(calLight){
            $('#save-settings').removeClass('disabled');
        }
    })
    $('#cal-light').click(function(){
        firebase.database().ref('ldr/data').once('value', function(snap){
            calLight = snap.val();
            $('#cal-light').addClass('disabled');
            $('#cal-light').html("Calibrated");
        })
        if(calDark){
            $('#save-settings').removeClass('disabled');
        }
    })

    // reset settings window on cancel
    $('#cancel-settings').click(function(){
        $('#cal-light').removeClass('disabled');
        $('#cal-light').html("Calibrate");
        $('#cal-dark').removeClass('disabled');
        $('#cal-dark').html("Calibrate");
        $('#save-settings').addClass('disabled');
    })

    // Update settings on server
    $('#save-settings').click(function(){
        if(!$('#save-settings').hasClass('disabled')){
            var avg = (parseInt(calDark)+parseInt(calLight))/2;
            firebase.database().ref('settings/avg').set(avg);

            // set default values if user didn't input anything
            var numLights = $('#numlights').val() ? $('#numlights').val() : 4;
            var bulbPower = $('#bulbpower').val() ? $('#bulbpower').val() : 100;
            var powerPrice = $('#powerprice').val() ? $('#powerprice').val() : 15;

            firebase.database().ref('settings/numlights').set(numLights);
            firebase.database().ref('settings/bulbpower').set(bulbPower);
            firebase.database().ref('settings/powerprice').set(powerPrice);
        }
    })

    var ldrData = [];
    $(".dropdown-menu li a").click(function(){
        var selText = $(this).text();
        $(this).parents('.btn-group').find('button[data-toggle="dropdown"]').html(selText+' <span class="caret"></span>');
        updateGraph($(this).attr('class'),$(this).attr('id'));
    });

    function updateGraph(type,period,second=false){
        var ldrRef = firebase.database().ref('ldr_'+period+'/data/');
        var ldrArr;

        ldrRef.on('value', function(snapshot) {
            ldrArr = snapshot.val();
            ldrData = [];
            for(var i = ldrArr.length-chartlength > -1 ? ldrArr.length-chartlength : 0; i < ldrArr.length; i ++){
                var tmp = type=='cost' ? getPrice(settings.numlights,settings.bulbpower,ldrArr[i][1],settings.powerprice).toFixed(2) : getEnergy(settings.numlights,settings.bulbpower,ldrArr[i][1],false);
                if(second){
                    if(ldrArr[ldrArr.length-1][0] - ldrArr[i][0] < uploadFreq * chartlength)
                        ldrData.push({period: ldrArr[i][0],
                            ldr: ldrArr[i][1]})
                }else{
                    ldrData.push({period: ldrArr[i][0],
                        ldr: tmp})
                }
            }
            if(type=='cost'){
                ldrCostChart.setData(ldrData);
            }else if(second){
                ldrChart.setData(ldrData);
            }else{
                ldrEnergyChart.setData(ldrData);
            }
        });
    }
    updateGraph('cost','day')
    updateGraph('energy','day')
    updateGraph('other','sec',true)

    // set up graphs
    ldrEnergyChart = Morris.Area({
        element: 'ldr-energy-chart',
        data: ldrData,
        xkey: 'period',
        ykeys: ['ldr'],
        yLabelFormat: function (y) { return y.toString() + 'J'; },
        labels: ['Energy'],
        pointSize: 3,
        hideHover: 'auto',
        resize: true
    });

    ldrCostChart = Morris.Area({
        element: 'ldr-cost-chart',
        data: ldrData,
        lineColors: ['#5cb85c'],
        xkey: 'period',
        ykeys: ['ldr'],
        yLabelFormat: function (y) { return "£" + y.toString(); },
        labels: ['Cost'],
        pointSize: 3,
        hideHover: 'auto',
        resize: true
    });

    ldrChart = Morris.Area({
        element: 'ldr-chart',
        data: ldrData,
        lineColors: ['#d9534f'],
        xkey: 'period',
        ykeys: ['ldr'],
        yLabelFormat: function (y) { return y.toString(); },
        labels: ['Cost'],
        pointSize: 3,
        hideHover: 'auto',
        resize: true
    });
})

function getEnergy(num, power, secs, formatted){
    var e = num * power * secs / 100;
    var units = ['','k','M','G','T','P','E'];
    var i = 0;
    while(e>100){
        e /= 1000;
        i ++
    }
    if(formatted)
        return e.toFixed(2) + ' ' + units[i];
    return num * power * secs / 100;
}

function getPrice(num, power, secs, cost){
    return num * power * secs * cost / (1000*100*3600)
}