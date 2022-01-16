'use strict'
const moment = require('moment')
const fp = require('fastify-plugin')
const axios = require("axios")
let api = `https://bmsapi.mytrip.ng/api/v1/`
let key = ``
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('BMSCheckTrips', async function (payload) {
    try{
        const BMS_STATES = await axios.get(api+`states`, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        let states = BMS_STATES.data;
        let departure_state = payload.departure_state
        let destination_state = payload.destination_state
        let trip_date = payload.trip_date
        let departure_state_terminals = states.find(row => row.name == departure_state)
        let destination_state_terminals  = states.find(row => row.name == destination_state)

        if(destination_state_terminals.length > 0 && departure_state_terminals.length > 0){
            const CHECK_TRIP = await axios.get(api+`check_trip`,
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
            let result = CHECK_TRIP.data
            return {
                error: false,
                message: "successful",
                info: "Data fetched successfully",
                data: result
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
    let customer = [];
    let trip_id = Number(payload.trip_id)
    let seats = payload.seat_numbers.trim().split(",")
    let seat_details = [];
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
        const GET_BOOKING = await axios.post(`http://gds.ticketsimply.africa/gds/api/tentative_booking/${trip_id}.json?api_key=TSXTYSAPI42231874`, 
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
                'api_key': 'TSXTYSAPI42231874',
                'Content-Type': 'application/json'
            } 
        })
        
        if(GET_BOOKING.data.result){
            const result = GET_BOOKING.data.result.ticket_details
            const COMPLETE_BOOKING = await axios.post(`http://gds.ticketsimply.africa/gds/api/confirm_booking/${result.pnr_number}.json?api_key=TSXTYSAPI42231874`, {
                headers: {
                    'api_key': 'TSXTYSAPI42231874',
                    'Content-Type': 'application/json'
                } 
            })

            if(COMPLETE_BOOKING.data.result){
                const response = COMPLETE_BOOKING.data.result.ticket_details
                return {
                    error: false,
                    message: "successful",
                    info: "Data Avilable",
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
                            "seat_details": seat_details,
                            "provider": "ABC"
                        }
                    ]
                }
            }
            else{
                return {
                    error: true,
                    message: "cannot complete booking",
                    info: COMPLETE_BOOKING.data.response.message,
                    data: []
                };
            }
        }
        else{
            return {
                error: true,
                message: "cannot complete booking",
                info: GET_BOOKING.data.response.message,
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

  
})

