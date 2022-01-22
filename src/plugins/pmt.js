'use strict'
const moment = require('moment')
const fp = require('fastify-plugin')
const axios = require("axios")
let api = `https://api.pmt.com.ng/api/pmt`
let key = `TSXTYSAPI42231874`
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('ABCCheckTrips', async function (payload) {
    try{
        let departure_state = payload.departure_state
        let destination_state = payload.destination_state
        let dep,des;
        const PMT_STATES = await axios.get(api+`/states/public`, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        const STATES = PMT_STATES.data
        if(STATES.success){
            const ALL_STATES = STATES.payload
            ALL_STATES.filter((state) => {
                if(dep_id == "" || des_id == ""){
                    if(state.name.toUpperCase().includes(departure_state)){
                        dep = state
                    }
                    if(state.name.toUpperCase().includes(destination_state)){
                        des = state
                    }
                }
            })


            if(dep != "" && des != ""){
                const CHECK_TRIP = await axios.get(api+`/pmt-schedules/public?terminalTo=${des.id}&seatQuantity=1&terminalFrom=${dep.id}&boardingDate=${payload.trip_date}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                const TRIPS = CHECK_TRIP.data
                if(TRIPS.success){
                    const GET_TERMINALS = await axios.get(api+`/erp/terminals/public?subsidiary=PMT`, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    const TERMINALS = GET_TERMINALS.data
                    let all_terminals;
                    if(TERMINALS.success){
                        all_terminals = TERMINALS.payload
                    }
                    let DATA = []
                    TRIPS.payload.forEach(trip => {
                        let terminal_from, terminal_to
                        all_terminals.filter(terminal => {
                            if(terminal.id == trip.pmtRoutes[0].terminalFrom){
                                terminal_from = terminal
                            }
                            if(terminal.id == trip.pmtRoutes[0].terminalTo){
                                terminal_to = terminal
                            }
                        })
                        if(terminal_from && terminal_to){
                            DATA.push({
                                "provider": {
                                    "name": "Peace Mass Transit",
                                    "short_name": "PMT"
                                },
                                "trip_id": trip.id,
                                "trip_no": trip.code,
                                "trip_date": payload.trip_date,
                                "departure_time":schedule_data.data.result.main_dep_time,
                                "origin_id": dep.id,
                                "destination_id": des.id,
                                "narration": terminal_from.name+ " TO "+terminal_to.name,
                                "fare":  trip.pmtRoutes[0].fareClass1,
                                "total_seats": trip.vehicle.seatingCapacity,
                                "available_seats": [],
                                "blocked_seats": [],
                                "special_seats": [],
                                "special_seats_fare": "",
                                "order_id": "",
                                "departure_terminal": terminal_from.name,
                                "destination_terminal": terminal_to.name,
                                "vehicle": trip.vehicle.name,
                                "boarding_at": "",
                                "departure_address": terminal_from.address,
                                "destination_address": terminal_to.address
                            });
                        }
                    });
                    return {
                        error: false,
                        message: "successful",
                        info: "Data Available",
                        data: DATA
                    }
                }
                else{
                    return {
                        error: true,
                        message: "failed",
                        info: "No trips found",
                        data: []
                    };
                }
            }
            else{
                return {
                    error: true,
                    message: "failed",
                    info: "Departure or Destination States does not belong to our route",
                    data: []
                };
            }
        }
        else{
            return {
                error: true,
                message: "failed",
                info: "An error occured, cannot resolve request.",
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


  fastify.decorate('ABCBookTrip', async function (payload) {
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

