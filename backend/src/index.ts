import 'dotenv/config'

import { ApolloServer } from 'apollo-server-express';
import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageDisabled,
  ApolloServerPluginLandingPageLocalDefault
} from 'apollo-server-core';

import { makeExecutableSchema } from '@graphql-tools/schema';

import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import express from 'express';
import { createServer } from 'https';

import session from 'express-session';
import connectRedis from 'connect-redis';

import { typeDefs, resolvers } from './schema';

import { createRedisConnection } from './redis';

import { defaultKeyGenerator, rateLimitDirective } from 'graphql-rate-limit-directive';
import { IRateLimiterStoreOptions, RateLimiterRedis } from 'rate-limiter-flexible';

import { readFileSync } from 'fs';

const certFile = process.env.NODE_ENV === 'production' ? 'cf' : 'selfsigned';

const key = readFileSync(__dirname + `/../certs/${certFile}.key`);
const cert = readFileSync(__dirname + `/../certs/${certFile}.crt`);

console.log('Environment:', process.env.NODE_ENV);

async function startApolloServer(typeDefs, resolvers) {
  // Required logic for integrating with Express
  const app = express();

  // Establish redis connection
  const RedisStore = connectRedis(session);
  const redis = await createRedisConnection();

  const sessionParser = session({
    store: new RedisStore({
      client: redis,
      ttl: 24 * 60 * 60,
      prefix: 'sess:',
    }),
    name: 'session',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24,
    },
  });

  app.use(sessionParser);

  // httpServer handles incoming requests
  const httpServer = createServer({ key, cert }, app);

  // Creating the WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    clientTracking: false,
    path: '/graphql',
  });

  // Parse session cookie on upgrade requests (e.g. ws)
  httpServer.on('upgrade', (request) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    sessionParser(request, {}, () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!request.session.uid) {
        console.log('No session in upgrade request found!');
      }
    });
  });

  // Uses the combination of user specific data (ip, session-id) along the type and field being accessed
  const keyGenerator = (directiveArgs, source, args, context, info) =>
    `${context.ip}:${defaultKeyGenerator(directiveArgs, source, args, context, info)}`;

  const { rateLimitDirectiveTypeDefs, rateLimitDirectiveTransformer }
    = rateLimitDirective<unknown, IRateLimiterStoreOptions>({
      keyGenerator,
      limiterClass: RateLimiterRedis,
      limiterOptions: {
        storeClient: redis
      }
    });

  // Create the schema, which will be used separately by ApolloServer and
  // the WebSocket server.
  let schema = makeExecutableSchema({
    typeDefs: [rateLimitDirectiveTypeDefs, typeDefs],
    resolvers
  });

  if (process.env.NODE_ENV === 'production') {
    schema = rateLimitDirectiveTransformer(schema);
  }

  // WebSocketServer configuration
  const serverCleanup = useServer(
    {
      schema,
      context: (ctx, msg, args) => ({
        ctx,
        msg,
        args,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        session: ctx.extra.request.session
      })
    },
    wsServer, 10000
  );

  // ApolloServer initialization
  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    cache: 'bounded',
    context: async ({ req, res }) => ({
      req,
      res,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      session: req.session,
      redis: redis.v4,
    }),
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
      // Install a landing page plugin based on NODE_ENV
      process.env.NODE_ENV === 'production'
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageLocalDefault({ footer: false, embed: true }),
    ],
  });

  // More required logic for integrating with Express
  await server.start();
  server.applyMiddleware({
    app,
    cors: {
      credentials: true,
      /*origin: (origin, callback) => {
        console.log(`Origin ${origin} is being granted CORS access`);
        callback(null, true);
      },*/
      origin: process.env.NODE_ENV === 'production' ?
        ['https://connect-xr.web.app', 'https://connect-xr.firebaseapp.com'] :
        ['http://localhost:3000', 'http://192.168.178.120:3000'],
    }
  });

  httpServer.listen(4000, () => {
    console.log(`🚀 Server ready at https://localhost:4000${server.graphqlPath}`);
  });
}

startApolloServer(typeDefs, resolvers);
