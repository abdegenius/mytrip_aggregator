'use strict'
const moment = require('moment')
const fp = require('fastify-plugin')
const axios = require("axios")
let api = `https://api.pmt.ng/api`
let key = ``
let email = `pmtagent.treepz@pmt.ng`
let password = `pmt_treepz`
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('TestPMTCheckTrips', async function (payload) {
    try{
        let departure_state = payload.departure_state
        let destination_state = payload.destination_state
        let dep,des;
        const PMT_STATES = await axios.get(api+`/pmt/states/public`, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        const STATES = PMT_STATES.data
        if(STATES.success == true){
            const ALL_STATES = STATES.payload
    
            ALL_STATES.filter((state) => {
                if(state.name.toUpperCase().includes(departure_state) || departure_state.includes(state.name.toUpperCase())){
                    dep = state
                }
                if(state.name.toUpperCase().includes(destination_state) || destination_state.includes(state.name.toUpperCase())){
                    des = state
                }
            })


            if(dep != "" && des != ""){
                const CHECK_TRIP = await axios.get(api+`/pmt/pmt-schedules/public?stateTo=${des.id}&seatQuantity=1&stateFrom=${dep.id}&boardingDate=${payload.trip_date}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                const TRIPS = CHECK_TRIP.data
                if(TRIPS.success == true){
                    let all_trips = TRIPS.payload
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
                    all_trips.forEach(trip => {
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
                                    "short_name": "PMT",
                                    "logo": "https://access.mytrip.ng/providers/pmt.jpg"
                                },
                                "trip_id": trip.id,
                                "trip_no": trip.code,
                                "trip_date": payload.trip_date,
                                "departure_time": moment(trip.boardingDate).format("DD/MM/YYYY HH:MM"),
                                "origin_id": terminal_from.id,
                                "destination_id": terminal_to.id,
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
                                "boarding_at": trip.pmtRoutes[0].id,
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
                        message: "FAILED: No trips found",
                        info: "No trips found",
                        data: []
                    };
                }
            }
            else{
                return {
                    error: true,
                    message: "FAILED: Departure or Destination States does not belong to our route",
                    info: "Departure or Destination States does not belong to our route",
                    data: []
                };
            }
        }
        else{
            return {
                error: true,
                message: "FAILED: An error occurred, cannot resolve request.",
                info: "An error occurred, cannot resolve request.",
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


  fastify.decorate('TestPMTBookTrip', async function (payload) {
    try{
        let all_passengers = payload.passengers
        let primary
        all_passengers.filter(passenger => {
            if(passenger.is_primary == true){
                primary = passenger
            }
        })
        let primary_name = (primary.name+" "+primary.name);
        primary_name = primary_name.split(" ")
        const SAVE_PASSENGERS = await axios.post(api+`/pmt/passengers`, {
            "email": primary.email,
            "surname": primary_name.length > 0 ? primary_name[0] : "",
            "otherName": primary_name.length > 1 ? primary_name[1] : "",
            "gender": primary.sex.toUpperCase().substring(0,1),
            "phone": primary.phone,
            "contactPerson": primary.next_of_kin,
            "contactPersonPhone": primary.next_of_kin_phone,
            "address": "Behind Aso Estate, Lugbe, Airport Road, FCT Abuja",
            "title": primary.title
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        const PASSENGERS = SAVE_PASSENGERS.data
        if(PASSENGERS.success == true){
            const LOGIN = await axios.post(api+`/erp/staff/login`, {
                "email": email,
                "password": password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            const GET_USER = LOGIN.data
            if(GET_USER.success == true){
                let user = GET_USER.payload
                let token = user.token
                if(token){
                    try{
                        let seat_numbers = payload.seat_numbers+","
                        let seats = seat_numbers.split(",")
                        seats = seats.filter((s) => s)
                        let passenger = PASSENGERS.payload
                        let seat_details = []
                        payload.passengers.forEach((p,i) => {
                            let passenger = p;
                            passenger["seat_number"] = seats[i]
                            seat_details.push(p)
                        })

                        const MAKE_BOOKING = await axios.post(api+`/pmt/pmt-reservations/public`,{
                            "amount": Number(payload.amount_per_seat),
                            "passenger": passenger.id,
                            "gateway": {"currency": "NGN"},
                            "paymentGateway": "PAYSTACK",
                            "paymentMethod": "GATEWAY",
                            "pmtRoute": payload.boarding_at,
                            "pmtSchedule": payload.trip_id,
                            "terminalFrom": payload.origin_id,
                            "seatPositions": seats,
                            "seatQuantity": seats.length
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer '+token
                            }
                        })
                        const BOOKINGS = MAKE_BOOKING.data
                        if(BOOKINGS.success == true){
                            let booking = BOOKINGS.payload
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
                            let terminal_from, terminal_to
                            all_terminals.filter(terminal => {
                                if(terminal.id == payload.origin_id){
                                    terminal_from = terminal
                                }
                                if(terminal.id == payload.destination_id){
                                    terminal_to = terminal
                                }
                            })
                            return {
                                error: false,
                                message: "successful",
                                info: "Data Available",
                                data: [
                                    {
                                        "order_status": "confirmed",
                                        "order_id": booking.id,
                                        "order_name":primary.name,
                                        "order_email":primary.email,
                                        "phone_number":primary.mobile,
                                        "order_amount": booking.fare * seats.length,
                                        "trip_id": payload.trip_id,
                                        "origin_id": payload.origin_id,
                                        "destination_id": payload.destination_id,
                                        "order_ticket_date": booking.boardingDate,
                                        "order_total_seat": seats.length,
                                        "order_seats": payload.seat_numbers,
                                        "amount_per_seat": booking.fare,
                                        "order_number": booking.code,
                                        "vehicle_no": "",
                                        "narration": terminal_from.name+" TO "+terminal_to.name,
                                        "departure_time": payload.departure_time,
                                        "departure_terminal": terminal_from.name,
                                        "destination_terminal":  terminal_to.name,
                                        "seat_details": seat_details,
                                        "provider": "PMT"
                                    }
                                ]
                            }
                        }
                    }
                    catch(error){
                        return {
                            error: true,
                            message: "FAILED: ".error.message,
                            info: error.message,
                            data: []
                        };
                    }
                }
                else{
                    return {
                        error: true,
                        message: "failed xxxxxxxxxxxx",
                        info: "Invalid/empty token provided.",
                        data: []
                    };
                }
            }
            else{
                return {
                    error: true,
                    message: "FAILED: Unable to login to proprietory provider.",
                    info: "Unable to login to proprietory provider.",
                    data: []
                };
            }
        }
        else{
            return {
                error: true,
                message: "FAILED: Cannot complete request, failed to save passenger details.",
                info: "Cannot complete request, failed to save passenger details.",
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

