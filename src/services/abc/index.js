'use strict'

module.exports = async function (fastify, opts) {
  fastify.post('/abc/check_trips', async function (request, reply) {
    try{
        const { 
            departure_state, 
            destination_state,
            trip_date
        } = request.body
        const payload = {
            "departure_state": departure_state,
            "destination_state": destination_state,
            "trip_date": trip_date
        }
        const data = await fastify.ABCCheckTrips(payload);
        reply.code(200).type('application/json').send(data)
    }
    catch(error){
        reply.code(200).type('application/json').send(error)
    }
  })

  fastify.post('/abc/book_trip', async function (request, reply) {
    try{
        const data = await fastify.ABCBookTrip(request.body);
        reply.code(200).type('application/json').send(data)
    }
    catch(error){
        reply.code(200).type('application/json').send(error)
    }
  })

  
}
