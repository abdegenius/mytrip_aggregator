'use strict'
const moment = require('moment')
const fp = require('fastify-plugin')
const axios = require("axios")
let api = `https://bmsapi.mytrip.ng/api/v1/`
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('BMSCheckTrips', async function (payload) {
    try{
        const BMS_STATES = await axios.get(api+`states`, {
            headers: {
                "Content-Type": "application/json"
            }
        })
        let departure_state = payload.departure_state
        let destination_state = payload.destination_state
        let trip_date = payload.trip_date
        let state_confirmation = 0
        let states = BMS_STATES
        states.data.data.find(row => {
            if(row.name == departure_state){
                state_confirmation += 1;
            }
            if(row.name == destination_state){
                state_confirmation += 1;
            }
        })
        if(parseInt(state_confirmation) == 2){
            const CHECK_TRIP = await axios.post(api+`check_trip`,
            {
                "departure_state": departure_state,
                "destination_state": destination_state,
                "trip_date": trip_date
            }, 
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            let result = CHECK_TRIP.data.data
            let DATA = [];
            result.forEach(data => {
                let vehicle_data = data.vehicle.split("|")
                let vehicle = vehicle_data[0].trim()

                let departure_terminal_data = data.departure_terminal.split("|")
                let departure_terminal = departure_terminal_data[0].trim()

                let destination_terminal_data = data.destination_terminal.split("|")
                let destination_terminal = destination_terminal_data[0].trim()
                DATA.push({
                    "provider": {
                        "name": "BMS Agent",
                        "short_name": "BMS"
                    },
                    "trip_id": Number(data.schedule_id),
                    "trip_no": "",
                    "trip_date": payload.trip_date,
                    "departure_time": data.departure_time,
                    "origin_id": "",
                    "destination_id": "",
                    "narration": data.departure_address +" - "+ data.destination_address,
                    "fare": Number(data.fare),
                    "total_seats": data.total_seats,
                    "available_seats": Object.values(data.available_seats),
                    "blocked_seats": Object.values(data.blocked_seats),
                    "special_seats": [],
                    "special_seats_fare": "",
                    "order_id": "",
                    "departure_terminal": departure_terminal,
                    "destination_terminal": destination_terminal,
                    "vehicle": vehicle,
                    "boarding_at": "",
                    "departure_address": data.departure_address,
                    "destination_address": data.destination_address,
                });
            });
            return {
                error: false,
                message: "successful",
                info: "Data fetched successfully",
                data: DATA
            };
        }

        else{
            return {
                error: true,
                message: "failed",
                info: "Check provided states for errors, states does not exist",
                data: []
            };
        }
    }
    catch(error){
        return {
            error: true,
            message: "failed",
            info: error.message,
            data: []
        };
    }
  })

  fastify.decorate('BMSBookTrip', async function (payload) {

    try{
        const BOOK_TRIP = await axios.post(api+`book_trip`,
        {
            "schedule_id": payload.trip_id,
            "agent_email": payload.agent_email,
            "passengers": payload.passengers,
            "seat_numbers": payload.seat_numbers
        }, 
        {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        const result = BOOK_TRIP.data
        let departure = result.message.departure_terminal.substring(0,-3);
        let destination = result.message.destination_terminal.substring(0,-3);
        let vehicle = result.message.vehicle;
        let primary_user = payload.passengers.find(passenger => passenger.is_primary == true)
        return {
            result
        }
    }
    catch(error){
        return {
            error: true,
            message: "failed",
            info: error.message,
            data: []
        };
    }
  })


  
})

