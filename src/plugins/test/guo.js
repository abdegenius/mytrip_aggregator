'use strict'
const moment = require('moment')
const fp = require('fastify-plugin')
const axios = require("axios")
let api = `http://138.197.97.95/agents/api/v3/json/`
let key = `M6KpwwDlc0OyEGLABHkx4bO_yz77OIaTSHE2bbQFKwY`
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('TestGUOCheckTrips', async function (payload) {
    try{
        //GET ALL ROUTE DETAILS
        const ALL_ROUTE_DETAILS = await axios.get(api+"AllRouteDetails", {
            headers: {
                'Authorization': 'Bearer '+key,
                'Content-Type': 'application/json'
            }
        })
        const ALL_TERMINAL_STATES = await axios.get(api+"TerminalsWithState", {
            headers: {
                'Authorization': 'Bearer '+key,
                'Content-Type': 'application/json'
            }
        })
        //LIST OF TERMINALS IN STATE
        const TERMINAL_STATES = ALL_TERMINAL_STATES.data;
        // LIST OF STATES
        const STATES = ALL_ROUTE_DETAILS.data.data.States;
        // LIST OF TERMINALS
        const TERMINALS = ALL_ROUTE_DETAILS.data.data.Terminals;
        // LIST OF DESTINATIONS
        const DESTINATIONS = ALL_ROUTE_DETAILS.data.data.Destinations;
        // LIST OF ROUTES
        const ROUTES = ALL_ROUTE_DETAILS.data.data.Routes;
        // state_confirmation: need 2 to proceed else states doesnt have route
        let state_confirmation = 0;
        // LIST OF TERMINALS IN DEPARTURE STATE
        let DEPARTURE_STATE_TERMINALS = [] 
        // LIST OF TERMINALS IN DESTINATION STATE
        let DESTINATION_STATE_TERMINALS = [] 
        // DEPARTURE STATE NAME from PAYLOAD turned uppercased and trimmed
        let DEPARTURE_STATE = payload.departure_state.toUpperCase().trim();
        // DESTINATION STATE NAME from PAYLOAD turned uppercased and trimmed
        let DESTINATION_STATE = payload.destination_state.toUpperCase().trim(); 
        // DEPARTURE STATE ID INITIALIZED
        let DEPARTURE_STATE_ID;
        // DESTINATION STATE ID INITIALIZED
        let DESTINATION_STATE_ID;
	
        // LOOPING THROUGH ALL STATES TO CHECK IF DEPARTURE AND DESTINATION STATE EXIST
        STATES.find(state => {
            // IF DEPARTURE STATE EXIST
            if(state.StateName == DEPARTURE_STATE){
                // state_confirmation +1
                state_confirmation += 1;
                // STATEID assigned to DEPARTURE_STATE_ID
                DEPARTURE_STATE_ID = state.StateID
            }
            // IF DESTINATION STATE EXIST
            if(state.StateName == DESTINATION_STATE){
                // state_confirmation +1
                state_confirmation += 1;
                // STATEID assigned to DESTINATION_STATE_ID
                DESTINATION_STATE_ID = state.StateID
            }
        })
        // IF state_confirmation = 2 states verification passed
        if(state_confirmation == 2){
            // DEPARTURE LOADINID
            let DEPARTURE_LOADINID = [];
            // DESTINATION DESTINATION ID
            let DESTINATION_DESTINATIONID = [];
            // IF DEPARTURE_STATE_ID exist
            if(DEPARTURE_STATE_ID){
                // LOOPING THROUGH TERMINALS AVAILABLE FOR BOOKING ONLINE
                TERMINALS.forEach(terminal => {
                    // IF a TERMINAL MATCH DEPARTURE STATE ID
                    if(terminal.StateID == DEPARTURE_STATE_ID){
                        // TERMINAL is pushed to TERMINALS IN DEPARTURE STATE
                        DEPARTURE_STATE_TERMINALS.push(terminal);
                        DEPARTURE_LOADINID.push(terminal.LoadinID)
                    }
                });
            }
            // IF DEPARTURE STATE TERMINALS and DESTINATIONS and DEPARTURE_STATE_ID EXIST
            if(DEPARTURE_STATE_TERMINALS && DESTINATIONS && DESTINATION_STATE_ID){
                // LOOP THROUGH DESTINATIONS
                DESTINATIONS.forEach(destination => {
                    // IF a DESTINATION MATCH DESTINATION STATE ID
                    if(destination.StateID == DESTINATION_STATE_ID){
                        // DESTINATION is pushed to TERMINALS IN DESTINATION STATE
                        DESTINATION_STATE_TERMINALS.push(destination);
                        DESTINATION_DESTINATIONID.push(destination.DestinationID);
                    }
                });
            }   

            let DEPARTURE_TO_DESTINATIONS = [];
            DEPARTURE_LOADINID.forEach(LoadinID => {
                DESTINATION_DESTINATIONID.forEach(async (DestinationID) => {
                    ROUTES.some(route => {
                        if(route.LoadinID == LoadinID && route.DestinationID == DestinationID){
                            DEPARTURE_TO_DESTINATIONS.push(route)
                        }
                    })
                })
            });
            
            const promises = DEPARTURE_TO_DESTINATIONS.map(async trip => {
                const response = await axios({
                    method: 'GET',
                    url: api+`AvaiableBusWithSeatPrice?LoadinID=${trip.LoadinID}&DestinationID=${trip.DestinationID}&TripDate=${payload.trip_date}`,
                    headers: {
                        'Authorization': 'Bearer '+key,
                        'Content-Type': 'application/json'
                    }
                })
                
                let data = response.data.data
                data.loadin_id = trip.LoadinID
                data.destination_id = trip.DestinationID
                return {
                    data: data
                }
            
            })

            const TRIPS = await Promise.all(promises)
            if(Object.keys(TRIPS).length !== 0){
                let DATA = [];
                TRIPS.forEach(trip => {
                    if(trip.data.BusList){
                        trip.data.BusList.forEach(trip_data => {
                            let available_seats = trip_data.AvailableSeat.length > 0 ? trip_data.AvailableSeat : []
                            let blocked_seats = trip_data.BlockedSeat.length > 0 ? trip_data.BlockedSeat : []
                            let bookable_seats = []
                            if(available_seats.length > 0 && blocked_seats.length > 0){
                                bookable_seats = available_seats.filter(val => !blocked_seats.includes(val));
                            }
                            let total_seats = 0
                            let vehicle_name = trip_data.VehicleGroupTag_Name.trim().toLowerCase()
                            if(vehicle_name == 'sienna'){ total_seats = 7 }
                            if(vehicle_name == 'hiace'){ total_seats = 15 }
                            if(vehicle_name == 'smart coach'){ total_seats = 33 }
                            if(vehicle_name == 'luxury'){ total_seats = 59 }
                        
                            let departure_terminal_data = TERMINAL_STATES.data.filter(t => {
                                return t.TerminalID == trip.data.loadin_id
                            });
                            
                            DATA.push({
                                "provider": {
                                    "name": "GUO Transport",
                                    "short_name": "GUO",
                                    "logo": "https://access.mytrip.ng/providers/guo.jpg"
                                },
                                "trip_id": Number(trip_data.TripID),
                                "trip_no": Number(trip_data.TripNo),
                                "trip_date": payload.trip_date,
                                "departure_time": moment(trip_data.Departure_Time).format("DD/MM/YYYY HH:MM"),
                                "origin_id": "",
                                "destination_id": Number(trip_data.DestinationID),
                                "narration": trip_data.Loading_Office +" - "+ trip_data.Destination,
                                "fare": Number(trip_data.FareAmount),
                                "total_seats": total_seats,
                                "available_seats": bookable_seats,
                                "blocked_seats": blocked_seats,
                                "special_seats": (trip_data.SpecialSeatPricing.length) > 0 ? trip_data.SpecialSeatPricing[0].Seats : [],
                                "special_seats_fare": (trip_data.SpecialSeatPricing.length) > 0 ? Number(trip_data.SpecialSeatPricing[0].FareAmount) : "",
                                "order_id": trip.data.RefCode,
                                "departure_terminal": trip_data.Loading_Office.toUpperCase(),
                                "destination_terminal": trip_data.Destination.toUpperCase(),
                                "vehicle": trip_data.VehicleGroupTag_Name +" - "+trip_data.VIN,
                                "boarding_at": "",
                                "departure_address": departure_terminal_data[0] ? departure_terminal_data[0].TerminalAddress : "",
                                "destination_address": trip_data.Destination + " Terminal",
                            });
                        });
                    }
                })
            
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
        // if state confirmation != 2 states verification failed
        else{
            return {
                error: true,
                message: "failed",
                info: "Terminals does not exist between states",
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

  fastify.decorate('TestGUOBookTrip', async function (payload) {
    try{
        let customer = [];
        let seats = payload.seat_numbers.trim().split(",")
        let seat_details = [];
        let seat_details2 = [];
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
                "next_of_kin": passenger.next_of_kin,
                "blood": passenger.blood ? passenger.blood : "",
                "next_of_kin_phone": passenger.next_of_kin_phone,
                "seat_number": seats[index]
            })
            if(passenger.is_primary === true){
                customer.push(passenger);
            }
        })
        try{
            //GET BOOKING
            const BOOKING = await axios.post(api+"SaveBookingOrder",
            {
                TripID: payload.trip_id,
                SelectedSeats: payload.seat_numbers,
                MaxSeat: seats.length,
                DestinationID: payload.destination_id,
                OrderID: payload.order_id,
                Customers: [
                    {
                        Email: customer[0].email,
                        Fullname: customer[0].name,
                        nextKin: customer[0].next_of_kin,
                        nextKinPhone: customer[0].next_of_kin_phone,
                        Phone: customer[0].phone,
                        SelectedSeats: payload.seat_numbers,
                        Sex: customer[0].sex
                    }
                ]
            },
            {
                headers: {
                    'Authorization': 'Bearer '+key,
                    'Content-Type': 'application/json'
                }
            })
            if(BOOKING.data.data.length !== 0){
                const response = BOOKING.data.data.orderdetails
                let nar = response.narration.trim().split(" ");
                let dep_ter = nar[0]
                let des_ter = nar[2] + ((nar[4]) ? " - "+nar[4] : "")
                //FINALIZE BOOKING
                const FINALIZE_BOOKING = await axios.post(api+"ConfirmBooking",
                {
                    OrderID: payload.order_id,
                    PaymentRefCode: response.ordernumber,
                    Status: "success"
                },
                {
                    headers: {
                        'Authorization': 'Bearer '+key,
                        'Content-Type': 'application/json'
                    }
                })
                const res = FINALIZE_BOOKING.data
                if(res.status == 200){
                    return {
                        error: false,
                        message: "successful",
                        info: "Data Available",
                        data: [
                            {
                                "order_status": "confirmed",
                                "order_id": response.orderid,
                                "order_name": response.ordername,
                                "order_email": response.orderemail,
                                "phone_number": response.phonenumber,
                                "order_amount": response.orderamount,
                                "trip_id": response.tripid,
                                "origin_id": response.loadingofficeid,
                                "destination_id": response.destinationid,
                                "order_ticket_date": response.orderticketdate,
                                "order_total_seat": response.ordertotalseat,
                                "order_seats": response.orderseatid,
                                "amount_per_seat": response.fareamount,
                                "order_number": response.ordernumber,
                                "vehicle_no": response.vehicleno,
                                "narration": response.narration.toUpperCase(),
                                "departure_terminal": dep_ter.toUpperCase(),
                                "destination_terminal":  des_ter.toUpperCase(),
                                "seat_details": seat_details2,
                                "provider": "GUO"
                            }
                        ]
                    }
                }
                else {
                    return {
                        error: true,
                        message: "failed",
                        info: "Could not pass booking confirmation",
                        data: []
                    }
                }
            }
            else{
                return {
                    error: true,
                    message: "failed",
                    info: "Can not process booking please check you are providing the correct Trip ID and Order ID",
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
  
  fastify.decorate('TestGUOLockStatus', async function (payload) {
    try{
        let url = payload.type == "lock" ? "ActivateLockSeat" : "deleteLockOnlineSeatBySeat";

        //GET LOCK STATUS
        const LOCK_STATUS = await axios.post(api+url,
        {
            TripID: payload.trip_id,
            SelectedSeats: payload.seat_number,
            lockedby: payload.locked_by,
            Destinationid: payload.destination_id,
        },
        {
            headers: {
                'Authorization': 'Bearer '+key,
                //'Content-Type': 'application/json'
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        
        let res;
        if(LOCK_STATUS.data.data != '-2' && payload.type == 'lock'){
            
            res = {
                error: false,
                message: "successful",
                info: "Data Available",
                data: [
                    {
                        "lock_status": "Seat successfully locked"
                    }
                ]
            }
        }
        else {
            res = {
                error: true,
                message: "failed",
                info: "Seat already locked by another user",
                data: []
            }
        }

        if(LOCK_STATUS.data.status != '200' && payload.type == 'unlock'){
            res = {
                error: false,
                message: "successful",
                info: "Data Available",
                data: [
                    {
                        "lock_status": "Seat successfully unlocked"
                    }
                ]
            }
        }
        return res
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

