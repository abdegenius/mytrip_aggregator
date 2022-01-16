'use strict'

module.exports = async function (fastify, opts) {
  fastify.post('/guo/check_trips', async function (request, reply) {
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
        const data = await fastify.GUOCheckTrips(payload);
        reply.code(200).type('application/json').send(data)
    }
    catch(error){
        reply.code(200).type('application/json').send(error)
    }
  })

  fastify.post('/guo/book_trip', async function (request, reply) {
    try{
        const data = await fastify.GUOBookTrip(request.body);
        reply.code(200).type('application/json').send(data)
    }
    catch(error){
        reply.code(200).type('application/json').send(error)
    }
  })
}
