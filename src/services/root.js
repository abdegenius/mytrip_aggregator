
'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { msg: "Hello, Welcome to MYTRIP NIGERIA AGGREGATOR" }
  })
}
