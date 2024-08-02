import Fastify from 'fastify'
import NodeCache from 'node-cache'
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyView from '@fastify/view';
import handlebars from 'handlebars';
import fastifyStatic from '@fastify/static';

const __filename = fileURLToPath(import.meta.url); // GET RESOLVED PATH
const __dirname = path.dirname(__filename);

dotenv.config();

const fastify = Fastify({
  logger: true
});

fastify.register(fastifyView, {
  engine: {
    handlebars: handlebars
  },
  root: path.join(__dirname, 'views'),
  viewExt: 'hbs'    // HANDLEBARS EXT
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});

const dataCache = new NodeCache();

// ROUTING
fastify.get('/', async function handler (request, reply) {

  let podData = dataCache.get( "sheetsData" );

  if ( podData == undefined ){

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

      dataCache.set( "sheetsData", freshData, 60 );
      podData = dataCache.get( "sheetsData" );
  }

  const [headers, ...rows] = podData;

  // DEFINE KEY MAPPINGS
  const keyMappings = {
    Podcast: "podcast",
    EssentialEpURL: "episodeURL",
    EssentialEpTitle: "essentialEpisodeTitle",
    Born: "Born",
    Died: "Died",
    Comments: "comments",
  };
  
  // TRANSFORM DATA
  const transformData = (row) => {
    return row.reduce((acc, value, index) => {
      const key = headers[index];
      acc[keyMappings[key]] = value;
      return acc;
    }, {});
  };
  
  const transformedData = rows.map(transformData);
  
  // reply.send(podData);
  return reply.view('/index', { title: 'Home', data: transformedData });
})

// RUN SERVER
fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
});