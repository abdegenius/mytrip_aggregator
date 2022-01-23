'use strict'
const moment = require('moment')
const fp = require('fastify-plugin')
const axios = require("axios")
let api = `https://api.pmt.ng/api`
let key = ``
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('PMTCheckTrips', async function (payload) {
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
                                    "short_name": "PMT"
                                },
                                "trip_id": trip.id,
                                "trip_no": trip.code,
                                "trip_date": payload.trip_date,
                                "departure_time":trip.boardingDate,
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


  fastify.decorate('PMTBookTrip', async function (payload) {
    try{
        return {
            message: "hello"
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

