'use strict'
const moment = require('moment')
const fp = require('fastify-plugin')
const axios = require("axios")
let api = `http://gds.ticketsimply.africa/gds/api/`
let key = `TSXTYSAPI42231874`
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('ABCCheckTrips', async function (payload) {
    try{
        const ABC_STATES = {
            "ABIA": [
                "ABA", 
                "AKA",
                "UMUAHIA"
            ],
            "ADAMAWA": [
            ],
            "AKWA IBOM": [
                "UYO"
            ],
            "ANAMBRA": [
                "ONITSHA",
                "AWKA"
            ],
            "BAUCHI": [
            ],
            "BAYELSA": [
            ],
            "BENUE": [
            ],
            "BORNO": [
            ],
            "CROSS RIVER": [
                "CALABAR"
            ],
            "DELTA": [
                "WARRI"
            ],
            "EBONYI": [
            ],
            "EDO": [
                "BENIN"
            ],
            "EKITI": [
            ],
            "ENUGU": [
                "9TH MILE",
                "ENUGU",
                "NINETH MILE"
            ],
            "GOMBE": [
            ],
            "IMO": [
                "MBAISE",
                "OWERRI",
                "ORLU"
            ],
            "JIGAWA": [
            ],
            "KADUNA": [
                "KADUNA"
            ],
            "KANO": [
            ],
            "KATSINA": [
            ],
            "KEBBI": [
            ],
            "KOGI": [
                "LOKOJA",
                "OKENE"
            ],
            "KWARA": [
            ],
            "LAGOS": [
                "LAGOS",
                "LAGOS AJAH",
                "LAGOS AMUWO",
                "LAGOS BOLADE OSHODI",
                "LAGOS JIBOWU",
                "MAZAMAZA",
                "IKORODU",
                "JIBOWU",
                "LAGOS (BOLADE)",
                "LAGOS (JBW)",
                "LAGOS (ABW)",
                "LAGOSOKOTA",
                "LEKKI"
            ],
            "NASARAWA": [
                "AKWANGA"
            ],
            "NIGER": [
            ],
            "OGUN": [
                "IJEBUODE"
            ],
            "ONDO": [
            ],
            "OSUN": [
            ],
            "OYO": [
                "IBADAN"
            ],
            "PLATEAU": [
                "JOS"
            ],
            "RIVERS": [
                "PORT HARCOURT"
            ],
            "SOKOTO": [
            ],
            "TARABA": [
            ],
            "YOBE": [
            ],
            "ZAMFARA": [
            ],
            "FCT (ABUJA)": [
                "ABUJA",
                "GWAGWALADA",
                "ABUJA(TRANSIT)",
                "ZUBA"
            ],
            "GHANA": [
                "ACCRA"
            ],
            "TOGO": [
                "LOME"
            ]
        };

        let departure_state = payload.departure_state
        let destination_state = payload.destination_state
        let departure_state_terminals = ABC_STATES[departure_state]
        let destination_state_terminals = ABC_STATES[destination_state]

        if(destination_state_terminals.length > 0 && departure_state_terminals.length > 0){

            const GET_CITIES = await axios.get(api+`cities.json`, {
                headers: {
                    'api_key': key,
                    'Content-Type': 'application/json'
                }
            })

            let DEPARTURE_STATE = [];
            let DESTINATION_STATE = [];
            const CITIES = GET_CITIES.data.result
            CITIES.forEach((city, index) => {
                let state = city[1].toUpperCase().trim()
                if(index > 0){
                    if(departure_state_terminals.includes(state)){
                        DEPARTURE_STATE.push({"origin": city[1], "origin_id": city[0]});
                    }
                    if(destination_state_terminals.includes(state)){
                        DESTINATION_STATE.push({"destination": city[1], "destination_id": city[0]});
                    }
                }
            })

            if(DEPARTURE_STATE.length > 0 && DESTINATION_STATE.length > 0){
                const GET_CITY_PAIRS = await axios.get(api+`city_pairs.json`, {
                    headers: {
                        'api_key': key,
                        'Content-Type': 'application/json'
                    }
                })

                let ROUTES = []
                const CITY_PAIRS = GET_CITY_PAIRS.data.result
                
                DEPARTURE_STATE.forEach(depState => {
                    DESTINATION_STATE.forEach(desState => {
                        CITY_PAIRS.map(city => {
                            if(city[0] == depState.origin_id && city[1] == desState.destination_id){
                                const travel_ids = city[2].split(",");
                                ROUTES.push({
                                    "departure_state_id": city[0],
                                    "destination_state_id": city[1],
                                    "travel_ids": travel_ids
                                })
                            }
                        })
                    })
                })

                if(ROUTES.length > 0){
                    const promises = ROUTES.map(async route => {
                        const response = await axios({
                        method: 'GET',
                        url: api+`availabilities/${route.departure_state_id}/${route.destination_state_id}/${payload.trip_date}.json`,
                        headers: {
                            'api_key': key,
                            'Content-Type': 'application/json'
                        }
                        })
                        return {
                            data: response.data.result
                        }
                    })
                    const TRIPS = await Promise.all(promises)
                    if(TRIPS.length > 0){
                        let TRIP_DATA = []
                        let TRIPS_EDIT = []
                        TRIPS.filter(
                            trip => {
                                if(trip.data){
                                    TRIPS_EDIT.push(
                                        trip
                                    )
                                }
                            }
                        );
                        TRIPS_EDIT.forEach(trip => {
                            trip.data.forEach((data,index) => {
                                if(index > 0){
                                    TRIP_DATA.push(data)
                                }
                            });
                        })
                        let DATA = [];
                        TRIP_DATA.forEach(async(trip) => {
                            const schedule_data = await axios({
                                method: 'GET',
                                url: api+`ui_schedule/${trip[1]}.json`,
                                    headers: {
                                        'api_key': key,
                                        'Content-Type': 'application/json'
                                    }
                            })
                                
                            let available_seats = []
                            if(trip[9]){
                                let seats = trip[9].split(",")
                                seats.forEach(seat => {
                                    let inner_seats = seat.split("|")
                                    available_seats.push(Number(inner_seats[0]))
                                })
                            }
                            let dep_terminal = "";
                            let des_terminal = "";
                            CITIES.forEach(city => {
                                if(city[0] == trip[6]){
                                    dep_terminal = city[1].toUpperCase();
                                }
                                if(city[0] == trip[7]){
                                    des_terminal = city[1].toUpperCase();
                                }
                            })
                            let boarding_data = schedule_data.data.result.bus_layout.boarding_stages.trim().split("|")
                            let dropping_data = schedule_data.data.result.bus_layout.dropoff_stages.trim().split("|")
                            if(schedule_data.data.result.service_name == "ABC TRANSPORT"){
                                DATA.push({
                                    "provider": {
                                        "name": "ABC Transport",
                                        "short_name": "ABC"
                                    },
                                    "trip_id": Number(trip[1]),
                                    "trip_no": Number(trip[8]),
                                    "trip_date": payload.trip_date,
                                    "departure_time":schedule_data.data.result.main_dep_time,
                                    "origin_id": Number(trip[6]),
                                    "destination_id": Number(trip[7]),
                                    "narration": dep_terminal+ " TO "+des_terminal,
                                    "fare": Number(trip[4].substring(3)),
                                    "total_seats": schedule_data.data.result.bus_layout.total_seats,
                                    "available_seats": available_seats,
                                    "blocked_seats": [],
                                    "special_seats": [],
                                    "special_seats_fare": "",
                                    "order_id": trip[0],
                                    "departure_terminal": dep_terminal,
                                    "destination_terminal": des_terminal,
                                    "vehicle": schedule_data.data.result.bus_type,
                                    "boarding_at": boarding_data[0],
                                    "departure_address": boarding_data[2],
                                    "destination_address": dropping_data[2]
                                });
                            }
                        })
                        let countData = DATA.length;
                        return countData
                        if (typeof DATA !== 'undefined' && DATA.length > 0) {
                            return {
                                error: false,
                                message: "successful",
                                info: "Data Available",
                                data: DATA
                            }
                        }
                        return {
                            error: true,
                            message: "FAILED: No trips found",
                            info: "No trips found",
                            data: DATA
                        }
                    }
                    else{
                        return {
                            error: true,
                            message: "FAILED: No trips found",
                            info: "No trips found",
                            data: []
                        };
                    }
                }
                else{
                    return {
                        error: true,
                        message: "FAILED: Terminals does not exist between states",
                        info: "Terminals does not exist between states",
                        data: []
                    };
                }
            }
            else{
                return {
                    error: true,
                    message: "FAILED: Terminals does not exist between states",
                    info: "Terminals does not exist between states",
                    data: []
                };
            }
        }

        else{
            return {
                error: true,
                message: "FAILED: Check provided states for errors, states does not exist",
                info: "Check provided states for errors, states does not exist",
                data: []
            };
        }
    }
    catch(error){
        return {
            error: true,
            message: "FAILED: "+error.message,
            info: error.message,
            data: []
        };
    }
  })


  fastify.decorate('ABCBookTrip', async function (payload) {
    let customer = [];
    let trip_id = Number(payload.trip_id)
    let seats = payload.seat_numbers.trim().split(",")
    let seat_details = [];
    let seat_details2 = [];
    let seat_detail = [];
    payload.passengers.forEach((passenger,index) => {
        seat_details.push({
            "fare": (payload.amount_per_seat + ".00").toString(),
            "title": passenger.title,
            "age": passenger.age,
            "sex": passenger.sex.substring(0,1),
            "name": passenger.name,
            "email": passenger.email,
            "phone": passenger.phone,
            "next_of_kin": passenger.next_of_kin,
            "next_of_kin_phone": passenger.next_of_kin_phone,
            "seat_number": seats[index]
        })
        seat_details2.push({
            "fare": (payload.amount_per_seat + ".00").toString(),
            "title": passenger.title,
            "age": passenger.age,
            "sex": passenger.sex.substring(0,1),
            "name": passenger.name,
            "email": passenger.email,
            "phone": passenger.phone,
            "blood": passenger.blood ? passenger.blood : "",
            "next_of_kin": passenger.next_of_kin,
            "next_of_kin_phone": passenger.next_of_kin_phone,
            "seat_number": seats[index]
        })
        seat_detail.push({
            "seat_number": seats[index],
            "fare": (payload.amount_per_seat + ".00").toString(),
            "title": passenger.title,
            "name": passenger.name,
            "age": passenger.age,
            "sex": passenger.sex.substring(0,1),
            "is_primary": "true",
            "id_card_type": "none",
            "id_card_number": "none",
            "id_card_issued_by": "none"
        })
        if(passenger.is_primary === true){
            customer.push(passenger);
        }
    })
    try{
        const GET_BOOKING = await axios.post(api+`tentative_booking/${trip_id}.json?api_key=`+key, 
        {
            "book_ticket": {
                "seat_details": {
                    "seat_detail": (Number(seats.length) <= 1 ? seat_detail[0] : seat_detail)
                },
                "contact_detail": {
                    "mobile_number": customer[0].phone,
                    "emergency_name": customer[0].next_of_kin,
                    "email": customer[0].email
                }
            },
            "origin_id": payload.origin_id,
            "destination_id": payload.destination_id,
            "boarding_at": payload.boarding_at,
            "no_of_seats": String(seats.length),
            "travel_date": payload.trip_date,
            "schedule_id": payload.trip_id
        },
        {
            headers: {
                'api_key': key,
                'Content-Type': 'application/json'
            } 
        })
        if(GET_BOOKING.data.result){
            const result = GET_BOOKING.data.result.ticket_details
            const COMPLETE_BOOKING = await axios.post(api+`confirm_booking/${result.pnr_number}.json?api_key=`+key, {
                headers: {
                    'api_key': key,
                    'Content-Type': 'application/json'
                } 
            })

            if(COMPLETE_BOOKING.data.result){
                const response = COMPLETE_BOOKING.data.result.ticket_details
                return {
                    error: false,
                    message: "successful",
                    info: "Data Available",
                    data: [
                        {
                            "order_status": "confirmed",
                            "order_id": response.operator_pnr,
                            "order_name": response.passenger_details[0].name,
                            "order_email": response.passenger_details[0].email,
                            "phone_number": response.passenger_details[0].mobile,
                            "order_amount": response.total_fare,
                            "trip_id": payload.trip_id,
                            "origin_id": payload.origin_id,
                            "destination_id": payload.destination_id,
                            "order_ticket_date": new Date(response.issued_on * 1000),
                            "order_total_seat": response.no_of_seats,
                            "order_seats": payload.seat_numbers,
                            "amount_per_seat": parseFloat(response.total_fare)/parseFloat(response.no_of_seats),
                            "order_number": response.ticket_number,
                            "vehicle_no": response.bus_type,
                            "narration": response.origin.toUpperCase() + " TO " + response.destination.toUpperCase(),
                            "departure_time": payload.departure_time,
                            "departure_terminal": response.origin.toUpperCase(),
                            "destination_terminal":  response.destination.toUpperCase(),
                            "seat_details": seat_details2,
                            "provider": "ABC"
                        }
                    ]
                }
            }
            else{
                return {
                    error: true,
                    message: "FAILED: "+COMPLETE_BOOKING.data.response.message,
                    info: COMPLETE_BOOKING.data.response.message,
                    data: []
                };
            }
        }
        else{
            return {
                error: true,
                message: "FAILED: "+GET_BOOKING.data.response.message,
                info: GET_BOOKING.data.response.message,
                data: []
            };
        }
    }
    catch(error){
        return {
            error: true,
            message: "FAILED: "+error.message,
            info: error.message,
            data: []
        };
    }
  })

  
})

