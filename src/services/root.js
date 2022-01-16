
'use strict'

module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return { msg: "Hello Stranger, How do you do!" }
  })
}
