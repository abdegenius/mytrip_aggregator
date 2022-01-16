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
                'Content-Type': 'application/json'
            }
        })
        let departure_state = payload.departure_state
        let destination_state = payload.destination_state
        let trip_date = payload.trip_date
        let state_confirmation = 0
        BMS_STATES.data.filter(row => {
            if(row.name == departure_state){
                state_confirmation += 1;
            }
            if(row.name == destination_state){
                state_confirmation += 1;
            }
        })
        if(state_confirmation == 2){
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
  })

  
})

