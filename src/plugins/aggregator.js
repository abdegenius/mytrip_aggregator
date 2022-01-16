'use strict'

const fp = require('fastify-plugin')
const axios = require("axios")
module.exports = fp(async function (fastify, opts) {
  fastify.decorate('MyTrip_CheckTrip', async function (payload) {
    try{
        const providers = ["abc", "guo"];
        const promises = providers.map(async (provider) => {
            const response = await axios.post(`/${provider}/check_trips`,
            {
                "departure_state": payload.departure_state,
                "destination_state": payload.destination_state,
                "trip_date": payload.trip_date
            })
            return response
        })
        const TRIPS = await Promise.all(promises)
        return TRIPS
    }
    catch(error){
        return {
            error: true,
            message: "failed",
            info: error,
            data: []
        };
    }
  })


  
})

