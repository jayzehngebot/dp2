// Import the framework and instantiate it
import Fastify from 'fastify'
import NodeCache from 'node-cache'
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyView from '@fastify/view';
import handlebars from 'handlebars';
import fastifyStatic from '@fastify/static';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

dotenv.config();

const fastify = Fastify({
  logger: true
});

fastify.register(fastifyView, {
  engine: {
    handlebars: handlebars
  },
  root: path.join(__dirname, 'views'),
//  layout: 'layout', // optional: if you use a layout template
  viewExt: 'hbs'    // default file extension for templates
});

// Serve static files from the /public directory
fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/', // optional: default is '/'
});


const dataCache = new NodeCache();

// Declare a route
fastify.get('/', async function handler (request, reply) {

  let podData = dataCache.get( "sheetsData" );

  if ( podData == undefined ){
      console.log("dataUndefined - fetch data");

      let apiKey = process.env.GOOGLE_SHEETS_API_KEY;
      let sheetName = process.env.SHEET_NAME;
      let spreadsheetId = process.env.SHEET_ID;

      let freshData;

      try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?key=${apiKey}`);
        const data = await response.json();
        freshData = data.values;
      } catch (error) {
        console.error('Error:', error);
      }

      dataCache.set( "sheetsData", freshData, 10000 );
      console.log('success setting sheetsData');
      podData = dataCache.get( "sheetsData" );

  }

  //  reply.type('text/html');
  //  reply.send('hello : '+ JSON.stringify(podData));
  return reply.view('/index', { title: 'Home', data: podData });
})

// Run the server!
try {
  await fastify.listen({ port: 3000 })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}