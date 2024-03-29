"use strict";
module.exports = async function (fastify, opts) {
  fastify.post("/aggregator/check_trips", async function (request, reply) {
    try {
      const { departure_state, destination_state, trip_date } = request.body;
      const payload = {
        departure_state: departure_state,
        destination_state: destination_state,
        trip_date: trip_date,
      };
      const abc_data = await fastify.ABCCheckTrips(payload);
      // const guo_data = await fastify.GUOCheckTrips(payload);
      // const pmt_data = await fastify.PMTCheckTrips(payload);
      reply
        .code(200)
        .type("application/json")
        .send({
          // "GUO":(guo_data==undefined ? [] : guo_data),
          ABC: abc_data == undefined ? [] : abc_data,
          // "PMT":(pmt_data==undefined ? [] : pmt_data),
        });
    } catch (error) {
      reply.code(200).type("application/json").send(error);
    }
  });

  fastify.post("/aggregator/book_trip", async function (request, reply) {
    try {
      const {
        seat_numbers,
        amount_per_seat,
        passengers,
        origin_id,
        destination_id,
        boarding_at,
        order_id,
        trip_id,
        trip_date,
        provider,
        agent_email,
      } = request.body;
      const payload = {
        seat_numbers: seat_numbers,
        amount_per_seat: amount_per_seat,
        passengers: passengers,
        origin_id: origin_id,
        destination_id: destination_id,
        boarding_at: boarding_at,
        order_id: order_id,
        trip_id: trip_id,
        trip_date: trip_date,
        provider: provider,
        agent_email: agent_email,
      };
      let book_trip;
      if (provider.toUpperCase() === "ABC") {
        book_trip = await fastify.ABCBookTrip(payload);
      }
      // if(provider.toUpperCase() === "GUO"){
      //   book_trip = await fastify.GUOBookTrip(payload)
      // }
      // if(provider.toUpperCase() === "PMT"){
      //   book_trip = await fastify.PMTBookTrip(payload)
      // }
      reply.code(200).type("application/json").send(book_trip);
    } catch (error) {
      reply.code(200).type("application/json").send(error);
    }
  });

  fastify.post("/aggregator/guo/lock_status", async function (request, reply) {
    try {
      const { trip_id, order_id, destination_id, seat_number, type } =
        request.body;
      const payload = {
        trip_id: trip_id,
        locked_by: order_id,
        destination_id: destination_id,
        seat_number: seat_number,
        type: type,
      };
      const guo_data = await fastify.GUOLockStatus(payload);
      reply.code(200).type("application/json").send(guo_data);
    } catch (error) {
      reply.code(200).type("application/json").send(error);
    }
  });

  fastify.post("/aggregator/test/check_trips", async function (request, reply) {
    try {
      const { departure_state, destination_state, trip_date } = request.body;
      const payload = {
        departure_state: departure_state,
        destination_state: destination_state,
        trip_date: trip_date,
      };
      const abc_data = await fastify.TestABCCheckTrips(payload);
      // const guo_data = await fastify.TestGUOCheckTrips(payload);
      // const pmt_data = await fastify.TestPMTCheckTrips(payload);
      reply
        .code(200)
        .type("application/json")
        .send({
          // "GUO":(guo_data==undefined ? [] : guo_data),
          ABC: abc_data == undefined ? [] : abc_data,
          // "PMT":(pmt_data==undefined ? [] : pmt_data),
        });
    } catch (error) {
      reply.code(200).type("application/json").send(error);
    }
  });

  fastify.post("/aggregator/test/book_trip", async function (request, reply) {
    try {
      const {
        seat_numbers,
        amount_per_seat,
        passengers,
        origin_id,
        destination_id,
        boarding_at,
        order_id,
        trip_id,
        trip_date,
        provider,
        agent_email,
      } = request.body;
      const payload = {
        seat_numbers: seat_numbers,
        amount_per_seat: amount_per_seat,
        passengers: passengers,
        origin_id: origin_id,
        destination_id: destination_id,
        boarding_at: boarding_at,
        order_id: order_id,
        trip_id: trip_id,
        trip_date: trip_date,
        provider: provider,
        agent_email: agent_email,
      };
      let book_trip;
      if (provider.toUpperCase() === "ABC") {
        book_trip = await fastify.TestABCBookTrip(payload);
      }
      // if(provider.toUpperCase() === "GUO"){
      //   book_trip = await fastify.TestGUOBookTrip(payload)
      // }
      // if(provider.toUpperCase() === "PMT"){
      //   book_trip = await fastify.TestPMTBookTrip(payload)
      // }
      reply.code(200).type("application/json").send(book_trip);
    } catch (error) {
      reply.code(200).type("application/json").send(error);
    }
  });

};
